// RideRecordingView.swift
// TrailGuard — Features/RideRecording
//
// Active ride HUD with live map, stats overlay, DMS status indicator,
// and pause/stop controls. Replaces the Coming Soon placeholder in the Ride tab.

import SwiftUI
import MapKit
import ComposableArchitecture

// MARK: - Main View

struct RideRecordingView: View {
    let rideStore: StoreOf<RideRecordingReducer>
    let dmsStore: StoreOf<DeadManSwitchReducer>

    var body: some View {
        NavigationStack {
            ZStack {
                switch rideStore.phase {
                case .idle:
                    IdleView(rideStore: rideStore, dmsStore: dmsStore)

                case .countdown:
                    CountdownOverlay(seconds: rideStore.countdownSeconds)

                case .recording, .paused:
                    ActiveRideView(rideStore: rideStore, dmsStore: dmsStore)

                case .finished:
                    RideSummaryView(rideStore: rideStore)
                }
            }
            .navigationTitle("Ride")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Idle State (Start Ride + DMS config)

private struct IdleView: View {
    let rideStore: StoreOf<RideRecordingReducer>
    let dmsStore: StoreOf<DeadManSwitchReducer>

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Hero
                VStack(spacing: 12) {
                    Image(systemName: "location.north.circle.fill")
                        .font(.system(size: 72))
                        .foregroundStyle(.orange)


                    Text("Record Your Ride")
                        .font(.title2.bold())

                    Text("GPS tracking with live speed, distance, and elevation. Your route is saved and synced automatically.")
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.vertical, 12)

                // DMS quick status
                DMSStatusCard(store: dmsStore)

                // Start button
                Button {
                    rideStore.send(.startRideTapped)
                } label: {
                    HStack {
                        Image(systemName: "play.fill")
                            .font(.title3)
                        Text("Start Ride")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(Color.orange)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(color: .orange.opacity(0.4), radius: 8, y: 4)
                }

                Text("3-second countdown before tracking begins")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding()
        }
    }
}

// MARK: - Countdown Overlay

private struct CountdownOverlay: View {
    let seconds: Int

    var body: some View {
        VStack(spacing: 20) {
            Text("\(seconds)")
                .font(.system(size: 120, weight: .bold, design: .rounded))
                .foregroundStyle(.orange)
                .contentTransition(.numericText())
                .animation(.easeInOut(duration: 0.3), value: seconds)

            Text("Get ready...")
                .font(.title3)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

// MARK: - Active Ride View (Map + HUD)

private struct ActiveRideView: View {
    let rideStore: StoreOf<RideRecordingReducer>
    let dmsStore: StoreOf<DeadManSwitchReducer>
    @State private var showStopConfirmation = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Map
            RouteMapView(
                coordinates: rideStore.routeCoordinates,
                currentLocation: rideStore.lastLocation
            )
            .ignoresSafeArea(edges: .top)

            // Stats overlay
            VStack(spacing: 0) {
                // DMS mini indicator
                if dmsStore.isActive {
                    DMSMiniBar(store: dmsStore)
                }

                // Paused banner
                if rideStore.phase == .paused {
                    HStack {
                        Image(systemName: "pause.circle.fill")
                        Text("PAUSED")
                            .font(.headline)
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.orange)
                }

                // Stats grid
                StatsGrid(store: rideStore)

                // Controls
                ControlsBar(
                    store: rideStore,
                    showStopConfirmation: $showStopConfirmation
                )
            }
            .background(.ultraThinMaterial)
        }
        .confirmationDialog(
            "End Ride?",
            isPresented: $showStopConfirmation
        ) {
            Button("End Ride", role: .destructive) {
                rideStore.send(.confirmStop)
            }
            Button("Cancel", role: .cancel) {
                rideStore.send(.cancelStop)
            }
        } message: {
            Text("Your ride data will be saved.")
        }
    }
}

// MARK: - Route Map (iOS 16-compatible UIViewRepresentable)

private struct RouteMapView: UIViewRepresentable {
    let coordinates: [RideRecordingReducer.CoordinatePoint]
    let currentLocation: RideRecordingReducer.CoordinatePoint?

    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.showsUserLocation = false
        mapView.delegate = context.coordinator
        return mapView
    }

    func updateUIView(_ mapView: MKMapView, context: Context) {
        // Remove old overlays/annotations
        mapView.removeOverlays(mapView.overlays)
        mapView.removeAnnotations(mapView.annotations)

        // Draw route polyline
        if coordinates.count >= 2 {
            let coords = coordinates.map {
                CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude)
            }
            let polyline = MKPolyline(coordinates: coords, count: coords.count)
            mapView.addOverlay(polyline)
        }

        // Add current position pin
        if let current = currentLocation {
            let annotation = MKPointAnnotation()
            annotation.coordinate = CLLocationCoordinate2D(
                latitude: current.latitude,
                longitude: current.longitude
            )
            mapView.addAnnotation(annotation)

            // Center map on current location
            let region = MKCoordinateRegion(
                center: annotation.coordinate,
                latitudinalMeters: 500,
                longitudinalMeters: 500
            )
            mapView.setRegion(region, animated: true)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator: NSObject, MKMapViewDelegate {
        func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
            if let polyline = overlay as? MKPolyline {
                let renderer = MKPolylineRenderer(polyline: polyline)
                renderer.strokeColor = UIColor.systemOrange
                renderer.lineWidth = 4
                return renderer
            }
            return MKOverlayRenderer(overlay: overlay)
        }

        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            let view = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: "current")
            view.markerTintColor = .systemOrange
            view.glyphImage = UIImage(systemName: "location.fill")
            return view
        }
    }
}

