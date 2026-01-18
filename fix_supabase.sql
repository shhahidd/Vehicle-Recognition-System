-- 1. Enable Row Level Security (good practice, though we will open it up)
ALTER TABLE "RTO" ENABLE ROW LEVEL SECURITY;

-- 2. Create a Policy to Allow Public Read Access
-- This tells Supabase: "Anyone (anon users) can SELECT (read) all rows"
CREATE POLICY "Allow public read access"
ON "RTO"
FOR SELECT
TO anon
USING (true);

-- 3. Insert Sample Data (Only if table is empty)
-- This ensures you have the data needed for the example (HR98, KA19, etc.)
INSERT INTO "RTO" (code, state, district)
VALUES
  ('KA19', 'Karnataka', 'Mangaluru'),
  ('KA01', 'Karnataka', 'Bengaluru (Central)'),
  ('MH12', 'Maharashtra', 'Pune'),
  ('HR98', 'Haryana', 'Gurgaon (Commercial)'),
  ('DL01', 'Delhi', 'Delhi (North)'),
  ('TS07', 'Telangana', 'Hyderabad'),
  ('TN01', 'Tamil Nadu', 'Chennai')
ON CONFLICT (code) DO NOTHING;
