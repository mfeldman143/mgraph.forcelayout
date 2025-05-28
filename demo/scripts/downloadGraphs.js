#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Import the graph list (you'll need to adjust this path)
const getAvailableGraphs = () => {
  return [
    'HB/blckhole',
    'Bai/rw5151',
    'HB/bcsstm13',
    'HB/lshp1882',
    'HB/plat1919',
    'HB/bcsstk26',
    'Bai/dw256A',
    'Bai/tols2000',
    'Bai/dw1024',
    'Bai/rdb2048',
    'Pajek/CSphd',
    'GHS_indef/laser',
    'Bai/bfwa398',
    'Bai/bfwa62',
    'Bai/bfwb398',
    'Bai/bfwb62',
    'Bai/bfwb782',
    'Bai/bwm200',
    'Bai/cdde1',
    'Bai/cdde2',
    'Bai/cdde3',
    'Bai/cdde4',
    'Bai/cdde5',
    'Bai/cdde6',
    'Bai/ck104',
    'Bai/ck400',
    'Bai/ck656',
    'Bai/dw256B',
    'Bai/dwa512',
    'Bai/dwb512',
    'Bai/dwg961a',
    'Bai/lop163',
    'Bai/mhdb416',
    'Bai/odepa400',
    'Bai/olm100',
    'Bai/olm1000',
    'Bai/olm500',
    'Bai/pde225',
    'Bai/pde900',
    'Bai/qh1484',
    'Bai/qh768',
    'Bai/qh882',
    'Bai/rdb1250',
    'Bai/rdb1250l',
    'Bai/rdb200',
    'Bai/rdb200l',
    'Bai/rdb450',
    'Bai/rdb450l',
    'Bai/rdb800l',
    'Bai/rdb968',
    'Bai/rw136',
    'Bai/rw496',
    'Bai/tols1090',
    'Bai/tols340',
    'Bai/tols90',
    'Bai/tub100',
    'Bai/tub1000',
    // Add more from your original list as needed...
    'HB/1138_bus',
    'HB/494_bus',
    'HB/662_bus',
    'HB/685_bus',
    'HB/abb313',
    'HB/arc130',
    'HB/ash219',
    'HB/ash292',
    'HB/ash331',
    'HB/ash608',
    'HB/ash85',
    'HB/ash958'
    // Truncated for brevity - add all the ones you want
  ];
};

const BASE_URL = 'https://s3.amazonaws.com/yasiv_uf/out';
const ASSETS_DIR = path.join(__dirname, '..', 'public', 'assets');

// Create directory recursively
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Download file using https
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
        fs.unlink(filePath, () => {}); // Delete partial file
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Sleep function to avoid overwhelming the server
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadGraphs() {
  const graphs = getAvailableGraphs();
  
  // Filter out local-only graphs
  const remoteGraphs = graphs.filter(name => 
    name !== 'Miserables' && name !== 'Binary'
  );
  
  console.log(`📦 Downloading ${remoteGraphs.length} graphs...`);
  
  // Ensure assets directory exists
  ensureDir(ASSETS_DIR);
  
  let downloaded = 0;
  let failed = 0;
  
  for (const graphName of remoteGraphs) {
    try {
      // Convert "HB/blckhole" to "hb/blckhole"
      const normalizedName = graphName.toLowerCase();
      const [collection, name] = normalizedName.split('/');
      
      // Create directory structure: public/assets/hb/blckhole/
      const graphDir = path.join(ASSETS_DIR, collection, name);
      ensureDir(graphDir);
      
      // File path: public/assets/hb/blckhole/index.js
      const filePath = path.join(graphDir, 'index.js');
      
      // Skip if file already exists
      if (fs.existsSync(filePath)) {
        console.log(`⏭️  Skipping (exists): ${graphName}`);
        continue;
      }
      
      // Download URL: https://s3.amazonaws.com/yasiv_uf/out/HB/blckhole/index.js
      const url = `${BASE_URL}/${graphName}/index.js`;
      
      await downloadFile(url, filePath);
      downloaded++;
      
      // Be nice to the server
      await sleep(100);
      
    } catch (error) {
      console.error(`❌ Failed to download ${graphName}:`, error.message);
      failed++;
    }
  }
  
  console.log('\n📊 Download Summary:');
  console.log(`✅ Downloaded: ${downloaded}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Assets directory: ${ASSETS_DIR}`);
}

// Run the script
if (require.main === module) {
  downloadGraphs().catch(console.error);
}