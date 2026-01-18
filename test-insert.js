import { saveDetection } from '../src/services/detectionService.js';
import { supabase } from '../src/lib/supabase.js';

// Setup Mock for Node environment since detectionService uses 'import'
// We will just copy the logic effectively to test the exact Supabase call

import { createClient } from '@supabase/supabase-js';

// Re-using the NEW credentials provided by the user
const supabaseUrl = 'https://xrdazfowrpgrphgirovw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZGF6Zm93cnBncnBoZ2lyb3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjc3NDgsImV4cCI6MjA4MTY0Mzc0OH0.8Qixfr3nMn7WKmj91f2ji2NVNkCrwvmiz-uNnNBTUJw';

const client = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log("🚀 Testing Detection Insert...");

    const testPayload = {
        car_name: "Test Car",
        color: "Test Color",
        plate_number: "TEST01",
        rto: "Test RTO",
        detected_at: new Date().toISOString()
    };

    console.log("Payload:", testPayload);

    const { data, error } = await client
        .from('Detections')
        .insert([testPayload])
        .select();

    if (error) {
        console.error("❌ INSERT FAILED:", error);
        console.error("Message:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
    } else {
        console.log("✅ INSERT SUCCESS:", data);
    }
}

testInsert();
