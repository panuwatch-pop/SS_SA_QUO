require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
  const { data, error } = await supabase
    .from('quotation_items')
    .select('description')
    .limit(1);

  if (error) {
    console.error('Error fetching description column:', error.message);
  } else {
    console.log('Successfully selected description column! Data:', data);
  }
}

checkSchema();
