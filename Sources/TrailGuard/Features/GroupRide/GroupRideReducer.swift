// GroupRideReducer.swift
// TrailGuard — Features/GroupRide
//
// TCA reducer for group ride session management.
// Handles group creation, join, live location updates via Supabase Realtime,
// Leader/Sweep roles, sweep gap alerts, and rally points.

import ComposableArchitecture
import CoreLocation
import Foundation

@Reducer
struct GroupRideReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var session: GroupSession?
        var phase: Phase = .none
        var myRole: GroupSession.GroupMember.Role = .member

        // TODO: Member locations for map display
        var memberLocations: [UUID: MemberLocation] = [:]

        // Group limits (enforced server-side too)
        var maxMembers: Int = 4  // Free tier. Pro = unlimited

        // Rally point
        var rallyPoint: CLLocationCoordinate2D?  // TODO: Use custom Equatable wrapper

        enum Phase: Equatable {
            case none
            case creating
            case joining
            case active
            case ended
        }

        struct MemberLocation: Equatable {
            let riderId: UUID
            var coordinate: CLLocationCoordinate2D
            var heading: Double?
            var speedMPH: Double?
            var batteryLevel: Float?
            var lastSeen: Date

            // CLLocationCoordinate2D isn't Equatable — compare manually
            static func == (lhs: Self, rhs: Self) -> Bool {
                lhs.riderId == rhs.riderId &&
                lhs.coordinate.latitude == rhs.coordinate.latitude &&
                lhs.coordinate.longitude == rhs.coordinate.longitude &&
                lhs.lastSeen == rhs.lastSeen
            }
        }
    }

    // MARK: - Action

    enum Action {
        // Group lifecycle
        case createGroup(name: String?)
        case groupCreated(GroupSession)
        case joinGroup(inviteCode: String)
        case groupJoined(GroupSession)
        case leaveGroup
        case groupEnded

        // Role management
        case assignRole(riderId: UUID, role: GroupSession.GroupMember.Role)

        // Live location
        case memberLocationUpdated(riderId: UUID, lat: Double, lng: Double, heading: Double?, battery: Float?)
        case sweepGapAlertFired(distanceMiles: Double)

        // Rally point
        case setRallyPoint(lat: Double, lng: Double)
        case clearRallyPoint

        // Realtime subscription
        case subscribeToRealtimeUpdates
        case realtimeDisconnected

        // Error
        case error(String)
    }

    // MARK: - Dependencies
    // TODO: @Dependency(\.supabaseClient) var supabaseClient
    // TODO: @Dependency(\.locationService) var locationService

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case let .createGroup(name):
                state.phase = .creating
                state.myRole = .leader
                // TODO: Generate 6-char invite code
                // TODO: supabaseClient.createGroup(name: name ?? "My Group")
                _ = name
                return .none

            case let .groupCreated(session):
                state.session = session
                state.phase = .active
                return .send(.subscribeToRealtimeUpdates)

            case let .joinGroup(inviteCode):
                state.phase = .joining
                // TODO: supabaseClient.joinGroup(code: inviteCode)
                _ = inviteCode
                return .none

            case let .groupJoined(session):
                state.session = session
                state.phase = .active
                return .send(.subscribeToRealtimeUpdates)

            case .leaveGroup:
                // TODO: supabaseClient.leaveGroup(groupId)
                state.session = nil
                state.phase = .ended
                state.memberLocations = [:]
                return .none

            case .groupEnded:
                state.phase = .ended
                return .none

            case let .assignRole(riderId, role):
                // TODO: supabaseClient.updateMemberRole(riderId, role)
                _ = (riderId, role)
                return .none

            case let .memberLocationUpdated(riderId, lat, lng, heading, battery):
                // TODO: Update memberLocations map
                // TODO: Check sweep gap if rider is sweep role
                _ = (riderId, lat, lng, heading, battery)
                return .none

            case let .sweepGapAlertFired(distanceMiles):
                // TODO: Notify leader via in-app alert
                _ = distanceMiles
                return .none

            case let .setRallyPoint(lat, lng):
                state.rallyPoint = CLLocationCoordinate2D(latitude: lat, longitude: lng)
                // TODO: Broadcast rally point to group via Supabase Realtime
                return .none

            case .clearRallyPoint:
                state.rallyPoint = nil
                return .none

            case .subscribeToRealtimeUpdates:
                // TODO: Subscribe to rider_locations Realtime channel for this group
                return .none

            case .realtimeDisconnected:
                // TODO: Attempt reconnect with backoff
                return .none

            case let .error(message):
                // TODO: Surface error to user
                _ = message
                return .none
            }
        }
    }
}
