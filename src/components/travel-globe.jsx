import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { motion } from "framer-motion";
import { MapPin, CalendarDays } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

const DEFAULT_TEXTURE = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";

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

  const [textureUrl, setTextureUrl] = useState(DEFAULT_TEXTURE);
  const [customUrl, setCustomUrl] = useState("");
  const [isLoadingTexture, setIsLoadingTexture] = useState(false);
  const [textureError, setTextureError] = useState("");

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

  function applyTexture(url) {
    setIsLoadingTexture(true);
    setTextureError("");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setTextureUrl(url);
      setIsLoadingTexture(false);
    };
    img.onerror = () => {
      setIsLoadingTexture(false);
      setTextureError(
        "Failed to load texture (CORS/URL/format). Use a 2:1 equirectangular image."
      );
    };
    img.src = url;
  }

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
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Travel log</p>
            <h1 className="text-2xl font-semibold text-slate-900">Places I've been</h1>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 shadow-sm">
            {TRIPS.length} destinations
          </div>
        </div>
      </header>

      <main className="travel-layout mx-auto w-full max-w-6xl flex-1 px-4 pb-6 pt-4">
        <section className="travel-sidebar h-full w-full">
          <Card className="flex h-full flex-col overflow-hidden shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-200/70 px-4 py-3">
              <MapPin className="h-5 w-5 text-sky-600" />
              <span className="text-lg font-semibold">Your Travel Timeline</span>
            </div>
            <div className="border-b border-slate-200/70 px-4 py-3">
              <Input
                placeholder="Filter places or notes…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div ref={containerRef} className="flex-1 space-y-2 overflow-auto px-3 py-4">
              {filteredTrips.map((t) => (
                <MotionButton
                  key={t.id}
                  id={`trip-${t.id}`}
                  onClick={() => flyTo(t)}
                  className={`w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:shadow-md ${
                    selected?.id === t.id ? "ring-2 ring-sky-500" : ""
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{t.label}</span>
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
                    <div className="mt-2 text-sm text-slate-700">{t.comments}</div>
                  )}
                </MotionButton>
              ))}
              {filteredTrips.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  No matches.
                </div>
              )}
            </div>
          </Card>
        </section>

        <section className="travel-globe relative min-h-[420px] overflow-hidden rounded-3xl bg-white shadow-xl">
          <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm shadow">
            <input
              className="h-9 w-56 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Custom 2:1 texture URL (JPG/PNG, CORS)"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
            />
            <Button size="sm" onClick={() => customUrl && applyTexture(customUrl)}>
              Apply
            </Button>
            {isLoadingTexture && <span className="text-xs text-slate-500">Loading…</span>}
            {textureError && <span className="text-xs text-red-600">{textureError}</span>}
          </div>

          <div className="absolute inset-0">
            <Globe
              ref={globeRef}
              width={undefined}
              height={undefined}
              backgroundColor="#ffffff"
              globeImageUrl={textureUrl}
              bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundImageUrl={null}
              rendererConfig={{ antialias: true, powerPreference: "high-performance" }}
              pointsData={pointsData}
              pointAltitude={(d) => d.altitude}
              pointRadius={(d) => d.size}
              pointColor={(d) => d.color || "#2563EB"}
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
              atmosphereColor="#a5c8ff"
              atmosphereAltitude={0.23}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default TravelGlobe;