// MARK: - Stats Grid

private struct StatsGrid: View {
    let store: StoreOf<RideRecordingReducer>

    var body: some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ],
            spacing: 8
        ) {
            StatCell(label: "Duration", value: store.durationFormatted, icon: "clock")
            StatCell(label: "Distance", value: store.distanceFormatted, icon: "point.topleft.down.to.point.bottomright.curvepath")
            StatCell(label: "Speed", value: store.speedFormatted, icon: "gauge.with.needle")
            StatCell(label: "Elevation", value: store.elevationFormatted, icon: "mountain.2")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
    }
}

private struct StatCell: View {
    let label: String
    let value: String
    let icon: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.system(.body, design: .rounded, weight: .bold))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Controls Bar

private struct ControlsBar: View {
    let store: StoreOf<RideRecordingReducer>
    @Binding var showStopConfirmation: Bool

    var body: some View {
        HStack(spacing: 20) {
            if store.phase == .recording {
                // Pause
                Button {
                    store.send(.pauseRideTapped)
                } label: {
                    Label("Pause", systemImage: "pause.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.orange)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
            } else if store.phase == .paused {
                // Resume
                Button {
                    store.send(.resumeRideTapped)
                } label: {
                    Label("Resume", systemImage: "play.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.green)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
            }

            // Stop
            Button {
                showStopConfirmation = true
                store.send(.stopRideTapped)
            } label: {
                Label("Stop", systemImage: "stop.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.red)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .padding(.bottom, 4)
    }
}

// MARK: - DMS Status Card (idle screen)

private struct DMSStatusCard: View {
    let store: StoreOf<DeadManSwitchReducer>

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: store.isActive ? "timer.circle.fill" : "timer.circle")
                .font(.title2)
                .foregroundStyle(store.isActive ? .green : .secondary)

            VStack(alignment: .leading, spacing: 2) {
                Text("Dead Man's Switch")
                    .font(.subheadline.weight(.semibold))
                if store.isActive {
                    Text("Active — \(formatSeconds(store.secondsRemaining)) remaining")
                        .font(.caption)
                        .foregroundStyle(.green)
                } else {
                    Text("Inactive — configure in DMS tab")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if store.isActive {
                Circle()
                    .fill(dmsColor(store: store))
                    .frame(width: 12, height: 12)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func dmsColor(store: StoreOf<DeadManSwitchReducer>) -> Color {
        let fraction = Double(store.secondsRemaining) / Double(max(1, store.effectiveMinutes * 60))
        if store.snoozeCount >= 2 { return .red }
        if fraction < 0.25 { return .orange }
        return .green
    }

    private func formatSeconds(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        return String(format: "%d:%02d", m, s)
    }
}

// MARK: - DMS Mini Bar (during active ride)

private struct DMSMiniBar: View {
    let store: StoreOf<DeadManSwitchReducer>

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)

            Text("DMS")
                .font(.caption2.weight(.bold))

            Text(formatSeconds(store.secondsRemaining))
                .font(.caption2.monospacedDigit())

            Spacer()

            // Snooze dots
            HStack(spacing: 3) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .fill(i < store.snoozeCount ? Color.orange : Color(.systemFill))
                        .frame(width: 6, height: 6)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(statusColor.opacity(0.15))
    }

    private var statusColor: Color {
        let fraction = Double(store.secondsRemaining) / Double(max(1, store.effectiveMinutes * 60))
        if store.snoozeCount >= 2 { return .red }
        if fraction < 0.25 { return .orange }
        return .green
    }

    private func formatSeconds(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        return String(format: "%d:%02d", m, s)
    }
}

// MARK: - Ride Summary

private struct RideSummaryView: View {
    let rideStore: StoreOf<RideRecordingReducer>

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Image(systemName: "flag.checkered")
                    .font(.system(size: 64))
                    .foregroundStyle(.orange)

                Text("Ride Complete")
                    .font(.title.bold())

                // Stats summary
                VStack(spacing: 16) {
                    SummaryRow(label: "Duration", value: rideStore.durationFormatted, icon: "clock")
                    SummaryRow(label: "Distance", value: rideStore.distanceFormatted, icon: "point.topleft.down.to.point.bottomright.curvepath")
                    SummaryRow(label: "Max Speed", value: String(format: "%.0f mph", rideStore.maxSpeedMPH), icon: "gauge.with.needle")
                    SummaryRow(label: "Elevation", value: rideStore.elevationFormatted, icon: "mountain.2")
                    SummaryRow(label: "Waypoints", value: "\(rideStore.totalWaypointsSaved)", icon: "mappin.and.ellipse")
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 16))

                Button {
                    rideStore.send(.rideFinishedDismissed)
                } label: {
                    Text("Done")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.orange)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
            }
            .padding()
        }
    }
}

private struct SummaryRow: View {
    let label: String
    let value: String
    let icon: String

    var body: some View {
        HStack {
            Label(label, systemImage: icon)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.subheadline.weight(.semibold))
                .monospacedDigit()
        }
    }
}

// MARK: - Preview

#Preview("Idle") {
    RideRecordingView(
        rideStore: Store(initialState: RideRecordingReducer.State()) {
            RideRecordingReducer()
        },
        dmsStore: Store(initialState: DeadManSwitchReducer.State()) {
            DeadManSwitchReducer()
        }
    )
}

#Preview("Recording") {
    RideRecordingView(
        rideStore: Store(initialState: RideRecordingReducer.State(
            phase: .recording,
            rideId: UUID(),
            startedAt: Date().addingTimeInterval(-600),
            elapsedSeconds: 600,
            distanceMiles: 3.2,
            currentSpeedMPH: 24,
            maxSpeedMPH: 38,
            elevationFeet: 1240,
            totalWaypointsSaved: 45
        )) {
            RideRecordingReducer()
        },
        dmsStore: Store(initialState: DeadManSwitchReducer.State(
            isActive: true,
            secondsRemaining: 900
        )) {
            DeadManSwitchReducer()
        }
    )
}
