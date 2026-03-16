// CrashDetectionView.swift
// TrailGuard — Features/CrashDetection
//
// Full-screen overlay shown when crash is detected.
// Countdown ring with "I'm OK" dismiss button.
// Escalates to SOS if countdown reaches zero.

import SwiftUI
import ComposableArchitecture

struct CrashDetectionView: View {
    let store: StoreOf<CrashDetectionReducer>

    var body: some View {
        if store.isAlertVisible {
            ZStack {
                // Dim background
                Color.black.opacity(0.85)
                    .ignoresSafeArea()

                switch store.phase {
                case .impactDetected, .countingDown:
                    CountdownAlertView(store: store)

                case .sosFired:
                    SOSFiredView(store: store)

                default:
                    EmptyView()
                }
            }
            .transition(.opacity)
            .animation(.easeInOut(duration: 0.3), value: store.phase)
        }
    }
}

// MARK: - Countdown Alert

private struct CountdownAlertView: View {
    let store: StoreOf<CrashDetectionReducer>

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Warning icon
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.yellow)


            Text("Crash Detected")
                .font(.title.bold())
                .foregroundStyle(.white)

            Text("Are you OK?")
                .font(.title2)
                .foregroundStyle(.white.opacity(0.9))

            // Countdown ring
            ZStack {
                // Background ring
                Circle()
                    .stroke(Color.white.opacity(0.2), lineWidth: 8)
                    .frame(width: 180, height: 180)

                // Progress ring
                Circle()
                    .trim(from: 0, to: countdownProgress)
                    .stroke(
                        countdownColor,
                        style: StrokeStyle(lineWidth: 8, lineCap: .round)
                    )
                    .frame(width: 180, height: 180)
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 1), value: store.countdownRemaining)

                // Countdown number
                VStack(spacing: 4) {
                    Text("\(store.countdownRemaining)")
                        .font(.system(size: 64, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .contentTransition(.numericText())
                        .animation(.easeInOut(duration: 0.3), value: store.countdownRemaining)

                    Text("seconds")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.7))
                }
            }

            Text("SOS will be sent automatically\nif you don't respond")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)

            Spacer()

            // "I'm OK" button
            Button {
                store.send(.userConfirmedOK)
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "hand.thumbsup.fill")
                        .font(.title2)
                    Text("I'm OK")
                        .font(.title2.bold())
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
                .background(Color.green)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .shadow(color: .green.opacity(0.5), radius: 12, y: 4)
            }
            .padding(.horizontal, 24)

            // Cancel SOS link
            Button {
                store.send(.userCancelledSOS)
            } label: {
                Text("Cancel")
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.6))
                    .padding(.vertical, 8)
            }

            Spacer().frame(height: 20)
        }
    }

    private var countdownProgress: CGFloat {
        CGFloat(store.countdownRemaining) / 60.0
    }

    private var countdownColor: Color {
        if store.countdownRemaining <= 10 {
            return .red
        } else if store.countdownRemaining <= 30 {
            return .orange
        }
        return .yellow
    }
}

// MARK: - SOS Fired Confirmation

private struct SOSFiredView: View {
    let store: StoreOf<CrashDetectionReducer>

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "sos.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(.red)


            Text("SOS Sent")
                .font(.largeTitle.bold())
                .foregroundStyle(.white)

            Text("Emergency contacts have been notified\nwith your last known location.")
                .font(.body)
                .foregroundStyle(.white.opacity(0.8))
                .multilineTextAlignment(.center)

            VStack(spacing: 8) {
                Text("Impact: \(String(format: "%.1f", store.impactMagnitude))G")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.white.opacity(0.6))
            }
            .padding()
            .background(Color.white.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            Spacer()

            // False alarm button
            Button {
                store.send(.userCancelledSOS)
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "xmark.circle")
                    Text("False Alarm — I'm OK")
                }
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.white.opacity(0.15))
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .padding(.horizontal, 24)

            Spacer().frame(height: 40)
        }
    }
}

// MARK: - Preview

#Preview("Counting Down") {
    CrashDetectionView(
        store: Store(initialState: CrashDetectionReducer.State(
            isActive: true,
            phase: .countingDown,
            countdownRemaining: 45,
            impactMagnitude: 5.2
        )) {
            CrashDetectionReducer()
        }
    )
}

#Preview("SOS Fired") {
    CrashDetectionView(
        store: Store(initialState: CrashDetectionReducer.State(
            isActive: true,
            phase: .sosFired,
            impactMagnitude: 6.8
        )) {
            CrashDetectionReducer()
        }
    )
}
