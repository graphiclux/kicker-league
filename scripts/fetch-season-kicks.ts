/* Usage:
   npx tsx scripts/fetch-season-kicks.ts --season 2025 --domain https://kicker-league.vercel.app
   (For local: --domain http://localhost:3000)
*/
import { parse } from "csv-parse";
import { createGunzip } from "zlib";
import { Readable } from "stream";
import fs from "fs";

type Row = {
  season: string; week: string; season_type: string;
  posteam: string; play_type: string;
  field_goal_result: string | null;
  extra_point_result: string | null;
  kick_distance: string | null;
  game_id: string;
};

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const season = Number(arg("season", "2025"));
const domain = (arg("domain", "http://localhost:3000") || "").replace(/\/$/, "");

// Where we fetch the 2025 pbp (try releases first, then legacy repo)
const sources = [
  `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_${season}.csv.gz`,
  `https://raw.githubusercontent.com/nflverse/nflfastR-data/master/data/play_by_play_${season}.csv.gz`,
];

async function fetchStream(url: string) {
  const res = await fetch(url, { redirect: "follow" as RequestRedirect });
  if (!res.ok || !res.body) throw new Error(`Fetch failed ${res.status} ${url}`);
  return Readable.fromWeb(res.body as any);
}

(async () => {
  let stream: Readable | null = null;
  let chosen = "";
  for (const url of sources) {
    try {
      console.log("Trying", url);
      stream = await fetchStream(url);
      chosen = url;
      break;
    } catch (_e) { /* try next source */ }
  }
  if (!stream) throw new Error("Could not fetch season play-by-play CSV.");

  console.log("Using", chosen);

  const gunzip = createGunzip();
  const parser = parse({ columns: true });

  // week -> plays[]
  const byWeek = new Map<number, Array<{
    gameId: string;
    possession: string;
    playType: "field_goal" | "extra_point";
    result: "made" | "missed";
    distance?: number | null;
    blocked?: boolean;
  }>>();

  let total = 0, kept = 0;

  const csvStream = stream.pipe(gunzip).pipe(parser);
  for await (const rec of csvStream as AsyncIterable<Row>) {
    total++;
    if (!rec) continue;
    if (String(rec.season) !== String(season)) continue;
    if ((rec.season_type ?? "REG") !== "REG") continue; // regular season only

    const week = Number(rec.week);
    const ptype = rec.play_type;
    if (ptype !== "field_goal" && ptype !== "extra_point") continue;

    const gameId = rec.game_id;
    const possession = (rec.posteam || "").toUpperCase();

    if (ptype === "field_goal") {
      const r = (rec.field_goal_result || "").toLowerCase();
      const distance = rec.kick_distance && rec.kick_distance !== "NA" ? Number(rec.kick_distance) : null;
      const blocked = r === "blocked";
      const result: "made" | "missed" = r === "made" ? "made" : "missed";
      const arr = byWeek.get(week) ?? []; byWeek.set(week, arr);
      arr.push({ gameId, possession, playType: "field_goal", result, distance, blocked });
      kept++;
    } else {
      const r = (rec.extra_point_result || "").toLowerCase();
      const blocked = r === "blocked";
      const result: "made" | "missed" = r === "good" ? "made" : "missed";
      const arr = byWeek.get(week) ?? []; byWeek.set(week, arr);
      arr.push({ gameId, possession, playType: "extra_point", result, distance: null, blocked });
      kept++;
    }
  }

  const weeks = [...byWeek.keys()].sort((a,b)=>a-b);
  console.log(`Scanned ${total} rows. Found ${kept} kicker plays across weeks: ${weeks.join(", ") || "(none)"}.`);

  // Save a local snapshot (optional)
  const outfile = `plays_${season}_all.json`;
  const allPlays = weeks.map(w => ({ week: w, count: byWeek.get(w)!.length }));
  fs.writeFileSync(outfile, JSON.stringify({ season, weeks: allPlays }, null, 2));
  console.log(`Wrote summary: ${outfile}`);

  // Import + score each week we found
  for (const w of weeks) {
    const plays = byWeek.get(w)!;
    console.log(`\n=== Week ${w} — sending ${plays.length} plays ===`);
    const importUrl = `${domain}/api/admin/import-plays?season=${season}&week=${w}`;
    const res = await fetch(importUrl, {
      method: "POST",
      headers: { "content-type": "application/json" }, // no admin key header needed
      body: JSON.stringify({ plays }),
    });
    const text = await res.text();
    console.log("Import:", res.status, text);
    if (!res.ok) {
      console.error(`Import failed for week ${w}, aborting.`);
      process.exit(1);
    }

    // compute scores for that week
    const scoreUrl = `${domain}/api/cron/weekly-score?season=${season}&week=${w}`;
    const sres = await fetch(scoreUrl);
    const stext = await sres.text();
    console.log("Score:", sres.status, stext);
    if (!sres.ok) {
      console.error(`Scoring failed for week ${w}.`);
      process.exit(1);
    }
  }

  console.log("\n✅ Done. All available 2025 weeks imported + scored.");
  console.log("Open the leaderboard like:");
  console.log(`  ${domain}/leagues/<LEAGUE_ID>?season=${season}&week=<WEEK_NUMBER>`);
})();
