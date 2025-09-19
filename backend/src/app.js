import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import api from "./router.js";
import { env } from "./config/env.js";
import { errorHandler } from "./core/http/error.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);             
      const allowed = env.corsOrigins || [];
      cb(null, allowed.length === 0 ? true : allowed.includes(origin));
    },
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "Accept",
      "X-Requested-With"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    optionsSuccessStatus: 204,
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/v1", api);

// Handler cuối cùng
app.use(errorHandler);

export default app;
