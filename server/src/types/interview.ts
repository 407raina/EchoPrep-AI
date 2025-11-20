/**
 * TypeScript types for AI Interview functionality
 */

// Interview Session Types
export interface InterviewSession {
  id: string;
  user_id: string;
  job_id?: string;
  interview_type: string;
  duration: number | null;
  transcript: InterviewTranscript | null;
  feedback: InterviewFeedback | null;
  score: number | null;
  status: InterviewStatus;
  metadata: InterviewMetadata;
  created_at: string;
  completed_at: string | null;
}

export type InterviewStatus = 'in_progress' | 'completed' | 'cancelled' | 'paused';

export interface InterviewTranscript {
  messages: string[];
  metadata?: Record<string, unknown>;
}

export interface InterviewMetadata {
  jobRole?: string;
  experienceLevel?: string;
  questionsAsked: number;
  startTime: string;
  phase: InterviewPhase;
  totalQuestions?: number;
  currentQuestionNumber?: number;
}

export type InterviewPhase = 'intro' | 'collecting_info' | 'interviewing' | 'completed';

// Interview Question Types
export interface InterviewQuestion {
  id: string;
  interview_session_id: string;
  question_number: number;
  question_text: string;
  category: QuestionCategory | null;
  difficulty: QuestionDifficulty | null;
  created_at: string;
}

export type QuestionCategory = 'technical' | 'behavioral' | 'situational' | 'experience' | 'general';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface CreateQuestionInput {
  interview_session_id: string;
  question_number: number;
  question_text: string;
  category?: QuestionCategory;
  difficulty?: QuestionDifficulty;
}

// Interview Answer Types
export interface InterviewAnswer {
  id: string;
  interview_session_id: string;
  question_id: string;
  answer_text: string;
  transcription_confidence: number | null;
  audio_duration: number | null;
  audio_file_path: string | null;
  created_at: string;
}

export interface CreateAnswerInput {
  interview_session_id: string;
  question_id: string;
  answer_text: string;
  transcription_confidence?: number;
  audio_duration?: number;
  audio_file_path?: string;
}

// Interview Feedback Types
export interface InterviewFeedback {
  score: number; // Overall score 0-100
  scoreBreakdown?: ScoreBreakdown;
  strengths: string[];
  improvementAreas: string[];
  summary: string;
  detailedAnalysis?: DetailedFeedback | TransparentDetailedAnalysis;
  analytics?: AnswerQualityMetrics;
}

export interface ScoreBreakdown {
  contentRelevance: { score: number; maxScore: number; percentage: number };
  detailDepth: { score: number; maxScore: number; percentage: number };
  fluencyClarity: { score: number; maxScore: number; percentage: number };
  confidenceTone: { score: number; maxScore: number; percentage: number };
  grammarStructure: { score: number; maxScore: number; percentage: number };
}

export interface TransparentDetailedAnalysis {
  contentRelevance: string;
  detailDepth: string;
  fluencyClarity: string;
  confidenceTone: string;
  grammarStructure: string;
}

export interface AnswerQualityMetrics {
  avgAnswerLength: number;
  technicalDepth: number;
  structureScore: number;
  specificityScore: number;
  questionsAnswered: number;
}

export interface DetailedFeedback {
  communication: CategoryFeedback;
  technical: CategoryFeedback;
  behavioral: CategoryFeedback;
}

export interface CategoryFeedback {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

// API Request/Response Types
export interface StartInterviewRequest {
  interviewType?: string;
  jobId?: string;
  jobRole?: string;
  experienceLevel?: string;
}

export interface StartInterviewResponse {
  session: InterviewSession;
  firstQuestion: InterviewQuestion;
}

export interface SubmitAnswerRequest {
  sessionId: string;
  questionId: string;
  answerText: string;
  transcriptionConfidence?: number;
  audioDuration?: number;
}

export interface SubmitAnswerResponse {
  answer: InterviewAnswer;
  nextQuestion?: InterviewQuestion;
  isComplete: boolean;
}

export interface GenerateFeedbackRequest {
  sessionId: string;
}

export interface GenerateFeedbackResponse {
  feedback: InterviewFeedback;
  session: InterviewSession;
}

// Question Generation Types
export interface QuestionGenerationParams {
  jobRole: string;
  experienceLevel: string;
  numberOfQuestions?: number;
  categories?: QuestionCategory[];
}

export interface GeneratedQuestion {
  question_text: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  followUpSuggestions?: string[];
}
