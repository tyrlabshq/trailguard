-- Emergency contacts for SOS notifications.
-- Separate from emergency_cards.contacts (medical card).
-- These contacts receive push/SMS/email when SOS is triggered.

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name       text NOT NULL,
    phone      text,
    email      text,
    notify_via text[] DEFAULT '{push}',
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_emergency_contacts_rider ON public.emergency_contacts(rider_id);

-- RLS: riders can only CRUD their own contacts
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders can view own contacts"
    ON public.emergency_contacts FOR SELECT
    USING (auth.uid() = rider_id);

CREATE POLICY "Riders can insert own contacts"
    ON public.emergency_contacts FOR INSERT
    WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Riders can update own contacts"
    ON public.emergency_contacts FOR UPDATE
    USING (auth.uid() = rider_id);

CREATE POLICY "Riders can delete own contacts"
    ON public.emergency_contacts FOR DELETE
    USING (auth.uid() = rider_id);
