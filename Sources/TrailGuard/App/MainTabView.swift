// MainTabView.swift
// TrailGuard
//
// Main tab bar shown after auth + onboarding are complete.
// 4 tabs: Ride, Group, Trails, Profile

import SwiftUI
import ComposableArchitecture

struct MainTabView: View {
    let store: StoreOf<AppReducer>

    var body: some View {
        TabView {
            // MARK: Ride (GPS recording + DMS status)
            RideRecordingView(
                rideStore: store.scope(state: \.rideRecording, action: \.rideRecording),
                dmsStore: store.scope(state: \.deadManSwitch, action: \.deadManSwitch)
            )
            .tabItem {
                Label("Ride", systemImage: "location.north.circle")
            }

            // MARK: Group
            GroupRideView(
                store: store.scope(state: \.groupRide, action: \.groupRide)
            )
            .tabItem {
                Label("Group", systemImage: "person.3")
            }

            // MARK: History
            RideHistoryView(
                store: store.scope(state: \.rideHistory, action: \.rideHistory)
            )
            .tabItem {
                Label("History", systemImage: "clock.arrow.circlepath")
            }

            // MARK: Trails
            TrailConditionsView(
                store: store.scope(state: \.trailConditions, action: \.trailConditions)
            )
            .tabItem {
                Label("Trails", systemImage: "map")
            }

            // MARK: Profile
            ProfileView(store: store)
                .tabItem {
                    Label("Profile", systemImage: "person.circle")
                }
        }
        .tint(.orange)
        .overlay(alignment: .bottomTrailing) {
            // Floating SOS button — visible when SOS is idle
            if !store.sos.isOverlayVisible {
                SOSButton(store: store.scope(state: \.sos, action: \.sos))
                    .padding(.trailing, 20)
                    .padding(.bottom, 100)
            }
        }
        .overlay {
            // SOS confirmation / active overlay
            SOSOverlayView(store: store.scope(state: \.sos, action: \.sos))
        }
        .overlay {
            CrashDetectionView(
                store: store.scope(state: \.crashDetection, action: \.crashDetection)
            )
        }
    }
}

// MARK: - Coming Soon Placeholder

struct ComingSoonView: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: icon)
                .font(.system(size: 64))
                .foregroundStyle(.orange)

            Text(title)
                .font(.title.bold())

            Text("Coming Soon")
                .font(.headline)
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
                .background(Color.orange)
                .clipShape(Capsule())

            Text(description)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
    }
}

// MARK: - Profile

private struct ProfileView: View {
    let store: StoreOf<AppReducer>

    var body: some View {
        NavigationStack {
            List {
                Section("Safety") {
                    NavigationLink {
                        EmergencyContactsView(
                            store: store.scope(
                                state: \.emergencyContacts,
                                action: \.emergencyContacts
                            )
                        )
                    } label: {
                        Label("Emergency Contacts", systemImage: "person.crop.circle.badge.exclamationmark")
                    }
                }

                Section {
                    Button(role: .destructive) {
                        store.send(.signOutTapped)
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Profile")
        }
    }
}

#Preview {
    MainTabView(
        store: Store(initialState: AppReducer.State()) {
            AppReducer()
        }
    )
}
