const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const filePath = path.join(__dirname, 'Shinwa', 'Shinwa Product.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

const data = xlsx.utils.sheet_to_json(sheet);
console.log('Columns:', Object.keys(data[0] || {}));
console.log('First 2 rows:', JSON.stringify(data.slice(0, 2), null, 2));
console.log('Total rows:', data.length);
