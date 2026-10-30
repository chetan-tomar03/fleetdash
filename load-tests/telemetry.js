import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const RATE = Number(__ENV.RATE || 2000);
const DURATION = __ENV.DURATION || "30s";
const RUN_ID = __ENV.RUN_ID || "loadtest";
const VEHICLES = Number(__ENV.VEHICLES || 500);
const BATCH_SIZE = Number(__ENV.BATCH_SIZE || 1);
const PRE_ALLOCATED_VUS = Number(__ENV.PRE_ALLOCATED_VUS || 500);
const MAX_VUS = Number(__ENV.MAX_VUS || 2000);
const HTTP_TIMEOUT = __ENV.HTTP_TIMEOUT || "5s";
const PARSE_RESPONSE = __ENV.PARSE_RESPONSE !== "false";

if (!Number.isInteger(RATE) || RATE <= 0) {
  throw new Error("RATE must be a positive integer");
}

if (!Number.isInteger(VEHICLES) || VEHICLES <= 0) {
  throw new Error("VEHICLES must be a positive integer");
}

if (!Number.isInteger(BATCH_SIZE) || BATCH_SIZE <= 0) {
  throw new Error("BATCH_SIZE must be a positive integer");
}

if (!/^\d+(\.\d+)?(ms|s|m|h)$/.test(DURATION)) {
  throw new Error("DURATION must use a k6 duration such as 30s, 1m, or 250ms");
}

if (!Number.isInteger(PRE_ALLOCATED_VUS) || PRE_ALLOCATED_VUS <= 0) {
  throw new Error("PRE_ALLOCATED_VUS must be a positive integer");
}

if (!Number.isInteger(MAX_VUS) || MAX_VUS < PRE_ALLOCATED_VUS) {
  throw new Error("MAX_VUS must be an integer greater than or equal to PRE_ALLOCATED_VUS");
}

function durationToSeconds(text) {
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h)$/.exec(text);
  if (!match) return 0;
  const factor = { ms: 0.001, s: 1, m: 60, h: 3600 };
  return Number(match[1]) * factor[match[2]];
}

const readingsAccepted = new Counter("readings_accepted");
const requestsAccepted = new Counter("requests_accepted");

export const options = {
  scenarios: {
    ingest: {
      executor: "constant-arrival-rate",
      rate: RATE,
      timeUnit: "1s",
      duration: DURATION,
      preAllocatedVUs: PRE_ALLOCATED_VUS,
      maxVUs: MAX_VUS,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.001"],
    http_req_duration: ["p(95)<200"],
  },
};

export default function () {
  const readings = [];
  for (let index = 0; index < BATCH_SIZE; index += 1) {
    const vehicle = Math.floor(Math.random() * VEHICLES);
    readings.push({
      vehicleId: `LT-${RUN_ID}-${vehicle}`,
      latitude: 12.9 + Math.random() * 0.2,
      longitude: 77.5 + Math.random() * 0.2,
      timestamp: new Date().toISOString(),
    });
  }

  const payload = JSON.stringify(readings);

  const res = http.post(`${BASE_URL}/api/telemetry`, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: HTTP_TIMEOUT,
  });

  let body = {};
  if (PARSE_RESPONSE && res.status === 202) {
    try {
      body = res.json();
    } catch {
      body = {};
    }
  }

  const validCount = PARSE_RESPONSE ? Number(body.validCount || 0) : BATCH_SIZE;
  const ok = check(res, {
    "status is 202": (r) => r.status === 202,
    "server accepted payload": () => !PARSE_RESPONSE || (body.success === true && validCount > 0),
  });
  if (ok) {
    requestsAccepted.add(1);
    readingsAccepted.add(validCount);
  }
}
export function handleSummary(data) {
  const get = (name) => {
    const m = data.metrics[name];
    return m ? m.values || m : {};
  };

  const failed = get("http_req_failed");
  const duration = get("http_req_duration");
  const durationSeconds = durationToSeconds(DURATION);
  const totalRunSeconds = (data.state?.testRunDurationMs || 0) / 1000;
  const requests = get("http_reqs").count || 0;

  const summary = {
    runId: RUN_ID,
    targetRate: RATE,
    durationSeconds,
    totalRunSeconds,
    requests,
    accepted: get("readings_accepted").count || 0,
    acceptedRequests: get("requests_accepted").count || 0,
    achievedRate: durationSeconds > 0 ? requests / durationSeconds : 0,
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
