import { supabaseRTO as supabase } from '../lib/supabase';

export const fetchRTOData = async (retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const { data, error } = await supabase
                .from('RTO')
                .select('code, state, district');

            if (error) throw error;

            const rtoStates = {};
            const rtoDistricts = {};

            data.forEach(item => {
                if (item.code && item.district) {
                    rtoDistricts[item.code] = item.district;
                }
                if (item.code && item.code.length >= 2 && item.state) {
                    const stateCode = item.code.substring(0, 2);
                    rtoStates[stateCode] = item.state;
                }
            });

            return { rtoStates, rtoDistricts };
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed:`, error.message);
            // If it's the last retry, return the error
            if (i === retries - 1) {
                const friendlyMessage = error.name === 'AbortError'
                    ? "Connection Interrupted (Network)"
                    : error.message;
                return { rtoStates: {}, rtoDistricts: {}, error: friendlyMessage };
            }
            // Wait before retrying (backoff)
            await new Promise(res => setTimeout(res, delay * (i + 1)));
        }
    }
};
