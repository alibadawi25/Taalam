// One-off: print lesson_progress schema + a sample row.
// Run with: node scripts/inspect-lesson-progress.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // .env missing is fine
  }
  for (const k of Object.keys(process.env)) {
    if (process.env[k]) env[k] = process.env[k];
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

const { data, error } = await supabase.from("lesson_progress").select("*").limit(3);
if (error) {
  console.error(error);
  process.exit(1);
}
console.log(`Got ${data.length} rows.`);
if (data.length === 0) {
  console.log("Table is empty. Columns will be discoverable only by insert attempts.");
  process.exit(0);
}
console.log("Columns:", Object.keys(data[0]));
console.log("Sample:", JSON.stringify(data[0], null, 2));
