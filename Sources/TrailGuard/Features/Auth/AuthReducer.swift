// AuthReducer.swift
// TrailGuard — Features/Auth
//
// TCA reducer handling sign-in, sign-up, and session persistence.

import ComposableArchitecture
import Foundation
import Supabase

@Reducer
struct AuthReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var mode: Mode = .signIn
        var email: String = ""
        var password: String = ""
        var confirmPassword: String = ""
        var isLoading: Bool = false
        var errorMessage: String?

        enum Mode: Equatable {
            case signIn
            case signUp
        }

        var canSubmit: Bool {
            let emailValid = email.contains("@") && email.contains(".")
            switch mode {
            case .signIn:
                return emailValid && !password.isEmpty && !isLoading
            case .signUp:
                return emailValid && password.count >= 6 && password == confirmPassword && !isLoading
            }
        }
    }

    // MARK: - Action

    enum Action: BindableAction {
        case binding(BindingAction<State>)
        case signInTapped
        case signUpTapped
        case switchToSignUp
        case switchToSignIn
        case authSucceeded
        case authFailed(String)
    }

    // MARK: - Dependencies

    @Dependency(\.supabase) var supabase

    // MARK: - Body

    var body: some ReducerOf<Self> {
        BindingReducer()
        Reduce { state, action in
            switch action {

            case .binding:
                state.errorMessage = nil
                return .none

            case .switchToSignUp:
                state.mode = .signUp
                state.errorMessage = nil
                state.password = ""
                state.confirmPassword = ""
                return .none

            case .switchToSignIn:
                state.mode = .signIn
                state.errorMessage = nil
                state.password = ""
                state.confirmPassword = ""
                return .none

            case .signInTapped:
                guard state.canSubmit else { return .none }
                state.isLoading = true
                state.errorMessage = nil
                let email = state.email
                let password = state.password
                return .run { send in
                    do {
                        try await supabase.auth.signIn(email: email, password: password)
                        await send(.authSucceeded)
                    } catch {
                        await send(.authFailed(error.localizedDescription))
                    }
                }

            case .signUpTapped:
                guard state.canSubmit else { return .none }
                state.isLoading = true
                state.errorMessage = nil
                let email = state.email
                let password = state.password
                return .run { send in
                    do {
                        try await supabase.auth.signUp(email: email, password: password)
                        await send(.authSucceeded)
                    } catch {
                        await send(.authFailed(error.localizedDescription))
                    }
                }

            case .authSucceeded:
                state.isLoading = false
                return .none

            case let .authFailed(message):
                state.isLoading = false
                state.errorMessage = message
                return .none
            }
        }
    }
}
