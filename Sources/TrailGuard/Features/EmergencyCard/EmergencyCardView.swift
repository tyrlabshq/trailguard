// EmergencyCardView.swift
// TrailGuard — Features/EmergencyCard
//
// Setup and edit UI for the emergency card.
// Required to complete before first ride.

import SwiftUI
import ComposableArchitecture

struct EmergencyCardView: View {
    let store: StoreOf<EmergencyCardReducer>

    var body: some View {
        NavigationStack {
            Form {
                // MARK: Blood Type
                Section {
                    bloodTypePicker
                } header: {
                    Text("Blood Type")
                }

                // MARK: Allergies
                Section {
                    allergiesSection
                } header: {
                    Text("Allergies")
                }

                // MARK: Medical Notes
                Section {
                    medicalNotesSection
                } header: {
                    Text("Medical Notes")
                } footer: {
                    Text("\(store.form.medicalNotes.count)/500 characters")
                        .foregroundStyle(store.form.medicalNotes.count >= 500 ? .red : .secondary)
                }

                // MARK: Emergency Contacts
                Section {
                    contactsSection
                } header: {
                    HStack {
                        Text("Emergency Contacts")
                        Spacer()
                        Text("\(store.form.contacts.count)/3")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                } footer: {
                    if store.form.contacts.isEmpty {
                        Text("At least one contact is required to save your emergency card.")
                            .foregroundStyle(.orange)
                    }
                }

                // MARK: Save Button
                Section {
                    Button {
                        store.send(.saveCard)
                    } label: {
                        HStack {
                            Spacer()
                            if store.isSaving {
                                ProgressView()
                                    .tint(.white)
                                    .padding(.trailing, 8)
                            }
                            Text(store.isSaving ? "Saving…" : "Save Emergency Card")
                                .font(.headline)
                            Spacer()
                        }
                        .padding(.vertical, 4)
                    }
                    .foregroundStyle(.white)
                    .listRowBackground(store.isCardComplete ? Color.orange : Color.gray.opacity(0.4))
                    .disabled(!store.isCardComplete || store.isSaving)
                }
            }
            .navigationTitle("Emergency Card")
            .navigationBarTitleDisplayMode(.large)
            .alert("Saved!", isPresented: .init(
                get: { store.savedConfirmation },
                set: { if !$0 { /* handled by parent routing */ } }
            )) {
                Button("Continue") { }
            } message: {
                Text("Your emergency card has been saved. Responders will be able to access this information if needed.")
            }
            .alert("Error", isPresented: .init(
                get: { store.error != nil },
                set: { if !$0 { } }
            )) {
                Button("OK") { }
            } message: {
                if let error = store.error {
                    Text(error)
                }
            }
            .sheet(isPresented: .init(
                get: { store.form.isAddingContact },
                set: { if !$0 { store.send(.contactFormDismissed) } }
            )) {
                AddContactSheet(store: store)
            }
            .onAppear {
                store.send(.loadCard)
            }
        }
    }

    // MARK: - Blood Type Picker

    private var bloodTypePicker: some View {
        Picker("Blood Type", selection: .init(
            get: { store.form.bloodType },
            set: { store.send(.bloodTypeChanged($0)) }
        )) {
            ForEach(EmergencyCard.BloodType.allCases) { bt in
                Text(bt.rawValue).tag(bt)
            }
        }
        .pickerStyle(.menu)
    }

    // MARK: - Allergies

    private var allergiesSection: some View {
        Group {
            // Existing allergies as chips
            if !store.form.allergies.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(store.form.allergies, id: \.self) { allergy in
                            HStack(spacing: 4) {
                                Text(allergy)
                                    .font(.footnote.weight(.medium))
                                Button {
                                    store.send(.removeAllergy(allergy))
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundStyle(.secondary)
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Color.orange.opacity(0.15))
                            .clipShape(Capsule())
                        }
                    }
                    .padding(.vertical, 4)
                }
                .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
            }

            // Input row
            HStack {
                TextField("e.g. Penicillin, Bee stings", text: .init(
                    get: { store.form.allergyInput },
                    set: { store.send(.allergyInputChanged($0)) }
                ))
                .onSubmit { store.send(.addAllergy) }
                Button("Add") {
                    store.send(.addAllergy)
                }
                .disabled(store.form.allergyInput.trimmingCharacters(in: .whitespaces).isEmpty)
                .foregroundStyle(.orange)
            }
        }
    }

    // MARK: - Medical Notes

    private var medicalNotesSection: some View {
        TextEditor(text: .init(
            get: { store.form.medicalNotes },
            set: { store.send(.medicalNotesChanged($0)) }
        ))
        .frame(minHeight: 100)
        .overlay(
            Group {
                if store.form.medicalNotes.isEmpty {
                    Text("Any conditions, medications, or other notes for first responders…")
                        .foregroundStyle(.tertiary)
                        .padding(.top, 8)
                        .padding(.leading, 4)
                        .allowsHitTesting(false)
                }
            },
            alignment: .topLeading
        )
    }

    // MARK: - Contacts

    private var contactsSection: some View {
        Group {
            ForEach(store.form.contacts) { contact in
                VStack(alignment: .leading, spacing: 2) {
                    Text(contact.name)
                        .font(.body.weight(.medium))
                    if let relationship = contact.relationship {
                        Text(relationship)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    if let phone = contact.phone {
                        Text(phone)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                .swipeActions(edge: .trailing) {
                    Button(role: .destructive) {
                        store.send(.removeContact(contact.id))
                    } label: {
                        Label("Remove", systemImage: "trash")
                    }
                }
            }

            if store.form.contacts.count < 3 {
                Button {
                    store.send(.addContactTapped)
                } label: {
                    Label("Add Contact", systemImage: "plus.circle.fill")
                        .foregroundStyle(.orange)
                }
            }
        }
    }
}

// MARK: - Add Contact Sheet

private struct AddContactSheet: View {
    let store: StoreOf<EmergencyCardReducer>

    var body: some View {
        NavigationStack {
            Form {
                Section("Contact Info") {
                    TextField("Full Name *", text: .init(
                        get: { store.form.contactForm.name },
                        set: { store.send(.contactFormNameChanged($0)) }
                    ))
                    TextField("Phone Number", text: .init(
                        get: { store.form.contactForm.phone },
                        set: { store.send(.contactFormPhoneChanged($0)) }
                    ))
                    .keyboardType(.phonePad)

                    TextField("Email (optional)", text: .init(
                        get: { store.form.contactForm.email },
                        set: { store.send(.contactFormEmailChanged($0)) }
                    ))
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)

                    TextField("Relationship (e.g. Spouse, Parent)", text: .init(
                        get: { store.form.contactForm.relationship },
                        set: { store.send(.contactFormRelationshipChanged($0)) }
                    ))
                }
            }
            .navigationTitle("Add Contact")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        store.send(.contactFormDismissed)
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        store.send(.saveContact)
                    }
                    .disabled(store.form.contactForm.name.isEmpty)
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

#Preview {
    EmergencyCardView(
        store: Store(initialState: EmergencyCardReducer.State()) {
            EmergencyCardReducer()
        }
    )
}
