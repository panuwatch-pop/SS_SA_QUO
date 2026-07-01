require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Create a client with anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function attemptUpsert() {
  const testProduct = {
    company: 'SST',
    product_code: 'TEST-123',
    name: 'Test Product',
    price: 100,
    unit: 'pcs',
    barcode: ''
  };
  
  console.log("Attempting upsert with anon key...");
  const { data, error } = await supabase.from('products').upsert([testProduct]).select();
  console.log("Upsert Error:", error);
  console.log("Upsert Data:", data);
}

attemptUpsert();
