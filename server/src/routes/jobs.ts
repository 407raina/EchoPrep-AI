import { Router } from "express";
import { randomUUID } from "crypto";
import { query } from "../db/pool";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth";
import { ensureCuratedJobsSeeded, seedCuratedJobs } from "../services/curated-job-service";

const router = Router();

// GET /api/jobs - List jobs with filters
router.get("/", async (req, res, next) => {
  try {
    await ensureCuratedJobsSeeded();

    const { search, location, job_type, experience_level, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT 
        j.*,
        c.name as company_name,
        c.website_url,
        c.logo_url,
        c.industry
      FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE j.is_active = true
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (j.title ILIKE $${paramIndex} OR j.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (location) {
      sql += ` AND j.location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    if (job_type) {
      sql += ` AND j.job_type = $${paramIndex}`;
      params.push(job_type);
      paramIndex++;
    }

    if (experience_level) {
      sql += ` AND j.experience_level = $${paramIndex}`;
      params.push(experience_level);
      paramIndex++;
    }

    sql += ` ORDER BY j.posted_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), Number(offset));

    const result = await query(sql, params);

    // Count total for pagination
    let countSql = `SELECT COUNT(*) FROM jobs j WHERE j.is_active = true`;
    const countParams: any[] = [];
    let countIndex = 1;

    if (search) {
      countSql += ` AND (j.title ILIKE $${countIndex} OR j.description ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
      countIndex++;
    }

    if (location) {
      countSql += ` AND j.location ILIKE $${countIndex}`;
      countParams.push(`%${location}%`);
      countIndex++;
    }

    if (job_type) {
      countSql += ` AND j.job_type = $${countIndex}`;
      countParams.push(job_type);
      countIndex++;
    }

    if (experience_level) {
      countSql += ` AND j.experience_level = $${countIndex}`;
      countParams.push(experience_level);
      countIndex++;
    }

    const countResult = await query<{ count: string }>(countSql, countParams);
    const total = parseInt(countResult.rows[0].count);

    return res.json({
      jobs: result.rows,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + result.rows.length < total,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/jobs/:id - Get single job details
router.get("/:id", async (req, res, next) => {
  try {
    await ensureCuratedJobsSeeded();

    const result = await query(
      `SELECT 
        j.*,
        c.name as company_name,
        c.website_url,
        c.logo_url,
        c.industry,
        c.description as company_description,
        c.size as company_size
      FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE j.id = $1 AND j.is_active = true`,
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Job not found" });
    }

    return res.json({ job: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

// POST /api/jobs/sync - Refresh curated jobs dataset
router.post("/sync", async (req, res, next) => {
  try {
    await seedCuratedJobs();
    return res.json({ message: "Curated jobs refreshed" });
  } catch (error) {
    return next(error);
  }
});

// POST /api/jobs/:id/save - Save a job
router.post("/:id/save", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { notes } = req.body;

    // Check if job exists
    const jobCheck = await query("SELECT id FROM jobs WHERE id = $1", [req.params.id]);
    if (!jobCheck.rowCount) {
      return res.status(404).json({ error: "Job not found" });
    }

    const savedJobId = randomUUID();

    try {
      await query(
        `INSERT INTO saved_jobs (id, user_id, job_id, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, job_id) DO UPDATE SET notes = $3`,
        [savedJobId, req.user!.id, req.params.id, notes || null]
      );

      return res.status(201).json({ message: "Job saved successfully" });
    } catch (error: any) {
      if (error.code === "23505") {
        return res.json({ message: "Job already saved" });
      }
      throw error;
    }
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/jobs/:id/save - Unsave a job
router.delete("/:id/save", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await query(
      "DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2",
      [req.user!.id, req.params.id]
    );

    return res.json({ message: "Job removed from saved list" });
  } catch (error) {
    return next(error);
  }
});

// GET /api/jobs/saved - Get user's saved jobs
router.get("/user/saved", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await query(
      `SELECT 
        sj.*,
        j.*,
        c.name as company_name,
        c.website_url,
        c.logo_url
      FROM saved_jobs sj
      JOIN jobs j ON sj.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      WHERE sj.user_id = $1
      ORDER BY sj.saved_at DESC`,
      [req.user!.id]
    );

    return res.json({ jobs: result.rows });
  } catch (error) {
    return next(error);
  }
});

// POST /api/jobs/:id/apply - Apply for a job
router.post("/:id/apply", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { resume_id, cover_letter } = req.body;

    // Check if job exists
    const jobCheck = await query("SELECT id FROM jobs WHERE id = $1", [req.params.id]);
    if (!jobCheck.rowCount) {
      return res.status(404).json({ error: "Job not found" });
    }

    const applicationId = randomUUID();

    try {
      await query(
        `INSERT INTO job_applications (id, user_id, job_id, resume_id, cover_letter, status)
         VALUES ($1, $2, $3, $4, $5, 'submitted')`,
        [applicationId, req.user!.id, req.params.id, resume_id || null, cover_letter || null]
      );

      return res.status(201).json({ 
        message: "Application submitted successfully",
        application_id: applicationId 
      });
    } catch (error: any) {
      // Handle foreign key constraint violation (user doesn't exist)
      if (error?.code === '23503') {
        return res.status(401).json({ error: "Your session has expired. Please log in again." });
      }
      throw error;
    }
  } catch (error) {
    return next(error);
  }
});

// GET /api/jobs/user/applications - Get user's applications
router.get("/user/applications", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await query(
      `SELECT 
        ja.*,
        j.title as job_title,
        j.location as job_location,
        c.name as company_name,
        c.logo_url
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      WHERE ja.user_id = $1
      ORDER BY ja.applied_at DESC`,
      [req.user!.id]
    );

    return res.json({ applications: result.rows });
  } catch (error) {
    return next(error);
  }
});

export default router;
