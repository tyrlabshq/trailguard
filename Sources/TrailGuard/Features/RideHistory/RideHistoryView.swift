// RideHistoryView.swift
// TrailGuard — Features/RideHistory
//
// Paginated list of completed rides with pull-to-refresh.
// Tap a ride to navigate to RideDetailView.

import SwiftUI
import ComposableArchitecture

struct RideHistoryView: View {
    let store: StoreOf<RideHistoryReducer>

    var body: some View {
        NavigationStack {
            Group {
                if store.rides.isEmpty && !store.isLoading {
                    EmptyHistoryView()
                } else {
                    rideList
                }
            }
            .navigationTitle("Ride History")
            .navigationBarTitleDisplayMode(.inline)
            .task { store.send(.onAppear) }
            .refreshable { store.send(.refresh) }
            .sheet(
                item: Binding(
                    get: { store.selectedRide },
                    set: { _ in store.send(.dismissDetail) }
                )
            ) { _ in
                if let detailStore = store.scope(state: \.rideDetail, action: \.rideDetail) {
                    NavigationStack {
                        RideDetailView(store: detailStore)
                            .toolbar {
                                ToolbarItem(placement: .cancellationAction) {
                                    Button("Done") { store.send(.dismissDetail) }
                                }
                            }
                    }
                }
            }
        }
    }

    private var rideList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(store.rides) { ride in
                    RideCardView(ride: ride)
                        .onTapGesture {
                            store.send(.rideSelected(ride))
                        }
                }

                if store.isLoading {
                    ProgressView()
                        .padding(.vertical, 20)
                }

                if store.hasMore && !store.isLoading {
                    Button {
                        store.send(.loadMore)
                    } label: {
                        Text("Load More")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.orange)
                            .padding(.vertical, 12)
                            .frame(maxWidth: .infinity)
                    }
                }

                if let error = store.error {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding()
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)
        }
    }
}

// MARK: - Ride Card

private struct RideCardView: View {
    let ride: Ride

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Date header
            HStack {
                Text(ride.startedAt, style: .date)
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(ride.startedAt, style: .time)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Stats row
            HStack(spacing: 16) {
                StatPill(icon: "point.topleft.down.to.point.bottomright.curvepath", value: ride.distanceFormatted)
                StatPill(icon: "clock", value: ride.durationFormatted)
                if let maxSpeed = ride.maxSpeedMPH {
                    StatPill(icon: "gauge.with.needle", value: String(format: "%.0f mph", maxSpeed))
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

private struct StatPill: View {
    let icon: String
    let value: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
                .foregroundStyle(.orange)
            Text(value)
                .font(.caption.weight(.medium))
                .monospacedDigit()
        }
    }
}

// MARK: - Empty State

private struct EmptyHistoryView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 56))
                .foregroundStyle(.orange.opacity(0.6))

            Text("No Rides Yet")
                .font(.title3.bold())

            Text("Your completed rides will appear here.\nStart a ride from the Ride tab!")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
    }
}

// MARK: - Preview

#Preview {
    RideHistoryView(
        store: Store(initialState: RideHistoryReducer.State()) {
            RideHistoryReducer()
        }
    )
}
