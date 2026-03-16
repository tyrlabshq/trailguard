// RideDetailReducer.swift
// TrailGuard — Features/RideHistory
//
// TCA reducer for the ride detail screen.
// Loads waypoints from Supabase and supports sharing ride summary text.

import ComposableArchitecture
import Foundation
import Supabase

@Reducer
struct RideDetailReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var ride: Ride
        var waypoints: [Waypoint] = []
        var isLoadingWaypoints: Bool = false
        var waypointError: String?
    }

    // MARK: - Action

    enum Action {
        case onAppear
        case waypointsLoaded([Waypoint])
        case waypointsLoadFailed(String)
    }

    // MARK: - Dependencies

    @Dependency(\.supabase) var supabase

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {

            case .onAppear:
                guard state.waypoints.isEmpty, !state.isLoadingWaypoints else { return .none }
                state.isLoadingWaypoints = true
                let rideId = state.ride.id
                return .run { send in
                    do {
                        let waypoints: [Waypoint] = try await supabase
                            .from("ride_waypoints")
                            .select()
                            .eq("ride_id", value: rideId.uuidString)
                            .order("recorded_at", ascending: true)
                            .execute()
                            .value
                        await send(.waypointsLoaded(waypoints))
                    } catch {
                        await send(.waypointsLoadFailed(error.localizedDescription))
                    }
                }

            case let .waypointsLoaded(waypoints):
                state.isLoadingWaypoints = false
                state.waypoints = waypoints
                return .none

            case let .waypointsLoadFailed(error):
                state.isLoadingWaypoints = false
                state.waypointError = error
                return .none
            }
        }
    }
}
