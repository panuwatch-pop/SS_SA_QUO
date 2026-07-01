const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function escapeString(str) {
  if (str === null || str === undefined || str === '') return "''";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

async function run() {
  const sstDir = path.join(__dirname, 'SST');
  const files = fs.readdirSync(sstDir);
  const targetFile = files.find(f => f.includes('contact') || f.includes('contact.xlsx'));
  
  if (!targetFile) {
    console.error("Could not find the SST customers Excel file.");
    return;
  }
  
  const filePath = path.join(sstDir, targetFile);
  console.log('Reading file:', filePath);
  
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = xlsx.utils.sheet_to_json(sheet);
  
  const customers = [];
  let index = 1;
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    
    const getVal = (keyContains) => {
      const key = Object.keys(row).find(k => k.toLowerCase().includes(keyContains.toLowerCase()));
      return key ? row[key]?.toString().trim() : '';
    };

    // Columns likely in customer file: Name, Code, Address, Phone, Tax ID, etc.
    const name = getVal('ชื่อ') || getVal('name') || getVal('company');
    if (!name) continue;

    const code = getVal('รหัส') || getVal('code');
    const email = getVal('อีเมล') || getVal('email');
    const phone = getVal('เบอร์โทร') || getVal('phone') || getVal('โทรศัพท์') || getVal('tel');
    const address = getVal('ที่อยู่') || getVal('address');
    const tax_id = getVal('เลขประจำตัวผู้เสียภาษี') || getVal('tax') || getVal('เลขที่');
    const contact_name = getVal('ผู้ติดต่อ') || getVal('contact');
    
    customers.push({
      company: 'SST',
      customer_code: code || `SST-C-${index.toString().padStart(4, '0')}`,
      name: name,
      email: email || '',
      phone: phone || '',
      address: address || '',
      tax_id: tax_id || '',
      contact_name: contact_name || '',
      contact_phone: '',
      contact_email: '',
      contact_line: '',
      credit_terms: '30 วัน'
    });
    index++;
  }

  console.log(`Found ${customers.length} valid customers to import.`);
  
  if (customers.length > 0) {
    const outputPath = path.join(__dirname, 'insert_sst_customers.sql');
    let sql = '-- ==========================================\n';
    sql += '-- INSERT SCRIPT FOR SST CUSTOMERS\n';
    sql += '-- ==========================================\n\n';
    
    const chunkSize = 50;
    for (let i = 0; i < customers.length; i += chunkSize) {
      const chunk = customers.slice(i, i + chunkSize);
      sql += `INSERT INTO public.customers (company, customer_code, name, email, phone, address, tax_id, contact_name, credit_terms) VALUES\n`;
      const values = chunk.map(c => {
        return `(${escapeString(c.company)}, ${escapeString(c.customer_code)}, ${escapeString(c.name)}, ${escapeString(c.email)}, ${escapeString(c.phone)}, ${escapeString(c.address)}, ${escapeString(c.tax_id)}, ${escapeString(c.contact_name)}, ${escapeString(c.credit_terms)})`;
      });
      sql += values.join(',\n') + ';\n\n';
    }
    
    fs.writeFileSync(outputPath, sql);
    console.log(`Generated SQL file at: ${outputPath}`);
    
    // Also save as JSON for backup/web import
    fs.writeFileSync(path.join(__dirname, 'public', 'sst_customers_import.json'), JSON.stringify(customers, null, 2));
  }
}

run();
