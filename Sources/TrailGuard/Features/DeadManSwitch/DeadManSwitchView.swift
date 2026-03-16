// DeadManSwitchView.swift
// TrailGuard — Features/DeadManSwitch
//
// Setup and active state UI for the Dead Man's Switch.

import SwiftUI
import ComposableArchitecture

struct DeadManSwitchView: View {
    let store: StoreOf<DeadManSwitchReducer>

    var body: some View {
        // TODO: Implement DMS UI
        // Sections:
        //   1. Enable toggle
        //   2. Interval picker (15 / 30 / 60 / 120 / Custom min)
        //   3. Active state: countdown ring, Check In button, Snooze button
        //   4. Snooze remaining indicator (3 - snoozeCount)
        Text("DeadManSwitchView — TODO")
    }
}

#Preview {
    DeadManSwitchView(
        store: Store(initialState: DeadManSwitchReducer.State()) {
            DeadManSwitchReducer()
        }
    )
}
