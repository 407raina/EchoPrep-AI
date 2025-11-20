import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const main = async () => {
  const dbUrl = process.env.NEON_DATABASE_URL;

  if (!dbUrl || dbUrl.includes("USER:PASSWORD@HOST")) {
    console.error("❌ Error: NEON_DATABASE_URL is not configured in .env file");
    console.error("Please update your .env file with a valid Neon Postgres connection string");
    process.exit(1);
  }

  console.log("🔌 Connecting to database...");
  const pool = new Pool({ connectionString: dbUrl });

  try {
    const migrationPath = path.resolve(__dirname, "../migrations/003_add_audio_column.sql");
    console.log(`📄 Reading migration file: ${migrationPath}`);

    const sql = await fs.readFile(migrationPath, "utf-8");

    console.log("🚀 Running migration 003_add_audio_column.sql...");
    await pool.query(sql);

    console.log("✅ Migration completed successfully!");
    console.log("\nEnhancements:");
    console.log("  - Added optional audio_file_path column to interview_answers");
    console.log("  - Created index for faster lookups when serving stored audio");
  } catch (error) {
    console.error("❌ Error running migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();
