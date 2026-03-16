// EmergencyContactsView.swift
// TrailGuard — Features/EmergencyContacts
//
// Manage SOS notification contacts: add, edit, delete.
// Accessible from the Profile tab.

import SwiftUI
import ComposableArchitecture

struct EmergencyContactsView: View {
    let store: StoreOf<EmergencyContactsReducer>

    var body: some View {
        Group {
            if store.isLoading && store.contacts.isEmpty {
                ProgressView("Loading contacts…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if store.contacts.isEmpty {
                emptyState
            } else {
                contactsList
            }
        }
        .navigationTitle("Emergency Contacts")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    store.send(.showAdd)
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .alert("Error", isPresented: .init(
            get: { store.error != nil },
            set: { if !$0 { /* error dismissed */ } }
        )) {
            Button("OK") { }
        } message: {
            if let error = store.error {
                Text(error)
            }
        }
        .alert("Delete Contact?", isPresented: .init(
            get: { store.deleteConfirm != nil },
            set: { if !$0 { store.send(.cancelDelete) } }
        )) {
            Button("Delete", role: .destructive) {
                store.send(.confirmDelete)
            }
            Button("Cancel", role: .cancel) {
                store.send(.cancelDelete)
            }
        } message: {
            if let contact = store.deleteConfirm {
                Text("Remove \(contact.name) from your emergency contacts?")
            }
        }
        .sheet(isPresented: .init(
            get: { store.isSheetVisible },
            set: { if !$0 { store.send(.dismissSheet) } }
        )) {
            AddEditContactSheet(store: store)
        }
        .onAppear {
            store.send(.loadContacts)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.crop.circle.badge.plus")
                .font(.system(size: 56))
                .foregroundStyle(.orange)

            Text("No emergency contacts yet")
                .font(.title3.weight(.semibold))

            Text("Add someone who should be notified if you need help.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button {
                store.send(.showAdd)
            } label: {
                Label("Add Contact", systemImage: "plus.circle.fill")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.orange)
                    .clipShape(Capsule())
            }
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Contacts List

    private var contactsList: some View {
        List {
            ForEach(store.contacts) { contact in
                Button {
                    store.send(.editContact(contact))
                } label: {
                    contactRow(contact)
                }
                .foregroundStyle(.primary)
                .swipeActions(edge: .trailing) {
                    Button(role: .destructive) {
                        store.send(.deleteContact(contact))
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
            }
        }
    }

    // MARK: - Contact Row

    private func contactRow(_ contact: SOSContact) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(contact.name)
                .font(.body.weight(.medium))

            if let phone = contact.phone, !phone.isEmpty {
                Text(phone)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            if let email = contact.email, !email.isEmpty {
                Text(email)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            // Notification method badges
            HStack(spacing: 6) {
                ForEach(contact.notifyVia) { method in
                    Label(method.label, systemImage: method.icon)
                        .font(.caption2.weight(.medium))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.orange.opacity(0.15))
                        .clipShape(Capsule())
                }
            }
            .padding(.top, 2)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Add/Edit Sheet

private struct AddEditContactSheet: View {
    let store: StoreOf<EmergencyContactsReducer>

    var body: some View {
        NavigationStack {
            Form {
                Section("Contact Info") {
                    TextField("Full Name *", text: .init(
                        get: { store.form.name },
                        set: { store.send(.formNameChanged($0)) }
                    ))

                    TextField("Phone Number", text: .init(
                        get: { store.form.phone },
                        set: { store.send(.formPhoneChanged($0)) }
                    ))
                    .keyboardType(.phonePad)

                    TextField("Email", text: .init(
                        get: { store.form.email },
                        set: { store.send(.formEmailChanged($0)) }
                    ))
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                }

                Section("Notify Via") {
                    Toggle(isOn: .init(
                        get: { store.form.notifyPush },
                        set: { store.send(.formPushToggled($0)) }
                    )) {
                        Label("Push Notification", systemImage: "bell.fill")
                    }

                    Toggle(isOn: .init(
                        get: { store.form.notifySMS },
                        set: { store.send(.formSMSToggled($0)) }
                    )) {
                        Label("SMS", systemImage: "message.fill")
                    }

                    Toggle(isOn: .init(
                        get: { store.form.notifyEmail },
                        set: { store.send(.formEmailToggled($0)) }
                    )) {
                        Label("Email", systemImage: "envelope.fill")
                    }
                }
            }
            .navigationTitle(store.isEditing ? "Edit Contact" : "Add Contact")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        store.send(.dismissSheet)
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        store.send(.saveContact)
                    }
                    .disabled(!store.form.isValid)
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        EmergencyContactsView(
            store: Store(initialState: EmergencyContactsReducer.State()) {
                EmergencyContactsReducer()
            }
        )
    }
}
