import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "@neondatabase/serverless";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

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
    // Run migration 002_interview_qna.sql
    const migrationPath = path.resolve(__dirname, "../migrations/002_interview_qna.sql");
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    const sql = await fs.readFile(migrationPath, "utf-8");
    
    console.log("🚀 Running migration 002_interview_qna.sql...");
    await pool.query(sql);
    
    console.log("✅ Migration completed successfully!");
    console.log("\nNew tables created:");
    console.log("  - interview_questions");
    console.log("  - interview_answers");
    console.log("\nEnhancements:");
    console.log("  - Added metadata column to interview_sessions");
    console.log("  - Created indexes for performance");
  } catch (error) {
    console.error("❌ Error running migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();
