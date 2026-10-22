import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/db";

const PORT = Number(process.env.PORT) || 4000;

async function startServer(): Promise<void> {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`FleetDash backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start FleetDash backend:", error);
    process.exit(1);
  }
}

startServer();