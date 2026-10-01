import { syncPsgcLocations } from "./lib/locations/sync";

async function main() {
  console.log("Starting PSGC Locations sync...");
  
  const result = await syncPsgcLocations({
    triggeredBy: "cli",
    onProgress: (current, total, status) => {
      console.log(`[${current}/${total}] ${status}`);
    }
  });

  console.log("Sync complete!", result);
  process.exit(result.success ? 0 : 1);
}

main().catch(error => {
  console.error("Unhandled sync error:", error);
  process.exit(1);
});
