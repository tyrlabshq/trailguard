-- Add phone field to riders table and allow group-members to read each other's
-- profiles (needed for SOS notification name + phone lookup — Task #751).

alter table public.riders
  add column if not exists phone text;

-- Group members can read co-member profiles so that when an SOS alert fires
-- we can resolve the sender's display_name and phone for the push notification.
-- The policy grants SELECT on any riders row where BOTH the requesting user
-- AND the target rider share at least one common group.
create policy "group members can read co-member riders"
  on public.riders
  for select
  using (
    exists (
      select 1
      from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.rider_id = auth.uid()
        and gm2.rider_id = riders.id
    )
  );
