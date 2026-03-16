// EmergencyContactsReducer.swift
// TrailGuard — Features/EmergencyContacts
//
// TCA reducer for managing SOS notification contacts.
// These contacts are notified via push/SMS/email when SOS is triggered.

import ComposableArchitecture
import Foundation
import Supabase

@Reducer
struct EmergencyContactsReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var contacts: [SOSContact] = []
        var isLoading: Bool = false
        var error: String?
        var showAddSheet: Bool = false
        var editingContact: SOSContact?
        var deleteConfirm: SOSContact?

        // Add/Edit form
        var form: FormState = .init()

        var isEditing: Bool { editingContact != nil }
        var isSheetVisible: Bool { showAddSheet || editingContact != nil }

        struct FormState: Equatable {
            var name: String = ""
            var phone: String = ""
            var email: String = ""
            var notifyPush: Bool = true
            var notifySMS: Bool = false
            var notifyEmail: Bool = false

            var isValid: Bool { !name.trimmingCharacters(in: .whitespaces).isEmpty }

            var notifyVia: [SOSContact.NotifyMethod] {
                var methods: [SOSContact.NotifyMethod] = []
                if notifyPush  { methods.append(.push) }
                if notifySMS   { methods.append(.sms) }
                if notifyEmail { methods.append(.email) }
                return methods
            }
        }
    }

    // MARK: - Action

    enum Action {
        // Load
        case loadContacts
        case loadContactsResult(Result<[SOSContact], Error>)

        // Add
        case showAdd
        case dismissSheet

        // Edit
        case editContact(SOSContact)

        // Form
        case formNameChanged(String)
        case formPhoneChanged(String)
        case formEmailChanged(String)
        case formPushToggled(Bool)
        case formSMSToggled(Bool)
        case formEmailToggled(Bool)

        // Save (insert or update)
        case saveContact
        case saveContactResult(Result<SOSContact, Error>)

        // Delete
        case deleteContact(SOSContact)
        case confirmDelete
        case cancelDelete
        case deleteContactResult(Result<UUID, Error>)
    }

    // MARK: - Dependencies

    @Dependency(\.supabase) var supabase
    @Dependency(\.uuid) var uuid

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {

            // MARK: Load
            case .loadContacts:
                state.isLoading = true
                state.error = nil
                return .run { send in
                    do {
                        let userId = try await supabase.auth.session.user.id
                        let contacts: [SOSContact] = try await supabase
                            .from("emergency_contacts")
                            .select()
                            .eq("rider_id", value: userId.uuidString)
                            .order("created_at")
                            .execute()
                            .value
                        await send(.loadContactsResult(.success(contacts)))
                    } catch {
                        await send(.loadContactsResult(.failure(error)))
                    }
                }

            case let .loadContactsResult(.success(contacts)):
                state.isLoading = false
                state.contacts = contacts
                return .none

            case let .loadContactsResult(.failure(error)):
                state.isLoading = false
                state.error = error.localizedDescription
                return .none

            // MARK: Add
            case .showAdd:
                state.form = .init()
                state.editingContact = nil
                state.showAddSheet = true
                return .none

            case .dismissSheet:
                state.showAddSheet = false
                state.editingContact = nil
                state.form = .init()
                return .none

            // MARK: Edit
            case let .editContact(contact):
                state.editingContact = contact
                state.showAddSheet = false
                state.form.name = contact.name
                state.form.phone = contact.phone ?? ""
                state.form.email = contact.email ?? ""
                state.form.notifyPush = contact.notifyVia.contains(.push)
                state.form.notifySMS = contact.notifyVia.contains(.sms)
                state.form.notifyEmail = contact.notifyVia.contains(.email)
                return .none

            // MARK: Form
            case let .formNameChanged(name):
                state.form.name = name
                return .none

            case let .formPhoneChanged(phone):
                state.form.phone = phone
                return .none

            case let .formEmailChanged(email):
                state.form.email = email
                return .none

            case let .formPushToggled(on):
                state.form.notifyPush = on
                return .none

            case let .formSMSToggled(on):
                state.form.notifySMS = on
                return .none

            case let .formEmailToggled(on):
                state.form.notifyEmail = on
                return .none

            // MARK: Save
            case .saveContact:
                guard state.form.isValid else { return .none }
                let form = state.form
                let existingId = state.editingContact?.id
                return .run { [uuid] send in
                    do {
                        let userId = try await supabase.auth.session.user.id
                        let contactId = existingId ?? uuid()
                        let notifyVia = form.notifyVia.map(\.rawValue)

                        struct UpsertPayload: Encodable {
                            let id: String
                            let rider_id: String
                            let name: String
                            let phone: String?
                            let email: String?
                            let notify_via: [String]
                        }

                        let payload = UpsertPayload(
                            id: contactId.uuidString,
                            rider_id: userId.uuidString,
                            name: form.name.trimmingCharacters(in: .whitespaces),
                            phone: form.phone.isEmpty ? nil : form.phone,
                            email: form.email.isEmpty ? nil : form.email,
                            notify_via: notifyVia
                        )

                        let saved: SOSContact = try await supabase
                            .from("emergency_contacts")
                            .upsert(payload, onConflict: "id")
                            .select()
                            .single()
                            .execute()
                            .value

                        await send(.saveContactResult(.success(saved)))
                    } catch {
                        await send(.saveContactResult(.failure(error)))
                    }
                }

            case let .saveContactResult(.success(contact)):
                if let idx = state.contacts.firstIndex(where: { $0.id == contact.id }) {
                    state.contacts[idx] = contact
                } else {
                    state.contacts.append(contact)
                }
                state.showAddSheet = false
                state.editingContact = nil
                state.form = .init()
                return .none

            case let .saveContactResult(.failure(error)):
                state.error = error.localizedDescription
                return .none

            // MARK: Delete
            case let .deleteContact(contact):
                state.deleteConfirm = contact
                return .none

            case .confirmDelete:
                guard let contact = state.deleteConfirm else { return .none }
                state.deleteConfirm = nil
                let contactId = contact.id
                return .run { send in
                    do {
                        try await supabase
                            .from("emergency_contacts")
                            .delete()
                            .eq("id", value: contactId.uuidString)
                            .execute()
                        await send(.deleteContactResult(.success(contactId)))
                    } catch {
                        await send(.deleteContactResult(.failure(error)))
                    }
                }

            case .cancelDelete:
                state.deleteConfirm = nil
                return .none

            case let .deleteContactResult(.success(id)):
                state.contacts.removeAll { $0.id == id }
                return .none

            case let .deleteContactResult(.failure(error)):
                state.error = error.localizedDescription
                return .none
            }
        }
    }
}
