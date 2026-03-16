// AppReducer.swift
// TrailGuard
//
// Root TCA reducer. Composes all feature reducers and owns top-level navigation state.

import ComposableArchitecture

@Reducer
struct AppReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        // TODO: Add auth state (authenticated / unauthenticated / loading)
        var isAuthenticated: Bool = false

        // TODO: Add onboarding completion flag
        var hasCompletedOnboarding: Bool = false

        // TODO: Embed feature states
        // var crashDetection: CrashDetectionReducer.State = .init()
        // var deadManSwitch: DeadManSwitchReducer.State = .init()
        // var groupRide: GroupRideReducer.State = .init()
        // var trailConditions: TrailConditionsReducer.State = .init()
        // var sos: SOSReducer.State = .init()
        // var emergencyCard: EmergencyCardReducer.State = .init()
    }

    // MARK: - Action

    enum Action {
        // TODO: Add auth actions
        case appLaunched
        case authStateChanged(isAuthenticated: Bool)

        // TODO: Embed feature actions
        // case crashDetection(CrashDetectionReducer.Action)
        // case deadManSwitch(DeadManSwitchReducer.Action)
        // case groupRide(GroupRideReducer.Action)
        // case trailConditions(TrailConditionsReducer.Action)
        // case sos(SOSReducer.Action)
        // case emergencyCard(EmergencyCardReducer.Action)
    }

    // MARK: - Dependencies
    // TODO: @Dependency(\.supabaseClient) var supabaseClient
    // TODO: @Dependency(\.locationService) var locationService
    // TODO: @Dependency(\.motionService) var motionService
    // TODO: @Dependency(\.notificationService) var notificationService

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case .appLaunched:
                // TODO: Check auth state, load user, configure services
                return .none

            case let .authStateChanged(isAuthenticated):
                state.isAuthenticated = isAuthenticated
                return .none
            }
        }
        // TODO: Compose feature reducers
        // Scope(state: \.crashDetection, action: \.crashDetection) { CrashDetectionReducer() }
        // Scope(state: \.deadManSwitch, action: \.deadManSwitch) { DeadManSwitchReducer() }
    }
}
