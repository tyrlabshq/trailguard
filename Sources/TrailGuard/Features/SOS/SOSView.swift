// SOSView.swift
// TrailGuard — Features/SOS
//
// SOS button, confirmation overlay, hold-to-send UX, and active SOS screen.

import SwiftUI
import ComposableArchitecture

// MARK: - Floating SOS Button (FAB)

struct SOSButton: View {
    let store: StoreOf<SOSReducer>

    var body: some View {
        Button {
            store.send(.sosButtonTapped)
        } label: {
            Text("SOS")
                .font(.system(size: 18, weight: .black))
                .foregroundColor(.white)
                .frame(width: 64, height: 64)
                .background(Color.red)
                .clipShape(Circle())
                .shadow(color: .red.opacity(0.4), radius: 8, y: 4)
        }
        .accessibilityLabel("Emergency SOS")
        .accessibilityHint("Hold for 3 seconds to activate emergency SOS")
    }
}

// MARK: - SOS Overlay (routes between confirmation and active)

struct SOSOverlayView: View {
    let store: StoreOf<SOSReducer>

    var body: some View {
        if store.isOverlayVisible {
            ZStack {
                switch store.phase {
                case .confirmationVisible, .holding:
                    SOSConfirmationOverlay(store: store)
                case .sosSent:
                    SOSActiveView(store: store)
                default:
                    EmptyView()
                }
            }
            .transition(.opacity.animation(.easeInOut(duration: 0.25)))
        }
    }
}

// MARK: - Confirmation Overlay (hold-to-send)

struct SOSConfirmationOverlay: View {
    let store: StoreOf<SOSReducer>

    @GestureState private var isHolding = false

    var body: some View {
        ZStack {
            // Dim background
            Color.black.opacity(0.85)
                .ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                // Instructions
                VStack(spacing: 12) {
                    Image(systemName: "sos")
                        .font(.system(size: 40))
                        .foregroundStyle(.red)

                    Text("Emergency SOS")
                        .font(.title.bold())
                        .foregroundStyle(.white)

                    Text("Hold the button below for 3 seconds\nto send an emergency alert")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                }

                // Hold Button with Progress Ring
                ZStack {
                    // Background ring
                    Circle()
                        .stroke(Color.white.opacity(0.2), lineWidth: 6)
                        .frame(width: 140, height: 140)

                    // Progress ring
                    Circle()
                        .trim(from: 0, to: store.holdProgress)
                        .stroke(Color.red, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                        .frame(width: 140, height: 140)
                        .rotationEffect(.degrees(-90))
                        .animation(.linear(duration: 0.033), value: store.holdProgress)

                    // Inner button
                    Circle()
                        .fill(isHolding ? Color.red.opacity(0.8) : Color.red)
                        .frame(width: 120, height: 120)
                        .scaleEffect(isHolding ? 0.92 : 1.0)
                        .animation(.easeInOut(duration: 0.15), value: isHolding)

                    VStack(spacing: 4) {
                        Text("SEND")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white.opacity(0.8))
                        Text("SOS")
                            .font(.system(size: 28, weight: .black))
                            .foregroundStyle(.white)
                    }
                }
                .gesture(
                    LongPressGesture(minimumDuration: 3.0)
                        .updating($isHolding) { value, gestureState, _ in
                            if !gestureState {
                                gestureState = true
                            }
                        }
                        .onEnded { _ in
                            // 3s completed via gesture
                        }
                )
                .simultaneousGesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { _ in
                            if store.phase == .confirmationVisible {
                                store.send(.holdBegan)
                            }
                        }
                        .onEnded { _ in
                            if store.phase == .holding && store.holdProgress < 1.0 {
                                store.send(.holdCancelled)
                            }
                        }
                )

                Text(store.phase == .holding ? "Keep holding..." : "Hold 3 seconds to activate")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.5))

                Spacer()

                // Cancel
                Button {
                    store.send(.cancelButtonTapped)
                } label: {
                    Text("Cancel")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.white.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 40)
            }
        }
    }
}

// MARK: - Active SOS Screen

struct SOSActiveView: View {
    let store: StoreOf<SOSReducer>

    var body: some View {
        ZStack {
            // Pulsing red background
            Color.red
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Spacer()

                // SOS Active indicator
                VStack(spacing: 16) {
                    Image(systemName: "sos")
                        .font(.system(size: 48))
                        .foregroundStyle(.white)

                    Text("SOS ACTIVE")
                        .font(.system(size: 32, weight: .black))
                        .foregroundStyle(.white)

                    // Elapsed time
                    Text(store.elapsedFormatted)
                        .font(.system(size: 48, weight: .bold, design: .monospaced))
                        .foregroundStyle(.white.opacity(0.9))
                }

                // Location
                if let coords = store.coordinateString {
                    VStack(spacing: 8) {
                        Label("Your Location", systemImage: "location.fill")
                            .font(.caption.bold())
                            .foregroundStyle(.white.opacity(0.7))

                        Button {
                            UIPasteboard.general.string = coords
                        } label: {
                            HStack(spacing: 8) {
                                Text(coords)
                                    .font(.system(.body, design: .monospaced))
                                Image(systemName: "doc.on.doc")
                                    .font(.caption)
                            }
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(Color.white.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }

                // Notification status
                HStack(spacing: 8) {
                    if store.contactsNotified {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.white)
                        Text("Emergency contacts notified")
                            .foregroundStyle(.white)
                    } else {
                        ProgressView()
                            .tint(.white)
                        Text("Notifying emergency contacts...")
                            .foregroundStyle(.white.opacity(0.8))
                    }
                }
                .font(.subheadline)

                if let error = store.dispatchError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.yellow)
                        .padding(.horizontal, 20)
                }

                Spacer()

                // 2-step Cancel
                Button {
                    store.send(.cancelSOSStep1Tapped)
                } label: {
                    Text("Cancel SOS")
                        .font(.headline.bold())
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 40)
                .alert("Cancel SOS?", isPresented: Binding(
                    get: { store.showCancelConfirm },
                    set: { _ in }
                )) {
                    Button("Keep SOS Active", role: .cancel) {
                        store.send(.cancelSOSAborted)
                    }
                    Button("Yes, Cancel SOS", role: .destructive) {
                        store.send(.cancelSOSConfirmed)
                    }
                } message: {
                    Text("Your emergency contacts will be notified that the SOS has been cancelled.")
                }
            }
        }
    }
}

// MARK: - Preview

#Preview("SOS Button") {
    SOSButton(
        store: Store(initialState: SOSReducer.State()) {
            SOSReducer()
        }
    )
}

#Preview("SOS Active") {
    SOSActiveView(
        store: Store(initialState: SOSReducer.State(
            phase: .sosSent,
            elapsedSecondsSinceSOSSent: 47,
            lastKnownLat: 44.2312,
            lastKnownLng: -71.6841,
            startedAt: Date()
        )) {
            SOSReducer()
        }
    )
}
