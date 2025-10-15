import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { motion } from "framer-motion";
import { MapPin, CalendarDays } from "lucide-react";
import { decompressFromEncodedURIComponent } from "lz-string";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MotionButton = motion.button;

const DEFAULT_TRIPS = [
  {
    label: "Kyoto, Japan",
    lat: 35.0116,
    lng: 135.7681,
    date: "2025-03-17",
    comments: "Cherry blossoms at Maruyama Park; matcha overload.",
    color: "#0EA5E9"
  },
  {
    label: "Seoul, South Korea",
    lat: 37.5665,
    lng: 126.978,
    date: "2024-12-02",
    comments: "Bibimbap + late night shopping in Myeongdong.",
    color: "#22C55E"
  },
  {
    label: "Barcelona, Spain",
    lat: 41.3874,
    lng: 2.1686,
    date: "2023-09-05",
    comments: "Gaudí tour: Sagrada Família and Park Güell.",
    color: "#F59E0B"
  },
  {
    label: "San Francisco, USA",
    lat: 37.7749,
    lng: -122.4194,
    date: "2022-06-11",
    comments: "Foggy Golden Gate, perfect clam chowder at Fisherman's Wharf.",
    color: "#EF4444"
  }
];

const DEFAULT_TEXTURE = `${import.meta.env.BASE_URL}textures/eo_base_2020_clean_3600x1800.png`;

const DEFAULT_COLOR = "#38bdf8";

const parseISO = (value) => new Date(value);
const toYear = (value) => String(parseISO(value).getFullYear());

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function sanitizeTrip(trip, index) {
  const lat = Number(trip.lat);
  const lng = Number(trip.lng);
  const color = typeof trip.color === "string" && HEX_COLOR_REGEX.test(trip.color)
    ? trip.color
    : DEFAULT_COLOR;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    console.warn(`[TravelGlobe] Trip #${index} has invalid coordinates`, trip);
    return null;
  }

  return {
    ...trip,
    lat,
    lng,
    color
  };
}

function runSanityTests(trips) {
  const failures = [];
  if (!Array.isArray(trips)) failures.push("Trips payload is not an array");
  trips?.forEach((trip, index) => {
    if (typeof trip.label !== "string" || !trip.label) failures.push(`Trip #${index} invalid label`);
    if (typeof trip.lat !== "number" || trip.lat < -90 || trip.lat > 90) failures.push(`Trip #${index} invalid lat`);
    if (typeof trip.lng !== "number" || trip.lng < -180 || trip.lng > 180) failures.push(`Trip #${index} invalid lng`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trip.date)) failures.push(`Trip #${index} invalid date format (YYYY-MM-DD)`);
    if (Number.isNaN(parseISO(trip.date).getTime())) failures.push(`Trip #${index} invalid date value`);
    if (typeof trip.comments !== "string") failures.push(`Trip #${index} invalid comments`);
    if (trip.color && !HEX_COLOR_REGEX.test(trip.color)) failures.push(`Trip #${index} invalid color`);
  });
  if (failures.length) {
    console.warn("[TravelGlobe] Sanity test failures:\n" + failures.map((failure) => " - " + failure).join("\n"));
  } else {
    console.log(`[TravelGlobe] Sanity tests passed ( ${trips?.length ?? 0} trips )`);
  }
}

function parseTripsFromUrl() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("trips");
  if (!encoded) return null;

  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) throw new Error("Could not decompress payload");
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) throw new Error("Decompressed payload is not an array");
    return parsed;
  } catch (error) {
    console.warn("[TravelGlobe] Failed to import trips from URL:", error.message);
    return null;
  }
}

