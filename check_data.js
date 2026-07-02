require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkData() {
  const { data, error } = await supabase
    .from('quotation_items')
    .select('id, description')
    .not('description', 'is', null);

  console.log('Items with description:', data);
  
  const { data: allData } = await supabase
    .from('quotation_items')
    .select('id, description')
    .limit(5);
    
  console.log('Sample items:', allData);
}

checkData();
