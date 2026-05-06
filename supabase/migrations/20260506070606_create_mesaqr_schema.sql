/*
  # Create MesaQR Database Schema

  1. New Tables
    - `events` — Stores event information (name, type, date, venue, host, cover config, QR position)
    - `tables` — Event tables with position, shape, video URL, and label
    - `guests` — Guest list with name, surname, table assignment
    - `cover_elements` — Draggable elements on the cover (images, texts)
    - `location_markers` — Draggable markers on the map (entrance, exit, stage, bar, etc.)

  2. Security
    - Enable RLS on all tables
    - Public read access for guests scanning QR codes (anon role)
    - Public write access for admin operations (anon role, since this is a single-user tool)

  3. Important Notes
    - Events store cover configuration as JSONB for flexibility
    - Tables store position and size as JSONB
    - Cover elements store position, size, and style as JSONB
    - Location markers store position as JSONB
    - All tables use CASCADE delete on event_id foreign keys
*/

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  event_type text NOT NULL DEFAULT 'boda',
  event_date text DEFAULT '',
  venue text DEFAULT '',
  host_name text DEFAULT '',
  accent_color text DEFAULT '#d4af37',
  background_url text DEFAULT '',
  background_type text DEFAULT 'color',
  cover_config jsonb DEFAULT '{}'::jsonb,
  qr_position jsonb DEFAULT '{"x": 80, "y": 80}'::jsonb,
  qr_size integer DEFAULT 150,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tables (mesas) for the event
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  shape text NOT NULL DEFAULT 'round',
  position jsonb NOT NULL DEFAULT '{"x": 50, "y": 50}'::jsonb,
  size jsonb DEFAULT '{"width": 80, "height": 80}'::jsonb,
  video_url text DEFAULT '',
  video_type text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Guests
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  surname text NOT NULL DEFAULT '',
  table_id uuid REFERENCES tables(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Cover elements (images, texts on the cover)
CREATE TABLE IF NOT EXISTS cover_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  element_type text NOT NULL DEFAULT 'text',
  content text DEFAULT '',
  position jsonb NOT NULL DEFAULT '{"x": 50, "y": 50}'::jsonb,
  size jsonb DEFAULT '{"width": 200, "height": 50}'::jsonb,
  style jsonb DEFAULT '{}'::jsonb,
  animation text DEFAULT '',
  z_index integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Location markers (entrance, exit, stage, bar, dance floor, etc.)
CREATE TABLE IF NOT EXISTS location_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  marker_type text NOT NULL DEFAULT 'entrance',
  label text DEFAULT '',
  position jsonb NOT NULL DEFAULT '{"x": 50, "y": 50}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_markers ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (this is a public event tool, no auth required)
CREATE POLICY "Public read events" ON events FOR SELECT TO anon USING (true);
CREATE POLICY "Public insert events" ON events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public update events" ON events FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public delete events" ON events FOR DELETE TO anon USING (true);

CREATE POLICY "Public read tables" ON tables FOR SELECT TO anon USING (true);
CREATE POLICY "Public insert tables" ON tables FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public update tables" ON tables FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public delete tables" ON tables FOR DELETE TO anon USING (true);

CREATE POLICY "Public read guests" ON guests FOR SELECT TO anon USING (true);
CREATE POLICY "Public insert guests" ON guests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public update guests" ON guests FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public delete guests" ON guests FOR DELETE TO anon USING (true);

CREATE POLICY "Public read cover_elements" ON cover_elements FOR SELECT TO anon USING (true);
CREATE POLICY "Public insert cover_elements" ON cover_elements FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public update cover_elements" ON cover_elements FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public delete cover_elements" ON cover_elements FOR DELETE TO anon USING (true);

CREATE POLICY "Public read location_markers" ON location_markers FOR SELECT TO anon USING (true);
CREATE POLICY "Public insert location_markers" ON location_markers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public update location_markers" ON location_markers FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public delete location_markers" ON location_markers FOR DELETE TO anon USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tables_event_id ON tables(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_table_id ON guests(table_id);
CREATE INDEX IF NOT EXISTS idx_cover_elements_event_id ON cover_elements(event_id);
CREATE INDEX IF NOT EXISTS idx_location_markers_event_id ON location_markers(event_id);