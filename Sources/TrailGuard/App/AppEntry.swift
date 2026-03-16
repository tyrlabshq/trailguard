// AppEntry.swift
// TrailGuard
//
// App entry point. Sets up TCA store and root navigation.

import SwiftUI
import ComposableArchitecture

@main
struct TrailGuardApp: App {

    // MARK: - Store
    // TODO: Configure store with AppReducer
    let store: StoreOf<AppReducer> = Store(initialState: AppReducer.State()) {
        AppReducer()
    }

    var body: some Scene {
        WindowGroup {
            // TODO: Replace with AppView(store: store)
            ContentView(store: store)
        }
    }
}

// MARK: - Temporary root view
// TODO: Remove once AppView is built
struct ContentView: View {
    let store: StoreOf<AppReducer>

    var body: some View {
        Text("TrailGuard")
            .font(.largeTitle)
            .foregroundColor(.primary)
    }
}
