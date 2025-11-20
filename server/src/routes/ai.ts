import { Router } from "express";
import { z } from "zod";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth";
import { env } from "../utils/env";
import { 
  generateInterviewInstructions, 
  generateInterviewFeedback,
  getInterviewMetadata,
  completeInterview 
} from "../services/interview-service";

const router = Router();

const transcriptSchema = z.object({
  transcript: z.array(z.string()).min(1),
  sessionId: z.string().optional(),
});

const analyzeInterviewSchema = z.object({
  sessionId: z.string().uuid(),
  transcript: z.array(z.string()).min(1),
  jobRole: z.string().optional(),
  experienceLevel: z.string().optional(),
});

// Enhanced analyze-interview endpoint that uses interview session data
router.post("/analyze-interview", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { sessionId, transcript, jobRole, experienceLevel } = analyzeInterviewSchema.parse(req.body);

    if (!env.openaiApiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
    }

    // Get metadata from session if not provided
    let role = jobRole;
    let experience = experienceLevel;

    if (sessionId && (!role || !experience)) {
      const metadata = await getInterviewMetadata(sessionId, req.user!.id);
      if (metadata) {
        role = role || metadata.jobRole;
        experience = experience || metadata.experienceLevel;
      }
    }

    if (!role || !experience) {
      return res.status(400).json({ 
        error: "Job role and experience level are required for analysis" 
      });
    }

    // Complete the interview and generate feedback
    const result = await completeInterview(
      sessionId,
      req.user!.id,
      transcript,
      env.openaiApiKey
    );

    return res.json(result.feedback);
  } catch (error) {
    return next(error);
  }
});

// Legacy analyze endpoint (for backwards compatibility)
router.post("/analyze", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { transcript } = transcriptSchema.parse(req.body);

    if (!env.openaiApiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
    }

    const conversationText = transcript.join("\n");

    const systemPrompt = `You are an expert interview evaluator. Analyze the following job interview transcript and provide detailed feedback.

Evaluate the candidate on:
1. Communication Skills (clarity, articulation, professionalism)
2. Technical Knowledge (depth of expertise, problem-solving)
3. Behavioral Competencies (teamwork, leadership, adaptability)
4. Overall Performance

Provide:
- An overall score out of 100
- Detailed feedback for each category
- Specific strengths identified
- Areas for improvement with actionable advice

Format your response as JSON with this structure:
{
  "overall_score": number,
  "communication": { "score": number, "feedback": "string", "strengths": ["string"], "improvements": ["string"] },
  "technical": { "score": number, "feedback": "string", "strengths": ["string"], "improvements": ["string"] },
  "behavioral": { "score": number, "feedback": "string", "strengths": ["string"], "improvements": ["string"] },
  "summary": "string"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Interview Transcript:\n\n${conversationText}\n\nPlease analyze this interview and provide detailed feedback.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error", response.status, errorText);
      return res.status(500).json({ error: "Failed to analyze interview" });
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    return res.json(analysis);
  } catch (error) {
    return next(error);
  }
});

const tokenSchema = z.object({
  instructions: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  phase: z.enum(['intro', 'collecting_info', 'interviewing', 'completed']).optional(),
});

// Enhanced realtime-token endpoint with interview phase support
router.post("/realtime-token", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { instructions, sessionId, phase } = tokenSchema.parse(req.body ?? {});

    if (!env.openaiApiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
    }

    let finalInstructions = instructions;

    // Generate phase-specific instructions if session provided
    if (sessionId && phase) {
      const metadata = await getInterviewMetadata(sessionId, req.user!.id);
      finalInstructions = generateInterviewInstructions(phase, metadata || undefined);
    } else if (!finalInstructions) {
      // Default instructions
      finalInstructions = generateInterviewInstructions('intro');
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.openaiRealtimeModel,
        voice: "alloy",
        instructions: finalInstructions,
        temperature: 0.8,
        max_response_output_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Realtime token error", response.status, errorText);
      return res.status(500).json({ error: "Failed to request realtime session" });
    }

    const data = await response.json();

    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

export default router;
