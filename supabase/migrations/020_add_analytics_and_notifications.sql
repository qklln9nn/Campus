-- Migration 020: Add Notifications


CREATE TABLE in_app_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.in_app_notifications TO authenticated;

-- Policies for notifications (Strictly isolated by user)
DROP POLICY IF EXISTS "Users can view their own notifications" ON in_app_notifications;
CREATE POLICY "Users can view their own notifications"
  ON in_app_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications (e.g. mark as read)" ON in_app_notifications;
CREATE POLICY "Users can update their own notifications (e.g. mark as read)"
  ON in_app_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow system triggers (SECURITY DEFINER) to insert notifications
DROP POLICY IF EXISTS "System can insert notifications" ON in_app_notifications;
CREATE POLICY "System can insert notifications"
  ON in_app_notifications FOR INSERT
  WITH CHECK (true);
