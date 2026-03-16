// EmergencyCardView.swift
// TrailGuard — Features/EmergencyCard
//
// Setup and edit UI for the emergency card.
// Required to complete before first ride.

import SwiftUI
import ComposableArchitecture

struct EmergencyCardView: View {
    let store: StoreOf<EmergencyCardReducer>

    var body: some View {
        // TODO: Implement emergency card form
        // Sections:
        //   1. Blood type picker (BloodType cases in a grid)
        //   2. Allergies (chip input: type + add, removable chips)
        //   3. Medical notes (TextEditor, 500 char limit)
        //   4. Emergency contacts (list, up to 3, add/remove)
        //   5. Save button (disabled until at least 1 contact added)
        //
        // Show "Blocking" badge on Pre-Ride checklist if incomplete
        Text("EmergencyCardView — TODO")
    }
}

#Preview {
    EmergencyCardView(
        store: Store(initialState: EmergencyCardReducer.State()) {
            EmergencyCardReducer()
        }
    )
}
