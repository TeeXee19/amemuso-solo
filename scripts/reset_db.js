import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function resetData() {
    console.log('Connecting to Supabase to clear registrations...');

    // Delete all registrations
    const { error } = await supabase
        .from('registrations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

    if (error) {
        console.error('Error clearing data:', error.message);
    } else {
        console.log('Successfully deleted all registrations. Database is clean!');
    }
}

resetData();
