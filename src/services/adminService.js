import { supabaseDetections as supabase } from '../lib/supabase';

export const checkAdminCredentials = async (id, password) => {
    try {
        const { data, error } = await supabase
            .from('Admin') // User specified table name "Admin"
            .select('*')
            .eq('id', id)
            .eq('pass', password)
            .single();

        if (error) throw error;

        // If data exists, login is successful
        return { success: true, user: data };
    } catch (error) {
        console.error("Login failed:", error);
        return { success: false, error: error.message };
    }
};

export const fetchAllDetections = async () => {
    try {
        const { data, error } = await supabase
            .from('Detections')
            .select('*')
            .order('detection_id', { ascending: false }); // Newest first

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
