import { createClient } from "redis";

const redisClient = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
});

redisClient.on("error", (error) => {
  console.error("Redis Publisher Error:", error.message);
});

// Separate connection for subscribing
export const redisSubscriber = redisClient.duplicate();

redisSubscriber.on("error", (error) => {
  console.error("Redis Subscriber Error:", error.message);
});

export async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  if (!redisSubscriber.isOpen) {
    await redisSubscriber.connect();
  }

  console.log("FleetDash Redis publisher connected");
  console.log("FleetDash Redis subscriber connected");
}

export default redisClient;