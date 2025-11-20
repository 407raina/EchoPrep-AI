/**
 * API client functions for AI Interview endpoints
 */
import { apiFetch } from './api-client';
import type {
  StartInterviewRequest,
  StartInterviewResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  GenerateFeedbackRequest,
  GenerateFeedbackResponse,
  InterviewSession,
  InterviewQuestion,
  InterviewAnswer,
} from '@/types/interview';

/**
 * Start a new AI interview session
 */
export async function startInterview(
  request: StartInterviewRequest
): Promise<StartInterviewResponse> {
  return apiFetch<StartInterviewResponse>('/api/interviews/start', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Submit an answer to an interview question
 */
export async function submitAnswer(
  request: SubmitAnswerRequest
): Promise<SubmitAnswerResponse> {
  if (request.audioBlob) {
    const formData = new FormData();
    formData.append('sessionId', request.sessionId);
    formData.append('questionId', request.questionId);
    formData.append('answerText', request.answerText);
    if (typeof request.transcriptionConfidence === 'number') {
      formData.append('transcriptionConfidence', request.transcriptionConfidence.toString());
    }
    if (typeof request.audioDuration === 'number') {
      formData.append('audioDuration', request.audioDuration.toString());
    }
    formData.append('audio', request.audioBlob, 'answer.webm');

    return apiFetch<SubmitAnswerResponse>('/api/interviews/submit-answer', {
      method: 'POST',
      body: formData,
    });
  }

  return apiFetch<SubmitAnswerResponse>('/api/interviews/submit-answer', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Generate AI feedback for a completed interview
 */
export async function generateFeedback(
  request: GenerateFeedbackRequest
): Promise<GenerateFeedbackResponse> {
  return apiFetch<GenerateFeedbackResponse>('/api/interviews/generate-feedback', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get all interview sessions for the current user
 */
export async function getInterviewSessions(): Promise<{ sessions: InterviewSession[] }> {
  return apiFetch<{ sessions: InterviewSession[] }>('/api/interviews');
}

/**
 * Get a specific interview session
 */
export async function getInterviewSession(sessionId: string): Promise<{ session: InterviewSession }> {
  return apiFetch<{ session: InterviewSession }>(`/api/interviews/${sessionId}`);
}

/**
 * Get all questions for an interview session
 */
export async function getSessionQuestions(sessionId: string): Promise<{ questions: InterviewQuestion[] }> {
  return apiFetch<{ questions: InterviewQuestion[] }>(`/api/interviews/${sessionId}/questions`);
}

/**
 * Get all answers for an interview session
 */
export async function getSessionAnswers(sessionId: string): Promise<{ answers: InterviewAnswer[] }> {
  return apiFetch<{ answers: InterviewAnswer[] }>(`/api/interviews/${sessionId}/answers`);
}
