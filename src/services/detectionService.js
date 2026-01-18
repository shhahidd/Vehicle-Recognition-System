import { supabaseDetections as supabase } from '../lib/supabase';

export const saveDetection = async (detectionData) => {
    try {
        // 1. Get the last ID to simulate Auto-Increment (since DB col is numeric, not serial)
        const { data: lastEntries, error: fetchError } = await supabase
            .from('Detections')
            .select('detection_id')
            .order('detection_id', { ascending: false })
            .limit(1);

        let nextId = 1;
        if (lastEntries && lastEntries.length > 0) {
            nextId = Number(lastEntries[0].detection_id) + 1;
        }

        // Format ID as "001", "002" etc.
        const formattedId = String(nextId).padStart(3, '0');

        // Format Date as "Time Date" (e.g. "23:52:08 17-01-2026")
        const now = new Date();
        const timePart = now.toLocaleTimeString('en-GB', { hour12: false }); // "23:52:08"
        const datePart = now.toLocaleDateString('en-GB').replace(/\//g, '-'); // "17-01-2026"
        const customTimestamp = `${timePart} ${datePart}`;

        // 2. Insert with new Padded ID and Custom Timestamp
        const { data, error } = await supabase
            .from('Detections')
            .insert([
                {
                    detection_id: formattedId,
                    car_name: detectionData.car_name,
                    color: detectionData.color,
                    plate_number: detectionData.plate_number,
                    rto: detectionData.rto,
                    detected_at: customTimestamp // "23:52:08 17-01-2026"
                }
            ])
            .select();

        if (error) {
            throw error;
        }

        console.log(`Detection saved! ID: ${nextId}`, data);
        return { success: true, data };
    } catch (error) {
        console.error("Error saving detection:", error);
        return { success: false, error: error.message || error };
    }
};
