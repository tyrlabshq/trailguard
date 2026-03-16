// User.swift
// TrailGuard — Models
//
// Rider profile model. Extends Supabase auth.users via the public.riders table.

import Foundation

struct User: Codable, Identifiable, Equatable {
    let id: UUID                            // Supabase auth.uid()
    var displayName: String
    var avatarURL: URL?
    var rideType: RideType                  // Default ride type for map layer + trail filters
    var subscriptionTier: SubscriptionTier
    var garminMapShareId: String?           // Garmin MapShare identifier (Pro feature)
    var createdAt: Date

    // MARK: - Nested Enums

    enum RideType: String, Codable, CaseIterable, Identifiable {
        case snowmobile = "snowmobile"
        case atv        = "atv"
        case utv        = "utv"
        case dirtBike   = "dirt_bike"

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .snowmobile: return "Snowmobile"
            case .atv:        return "ATV"
            case .utv:        return "UTV"
            case .dirtBike:   return "Dirt Bike"
            }
        }

        // TODO: Add map layer config (trail filter type, pin icon)
        // TODO: Add crash detection profile (G-force profile may differ per vehicle class)
    }

    enum SubscriptionTier: String, Codable, CaseIterable {
        case free = "free"
        case pro  = "pro"

        var maxGroupMembers: Int {
            switch self {
            case .free: return 4
            case .pro:  return .max
            }
        }

        var maxOfflineRegions: Int {
            switch self {
            case .free: return 1
            case .pro:  return .max
            }
        }

        var hasSatelliteBridge: Bool { self == .pro }
        var hasSMSAlerts: Bool { self == .pro }
        var hasRideReplay: Bool { self == .pro }
        var hasUnlimitedRideHistory: Bool { self == .pro }
    }

    // MARK: - Supabase Column Mapping
    enum CodingKeys: String, CodingKey {
        case id
        case displayName    = "display_name"
        case avatarURL      = "avatar_url"
        case rideType       = "ride_type"
        case subscriptionTier = "sub_tier"
        case garminMapShareId = "garmin_mapshare_id"
        case createdAt      = "created_at"
    }
}
