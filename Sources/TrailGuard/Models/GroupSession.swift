// GroupSession.swift
// TrailGuard — Models
//
// Group ride session: creation, membership, roles, expiry.
// Free tier: max 4 members. Pro: unlimited.

import Foundation
import CoreLocation

struct GroupSession: Codable, Identifiable, Equatable {
    let id: UUID
    var name: String
    var inviteCode: String              // 6-char alphanumeric, unique, case-insensitive
    var createdBy: UUID
    var expiresAt: Date                 // default: 24h from creation
    var members: [GroupMember]
    var createdAt: Date

    var isExpired: Bool { expiresAt < Date() }

    var leader: GroupMember? {
        members.first { $0.role == .leader }
    }

    var sweep: GroupMember? {
        members.first { $0.role == .sweep }
    }

    // MARK: - Group Member

    struct GroupMember: Codable, Identifiable, Equatable {
        let id: UUID
        let riderId: UUID
        var displayName: String
        var role: Role
        var joinedAt: Date

        // Live state — not persisted in DB, populated from rider_locations Realtime
        var lastLocation: MemberLocation?
        var batteryLevel: Float?        // 0.0–1.0, reported every ~30s

        enum Role: String, Codable, CaseIterable {
            case leader = "leader"
            case sweep  = "sweep"
            case member = "member"

            var displayName: String {
                switch self {
                case .leader: return "Leader"
                case .sweep:  return "Sweep"
                case .member: return "Member"
                }
            }
        }

        struct MemberLocation: Equatable {
            var coordinate: CLLocationCoordinate2D
            var heading: Double?
            var speedMPH: Double?
            var lastSeen: Date

            static func == (lhs: Self, rhs: Self) -> Bool {
                lhs.coordinate.latitude == rhs.coordinate.latitude &&
                lhs.coordinate.longitude == rhs.coordinate.longitude &&
                lhs.lastSeen == rhs.lastSeen
            }
        }

        // CodingKeys excludes live state (lastLocation, batteryLevel) from Supabase decode
        enum CodingKeys: String, CodingKey {
            case id
            case riderId    = "rider_id"
            case displayName = "display_name"
            case role
            case joinedAt   = "joined_at"
        }
    }

    // MARK: - Supabase Column Mapping

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case inviteCode = "invite_code"
        case createdBy  = "created_by"
        case expiresAt  = "expires_at"
        case members
        case createdAt  = "created_at"
    }
}
