#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

const BASE_URL = 'https://s3.amazonaws.com/yasiv_uf/out';
const ASSETS_DIR = path.join(__dirname, '..', 'public');

// All available graphs from the original list
const ALL_GRAPHS = [
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
  'HB/ash958',
  'HB/bcspwr01',
  'HB/bcspwr02',
  'HB/bcspwr03',
  'HB/bcspwr04',
  'HB/bcspwr05',
  'HB/bcspwr06',
  'HB/bcspwr07',
  'HB/bcspwr08',
  'HB/bcspwr09',
  'HB/bcsstk01',
  'HB/bcsstk02',
  'HB/bcsstk03',
  'HB/bcsstk04',
  'HB/bcsstk05',
  'HB/bcsstk06',
  'HB/bcsstk07',
  'HB/bcsstk19',
  'HB/bcsstk20',
  'HB/bcsstk22',
  'HB/bcsstm01',
  'HB/bcsstm02',
  'HB/bcsstm03',
  'HB/bcsstm04',
  'HB/bcsstm05',
  'HB/bcsstm06',
  'HB/bcsstm07',
  'HB/bcsstm08',
  'HB/bcsstm09',
  'HB/bcsstm11',
  'HB/bcsstm19',
  'HB/bcsstm20',
  'HB/bcsstm21',
  'HB/bcsstm22',
  'HB/bcsstm23',
  'HB/bcsstm24',
  'HB/bcsstm26',
  'Pajek/Cities',
  'Pajek/divorce',
  'Pajek/EPA',
  'Pajek/football',
  'Pajek/Roget',
  'Pajek/USAir97',
  'Pajek/USpowerGrid',
  'Pajek/yeast',
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
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
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
      
      let stream = response;
      
      // Handle compression
      const encoding = response.headers['content-encoding'];
      if (encoding === 'gzip') {
        stream = response.pipe(zlib.createGunzip());
      } else if (encoding === 'deflate') {
        stream = response.pipe(zlib.createInflate());
      } else if (encoding === 'br') {
        stream = response.pipe(zlib.createBrotliDecompress());
      }
      
      let data = '';
      stream.setEncoding('utf8');
      
      stream.on('data', (chunk) => {
        data += chunk;
      });
      
      stream.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          fs.writeFileSync(filePath, data, 'utf8');
          resolve({
            success: true,
            linkCount: parsed.links ? parsed.links.length : 0,
            nodeCount: parsed.links ? new Set(parsed.links).size : 0
          });
        } catch (error) {
          reject(new Error(`JSON parse error: ${error.message}`));
        }
      });
      
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadAllGraphs() {
  console.log(`📦 Starting download of ${ALL_GRAPHS.length} graphs...`);
  console.log(`📁 Saving to: ${ASSETS_DIR}`);
  
  ensureDir(ASSETS_DIR);
  
  let downloaded = 0;
  let failed = 0;
  let totalNodes = 0;
  let totalLinks = 0;
  
  const startTime = Date.now();
  
  for (let i = 0; i < ALL_GRAPHS.length; i++) {
    const graphName = ALL_GRAPHS[i];
    
    try {
      const normalizedName = graphName.toLowerCase();
      const [collection, name] = normalizedName.split('/');
      
      const graphDir = path.join(ASSETS_DIR, collection, name);
      ensureDir(graphDir);
      
      const filePath = path.join(graphDir, 'index.js');
      
      // Skip if already exists
      if (fs.existsSync(filePath)) {
        console.log(`⏭️  [${i+1}/${ALL_GRAPHS.length}] Skipping ${graphName} (exists)`);
        downloaded++;
        continue;
      }
      
      console.log(`🔄 [${i+1}/${ALL_GRAPHS.length}] Downloading ${graphName}...`);
      
      const url = `${BASE_URL}/${graphName}/index.js`;
      const result = await downloadFile(url, filePath);
      
      console.log(`✅ [${i+1}/${ALL_GRAPHS.length}] ${graphName} - ${result.nodeCount} nodes, ${result.linkCount} links`);
      
      downloaded++;
      totalNodes += result.nodeCount;
      totalLinks += result.linkCount;
      
      // Small delay to be nice to the server
      if (i < ALL_GRAPHS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      console.error(`❌ [${i+1}/${ALL_GRAPHS.length}] Failed ${graphName}: ${error.message}`);
      failed++;
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  
  console.log(`\n📊 Download Summary:`);
  console.log(`✅ Downloaded: ${downloaded}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total nodes: ${totalNodes.toLocaleString()}`);
  console.log(`🔗 Total links: ${totalLinks.toLocaleString()}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📁 Assets saved to: ${ASSETS_DIR}`);
  
  if (downloaded > 0) {
    console.log(`\n🎉 Success! You now have ${downloaded} graph datasets ready for visualization!`);
  }
}

downloadAllGraphs().catch(console.error);