import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pinoHttp } from "pino-http";
import { pino } from "pino";
import { authRouter } from "./routes/auth.js";

dotenv.config();

const logger = pino({ level: process.env.LOG_LEVEL || "info" });
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "auth-service" });
});

app.use("/", authRouter);
app.use("/api/auth", authRouter);

app.listen(PORT, () => {
  logger.info(`Auth service listening on port ${PORT}`);
});
