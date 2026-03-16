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

        // Child actions
        case auth(AuthReducer.Action)
        case emergencyCard(EmergencyCardReducer.Action)
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
                return .none

            // MARK: Passthrough child actions
            case .auth, .emergencyCard:
                return .none
            }
        }
    }
}
