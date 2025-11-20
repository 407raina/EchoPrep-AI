import { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { BrowserSpeechRecognition } from "@/utils/BrowserSpeechRecognition";

export interface Message {
  role: "ai" | "user";
  text: string;
  questionId?: string;
}

export interface InterviewState {
  sessionId: string | null;
  currentQuestion: {
    id: string;
    text: string;
    number: number;
  } | null;
  isRecording: boolean;
  isSpeaking: boolean;
  conversation: Message[];
  progress: {
    current: number;
    total: number;
  };
}

interface StartInterviewParams {
  jobRole: string;
  experienceLevel: string;
  jobId?: string;
}

interface SubmitAnswerParams {
  sessionId: string;
  questionId: string;
  answerText: string;
}

/**
 * Custom hook for managing interview state and voice interactions
 */
export function useInterview() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<InterviewState>({
    sessionId: null,
    currentQuestion: null,
    isRecording: false,
    isSpeaking: false,
    conversation: [],
    progress: { current: 0, total: 0 },
  });

  const [currentTranscript, setCurrentTranscript] = useState("");
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize speech synthesis
  const initializeSpeech = useCallback(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Speak text using Web Speech API
  const speak = useCallback((text: string) => {
    if (!synthRef.current) {
      initializeSpeech();
    }

    // Cancel any ongoing speech
    synthRef.current?.cancel();

    setState(prev => ({ ...prev, isSpeaking: true }));

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      setState(prev => ({ ...prev, isSpeaking: false }));
    };

    utterance.onerror = (error) => {
      console.error("Speech synthesis error:", error);
      setState(prev => ({ ...prev, isSpeaking: false }));
    };

    synthRef.current?.speak(utterance);
  }, [initializeSpeech]);

  // Handle speech recognition transcript
  const handleTranscript = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal) {
      setCurrentTranscript("");
      return transcript;
    } else {
      setCurrentTranscript(transcript);
      return null;
    }
  }, []);

  // Start interview mutation
  const startInterviewMutation = useMutation({
    mutationFn: async (params: StartInterviewParams) => {
      const response = await apiFetch<any>("/api/interviews/start", {
        method: "POST",
        body: JSON.stringify(params),
      });
      return response;
    },
    onSuccess: (data) => {
      const { session, firstQuestion, totalQuestions } = data;
      
      setState({
        sessionId: session.id,
        currentQuestion: {
          id: firstQuestion.id,
          text: firstQuestion.question_text,
          number: 1,
        },
        isRecording: false,
        isSpeaking: false,
        conversation: [{ role: "ai", text: firstQuestion.question_text, questionId: firstQuestion.id }],
        progress: { current: 1, total: totalQuestions },
      });

      // Speak the first question
      speak(firstQuestion.question_text);
    },
  });

  // Submit answer mutation
  const submitAnswerMutation = useMutation({
    mutationFn: async (params: SubmitAnswerParams) => {
      const response = await apiFetch<any>("/api/interviews/submit-answer", {
        method: "POST",
        body: JSON.stringify(params),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      const { nextQuestion, isComplete, progress } = data;

      // Add user's answer to conversation
      setState(prev => ({
        ...prev,
        conversation: [...prev.conversation, { role: "user", text: variables.answerText }],
        progress,
      }));

      if (isComplete) {
        // Interview completed
        setState(prev => ({
          ...prev,
          currentQuestion: null,
          isRecording: false,
        }));
      } else if (nextQuestion) {
        // Move to next question
        setState(prev => ({
          ...prev,
          currentQuestion: {
            id: nextQuestion.id,
            text: nextQuestion.question_text,
            number: progress.current,
          },
          conversation: [
            ...prev.conversation,
            { role: "ai", text: nextQuestion.question_text, questionId: nextQuestion.id },
          ],
        }));

        // Speak the next question
        speak(nextQuestion.question_text);
      }
    },
  });

  // Generate feedback mutation
  const generateFeedbackMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiFetch<any>("/api/interviews/generate-feedback", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-history"] });
    },
  });

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Initialize speech recognition
      speechRecognitionRef.current = new BrowserSpeechRecognition(
        handleTranscript,
        (error) => {
          console.error("Speech recognition error:", error);
        }
      );

      const initialized = await speechRecognitionRef.current.initialize();
      if (initialized) {
        speechRecognitionRef.current.start();
        setState(prev => ({ ...prev, isRecording: true }));
      }
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  }, [handleTranscript]);

  // Stop recording and submit answer
  const stopRecording = useCallback(async () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }

    setState(prev => ({ ...prev, isRecording: false }));

    // Return the current transcript for submission
    return currentTranscript;
  }, [currentTranscript]);

  // Start interview
  const startInterview = useCallback(
    async (params: StartInterviewParams) => {
      initializeSpeech();
      await startInterviewMutation.mutateAsync(params);
    },
    [startInterviewMutation, initializeSpeech]
  );

  // Submit answer
  const submitAnswer = useCallback(
    async (answerText: string) => {
      if (!state.sessionId || !state.currentQuestion) {
        throw new Error("No active interview session");
      }

      await submitAnswerMutation.mutateAsync({
        sessionId: state.sessionId,
        questionId: state.currentQuestion.id,
        answerText,
      });
    },
    [state.sessionId, state.currentQuestion, submitAnswerMutation]
  );

  // Complete interview
  const completeInterview = useCallback(async () => {
    if (!state.sessionId) {
      throw new Error("No active interview session");
    }

    // Stop any ongoing speech
    synthRef.current?.cancel();
    speechRecognitionRef.current?.stop();

    // Generate feedback
    await generateFeedbackMutation.mutateAsync(state.sessionId);

    // Reset state
    setState({
      sessionId: null,
      currentQuestion: null,
      isRecording: false,
      isSpeaking: false,
      conversation: [],
      progress: { current: 0, total: 0 },
    });
  }, [state.sessionId, generateFeedbackMutation]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    synthRef.current?.cancel();
    speechRecognitionRef.current?.stop();
  }, []);

  return {
    state,
    currentTranscript,
    startInterview,
    submitAnswer,
    completeInterview,
    startRecording,
    stopRecording,
    speak,
    cleanup,
    isStarting: startInterviewMutation.isPending,
    isSubmitting: submitAnswerMutation.isPending,
    isGeneratingFeedback: generateFeedbackMutation.isPending,
  };
}
