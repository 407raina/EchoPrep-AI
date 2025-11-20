import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.NEON_DATABASE_URL!);

async function resetDatabase() {
  console.log("🗑️  Dropping all tables...");

  try {
    await sql`DROP TABLE IF EXISTS company_followers CASCADE`;
    await sql`DROP TABLE IF EXISTS job_applications CASCADE`;
    await sql`DROP TABLE IF EXISTS saved_jobs CASCADE`;
    await sql`DROP TABLE IF EXISTS interview_answers CASCADE`;
    await sql`DROP TABLE IF EXISTS interview_questions CASCADE`;
    await sql`DROP TABLE IF EXISTS interview_sessions CASCADE`;
    await sql`DROP TABLE IF EXISTS resumes CASCADE`;
    await sql`DROP TABLE IF EXISTS jobs CASCADE`;
    await sql`DROP TABLE IF EXISTS companies CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    await sql`DROP FUNCTION IF EXISTS update_updated_at() CASCADE`;

    console.log("✅ All tables dropped successfully!");
    console.log("Now run: npm run db:init");
  } catch (error) {
    console.error("❌ Error dropping tables:", error);
    process.exit(1);
  }

  process.exit(0);
}

resetDatabase();
