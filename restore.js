const fs = require('fs');
const path = 'C:/Users/Acer Nitro/.gemini/antigravity/brain/93a5f9eb-980f-4db2-b94c-da11f81067b5/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(path, 'utf8').split('\n');
for (let i = lines.length - 1; i >= 0; i--) {
  if (!lines[i]) continue;
  try {
    const log = JSON.parse(lines[i]);
    if (log.tool_calls) {
       for (const call of log.tool_calls) {
          if (call.response && call.response.output && call.response.output.includes('Showing lines 1 to 519') && call.response.output.includes('page.tsx')) {
             const output = call.response.output;
             const startIdx = output.indexOf('1: "use client";');
             const endIdx = output.indexOf('\nThe above content shows the entire');
             if (startIdx !== -1 && endIdx !== -1) {
                const linesBlock = output.substring(startIdx, endIdx);
                const cleaned = linesBlock.replace(/^[0-9]+:\s/gm, '');
                fs.writeFileSync('app/(public)/projects/page.tsx', cleaned);
                console.log('Restored from transcript!');
                process.exit(0);
             }
          }
       }
    }
  } catch (e) {
  }
}
console.log('Not found');
