// Ride.swift
// TrailGuard — Models
//
// Ride session and waypoint models.
// Waypoints are batch-written every 30s and stored locally in CoreData as offline backup.

import Foundation

struct Ride: Codable, Identifiable, Equatable {
    let id: UUID
    let riderId: UUID
    var groupId: UUID?
    var rideType: User.RideType
    var startedAt: Date
    var endedAt: Date?
    var distanceMiles: Double?
    var maxSpeedMPH: Double?
    var durationSeconds: Int?

    // Waypoints are lazy-loaded — not embedded in this struct for list views
    // TODO: Load via supabaseClient.fetchWaypoints(rideId: id) when needed

    var isActive: Bool { endedAt == nil }

    // MARK: - Computed display values

    var durationFormatted: String {
        guard let secs = durationSeconds else { return "--" }
        let hours = secs / 3600
        let minutes = (secs % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }

    var distanceFormatted: String {
        guard let miles = distanceMiles else { return "--" }
        return String(format: "%.1f mi", miles)
    }

    // MARK: - Supabase Column Mapping

    enum CodingKeys: String, CodingKey {
        case id
        case riderId        = "rider_id"
        case groupId        = "group_id"
        case rideType       = "ride_type"
        case startedAt      = "started_at"
        case endedAt        = "ended_at"
        case distanceMiles  = "distance_miles"
        case maxSpeedMPH    = "max_speed_mph"
        case durationSeconds = "duration_seconds"
    }
}

// MARK: - Waypoint

struct Waypoint: Codable, Identifiable, Equatable {
    let id: Int64           // bigserial from Supabase
    let rideId: UUID
    let lat: Double
    let lng: Double
    let altitudeM: Double?
    let speedMPH: Double?
    let heading: Double?    // degrees 0-360
    let recordedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case rideId     = "ride_id"
        case lat
        case lng
        case altitudeM  = "altitude_m"
        case speedMPH   = "speed_mph"
        case heading
        case recordedAt = "recorded_at"
    }
}

// MARK: - In-memory waypoint buffer (for batch writes)

/// Ring buffer holding waypoints pending flush to Supabase.
/// Flushed every 30 seconds or when ride ends.
/// TODO: Implement in LocationService, not here
struct WaypointBuffer {
    var pending: [Waypoint] = []
    let flushIntervalSeconds: Double = 30

    mutating func append(_ waypoint: Waypoint) {
        pending.append(waypoint)
    }

    mutating func drain() -> [Waypoint] {
        let batch = pending
        pending = []
        return batch
    }
}
