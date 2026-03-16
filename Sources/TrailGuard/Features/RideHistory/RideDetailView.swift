// RideDetailView.swift
// TrailGuard — Features/RideHistory
//
// Full ride stats with route map overlay showing waypoints as an orange polyline.
// Share button exports a plain-text ride summary.

import SwiftUI
import MapKit
import ComposableArchitecture

struct RideDetailView: View {
    let store: StoreOf<RideDetailReducer>

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Map
                DetailRouteMapView(waypoints: store.waypoints)
                    .frame(height: 260)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay {
                        if store.isLoadingWaypoints {
                            ProgressView()
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .background(.ultraThinMaterial)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                    }

                // Stats
                VStack(spacing: 14) {
                    DetailStatRow(label: "Distance", value: store.ride.distanceFormatted, icon: "point.topleft.down.to.point.bottomright.curvepath")
                    DetailStatRow(label: "Duration", value: store.ride.durationFormatted, icon: "clock")
                    if let maxSpeed = store.ride.maxSpeedMPH {
                        DetailStatRow(label: "Max Speed", value: String(format: "%.0f mph", maxSpeed), icon: "gauge.with.needle")
                    }

                    DetailStatRow(
                        label: "Started",
                        value: store.ride.startedAt.formatted(date: .abbreviated, time: .shortened),
                        icon: "play.circle"
                    )
                    if let ended = store.ride.endedAt {
                        DetailStatRow(
                            label: "Ended",
                            value: ended.formatted(date: .abbreviated, time: .shortened),
                            icon: "stop.circle"
                        )
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 16))

                if let error = store.waypointError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }
            .padding()
        }
        .navigationTitle("Ride Detail")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                ShareLink(item: rideSummaryText) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
        .task { store.send(.onAppear) }
    }

    private var rideSummaryText: String {
        let ride = store.ride
        var lines: [String] = ["TrailGuard Ride Summary"]
        lines.append("Date: \(ride.startedAt.formatted(date: .abbreviated, time: .shortened))")
        lines.append("Distance: \(ride.distanceFormatted)")
        lines.append("Duration: \(ride.durationFormatted)")
        if let maxSpeed = ride.maxSpeedMPH {
            lines.append("Max Speed: \(String(format: "%.0f mph", maxSpeed))")
        }
        return lines.joined(separator: "\n")
    }
}

// MARK: - Detail Route Map (iOS 16 UIViewRepresentable)

private struct DetailRouteMapView: UIViewRepresentable {
    let waypoints: [Waypoint]

    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.isScrollEnabled = true
        mapView.isZoomEnabled = true
        mapView.showsUserLocation = false
        mapView.delegate = context.coordinator
        return mapView
    }

    func updateUIView(_ mapView: MKMapView, context: Context) {
        mapView.removeOverlays(mapView.overlays)

        guard waypoints.count >= 2 else { return }

        let coords = waypoints.map {
            CLLocationCoordinate2D(latitude: $0.lat, longitude: $0.lng)
        }
        let polyline = MKPolyline(coordinates: coords, count: coords.count)
        mapView.addOverlay(polyline)

        // Fit map to route
        let rect = polyline.boundingMapRect
        let insets = UIEdgeInsets(top: 30, left: 30, bottom: 30, right: 30)
        mapView.setVisibleMapRect(rect, edgePadding: insets, animated: false)
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
    }
}

// MARK: - Stat Row

private struct DetailStatRow: View {
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

#Preview {
    NavigationStack {
        RideDetailView(
            store: Store(initialState: RideDetailReducer.State(
                ride: Ride(
                    id: UUID(),
                    riderId: UUID(),
                    rideType: .snowmobile,
                    startedAt: Date().addingTimeInterval(-3600),
                    endedAt: Date(),
                    distanceMiles: 12.4,
                    maxSpeedMPH: 42,
                    durationSeconds: 3600
                )
            )) {
                RideDetailReducer()
            }
        )
    }
}
