const fs = require('fs');
fs.appendFileSync('.env.local', '\n# PSGC Locations API\nPSGC_API_URL=https://psgc.bafe.online/api/v1/all\n');
console.log('Appended PSGC_API_URL to .env.local');
