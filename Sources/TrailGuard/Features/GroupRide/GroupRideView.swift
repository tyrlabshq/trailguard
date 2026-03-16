// GroupRideView.swift
// TrailGuard — Features/GroupRide
//
// Group ride creation, join, and dashboard UI.

import SwiftUI
import ComposableArchitecture

struct GroupRideView: View {
    let store: StoreOf<GroupRideReducer>

    var body: some View {
        // TODO: Implement group ride UI
        // Tabs / Sheets:
        //   - CreateGroupSheet: name input, ride type, share invite code / QR
        //   - JoinGroupSheet: 6-char code entry or QR scanner
        //   - GroupDashboardView: live map pins, member list sidebar,
        //                         sweep gap indicator, rally point button
        //   - MemberRowView: avatar, name, role badge, last GPS ping, battery %
        Text("GroupRideView — TODO")
    }
}

#Preview {
    GroupRideView(
        store: Store(initialState: GroupRideReducer.State()) {
            GroupRideReducer()
        }
    )
}
