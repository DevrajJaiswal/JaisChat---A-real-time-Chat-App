import express from "express";
import cors from "cors";
import { requireAuth } from "./middleware/requireAuth.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
  })
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "JaisChat API is running",
  });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      firebaseUid: req.auth.uid,
      phoneNumber: req.auth.phone_number ?? null,
    },
  });
});

export default app;
