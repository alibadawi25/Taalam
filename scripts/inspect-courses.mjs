// One-off: print the courses schema + a sample of thumbnail fields.
// Uses the publishable (anon) key — read only.
// Run with: node scripts/inspect-courses.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE env vars in .env");
  process.exit(1);
}
console.log("Using key type:", env.SUPABASE_SERVICE_ROLE_KEY ? "service_role" : "publishable");

const supabase = createClient(url, key);

const { data, error } = await supabase.from("courses").select("*");
if (error) {
  console.error("Error:", error);
  process.exit(1);
}

console.log(`\nFetched ${data.length} courses.`);
if (data.length === 0) {
  console.log("Table is empty.");
  process.exit(0);
}

const columns = Object.keys(data[0]);
console.log("\nColumns in `courses`:");
for (const col of columns) console.log("  -", col);

console.log("\nSample row (first course):");
console.log(JSON.stringify(data[0], null, 2));

// Specifically list any column whose name hints at URLs / thumbnails / playlists
const urlLike = columns.filter((c) =>
  /(url|thumb|playlist|video|youtube|image|poster|cover)/i.test(c),
);
console.log("\nURL-like columns:", urlLike);

console.log("\nAll thumbnail_url values across rows:");
for (const row of data) {
  console.log(`  #${row.id}  ${row.thumbnail_url || "(none)"}`);
}

// If a playlist-like column exists, print it too
for (const col of urlLike) {
  if (col === "thumbnail_url") continue;
  console.log(`\nAll ${col} values:`);
  for (const row of data) {
    console.log(`  #${row.id}  ${row[col] || "(none)"}`);
  }
}
