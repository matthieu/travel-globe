#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { parse } from "csv-parse/sync";

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const DEFAULT_COLOR = "#38bdf8";

const DEFAULT_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const DEFAULT_DELAY_MS = Number(process.env.GEOCODER_DELAY_MS ?? 1200);
const USER_AGENT = process.env.GEOCODER_USER_AGENT ?? "travel-globe-csv-import/1.0 (https://github.com/)";

async function geocode(place, cache) {
  if (cache.has(place)) return cache.get(place);

  const endpoint = process.env.GEOCODER_ENDPOINT ?? DEFAULT_ENDPOINT;
  const url = new URL(endpoint);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", place);

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Geocode request failed (${response.status} ${response.statusText})`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No results returned");
  }

  const result = {
    lat: Number.parseFloat(data[0].lat),
    lng: Number.parseFloat(data[0].lon)
  };

  if (!Number.isFinite(result.lat) || result.lat < -90 || result.lat > 90) {
    throw new Error(`Latitude ${result.lat} out of bounds for "${place}"`);
  }

  if (!Number.isFinite(result.lng) || result.lng < -180 || result.lng > 180) {
    throw new Error(`Longitude ${result.lng} out of bounds for "${place}"`);
  }

  cache.set(place, result);
  return result;
}

function toIsoDate(value) {
  if (!value) throw new Error("Missing date");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return parsed.toISOString().slice(0, 10);
}

async function main() {
  const [, , inputPath, outputPath = "trips.json"] = process.argv;
  if (!inputPath) {
    console.error("Usage: node scripts/csv-to-trips.mjs <input.csv> [output.json]");
    process.exit(1);
  }

  const absInput = resolve(process.cwd(), inputPath);
  const absOutput = resolve(process.cwd(), outputPath);

  const csvRaw = await readFile(absInput, "utf8");
  const records = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const cache = new Map();
  const trips = [];

  for (const record of records) {
    const date = toIsoDate(record.Date ?? record.date);
    const location = record.Location ?? record.location ?? record.Place ?? record.place;
    if (!location) {
      console.warn("Skipping row with missing location", record);
      continue;
    }

    const rawColor = record.Color ?? record.color ?? "";
    const color = HEX_COLOR_REGEX.test(rawColor) ? rawColor : DEFAULT_COLOR;
    if (rawColor && color === DEFAULT_COLOR) {
      console.warn(`Color "${rawColor}" invalid, using default for ${location}`);
    }
    const comments = record.Comments ?? record.comments ?? "";

    let coords;
    try {
      coords = await geocode(location, cache);
    } catch (error) {
      console.warn(`Skipping ${location}: ${error.message}`);
      continue;
    }

    trips.push({
      label: location,
      lat: coords.lat,
      lng: coords.lng,
      date,
      comments,
      color
    });

    if (DEFAULT_DELAY_MS > 0) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, DEFAULT_DELAY_MS));
    }
  }

  await writeFile(absOutput, JSON.stringify(trips, null, 2));
  console.log(`Wrote ${trips.length} trips to ${absOutput}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
