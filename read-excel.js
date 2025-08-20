import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get directory path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Excel file
const excelFilePath = path.join(__dirname, 'attached_assets', 'item list.xlsx');

try {
  console.log(`Attempting to read Excel file from: ${excelFilePath}`);
  
  // Check if file exists
  if (!fs.existsSync(excelFilePath)) {
    console.error(`File not found: ${excelFilePath}`);
    process.exit(1);
  }
  
  // Read the Excel file
  const workbook = XLSX.readFile(excelFilePath);
  const sheetNames = workbook.SheetNames;
  
  console.log(`Found sheets: ${sheetNames.join(', ')}`);
  
  // Get the first sheet
  const firstSheetName = sheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`Found ${data.length} rows of data`);
  
  // Print the first 5 rows for verification
  console.log('First 5 rows:');
  data.slice(0, 5).forEach((row, index) => {
    console.log(`Row ${index + 1}:`, JSON.stringify(row));
  });
  
  // Print all column names
  if (data.length > 0) {
    console.log('Column names:', Object.keys(data[0]));
  }
  
} catch (error) {
  console.error('Error reading Excel file:', error);
}