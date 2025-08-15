
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create a zip file with all code
async function createCodeZip() {
  const output = fs.createWriteStream('gokul-wholesale-codebase.zip');
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  // Listen for all archive data to be written
  output.on('close', function() {
    console.log('✅ ZIP file created successfully!');
    console.log(`📦 Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    console.log('📁 File: gokul-wholesale-codebase.zip');
  });

  // Good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      console.warn('Warning:', err);
    } else {
      throw err;
    }
  });

  // Good practice to catch this error explicitly
  archive.on('error', function(err) {
    throw err;
  });

  // Pipe archive data to the file
  archive.pipe(output);

  // Exclude patterns - files/folders to skip
  const excludePatterns = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.cache',
    '.temp',
    'temp',
    '*.log',
    '.DS_Store',
    'Thumbs.db',
    'gokul-wholesale-codebase.zip', // Don't include the zip file itself
    '.cleanup-backup',
    'exports/*',
    'backups/*'
  ];

  // Function to check if path should be excluded
  function shouldExclude(filePath) {
    return excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        return filePath.includes(pattern.replace('*', ''));
      }
      return filePath.includes(pattern);
    });
  }

  // Add source code directories and files
  const includePaths = [
    'client',
    'server', 
    'shared',
    'migrations',
    'scripts',
    'public',
    'package.json',
    'package-lock.json',
    'drizzle.config.ts',
    'tailwind.config.ts',
    'postcss.config.js',
    'components.json',
    '.replit',
    'replit.md',
    '*.md',
    '*.txt',
    '*.sql'
  ];

  console.log('📦 Creating zip file...');
  console.log('📁 Including core source code files...');

  // Add each path
  for (const includePath of includePaths) {
    if (includePath.includes('*')) {
      // Handle wildcard patterns
      const files = fs.readdirSync('.').filter(file => 
        file.endsWith(includePath.replace('*', '')) && 
        !shouldExclude(file)
      );
      
      for (const file of files) {
        if (fs.statSync(file).isFile()) {
          archive.file(file, { name: file });
          console.log(`✅ Added: ${file}`);
        }
      }
    } else if (fs.existsSync(includePath)) {
      const stat = fs.statSync(includePath);
      
      if (stat.isDirectory()) {
        // Add directory recursively, excluding unwanted files
        archive.directory(includePath, includePath, (entry) => {
          return !shouldExclude(entry.name);
        });
        console.log(`✅ Added directory: ${includePath}/`);
      } else {
        // Add single file
        archive.file(includePath, { name: includePath });
        console.log(`✅ Added file: ${includePath}`);
      }
    }
  }

  // Add essential documentation files
  const docFiles = [
    'DEPLOYMENT_FIX_SUMMARY.md',
    'SMS_CONSENT_COMPLIANCE_REPORT.md',
    'MULTI_LANGUAGE_NOTIFICATION_SYSTEM.md',
    'COMPREHENSIVE-AUDIT-SUMMARY-2025.md'
  ];

  for (const docFile of docFiles) {
    if (fs.existsSync(docFile)) {
      archive.file(docFile, { name: docFile });
      console.log(`✅ Added documentation: ${docFile}`);
    }
  }

  // Finalize the archive
  await archive.finalize();
}

// Run the zip creation
createCodeZip().catch(console.error);
