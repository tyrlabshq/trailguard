// SOSView.swift
// TrailGuard — Features/SOS
//
// SOS button, confirmation overlay, hold-to-send UX, and active SOS screen.

import SwiftUI
import ComposableArchitecture

struct SOSButton: View {
    let store: StoreOf<SOSReducer>

    var body: some View {
        // TODO: Red circular FAB, always visible on map
        // - Tap → show SOSConfirmationOverlay
        // - Should float above all content
        Button("SOS") {
            store.send(.sosButtonTapped)
        }
        .font(.headline.bold())
        .foregroundColor(.white)
        .padding()
        .background(Color.red)
        .clipShape(Circle())
    }
}

struct SOSConfirmationOverlay: View {
    let store: StoreOf<SOSReducer>

    var body: some View {
        // TODO: Full-screen dim overlay with:
        //   - "SEND SOS" hold button (3s hold to confirm, progress ring)
        //   - "Cancel" button
        //   - Brief instructions
        Text("SOSConfirmationOverlay — TODO")
    }
}

struct SOSActiveView: View {
    let store: StoreOf<SOSReducer>

    var body: some View {
        // TODO: Active SOS screen:
        //   - Elapsed time since SOS sent
        //   - Last known GPS coordinates (copyable)
        //   - "Cancel SOS" button (2-step confirm)
        //   - Status: "Notifying emergency contacts..."
        Text("SOSActiveView — TODO")
    }
}

#Preview {
    SOSButton(
        store: Store(initialState: SOSReducer.State()) {
            SOSReducer()
        }
    )
}
