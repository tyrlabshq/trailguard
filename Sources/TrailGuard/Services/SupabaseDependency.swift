// SupabaseDependency.swift
// TrailGuard — Services
//
// TCA DependencyKey wrapper for the Supabase Swift SDK client.
// Provides a live SupabaseClient configured from embedded credentials
// and a test client for previews and unit tests.

import ComposableArchitecture
import Foundation
import Supabase

// MARK: - TCA Dependency Key

private enum SupabaseClientKey: DependencyKey {
    static let liveValue: SupabaseClient = {
        SupabaseClient(
            supabaseURL: URL(string: "https://ekrdvptkeagygkhujnvl.supabase.co")!,
            supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcmR2cHRrZWFneWdraHVqbnZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDYxMDAsImV4cCI6MjA4ODQ4MjEwMH0.-szgIoHm_OQ5CIuqf0k6N-w3Wc0q-n-p4NajcW1fnPk"
        )
    }()

    // Tests use the live client — swap this out in test targets if needed
    static let testValue: SupabaseClient = liveValue
}

extension DependencyValues {
    var supabase: SupabaseClient {
        get { self[SupabaseClientKey.self] }
        set { self[SupabaseClientKey.self] = newValue }
    }
}
