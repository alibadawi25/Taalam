// Upgrade every course's thumbnail_url to the highest-resolution YouTube image.
//
// Strategy:
//   1. For each course with a youtube_playlist_id, fetch the playlist HTML.
//   2. Extract the first video's ID from ytInitialData.
//   3. Try maxresdefault → sddefault → hqdefault until one returns 200.
//   4. Write the clean (no query string) URL back to courses.thumbnail_url.
//
// Usage:
//   node scripts/upgrade-thumbnails.mjs           # dry-run (prints proposed updates)
//   node scripts/upgrade-thumbnails.mjs --apply   # actually writes to DB
//
// Writing requires a secret key: either SUPABASE_SECRET_KEY (new API keys
// system, starts with `sb_secret_...`) or SUPABASE_SERVICE_ROLE_KEY (legacy
// JWT). The publishable key cannot UPDATE rows under RLS.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ── Env loading ─────────────────────────────────────────
function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // .env missing is fine — fall back to process.env
  }
  // process.env always wins over .env so inline `KEY=... node script.mjs` works
  for (const k of Object.keys(process.env)) {
    if (process.env[k]) env[k] = process.env[k];
  }
  return env;
}

const env = loadEnv();
const APPLY = process.argv.includes("--apply");

const url = env.VITE_SUPABASE_URL;
const writeKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const readKey = writeKey || env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !readKey) {
  console.error("Missing SUPABASE env vars in .env");
  process.exit(1);
}
if (APPLY && !writeKey) {
  console.error(
    "--apply requires SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) — the publishable key cannot UPDATE rows.",
  );
  process.exit(1);
}

const supabase = createClient(url, readKey);

// ── YouTube helpers ─────────────────────────────────────
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchPlaylistFirstVideoId(playlistId) {
  const res = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  if (!res.ok) {
    throw new Error(`Playlist fetch ${playlistId} → HTTP ${res.status}`);
  }
  const html = await res.text();
  const match = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
  if (!match) {
    throw new Error(`Could not find any videoId in playlist ${playlistId}`);
  }
  return match[1];
}

async function urlExists(imageUrl) {
  // YouTube returns 200 with real image bytes when a key exists, 404 otherwise.
  // HEAD works fine on i.ytimg.com.
  try {
    const res = await fetch(imageUrl, { method: "HEAD", headers: { "User-Agent": UA } });
    return res.ok && Number(res.headers.get("content-length") || 0) > 1000;
  } catch {
    return false;
  }
}

async function resolveBestThumbnail(videoId) {
  const variants = [
    { key: "maxresdefault", url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` },
    { key: "sddefault", url: `https://i.ytimg.com/vi/${videoId}/sddefault.jpg` },
    { key: "hqdefault", url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` },
  ];
  for (const v of variants) {
    // eslint-disable-next-line no-await-in-loop
    if (await urlExists(v.url)) return v;
  }
  return null;
}

// ── Main ────────────────────────────────────────────────
console.log(`\nMode: ${APPLY ? "APPLY (writing to DB)" : "DRY-RUN (no writes)"}`);
console.log(
  `Key:  ${writeKey ? "secret" : "publishable"}${APPLY ? "" : " (read-only)"}\n`,
);

const { data: courses, error } = await supabase
  .from("courses")
  .select("id, title, youtube_playlist_id, thumbnail_url")
  .not("youtube_playlist_id", "is", null);

if (error) {
  console.error("Error fetching courses:", error);
  process.exit(1);
}

console.log(`Found ${courses.length} courses with a playlist ID.\n`);

const results = [];
for (const course of courses) {
  const label = `#${course.id}  ${course.title}`;
  try {
    const firstVideoId = await fetchPlaylistFirstVideoId(course.youtube_playlist_id);
    const best = await resolveBestThumbnail(firstVideoId);
    if (!best) {
      console.log(`✗ ${label}  — no usable thumbnail found for video ${firstVideoId}`);
      results.push({ course, ok: false });
      continue;
    }
    const currentKey = (course.thumbnail_url || "").match(/\/(\w+default)\.jpg/)?.[1] || "(none)";
    console.log(`✓ ${label}`);
    console.log(`    playlist → first video: ${firstVideoId}`);
    console.log(`    current : ${currentKey}`);
    console.log(`    new     : ${best.key}`);
    console.log(`    url     : ${best.url}`);
    results.push({ course, firstVideoId, best, ok: true });
  } catch (err) {
    console.log(`✗ ${label}  — ${err.message}`);
    results.push({ course, ok: false });
  }
  console.log();
}

const toUpdate = results.filter((r) => r.ok);
console.log(`\n${toUpdate.length} of ${courses.length} courses ready to update.`);

if (!APPLY) {
  console.log("\nDry-run complete. Re-run with --apply to write changes.");
  process.exit(0);
}

// ── Apply updates ───────────────────────────────────────
console.log("\nApplying updates…\n");
let success = 0;
let failed = 0;
for (const r of toUpdate) {
  const { error: upErr } = await supabase
    .from("courses")
    .update({ thumbnail_url: r.best.url })
    .eq("id", r.course.id);
  if (upErr) {
    console.log(`✗ #${r.course.id}  — ${upErr.message}`);
    failed += 1;
  } else {
    console.log(`✓ #${r.course.id}  updated → ${r.best.key}`);
    success += 1;
  }
}
console.log(`\nDone. ${success} updated, ${failed} failed.`);
