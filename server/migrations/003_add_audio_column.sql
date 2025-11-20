-- Migration to add optional audio file storage for interview answers
ALTER TABLE interview_answers
  ADD COLUMN IF NOT EXISTS audio_file_path TEXT;

CREATE INDEX IF NOT EXISTS idx_interview_answers_audio_path
  ON interview_answers (audio_file_path);
