// TrailConditionsView.swift
// TrailGuard — Features/TrailConditions

import SwiftUI
import ComposableArchitecture

struct TrailConditionsView: View {
    let store: StoreOf<TrailConditionsReducer>

    var body: some View {
        // TODO: Implement trail conditions UI
        // Layout:
        //   - Map mode: clustered condition pins, color-coded by ConditionType
        //   - List mode: sorted by proximity, filterable
        //   - Filter bar: condition chips, ride type, recency
        //   - Condition detail bottom sheet: reporter, notes, timestamp, upvote button
        //   - Report sheet: condition picker, notes field, coordinate picker
        Text("TrailConditionsView — TODO")
    }
}

#Preview {
    TrailConditionsView(
        store: Store(initialState: TrailConditionsReducer.State()) {
            TrailConditionsReducer()
        }
    )
}
