// AppEntry.swift
// TrailGuard
//
// App entry point. Sets up TCA store and drives root navigation
// based on AppReducer.State.route:
//   .loading          → splash / spinner
//   .unauthenticated  → AuthView
//   .onboarding       → EmergencyCardView
//   .main             → MainTabView

import SwiftUI
import ComposableArchitecture

@main
struct TrailGuardApp: App {

    let store: StoreOf<AppReducer> = Store(initialState: AppReducer.State()) {
        AppReducer()
    }

    init() {
        // Register BGTask identifier before the app finishes launching.
        // Must match Info.plist BGTaskSchedulerPermittedIdentifiers entry.
        registerDMSBackgroundTask()
    }

    var body: some Scene {
        WindowGroup {
            AppRootView(store: store)
        }
    }
}

// MARK: - Root View

struct AppRootView: View {
    @Bindable var store: StoreOf<AppReducer>

    var body: some View {
        switch store.route {
        case .loading:
            LoadingView()

        case .unauthenticated:
            AuthView(store: store.scope(state: \.auth, action: \.auth))

        case .onboarding:
            NavigationStack {
                EmergencyCardView(
                    store: store.scope(state: \.emergencyCard, action: \.emergencyCard)
                )
                .navigationBarBackButtonHidden(true)
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Text("Setup")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

        case .main:
            MainTabView(store: store)
        }
    }
}

// MARK: - Loading View

private struct LoadingView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "mountain.2.fill")
                .font(.system(size: 64))
                .foregroundStyle(.orange)
            Text("TrailGuard")
                .font(.largeTitle.bold())
            ProgressView()
                .tint(.orange)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}
