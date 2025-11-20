import { Router } from "express";
import { randomUUID } from "crypto";
import { query } from "../db/pool";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth";
import { ensureCuratedJobsSeeded } from "../services/curated-job-service";

const router = Router();

// GET /api/companies - List all companies with job count
router.get("/", async (req, res, next) => {
  try {
    // Lazy-seed curated data if companies table is empty
    try {
      const existing = await query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM companies"
      );
      if (parseInt(existing.rows[0].count, 10) === 0) {
        await ensureCuratedJobsSeeded();
      }
    } catch (seedErr) {
      // Non-fatal; continue response path
      console.warn("Companies lazy seed check failed:", seedErr);
    }

    const { search, industry, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT 
        c.*,
        COUNT(j.id) as job_count
      FROM companies c
      LEFT JOIN jobs j ON c.id = j.company_id AND j.is_active = true
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (c.name ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (industry) {
      sql += ` AND c.industry ILIKE $${paramIndex}`;
      params.push(`%${industry}%`);
      paramIndex++;
    }

    sql += ` GROUP BY c.id ORDER BY job_count DESC, c.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), Number(offset));

    const result = await query(sql, params);

    // Count total for pagination
    let countSql = `SELECT COUNT(DISTINCT c.id) FROM companies c WHERE 1=1`;
    const countParams: any[] = [];
    let countIndex = 1;

    if (search) {
      countSql += ` AND (c.name ILIKE $${countIndex} OR c.description ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
      countIndex++;
    }

    if (industry) {
      countSql += ` AND c.industry ILIKE $${countIndex}`;
      countParams.push(`%${industry}%`);
      countIndex++;
    }

    const countResult = await query<{ count: string }>(countSql, countParams);
    const total = parseInt(countResult.rows[0].count);

    return res.json({
      companies: result.rows,
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

// GET /api/companies/:id - Get company details with all jobs
router.get("/:id", async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;

    const companyResult = await query(
      `SELECT * FROM companies WHERE id = $1`,
      [req.params.id]
    );

    if (!companyResult.rowCount) {
      return res.status(404).json({ error: "Company not found" });
    }

    const company = companyResult.rows[0];

    // Get all active jobs for this company
    const jobsResult = await query(
      `SELECT 
        j.*,
        c.name as company_name,
        c.website_url,
        c.logo_url,
        c.industry
      FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE j.company_id = $1 AND j.is_active = true
      ORDER BY j.posted_date DESC`,
      [req.params.id]
    );

    // Check if user is following this company (if authenticated)
    let isFollowing = false;
    if (userId) {
      const followResult = await query(
        `SELECT id FROM company_followers WHERE user_id = $1 AND company_id = $2`,
        [userId, req.params.id]
      );
      isFollowing = (followResult.rowCount || 0) > 0;
    }

    return res.json({
      company: {
        ...company,
        job_count: jobsResult.rowCount,
        is_following: isFollowing,
      },
      jobs: jobsResult.rows,
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/companies/:id/follow - Follow a company
router.post("/:id/follow", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    // Check if company exists
    const companyCheck = await query("SELECT id FROM companies WHERE id = $1", [req.params.id]);
    if (!companyCheck.rowCount) {
      return res.status(404).json({ error: "Company not found" });
    }

    const followId = randomUUID();

    try {
      await query(
        `INSERT INTO company_followers (id, user_id, company_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, company_id) DO NOTHING`,
        [followId, req.user!.id, req.params.id]
      );

      return res.status(201).json({ message: "Company followed successfully" });
    } catch (error: any) {
      if (error.code === "23505") {
        return res.json({ message: "Company already followed" });
      }
      throw error;
    }
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/companies/:id/follow - Unfollow a company
router.delete("/:id/follow", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await query(
      "DELETE FROM company_followers WHERE user_id = $1 AND company_id = $2",
      [req.user!.id, req.params.id]
    );

    return res.json({ message: "Company unfollowed successfully" });
  } catch (error) {
    return next(error);
  }
});

// GET /api/companies/user/following - Get user's followed companies
router.get("/user/following", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await query(
      `SELECT 
        cf.*,
        c.*,
        COUNT(j.id) as job_count
      FROM company_followers cf
      JOIN companies c ON cf.company_id = c.id
      LEFT JOIN jobs j ON c.id = j.company_id AND j.is_active = true
      WHERE cf.user_id = $1
      GROUP BY cf.id, c.id
      ORDER BY cf.followed_at DESC`,
      [req.user!.id]
    );

    return res.json({ companies: result.rows });
  } catch (error) {
    return next(error);
  }
});

export default router;
