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
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

let googleMapsLoadPromise: Promise<typeof google> | undefined;

function getGoogleApi(): typeof google | undefined {
  return (window as unknown as { google?: typeof google }).google;
}

function loadGoogleMaps(): Promise<typeof google> {
  if (!API_KEY) {
    return Promise.reject(new Error("Google Maps is not configured."));
  }

  const existingGoogleApi = getGoogleApi();
  if (existingGoogleApi?.maps?.Map) {
    return Promise.resolve(existingGoogleApi);
  }

  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    // Check if script already exists
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      const checkInterval = setInterval(() => {
        const api = getGoogleApi();
        if (api?.maps?.Map) {
          clearInterval(checkInterval);
          resolve(api);
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&v=weekly&libraries=routes,geometry,marker`;
    script.async = true;
    script.onload = () => {
      const loadedGoogleApi = getGoogleApi();
      if (loadedGoogleApi?.maps) {
        resolve(loadedGoogleApi);
      } else {
        reject(new Error("Google Maps loaded but google.maps namespace is not available."));
      }
    };
    script.onerror = () => reject(new Error("The Google Maps script could not be loaded. Please check API Key / Network."));
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

        // 1. Initialize Map
        const MapConstructor = googleApi.maps.Map;
        const map = new MapConstructor(containerRef.current, {
          center: { lat: stops[0].lat, lng: stops[0].lng },
          zoom: 8,
          mapId: MAP_ID || "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "cooperative",
        });

        const bounds = new googleApi.maps.LatLngBounds();
        const infoWindow = new googleApi.maps.InfoWindow();

        // Check if AdvancedMarkerElement is supported in this build
        const AdvancedMarkerElement = (googleApi.maps as any).marker?.AdvancedMarkerElement;
        const PinElement = (googleApi.maps as any).marker?.PinElement;

        stops.forEach((stop, index) => {
          const position = { lat: stop.lat, lng: stop.lng };
          bounds.extend(position);

          const color = markerColor(stop, index, stops.length);
          let markerOverlay: any;

          if (AdvancedMarkerElement && PinElement) {
            const pin = new PinElement({
              background: color,
              borderColor: "#ffffff",
              glyphColor: "#ffffff",
              glyph: String(index + 1),
              scale: 1.1,
            });

            markerOverlay = new AdvancedMarkerElement({
              map,
              position,
              title: `${index + 1}. ${stop.name}`,
              content: pin.element,
              gmpDraggable: Boolean(onStopDragEnd),
            });

            if (onStopDragEnd) {
              markerOverlay.addListener("dragend", (e: any) => {
                if (e.latLng) {
                  onStopDragEnd(stop.id, e.latLng.lat(), e.latLng.lng());
                }
              });
            }

            markerOverlay.addListener("click", () => {
              const quantity = stop.demandKg ? `<br/><strong>${Math.abs(stop.demandKg)} kg</strong>` : "";
              infoWindow.setContent(
                `<div style="max-width:220px;padding:4px 6px;font-family:sans-serif;color:#1e293b;"><strong>${index + 1}. ${stop.name}</strong><br/><span style="color:#64748b;font-size:12px;">${classifyStop(stop, index, stops.length)}</span>${quantity}</div>`,
              );
              infoWindow.open({ map, anchor: markerOverlay });
            });
          } else {
            markerOverlay = new googleApi.maps.Marker({
              map,
              position,
              draggable: Boolean(onStopDragEnd),
              title: `${index + 1}. ${stop.name}`,
              label: { text: String(index + 1), color: "#ffffff", fontWeight: "700" },
              icon: {
                path: googleApi.maps.SymbolPath.CIRCLE,
                scale: 11,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              },
            });

            if (onStopDragEnd) {
              markerOverlay.addListener("dragend", (e: google.maps.MapMouseEvent) => {
                if (e.latLng) {
                  onStopDragEnd(stop.id, e.latLng.lat(), e.latLng.lng());
                }
              });
            }

            markerOverlay.addListener("click", () => {
              const quantity = stop.demandKg ? `<br/><strong>${Math.abs(stop.demandKg)} kg</strong>` : "";
              infoWindow.setContent(
                `<div style="max-width:220px;padding:2px 4px"><strong>${index + 1}. ${stop.name}</strong><br/>${classifyStop(stop, index, stops.length)}${quantity}</div>`,
              );
              infoWindow.open({ map, anchor: markerOverlay });
            });
          }

          overlays.push(markerOverlay);
        });
        map.fitBounds(bounds, 48);

        // 2. Compute Driving Route
        // Try Google DirectionsService first, and if REQUEST_DENIED (e.g. Directions API not enabled in Cloud Console),
        // seamlessly fall back to high-resolution OSRM road coordinates rendered via Google Polyline
        const directionsService = new googleApi.maps.DirectionsService();
        const directionsRenderer = new googleApi.maps.DirectionsRenderer({
          map,
          suppressMarkers: true, // We already draw custom numbered & colored markers
          polylineOptions: {
            strokeColor: "#1b4329",
            strokeOpacity: 0.85,
            strokeWeight: 5,
          },
        });
        overlays.push(directionsRenderer as any);

        const origin = { lat: stops[0].lat, lng: stops[0].lng };
        const destination = { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng };
        const waypoints = stops.slice(1, -1).map((s) => ({
          location: { lat: s.lat, lng: s.lng },
          stopover: true,
        }));

        const renderOsrmFallbackRoad = async () => {
          try {
            const coords = stops.map((s) => `${s.lng},${s.lat}`).join(";");
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
            const data = await res.json();
            if (disposed) return;
            if (data.code === "Ok" && data.routes?.[0]) {
              const route = data.routes[0];
              const path = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
              const polyline = new googleApi.maps.Polyline({
                path,
                strokeColor: "#1b4329",
                strokeOpacity: 0.85,
                strokeWeight: 5,
                map,
              });
              overlays.push(polyline);

              const routeBounds = new googleApi.maps.LatLngBounds();
              path.forEach((pt: google.maps.LatLngLiteral) => routeBounds.extend(pt));
              map.fitBounds(routeBounds, 48);

              setSummary({
                distanceKm: Number((route.distance / 1000).toFixed(1)),
                durationMinutes: Math.round(route.duration / 60),
              });
              setStatus("ready");
            } else {
              throw new Error("Unable to fetch road geometry");
            }
          } catch (osrmErr) {
            console.error("OSRM fallback error:", osrmErr);
            setError("Google Directions API is not enabled in your Google Cloud project. Enable 'Directions API' or 'Routes API' in Google Cloud Console.");
            setStatus("error");
          }
        };

        directionsService.route(
          {
            origin,
            destination,
            waypoints,
            travelMode: googleApi.maps.TravelMode.DRIVING,
          },
          (result, routeStatus) => {
            if (disposed) return;
            if (routeStatus === googleApi.maps.DirectionsStatus.OK && result) {
              directionsRenderer.setDirections(result);

              let totalDistanceMeters = 0;
              let totalDurationSeconds = 0;

              const route = result.routes[0];
              if (route?.legs) {
                for (const leg of route.legs) {
                  totalDistanceMeters += leg.distance?.value ?? 0;
                  totalDurationSeconds += leg.duration?.value ?? 0;
                }
              }

              setSummary({
                distanceKm: Number((totalDistanceMeters / 1000).toFixed(1)),
                durationMinutes: Math.round(totalDurationSeconds / 60),
              });
              setStatus("ready");
            } else {
              console.warn("Google Directions error (REQUEST_DENIED or unenabled), switching to OSRM road geometry:", routeStatus);
              void renderOsrmFallbackRoad();
            }
          }
        );
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
