// CrashDetectionView.swift
// TrailGuard — Features/CrashDetection
//
// UI overlay shown when crash is detected.
// "Are you OK?" modal → countdown overlay → SOS fired screen.

import SwiftUI
import ComposableArchitecture

struct CrashDetectionView: View {
    let store: StoreOf<CrashDetectionReducer>

    var body: some View {
        // TODO: Implement crash detection UI
        // Switch over store.phase:
        //   .impactDetected → "Are you OK?" modal with Yes / (no response) paths
        //   .countdown(n)   → Full-screen countdown with prominent Cancel button
        //   .sosFired       → "SOS Sent" confirmation with coords + cancel option
        //   .monitoring     → EmptyView (not shown)
        Text("CrashDetectionView — TODO")
    }
}

#Preview {
    CrashDetectionView(
        store: Store(initialState: CrashDetectionReducer.State()) {
            CrashDetectionReducer()
        }
    )
}
