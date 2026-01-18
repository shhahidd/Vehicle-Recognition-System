import { createClient } from '@supabase/supabase-js';

// Project 1: Detections (Write)
const detectionsUrl = import.meta.env.VITE_SUPABASE_DETECTIONS_URL;
const detectionsKey = import.meta.env.VITE_SUPABASE_DETECTIONS_KEY;
export const supabaseDetections = createClient(detectionsUrl, detectionsKey);

// Project 2: RTO Data (Read)
const rtoUrl = import.meta.env.VITE_SUPABASE_RTO_URL;
const rtoKey = import.meta.env.VITE_SUPABASE_RTO_KEY;
export const supabaseRTO = createClient(rtoUrl, rtoKey);
