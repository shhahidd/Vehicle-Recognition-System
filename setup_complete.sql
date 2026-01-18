-- FINAL REPAIR SCRIPT
-- Please Copy ALL lines below and paste into Supabase SQL Editor

-- 1. FIX RTO TABLE (Drop old one, create new one, add data)
DROP TABLE IF EXISTS "RTO" CASCADE;

CREATE TABLE "RTO" (
  code TEXT PRIMARY KEY,
  state TEXT,
  district TEXT
);

ALTER TABLE "RTO" ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read RTO data
CREATE POLICY "Allow public read access" ON "RTO" FOR SELECT TO anon USING (true);

-- Insert correct data
INSERT INTO "RTO" (code, state, district)
VALUES
  ('KA19', 'Karnataka', 'Mangaluru'),
  ('KA01', 'Karnataka', 'Bengaluru (Central)'),
  ('MH12', 'Maharashtra', 'Pune'),
  ('HR98', 'Haryana', 'Gurgaon (Commercial)'),
  ('DL01', 'Delhi', 'Delhi (North)'),
  ('TS07', 'Telangana', 'Hyderabad'),
  ('TN01', 'Tamil Nadu', 'Chennai'),
  ('KL14', 'Kerala', 'Kasargod')
ON CONFLICT (code) DO NOTHING;


-- 2. FIX DETECTIONS TABLE (Drop old one with wrong schema, create new one)
DROP TABLE IF EXISTS "Detections" CASCADE;

CREATE TABLE "Detections" (
    detection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_name TEXT,
    color TEXT,
    plate_number TEXT,
    rto TEXT,
    detected_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "Detections" ENABLE ROW LEVEL SECURITY;

-- Allow app to save detections
CREATE POLICY "Allow public insert" ON "Detections" FOR INSERT TO anon WITH CHECK (true);

-- Allow admins to see detections
CREATE POLICY "Allow public select" ON "Detections" FOR SELECT TO anon USING (true);

-- 3. Verify
SELECT count(*) as rto_count FROM "RTO";
