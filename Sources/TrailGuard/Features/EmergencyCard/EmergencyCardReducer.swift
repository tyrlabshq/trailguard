// EmergencyCardReducer.swift
// TrailGuard — Features/EmergencyCard
//
// TCA reducer for emergency card setup and editing.
// Emergency card is required before any ride can start.

import ComposableArchitecture
import Foundation
import Supabase

@Reducer
struct EmergencyCardReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var card: EmergencyCard?
        var isLoading: Bool = false
        var isSaving: Bool = false
        var error: String?
        var savedConfirmation: Bool = false

        // Edit form
        var form: FormState = .init()

        var isCardComplete: Bool {
            !form.contacts.isEmpty
        }

        struct FormState: Equatable {
            var bloodType: EmergencyCard.BloodType = .unknown
            var allergies: [String] = []
            var allergyInput: String = ""
            var medicalNotes: String = ""
            var contacts: [EmergencyCard.EmergencyContact] = []
            var contactForm: ContactFormState = .init()
            var isAddingContact: Bool = false

            struct ContactFormState: Equatable {
                var name: String = ""
                var phone: String = ""
                var email: String = ""
                var relationship: String = ""
            }
        }
    }

    // MARK: - Action

    enum Action {
        // Load
        case loadCard
        case cardLoaded(EmergencyCard)
        case cardNotFound

        // Form edits
        case bloodTypeChanged(EmergencyCard.BloodType)
        case allergyInputChanged(String)
        case addAllergy
        case removeAllergy(String)
        case medicalNotesChanged(String)

        // Contact management
        case addContactTapped
        case contactFormNameChanged(String)
        case contactFormPhoneChanged(String)
        case contactFormEmailChanged(String)
        case contactFormRelationshipChanged(String)
        case saveContact
        case removeContact(UUID)
        case contactFormDismissed

        // Save card
        case saveCard
        case cardSaved(EmergencyCard)
        case saveFailed(String)
    }

    // MARK: - Dependencies

    @Dependency(\.supabase) var supabase

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {

            case .loadCard:
                state.isLoading = true
                state.error = nil
                return .run { send in
                    do {
                        let userId = try await supabase.auth.session.user.id
                        let card: EmergencyCard? = try await supabase
                            .from("emergency_cards")
                            .select()
                            .eq("rider_id", value: userId.uuidString)
                            .single()
                            .execute()
                            .value
                        if let card = card {
                            await send(.cardLoaded(card))
                        } else {
                            await send(.cardNotFound)
                        }
                    } catch {
                        await send(.cardNotFound)
                    }
                }

            case let .cardLoaded(card):
                state.isLoading = false
                state.card = card
                state.form.bloodType = card.bloodType ?? .unknown
                state.form.allergies = card.allergies
                state.form.medicalNotes = card.medicalNotes ?? ""
                state.form.contacts = card.contacts
                return .none

            case .cardNotFound:
                state.isLoading = false
                return .none

            case let .bloodTypeChanged(bloodType):
                state.form.bloodType = bloodType
                return .none

            case let .allergyInputChanged(input):
                state.form.allergyInput = input
                return .none

            case .addAllergy:
                let allergy = state.form.allergyInput.trimmingCharacters(in: .whitespaces)
                guard !allergy.isEmpty else { return .none }
                state.form.allergies.append(allergy)
                state.form.allergyInput = ""
                return .none

            case let .removeAllergy(allergy):
                state.form.allergies.removeAll { $0 == allergy }
                return .none

            case let .medicalNotesChanged(notes):
                state.form.medicalNotes = String(notes.prefix(500))
                return .none

            case .addContactTapped:
                state.form.isAddingContact = true
                state.form.contactForm = .init()
                return .none

            case let .contactFormNameChanged(name):
                state.form.contactForm.name = name
                return .none

            case let .contactFormPhoneChanged(phone):
                state.form.contactForm.phone = phone
                return .none

            case let .contactFormEmailChanged(email):
                state.form.contactForm.email = email
                return .none

            case let .contactFormRelationshipChanged(relationship):
                state.form.contactForm.relationship = relationship
                return .none

            case .saveContact:
                let form = state.form.contactForm
                guard !form.name.isEmpty else { return .none }
                guard state.form.contacts.count < 3 else { return .none }
                let contact = EmergencyCard.EmergencyContact(
                    id: UUID(),
                    name: form.name,
                    phone: form.phone.isEmpty ? nil : form.phone,
                    email: form.email.isEmpty ? nil : form.email,
                    relationship: form.relationship.isEmpty ? nil : form.relationship
                )
                state.form.contacts.append(contact)
                state.form.isAddingContact = false
                state.form.contactForm = .init()
                return .none

            case let .removeContact(id):
                state.form.contacts.removeAll { $0.id == id }
                return .none

            case .contactFormDismissed:
                state.form.isAddingContact = false
                state.form.contactForm = .init()
                return .none

            case .saveCard:
                guard !state.form.contacts.isEmpty else { return .none }
                state.isSaving = true
                state.error = nil
                let form = state.form
                return .run { send in
                    do {
                        let userId = try await supabase.auth.session.user.id
                        let now = Date()

                        // Encode contacts as JSON for the JSONB column
                        let encoder = JSONEncoder()
                        encoder.keyEncodingStrategy = .convertToSnakeCase
                        let contactsData = try encoder.encode(form.contacts)
                        let contactsJSON = try JSONSerialization.jsonObject(with: contactsData) as? [[String: Any]] ?? []

                        struct UpsertPayload: Encodable {
                            let rider_id: String
                            let blood_type: String
                            let allergies: [String]
                            let medical_notes: String
                            let contacts: [[String: String?]]
                            let updated_at: String
                        }

                        // Build contacts array for jsonb
                        let contactsForDB: [[String: String?]] = form.contacts.map { c in
                            [
                                "id": c.id.uuidString,
                                "name": c.name,
                                "phone": c.phone,
                                "email": c.email,
                                "relationship": c.relationship
                            ]
                        }

                        let iso8601 = ISO8601DateFormatter()
                        let payload = UpsertPayload(
                            rider_id: userId.uuidString,
                            blood_type: form.bloodType.rawValue,
                            allergies: form.allergies,
                            medical_notes: String(form.medicalNotes.prefix(500)),
                            contacts: contactsForDB,
                            updated_at: iso8601.string(from: now)
                        )

                        let saved: EmergencyCard = try await supabase
                            .from("emergency_cards")
                            .upsert(payload, onConflict: "rider_id")
                            .select()
                            .single()
                            .execute()
                            .value

                        await send(.cardSaved(saved))
                    } catch {
                        await send(.saveFailed(error.localizedDescription))
                    }
                }

            case let .cardSaved(card):
                state.isSaving = false
                state.card = card
                state.savedConfirmation = true
                return .none

            case let .saveFailed(error):
                state.isSaving = false
                state.error = error
                return .none
            }
        }
    }
}
