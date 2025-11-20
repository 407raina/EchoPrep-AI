import { randomUUID } from "crypto";
import { query } from "../db/pool";

export type InterviewPhase = 'intro' | 'collecting_info' | 'interviewing' | 'completed';

export type InterviewMetadata = {
  jobRole?: string;
  experienceLevel?: string;
  questionsAsked: number;
  startTime: string;
  phase: InterviewPhase;
};

export type InterviewFeedback = {
  overall_score: number;
  communication: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  };
  technical: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  };
  behavioral: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  };
  summary: string;
};

/**
 * Generate AI instructions based on interview phase and collected data
 */
export function generateInterviewInstructions(
  phase: InterviewPhase,
  metadata?: Partial<InterviewMetadata>
): string {
  switch (phase) {
    case 'intro':
      return `You are a friendly, professional AI interviewer named Alex. 

Your task is to conduct a natural, conversational job interview. Start by warmly greeting the candidate and briefly introducing yourself. 

Then, ask them TWO questions in a natural, conversational way:
1. What job role are they interviewing for? (e.g., Software Engineer, Marketing Manager, Data Analyst, etc.)
2. What is their experience level? (e.g., Fresher/Entry-level, Mid-level, or Senior)

Be warm, friendly, and encouraging. Speak like a real human interviewer, not a robot. After they answer both questions, acknowledge their responses positively and let them know you'll begin the interview questions shortly.

Keep your responses concise and natural.`;

    case 'collecting_info':
      return `You are Alex, a friendly AI interviewer. You're in the process of learning about the candidate's background.

The candidate is interviewing for: ${metadata?.jobRole || 'a position'}
Experience level: ${metadata?.experienceLevel || 'not yet specified'}

If you don't have both pieces of information yet, ask the missing question naturally. Once you have both, warmly acknowledge their responses and transition to the main interview by saying something like:

"Great! I'm excited to learn more about your background for the ${metadata?.jobRole} position. Let's dive into some questions."

Be conversational and human-like.`;

    case 'interviewing':
      return `You are Alex, an expert interviewer conducting a real job interview for a ${metadata?.jobRole || 'professional'} position at the ${metadata?.experienceLevel || 'mid'}-level.

Conduct a thorough, realistic interview:
- Ask 5-7 relevant questions based on the role and experience level
- Mix behavioral questions (STAR method), technical questions, and situational questions
- Ask thoughtful follow-up questions based on their answers
- Be encouraging and professional, like a real interviewer
- Listen carefully and ask for clarification when needed
- Take note of their communication style, technical knowledge, and problem-solving approach

For a ${metadata?.jobRole} role, focus on:
- Relevant technical skills and experience
- Problem-solving abilities
- Teamwork and collaboration
- Adaptability and learning mindset
- Role-specific competencies

Keep your questions conversational and natural. Speak like a real human interviewer having a genuine conversation. After 5-7 substantial questions with follow-ups, you can conclude the interview naturally.`;

    case 'completed':
      return `You are wrapping up the interview. Thank the candidate warmly for their time and let them know they'll receive detailed feedback shortly. Be professional and encouraging.`;

    default:
      return `You are a professional AI interviewer. Conduct a natural, conversational interview.`;
  }
}

/**
 * Analyze interview transcript and generate detailed feedback using AI
 */
