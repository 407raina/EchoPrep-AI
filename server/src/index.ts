import path from "path";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env, assertEnv } from "./utils/env";
import authRouter from "./routes/auth";
import interviewRouter from "./routes/interviews";
import resumeRouter from "./routes/resumes";
import aiRouter from "./routes/ai";
import jobsRouter from "./routes/jobs";
import companiesRouter from "./routes/companies";

assertEnv();

const app = express();

const allowedOrigins = env.clientOrigins.length > 0 
  ? env.clientOrigins 
  : ["http://localhost:8080", "http://localhost:5173", "http://localhost:8081", "http://localhost:8082"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(
  "/uploads/resumes",
  express.static(path.resolve(process.cwd(), "server", "uploads", "resumes"))
);
app.use(
  "/uploads/interview-audio",
  express.static(path.resolve(process.cwd(), "server", "uploads", "interview-audio"))
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/interviews", interviewRouter);
app.use("/api/resumes", resumeRouter);
app.use("/api/ai", aiRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/companies", companiesRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (res.headersSent) {
    return;
  }
  return res.status(500).json({ error: "Internal server error" });
});

const port = env.port;

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
