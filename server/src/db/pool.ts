import { Pool, neonConfig, QueryResultRow } from "@neondatabase/serverless";
import { assertEnv, env } from "../utils/env";

assertEnv();

// This option is now always true, but setting it explicitly prevents the warning
neonConfig.fetchConnectionCache = true;

export const pool = new Pool({
  connectionString: env.neonDatabaseUrl,
  max: 5,
});

export const query = async <T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) => {
  try {
    const result = await pool.query<T>(sql, params);
    return result;
  } catch (error) {
    console.error("Database query error:", error);
    console.error("SQL:", sql);
    console.error("Params:", params);
    throw error;
  }
};