export async function generateInterviewFeedback(
  transcript: string[],
  jobRole: string,
  experienceLevel: string,
  openaiApiKey: string
): Promise<InterviewFeedback> {
  const conversationText = transcript.join("\n\n");

  const systemPrompt = `You are an expert interview evaluator with extensive experience in recruitment and talent assessment.

Analyze the following job interview transcript for a ${jobRole} position at the ${experienceLevel} level.

Evaluate the candidate on these key dimensions:

1. **Communication Skills** (30 points)
   - Clarity and articulation
   - Professional language
   - Active listening
   - Confidence in responses

2. **Technical Knowledge** (35 points)
   - Depth of expertise for ${jobRole}
   - Problem-solving approach
   - Industry knowledge
   - Practical experience demonstration

3. **Behavioral Competencies** (35 points)
   - Teamwork and collaboration
   - Leadership potential
   - Adaptability and learning mindset
   - Self-awareness and growth mindset

Provide:
- An overall score out of 100
- Detailed feedback for each category with specific scores
- 2-3 specific strengths with examples from the transcript
- 2-3 areas for improvement with actionable advice
- A comprehensive summary (3-4 sentences)

Be constructive, specific, and fair. Reference actual responses from the interview when possible.

Format your response as valid JSON matching this structure exactly:
{
  "overall_score": number (0-100),
  "communication": {
    "score": number (0-30),
    "feedback": "detailed paragraph",
    "strengths": ["specific strength 1", "specific strength 2"],
    "improvements": ["actionable improvement 1", "actionable improvement 2"]
  },
  "technical": {
    "score": number (0-35),
    "feedback": "detailed paragraph",
    "strengths": ["specific strength 1", "specific strength 2"],
    "improvements": ["actionable improvement 1", "actionable improvement 2"]
  },
  "behavioral": {
    "score": number (0-35),
    "feedback": "detailed paragraph",
    "strengths": ["specific strength 1", "specific strength 2"],
    "improvements": ["actionable improvement 1", "actionable improvement 2"]
  },
  "summary": "comprehensive 3-4 sentence summary"
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Interview Transcript:\n\n${conversationText}\n\nPlease analyze this interview and provide detailed, constructive feedback in valid JSON format.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error", response.status, errorText);
    throw new Error("Failed to generate interview feedback");
  }

  const data = await response.json();
  const feedback = JSON.parse(data.choices[0].message.content);

  return feedback as InterviewFeedback;
}

/**
 * Create a new interview session
 */
export async function createInterviewSession(userId: string, interviewType: string = "AI Voice Interview") {
  const sessionId = randomUUID();
  
  const metadata: InterviewMetadata = {
    phase: 'intro',
    questionsAsked: 0,
    startTime: new Date().toISOString(),
  };

  const result = await query(
    `INSERT INTO interview_sessions 
      (id, user_id, interview_type, status, transcript, metadata) 
     VALUES ($1, $2, $3, 'in_progress', $4, $5)
     RETURNING *`,
    [
      sessionId, 
      userId, 
      interviewType, 
      JSON.stringify({ messages: [] }),
      JSON.stringify(metadata)
    ]
  );

  return result.rows[0];
}

/**
 * Update interview session metadata
 */
export async function updateInterviewMetadata(
  sessionId: string,
  userId: string,
  updates: Partial<InterviewMetadata>
) {
  const current = await query(
    `SELECT metadata FROM interview_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );

  if (!current.rowCount) {
    throw new Error("Interview session not found");
  }

  const currentMetadata = current.rows[0].metadata || {};
  const updatedMetadata = { ...currentMetadata, ...updates };

  await query(
    `UPDATE interview_sessions 
     SET metadata = $1
     WHERE id = $2 AND user_id = $3`,
    [JSON.stringify(updatedMetadata), sessionId, userId]
  );

  return updatedMetadata;
}

/**
 * Get interview session metadata
 */
export async function getInterviewMetadata(sessionId: string, userId: string): Promise<InterviewMetadata | null> {
  const result = await query(
    `SELECT metadata FROM interview_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );

  if (!result.rowCount) {
    return null;
  }

  const metadata = result.rows[0].metadata || {};
  return metadata as InterviewMetadata;
}

/**
 * Complete interview and generate feedback
 */
export async function completeInterview(
  sessionId: string,
  userId: string,
  transcript: string[],
  openaiApiKey: string
) {
  const metadata = await getInterviewMetadata(sessionId, userId);
  
  if (!metadata || !metadata.jobRole || !metadata.experienceLevel) {
    throw new Error("Interview metadata incomplete");
  }

  // Generate AI feedback
  const feedback = await generateInterviewFeedback(
    transcript,
    metadata.jobRole,
    metadata.experienceLevel,
    openaiApiKey
  );

  // Calculate duration
  const startTime = new Date(metadata.startTime);
  const endTime = new Date();
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

  // Update session with feedback
  await query(
    `UPDATE interview_sessions 
     SET 
       status = 'completed',
       feedback = $1,
       score = $2,
       duration = $3,
       completed_at = NOW(),
       transcript = jsonb_set(
         COALESCE(transcript, '{"messages": []}'::jsonb), 
         '{messages}', 
         $4
       )
     WHERE id = $5 AND user_id = $6`,
    [
      JSON.stringify(feedback),
      feedback.overall_score,
      duration,
      JSON.stringify(transcript),
      sessionId,
      userId,
    ]
  );

  return {
    feedback,
    duration,
    score: feedback.overall_score,
  };
}
