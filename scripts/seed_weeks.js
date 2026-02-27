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

const ROSTER_SCHEDULE = [
    { date: '8th March', slots: [41, 43, 45, 47] },
    { date: '15th March', slots: [1, 3, 5, 7] },
    { date: '22nd March', slots: [10, 12, 14, 16] },
    { date: '29th March', slots: [34, 36, 38, 40] },
    { date: '12th April', slots: [58, 60, 62, 64] },
    { date: '19th April', slots: [42, 44, 46, 48] },
    { date: '26th April', slots: [25, 27, 29, 31] },
    { date: '3rd May', slots: [26, 28, 30, 32] },
    { date: '10th May', slots: [33, 35, 37, 39] },
    { date: '17th May', slots: [57, 59, 61, 63] },
    { date: '24th May', slots: [2, 4, 6, 8] },
    { date: '31st May', slots: [18, 20, 22, 24] },
    { date: '7th June', slots: [49, 51, 53, 55] },
    { date: '14th June', slots: [50, 52, 54, 56] },
    { date: '21st June', slots: [9, 11, 13, 15] },
    { date: '28th June', slots: [17, 19, 21, 23] }
];

async function seedWeeks() {
    console.log('Seeding performance_weeks...');

    for (const week of ROSTER_SCHEDULE) {
        // Check if date exists
        const { data: existing } = await supabase
            .from('performance_weeks')
            .select('id')
            .eq('date', week.date)
            .maybeSingle();

        if (existing) {
            console.log(`Skipping ${week.date} - already exists.`);
            continue;
        }

        const { error } = await supabase
            .from('performance_weeks')
            .insert([
                {
                    date: week.date,
                    slot_ids: week.slots,
                    is_test: false
                }
            ]);

        if (error) {
            console.error(`Error seeding ${week.date}:`, error.message);
        } else {
            console.log(`Successfully seeded ${week.date}`);
        }
    }
    console.log('Seeding complete!');
}

seedWeeks();
