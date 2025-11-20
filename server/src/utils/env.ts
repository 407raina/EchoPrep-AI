import dotenv from "dotenv";

dotenv.config();

const parseOrigins = (value?: string): string[] =>
  value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigins: parseOrigins(process.env.CLIENT_URL),
  neonDatabaseUrl: process.env.NEON_DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  groqApiKey: process.env.GROQ_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiRealtimeModel: process.env.OPENAI_REALTIME_MODEL ?? "gpt-4o-realtime-preview-2024-10-01",
};

export const assertEnv = () => {
  const required: Array<[keyof typeof env, string]> = [
    ["neonDatabaseUrl", "NEON_DATABASE_URL"],
    ["jwtSecret", "JWT_SECRET"],
  ];

  const missing = required
    .filter(([key]) => !env[key])
    .map(([, label]) => label);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};
