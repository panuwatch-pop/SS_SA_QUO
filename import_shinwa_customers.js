const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function parsePhoneFax(str) {
  if (!str) return { phone: '', fax: '' };
  str = str.trim();
  const telMatch = str.match(/Tel\.?\s*(.*?)(?=\s*Fax|\s*$)/i);
  const faxMatch = str.match(/Fax\.?\s*(.*)$/i);
  
  return {
    phone: telMatch ? telMatch[1].trim() : str,
    fax: faxMatch ? faxMatch[1].trim() : ''
  };
}

function parseContactEmail(str) {
  if (!str) return { contact_name: '', email: '' };
  str = str.trim();
  const contactMatch = str.match(/นามผู้ติดต่อ\s*:\s*(.*?)(?=\s*E-mail:|$)/i);
  const emailMatch = str.match(/E-mail:\s*(.*)$/i);
  
  return {
    contact_name: contactMatch ? contactMatch[1].trim() : '',
    email: emailMatch ? emailMatch[1].trim() : ''
  };
}

async function run() {
  const filePath = path.join(__dirname, 'Shinwa', 'Shinwa Customer Name.xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  const rawData = xlsx.utils.sheet_to_json(sheet);
  
  const customers = [];
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    
    // The keys have leading/trailing spaces
    const getVal = (keyContains) => {
      const key = Object.keys(row).find(k => k.includes(keyContains));
      return key ? row[key]?.toString().trim() : '';
    };

    const name = getVal('ชื่อลูกค้า');
    if (!name) continue;

    const code = getVal('รหัสลูกค้า');
    const address = getVal('ที่อยู่');
    const phoneFaxStr = getVal('เบอร์โทรศัพท์/แฟกซ์');
    const contactEmailStr = getVal('ข้อมูลติดต่อ/อีเมล');

    const { phone } = parsePhoneFax(phoneFaxStr);
    const { contact_name, email } = parseContactEmail(contactEmailStr);

    const customer = {
      company: 'Shinwa Anzen',
      customer_code: code || `SW-${i.toString().padStart(4, '0')}`,
      name: name,
      address: address,
      tax_id: '',
      contact_name: contact_name,
      email: email,
      phone: phone,
      contact_phone: '',
      contact_email: email,
      credit_terms: ''
    };
    
    customers.push(customer);
  }

  console.log(`Found ${customers.length} valid customers to import.`);
  if (customers.length > 0) {
    fs.writeFileSync(path.join(__dirname, 'public', 'shinwa_customers_import.json'), JSON.stringify(customers, null, 2));
    console.log('Saved to public/shinwa_customers_import.json');
  }
}

run();
