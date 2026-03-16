// TrailConditionsView.swift
// TrailGuard — Features/TrailConditions
//
// Browse, filter, upvote, and report trail conditions.

import SwiftUI
import ComposableArchitecture

struct TrailConditionsView: View {
    @Perception.Bindable var store: StoreOf<TrailConditionsReducer>

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottomTrailing) {
                VStack(spacing: 0) {
                    // Filter pills
                    filterRow

                    // Search bar
                    searchBar

                    // Conditions list
                    conditionsList
                }

                // FAB
                reportFAB
            }
            .navigationTitle("Trail Conditions")
            .task { store.send(.onAppear) }
            .sheet(isPresented: .init(
                get: { store.isReportSheetPresented },
                set: { if !$0 { store.send(.reportSheetDismissed) } }
            )) {
                ReportConditionView(store: store)
            }
        }
    }

    // MARK: - Filter Row

    private var filterRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterPill(
                    title: "All",
                    isSelected: store.selectedFilter == nil
                ) {
                    store.send(.filterChanged(nil))
                }

                ForEach(TrailCondition.ConditionType.allCases) { type in
                    FilterPill(
                        title: type.displayName,
                        isSelected: store.selectedFilter == type
                    ) {
                        store.send(.filterChanged(type))
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .background(Color(.systemBackground))
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)
            TextField("Search trails...", text: $store.searchText.sending(\.searchTextChanged))
                .textFieldStyle(.plain)
                .autocorrectionDisabled()
        }
        .padding(10)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }

    // MARK: - Conditions List

    private var conditionsList: some View {
        Group {
            if store.isLoading && store.conditions.isEmpty {
                VStack(spacing: 12) {
                    Spacer()
                    ProgressView()
                    Text("Loading conditions...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            } else if store.filteredConditions.isEmpty {
                emptyState
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(store.filteredConditions) { condition in
                            ConditionCard(condition: condition) {
                                store.send(.upvoteTapped(id: condition.id))
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 80) // space for FAB
                }
                .refreshable {
                    store.send(.refreshTriggered)
                    // Brief delay so the refresh indicator shows
                    try? await Task.sleep(nanoseconds: 500_000_000)
                }
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "map")
                .font(.system(size: 48))
                .foregroundStyle(.orange.opacity(0.6))
            Text("No Conditions Reported")
                .font(.title3.bold())
            Text("Be the first to report trail conditions in your area.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - FAB

    private var reportFAB: some View {
        Button {
            store.send(.reportButtonTapped)
        } label: {
            Image(systemName: "plus")
                .font(.title2.bold())
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(Color.orange)
                .clipShape(Circle())
                .shadow(color: .black.opacity(0.2), radius: 6, y: 3)
        }
        .padding(.trailing, 20)
        .padding(.bottom, 20)
    }
}

// MARK: - Filter Pill

private struct FilterPill: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.medium))
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(isSelected ? Color.orange : Color(.secondarySystemBackground))
                .foregroundStyle(isSelected ? .white : .primary)
                .clipShape(Capsule())
        }
    }
}

// MARK: - Condition Card

private struct ConditionCard: View {
    let condition: TrailCondition
    let onUpvote: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header: trail name + time ago
            HStack {
                Text(condition.trailName)
                    .font(.headline)
                Spacer()
                Text(condition.timeAgo)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Badge row: condition type + severity
            HStack(spacing: 8) {
                conditionBadge
                severityIndicator
            }

            // Description snippet
            if let notes = condition.notes, !notes.isEmpty {
                Text(notes)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            // Upvote row
            HStack {
                Spacer()
                Button(action: onUpvote) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.up.circle")
                        Text("\(condition.upvotes)")
                            .font(.subheadline.weight(.medium))
                    }
                    .foregroundStyle(.orange)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.orange.opacity(0.1))
                    .clipShape(Capsule())
                }
            }
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var conditionBadge: some View {
        Text(condition.condition.displayName)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(conditionColor.opacity(0.15))
            .foregroundStyle(conditionColor)
            .clipShape(Capsule())
    }

    private var conditionColor: Color {
        switch condition.condition {
        case .groomed:    return .green
        case .powder:     return .blue
        case .icy:        return .cyan
        case .wetSnow:    return .purple
        case .trackedOut: return .yellow
        case .closed:     return .red
        }
    }

    private var severityIndicator: some View {
        HStack(spacing: 2) {
            ForEach(1...5, id: \.self) { level in
                Circle()
                    .fill(level <= condition.severity ? severityColor : Color(.systemGray4))
                    .frame(width: 8, height: 8)
            }
        }
    }

    private var severityColor: Color {
        switch condition.severity {
        case 1...2: return .green
        case 3:     return .yellow
        case 4...5: return .red
        default:    return .gray
        }
    }
}

// MARK: - Report Condition View

private struct ReportConditionView: View {
    @Perception.Bindable var store: StoreOf<TrailConditionsReducer>
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Trail Info") {
                    TextField(
                        "Trail Name",
                        text: $store.reportForm.trailName.sending(\.reportFormTrailNameChanged)
                    )
                }

                Section("Condition") {
                    Picker("Type", selection: $store.reportForm.conditionType.sending(\.reportFormConditionChanged)) {
                        ForEach(TrailCondition.ConditionType.allCases) { type in
                            Text(type.displayName).tag(type)
                        }
                    }

                    Stepper(
                        "Severity: \(store.reportForm.severity)/5",
                        value: $store.reportForm.severity.sending(\.reportFormSeverityChanged),
                        in: 1...5
                    )
                }

                Section("Description") {
                    TextEditor(
                        text: $store.reportForm.description.sending(\.reportFormDescriptionChanged)
                    )
                    .frame(minHeight: 80)
                }

                Section {
                    Button {
                        store.send(.submitReport)
                    } label: {
                        HStack {
                            Spacer()
                            if store.reportForm.isSubmitting {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Submit Report")
                                    .fontWeight(.semibold)
                            }
                            Spacer()
                        }
                    }
                    .disabled(!store.reportForm.isValid || store.reportForm.isSubmitting)
                    .listRowBackground(
                        store.reportForm.isValid
                            ? Color.orange
                            : Color.orange.opacity(0.4)
                    )
                    .foregroundStyle(.white)
                }
            }
            .navigationTitle("Report Condition")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        store.send(.reportSheetDismissed)
                    }
                }
            }
        }
    }
}

#Preview {
    TrailConditionsView(
        store: Store(initialState: TrailConditionsReducer.State()) {
            TrailConditionsReducer()
        }
    )
}
