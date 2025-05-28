#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://s3.amazonaws.com/yasiv_uf/out';
const ASSETS_DIR = path.join(__dirname, '..', 'public', 'assets');

// Test with just a few graphs first
const TEST_GRAPHS = [
  'HB/blckhole',
  'Bai/rw5151',
  'HB/bcsstm13',
  'Pajek/CSphd',
  'HB/ash219'
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);
    
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${filePath}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function downloadTestGraphs() {
  console.log(`📦 Downloading ${TEST_GRAPHS.length} test graphs...`);
  
  ensureDir(ASSETS_DIR);
  
  for (const graphName of TEST_GRAPHS) {
    try {
      const normalizedName = graphName.toLowerCase();
      const [collection, name] = normalizedName.split('/');
      
      const graphDir = path.join(ASSETS_DIR, collection, name);
      ensureDir(graphDir);
      
      const filePath = path.join(graphDir, 'index.js');
      
      if (fs.existsSync(filePath)) {
        console.log(`⏭️  Skipping (exists): ${graphName}`);
        continue;
      }
      
      const url = `${BASE_URL}/${graphName}/index.js`;
      await downloadFile(url, filePath);
      
    } catch (error) {
      console.error(`❌ Failed to download ${graphName}:`, error.message);
    }
  }
  
  console.log('\n✅ Test download complete!');
}

downloadTestGraphs().catch(console.error);