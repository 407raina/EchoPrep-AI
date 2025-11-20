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
    // Run migration 001_init.sql
    const migration1Path = path.resolve(__dirname, "../migrations/001_init.sql");
    console.log(`📄 Reading migration file: ${migration1Path}`);
    
    const sql1 = await fs.readFile(migration1Path, "utf-8");
    
    console.log("🚀 Running migration 001_init.sql...");
    await pool.query(sql1);
    
    console.log("✅ Migration 001_init.sql completed!");
    
    // Run migration 002_interview_qna.sql
    const migration2Path = path.resolve(__dirname, "../migrations/002_interview_qna.sql");
    console.log(`📄 Reading migration file: ${migration2Path}`);
    
    const sql2 = await fs.readFile(migration2Path, "utf-8");
    
    console.log("🚀 Running migration 002_interview_qna.sql...");
    await pool.query(sql2);
    
    console.log("✅ Migration 002_interview_qna.sql completed!");
    
  // Run migration 003_add_audio_column.sql
  const migration3Path = path.resolve(__dirname, "../migrations/003_add_audio_column.sql");
  console.log(`📄 Reading migration file: ${migration3Path}`);
  const sql3 = await fs.readFile(migration3Path, "utf-8");
  console.log("🚀 Running migration 003_add_audio_column.sql...");
  await pool.query(sql3);
  console.log("✅ Migration 003_add_audio_column.sql completed!");

    console.log("\n✅ Database initialized successfully!");
    console.log("\nTables created:");
    console.log("  - users");
    console.log("  - interview_sessions");
    console.log("  - interview_questions (NEW)");
    console.log("  - interview_answers (NEW)");
    console.log("  - resumes");
    console.log("  - jobs");
    console.log("  - companies");
    console.log("  - saved_jobs");
    console.log("  - job_applications");
    console.log("  - interview_answers.audio_file_path (NEW)");
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();
