import { Router } from "express";
import fs from "fs/promises";
import fsSync from "fs";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { z } from "zod";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth";
import { query } from "../db/pool";
import { analyzeResume } from "../services/resume-analysis-service";

const router = Router();

const uploadsPath = path.resolve(process.cwd(), "server", "uploads", "resumes");

// Ensure uploads directory exists
fsSync.mkdirSync(uploadsPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsPath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (allowed.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error("Unsupported file type. Only DOCX files are supported."));
  },
});

const analysisSchema = z.object({
  overallScore: z.number().int().min(0).max(100).nullable().optional(),
  atsScore: z.number().int().min(0).max(100).nullable().optional(),
  strengths: z.array(z.string()).optional(),
  improvements: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
});

router.post("/", requireAuth, upload.single("file"), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required" });
    }

    const resumeId = randomUUID();
    const filePath = path.join(uploadsPath, req.file.filename);

    // Analyze the resume
    let analysis;
    try {
      analysis = await analyzeResume(filePath);
    } catch (error) {
      console.error("Resume analysis failed:", error);
      // Clean up file
      await fs.unlink(filePath).catch(() => {});
      return res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to analyze resume. Please ensure it's a valid DOCX file with readable text." 
      });
    }

    const insertResult = await query(
      `INSERT INTO resumes (id, user_id, file_name, file_path, file_size, analysis_results, overall_score, ats_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_id, file_name, file_path, file_size, analysis_results, overall_score, ats_score, created_at, updated_at`,
      [
        resumeId,
        req.user!.id,
        req.file.originalname,
        req.file.filename,
        req.file.size,
        analysis,
        analysis.overallScore,
        analysis.atsScore,
      ]
    );

    return res.status(201).json({ 
      resume: insertResult.rows[0],
      analysis: analysis 
    });
  } catch (error) {
    // Clean up uploaded file if database insert fails
    if (req.file) {
      try {
        await fs.unlink(path.join(uploadsPath, req.file.filename));
      } catch (unlinkError) {
        console.error("Failed to clean up file:", unlinkError);
      }
    }

    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: "Invalid analysis payload" });
    }
    
    // Handle foreign key constraint violation (user doesn't exist)
    if ((error as any)?.code === '23503') {
      return res.status(401).json({ error: "Your session has expired. Please log in again." });
    }
    
    return next(error);
  }
});

// List resumes for current user
router.get("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await query(
      `SELECT id, user_id, file_name, file_path, file_size, analysis_results, overall_score, ats_score, created_at, updated_at
       FROM resumes
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user!.id]
    );

    return res.json({ resumes: result.rows });
  } catch (error) {
    return next(error);
  }
});

// Get a single resume by id
router.get("/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await query(
      `SELECT id, user_id, file_name, file_path, file_size, analysis_results, overall_score, ats_score, created_at, updated_at
       FROM resumes
       WHERE user_id = $1 AND id = $2
       LIMIT 1`,
      [req.user!.id, req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Resume not found" });
    }

    return res.json({ resume: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

// Delete a resume and its file
router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    // Retrieve resume to get file path
    const found = await query<{ file_path: string }>(
      `SELECT file_path FROM resumes WHERE user_id = $1 AND id = $2`,
      [req.user!.id, req.params.id]
    );

    if (!found.rowCount) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const filePath = path.resolve(uploadsPath, found.rows[0].file_path);

    // Delete DB record first
    await query(`DELETE FROM resumes WHERE user_id = $1 AND id = $2`, [req.user!.id, req.params.id]);

    // Attempt to remove file; ignore if missing
    try {
      await fs.unlink(filePath);
    } catch (_err) {
      // ignore file deletion errors (file may not exist)
    }

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
