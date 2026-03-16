// TrailCondition.swift
// TrailGuard — Models
//
// Community-reported trail condition. Public read, auth-required write.

import Foundation

struct TrailCondition: Codable, Identifiable, Equatable {
    let id: UUID
    let reporterId: UUID
    var trailName: String
    let lat: Double
    let lng: Double
    var condition: ConditionType
    var severity: Int               // 1-5 scale
    var notes: String?              // 140 char max
    var rideType: User.RideType?    // nil = applicable to all ride types
    var upvotes: Int
    let createdAt: Date

    // MARK: - Condition Type

    enum ConditionType: String, Codable, CaseIterable, Identifiable {
        case groomed    = "groomed"
        case powder     = "powder"
        case icy        = "icy"
        case wetSnow    = "wet_snow"
        case trackedOut = "tracked_out"
        case closed     = "closed"

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .groomed:    return "Groomed"
            case .powder:     return "Powder"
            case .icy:        return "Icy"
            case .wetSnow:    return "Wet Snow"
            case .trackedOut: return "Tracked Out"
            case .closed:     return "Closed"
            }
        }

        // TODO: Map to color for condition pin on map
        var colorHex: String {
            switch self {
            case .groomed:    return "#22C55E"   // green
            case .powder:     return "#60A5FA"   // blue
            case .icy:        return "#93C5FD"   // light blue
            case .wetSnow:    return "#A78BFA"   // purple
            case .trackedOut: return "#FBBF24"   // amber
            case .closed:     return "#EF4444"   // red
            }
        }
    }

    // MARK: - Supabase Column Mapping

    // MARK: - Time Ago

    var timeAgo: String {
        let interval = Date().timeIntervalSince(createdAt)
        let minutes = Int(interval / 60)
        if minutes < 60 { return "\(minutes)m ago" }
        let hours = minutes / 60
        if hours < 24 { return "\(hours)h ago" }
        let days = hours / 24
        return "\(days)d ago"
    }

    // MARK: - Supabase Column Mapping

    enum CodingKeys: String, CodingKey {
        case id
        case reporterId = "reporter_id"
        case trailName  = "trail_name"
        case lat
        case lng
        case condition  = "condition_type"
        case severity
        case notes      = "description"
        case rideType   = "ride_type"
        case upvotes
        case createdAt  = "created_at"
    }
}
