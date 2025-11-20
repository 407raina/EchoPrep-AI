-- Migration to add interview_questions and interview_answers tables
-- This migration creates tables to support structured Q&A flow for AI interviews

-- Create interview_questions table
CREATE TABLE IF NOT EXISTS interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  category TEXT, -- e.g., 'technical', 'behavioral', 'situational'
  difficulty TEXT, -- e.g., 'easy', 'medium', 'hard'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(interview_session_id, question_number)
);

-- Create interview_answers table
CREATE TABLE IF NOT EXISTS interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  transcription_confidence REAL, -- confidence score from speech recognition (0.0 - 1.0)
  audio_duration INTEGER, -- duration in seconds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_session ON interview_questions(interview_session_id);
CREATE INDEX IF NOT EXISTS idx_questions_session_number ON interview_questions(interview_session_id, question_number);
CREATE INDEX IF NOT EXISTS idx_answers_session ON interview_answers(interview_session_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON interview_answers(question_id);

-- Add metadata column to interview_sessions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'interview_sessions' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create index on metadata for better query performance
CREATE INDEX IF NOT EXISTS idx_interview_sessions_metadata ON interview_sessions USING GIN (metadata);

COMMENT ON TABLE interview_questions IS 'Stores individual interview questions for each session';
COMMENT ON TABLE interview_answers IS 'Stores candidate answers to interview questions';
COMMENT ON COLUMN interview_answers.transcription_confidence IS 'Confidence score from Web Speech API (0.0 - 1.0)';
