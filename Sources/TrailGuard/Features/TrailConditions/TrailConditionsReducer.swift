// TrailConditionsReducer.swift
// TrailGuard — Features/TrailConditions
//
// TCA reducer for trail condition browsing, filtering, upvoting, and reporting.

import ComposableArchitecture
import CoreLocation
import Foundation

@Reducer
struct TrailConditionsReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var conditions: [TrailCondition] = []
        var isLoading: Bool = false
        var error: String?

        // Filter
        var selectedFilter: TrailCondition.ConditionType?
        var searchText: String = ""

        // Report sheet
        var isReportSheetPresented: Bool = false
        var reportForm: ReportForm = .init()

        // Computed: filtered list
        var filteredConditions: [TrailCondition] {
            var result = conditions
            if let filter = selectedFilter {
                result = result.filter { $0.condition == filter }
            }
            if !searchText.isEmpty {
                let query = searchText.lowercased()
                result = result.filter {
                    $0.trailName.lowercased().contains(query) ||
                    ($0.notes?.lowercased().contains(query) ?? false)
                }
            }
            return result
        }

        struct ReportForm: Equatable {
            var trailName: String = ""
            var conditionType: TrailCondition.ConditionType = .groomed
            var severity: Int = 3
            var description: String = ""
            var isSubmitting: Bool = false

            var isValid: Bool {
                !trailName.trimmingCharacters(in: .whitespaces).isEmpty
            }
        }
    }

    // MARK: - Action

    enum Action {
        // Load
        case onAppear
        case conditionsLoaded([TrailCondition])
        case loadFailed(String)

        // Filter
        case filterChanged(TrailCondition.ConditionType?)
        case searchTextChanged(String)

        // Upvote
        case upvoteTapped(id: UUID)
        case upvoteSucceeded(id: UUID)
        case upvoteFailed(id: UUID)

        // Report
        case reportButtonTapped
        case reportSheetDismissed
        case reportFormTrailNameChanged(String)
        case reportFormConditionChanged(TrailCondition.ConditionType)
        case reportFormSeverityChanged(Int)
        case reportFormDescriptionChanged(String)
        case submitReport
        case reportSubmitted(TrailCondition)
        case reportFailed(String)

        // Pull to refresh
        case refreshTriggered
    }

    // MARK: - Dependencies

    @Dependency(\.supabase) var supabase

    // MARK: - Cancellation

    private enum CancelID { case load }

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {

            // MARK: Load
            case .onAppear:
                guard !state.isLoading, state.conditions.isEmpty else { return .none }
                return loadConditions(state: &state)

            case .refreshTriggered:
                return loadConditions(state: &state)

            case let .conditionsLoaded(conditions):
                state.isLoading = false
                state.conditions = conditions
                return .none

            case let .loadFailed(error):
                state.isLoading = false
                state.error = error
                return .none

            // MARK: Filter
            case let .filterChanged(filter):
                state.selectedFilter = filter
                return .none

            case let .searchTextChanged(text):
                state.searchText = text
                return .none

            // MARK: Upvote (optimistic)
            case let .upvoteTapped(id):
                guard let idx = state.conditions.firstIndex(where: { $0.id == id }) else {
                    return .none
                }
                state.conditions[idx].upvotes += 1
                let currentCount = state.conditions[idx].upvotes
                return .run { send in
                    do {
                        try await supabase
                            .from("trail_conditions")
                            .update(["upvotes": currentCount])
                            .eq("id", value: id.uuidString)
                            .execute()
                        await send(.upvoteSucceeded(id: id))
                    } catch {
                        await send(.upvoteFailed(id: id))
                    }
                }

            case .upvoteSucceeded:
                return .none

            case let .upvoteFailed(id):
                // Roll back optimistic increment
                if let idx = state.conditions.firstIndex(where: { $0.id == id }) {
                    state.conditions[idx].upvotes = max(0, state.conditions[idx].upvotes - 1)
                }
                return .none

            // MARK: Report Sheet
            case .reportButtonTapped:
                state.isReportSheetPresented = true
                state.reportForm = .init()
                return .none

            case .reportSheetDismissed:
                state.isReportSheetPresented = false
                state.reportForm = .init()
                return .none

            case let .reportFormTrailNameChanged(name):
                state.reportForm.trailName = name
                return .none

            case let .reportFormConditionChanged(condition):
                state.reportForm.conditionType = condition
                return .none

            case let .reportFormSeverityChanged(severity):
                state.reportForm.severity = max(1, min(5, severity))
                return .none

            case let .reportFormDescriptionChanged(desc):
                state.reportForm.description = String(desc.prefix(280))
                return .none

            case .submitReport:
                guard state.reportForm.isValid else { return .none }
                state.reportForm.isSubmitting = true
                let form = state.reportForm
                return .run { send in
                    do {
                        let session = try await supabase.auth.session
                        let payload: [String: String] = [
                            "trail_name": form.trailName.trimmingCharacters(in: .whitespaces),
                            "condition_type": form.conditionType.rawValue,
                            "severity": "\(form.severity)",
                            "description": form.description,
                            "reporter_id": session.user.id.uuidString,
                        ]
                        let inserted: TrailCondition = try await supabase
                            .from("trail_conditions")
                            .insert(payload)
                            .select()
                            .single()
                            .execute()
                            .value
                        await send(.reportSubmitted(inserted))
                    } catch {
                        await send(.reportFailed(error.localizedDescription))
                    }
                }

            case let .reportSubmitted(condition):
                state.reportForm.isSubmitting = false
                state.isReportSheetPresented = false
                state.conditions.insert(condition, at: 0)
                state.reportForm = .init()
                return .none

            case let .reportFailed(error):
                state.reportForm.isSubmitting = false
                state.error = error
                return .none
            }
        }
    }

    // MARK: - Helpers

    private func loadConditions(state: inout State) -> Effect<Action> {
        state.isLoading = true
        state.error = nil
        return .run { send in
            do {
                let conditions: [TrailCondition] = try await supabase
                    .from("trail_conditions")
                    .select()
                    .order("created_at", ascending: false)
                    .limit(100)
                    .execute()
                    .value
                await send(.conditionsLoaded(conditions))
            } catch {
                await send(.loadFailed(error.localizedDescription))
            }
        }
        .cancellable(id: CancelID.load, cancelInFlight: true)
    }
}
