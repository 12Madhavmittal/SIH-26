/**
 * Annadata Direct — IoT Cold-Chain & Vehicle Telematics Engine
 *
 * Simulates and ingests real-time reefer container telemetry:
 * - Temperature (°C) with perishable threshold breach detection
 * - Relative Humidity (%)
 * - Reefer door status (open/closed)
 * - GPS latitude/longitude live ping
 */

export interface TelemetryReading {
  sensorId: string;
  tripCode: string;
  temperatureCelsius: number;
  humidityPercent: number;
  doorOpen: boolean;
  batteryPercent: number;
  gpsLat: number;
  gpsLng: number;
  isAlertBreached: boolean;
  timestamp: string;
}

export interface ColdChainAlert {
  alertId: string;
  tripCode: string;
  sensorId: string;
  alertType: "TEMP_HIGH" | "TEMP_CRITICAL" | "DOOR_AJAR" | "LOW_BATTERY";
  message: string;
  recordedValue: number;
  thresholdValue: number;
  timestamp: string;
}

const memoryTelemetryLogs = new Map<string, TelemetryReading[]>();
const memoryAlerts: ColdChainAlert[] = [];

export function recordTelemetryReading(input: {
  sensorId: string;
  tripCode: string;
  temperatureCelsius: number;
  humidityPercent: number;
  doorOpen: boolean;
  batteryPercent?: number;
  gpsLat: number;
  gpsLng: number;
}): TelemetryReading {
  // Ideal cold-chain perishable transit range: 4°C - 10°C (tomato/fruits)
  const isAlertBreached = input.temperatureCelsius > 12.0 || input.temperatureCelsius < 2.0 || input.doorOpen;

  const reading: TelemetryReading = {
    sensorId: input.sensorId,
    tripCode: input.tripCode,
    temperatureCelsius: Number(input.temperatureCelsius.toFixed(1)),
    humidityPercent: Number(input.humidityPercent.toFixed(1)),
    doorOpen: input.doorOpen,
    batteryPercent: input.batteryPercent ?? 98,
    gpsLat: input.gpsLat,
    gpsLng: input.gpsLng,
    isAlertBreached,
    timestamp: new Date().toISOString(),
  };

  const logs = memoryTelemetryLogs.get(input.tripCode) ?? [];
  logs.push(reading);
  memoryTelemetryLogs.set(input.tripCode, logs);

  if (isAlertBreached) {
    memoryAlerts.unshift({
      alertId: `ALT-${Date.now()}`,
      tripCode: input.tripCode,
      sensorId: input.sensorId,
      alertType: input.doorOpen ? "DOOR_AJAR" : input.temperatureCelsius > 15 ? "TEMP_CRITICAL" : "TEMP_HIGH",
      message: input.doorOpen
        ? "Reefer door open during transit!"
        : `Temperature breach: ${input.temperatureCelsius}°C exceeds 12.0°C maximum threshold.`,
      recordedValue: input.temperatureCelsius,
      thresholdValue: 12.0,
      timestamp: new Date().toISOString(),
    });
  }

  return reading;
}

export function getTripTelemetry(tripCode: string): TelemetryReading[] {
  const existing = memoryTelemetryLogs.get(tripCode);
  if (existing && existing.length > 0) return existing;

  // Generate synthetic telemetry timeline for demonstration
  const baseLat = 12.5104;
  const baseLng = 78.2137;
  const destLat = 12.9906;
  const destLng = 80.2206;

  const readings: TelemetryReading[] = [];
  const count = 12;

  for (let i = 0; i < count; i++) {
    const fraction = i / (count - 1);
    const lat = Number((baseLat + (destLat - baseLat) * fraction).toFixed(4));
    const lng = Number((baseLng + (destLng - baseLng) * fraction).toFixed(4));
    const temp = Number((6.2 + Math.sin(i / 2) * 1.8).toFixed(1));
    const humidity = Number((85 + Math.cos(i) * 4).toFixed(1));

    readings.push({
      sensorId: `REEFER-IOT-09`,
      tripCode,
      temperatureCelsius: temp,
      humidityPercent: humidity,
      doorOpen: i === 6, // simulated brief door open at waypoint check
      batteryPercent: Math.max(70, 100 - i * 2),
      gpsLat: lat,
      gpsLng: lng,
      isAlertBreached: temp > 12 || i === 6,
      timestamp: new Date(Date.now() - (count - i) * 15 * 60 * 1000).toISOString(),
    });
  }
  memoryTelemetryLogs.set(tripCode, readings);
  return readings;
}

export function getActiveAlerts(): ColdChainAlert[] {
  return memoryAlerts.slice(0, 50);
}
