import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchAllProducts(company?: string) {
  let allProducts: any[] = [];
  let from = 0;
  const limit = 1000;
  
  while (true) {
    let query = supabase.from('products').select('*').order('name', { ascending: true }).range(from, from + limit - 1);
    
    if (company) {
      query = query.eq('company', company);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching products with pagination:', error);
      break;
    }
    
    if (data && data.length > 0) {
      allProducts = [...allProducts, ...data];
    }
    
    if (!data || data.length < limit) {
      break;
    }
    
    from += limit;
  }
  
  return { data: allProducts, error: null };
}
