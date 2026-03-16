// EmergencyCardReducer.swift
// TrailGuard — Features/EmergencyCard
//
// TCA reducer for emergency card setup and editing.
// Emergency card is required before any ride can start.

import ComposableArchitecture
import Foundation

@Reducer
struct EmergencyCardReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var card: EmergencyCard?
        var isLoading: Bool = false
        var isSaving: Bool = false
        var error: String?

        // Edit form
        var form: FormState = .init()

        var isCardComplete: Bool {
            guard let card = card else { return false }
            return !card.contacts.isEmpty
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
        case cardNotFound      // First time — show setup flow

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
    // TODO: @Dependency(\.supabaseClient) var supabaseClient

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case .loadCard:
                state.isLoading = true
                // TODO: supabaseClient.fetchEmergencyCard()
                return .none

            case let .cardLoaded(card):
                state.isLoading = false
                state.card = card
                // Populate form from existing card
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
                guard state.form.contacts.count < 3 else { return .none } // max 3 contacts
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
                state.isSaving = true
                // TODO: supabaseClient.upsertEmergencyCard(form: state.form)
                return .none

            case let .cardSaved(card):
                state.isSaving = false
                state.card = card
                return .none

            case let .saveFailed(error):
                state.isSaving = false
                state.error = error
                return .none
            }
        }
    }
}
