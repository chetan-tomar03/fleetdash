import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "FleetDash backend is running",
  });
});

app.listen(PORT, () => {
  console.log(`FleetDash backend running on port ${PORT}`);
});