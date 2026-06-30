const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

async function run() {
  const filePath = path.join(__dirname, 'Shinwa', 'Shinwa Product.xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  const rawData = xlsx.utils.sheet_to_json(sheet);
  
  const products = [];
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    
    // The keys have leading/trailing spaces
    const getVal = (keyContains) => {
      const key = Object.keys(row).find(k => k.includes(keyContains));
      return key ? row[key]?.toString().trim() : '';
    };

    const name = getVal('ชื่อสินค้า');
    if (!name) continue;

    const code = getVal('รหัสสินค้า');
    const unit = getVal('หน่วยนับ');
    const price1 = parseFloat(getVal('ราคาขาย 1')) || 0;
    const price2 = parseFloat(getVal('ราคาขาย 2')) || 0;
    const price3 = parseFloat(getVal('ราคาขาย 3')) || 0;
    
    // Use price1 if available, else 0
    let price = price1;

    const product = {
      company: 'Shinwa Anzen',
      product_code: code,
      name: name,
      unit: unit,
      price: price,
      description: '',
      image_url: '',
      category: '',
      barcode: ''
    };
    
    products.push(product);
  }

  console.log(`Found ${products.length} valid products to import.`);
  if (products.length > 0) {
    fs.writeFileSync(path.join(__dirname, 'public', 'shinwa_products_import.json'), JSON.stringify(products, null, 2));
    console.log('Saved to public/shinwa_products_import.json');
  }
}

run();
