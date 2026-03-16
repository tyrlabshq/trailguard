// AuthView.swift
// TrailGuard — Features/Auth
//
// Sign-in and sign-up screens.

import SwiftUI
import ComposableArchitecture

struct AuthView: View {
    @Perception.Bindable var store: StoreOf<AuthReducer>

    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [Color(.systemBackground), Color.accentColor.opacity(0.08)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 32) {
                        // Logo / Branding
                        VStack(spacing: 8) {
                            Image(systemName: "mountain.2.fill")
                                .font(.system(size: 56))
                                .foregroundStyle(.orange)
                            Text("TrailGuard")
                                .font(.largeTitle.bold())
                            Text("Stay connected on every trail")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.top, 48)

                        // Mode Picker
                        Picker("", selection: $store.mode) {
                            Text("Sign In").tag(AuthReducer.State.Mode.signIn)
                            Text("Create Account").tag(AuthReducer.State.Mode.signUp)
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal)

                        // Form
                        VStack(spacing: 16) {
                            // Email
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Email")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                TextField("you@example.com", text: $store.email)
                                    .keyboardType(.emailAddress)
                                    .textContentType(.emailAddress)
                                    .autocapitalization(.none)
                                    .autocorrectionDisabled()
                                    .padding()
                                    .background(Color(.secondarySystemBackground))
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                            }

                            // Password
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Password")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                SecureField("6+ characters", text: $store.password)
                                    .textContentType(store.mode == .signIn ? .password : .newPassword)
                                    .padding()
                                    .background(Color(.secondarySystemBackground))
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                            }

                            // Confirm Password (sign-up only)
                            if store.mode == .signUp {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Confirm Password")
                                        .font(.footnote.weight(.semibold))
                                        .foregroundStyle(.secondary)
                                    SecureField("Must match password", text: $store.confirmPassword)
                                        .textContentType(.newPassword)
                                        .padding()
                                        .background(Color(.secondarySystemBackground))
                                        .clipShape(RoundedRectangle(cornerRadius: 12))
                                }
                                .transition(.move(edge: .bottom).combined(with: .opacity))
                            }

                            // Error
                            if let errorMessage = store.errorMessage {
                                HStack(spacing: 8) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .foregroundStyle(.red)
                                    Text(errorMessage)
                                        .font(.footnote)
                                        .foregroundStyle(.red)
                                }
                                .padding(.horizontal, 4)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                        .padding(.horizontal)
                        .animation(.easeInOut(duration: 0.25), value: store.mode)

                        // Submit Button
                        Button {
                            switch store.mode {
                            case .signIn:
                                store.send(.signInTapped)
                            case .signUp:
                                store.send(.signUpTapped)
                            }
                        } label: {
                            ZStack {
                                if store.isLoading {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Text(store.mode == .signIn ? "Sign In" : "Create Account")
                                        .font(.headline)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(store.canSubmit ? Color.orange : Color.gray.opacity(0.4))
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .disabled(!store.canSubmit)
                        .padding(.horizontal)
                        .animation(.easeInOut(duration: 0.15), value: store.canSubmit)

                        Spacer(minLength: 40)
                    }
                }
            }
            .navigationBarHidden(true)
        }
    }
}

#Preview {
    AuthView(
        store: Store(initialState: AuthReducer.State()) {
            AuthReducer()
        }
    )
}
