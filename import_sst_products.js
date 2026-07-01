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
  const targetFile = files.find(f => f.includes('sst.xlsx') || f.includes('sst'));
  
  if (!targetFile) {
    console.error("Could not find the SST products Excel file.");
    return;
  }
  
  const filePath = path.join(sstDir, targetFile);
  console.log('Reading file:', filePath);
  
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = xlsx.utils.sheet_to_json(sheet);
  
  const products = [];
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    
    // Attempt to dynamically find columns (assuming similar structure to previous files)
    const getVal = (keyContains) => {
      const key = Object.keys(row).find(k => k.toLowerCase().includes(keyContains.toLowerCase()));
      return key ? row[key]?.toString().trim() : '';
    };

    const name = getVal('ชื่อสินค้า') || getVal('product') || getVal('name') || getVal('รายการ');
    if (!name) continue;

    const code = getVal('รหัส') || getVal('code');
    const priceStr = getVal('ราคา') || getVal('price');
    const unit = getVal('หน่วย') || getVal('unit');
    const barcode = getVal('บาร์โค้ด') || getVal('barcode');
    
    let price = 0;
    if (priceStr) {
      price = parseFloat(priceStr.replace(/,/g, ''));
      if (isNaN(price)) price = 0;
    }

    products.push({
      company: 'SST',
      product_code: code || `SST-P-${(i+1).toString().padStart(4, '0')}`,
      name: name,
      price: price,
      unit: unit || 'ชิ้น',
      barcode: barcode || ''
    });
  }

  console.log(`Found ${products.length} valid products to import.`);
  
  if (products.length > 0) {
    const outputPath = path.join(__dirname, 'insert_sst_products.sql');
    let sql = '-- ==========================================\n';
    sql += '-- INSERT SCRIPT FOR SST PRODUCTS\n';
    sql += '-- ==========================================\n\n';
    
    const chunkSize = 100;
    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize);
      sql += `INSERT INTO products (company, product_code, name, price, unit, barcode) VALUES\n`;
      const values = chunk.map(p => {
        return `(${escapeString(p.company)}, ${escapeString(p.product_code)}, ${escapeString(p.name)}, ${p.price}, ${escapeString(p.unit)}, ${escapeString(p.barcode)})`;
      });
      sql += values.join(',\n') + ';\n\n';
    }
    
    fs.writeFileSync(outputPath, sql);
    console.log(`Generated SQL file at: ${outputPath}`);
    
    // Also save as JSON for backup
    fs.writeFileSync(path.join(__dirname, 'public', 'sst_products_import.json'), JSON.stringify(products, null, 2));
  }
}

run();
