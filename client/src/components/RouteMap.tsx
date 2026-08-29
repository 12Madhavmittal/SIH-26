import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, Navigation } from "lucide-react";

export interface MapStopNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demandKg?: number;
  type?: "depot" | "farm" | "buyer" | "return";
}

type RouteSummary = {
  distanceKm: number;
  durationMinutes: number;
};

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

let googleMapsLoadPromise: Promise<typeof google> | undefined;

function getGoogleApi(): typeof google | undefined {
  return (window as unknown as { google?: typeof google }).google;
}

function loadGoogleMaps(): Promise<typeof google> {
  if (!API_KEY) {
    return Promise.reject(new Error("Google Maps is not configured."));
  }

  const existingGoogleApi = getGoogleApi();
  if (existingGoogleApi) {
    return Promise.resolve(existingGoogleApi);
  }

  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&v=weekly&loading=async`;
    script.async = true;
    script.onload = () => {
      const loadedGoogleApi = getGoogleApi();
      if (loadedGoogleApi) {
        resolve(loadedGoogleApi);
      } else {
        reject(new Error("Google Maps loaded without the required Routes library."));
      }
    };
    script.onerror = () => reject(new Error("The Google Maps script could not be loaded."));
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
}

function markerColor(stop: MapStopNode, index: number, total: number): string {
  if (stop.type === "return" || (index === total - 1 && stop.type === "depot")) return "#64748b";
  if (stop.type === "depot" || index === 0) return "#1b4329";
  if (stop.type === "farm") return "#d97706";
  return "#2563eb";
}

function classifyStop(stop: MapStopNode, index: number, total: number): string {
  if (stop.type === "return" || (index === total - 1 && stop.type === "depot")) return "Return hub";
  if (stop.type === "depot" || index === 0) return "FPO hub";
  if (stop.type === "farm") return "Farmgate pickup";
  return "Buyer drop";
}

/**
 * A real Google Maps route view. The route is calculated against roads with
 * the Routes Library; it never falls back to a misleading straight line.
 */
export function RouteMap({
  stops,
  onStopDragEnd,
  className = "",
}: {
  stops: MapStopNode[];
  onStopDragEnd?: (stopId: string, newLat: number, newLng: number) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "unconfigured">(
    API_KEY ? "loading" : "unconfigured",
  );
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RouteSummary | null>(null);

  useEffect(() => {
    if (!API_KEY) {
      setStatus("unconfigured");
      return;
    }

    if (stops.length < 2 || !containerRef.current) return;

    let disposed = false;
    const overlays: google.maps.MVCObject[] = [];

    async function renderRoute() {
      setStatus("loading");
      setError(null);
      setSummary(null);

      try {
        const googleApi = await loadGoogleMaps();
        if (disposed || !containerRef.current) return;

        const maps = googleApi.maps;
        const map = new maps.Map(containerRef.current, {
          center: { lat: stops[0].lat, lng: stops[0].lng },
          zoom: 8,
          mapId: MAP_ID || undefined,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "cooperative",
        });

        const bounds = new maps.LatLngBounds();
        const infoWindow = new maps.InfoWindow();
        stops.forEach((stop, index) => {
          const position = { lat: stop.lat, lng: stop.lng };
          bounds.extend(position);
          const marker = new maps.Marker({
            map,
            position,
            draggable: Boolean(onStopDragEnd),
            title: `${index + 1}. ${stop.name}`,
            label: { text: String(index + 1), color: "#ffffff", fontWeight: "700" },
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 11,
              fillColor: markerColor(stop, index, stops.length),
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });

          if (onStopDragEnd) {
            marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
              if (e.latLng) {
                onStopDragEnd(stop.id, e.latLng.lat(), e.latLng.lng());
              }
            });
          }

          marker.addListener("click", () => {
            const quantity = stop.demandKg ? `<br/><strong>${Math.abs(stop.demandKg)} kg</strong>` : "";
            infoWindow.setContent(
              `<div style="max-width:220px;padding:2px 4px"><strong>${index + 1}. ${stop.name}</strong><br/>${classifyStop(stop, index, stops.length)}${quantity}</div>`,
            );
            infoWindow.open({ map, anchor: marker });
          });
          overlays.push(marker);
        });
        map.fitBounds(bounds, 48);

        const { Route } = (await maps.importLibrary("routes")) as unknown as { Route: any };
        const routeRequest = {
          origin: { lat: stops[0].lat, lng: stops[0].lng },
          destination: { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng },
          intermediates: stops.slice(1, -1).map((stop) => ({
            location: { lat: stop.lat, lng: stop.lng },
            vehicleStopover: true,
          })),
          travelMode: "DRIVING",
          fields: ["path", "distanceMeters", "durationMillis"],
        };
        const { routes } = await Route.computeRoutes(routeRequest);
        if (disposed) return;
        if (!routes?.[0]) throw new Error("Google Routes did not return a driving route for these stops.");

        const route = routes[0];
        const polylines = route.createPolylines();
        polylines.forEach((polyline: google.maps.Polyline) => {
          polyline.setOptions({ strokeColor: "#1b4329", strokeOpacity: 0.9, strokeWeight: 5 });
          polyline.setMap(map);
          overlays.push(polyline);
        });
        if (route.path?.length) {
          const routeBounds = new maps.LatLngBounds();
          route.path.forEach((point: google.maps.LatLngLiteral) => routeBounds.extend(point));
          map.fitBounds(routeBounds, 48);
        }

        setSummary({
          distanceKm: Number((route.distanceMeters / 1000).toFixed(1)),
          durationMinutes: Math.round(route.durationMillis / 60000),
        });
        setStatus("ready");
      } catch (routeError) {
        if (disposed) return;
        console.error("Unable to render Google Maps route", routeError);
        setError(routeError instanceof Error ? routeError.message : "Unable to load the road route.");
        setStatus("error");
      }
    }

    void renderRoute();
    return () => {
      disposed = true;
      overlays.forEach((overlay) => {
        if ("setMap" in overlay && typeof (overlay as google.maps.Polyline).setMap === "function") {
          (overlay as google.maps.Polyline).setMap(null);
        }
      });
    };
  }, [stops]);

  if (stops.length < 2) {
    return (
      <div className={`flex items-center justify-center rounded-2xl bg-sage/20 p-8 text-xs text-ink/50 ${className}`}>
        Add at least two route waypoints to display a road route.
      </div>
    );
  }

  if (status === "unconfigured") {
    return (
      <div className={`rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-bold">Google Maps is not configured.</p>
            <p className="mt-1 text-xs leading-5 text-amber-900/80">
              Add <code>VITE_GOOGLE_MAPS_API_KEY</code> and <code>VITE_GOOGLE_MAPS_MAP_ID</code> to <code>.env.local</code>, then enable Maps JavaScript API and Routes API in Google Cloud.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-line bg-[#f8faf5] shadow-inner ${className}`}>
      <div ref={containerRef} className="h-[360px] w-full" aria-label="Google Maps road route" />

      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-forest shadow-sm">
        <Navigation size={14} className="text-leaf" />
        <span>Google Maps road route</span>
      </div>

      {summary && status === "ready" && (
        <div className="absolute right-4 top-4 z-10 rounded-xl bg-white/95 px-3 py-2 text-right text-xs shadow-sm">
          <p className="font-bold text-ink">{summary.distanceKm} km · {Math.floor(summary.durationMinutes / 60)}h {summary.durationMinutes % 60}m</p>
          <p className="mt-0.5 text-[10px] text-ink/55">Google road estimate</p>
        </div>
      )}

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-forest shadow-sm">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Calculating road route…
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-x-4 bottom-4 z-10 rounded-xl border border-rose-200 bg-white/95 p-3 text-xs text-rose-800 shadow-sm">
          <p className="font-bold">Road route unavailable</p>
          <p className="mt-1 leading-5">{error ?? "Check the Google Maps key, API restrictions, billing, and Routes API status."}</p>
        </div>
      )}
    </div>
  );
}
