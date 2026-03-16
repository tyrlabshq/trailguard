// TrailConditionsReducer.swift
// TrailGuard — Features/TrailConditions
//
// TCA reducer for trail condition browsing and reporting.

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
        var selectedCondition: TrailCondition?

        // Filter state
        var filterCondition: TrailCondition.ConditionType?
        var filterRideType: User.RideType?
        var filterRecency: RecencyFilter = .last24Hours

        // Report form state
        var isReportSheetPresented: Bool = false
        var reportForm: ReportForm = .init()

        enum RecencyFilter: String, CaseIterable, Equatable {
            case last24Hours = "24h"
            case last3Days   = "3d"
            case last7Days   = "7d"
        }

        struct ReportForm: Equatable {
            var condition: TrailCondition.ConditionType?
            var notes: String = ""
            var rideType: User.RideType?
            var coordinate: CLLocationCoordinate2D?
            var isSubmitting: Bool = false

            static func == (lhs: Self, rhs: Self) -> Bool {
                lhs.condition == rhs.condition &&
                lhs.notes == rhs.notes &&
                lhs.rideType == rhs.rideType &&
                lhs.isSubmitting == rhs.isSubmitting
            }
        }
    }

    // MARK: - Action

    enum Action {
        // Load
        case loadConditions(center: CLLocationCoordinate2D, radiusMiles: Double)
        case conditionsLoaded([TrailCondition])
        case loadFailed(String)

        // Filter
        case setConditionFilter(TrailCondition.ConditionType?)
        case setRideTypeFilter(User.RideType?)
        case setRecencyFilter(State.RecencyFilter)

        // Selection
        case conditionTapped(TrailCondition)
        case conditionDetailDismissed

        // Upvote
        case upvoteTapped(id: UUID)
        case upvoteConfirmed(id: UUID)

        // Report
        case reportButtonTapped
        case reportFormConditionChanged(TrailCondition.ConditionType)
        case reportFormNotesChanged(String)
        case reportFormRideTypeChanged(User.RideType?)
        case reportFormCoordinateChanged(lat: Double, lng: Double)
        case submitReport
        case reportSubmitted(TrailCondition)
        case reportFailed(String)
        case reportSheetDismissed
    }

    // MARK: - Dependencies
    // TODO: @Dependency(\.supabaseClient) var supabaseClient
    // TODO: @Dependency(\.locationService) var locationService

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case let .loadConditions(center, radius):
                state.isLoading = true
                // TODO: supabaseClient.fetchTrailConditions(near: center, radiusMiles: radius, filter: state.filterCondition, recency: state.filterRecency)
                _ = (center, radius)
                return .none

            case let .conditionsLoaded(conditions):
                state.isLoading = false
                state.conditions = conditions
                return .none

            case let .loadFailed(error):
                state.isLoading = false
                state.error = error
                return .none

            case let .setConditionFilter(filter):
                state.filterCondition = filter
                return .none

            case let .setRideTypeFilter(rideType):
                state.filterRideType = rideType
                return .none

            case let .setRecencyFilter(recency):
                state.filterRecency = recency
                return .none

            case let .conditionTapped(condition):
                state.selectedCondition = condition
                return .none

            case .conditionDetailDismissed:
                state.selectedCondition = nil
                return .none

            case let .upvoteTapped(id):
                // TODO: Optimistic increment + supabaseClient.upvote(id)
                _ = id
                return .none

            case let .upvoteConfirmed(id):
                _ = id
                return .none

            case .reportButtonTapped:
                state.isReportSheetPresented = true
                return .none

            case let .reportFormConditionChanged(condition):
                state.reportForm.condition = condition
                return .none

            case let .reportFormNotesChanged(notes):
                // Enforce 140 char max
                state.reportForm.notes = String(notes.prefix(140))
                return .none

            case let .reportFormRideTypeChanged(rideType):
                state.reportForm.rideType = rideType
                return .none

            case let .reportFormCoordinateChanged(lat, lng):
                state.reportForm.coordinate = CLLocationCoordinate2D(latitude: lat, longitude: lng)
                return .none

            case .submitReport:
                guard state.reportForm.condition != nil else { return .none }
                state.reportForm.isSubmitting = true
                // TODO: supabaseClient.createTrailCondition(form: state.reportForm)
                return .none

            case let .reportSubmitted(condition):
                state.reportForm.isSubmitting = false
                state.isReportSheetPresented = false
                state.conditions.insert(condition, at: 0) // Optimistic UI
                return .none

            case let .reportFailed(error):
                state.reportForm.isSubmitting = false
                state.error = error
                return .none

            case .reportSheetDismissed:
                state.isReportSheetPresented = false
                state.reportForm = .init()
                return .none
            }
        }
    }
}
