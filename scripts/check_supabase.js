import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: weeks, error: err } = await supabase
    .from('performance_weeks')
    .select('*')
    .order('created_at', { ascending: true });
  if (err) {
    console.error("Error fetching weeks:", err.message);
  } else {
    console.log("CURRENT WEEKS IN DB:", JSON.stringify(weeks, null, 2));
  }

  const { data: configs, error: errConfig } = await supabase
    .from('config')
    .select('*');
  if (errConfig) {
    console.error("Error fetching config:", errConfig.message);
  } else {
    console.log("CURRENT CONFIGS IN DB:", configs);
  }
}
run();
