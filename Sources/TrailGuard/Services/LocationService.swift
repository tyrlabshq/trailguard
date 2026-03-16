// LocationService.swift
// TrailGuard — Services
//
// Wraps CoreLocation for always-on background ride tracking.
// Published as a TCA dependency via @DependencyClient.

import CoreLocation
import Combine
import ComposableArchitecture
import Foundation

// MARK: - TCA Dependency Key

/// LocationService dependency — inject in reducers that need live location.
/// TODO: Register with DependencyValues
struct LocationServiceClient {
    /// Request always-on authorization (required for crash detection + background tracking)
    var requestAlwaysAuthorization: () async -> Void
    /// Current authorization status
    var authorizationStatus: () -> CLAuthorizationStatus
    /// Start updating location. Returns AsyncStream of CLLocation updates.
    var startUpdating: () -> AsyncStream<CLLocation>
    /// Stop location updates (called when ride ends or app moves to fully inactive state)
    var stopUpdating: () -> Void
    /// One-shot current location (for pre-ride checks, report coordinate pre-fill)
    var currentLocation: () async throws -> CLLocation
}

// MARK: - Live Implementation Shell

final class LocationService: NSObject, CLLocationManagerDelegate {

    static let shared = LocationService()

    private let locationManager = CLLocationManager()
    private var locationContinuation: AsyncStream<CLLocation>.Continuation?

    override private init() {
        super.init()
        locationManager.delegate = self
        // TODO: Configure for motorized trail use
        // locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        // locationManager.distanceFilter = 5        // meters
        // locationManager.activityType = .otherNavigation
        // locationManager.allowsBackgroundLocationUpdates = true
        // locationManager.pausesLocationUpdatesAutomatically = false
    }

    // MARK: - CLLocationManagerDelegate

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        // TODO: Feed locations into AsyncStream continuation
        // TODO: Buffer waypoints for batch write every 30s
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        // TODO: Notify app of authorization change
        // If .denied or .restricted → show "Location required" prompt
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // TODO: Log error, attempt recovery
        // If CLError.denied → stop updates, notify user
    }

    // MARK: - Waypoint Batching

    /// Flushes buffered waypoints to Supabase every 30s during active ride.
    /// TODO: Implement flush timer + supabaseClient.insertWaypoints()
    private func scheduleWaypointFlush() { }
}
