
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 10 },
    { duration: "30s", target: 25 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function () {
  const url = "http://localhost:4000/api/telemetry";

  const payload = JSON.stringify({
    vehicleId: `VH${__VU}`,
    latitude: 11.0168,
    longitude: 76.9558,
    timestamp: new Date().toISOString(),
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = http.post(url, payload, params);

  check(response, {
    "status is 202": (res) => res.status === 202,
    "telemetry processed": (res) => {
      try {
        return JSON.parse(res.body).success === true;
      } catch {
        return false;
      }
    },
  });

  sleep(0.1);
}
