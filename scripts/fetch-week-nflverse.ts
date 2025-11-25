// scripts/fetch-week-nflverse.ts
// Temporary safe placeholder to keep TypeScript & Next build happy.
// This script does NOT perform the real NFLverse fetch yet.

import fs from "fs";
import path from "path";

async function main() {
  console.log(
    "[fetch-week-nflverse] Placeholder script. No external fetch implemented."
  );

  // Create a small output to confirm the script can run
  const outDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, "fetch-week-nflverse.log.json");
  const payload = {
    ranAt: new Date().toISOString(),
    note: "Placeholder script executed successfully.",
  };

  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));

  console.log(`[fetch-week-nflverse] Wrote ${outFile}`);
}

main().catch((err) => {
  console.error("[fetch-week-nflverse] Error:", err);
  process.exit(1);
});
