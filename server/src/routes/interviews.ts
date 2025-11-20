import { Router } from "express";
import fs from "fs";
import path from "path";
import { z } from "zod";
import multer from "multer";
import { randomUUID } from "crypto";
import { query } from "../db/pool";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth";
import { 
  createInterviewSession,
  updateInterviewMetadata,
  getInterviewMetadata,
  InterviewPhase 
} from "../services/interview-service";
import {
  generateInterviewQuestions,
  createInterviewQuestion,
  createInterviewAnswer,
  getSessionQuestions,
  getSessionAnswers,
  generateInterviewFeedback,
  completeInterviewWithFeedback,
} from "../services/ai-interview-service";
import { env } from "../utils/env";

const router = Router();

const createSessionSchema = z.object({
  interviewType: z.string().min(1).default("AI Voice Interview"),
  jobId: z.string().uuid().optional(),
});

const updateSessionSchema = z.object({
  transcript: z.array(z.string()).optional(),
  status: z.string().optional(),
  feedback: z.record(z.any()).nullable().optional(),
  score: z.number().min(0).max(100).nullable().optional(),
  duration: z.number().int().nonnegative().nullable().optional(),
});

const updateMetadataSchema = z.object({
  jobRole: z.string().optional(),
  experienceLevel: z.string().optional(),
  phase: z.enum(['intro', 'collecting_info', 'interviewing', 'completed']).optional(),
  questionsAsked: z.number().optional(),
});

router.use(requireAuth);

