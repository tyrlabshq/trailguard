// GroupRideReducer.swift
// TrailGuard — Features/GroupRide
//
// TCA reducer for group ride session management.
// Handles group creation, join via invite code, live location sync,
// Leader/Sweep role assignment, and rally points.

import ComposableArchitecture
import CoreLocation
import Foundation
import Realtime
import Supabase

// MARK: - DB Row Types (file-private, Supabase decode/encode)

private struct GroupRideRow: Codable, Equatable {
    let id: UUID
    let name: String
    let joinCode: String
    let leaderId: UUID
    let status: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name, status
        case joinCode = "join_code"
        case leaderId = "leader_id"
        case createdAt = "created_at"
    }
}

private struct GroupRideMemberRow: Codable, Equatable {
    let id: UUID
    let groupId: UUID
    let riderId: UUID
    let displayName: String
    let role: String
    let lastLocation: LocationJSON?
    let lastSeen: Date?
    let joinedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, role
        case groupId = "group_id"
        case riderId = "rider_id"
        case displayName = "display_name"
        case lastLocation = "last_location"
        case lastSeen = "last_seen"
        case joinedAt = "joined_at"
    }
}

private struct LocationJSON: Codable, Equatable {
    let latitude: Double
    let longitude: Double
    let heading: Double?
    let speedMPH: Double?

    enum CodingKeys: String, CodingKey {
        case latitude, longitude, heading
        case speedMPH = "speed_mph"
    }
}

private struct RallyPointRow: Codable, Equatable {
    let id: UUID
    let groupId: UUID
    let name: String
    let latitude: Double
    let longitude: Double
    let createdBy: UUID
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name, latitude, longitude
        case groupId = "group_id"
        case createdBy = "created_by"
        case createdAt = "created_at"
    }
}

// MARK: - Insert / Update Payloads

private struct GroupInsertPayload: Encodable {
    let id: String
    let name: String
    let joinCode: String
    let leaderId: String
    let status: String

    enum CodingKeys: String, CodingKey {
        case id, name, status
        case joinCode = "join_code"
        case leaderId = "leader_id"
    }
}

private struct MemberInsertPayload: Encodable {
    let id: String
    let groupId: String
    let riderId: String
    let displayName: String
    let role: String

    enum CodingKeys: String, CodingKey {
        case id, role
        case groupId = "group_id"
        case riderId = "rider_id"
        case displayName = "display_name"
    }
}

private struct LocationUpdatePayload: Encodable {
    let lastLocation: LocationJSON
    let lastSeen: String

    enum CodingKeys: String, CodingKey {
        case lastLocation = "last_location"
        case lastSeen = "last_seen"
    }
}

private struct RoleUpdatePayload: Encodable {
    let role: String
}

private struct RallyPointInsertPayload: Encodable {
    let id: String
    let groupId: String
    let name: String
    let latitude: Double
    let longitude: Double
    let createdBy: String

    enum CodingKeys: String, CodingKey {
        case id, name, latitude, longitude
        case groupId = "group_id"
        case createdBy = "created_by"
    }
}

private struct StatusUpdatePayload: Encodable {
    let status: String
}

// MARK: - Invite Code Generator

