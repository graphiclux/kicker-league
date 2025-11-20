/* Run: npx tsx scripts/fetch-week-nflverse.ts --season 2025 --week 1 --domain https://kicker-league.vercel.app --admin-key YOUR_KEY */
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
  const idx = process.argv.indexOf(`--${name}`);
  return idx > -1 ? process.argv[idx + 1] : fallback;
}

const season = Number(arg("season", "2025"));
const week = Number(arg("week", "1"));
const domain = arg("domain") || "http://localhost:3000";
const adminKey = arg("admin-key") || process.env.ADMIN_KEY || "";

if (!adminKey) {
  console.error("Missing --admin-key (or ADMIN_KEY env)");
  process.exit(1);
}

// two known URL patterns for pbp (nflverse releases, then legacy)
const sources = [
  `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_${season}.csv.gz`,
  `https://raw.githubusercontent.com/nflverse/nflfastR-data/master/data/play_by_play_${season}.csv.gz`,
];

async function fetchStream(url: string) {
  const res = await fetch(url, { redirect: "follow" as RequestRedirect });
  if (!res.ok || !res.body) throw new Error(`Fetch failed ${res.status} ${url}`);
  // Convert Web stream -> Node stream for piping
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
    } catch {
      // try next
    }
  }
  if (!stream) {
    throw new Error("Could not fetch any pbp source. Check URLs or season.");
  }
  console.log("Using", chosen);

  const gunzip = createGunzip();
  const parser = parse({ columns: true });

  const out: Array<{
    gameId: string;
    possession: string;
    playType: "field_goal" | "extra_point";
    result: "made" | "missed";
    distance?: number | null;
    blocked?: boolean;
  }> = [];

  let total = 0, kept = 0;

  // Stream -> gunzip -> CSV rows
  const csvStream = stream.pipe(gunzip).pipe(parser);

  for await (const rec of csvStream as AsyncIterable<Row>) {
    total++;
    if (!rec) continue;
    if (String(rec.season) !== String(season)) continue;
    if (String(rec.week) !== String(week)) continue;
    if ((rec.season_type ?? "REG") !== "REG") continue; // change if you want POST too

    const playType = rec.play_type;
    if (playType !== "field_goal" && playType !== "extra_point") continue;

    const gameId = rec.game_id;
    const possession = (rec.posteam || "").toUpperCase();

    if (playType === "field_goal") {
      const r = (rec.field_goal_result || "").toLowerCase();
      const distance =
        rec.kick_distance && rec.kick_distance !== "NA"
          ? Number(rec.kick_distance)
          : null;
      const blocked = r === "blocked";
      const result: "made" | "missed" = r === "made" ? "made" : "missed";
      out.push({ gameId, possession, playType, result, distance, blocked });
      kept++;
    } else if (playType === "extra_point") {
      const r = (rec.extra_point_result || "").toLowerCase();
      const blocked = r === "blocked";
      const result: "made" | "missed" = r === "good" ? "made" : "missed";
      out.push({ gameId, possession, playType, result, distance: null, blocked });
      kept++;
    }
  }

  console.log(`Scanned ${total} rows. Week ${week}: ${kept} kick plays.`);

  // Save a local copy (optional)
  const file = `plays_${season}_w${week}.json`;
  fs.writeFileSync(file, JSON.stringify({ plays: out }, null, 2));
  console.log(`Wrote ${file}`);

  // POST to your app
  const url = `${domain.replace(/\/$/, "")}/api/admin/import-plays?season=${season}&week=${week}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-key": adminKey },
    body
