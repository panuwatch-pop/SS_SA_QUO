require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDuplicates() {
  console.log("Fetching all customers...");
  const { data: customers, error } = await supabase.from('customers').select('id, name, created_at').order('created_at', { ascending: true });
  
  if (error) {
    console.error("Error fetching customers:", error);
    return;
  }
  
  console.log(`Found ${customers.length} total customers.`);
  
  const nameMap = new Map();
  const idsToDelete = [];
  
  for (const c of customers) {
    if (!c.name) continue;
    const name = c.name.trim();
    if (nameMap.has(name)) {
      idsToDelete.push(c.id);
    } else {
      nameMap.set(name, true);
    }
  }
  
  if (idsToDelete.length === 0) {
    console.log("No duplicate customers found.");
    return;
  }
  
  console.log(`Found ${idsToDelete.length} duplicate customers. Deleting...`);
  
  // Delete in chunks of 50 to avoid URL too long issues if there are many
  const chunkSize = 50;
  for (let i = 0; i < idsToDelete.length; i += chunkSize) {
    const chunk = idsToDelete.slice(i, i + chunkSize);
    const { error: deleteError } = await supabase.from('customers').delete().in('id', chunk);
    
    if (deleteError) {
      console.error(`Error deleting chunk ${i}:`, deleteError);
    } else {
      console.log(`Deleted chunk ${i} to ${i + chunk.length}`);
    }
  }
  
  console.log("Duplicate cleanup complete!");
}

cleanupDuplicates();
