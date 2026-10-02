const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
        'Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env.'
    );
}

const supabase = createClient(
    supabaseUrl,
    supabasePublishableKey,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

module.exports = supabase;