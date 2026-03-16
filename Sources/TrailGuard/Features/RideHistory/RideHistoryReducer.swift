// RideHistoryReducer.swift
// TrailGuard — Features/RideHistory
//
// TCA reducer for browsing past rides with pagination.
// Loads completed rides from Supabase, supports pull-to-refresh and load-more.

import ComposableArchitecture
import Foundation
import Supabase

@Reducer
struct RideHistoryReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var rides: [Ride] = []
        var isLoading: Bool = false
        var selectedRide: Ride?
        var page: Int = 0
        var hasMore: Bool = true
        var error: String?

        // Detail view
        var rideDetail: RideDetailReducer.State?

        static let pageSize = 20
    }

    // MARK: - Action

    enum Action {
        case onAppear
        case loadRides
        case ridesLoaded([Ride])
        case ridesLoadFailed(String)
        case loadMore
        case refresh
        case rideSelected(Ride)
        case dismissDetail

        // Child
        case rideDetail(RideDetailReducer.Action)
    }

    // MARK: - Dependencies

    @Dependency(\.supabase) var supabase

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {

            case .onAppear:
                guard state.rides.isEmpty, !state.isLoading else { return .none }
                return .send(.loadRides)

            case .loadRides:
                state.isLoading = true
                state.error = nil
                let offset = state.page * State.pageSize
                let limit = State.pageSize
                return .run { send in
                    do {
                        let userId = try await supabase.auth.session.user.id
                        let rides: [Ride] = try await supabase
                            .from("rides")
                            .select()
                            .eq("rider_id", value: userId.uuidString)
                            .not("ended_at", operator: .is, value: "null")
                            .order("started_at", ascending: false)
                            .range(from: offset, to: offset + limit - 1)
                            .execute()
                            .value
                        await send(.ridesLoaded(rides))
                    } catch {
                        await send(.ridesLoadFailed(error.localizedDescription))
                    }
                }

            case let .ridesLoaded(newRides):
                state.isLoading = false
                if state.page == 0 {
                    state.rides = newRides
                } else {
                    state.rides.append(contentsOf: newRides)
                }
                state.hasMore = newRides.count >= State.pageSize
                return .none

            case let .ridesLoadFailed(error):
                state.isLoading = false
                state.error = error
                return .none

            case .loadMore:
                guard !state.isLoading, state.hasMore else { return .none }
                state.page += 1
                return .send(.loadRides)

            case .refresh:
                state.page = 0
                state.hasMore = true
                return .send(.loadRides)

            case let .rideSelected(ride):
                state.selectedRide = ride
                state.rideDetail = RideDetailReducer.State(ride: ride)
                return .none

            case .dismissDetail:
                state.selectedRide = nil
                state.rideDetail = nil
                return .none

            case .rideDetail:
                return .none
            }
        }
        .ifLet(\.rideDetail, action: \.rideDetail) {
            RideDetailReducer()
        }
    }
}
