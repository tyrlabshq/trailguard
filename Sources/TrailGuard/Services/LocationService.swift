// LocationService.swift
// TrailGuard — Services
//
// Wraps CoreLocation for always-on background ride tracking.
// Published as a TCA dependency via DependencyKey.

import CoreLocation
import Combine
import ComposableArchitecture
import Foundation

// MARK: - TCA Dependency Interface

struct LocationServiceClient {
    /// Request always-on authorization (required for background tracking)
    var requestAlwaysAuthorization: @Sendable () async -> Void
    /// Current authorization status
    var authorizationStatus: @Sendable () -> CLAuthorizationStatus
    /// Start updating location. Returns AsyncStream of CLLocation updates.
    var startUpdating: @Sendable () -> AsyncStream<CLLocation>
    /// Stop location updates
    var stopUpdating: @Sendable () -> Void
    /// One-shot current location
    var currentLocation: @Sendable () async throws -> CLLocation
}

// MARK: - Dependency Key

private enum LocationServiceKey: DependencyKey {
    static let liveValue: LocationServiceClient = .live
    static let testValue: LocationServiceClient = .noop
}

extension DependencyValues {
    var locationService: LocationServiceClient {
        get { self[LocationServiceKey.self] }
        set { self[LocationServiceKey.self] = newValue }
    }
}

// MARK: - Live Implementation

extension LocationServiceClient {
    static var live: Self {
        let manager = LocationManager()
        return Self(
            requestAlwaysAuthorization: {
                await manager.requestAlwaysAuthorization()
            },
            authorizationStatus: {
                manager.locationManager.authorizationStatus
            },
            startUpdating: {
                manager.startUpdating()
            },
            stopUpdating: {
                manager.stopUpdating()
            },
            currentLocation: {
                try await manager.currentLocation()
            }
        )
    }

    static var noop: Self {
        Self(
            requestAlwaysAuthorization: {},
            authorizationStatus: { .notDetermined },
            startUpdating: { AsyncStream { $0.finish() } },
            stopUpdating: {},
            currentLocation: { throw LocationError.unavailable }
        )
    }
}

enum LocationError: Error {
    case unavailable
    case denied
}

// MARK: - CLLocationManager Wrapper

private final class LocationManager: NSObject, CLLocationManagerDelegate, @unchecked Sendable {
    let locationManager = CLLocationManager()
    private var continuation: AsyncStream<CLLocation>.Continuation?
    private var authContinuation: CheckedContinuation<Void, Never>?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = 5 // meters
        locationManager.activityType = .otherNavigation
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.showsBackgroundLocationIndicator = true
    }

    func requestAlwaysAuthorization() async {
        let status = locationManager.authorizationStatus
        guard status == .notDetermined else { return }
        await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
            self.authContinuation = cont
            self.locationManager.requestAlwaysAuthorization()
        }
    }

    func startUpdating() -> AsyncStream<CLLocation> {
        AsyncStream { continuation in
            self.continuation = continuation
            continuation.onTermination = { [weak self] _ in
                self?.locationManager.stopUpdatingLocation()
                self?.continuation = nil
            }
            self.locationManager.startUpdatingLocation()
        }
    }

    func stopUpdating() {
        locationManager.stopUpdatingLocation()
        continuation?.finish()
        continuation = nil
    }

    func currentLocation() async throws -> CLLocation {
        let stream = startUpdating()
        for await location in stream {
            stopUpdating()
            return location
        }
        throw LocationError.unavailable
    }

    // MARK: CLLocationManagerDelegate

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        for location in locations {
            continuation?.yield(location)
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authContinuation?.resume()
        authContinuation = nil
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        #if DEBUG
        print("[LocationService] Error: \(error.localizedDescription)")
        #endif
    }
}
