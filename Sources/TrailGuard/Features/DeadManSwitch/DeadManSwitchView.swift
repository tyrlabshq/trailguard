// DeadManSwitchView.swift
// TrailGuard — Features/DeadManSwitch
//
// Dead Man's Switch UI.
// Active state: countdown ring, Check In (green), Snooze (orange).
// Inactive state: enable toggle + interval picker.

import SwiftUI
import ComposableArchitecture

// MARK: - Main View

struct DeadManSwitchView: View {
    @Bindable var store: StoreOf<DeadManSwitchReducer>

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {

                    // Warning banner (last snooze threshold)
                    if store.showLastSnoozeWarning {
                        LastSnoozeWarningBanner()
                    }

                    if store.isActive {
                        // MARK: Active State
                        CountdownSection(store: store)
                        ActionButtonsSection(store: store)
                        CheckInHistorySection(store: store)
                    } else {
                        // MARK: Inactive State
                        InactiveHeroSection()
                        ConfigSection(store: store)
                        ActivateSection(store: store)
                    }
                }
                .padding()
            }
            .navigationTitle("Dead Man's Switch")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onAppear {
            store.send(.loadFromDefaults)
        }
    }
}

// MARK: - Warning Banner

private struct LastSnoozeWarningBanner: View {
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.white)
                .font(.title3)

            Text("Last snooze — SOS will trigger if not checked in")
                .foregroundStyle(.white)
                .font(.subheadline.weight(.semibold))

            Spacer()
        }
        .padding()
        .background(Color.red)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Countdown Section

private struct CountdownSection: View {
    let store: StoreOf<DeadManSwitchReducer>

    var body: some View {
        VStack(spacing: 16) {
            ZStack {
                // Background ring
                Circle()
                    .stroke(Color(.systemFill), lineWidth: 14)
                    .frame(width: 220, height: 220)

                // Progress ring
                Circle()
                    .trim(from: 0, to: progressFraction)
                    .stroke(
                        ringColor,
                        style: StrokeStyle(lineWidth: 14, lineCap: .round)
                    )
                    .frame(width: 220, height: 220)
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 1), value: progressFraction)

                // Countdown text
                VStack(spacing: 4) {
                    Text(formattedTime)
                        .font(.system(size: 52, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(ringColor)

                    Text("until SOS")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Snooze count indicator
            HStack(spacing: 8) {
                ForEach(0..<3, id: \.self) { index in
                    Circle()
                        .fill(index < store.snoozeCount ? Color.orange : Color(.systemFill))
                        .frame(width: 10, height: 10)
                }
                Text("\(3 - store.snoozeCount) snooze\(3 - store.snoozeCount == 1 ? "" : "s") remaining")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 8)
    }

    private var progressFraction: CGFloat {
        let totalSeconds = CGFloat(store.effectiveMinutes * 60)
        guard totalSeconds > 0 else { return 0 }
        return CGFloat(store.secondsRemaining) / totalSeconds
    }

    private var ringColor: Color {
        if store.showLastSnoozeWarning { return .red }
        if progressFraction < 0.25 { return .orange }
        return .green
    }

    private var formattedTime: String {
        let seconds = store.secondsRemaining
        let h = seconds / 3600
        let m = (seconds % 3600) / 60
        let s = seconds % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%d:%02d", m, s)
    }
}

// MARK: - Action Buttons Section

private struct ActionButtonsSection: View {
    let store: StoreOf<DeadManSwitchReducer>

    var body: some View {
        VStack(spacing: 16) {
            // Check In — primary action
            Button {
                store.send(.checkIn)
            } label: {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title3)
                    Text("Check In")
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(Color.green)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: .green.opacity(0.4), radius: 8, y: 4)
            }

            // Snooze — secondary action
            Button {
                store.send(.snooze)
            } label: {
                HStack {
                    Image(systemName: "clock.badge.plus")
                        .font(.title3)
                    Text("Snooze (+\(store.effectiveMinutes) min)")
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(store.canSnooze ? Color.orange : Color(.systemFill))
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .disabled(!store.canSnooze)

            // Deactivate
            Button(role: .destructive) {
                store.send(.deactivate)
            } label: {
                Text("Deactivate")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Check-In History

private struct CheckInHistorySection: View {
    let store: StoreOf<DeadManSwitchReducer>

    var body: some View {
        if let lastCheckIn = store.lastCheckIn {
            HStack {
                Image(systemName: "clock.arrow.circlepath")
                    .foregroundStyle(.secondary)
                Text("Last check-in: \(lastCheckIn, style: .relative) ago")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
            }
            .padding(.horizontal, 4)
        }
    }
}

// MARK: - Inactive Hero

private struct InactiveHeroSection: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "timer.circle")
                .font(.system(size: 72))
                .foregroundStyle(.orange)
                .symbolEffect(.pulse)

            Text("Dead Man's Switch")
                .font(.title2.bold())

            Text("If you don't check in before the timer expires, your emergency contacts are notified. You have 3 snoozes before SOS is automatically dispatched.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 12)
    }
}

// MARK: - Config Section (interval picker)

private struct ConfigSection: View {
    @Bindable var store: StoreOf<DeadManSwitchReducer>

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Check-In Interval")
                .font(.headline)

            // Interval pills
            LazyVGrid(
                columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ],
                spacing: 10
            ) {
                ForEach(DMSInterval.allCases.filter { $0 != .custom }, id: \.self) { interval in
                    IntervalPill(
                        label: interval.label,
                        isSelected: store.interval == interval
                    ) {
                        store.send(.intervalChanged(interval))
                    }
                }

                IntervalPill(
                    label: "Custom",
                    isSelected: store.interval == .custom
                ) {
                    store.send(.intervalChanged(.custom))
                }
            }

            // Custom minutes stepper
            if store.interval == .custom {
                HStack {
                    Text("Custom duration")
                        .font(.subheadline)
                    Spacer()
                    Stepper(
                        "\(store.customMinutes) min",
                        onIncrement: { store.send(.customMinutesChanged(store.customMinutes + 5)) },
                        onDecrement: { store.send(.customMinutesChanged(store.customMinutes - 5)) }
                    )
                    .fixedSize()
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

private struct IntervalPill: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.caption.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(isSelected ? Color.orange : Color(.tertiarySystemBackground))
                .foregroundStyle(isSelected ? .white : .primary)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(isSelected ? Color.orange : Color(.separator), lineWidth: 1)
                )
        }
    }
}

// MARK: - Activate Section

private struct ActivateSection: View {
    let store: StoreOf<DeadManSwitchReducer>

    var body: some View {
        VStack(spacing: 8) {
            Button {
                store.send(.activate)
            } label: {
                HStack {
                    Image(systemName: "timer")
                        .font(.title3)
                    Text("Activate Dead Man's Switch")
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(Color.orange)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: .orange.opacity(0.4), radius: 8, y: 4)
            }

            Text("Timer starts immediately. Check in every \(store.effectiveMinutes) min.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - Preview

#Preview {
    DeadManSwitchView(
        store: Store(initialState: DeadManSwitchReducer.State()) {
            DeadManSwitchReducer()
        }
    )
}

#Preview("Active State") {
    let state = DeadManSwitchReducer.State(
        isActive: true,
        interval: .thirtyMinutes,
        lastCheckIn: Date().addingTimeInterval(-300),
        nextDeadline: Date().addingTimeInterval(1500),
        snoozeCount: 2,
        secondsRemaining: 1500
    )
    DeadManSwitchView(
        store: Store(initialState: state) {
            DeadManSwitchReducer()
        }
    )
}
