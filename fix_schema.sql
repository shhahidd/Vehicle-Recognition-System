-- CRITICAL FIX: Recreate Detections table with CORRECT types
-- The previous error showed 'detected_at' was NUMERIC, but it must be TIMESTAMP

DROP TABLE IF EXISTS "Detections";

CREATE TABLE "Detections" (
    detection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_name TEXT,
    color TEXT,
    plate_number TEXT,
    rto TEXT,
    detected_at TIMESTAMPTZ DEFAULT now()  -- MUST be TIMESTAMPTZ
);

ALTER TABLE "Detections" ENABLE ROW LEVEL SECURITY;

-- Allow public insert (Required for the app to save data)
CREATE POLICY "Allow public insert"
ON "Detections"
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow public read (Required for admin/debug)
CREATE POLICY "Allow public select"
ON "Detections"
FOR SELECT
TO anon
USING (true);
