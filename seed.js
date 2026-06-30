const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const customers = [
  {
    name: "บริษัท สยามอุตสาหกรรม จำกัด",
    email: "contact@siamindustry.co.th",
    phone: "02-111-2222",
    address: "123 หมู่ 4 ถ.บางนา-ตราด กม.10 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540",
    tax_id: "0105512345678",
    contact_name: "สมชาย ใจดี",
    contact_phone: "081-234-5678",
    contact_email: "somchai@siamindustry.co.th",
    contact_line: "somchai_siam",
    credit_terms: "30 วัน"
  },
  {
    name: "ห้างหุ้นส่วนจำกัด ไทยเจริญการช่าง",
    email: "info@thaicharoen.com",
    phone: "02-333-4444",
    address: "456 ซอยสุขุมวิท 71 แขวงพระโขนงเหนือ เขตวัฒนา กรุงเทพฯ 10110",
    tax_id: "0103511112223",
    contact_name: "สมหญิง รักงาน",
    contact_phone: "089-876-5432",
    contact_email: "somying@thaicharoen.com",
    contact_line: "somying_tc",
    credit_terms: "เงินสด"
  },
  {
    name: "บริษัท ก่อสร้างมั่นคง จำกัด (มหาชน)",
    email: "purchasing@munkong.co.th",
    phone: "02-555-6666",
    address: "789 ถ.รัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400",
    tax_id: "0107519998887",
    contact_name: "วิชัย สุดยอด",
    contact_phone: "081-111-2222",
    contact_email: "wichai.s@munkong.co.th",
    contact_line: "wichai_mk",
    credit_terms: "60 วัน"
  },
  {
    name: "โรงงานประกอบรถยนต์ เอเซีย",
    email: "supplier@asia-auto.co.th",
    phone: "038-123-456",
    address: "12 นิคมอุตสาหกรรมอมตะนคร ต.คลองตำหรุ อ.เมือง จ.ชลบุรี 20000",
    tax_id: "0205517776665",
    contact_name: "อำนาจ คุมทรัพย์",
    contact_phone: "086-555-4444",
    contact_email: "amnat@asia-auto.co.th",
    contact_line: "amnat.auto",
    credit_terms: "90 วัน"
  },
  {
    name: "บริษัท รักษาความปลอดภัย ดีเลิศ จำกัด",
    email: "admin@d-lert-security.com",
    phone: "02-999-8888",
    address: "99/9 ถ.ลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900",
    tax_id: "0105514443332",
    contact_name: "ปราณี สุขใจ",
    contact_phone: "088-777-6666",
    contact_email: "pranee@d-lert-security.com",
    contact_line: "pranee_d",
    credit_terms: "30 วัน"
  }
];

const products = [
  { name: "หมวกนิรภัย (Safety Helmet) รุ่น V-Gard", description: "หมวกเซฟตี้มาตรฐาน มอก. วัสดุ ABS ทนทานสูง สีขาว", price: 350.00 },
  { name: "รองเท้านิรภัย (Safety Shoes) หัวเหล็ก", description: "รองเท้าเซฟตี้หุ้มข้อ หนังแท้ พื้น PU กันลื่น กันน้ำมัน", price: 850.00 },
  { name: "แว่นตานิรภัย (Safety Glasses)", description: "แว่นตากันสะเก็ด เลนส์ใส เคลือบสารกันฝ้า กันรอยขีดข่วน", price: 120.00 },
  { name: "ถุงมือกันบาด (Cut Resistant Gloves) ระดับ 5", description: "ถุงมือทอเคลือบ PU หยิบจับกระชับ ป้องกันการบาดเฉือน", price: 250.00 },
  { name: "เข็มขัดพยุงหลัง (Back Support)", description: "เข็มขัดรัดหลังตีนตุ๊กแก 2 ชั้น ระบายอากาศได้ดี", price: 450.00 },
  { name: "เสื้อสะท้อนแสง (Reflective Vest)", description: "เสื้อกั๊กตาข่ายสีเขียวสะท้อนแสง แถบสะท้อนแสง 3M", price: 180.00 },
  { name: "ที่ครอบหูลดเสียง (Ear Muffs)", description: "ที่ครอบหูลดเสียง NRR 25dB น้ำหนักเบา ปรับขนาดได้", price: 320.00 },
  { name: "หน้ากากกันฝุ่น PM2.5 / N95", description: "หน้ากากกรองอนุภาค มีวาล์วระบายอากาศ แพ็ค 10 ชิ้น", price: 350.00 },
  { name: "ชุดป้องกันสารเคมี (Coverall Suit)", description: "ชุด PPE ป้องกันฝุ่นละอองและสารเคมีเหลวกระเด็น", price: 280.00 },
  { name: "อุปกรณ์ดูดซับของเหลว (Spill Kit) ขนาด 20 ลิตร", description: "ชุดดูดซับสารเคมีและน้ำมันฉุกเฉิน เคลื่อนย้ายสะดวก", price: 1500.00 }
];

async function seedData() {
  console.log("Seeding customers...");
  const { error: customerError } = await supabase.from('customers').insert(customers);
  if (customerError) {
    console.error("Error inserting customers:", customerError);
    return;
  }
  console.log("Successfully inserted 5 customers!");

  console.log("Seeding products...");
  const { error: productError } = await supabase.from('products').insert(products);
  if (productError) {
    console.error("Error inserting products:", productError);
    return;
  }
  console.log("Successfully inserted 10 products!");
}

seedData();
