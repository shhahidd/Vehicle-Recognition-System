-- 1. SETUP "RTO" TABLE
CREATE TABLE IF NOT EXISTS "RTO" (
    code TEXT PRIMARY KEY,
    state TEXT,
    district TEXT
);

ALTER TABLE "RTO" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
ON "RTO"
FOR SELECT
TO anon
USING (true);

-- Insert Sample RTO Data
INSERT INTO "RTO" (code, state, district)
VALUES
  ('KA19', 'Karnataka', 'Mangaluru'),
  ('KA01', 'Karnataka', 'Bengaluru (Central)'),
  ('KA53', 'Karnataka', 'Bengaluru (K.R. Puram)'),
  ('MH12', 'Maharashtra', 'Pune'),
  ('HR98', 'Haryana', 'Gurgaon'),
  ('DL01', 'Delhi', 'Delhi (North)'),
  ('TS07', 'Telangana', 'Hyderabad'),
  ('TN01', 'Tamil Nadu', 'Chennai'),
  ('GJ01', 'Gujarat', 'Ahmedabad')
ON CONFLICT (code) DO NOTHING;


-- 2. SETUP "Detections" TABLE
CREATE TABLE IF NOT EXISTS "Detections" (
    detection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_name TEXT,
    color TEXT,
    plate_number TEXT,
    rto TEXT,
    detected_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "Detections" ENABLE ROW LEVEL SECURITY;

-- Allow anyone to Insert data (since we are doing it from the client for this demo)
-- WARNING: In production, you might want to restrict this
CREATE POLICY "Allow public insert access"
ON "Detections"
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow public read access to see results in Admin panel (optional)
CREATE POLICY "Allow public read access"
ON "Detections"
FOR SELECT
TO anon
USING (true);