// GET /api/interviews - List user's interview sessions
router.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await query(
      `SELECT id, user_id, job_id, interview_type, duration, transcript, feedback, score, status, created_at, completed_at
       FROM interview_sessions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user!.id]
    );

    return res.json({ sessions: result.rows });
  } catch (error) {
    return next(error);
  }
});

// POST /api/interviews - Create new interview session
router.post("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsed = createSessionSchema.parse({
      interviewType: req.body.interview_type ?? req.body.interviewType,
      jobId: req.body.job_id ?? req.body.jobId,
    });

    const session = await createInterviewSession(req.user!.id, parsed.interviewType);

    // If job_id provided, link it to the session
    if (parsed.jobId) {
      await query(
        `UPDATE interview_sessions SET job_id = $1 WHERE id = $2`,
        [parsed.jobId, session.id]
      );
      session.job_id = parsed.jobId;
    }

    return res.status(201).json({ session });
  } catch (error) {
    return next(error);
  }
});

// GET /api/interviews/:id - Get single interview session
router.get("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await query(
      `SELECT 
        is.*,
        j.title as job_title,
        c.name as company_name
       FROM interview_sessions is
       LEFT JOIN jobs j ON is.job_id = j.id
       LEFT JOIN companies c ON j.company_id = c.id
       WHERE is.user_id = $1 AND is.id = $2
       LIMIT 1`,
      [req.user!.id, req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    return res.json({ session: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

// GET /api/interviews/:id/metadata - Get interview metadata
router.get("/:id/metadata", async (req: AuthenticatedRequest, res, next) => {
  try {
    const metadata = await getInterviewMetadata(req.params.id, req.user!.id);

    if (!metadata) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    return res.json({ metadata });
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/interviews/:id/metadata - Update interview metadata
router.patch("/:id/metadata", async (req: AuthenticatedRequest, res, next) => {
  try {
    const updates = updateMetadataSchema.parse(req.body);

    const metadata = await updateInterviewMetadata(
      req.params.id,
      req.user!.id,
      updates
    );

    return res.json({ metadata });
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/interviews/:id - Update interview session
router.patch("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const updates = updateSessionSchema.parse(req.body);

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 3;

    if (updates.transcript) {
      setClauses.push(`transcript = jsonb_set(transcript, '{messages}', $${paramIndex})`);
      values.push(JSON.stringify(updates.transcript));
      paramIndex++;
    }

    if (updates.status) {
      setClauses.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;

      if (updates.status === "completed") {
        setClauses.push(`completed_at = $${paramIndex}`);
        values.push(new Date().toISOString());
        paramIndex++;
      }
    }

    if (updates.feedback !== undefined) {
      setClauses.push(`feedback = $${paramIndex}`);
      values.push(updates.feedback);
      paramIndex++;
    }

    if (updates.score !== undefined) {
      setClauses.push(`score = $${paramIndex}`);
      values.push(updates.score);
      paramIndex++;
    }

    if (updates.duration !== undefined) {
      setClauses.push(`duration = $${paramIndex}`);
      values.push(updates.duration);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    const result = await query(
      `UPDATE interview_sessions
       SET ${setClauses.join(", ")}
       WHERE user_id = $1 AND id = $2
       RETURNING id, user_id, job_id, interview_type, duration, transcript, feedback, score, status, created_at, completed_at`,
      [req.user!.id, req.params.id, ...values]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    return res.json({ session: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

// ==========================================
// NEW AI-DRIVEN INTERVIEW ENDPOINTS
// ==========================================

const startInterviewSchema = z.object({
  interviewType: z.string().optional().default("AI Interview"),
  jobId: z.string().uuid().optional(),
  jobRole: z.string().min(1),
  experienceLevel: z.string().min(1),
});

const submitAnswerSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  answerText: z.string().min(1),
  transcriptionConfidence: z
    .preprocess((val) => {
      if (val === undefined || val === null || val === "") {
        return undefined;
      }
      const parsed = Number(val);
      return Number.isNaN(parsed) ? undefined : parsed;
    }, z.number().min(0).max(1).optional()),
  audioDuration: z
    .preprocess((val) => {
      if (val === undefined || val === null || val === "") {
        return undefined;
      }
      const parsed = Number.parseInt(String(val), 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    }, z.number().int().nonnegative().optional()),
});

const generateFeedbackSchema = z.object({
  sessionId: z.string().uuid(),
});

const audioUploadsPath = path.resolve(process.cwd(), "server", "uploads", "interview-audio");
fs.mkdirSync(audioUploadsPath, { recursive: true });

const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, audioUploadsPath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".webm";
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const allowedAudioTypes = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/mp4",
]);

const audioUpload = multer({
  storage: audioStorage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (allowedAudioTypes.has(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error("Unsupported audio format"));
  },
});

/**
 * POST /api/interviews/start
 * Start a new AI interview with role-specific questions
 */
router.post("/start", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { interviewType, jobId, jobRole, experienceLevel } = startInterviewSchema.parse(req.body);

    if (!env.groqApiKey) {
      return res.status(500).json({ error: "AI service not configured" });
    }

    // Create interview session
    const session = await createInterviewSession(req.user!.id, interviewType);

    // Update metadata with job info
    await query(
      `UPDATE interview_sessions 
       SET metadata = $1, job_id = $2
       WHERE id = $3`,
      [
        JSON.stringify({
          jobRole,
          experienceLevel,
          questionsAsked: 0,
          currentQuestionNumber: 1,
          totalQuestions: 7,
          startTime: new Date().toISOString(),
          phase: 'interviewing',
        }),
        jobId || null,
        session.id,
      ]
    );

    // Generate interview questions
    const generatedQuestions = await generateInterviewQuestions(
      {
        jobRole,
        experienceLevel,
        numberOfQuestions: 7,
      },
      env.groqApiKey
    );

    // Store questions in database
    const storedQuestions = [];
    for (let i = 0; i < generatedQuestions.length; i++) {
      const question = await createInterviewQuestion({
        interview_session_id: session.id,
        question_number: i + 1,
        question_text: generatedQuestions[i].question_text,
        category: generatedQuestions[i].category,
        difficulty: generatedQuestions[i].difficulty,
      });
      storedQuestions.push(question);
    }

    // Get updated session with metadata
    const updatedSession = await query(
      `SELECT * FROM interview_sessions WHERE id = $1`,
      [session.id]
    );

    // Return session and first question
    const sessionData = updatedSession.rows[0];
    const sessionMetadata = typeof sessionData.metadata === 'string' 
      ? JSON.parse(sessionData.metadata) 
      : sessionData.metadata || {};

    return res.status(201).json({
      session: {
        ...sessionData,
        metadata: sessionMetadata,
      },
      firstQuestion: storedQuestions[0],
      totalQuestions: storedQuestions.length,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/interviews/submit-answer
 * Submit an answer to a question and get the next question
 */
router.post("/submit-answer", audioUpload.single("audio"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const rawPayload = req.is("multipart/form-data")
      ? {
          sessionId: req.body.sessionId,
          questionId: req.body.questionId,
          answerText: req.body.answerText,
          transcriptionConfidence: req.body.transcriptionConfidence,
          audioDuration: req.body.audioDuration,
        }
      : req.body;

    const {
      sessionId,
      questionId,
      answerText,
      transcriptionConfidence,
      audioDuration,
    } = submitAnswerSchema.parse(rawPayload);

    // Verify session belongs to user
    const sessionCheck = await query(
      `SELECT id, metadata FROM interview_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, req.user!.id]
    );

    if (!sessionCheck.rowCount) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    // Store the answer
    const audioFileName = req.file ? req.file.filename : undefined;

    const answer = await createInterviewAnswer(
      sessionId,
      questionId,
      answerText,
      transcriptionConfidence,
      audioDuration,
      audioFileName
    );

    // Get all questions for this session
    const allQuestions = await getSessionQuestions(sessionId);
    const currentQuestionIndex = allQuestions.findIndex((q) => q.id === questionId);

    if (currentQuestionIndex === -1) {
      return res.status(400).json({ error: "Question does not belong to this interview" });
    }
    
    // Update metadata
    const metadata = (typeof sessionCheck.rows[0].metadata === 'string' 
      ? JSON.parse(sessionCheck.rows[0].metadata) 
      : sessionCheck.rows[0].metadata) || {};
    const updatedMetadata = {
      ...metadata,
      questionsAsked: (metadata.questionsAsked || 0) + 1,
      currentQuestionNumber: currentQuestionIndex + 2,
    };

    await query(
      `UPDATE interview_sessions SET metadata = $1 WHERE id = $2`,
      [JSON.stringify(updatedMetadata), sessionId]
    );

    // Check if there are more questions
    const nextQuestion = allQuestions[currentQuestionIndex + 1] || null;
    const isComplete = !nextQuestion;

    return res.json({
      answer,
      nextQuestion,
      isComplete,
      progress: {
        current: currentQuestionIndex + 1,
        total: allQuestions.length,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/interviews/generate-feedback
 * Generate AI feedback for a completed interview
 */
router.post("/generate-feedback", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { sessionId } = generateFeedbackSchema.parse(req.body);

    if (!env.groqApiKey) {
      return res.status(500).json({ error: "AI service not configured" });
    }

    // Verify session belongs to user
    const sessionCheck = await query(
      `SELECT id, status FROM interview_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, req.user!.id]
    );

    if (!sessionCheck.rowCount) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    // Generate feedback
    const feedback = await generateInterviewFeedback(sessionId, env.groqApiKey);

    // Update session with feedback
    await completeInterviewWithFeedback(sessionId, feedback);

    // Get updated session
    const updatedSession = await query(
      `SELECT * FROM interview_sessions WHERE id = $1`,
      [sessionId]
    );

    return res.json({
      feedback,
      session: updatedSession.rows[0],
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/interviews/:id/questions
 * Get all questions for an interview session
 */
router.get("/:id/questions", async (req: AuthenticatedRequest, res, next) => {
  try {
    // Verify session belongs to user
    const sessionCheck = await query(
      `SELECT id FROM interview_sessions WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.id]
    );

    if (!sessionCheck.rowCount) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    const questions = await getSessionQuestions(req.params.id);

    return res.json({ questions });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/interviews/:id/answers
 * Get all answers for an interview session
 */
router.get("/:id/answers", async (req: AuthenticatedRequest, res, next) => {
  try {
    // Verify session belongs to user
    const sessionCheck = await query(
      `SELECT id FROM interview_sessions WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.id]
    );

    if (!sessionCheck.rowCount) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    const answers = await getSessionAnswers(req.params.id);

    return res.json({ answers });
  } catch (error) {
    return next(error);
  }
});

export default router;
