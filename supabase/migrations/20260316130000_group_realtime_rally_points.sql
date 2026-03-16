-- Phase 6: Enable Realtime for group rally points
-- group_ride_members was already added in 20260316_group_rides.sql

ALTER PUBLICATION supabase_realtime ADD TABLE group_rally_points;
