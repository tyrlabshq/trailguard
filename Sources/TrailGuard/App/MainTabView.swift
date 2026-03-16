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

            // MARK: Trails
            TrailConditionsView(
                store: store.scope(state: \.trailConditions, action: \.trailConditions)
            )
            .tabItem {
                Label("Trails", systemImage: "map")
            }

            // MARK: Profile
            ProfilePlaceholderView(store: store)
                .tabItem {
                    Label("Profile", systemImage: "person.circle")
                }
        }
        .tint(.orange)
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

// MARK: - Profile (with sign out)

private struct ProfilePlaceholderView: View {
    let store: StoreOf<AppReducer>

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Image(systemName: "person.circle")
                    .font(.system(size: 64))
                    .foregroundStyle(.orange)

                Text("Profile")
                    .font(.title.bold())

                Text("Coming Soon")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 6)
                    .background(Color.orange)
                    .clipShape(Capsule())

                Spacer().frame(height: 20)

                Button(role: .destructive) {
                    store.send(.signOutTapped)
                } label: {
                    Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .foregroundStyle(.red)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal, 40)
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
