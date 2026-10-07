-- Migration 022: Add Event Locations
CREATE TABLE public.event_locations (
  event_id UUID PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  address TEXT
);

-- Enable RLS
ALTER TABLE public.event_locations ENABLE ROW LEVEL SECURITY;

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_locations TO authenticated;
GRANT SELECT ON public.event_locations TO anon;

-- Policies
CREATE POLICY "Event locations are viewable by everyone"
  ON public.event_locations FOR SELECT
  USING (true);

CREATE POLICY "Organisers can insert locations for their events"
  ON public.event_locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_locations.event_id
      AND events.organiser_id = auth.uid()
    )
  );

CREATE POLICY "Organisers can update locations for their events"
  ON public.event_locations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_locations.event_id
      AND events.organiser_id = auth.uid()
    )
  );

CREATE POLICY "Organisers can delete locations for their events"
  ON public.event_locations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_locations.event_id
      AND events.organiser_id = auth.uid()
    )
  );
