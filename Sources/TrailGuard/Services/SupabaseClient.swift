// SupabaseClient.swift
// TrailGuard — Services
//
// TCA dependency wrapping the Supabase Swift SDK.
// All database reads/writes and Realtime subscriptions go through here.

import Foundation
import Supabase
import ComposableArchitecture

// MARK: - TCA Dependency Declaration

/// Supabase client dependency — injected into reducers that need data access.
/// TODO: Register with DependencyValues extension
struct SupabaseClientDep {
    // Auth
    var signInWithApple: (_ identityToken: String) async throws -> User
    var signInWithMagicLink: (_ email: String) async throws -> Void
    var signOut: () async throws -> Void
    var currentUser: () async throws -> User?

    // Emergency Card
    var fetchEmergencyCard: () async throws -> EmergencyCard?
    var upsertEmergencyCard: (_ card: EmergencyCard) async throws -> EmergencyCard

    // Rides
    var startRide: (_ rideType: User.RideType, _ groupId: UUID?) async throws -> Ride
    var endRide: (_ rideId: UUID, _ stats: RideStats) async throws -> Ride
    var fetchRideHistory: (_ limit: Int) async throws -> [Ride]
    var insertWaypoints: (_ rideId: UUID, _ waypoints: [Waypoint]) async throws -> Void

    // Alerts
    var createAlert: (_ type: AlertType, _ lat: Double?, _ lng: Double?) async throws -> UUID

    // Groups
    var createGroup: (_ name: String, _ rideType: User.RideType) async throws -> GroupSession
    var joinGroup: (_ inviteCode: String) async throws -> GroupSession
    var leaveGroup: (_ groupId: UUID) async throws -> Void
    var updateMemberRole: (_ groupId: UUID, _ riderId: UUID, _ role: GroupSession.GroupMember.Role) async throws -> Void

    // Trail Conditions
    var fetchTrailConditions: (_ lat: Double, _ lng: Double, _ radiusMiles: Double) async throws -> [TrailCondition]
    var createTrailCondition: (_ condition: TrailCondition.ConditionType, _ lat: Double, _ lng: Double, _ notes: String?, _ rideType: User.RideType?) async throws -> TrailCondition
    var upvoteTrailCondition: (_ id: UUID) async throws -> Void

    // Realtime
    var subscribeToGroupLocations: (_ groupId: UUID) -> AsyncStream<GroupLocationUpdate>
    var publishMyLocation: (_ groupId: UUID, _ lat: Double, _ lng: Double, _ heading: Double?, _ speedMPH: Double?) async throws -> Void
}

// MARK: - Supporting Types

struct RideStats: Equatable {
    var distanceMiles: Double
    var maxSpeedMPH: Double
    var durationSeconds: Int
}

enum AlertType: String {
    case sos         = "sos"
    case crash       = "crash"
    case dmsExpired  = "dms_expired"
    case sweepGap    = "sweep_gap"
}

struct GroupLocationUpdate: Equatable {
    let riderId: UUID
    let lat: Double
    let lng: Double
    let heading: Double?
    let speedMPH: Double?
    let batteryLevel: Float?
    let updatedAt: Date
}

// MARK: - Client Initialization

extension SupabaseClientDep {
    /// Production Supabase client.
    /// NOTE: Reducers currently use the raw SupabaseClient directly via
    /// @Dependency(\.supabase). This wrapper is provided for future use.
    static func live(supabase client: SupabaseClient) -> Self {
        Self(
            signInWithApple: { _ in throw SupabaseClientDepError.notImplemented },
            signInWithMagicLink: { _ in throw SupabaseClientDepError.notImplemented },
            signOut: { try await client.auth.signOut() },
            currentUser: { nil },
            fetchEmergencyCard: { nil },
            upsertEmergencyCard: { card in card },
            startRide: { _, _ in throw SupabaseClientDepError.notImplemented },
            endRide: { _, _ in throw SupabaseClientDepError.notImplemented },
            fetchRideHistory: { _ in [] },
            insertWaypoints: { _, _ in },
            createAlert: { _, _, _ in throw SupabaseClientDepError.notImplemented },
            createGroup: { _, _ in throw SupabaseClientDepError.notImplemented },
            joinGroup: { _ in throw SupabaseClientDepError.notImplemented },
            leaveGroup: { _ in },
            updateMemberRole: { _, _, _ in },
            fetchTrailConditions: { _, _, _ in [] },
            createTrailCondition: { _, _, _, _, _ in throw SupabaseClientDepError.notImplemented },
            upvoteTrailCondition: { _ in },
            subscribeToGroupLocations: { _ in AsyncStream { $0.finish() } },
            publishMyLocation: { _, _, _, _, _ in }
        )
    }

    /// Test/preview client with in-memory mock responses.
    static var preview: Self {
        Self(
            signInWithApple: { _ in throw SupabaseClientDepError.notImplemented },
            signInWithMagicLink: { _ in },
            signOut: { },
            currentUser: { nil },
            fetchEmergencyCard: { nil },
            upsertEmergencyCard: { card in card },
            startRide: { _, _ in throw SupabaseClientDepError.notImplemented },
            endRide: { _, _ in throw SupabaseClientDepError.notImplemented },
            fetchRideHistory: { _ in [] },
            insertWaypoints: { _, _ in },
            createAlert: { _, _, _ in UUID() },
            createGroup: { _, _ in throw SupabaseClientDepError.notImplemented },
            joinGroup: { _ in throw SupabaseClientDepError.notImplemented },
            leaveGroup: { _ in },
            updateMemberRole: { _, _, _ in },
            fetchTrailConditions: { _, _, _ in [] },
            createTrailCondition: { _, _, _, _, _ in throw SupabaseClientDepError.notImplemented },
            upvoteTrailCondition: { _ in },
            subscribeToGroupLocations: { _ in AsyncStream { $0.finish() } },
            publishMyLocation: { _, _, _, _, _ in }
        )
    }
}

// MARK: - Error Type

enum SupabaseClientDepError: LocalizedError {
    case notImplemented

    var errorDescription: String? {
        "This SupabaseClientDep method is not yet implemented."
    }
}
