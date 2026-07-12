import { config } from "dotenv";
config({ path: ".env.local" });
import { syncAbemisProjects } from "./lib/abemis/sync";

async function main() {
  console.log("Starting full sync...");
  try {
    const result = await syncAbemisProjects("manual", (processed, total, msg) => {
      console.log(`[${processed}/${total}] ${msg}`);
    });
    console.log("Sync complete!", result);
  } catch (error) {
    console.error("Sync failed:", error);
  }
  process.exit(0);
}

main();
