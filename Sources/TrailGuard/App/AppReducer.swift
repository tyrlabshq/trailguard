// AppReducer.swift
// TrailGuard
//
// Root TCA reducer. Owns top-level navigation state:
//   .unauthenticated → Auth screens
//   .onboarding      → Emergency card setup
//   .main            → Main tab bar

import ComposableArchitecture
import Foundation
import Supabase

@Reducer
struct AppReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var route: Route = .loading

        var auth: AuthReducer.State = .init()
        var emergencyCard: EmergencyCardReducer.State = .init()
        var deadManSwitch: DeadManSwitchReducer.State = .init()
        var rideRecording: RideRecordingReducer.State = .init()
        var crashDetection: CrashDetectionReducer.State = .init()
        var groupRide: GroupRideReducer.State = .init()
        var trailConditions: TrailConditionsReducer.State = .init()

        enum Route: Equatable {
            case loading
            case unauthenticated
            case onboarding
            case main
        }
    }

    // MARK: - Action

    enum Action {
        case appLaunched
        case sessionChecked(hasSession: Bool, hasCard: Bool)

        // Auth completed — check if card exists
        case authCompleted

        // Card saved — move to main
        case emergencyCardCompleted

        // Sign out
        case signOutTapped
        case signedOut

        // DMS auto-SOS escalation
        case deadManSwitchSOSTriggered

        // Crash detection SOS escalation
        case crashDetectionSOSTriggered

        // Child actions
        case auth(AuthReducer.Action)
        case emergencyCard(EmergencyCardReducer.Action)
        case deadManSwitch(DeadManSwitchReducer.Action)
        case rideRecording(RideRecordingReducer.Action)
        case crashDetection(CrashDetectionReducer.Action)
        case groupRide(GroupRideReducer.Action)
        case trailConditions(TrailConditionsReducer.Action)
    }

    // MARK: - Dependencies

    @Dependency(\.supabase) var supabase

    // MARK: - Body

    var body: some ReducerOf<Self> {
        // Scope child reducers
        Scope(state: \.auth, action: \.auth) {
            AuthReducer()
        }
        Scope(state: \.emergencyCard, action: \.emergencyCard) {
            EmergencyCardReducer()
        }
        Scope(state: \.deadManSwitch, action: \.deadManSwitch) {
            DeadManSwitchReducer()
        }
        Scope(state: \.rideRecording, action: \.rideRecording) {
            RideRecordingReducer()
        }
        Scope(state: \.crashDetection, action: \.crashDetection) {
            CrashDetectionReducer()
        }
        Scope(state: \.groupRide, action: \.groupRide) {
            GroupRideReducer()
        }
        Scope(state: \.trailConditions, action: \.trailConditions) {
            TrailConditionsReducer()
        }

        Reduce { state, action in
            switch action {

            // MARK: App Launch
            case .appLaunched:
                state.route = .loading
                return .run { send in
                    do {
                        // Check for existing session
                        let session = try? await supabase.auth.session
                        guard session != nil else {
                            await send(.sessionChecked(hasSession: false, hasCard: false))
                            return
                        }

                        // Check for emergency card
                        let userId = session!.user.id
                        let count: Int = try await supabase
                            .from("emergency_cards")
                            .select("id", head: true, count: .exact)
                            .eq("rider_id", value: userId.uuidString)
                            .execute()
                            .count ?? 0

                        await send(.sessionChecked(hasSession: true, hasCard: count > 0))
                    } catch {
                        await send(.sessionChecked(hasSession: false, hasCard: false))
                    }
                }

            case let .sessionChecked(hasSession, hasCard):
                if !hasSession {
                    state.route = .unauthenticated
                } else if !hasCard {
                    state.route = .onboarding
                } else {
                    state.route = .main
                }
                return .none

            // MARK: Auth → onboarding or main
            case .auth(.authSucceeded):
                // After sign-in/sign-up, check if card exists
                return .run { send in
                    await send(.authCompleted)
                }

            case .authCompleted:
                return .run { send in
                    do {
                        let session = try await supabase.auth.session
                        let userId = session.user.id
                        let count: Int = try await supabase
                            .from("emergency_cards")
                            .select("id", head: true, count: .exact)
                            .eq("rider_id", value: userId.uuidString)
                            .execute()
                            .count ?? 0
                        await send(.sessionChecked(hasSession: true, hasCard: count > 0))
                    } catch {
                        await send(.sessionChecked(hasSession: true, hasCard: false))
                    }
                }

            // MARK: Emergency Card Saved
            case .emergencyCard(.cardSaved):
                state.route = .main
                return .none

            case .emergencyCardCompleted:
                state.route = .main
                return .none

            // MARK: Sign Out
            case .signOutTapped:
                return .run { send in
                    try? await supabase.auth.signOut()
                    await send(.signedOut)
                }

            case .signedOut:
                state.route = .unauthenticated
                state.auth = .init()
                state.emergencyCard = .init()
                state.deadManSwitch = .init()
                state.rideRecording = .init()
                state.crashDetection = .init()
                state.groupRide = .init()
                state.trailConditions = .init()
                return .send(.crashDetection(.deactivate))

            // MARK: DMS SOS escalation
            case .deadManSwitch(.dispatchSOS):
                // DMS escalated to SOS — bubble up so the Ride tab can route to SOS screen
                return .send(.deadManSwitchSOSTriggered)

            case .deadManSwitchSOSTriggered:
                // TODO: When SOSReducer is integrated into AppReducer, trigger it here
                return .none

            // MARK: Crash Detection → Ride Recording wiring
            case .rideRecording(.countdownFinished):
                // Ride started recording → activate crash detection
                return .send(.crashDetection(.activate))

            case .rideRecording(.confirmStop):
                // Ride stopped → deactivate crash detection
                return .send(.crashDetection(.deactivate))

            case .rideRecording(.pauseRideTapped):
                // Ride paused → deactivate crash detection (save battery)
                return .send(.crashDetection(.deactivate))

            case .rideRecording(.resumeRideTapped):
                // Ride resumed → reactivate crash detection
                return .send(.crashDetection(.activate))

            // Forward speed updates to crash detection for velocity-drop check
            case let .rideRecording(.locationUpdated(point)):
                return .send(.crashDetection(.speedUpdated(metersPerSecond: point.speed)))

            // MARK: Crash Detection SOS escalation
            case .crashDetection(.dispatchSOS):
                return .send(.crashDetectionSOSTriggered)

            case .crashDetectionSOSTriggered:
                // TODO: When SOSReducer is integrated, trigger SOS with crash context
                return .none

            // MARK: Group Ride SOS broadcast
            case .groupRide(.sosBroadcastTapped):
                // TODO: When SOSReducer is integrated, trigger group SOS broadcast
                return .none

            // MARK: Passthrough child actions
            case .auth, .emergencyCard, .deadManSwitch, .rideRecording, .crashDetection, .groupRide, .trailConditions:
                return .none
            }
        }
    }
}
