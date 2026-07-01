require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSST() {
  const { data, error } = await supabase.from('products').select('count', { count: 'exact' }).eq('company', 'SST');
  console.log('Error:', error);
  console.log('Data:', data);
  
  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('company', 'SST');
  console.log('SST Products Count:', count);
}

checkSST();
