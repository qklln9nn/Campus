-- ==============================================================================
-- IN-APP NOTIFICATION TRIGGERS
-- ==============================================================================

-- Scenario 1 & 2: Event Approved or Rejected (Notify Organiser)
CREATE OR REPLACE FUNCTION notify_event_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    INSERT INTO public.in_app_notifications (user_id, title, content)
    VALUES (NEW.organiser_id, '✅ Event Approved', 'Your event "' || NEW.title || '" has been approved and is now published!');
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO public.in_app_notifications (user_id, title, content)
    VALUES (NEW.organiser_id, '❌ Event Rejected', 'Your event "' || NEW.title || '" was rejected. Reason: ' || COALESCE(NEW.rejection_reason, 'No reason provided.'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_event_status ON public.events;
CREATE TRIGGER trigger_notify_event_status
  AFTER UPDATE OF status ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_status_change();


-- Scenario 3: Waitlist Success (Notify Student)
CREATE OR REPLACE FUNCTION notify_waitlist_success()
RETURNS TRIGGER AS $$
DECLARE
  v_event_title TEXT;
BEGIN
  IF NEW.status = 'registered' AND OLD.status = 'waitlisted' THEN
    SELECT title INTO v_event_title FROM events WHERE id = NEW.event_id;
    INSERT INTO in_app_notifications (user_id, title, content)
    VALUES (NEW.student_id, '🎉 Waitlist Success!', 'Good news! You are off the waitlist and have a spot for "' || COALESCE(v_event_title, 'Unknown Event') || '".');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_waitlist ON public.registrations;
CREATE TRIGGER trigger_notify_waitlist
  AFTER UPDATE OF status ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION notify_waitlist_success();


-- Scenario 4: Event Filling Fast (Notify Organiser when reaching 90% capacity)
CREATE OR REPLACE FUNCTION notify_event_filling_fast()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.registered_count >= (NEW.capacity * 0.9) AND OLD.registered_count < (OLD.capacity * 0.9) AND NEW.capacity > 0 THEN
    INSERT INTO in_app_notifications (user_id, title, content)
    VALUES (NEW.organiser_id, '🔥 Filling Fast!', 'Your event "' || NEW.title || '" is almost full (' || NEW.registered_count || '/' || NEW.capacity || ' spots booked).');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_filling_fast ON public.events;
CREATE TRIGGER trigger_notify_filling_fast
  AFTER UPDATE OF registered_count ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_filling_fast();


-- Scenario 5: New Event Created (Notify System Admins)
CREATE OR REPLACE FUNCTION notify_admin_new_event()
RETURNS TRIGGER AS $$
DECLARE
  admin_rec RECORD;
BEGIN
  IF NEW.status = 'pending' AND (TG_OP = 'INSERT' OR OLD.status != 'pending') THEN
    FOR admin_rec IN SELECT id FROM profiles WHERE role = 'admin' LOOP
      INSERT INTO in_app_notifications (user_id, title, content)
      VALUES (admin_rec.id, '⚠️ New Event Review', 'A new event "' || NEW.title || '" requires your review.');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_admin_new_event ON public.events;
CREATE TRIGGER trigger_notify_admin_new_event
  AFTER INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_event();


-- Scenario 6: New Report Submitted (Notify System Admins)
CREATE OR REPLACE FUNCTION notify_admin_new_report()
RETURNS TRIGGER AS $$
DECLARE
  admin_rec RECORD;
  v_event_title TEXT;
BEGIN
  SELECT title INTO v_event_title FROM events WHERE id = NEW.event_id;
  FOR admin_rec IN SELECT id FROM profiles WHERE role = 'admin' LOOP
    INSERT INTO in_app_notifications (user_id, title, content)
    VALUES (admin_rec.id, '🚨 New Violation Report', 'A new report was submitted for event "' || COALESCE(v_event_title, 'Unknown') || '".');
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_admin_new_report ON public.reports;
CREATE TRIGGER trigger_notify_admin_new_report
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_report();
