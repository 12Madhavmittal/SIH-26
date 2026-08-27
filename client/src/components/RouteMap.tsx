import React from "react";
import { Navigation, MapPin, Truck } from "lucide-react";

export interface MapStopNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demandKg?: number;
  type?: "depot" | "farm" | "buyer";
}

export function RouteMap({
  stops,
  polyline = [],
  className = "",
}: {
  stops: MapStopNode[];
  polyline?: [number, number][]; // [lng, lat] pairs
  className?: string;
}) {
  if (stops.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded-2xl bg-sage/20 p-8 text-xs text-ink/50 ${className}`}>
        No active route waypoints to display.
      </div>
    );
  }

  // Calculate bounding box for SVG projection
  const lats = stops.map((s) => s.lat);
  const lngs = stops.map((s) => s.lng);

  const minLat = Math.min(...lats) - 0.05;
  const maxLat = Math.max(...lats) + 0.05;
  const minLng = Math.min(...lngs) - 0.05;
  const maxLng = Math.max(...lngs) + 0.05;

  const latSpan = maxLat - minLat || 0.1;
  const lngSpan = maxLng - minLng || 0.1;

  const width = 600;
  const height = 340;
  const padding = 40;

  // Projection helper: (lat, lng) -> (x, y) on SVG canvas
  const project = (lat: number, lng: number) => {
    const x = padding + ((lng - minLng) / lngSpan) * (width - 2 * padding);
    // Invert Y axis because SVG coordinates grow downward
    const y = height - padding - ((lat - minLat) / latSpan) * (height - 2 * padding);
    return { x: Math.round(x), y: Math.round(y) };
  };

  // Build SVG path string from polyline or fallback to direct lines
  const pointsToProject = polyline.length > 0 ? polyline.map(([lng, lat]) => ({ lat, lng })) : stops;
  const svgPathData = pointsToProject
    .map((p, idx) => {
      const { x, y } = project(p.lat, p.lng);
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-line bg-[#f8faf5] p-4 shadow-inner ${className}`}>
      {/* Map Header Overlay */}
      <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-bold text-forest shadow-sm backdrop-blur-sm">
        <Navigation size={14} className="text-leaf" />
        <span>OpenStreetMap Road Network Polyline</span>
      </div>

      <div className="absolute right-5 top-5 z-10 flex items-center gap-3 text-[11px] text-ink/60">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-forest" /> FPO Hub
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Farmgate
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Buyer Drop
        </span>
      </div>

      {/* SVG Map Canvas */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto drop-shadow-sm">
        {/* Subtle grid pattern */}
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e6eed8" strokeWidth="0.75" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" rx="16" />

        {/* Road Polyline Path */}
        <path
          d={svgPathData}
          fill="none"
          stroke="#1b4329"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-80"
        />

        {/* Animated Dash Overlay to show motion */}
        <path
          d={svgPathData}
          fill="none"
          stroke="#a2d149"
          strokeWidth="2"
          strokeDasharray="6 8"
          className="animate-pulse"
        />

        {/* Waypoint Markers */}
        {stops.map((stop, idx) => {
          const { x, y } = project(stop.lat, stop.lng);
          const isDepot = stop.type === "depot" || idx === 0 || stop.id === "depot";
          const isFarm = stop.type === "farm" || (!stop.type && stop.id.startsWith("farm"));
          const fillColor = isDepot ? "#1b4329" : isFarm ? "#f59e0b" : "#2563eb";

          return (
            <g key={stop.id || idx} className="cursor-pointer group">
              <circle cx={x} cy={y} r="14" fill={fillColor} className="opacity-20 transition-all group-hover:r-18" />
              <circle cx={x} cy={y} r="8" fill={fillColor} stroke="#ffffff" strokeWidth="2" />
              <text
                x={x}
                y={y + 3}
                fill="#ffffff"
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
              >
                {idx + 1}
              </text>
              <text
                x={x}
                y={y - 12}
                fill="#1e293b"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                className="bg-white/80"
              >
                {stop.name.split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
