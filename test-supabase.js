require('dotenv').config();

const supabase = require('./src/config/supabase');

async function testSupabase() {
    console.log('Testing Supabase connection...');

    const { data, error } = await supabase
        .from('challenges')
        .select('challenge_id')
        .limit(1);

    if (error) {
        console.error('Supabase connection test failed:');
        console.error(error);
        process.exit(1);
    }

    console.log('Supabase connection successful.');
    console.log('Returned rows:', data.length);
}

testSupabase();