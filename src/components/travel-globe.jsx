import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { motion } from "framer-motion";
import { MapPin, CalendarDays } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MotionButton = motion.button;

const TRIPS = [
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

const DEFAULT_TEXTURE = `${import.meta.env.BASE_URL}textures/political_map.png`;

const parseISO = (s) => new Date(s);
const toYear = (s) => String(parseISO(s).getFullYear());

function runSanityTests() {
  const failures = [];
  if (!Array.isArray(TRIPS)) failures.push("TRIPS is not an array");
  TRIPS.forEach((t, i) => {
    if (typeof t.label !== "string" || !t.label) failures.push(`Trip #${i} invalid label`);
    if (typeof t.lat !== "number" || t.lat < -90 || t.lat > 90) failures.push(`Trip #${i} invalid lat`);
    if (typeof t.lng !== "number" || t.lng < -180 || t.lng > 180) failures.push(`Trip #${i} invalid lng`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) failures.push(`Trip #${i} invalid date format (YYYY-MM-DD)`);
    if (Number.isNaN(parseISO(t.date).getTime())) failures.push(`Trip #${i} invalid date value`);
    if (typeof t.comments !== "string") failures.push(`Trip #${i} invalid comments`);
  });
  if (failures.length) {
    console.warn("[TravelGlobe] Sanity test failures:\n" + failures.map((f) => " - " + f).join("\n"));
  } else {
    console.log("[TravelGlobe] Sanity tests passed (", TRIPS.length, "trips )");
  }
}

export function TravelGlobe() {
  const globeRef = useRef(null);
  const containerRef = useRef(null);

  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");

  const textureUrl = DEFAULT_TEXTURE;

  const tripsSorted = useMemo(() => {
    return [...TRIPS]
      .sort((a, b) => parseISO(b.date) - parseISO(a.date))
      .map((t, i) => ({ id: i + 1, ...t }));
  }, []);

  const filteredTrips = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tripsSorted;
    return tripsSorted.filter((t) =>
      t.label.toLowerCase().includes(q) || t.comments.toLowerCase().includes(q)
    );
  }, [query, tripsSorted]);

  const pointsData = useMemo(() => {
    return tripsSorted.map((t) => ({
      ...t,
      altitude: 0.02,
      size: 0.7,
      pointLabel: `${t.label} — ${toYear(t.date)}`
    }));
  }, [tripsSorted]);

  const labelsData = useMemo(() => {
    return tripsSorted.map((t) => ({
      lat: t.lat,
      lng: t.lng,
      altitude: 0.03,
      text: `${toYear(t.date)} • ${t.label}`,
      color: t.color || "#111827",
      size: 1.1
    }));
  }, [tripsSorted]);

  const latestTrip = tripsSorted[0];
  const earliestTrip = tripsSorted[tripsSorted.length - 1];

  useEffect(() => {
    runSanityTests();

    const g = globeRef.current;
    if (!g) return;

    const focus = tripsSorted[0] || { lat: 0, lng: 0 };
    g.pointOfView({ lat: focus.lat, lng: focus.lng, altitude: 1.8 }, 0);

    const controls = g.controls();
    if (controls) {
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.5;
      controls.zoomSpeed = 0.9;
      controls.minDistance = 140;
      controls.maxDistance = 600;
    }

    g.autoRotate = true;
    g.autoRotateSpeed = 0.36;
  }, [tripsSorted]);

  function flyTo(trip, altitude = 1.4) {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView({ lat: trip.lat, lng: trip.lng, altitude }, 1500);
    setSelected(trip);
  }

  const onPointClick = (p) => flyTo(p);

  useEffect(() => {
    if (!selected || !containerRef.current) return;
    const el = document.getElementById(`trip-${selected.id}`);
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
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
            <h1 className="text-3xl font-semibold tracking-tight">Places I've been</h1>
            <p className="mt-2 max-w-xl text-sm">
              Trace each journey on an interactive globe and keep your favourite memories within reach
              {earliestTrip ? ` — adventures since ${toYear(earliestTrip.date)}.` : "."}
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-3xl bg-white/10 px-6 py-5 text-sm text-white shadow-2xl backdrop-blur md:flex-row md:items-center md:gap-12">
            <div className="stat-card rounded-2xl bg-white/10 px-4 py-3">
              <p className="stat-label text-xs uppercase tracking-wide">Destinations</p>
              <p className="stat-value text-2xl font-semibold">{TRIPS.length}</p>
            </div>
            {latestTrip && (
              <>
                <div className="hidden h-12 w-px bg-white/20 md:block" />
                <div className="stat-card max-w-[18rem] rounded-2xl bg-white/10 px-4 py-3">
                  <p className="stat-label text-xs uppercase tracking-wide">Latest stop</p>
                  <p className="stat-value text-sm font-semibold">{latestTrip.label}</p>
                  <p className="stat-label text-xs">
                    {new Date(latestTrip.date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    })}
                  </p>
                </div>
              </>
            )}
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
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div ref={containerRef} className="flex-1 space-y-3 overflow-auto px-5 pb-5">
              {filteredTrips.map((t) => (
                <MotionButton
                  key={t.id}
                  id={`trip-${t.id}`}
                  onClick={() => flyTo(t)}
                  className={`travel-trip group w-full rounded-2xl p-4 text-left transition-all ${
                    selected?.id === t.id ? "is-active" : ""
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 group-hover:text-slate-900">{t.label}</span>
                    <span className="text-sm text-slate-500">{toYear(t.date)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    <CalendarDays className="h-4 w-4 text-sky-500" />
                    <span>
                      {new Date(t.date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
                    </span>
                  </div>
                  {selected?.id === t.id && (
                    <div className="mt-2 rounded-xl bg-sky-50/80 p-3 text-sm text-slate-700 shadow-inner">
                      {t.comments}
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
              pointAltitude={(d) => d.altitude}
              pointRadius={(d) => d.size}
              pointColor={(d) => d.color || "#38bdf8"}
              pointLabel={(d) => d.pointLabel}
              onPointClick={onPointClick}
              labelsData={labelsData}
              labelLat={(d) => d.lat}
              labelLng={(d) => d.lng}
              labelAltitude={(d) => d.altitude}
              labelText={(d) => d.text}
              labelSize={(d) => d.size}
              labelColor={(d) => d.color}
              labelDotRadius={0}
              atmosphereColor="#38bdf8"
              atmosphereAltitude={0.23}
            />
          </div>

          {selected && (
            <div className="pointer-events-none absolute bottom-6 left-6 z-10 max-w-xs rounded-2xl bg-slate-900/55 px-4 py-4 text-white shadow-2xl backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-sky-200/90">Currently viewing</p>
              <p className="mt-1 text-lg font-semibold">{selected.label}</p>
              <p className="text-xs text-slate-100/90">
                {new Date(selected.date).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                })}
              </p>
              <p className="mt-2 text-sm text-slate-100/90">{selected.comments}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default TravelGlobe;
