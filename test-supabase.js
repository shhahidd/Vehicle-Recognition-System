// Standalone test script to verify Supabase connection and data fetching
// Uses NEW credentials provided by the user

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xrdazfowrpgrphgirovw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZGF6Zm93cnBncnBoZ2lyb3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjc3NDgsImV4cCI6MjA4MTY0Mzc0OH0.8Qixfr3nMn7WKmj91f2ji2NVNkCrwvmiz-uNnNBTUJw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log("--- STARTING DIAGNOSTIC ---");
    console.log(`Connecting to: ${supabaseUrl}`);

    try {
        // 1. Test RTO Table
        console.log("\n1. Testing 'RTO' Table Fetch...");
        const { data: rtoData, error: rtoError } = await supabase
            .from('RTO')
            .select('*');

        if (rtoError) {
            console.error("❌ RTO Fetch Error:", rtoError.message);
            console.error("   Details:", rtoError);
        } else {
            console.log(`✅ RTO Data Received. Count: ${rtoData.length}`);
            if (rtoData.length === 0) {
                console.warn("   ⚠️ WARNING: Table exists but is EMPTY. Did you run the INSERT script?");
            } else {
                console.log("   First 3 rows:", rtoData.slice(0, 3));
            }
        }

    } catch (err) {
        console.error("💥 CRITICAL SCRIPT ERROR:", err);
    }
    console.log("\n--- DIAGNOSTIC COMPLETE ---");
}

testConnection();
