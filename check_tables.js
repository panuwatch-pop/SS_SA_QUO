require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTables() {
  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  // Try querying products
  const { data: pData, error: pError } = await supabase.from('products').select('*').limit(1);
  console.log('Products Error:', pError);
  
  // Try querying customers
  const { data: cData, error: cError } = await supabase.from('customers').select('*').limit(1);
  console.log('Customers Error:', cError);
}

checkTables();
