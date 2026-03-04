import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('Cleaning up members table...');
    // We can't easily do WHERE registration_id = '' if it's a UUID column
    // But we can fetch all and update.
    const { data: members, error } = await supabase.from('members').select('id, registration_id');
    if (error) {
        console.error('Error fetching members:', error);
        return;
    }

    let updated = 0;
    for (const m of members) {
        if (m.registration_id === '') {
            console.log(`Fixing member ${m.id}...`);
            const { error: upErr } = await supabase.from('members').update({ registration_id: null }).eq('id', m.id);
            if (upErr) console.error(`Error updating member ${m.id}:`, upErr);
            else updated++;
        }
    }
    console.log(`Cleanup complete. ${updated} members fixed.`);
}

cleanup();
