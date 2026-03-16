// SOSContact.swift
// TrailGuard — Models
//
// Contact who receives SOS notifications (push/SMS/email).
// Stored in dedicated emergency_contacts table.

import Foundation

struct SOSContact: Codable, Identifiable, Equatable {
    let id: UUID
    let riderId: UUID
    var name: String
    var phone: String?
    var email: String?
    var notifyVia: [NotifyMethod]
    var createdAt: Date?

    enum NotifyMethod: String, Codable, CaseIterable, Identifiable {
        case push
        case sms
        case email

        var id: String { rawValue }

        var label: String {
            switch self {
            case .push:  return "Push"
            case .sms:   return "SMS"
            case .email: return "Email"
            }
        }

        var icon: String {
            switch self {
            case .push:  return "bell.fill"
            case .sms:   return "message.fill"
            case .email: return "envelope.fill"
            }
        }
    }

    enum CodingKeys: String, CodingKey {
        case id
        case riderId   = "rider_id"
        case name, phone, email
        case notifyVia = "notify_via"
        case createdAt = "created_at"
    }
}
