-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Detections" (
    detection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_name TEXT,
    color TEXT,
    plate_number TEXT,
    rto TEXT,
    detected_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE "Detections" ENABLE ROW LEVEL SECURITY;

-- 3. CRITICAL: Allow public INSERT access
-- Without this, the app cannot save data!
CREATE POLICY "Allow public insert"
ON "Detections"
FOR INSERT
TO anon
WITH CHECK (true);

-- 4. Allow public SELECT access (so you can see it in admin if needed)
CREATE POLICY "Allow public select"
ON "Detections"
FOR SELECT
TO anon
USING (true);
