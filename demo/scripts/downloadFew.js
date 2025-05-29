#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

const BASE_URL = 'https://s3.amazonaws.com/yasiv_uf/out';
const ASSETS_DIR = path.join(__dirname, '..', 'public');

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
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      }
    };
    
    https.get(url, options, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      console.log(`  Content-Encoding: ${response.headers['content-encoding'] || 'none'}`);
      console.log(`  Content-Type: ${response.headers['content-type'] || 'unknown'}`);
      
      let stream = response;
      
      // Handle different compression types
      const encoding = response.headers['content-encoding'];
      if (encoding === 'gzip') {
        console.log('  Decompressing gzip...');
        stream = response.pipe(zlib.createGunzip());
      } else if (encoding === 'deflate') {
        console.log('  Decompressing deflate...');
        stream = response.pipe(zlib.createInflate());
      } else if (encoding === 'br') {
        console.log('  Decompressing brotli...');
        stream = response.pipe(zlib.createBrotliDecompress());
      }
      
      let data = '';
      stream.setEncoding('utf8');
      
      stream.on('data', (chunk) => {
        data += chunk;
      });
      
      stream.on('end', () => {
        try {
          // Validate it's valid JSON
          const parsed = JSON.parse(data);
          console.log(`  ✅ Valid JSON with ${parsed.links ? parsed.links.length : 0} links`);
          
          // Write to file
          fs.writeFileSync(filePath, data, 'utf8');
          console.log(`  💾 Saved to: ${filePath}`);
          resolve();
        } catch (error) {
          console.error(`  ❌ JSON parse error:`, error.message);
          console.error(`  First 200 chars:`, data.substring(0, 200));
          reject(error);
        }
      });
      
      stream.on('error', (err) => {
        console.error(`  ❌ Stream error:`, err);
        reject(err);
      });
    }).on('error', (err) => {
      console.error(`  ❌ Request error:`, err);
      reject(err);
    });
  });
}

async function downloadTestGraphs() {
  console.log(`📦 Downloading ${TEST_GRAPHS.length} graphs with proper browser headers...`);
  
  ensureDir(ASSETS_DIR);
  let downloaded = 0;
  let failed = 0;
  
  for (const graphName of TEST_GRAPHS) {
    try {
      const normalizedName = graphName.toLowerCase();
      const [collection, name] = normalizedName.split('/');
      
      const graphDir = path.join(ASSETS_DIR, collection, name);
      ensureDir(graphDir);
      
      const filePath = path.join(graphDir, 'index.js');
      
      console.log(`\n🔄 [${downloaded + failed + 1}/${TEST_GRAPHS.length}] ${graphName}`);
      
      const url = `${BASE_URL}/${graphName}/index.js`;
      await downloadFile(url, filePath);
      downloaded++;
      
      // Small delay to be nice to the server
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Failed to download ${graphName}:`, error.message);
      failed++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`✅ Downloaded: ${downloaded}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Assets saved to: ${ASSETS_DIR}`);
}

downloadTestGraphs().catch(console.error);