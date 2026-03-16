// EmergencyCard.swift
// TrailGuard — Models
//
// Rider emergency card: medical info + emergency contacts.
// Required before first ride. Max 3 contacts.

import Foundation

struct EmergencyCard: Codable, Identifiable, Equatable {
    let id: UUID
    let riderId: UUID
    var bloodType: BloodType?
    var allergies: [String]
    var medicalNotes: String?           // 500 char max
    var contacts: [EmergencyContact]    // 1–3 contacts
    var updatedAt: Date

    // Card is "complete" when at least 1 contact is added
    var isComplete: Bool { !contacts.isEmpty }

    // MARK: - Blood Type

    enum BloodType: String, Codable, CaseIterable, Identifiable {
        case aNeg  = "A-"
        case aPos  = "A+"
        case bNeg  = "B-"
        case bPos  = "B+"
        case abNeg = "AB-"
        case abPos = "AB+"
        case oNeg  = "O-"
        case oPos  = "O+"
        case unknown = "Unknown"

        var id: String { rawValue }
    }

    // MARK: - Emergency Contact

    struct EmergencyContact: Codable, Identifiable, Equatable {
        let id: UUID
        var name: String
        var phone: String?          // E.164 format (+15551234567)
        var email: String?
        var relationship: String?

        enum CodingKeys: String, CodingKey {
            case id, name, phone, email, relationship
        }
    }

    // MARK: - Supabase Column Mapping

    enum CodingKeys: String, CodingKey {
        case id
        case riderId    = "rider_id"
        case bloodType  = "blood_type"
        case allergies
        case medicalNotes = "medical_notes"
        case contacts       // joined from emergency_contacts table
        case updatedAt  = "updated_at"
    }
}
