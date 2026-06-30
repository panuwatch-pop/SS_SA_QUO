
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase Connection...');
  const { data, error } = await supabase.from('customers').select('*').limit(1);
  
  if (error) {
    console.error('Error connecting to Supabase or fetching table:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Connection successful! The customers table exists and is accessible.');
    console.log('Data:', data);
  }
}

testConnection();