private func generateInviteCode() -> String {
    let chars = Array("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
    return String((0..<6).map { _ in chars.randomElement()! })
}

// MARK: - Reducer

@Reducer
struct GroupRideReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var phase: Phase = .idle
        var session: GroupSession?
        var myRiderId: UUID?
        var myRole: GroupSession.GroupMember.Role = .member
        var memberLocations: [UUID: MemberLocation] = [:]
        var rallyPoints: [RallyPoint] = []
        var errorMessage: String?
        var showLeaveConfirmation = false

        enum Phase: Equatable {
            case idle
            case creating
            case joining
            case active
            case ended
        }

        struct MemberLocation: Equatable {
            let riderId: UUID
            var displayName: String
            var role: GroupSession.GroupMember.Role
            var latitude: Double
            var longitude: Double
            var heading: Double?
            var speedMPH: Double?
            var lastSeen: Date

            static func == (lhs: Self, rhs: Self) -> Bool {
                lhs.riderId == rhs.riderId &&
                lhs.latitude == rhs.latitude &&
                lhs.longitude == rhs.longitude &&
                lhs.lastSeen == rhs.lastSeen &&
                lhs.role == rhs.role
            }
        }

        struct RallyPoint: Equatable, Identifiable {
            let id: UUID
            var name: String
            var latitude: Double
            var longitude: Double
            var createdBy: UUID
            var createdAt: Date
        }
    }

    // MARK: - Action

    enum Action {
        // Create
        case createGroupTapped(name: String)
        case groupCreated(GroupSession)
        case groupCreateFailed(String)

        // Join
        case joinGroupTapped(code: String)
        case groupJoined(session: GroupSession, myRiderId: UUID)
        case groupJoinFailed(String)

        // Leave
        case leaveGroupTapped
        case leaveGroupConfirmed
        case cancelLeave
        case leftGroup
        case resetToIdle

        // Location sync + Realtime
        case startLocationSync
        case locationSyncTick
        case subscribeToRealtimeMembers
        case subscribeToRealtimeRallyPoints
        case memberLocationsReceived([UUID: State.MemberLocation])
        case realtimeMemberUpdated(State.MemberLocation)
        case realtimeMemberRemoved(UUID)
        case publishMyLocation

        // Rally points
        case addRallyPoint(name: String, lat: Double, lng: Double)
        case rallyPointAdded(State.RallyPoint)
        case rallyPointsLoaded([State.RallyPoint])
        case removeRallyPoint(UUID)

        // SOS broadcast
        case sosBroadcastTapped

        // Error
        case errorDismissed
    }

    // MARK: - Cancel IDs

    private enum CancelID {
        case locationSync
        case realtimeMembers
        case realtimeRallyPoints
    }

    // MARK: - Dependencies

    @Dependency(\.supabase) var supabase
    @Dependency(\.locationService) var locationService
    @Dependency(\.continuousClock) var clock

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {

            // MARK: Create Group
            case let .createGroupTapped(name):
                state.phase = .creating
                state.errorMessage = nil
                let groupName = name.isEmpty ? "My Group" : name
                return .run { send in
                    do {
                        let authSession = try await supabase.auth.session
                        let riderId = authSession.user.id
                        let groupId = UUID()
                        let memberId = UUID()
                        let code = generateInviteCode()
                        let displayName = authSession.user.email ?? "Leader"

                        // Insert group
                        try await supabase.from("group_rides").insert(
                            GroupInsertPayload(
                                id: groupId.uuidString,
                                name: groupName,
                                joinCode: code,
                                leaderId: riderId.uuidString,
                                status: "active"
                            )
                        ).execute()

                        // Insert self as leader
                        try await supabase.from("group_ride_members").insert(
                            MemberInsertPayload(
                                id: memberId.uuidString,
                                groupId: groupId.uuidString,
                                riderId: riderId.uuidString,
                                displayName: displayName,
                                role: "leader"
                            )
                        ).execute()

                        let session = GroupSession(
                            id: groupId,
                            name: groupName,
                            inviteCode: code,
                            createdBy: riderId,
                            expiresAt: Date().addingTimeInterval(24 * 60 * 60),
                            members: [
                                .init(
                                    id: memberId,
                                    riderId: riderId,
                                    displayName: displayName,
                                    role: .leader,
                                    joinedAt: Date()
                                )
                            ],
                            createdAt: Date()
                        )
                        await send(.groupCreated(session))
                    } catch {
                        await send(.groupCreateFailed(error.localizedDescription))
                    }
                }

            case let .groupCreated(session):
                state.session = session
                state.phase = .active
                state.myRiderId = session.createdBy
                state.myRole = .leader
                return .send(.startLocationSync)

            case let .groupCreateFailed(message):
                state.phase = .idle
                state.errorMessage = message
                return .none

            // MARK: Join Group
            case let .joinGroupTapped(code):
                state.phase = .joining
                state.errorMessage = nil
                let trimmed = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                return .run { send in
                    do {
                        let authSession = try await supabase.auth.session
                        let riderId = authSession.user.id
                        let displayName = authSession.user.email ?? "Rider"

                        // Look up group by invite code
                        let groups: [GroupRideRow] = try await supabase
                            .from("group_rides")
                            .select()
                            .eq("join_code", value: trimmed)
                            .eq("status", value: "active")
                            .execute()
                            .value

                        guard let group = groups.first else {
                            await send(.groupJoinFailed("No active group found with code \"\(trimmed)\"."))
                            return
                        }

                        // Demote current sweep to member (if any)
                        try await supabase.from("group_ride_members")
                            .update(RoleUpdatePayload(role: "member"))
                            .eq("group_id", value: group.id.uuidString)
                            .eq("role", value: "sweep")
                            .execute()

                        // Insert self as member
                        let memberId = UUID()
                        try await supabase.from("group_ride_members").insert(
                            MemberInsertPayload(
                                id: memberId.uuidString,
                                groupId: group.id.uuidString,
                                riderId: riderId.uuidString,
                                displayName: displayName,
                                role: "member"
                            )
                        ).execute()

                        // Fetch all current members
                        let memberRows: [GroupRideMemberRow] = try await supabase
                            .from("group_ride_members")
                            .select()
                            .eq("group_id", value: group.id.uuidString)
                            .execute()
                            .value

                        // Assign sweep: last joiner who isn't the leader
                        let nonLeaders = memberRows.filter { $0.role != "leader" }
                            .sorted { $0.joinedAt > $1.joinedAt }
                        if let lastJoiner = nonLeaders.first, memberRows.count >= 2 {
                            try await supabase.from("group_ride_members")
                                .update(RoleUpdatePayload(role: "sweep"))
                                .eq("id", value: lastJoiner.id.uuidString)
                                .execute()
                        }

                        // Re-fetch members to get updated roles
                        let updatedRows: [GroupRideMemberRow] = try await supabase
                            .from("group_ride_members")
                            .select()
                            .eq("group_id", value: group.id.uuidString)
                            .execute()
                            .value

                        let members = updatedRows.map { row in
                            GroupSession.GroupMember(
                                id: row.id,
                                riderId: row.riderId,
                                displayName: row.displayName,
                                role: GroupSession.GroupMember.Role(rawValue: row.role) ?? .member,
                                joinedAt: row.joinedAt
                            )
                        }

                        let groupSession = GroupSession(
                            id: group.id,
                            name: group.name,
                            inviteCode: group.joinCode,
                            createdBy: group.leaderId,
                            expiresAt: Date().addingTimeInterval(24 * 60 * 60),
                            members: members,
                            createdAt: group.createdAt
                        )
                        await send(.groupJoined(session: groupSession, myRiderId: riderId))
                    } catch {
                        await send(.groupJoinFailed(error.localizedDescription))
                    }
                }

            case let .groupJoined(session, myRiderId):
                state.session = session
                state.phase = .active
                state.myRiderId = myRiderId
                if let me = session.members.first(where: { $0.riderId == myRiderId }) {
                    state.myRole = me.role
                } else {
                    state.myRole = .member
                }
                return .send(.startLocationSync)

            case let .groupJoinFailed(message):
                state.phase = .idle
                state.errorMessage = message
                return .none

            // MARK: Leave Group
            case .leaveGroupTapped:
                state.showLeaveConfirmation = true
                return .none

            case .leaveGroupConfirmed:
                state.showLeaveConfirmation = false
                guard let groupId = state.session?.id else {
                    state.phase = .idle
                    return .none
                }
                let isLeader = state.myRole == .leader
                return .run { send in
                    do {
                        let authSession = try await supabase.auth.session
                        let riderId = authSession.user.id

                        // Remove self from group
                        try await supabase.from("group_ride_members")
                            .delete()
                            .eq("group_id", value: groupId.uuidString)
                            .eq("rider_id", value: riderId.uuidString)
                            .execute()

                        // If leader, end the group
                        if isLeader {
                            try await supabase.from("group_rides")
                                .update(StatusUpdatePayload(status: "ended"))
                                .eq("id", value: groupId.uuidString)
                                .execute()
                        }
                    } catch {
                        // Leave locally even if DB fails
                    }
                    await send(.leftGroup)
                }

            case .cancelLeave:
                state.showLeaveConfirmation = false
                return .none

            case .leftGroup:
                state.session = nil
                state.phase = .ended
                state.memberLocations = [:]
                state.rallyPoints = []
                return .merge(
                    .cancel(id: CancelID.locationSync),
                    .cancel(id: CancelID.realtimeMembers),
                    .cancel(id: CancelID.realtimeRallyPoints)
                )

            case .resetToIdle:
                state.phase = .idle
                state.errorMessage = nil
                state.session = nil
                state.memberLocations = [:]
                state.rallyPoints = []
                state.myRole = .member
                state.myRiderId = nil
                return .none

            // MARK: Location Sync (Supabase Realtime + publish timer)
            case .startLocationSync:
                guard let groupId = state.session?.id else { return .none }
                return .merge(
                    // Publish own location every 5s
                    .run { send in
                        await send(.publishMyLocation)
                        for await _ in self.clock.timer(interval: .seconds(5)) {
                            await send(.publishMyLocation)
                        }
                    }
                    .cancellable(id: CancelID.locationSync),

                    // Initial fetch + Realtime subscription for member locations
                    .run { send in
                        await send(.locationSyncTick)
                        await send(.subscribeToRealtimeMembers)
                    },

                    // Initial fetch + Realtime subscription for rally points
                    .run { send in
                        await send(.subscribeToRealtimeRallyPoints)
                    }
                )

            case .subscribeToRealtimeMembers:
                guard let groupId = state.session?.id else { return .none }
                return .run { send in
                    let channel = supabase.realtimeV2.channel("group-members-\(groupId.uuidString)")

                    let updates = channel.postgresChange(
                        UpdateAction.self,
                        schema: "public",
                        table: "group_ride_members",
                        filter: "group_id=eq.\(groupId.uuidString)"
                    )

                    let inserts = channel.postgresChange(
                        InsertAction.self,
                        schema: "public",
                        table: "group_ride_members",
                        filter: "group_id=eq.\(groupId.uuidString)"
                    )

                    let deletes = channel.postgresChange(
                        DeleteAction.self,
                        schema: "public",
                        table: "group_ride_members",
                        filter: "group_id=eq.\(groupId.uuidString)"
                    )

                    try await channel.subscribeWithError()

                    // Listen for member location updates
                    await withTaskGroup(of: Void.self) { group in
                        group.addTask {
                            for await update in updates {
                                if let memberLoc = Self.parseMemberLocation(from: update.record) {
                                    await send(.realtimeMemberUpdated(memberLoc))
                                }
                            }
                        }
                        group.addTask {
                            for await insert in inserts {
                                if let memberLoc = Self.parseMemberLocation(from: insert.record) {
                                    await send(.realtimeMemberUpdated(memberLoc))
                                }
                            }
                        }
                        group.addTask {
                            for await delete in deletes {
                                if let riderIdStr = delete.oldRecord["rider_id"]?.stringValue,
                                   let riderId = UUID(uuidString: riderIdStr) {
                                    await send(.realtimeMemberRemoved(riderId))
                                }
                            }
                        }
                        await group.waitForAll()
                    }
                }
                .cancellable(id: CancelID.realtimeMembers)

            case .subscribeToRealtimeRallyPoints:
                guard let groupId = state.session?.id else { return .none }
                return .run { send in
                    // Initial fetch
                    do {
                        let rallyRows: [RallyPointRow] = try await supabase
                            .from("group_rally_points")
                            .select()
                            .eq("group_id", value: groupId.uuidString)
                            .execute()
                            .value
                        let points = rallyRows.map { row in
                            State.RallyPoint(
                                id: row.id,
                                name: row.name,
                                latitude: row.latitude,
                                longitude: row.longitude,
                                createdBy: row.createdBy,
                                createdAt: row.createdAt
                            )
                        }
                        await send(.rallyPointsLoaded(points))
                    } catch {
                        // Silent failure
                    }

                    // Realtime subscription for rally point changes
                    let channel = supabase.realtimeV2.channel("group-rally-\(groupId.uuidString)")

                    let inserts = channel.postgresChange(
                        InsertAction.self,
                        schema: "public",
                        table: "group_rally_points",
                        filter: "group_id=eq.\(groupId.uuidString)"
                    )

                    let deletes = channel.postgresChange(
                        DeleteAction.self,
                        schema: "public",
                        table: "group_rally_points",
                        filter: "group_id=eq.\(groupId.uuidString)"
                    )

                    try? await channel.subscribeWithError()

                    await withTaskGroup(of: Void.self) { group in
                        group.addTask {
                            for await insert in inserts {
                                if let point = Self.parseRallyPoint(from: insert.record) {
                                    await send(.rallyPointAdded(point))
                                }
                            }
                        }
                        group.addTask {
                            for await delete in deletes {
                                if let idStr = delete.oldRecord["id"]?.stringValue,
                                   let id = UUID(uuidString: idStr) {
                                    await send(.removeRallyPoint(id))
                                }
                            }
                        }
                        await group.waitForAll()
                    }
                }
                .cancellable(id: CancelID.realtimeRallyPoints)

            case .locationSyncTick:
                guard let groupId = state.session?.id else { return .none }
                return .run { send in
                    do {
                        // Initial fetch of member locations
                        let memberRows: [GroupRideMemberRow] = try await supabase
                            .from("group_ride_members")
                            .select()
                            .eq("group_id", value: groupId.uuidString)
                            .execute()
                            .value

                        var locations: [UUID: State.MemberLocation] = [:]
                        for row in memberRows {
                            let role = GroupSession.GroupMember.Role(rawValue: row.role) ?? .member
                            if let loc = row.lastLocation {
                                locations[row.riderId] = State.MemberLocation(
                                    riderId: row.riderId,
                                    displayName: row.displayName,
                                    role: role,
                                    latitude: loc.latitude,
                                    longitude: loc.longitude,
                                    heading: loc.heading,
                                    speedMPH: loc.speedMPH,
                                    lastSeen: row.lastSeen ?? row.joinedAt
                                )
                            }
                        }
                        await send(.memberLocationsReceived(locations))
                    } catch {
                        // Silent failure — Realtime will handle updates
                    }
                }

            case let .memberLocationsReceived(locations):
                state.memberLocations = locations
                return .none

            case let .realtimeMemberUpdated(memberLoc):
                state.memberLocations[memberLoc.riderId] = memberLoc
                return .none

            case let .realtimeMemberRemoved(riderId):
                state.memberLocations.removeValue(forKey: riderId)
                return .none

            case .publishMyLocation:
                guard let groupId = state.session?.id else { return .none }
                return .run { _ in
                    do {
                        let authSession = try await supabase.auth.session
                        let riderId = authSession.user.id
                        let location = try await locationService.currentLocation()
                        let now = ISO8601DateFormatter().string(from: Date())

                        let payload = LocationUpdatePayload(
                            lastLocation: LocationJSON(
                                latitude: location.coordinate.latitude,
                                longitude: location.coordinate.longitude,
                                heading: location.course >= 0 ? location.course : nil,
                                speedMPH: max(0, location.speed * 2.23694)
                            ),
                            lastSeen: now
                        )

                        try await supabase.from("group_ride_members")
                            .update(payload)
                            .eq("group_id", value: groupId.uuidString)
                            .eq("rider_id", value: riderId.uuidString)
                            .execute()
                    } catch {
                        // Location unavailable or network error — skip this tick
                    }
                }

            // MARK: Rally Points
            case let .addRallyPoint(name, lat, lng):
                guard let groupId = state.session?.id else { return .none }
                let pointName = name.isEmpty ? "Rally Point" : name
                return .run { send in
                    do {
                        let authSession = try await supabase.auth.session
                        let riderId = authSession.user.id
                        let pointId = UUID()

                        try await supabase.from("group_rally_points").insert(
                            RallyPointInsertPayload(
                                id: pointId.uuidString,
                                groupId: groupId.uuidString,
                                name: pointName,
                                latitude: lat,
                                longitude: lng,
                                createdBy: riderId.uuidString
                            )
                        ).execute()

                        let point = State.RallyPoint(
                            id: pointId,
                            name: pointName,
                            latitude: lat,
                            longitude: lng,
                            createdBy: riderId,
                            createdAt: Date()
                        )
                        await send(.rallyPointAdded(point))
                    } catch {
                        // Silently fail
                    }
                }

            case let .rallyPointAdded(point):
                state.rallyPoints.append(point)
                return .none

            case let .rallyPointsLoaded(points):
                state.rallyPoints = points
                return .none

            case let .removeRallyPoint(pointId):
                state.rallyPoints.removeAll { $0.id == pointId }
                return .run { _ in
                    try? await supabase.from("group_rally_points")
                        .delete()
                        .eq("id", value: pointId.uuidString)
                        .execute()
                }

            // MARK: SOS Broadcast
            case .sosBroadcastTapped:
                // Bubble up to AppReducer for SOS handling
                return .none

            // MARK: Error
            case .errorDismissed:
                state.errorMessage = nil
                return .none
            }
        }
    }

    // MARK: - Realtime Record Parsers

    /// Parse a MemberLocation from a Realtime postgres change record ([String: AnyJSON]).
    private static func parseMemberLocation(from record: [String: AnyJSON]) -> State.MemberLocation? {
        guard let riderIdStr = record["rider_id"]?.stringValue,
              let riderId = UUID(uuidString: riderIdStr),
              let displayName = record["display_name"]?.stringValue,
              let roleStr = record["role"]?.stringValue
        else { return nil }

        let role = GroupSession.GroupMember.Role(rawValue: roleStr) ?? .member

        // Parse last_location JSONB — may be a nested object
        var latitude: Double?
        var longitude: Double?
        var heading: Double?
        var speedMPH: Double?

        if let locObj = record["last_location"]?.objectValue {
            latitude = locObj["latitude"]?.doubleValue
            longitude = locObj["longitude"]?.doubleValue
            heading = locObj["heading"]?.doubleValue
            speedMPH = locObj["speed_mph"]?.doubleValue
        }

        guard let lat = latitude, let lng = longitude else { return nil }

        let lastSeen: Date
        if let lastSeenStr = record["last_seen"]?.stringValue {
            lastSeen = ISO8601DateFormatter().date(from: lastSeenStr) ?? Date()
        } else {
            lastSeen = Date()
        }

        return State.MemberLocation(
            riderId: riderId,
            displayName: displayName,
            role: role,
            latitude: lat,
            longitude: lng,
            heading: heading,
            speedMPH: speedMPH,
            lastSeen: lastSeen
        )
    }

    /// Parse a RallyPoint from a Realtime postgres change record.
    private static func parseRallyPoint(from record: [String: AnyJSON]) -> State.RallyPoint? {
        guard let idStr = record["id"]?.stringValue,
              let id = UUID(uuidString: idStr),
              let name = record["name"]?.stringValue,
              let lat = record["latitude"]?.doubleValue,
              let lng = record["longitude"]?.doubleValue,
              let createdByStr = record["created_by"]?.stringValue,
              let createdBy = UUID(uuidString: createdByStr)
        else { return nil }

        let createdAt: Date
        if let createdAtStr = record["created_at"]?.stringValue {
            createdAt = ISO8601DateFormatter().date(from: createdAtStr) ?? Date()
        } else {
            createdAt = Date()
        }

        return State.RallyPoint(
            id: id,
            name: name,
            latitude: lat,
            longitude: lng,
            createdBy: createdBy,
            createdAt: createdAt
        )
    }
}
