// GroupRideView.swift
// TrailGuard — Features/GroupRide
//
// Group ride creation, join, live map dashboard with member pins,
// rally point management, and leave/SOS controls.

import SwiftUI
import MapKit
import ComposableArchitecture

// MARK: - Main View

struct GroupRideView: View {
    let store: StoreOf<GroupRideReducer>

    var body: some View {
        NavigationStack {
            ZStack {
                switch store.phase {
                case .idle:
                    GroupIdleView(store: store)

                case .creating, .joining:
                    GroupLoadingView(phase: store.phase)

                case .active:
                    GroupActiveView(store: store)

                case .ended:
                    GroupEndedView(store: store)
                }
            }
            .navigationTitle("Group Ride")
            .navigationBarTitleDisplayMode(.inline)
            .alert(
                "Error",
                isPresented: .init(
                    get: { store.errorMessage != nil },
                    set: { if !$0 { store.send(.errorDismissed) } }
                )
            ) {
                Button("OK") { store.send(.errorDismissed) }
            } message: {
                Text(store.errorMessage ?? "")
            }
        }
    }
}

// MARK: - Idle View (Create / Join)

private struct GroupIdleView: View {
    let store: StoreOf<GroupRideReducer>
    @State private var groupName = ""
    @State private var joinCode = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                // Hero
                VStack(spacing: 12) {
                    Image(systemName: "person.3.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(.orange)

                    Text("Group Ride")
                        .font(.title2.bold())

                    Text("Ride together. See everyone on the map in real time with Leader and Sweep tracking.")
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 8)

                // Create Group Section
                VStack(alignment: .leading, spacing: 12) {
                    Label("Create a Group", systemImage: "plus.circle.fill")
                        .font(.headline)
                        .foregroundStyle(.orange)

                    TextField("Group Name (optional)", text: $groupName)
                        .textFieldStyle(.roundedBorder)

                    Button {
                        store.send(.createGroupTapped(name: groupName))
                    } label: {
                        HStack {
                            Image(systemName: "flag.checkered")
                            Text("Create Group")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.orange)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 16))

                // Divider
                HStack {
                    Rectangle().fill(Color(.separator)).frame(height: 1)
                    Text("OR").font(.caption).foregroundStyle(.secondary)
                    Rectangle().fill(Color(.separator)).frame(height: 1)
                }

                // Join Group Section
                VStack(alignment: .leading, spacing: 12) {
                    Label("Join a Group", systemImage: "person.badge.plus")
                        .font(.headline)
                        .foregroundStyle(.blue)

                    TextField("Enter 6-character code", text: $joinCode)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()

                    Button {
                        store.send(.joinGroupTapped(code: joinCode))
                    } label: {
                        HStack {
                            Image(systemName: "arrow.right.circle.fill")
                            Text("Join Group")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(joinCode.count >= 6 ? Color.blue : Color.gray)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(joinCode.count < 6)
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .padding()
        }
    }
}

// MARK: - Loading View

private struct GroupLoadingView: View {
    let phase: GroupRideReducer.State.Phase

    var body: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
            Text(phase == .creating ? "Creating group..." : "Joining group...")
                .font(.headline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Active Group View (Map + Controls)

private struct GroupActiveView: View {
    let store: StoreOf<GroupRideReducer>
    @State private var showRallyPointAlert = false
    @State private var pendingRallyLat: Double = 0
    @State private var pendingRallyLng: Double = 0
    @State private var rallyPointName = ""
    @State private var showMemberList = true

    var body: some View {
        ZStack(alignment: .bottom) {
            // Full-screen map
            GroupMapView(
                memberLocations: Array(store.memberLocations.values),
                rallyPoints: store.rallyPoints,
                onLongPress: { lat, lng in
                    pendingRallyLat = lat
                    pendingRallyLng = lng
                    rallyPointName = ""
                    showRallyPointAlert = true
                }
            )
            .ignoresSafeArea(edges: .top)

            // Bottom overlay
            VStack(spacing: 0) {
                // Group info bar
                GroupInfoBar(store: store)

                // Member list (collapsible)
                if showMemberList {
                    MemberListView(
                        members: Array(store.memberLocations.values),
                        myRiderId: store.myRiderId
                    )
                }

                // Rally points
                if !store.rallyPoints.isEmpty {
                    RallyPointBar(
                        points: store.rallyPoints,
                        onRemove: { id in store.send(.removeRallyPoint(id)) }
                    )
                }

                // Action bar
                GroupActionBar(store: store, showMemberList: $showMemberList)
            }
            .background(.ultraThinMaterial)
        }
        .confirmationDialog(
            "Leave Group?",
            isPresented: .init(
                get: { store.showLeaveConfirmation },
                set: { if !$0 { store.send(.cancelLeave) } }
            )
        ) {
            Button("Leave Group", role: .destructive) {
                store.send(.leaveGroupConfirmed)
            }
            Button("Cancel", role: .cancel) {
                store.send(.cancelLeave)
            }
        } message: {
            if store.myRole == .leader {
                Text("As the leader, leaving will end the group for everyone.")
            } else {
                Text("You will be removed from this group ride.")
            }
        }
        .alert("Set Rally Point", isPresented: $showRallyPointAlert) {
            TextField("Rally Point Name", text: $rallyPointName)
            Button("Create") {
                store.send(.addRallyPoint(
                    name: rallyPointName,
                    lat: pendingRallyLat,
                    lng: pendingRallyLng
                ))
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Long-press location will be visible to all group members.")
        }
    }
}

// MARK: - Group Info Bar

private struct GroupInfoBar: View {
    let store: StoreOf<GroupRideReducer>

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(store.session?.name ?? "Group")
                    .font(.headline)
                HStack(spacing: 4) {
                    Image(systemName: "person.3")
                        .font(.caption2)
                    Text("\(store.memberLocations.count) riders")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            // Invite code (tap to copy)
            if let code = store.session?.inviteCode {
                Button {
                    UIPasteboard.general.string = code
                } label: {
                    HStack(spacing: 4) {
                        Text(code)
                            .font(.system(.subheadline, design: .monospaced, weight: .bold))
                        Image(systemName: "doc.on.doc")
                            .font(.caption2)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.orange.opacity(0.15))
                    .foregroundStyle(.orange)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
}

// MARK: - Member List

private struct MemberListView: View {
    let members: [GroupRideReducer.State.MemberLocation]
    let myRiderId: UUID?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(sortedMembers, id: \.riderId) { member in
                    MemberPill(member: member, isMe: member.riderId == myRiderId)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
        }
    }

    private var sortedMembers: [GroupRideReducer.State.MemberLocation] {
        members.sorted { lhs, rhs in
            // Leader first, then sweep, then members
            let lOrder = roleOrder(lhs.role)
            let rOrder = roleOrder(rhs.role)
            return lOrder < rOrder
        }
    }

    private func roleOrder(_ role: GroupSession.GroupMember.Role) -> Int {
        switch role {
        case .leader: return 0
        case .sweep: return 1
        case .member: return 2
        }
    }
}

private struct MemberPill: View {
    let member: GroupRideReducer.State.MemberLocation
    let isMe: Bool

    var body: some View {
        VStack(spacing: 4) {
            // Role badge
            HStack(spacing: 4) {
                Circle()
                    .fill(roleColor)
                    .frame(width: 8, height: 8)
                Text(member.role.displayName)
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(roleColor)
            }

            // Name
            Text(displayName)
                .font(.caption)
                .lineLimit(1)

            // Last seen
            Text(lastSeenText)
                .font(.caption2)
                .foregroundStyle(.secondary)

            // Speed
            if let speed = member.speedMPH, speed > 1 {
                Text(String(format: "%.0f mph", speed))
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(.orange)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(isMe ? Color.orange.opacity(0.1) : Color(.tertiarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isMe ? Color.orange : Color.clear, lineWidth: 1.5)
        )
    }

    private var displayName: String {
        let name = member.displayName
        if let atIndex = name.firstIndex(of: "@") {
            return String(name[name.startIndex..<atIndex])
        }
        return name
    }

    private var roleColor: Color {
        switch member.role {
        case .leader: return .orange
        case .sweep: return .blue
        case .member: return .secondary
        }
    }

    private var lastSeenText: String {
        let elapsed = Date().timeIntervalSince(member.lastSeen)
        if elapsed < 10 { return "now" }
        if elapsed < 60 { return "\(Int(elapsed))s ago" }
        return "\(Int(elapsed / 60))m ago"
    }
}

// MARK: - Rally Point Bar

private struct RallyPointBar: View {
    let points: [GroupRideReducer.State.RallyPoint]
    let onRemove: (UUID) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(points) { point in
                    HStack(spacing: 4) {
                        Image(systemName: "flag.fill")
                            .font(.caption2)
                            .foregroundStyle(.green)
                        Text(point.name)
                            .font(.caption)
                            .lineLimit(1)
                        Button {
                            onRemove(point.id)
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.1))
                    .clipShape(Capsule())
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 4)
        }
    }
}

// MARK: - Action Bar

private struct GroupActionBar: View {
    let store: StoreOf<GroupRideReducer>
    @Binding var showMemberList: Bool

    var body: some View {
        HStack(spacing: 12) {
            // Toggle member list
            Button {
                withAnimation { showMemberList.toggle() }
            } label: {
                Image(systemName: showMemberList ? "chevron.down" : "chevron.up")
                    .font(.caption)
                    .frame(width: 36, height: 36)
                    .background(Color(.tertiarySystemBackground))
                    .clipShape(Circle())
            }

            Spacer()

            // SOS Broadcast
            Button {
                store.send(.sosBroadcastTapped)
            } label: {
                Label("SOS", systemImage: "sos.circle.fill")
                    .font(.subheadline.weight(.bold))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.red)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
            }

            // Leave
            Button {
                store.send(.leaveGroupTapped)
            } label: {
                Label("Leave", systemImage: "rectangle.portrait.and.arrow.right")
                    .font(.subheadline)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color(.secondarySystemBackground))
                    .foregroundStyle(.red)
                    .clipShape(Capsule())
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .padding(.bottom, 4)
    }
}

// MARK: - Ended View

private struct GroupEndedView: View {
    let store: StoreOf<GroupRideReducer>

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "flag.checkered")
                .font(.system(size: 64))
                .foregroundStyle(.secondary)

            Text("Group Ended")
                .font(.title2.bold())

            Text("The group ride has ended. Start or join a new one.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button {
                store.send(.resetToIdle)
            } label: {
                Text("Start New Group")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.orange)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .padding(.horizontal, 40)
        }
        .padding()
    }
}

// MARK: - Group Map (iOS 16 UIViewRepresentable)

private struct GroupMapView: UIViewRepresentable {
    let memberLocations: [GroupRideReducer.State.MemberLocation]
    let rallyPoints: [GroupRideReducer.State.RallyPoint]
    var onLongPress: ((Double, Double) -> Void)?

    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.showsUserLocation = false
        mapView.delegate = context.coordinator

        let longPress = UILongPressGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.handleLongPress(_:))
        )
        longPress.minimumPressDuration = 0.8
        mapView.addGestureRecognizer(longPress)

        return mapView
    }

    func updateUIView(_ mapView: MKMapView, context: Context) {
        // Remove old annotations
        mapView.removeAnnotations(mapView.annotations)

        // Add member pins
        for member in memberLocations {
            let annotation = MemberAnnotation(
                coordinate: CLLocationCoordinate2D(
                    latitude: member.latitude,
                    longitude: member.longitude
                ),
                title: member.displayName,
                role: member.role,
                riderId: member.riderId
            )
            mapView.addAnnotation(annotation)
        }

        // Add rally point pins
        for point in rallyPoints {
            let annotation = RallyPointAnnotation(
                coordinate: CLLocationCoordinate2D(
                    latitude: point.latitude,
                    longitude: point.longitude
                ),
                title: point.name
            )
            mapView.addAnnotation(annotation)
        }

        // Fit map to show all annotations
        if !mapView.annotations.isEmpty {
            let insets = UIEdgeInsets(top: 60, left: 40, bottom: 260, right: 40)
            mapView.showAnnotations(mapView.annotations, animated: true)
            mapView.setVisibleMapRect(
                mapView.visibleMapRect,
                edgePadding: insets,
                animated: true
            )
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    class Coordinator: NSObject, MKMapViewDelegate {
        let parent: GroupMapView

        init(parent: GroupMapView) {
            self.parent = parent
        }

        @objc func handleLongPress(_ gesture: UILongPressGestureRecognizer) {
            guard gesture.state == .began else { return }
            guard let mapView = gesture.view as? MKMapView else { return }
            let point = gesture.location(in: mapView)
            let coordinate = mapView.convert(point, toCoordinateFrom: mapView)
            parent.onLongPress?(coordinate.latitude, coordinate.longitude)
        }

        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            if let memberAnnotation = annotation as? MemberAnnotation {
                let view = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: "member")
                switch memberAnnotation.role {
                case .leader:
                    view.markerTintColor = .systemOrange
                    view.glyphImage = UIImage(systemName: "star.fill")
                case .sweep:
                    view.markerTintColor = .systemBlue
                    view.glyphImage = UIImage(systemName: "shield.fill")
                case .member:
                    view.markerTintColor = .white
                    view.glyphImage = UIImage(systemName: "figure.outdoor.cycle")
                }
                view.displayPriority = .required
                return view
            }

            if annotation is RallyPointAnnotation {
                let view = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: "rally")
                view.markerTintColor = .systemGreen
                view.glyphImage = UIImage(systemName: "flag.fill")
                view.displayPriority = .required
                return view
            }

            return nil
        }
    }
}

// MARK: - Custom Annotation Types

private class MemberAnnotation: NSObject, MKAnnotation {
    let coordinate: CLLocationCoordinate2D
    let title: String?
    let role: GroupSession.GroupMember.Role
    let riderId: UUID

    init(coordinate: CLLocationCoordinate2D, title: String?, role: GroupSession.GroupMember.Role, riderId: UUID) {
        self.coordinate = coordinate
        self.title = title
        self.role = role
        self.riderId = riderId
        super.init()
    }
}

private class RallyPointAnnotation: NSObject, MKAnnotation {
    let coordinate: CLLocationCoordinate2D
    let title: String?

    init(coordinate: CLLocationCoordinate2D, title: String?) {
        self.coordinate = coordinate
        self.title = title
        super.init()
    }
}

// MARK: - Preview

#Preview {
    GroupRideView(
        store: Store(initialState: GroupRideReducer.State()) {
            GroupRideReducer()
        }
    )
}
