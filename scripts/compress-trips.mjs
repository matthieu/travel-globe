#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import lzString from "lz-string";

const { compressToEncodedURIComponent } = lzString;

async function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    console.error("Usage: node scripts/compress-trips.mjs <trips.json>");
    process.exit(1);
  }

  const absolute = resolve(process.cwd(), inputPath);

  let raw;
  try {
    raw = await readFile(absolute, "utf8");
  } catch (error) {
    console.error(`Failed to read file at ${absolute}:`, error.message);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error("Provided file does not contain valid JSON:", error.message);
    process.exit(1);
  }

  if (!Array.isArray(parsed)) {
    console.error("Trips file must export a JSON array of trip objects.");
    process.exit(1);
  }

  const compressed = compressToEncodedURIComponent(JSON.stringify(parsed));
  const sampleUrl = `?trips=${compressed}`;

  console.log(compressed);
  console.log("\nShareable query string:");
  console.log(sampleUrl);
}

main();
