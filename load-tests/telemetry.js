import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const RATE = Number(__ENV.RATE || 2000);
const DURATION = __ENV.DURATION || "30s";
const RUN_ID = __ENV.RUN_ID || "loadtest";
const VEHICLES = 500;

const readingsAccepted = new Counter("readings_accepted");

export const options = {
  scenarios: {
    ingest: {
      executor: "constant-arrival-rate",
      rate: RATE,
      timeUnit: "1s",
      duration: DURATION,
      preAllocatedVUs: 200,
      maxVUs: 1000,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.001"],
    http_req_duration: ["p(95)<200"],
  },
};

export default function () {
  const vehicle = Math.floor(Math.random() * VEHICLES);

  const payload = JSON.stringify([
    {
      vehicleId: `LT-${RUN_ID}-${vehicle}`,
      latitude: 12.9 + Math.random() * 0.2,
      longitude: 77.5 + Math.random() * 0.2,
      timestamp: new Date().toISOString(),
    },
  ]);

  const res = http.post(`${BASE_URL}/api/telemetry`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  const ok = check(res, { "status is 202": (r) => r.status === 202 });
  if (ok) {
    readingsAccepted.add(1);
  }
}
export function handleSummary(data) {
  const get = (name) => {
    const m = data.metrics[name];
    return m ? m.values || m : {};
  };

  const failed = get("http_req_failed");
  const duration = get("http_req_duration");

  const summary = {
    requests: get("http_reqs").count || 0,
    accepted: get("readings_accepted").count || 0,
    failedPercent: (failed.rate ?? failed.value ?? 0) * 100,
    avgMs: duration.avg || 0,
    p95Ms: duration["p(95)"] || 0,
    dropped: get("dropped_iterations").count || 0,
  };

  return {
    "load-tests/last-run.json": JSON.stringify(summary),
    stdout: "\nk6 test finished.\n",
  };
}