export function TravelGlobe() {
  const globeRef = useRef(null);
  const containerRef = useRef(null);

  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [tripsData, setTripsData] = useState(DEFAULT_TRIPS);

 const textureUrl = DEFAULT_TEXTURE;

  const normalizedTrips = useMemo(() => {
    return [...tripsData]
      .sort((a, b) => parseISO(b.date) - parseISO(a.date))
      .map((trip, index) => sanitizeTrip(trip, index))
      .filter(Boolean)
      .map((trip, index) => ({ id: index + 1, ...trip }));
  }, [tripsData]);

  useEffect(() => {
    const override = parseTripsFromUrl();
    if (override) {
      setTripsData(override);
    }
  }, []);

  useEffect(() => {
    runSanityTests(normalizedTrips);
  }, [normalizedTrips]);

  const tripsSorted = normalizedTrips;

  useEffect(() => {
    setSelected(tripsSorted[0] ?? null);
  }, [tripsSorted]);

  const filteredTrips = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tripsSorted;
    return tripsSorted.filter((trip) =>
      trip.label.toLowerCase().includes(q) || trip.comments.toLowerCase().includes(q)
    );
  }, [query, tripsSorted]);

  const pointsData = useMemo(() => {
    return tripsSorted.map((trip) => ({
      ...trip,
      altitude: 0.02,
      size: 0.7,
      pointLabel: `${trip.label} — ${toYear(trip.date)}`
    }));
  }, [tripsSorted]);

  const labelsData = useMemo(() => {
    return tripsSorted.map((trip) => ({
      lat: trip.lat,
      lng: trip.lng,
      altitude: 0.03,
      text: `${toYear(trip.date)} - ${trip.label}`,
      color: trip.color || "#111827",
      size: 1.1
    }));
  }, [tripsSorted]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const focus = tripsSorted[0] || { lat: 0, lng: 0 };
    globe.pointOfView({ lat: focus.lat, lng: focus.lng, altitude: 1.8 }, 0);

    const controls = globe.controls();
    if (controls) {
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.5;
      controls.zoomSpeed = 0.9;
      controls.minDistance = 140;
      controls.maxDistance = 600;
    }

    globe.autoRotate = true;
    globe.autoRotateSpeed = 0.36;
  }, [tripsSorted]);

  function flyTo(trip, altitude = 1.4) {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointOfView({ lat: trip.lat, lng: trip.lng, altitude }, 1500);
    setSelected(trip);
  }

  const onPointClick = (point) => flyTo(point);

  useEffect(() => {
    if (!selected || !containerRef.current) return;
    const element = document.getElementById(`trip-${selected.id}`);
    if (element) element.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  return (
    <div className="flex min-h-screen flex-col text-slate-900">
      <header className="travel-header relative overflow-hidden text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-500/35 blur-3xl" />
          <div className="absolute bottom-[-30%] right-[-10%] h-96 w-96 rounded-full bg-indigo-500/30 blur-[200px]" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-sky-200/80">Travel log</p>
          </div>
        </div>
      </header>

      <main className="travel-main travel-layout mx-auto w-full max-w-6xl">
        <section className="travel-sidebar h-full w-full">
          <Card className="travel-sidebar-card flex h-full flex-col overflow-hidden">
            <div className="flex items-center gap-3 bg-gradient-to-r from-sky-50 to-white px-5 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-500/15 text-sky-600">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Journey timeline</p>
                <p className="text-lg font-semibold text-slate-900">Browse every stop</p>
              </div>
            </div>
            <div className="px-5 pb-4 pt-3">
              <Input
                placeholder="Filter places or notes…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div ref={containerRef} className="flex-1 space-y-3 overflow-auto px-5 pb-5">
              {filteredTrips.map((trip) => (
                <MotionButton
                  key={trip.id}
                  id={`trip-${trip.id}`}
                  onClick={() => flyTo(trip)}
                  className={`travel-trip group w-full rounded-2xl p-4 text-left transition-all ${
                    selected?.id === trip.id ? "is-active" : ""
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 group-hover:text-slate-900">{trip.label}</span>
                    <span className="text-sm text-slate-500">{toYear(trip.date)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    <CalendarDays className="h-4 w-4 text-sky-500" />
                    <span>
                      {new Date(trip.date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
                    </span>
                  </div>
                  {selected?.id === trip.id && (
                    <div className="mt-2 rounded-xl bg-sky-50/80 p-3 text-sm text-slate-700 shadow-inner">
                      {trip.comments}
                    </div>
                  )}
                </MotionButton>
              ))}
              {filteredTrips.length === 0 && (
                <div className="travel-empty rounded-2xl border border-dashed border-slate-300/60 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
                  No matches found.
                </div>
              )}
            </div>
          </Card>
        </section>

        <section className="travel-globe relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl ring-1 ring-slate-900/60">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-10 top-10 h-52 w-52 rounded-full bg-sky-500/20 blur-3xl" />
            <div className="absolute bottom-[-25%] right-6 h-72 w-72 rounded-full bg-indigo-500/25 blur-[140px]" />
          </div>

          <div className="absolute inset-0">
            <Globe
              ref={globeRef}
              width={undefined}
              height={undefined}
              backgroundColor="rgba(2,6,23,1)"
              globeImageUrl={textureUrl}
              bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundImageUrl={null}
              rendererConfig={{ antialias: true, powerPreference: "high-performance" }}
              pointsData={pointsData}
              pointAltitude={(data) => data.altitude}
              pointRadius={(data) => data.size}
              pointColor={(data) => data.color || "#38bdf8"}
              pointLabel={(data) => data.pointLabel}
              onPointClick={onPointClick}
              labelsData={labelsData}
              labelLat={(data) => data.lat}
              labelLng={(data) => data.lng}
              labelAltitude={(data) => data.altitude}
              labelText={(data) => data.text}
              labelSize={(data) => data.size}
              labelColor={(data) => data.color}
              labelDotRadius={0}
              atmosphereColor="#38bdf8"
              atmosphereAltitude={0.23}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default TravelGlobe;
