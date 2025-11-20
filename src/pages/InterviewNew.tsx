/**
 * Enhanced AI Interview Page Component
 * Implements structured Q&A flow with Web Speech API
 */
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  MicOff,
  Loader2,
  History,
  Play,
  Eye,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  startInterview,
  submitAnswer,
  generateFeedback,
  getInterviewSessions,
} from "@/lib/interview-api";
import type {
  InterviewSession,
  InterviewQuestion,
  InterviewFeedback,
  SubmitAnswerRequest,
} from "@/types/interview";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const InterviewNew = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, initializing } = useAuth();

  // Interview state
  const [activeTab, setActiveTab] = useState("start");
  const [isRecording, setIsRecording] = useState(false);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  
  // Form state
  const [jobRole, setJobRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  
  const [selectedFeedback, setSelectedFeedback] = useState<InterviewFeedback | null>(null);
  
  // Progress
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastAudioBlobRef = useRef<Blob | null>(null);
  const lastAudioDurationRef = useRef<number | undefined>(undefined);
  const isRecordingRef = useRef(false);

  const queryClient = useQueryClient();

  const { data: historyData, isFetching: isHistoryLoading } = useQuery({
    queryKey: ["interview-sessions"],
    queryFn: getInterviewSessions,
    enabled: !!user,
  });

  const interviewHistory = historyData?.sessions ?? [];

  const startInterviewMutation = useMutation({ mutationFn: startInterview });
  const submitAnswerMutation = useMutation({ mutationFn: submitAnswer });
  const generateFeedbackMutation = useMutation({ mutationFn: generateFeedback });

  const isStartingInterview = startInterviewMutation.isPending;
  const isSubmittingAnswer = submitAnswerMutation.isPending;
  const isGeneratingFeedback = generateFeedbackMutation.isPending;

  useEffect(() => {
    if (!initializing && !user) {
      navigate("/auth");
    }
  }, [initializing, user, navigate]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = "";
        let finalText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const conf = event.results[i][0].confidence;

          if (event.results[i].isFinal) {
            finalText += transcript + " ";
            setConfidence(conf);
          } else {
            interimText += transcript;
          }
        }

        if (finalText) {
          setCurrentAnswer((prev) => prev + finalText);
        }
        setInterimTranscript(interimText);
      };

      recognition.onerror = (event: Event) => {
        const errorEvent = event as SpeechRecognitionErrorEvent | undefined;
        const error = errorEvent?.error ?? "unknown_error";
        console.error("Speech recognition error:", error);
        toast({
          title: "Speech Recognition Error",
          description: typeof error === "string" ? error : "An unexpected error occurred",
          variant: "destructive",
        });
        setIsRecording(false);
      };

      recognition.onend = () => {
        if (isRecordingRef.current) {
          // Restart if still recording
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart recognition:", e);
          }
        }
      };

      recognitionRef.current = recognition;
    } else {
      toast({
        title: "Browser Not Supported",
        description: "Your browser doesn't support Web Speech API. Please use Chrome, Edge, or Safari.",
        variant: "destructive",
      });
    }

    // Initialize Text-to-Speech
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      
      // Load voices (Chrome requires this)
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          console.log('Available voices:', voices.map(v => v.name));
        }
      };
      
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [toast]);

  // Function to make AI speak a text
  const speakText = (text: string) => {
    if (!synthRef.current) {
      console.warn("Speech synthesis not available");
      return;
    }

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Get a professional-sounding voice (prefer female voices for interviewer)
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Samantha') || 
      voice.name.includes('Karen') || 
      voice.name.includes('Female') ||
      voice.lang.startsWith('en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsAISpeaking(true);
    };

    utterance.onend = () => {
      setIsAISpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsAISpeaking(false);
    };

    synthRef.current.speak(utterance);
  };

  // Function to stop AI speaking
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsAISpeaking(false);
    }
  };

  const handleStartInterview = async () => {
    if (!jobRole || !experienceLevel || isStartingInterview) {
      if (!jobRole || !experienceLevel) {
        toast({
          title: "Missing Information",
          description: "Please select both job role and experience level",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      const response = await startInterviewMutation.mutateAsync({
        jobRole,
        experienceLevel,
        interviewType: "AI Voice Interview",
      });

      setCurrentSession(response.session);
      setCurrentQuestion(response.firstQuestion);
      setProgress({ current: 1, total: response.totalQuestions });
      setActiveTab("interview");
      lastAudioBlobRef.current = null;
      lastAudioDurationRef.current = undefined;

      setTimeout(() => {
        const intro = `Hello! Welcome to your ${jobRole} interview for ${experienceLevel} level. I'll be asking you ${response.totalQuestions} questions today. Let's begin.`;
        speakText(intro);

        setTimeout(() => {
          speakText(`Question 1. ${response.firstQuestion.question_text}`);
        }, 6000);
      }, 500);

      toast({
        title: "Interview Started",
        description: `${response.totalQuestions} questions prepared for ${jobRole} - ${experienceLevel}`,
      });
    } catch (error) {
      console.error("Failed to start interview:", error);
      toast({
        title: "Error",
        description: "Failed to start interview. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startRecording = async () => {
    if (isRecording) {
      return;
    }

    if (!recognitionRef.current) {
      toast({
        title: "Speech Recognition Unavailable",
        description: "Your browser does not support the Web Speech API.",
        variant: "destructive",
      });
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast({
        title: "Microphone Unavailable",
        description: "We could not access your microphone. Please check browser permissions.",
        variant: "destructive",
      });
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      toast({
        title: "Recording Unsupported",
        description: "Your browser does not support audio recording. Transcripts will still be saved.",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorderOptions: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        recorderOptions.mimeType = "audio/webm;codecs=opus";
      }

      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      lastAudioBlobRef.current = null;
      lastAudioDurationRef.current = undefined;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      recorder.start();
      recognitionRef.current.start();
      setIsRecording(true);
    isRecordingRef.current = true;
      setRecordingStartTime(Date.now());
      setCurrentAnswer("");
      setInterimTranscript("");
      setConfidence(0);
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast({
        title: "Recording Error",
        description: "Unable to access your microphone. Please check permissions and try again.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    if (!isRecording && mediaRecorderRef.current?.state !== "recording") {
      return;
    }

    if (recordingStartTime) {
      const durationSeconds = Math.max(
        1,
        Math.round((Date.now() - recordingStartTime) / 1000)
      );
      lastAudioDurationRef.current = durationSeconds;
    } else {
      lastAudioDurationRef.current = undefined;
    }

    setIsRecording(false);
  isRecordingRef.current = false;

    try {
      recognitionRef.current?.stop();
    } catch (error) {
      console.error("Failed to stop speech recognition:", error);
    }

    const recorder = mediaRecorderRef.current;

    const finalizeRecorder = (activeRecorder: MediaRecorder | null) => {
      if (audioChunksRef.current.length > 0) {
        const mimeType = activeRecorder?.mimeType || "audio/webm";
        lastAudioBlobRef.current = new Blob(audioChunksRef.current, { type: mimeType });
      } else if (!lastAudioBlobRef.current) {
        lastAudioBlobRef.current = null;
      }
      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };

    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.addEventListener(
          "stop",
          () => {
            finalizeRecorder(recorder);
            resolve();
          },
          { once: true }
        );

        try {
          recorder.stop();
        } catch (error) {
          console.error("Failed to stop media recorder:", error);
          finalizeRecorder(recorder);
          resolve();
        }
      });
    } else {
      finalizeRecorder(recorder ?? null);
    }

    setRecordingStartTime(null);
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentSession || !currentQuestion || !currentAnswer.trim()) {
      toast({
        title: "No Answer",
        description: "Please record your answer before submitting",
        variant: "destructive",
      });
      return;
    }

    if (isRecording || mediaRecorderRef.current) {
      await stopRecording();
    }

    try {
      const payload: SubmitAnswerRequest = {
        sessionId: currentSession.id,
        questionId: currentQuestion.id,
        answerText: currentAnswer.trim(),
        transcriptionConfidence: confidence,
      };

      if (lastAudioDurationRef.current !== undefined) {
        payload.audioDuration = lastAudioDurationRef.current;
      }

      if (lastAudioBlobRef.current) {
        payload.audioBlob = lastAudioBlobRef.current;
      }

      const response = await submitAnswerMutation.mutateAsync(payload);

      const answeredCount = response.progress.current;
      const totalQuestions = response.progress.total;
      const nextQuestionNumber = response.isComplete
        ? totalQuestions
        : Math.min(answeredCount + 1, totalQuestions);
      setProgress({ current: nextQuestionNumber, total: totalQuestions });

      lastAudioBlobRef.current = null;
      lastAudioDurationRef.current = undefined;

      if (response.isComplete) {
        stopSpeaking();
        await handleGenerateFeedback();
      } else if (response.nextQuestion) {
        setCurrentQuestion(response.nextQuestion);
        setCurrentAnswer("");
        setInterimTranscript("");
        setConfidence(0);
        setRecordingStartTime(null);

        setTimeout(() => {
          speakText(`Question ${nextQuestionNumber}. ${response.nextQuestion.question_text}`);
        }, 500);

        toast({
          title: "Answer Submitted",
          description: `Question ${answeredCount}/${totalQuestions} answered`,
        });
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateFeedback = async () => {
    if (!currentSession || isGeneratingFeedback) {
      return;
    }

    try {
      const response = await generateFeedbackMutation.mutateAsync({
        sessionId: currentSession.id,
      });

      setSelectedFeedback(response.feedback);
      setActiveTab("results");

      toast({
        title: "Interview Complete!",
        description: `Your overall score: ${response.feedback.score}/100`,
      });

      await queryClient.invalidateQueries({ queryKey: ["interview-sessions"] });
    } catch (error) {
      console.error("Failed to generate feedback:", error);
      toast({
        title: "Error",
        description: "Failed to generate feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const viewSessionFeedback = async (session: InterviewSession) => {
    if (session.feedback) {
      // Handle feedback that might be a string or object
      const feedback = typeof session.feedback === 'string' 
        ? JSON.parse(session.feedback) 
        : session.feedback;
      setSelectedFeedback(feedback as InterviewFeedback);
      setActiveTab("results");
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
              AI Interview Platform
            </h1>
            <p className="text-xl text-muted-foreground">
              Practice interviews with real-time voice transcription and AI feedback
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="start">
                <Play className="w-4 h-4 mr-2" />
                Start
              </TabsTrigger>
              <TabsTrigger value="interview" disabled={!currentSession}>
                <Mic className="w-4 h-4 mr-2" />
                Interview
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="w-4 h-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Start Tab */}
            <TabsContent value="start">
              <Card className="p-8 shadow-card">
                <h2 className="text-2xl font-bold mb-6">Start New Interview</h2>
                
                <div className="space-y-6 max-w-md">
                  <div>
                    <Label htmlFor="jobRole">Job Role</Label>
                    <Input
                      id="jobRole"
                      placeholder="e.g., Software Engineer, Data Analyst"
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="experienceLevel">Experience Level</Label>
                    <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fresher/Entry-level">Fresher/Entry-level</SelectItem>
                        <SelectItem value="Mid-level">Mid-level</SelectItem>
                        <SelectItem value="Senior">Senior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleStartInterview}
                    disabled={isStartingInterview || !jobRole || !experienceLevel}
                    className="w-full h-12"
                    size="lg"
                  >
                    {isStartingInterview ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Start Interview
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-8 p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold mb-2">What to Expect:</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• 7 tailored questions based on your role and experience</li>
                    <li>• <strong>AI speaks questions out loud</strong> using Text-to-Speech</li>
                    <li>• Real-time voice transcription of your answers</li>
                    <li>• Mix of technical, behavioral, and situational questions</li>
                    <li>• Comprehensive AI feedback with actionable insights</li>
                  </ul>
                </div>
              </Card>
            </TabsContent>

            {/* Interview Tab */}
            <TabsContent value="interview">
              <Card className="p-8 shadow-card">
                {currentQuestion && currentSession ? (
                  <>
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">
                          Question {progress.current} of {progress.total}
                        </h2>
                        <Badge variant="outline" className="text-sm">
                          {currentQuestion.category || "General"}
                        </Badge>
                      </div>
                      <Progress value={(progress.current / progress.total) * 100} className="mb-4" />
                    </div>

                    <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-lg mb-6 relative">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-lg font-medium leading-relaxed flex-1">
                          {currentQuestion.question_text}
                        </p>
                        <div className="flex gap-2">
                          {isAISpeaking ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={stopSpeaking}
                              className="shrink-0"
                            >
                              <VolumeX className="w-4 h-4 mr-2" />
                              Stop
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => speakText(`Question ${progress.current}. ${currentQuestion.question_text}`)}
                              className="shrink-0"
                            >
                              <Volume2 className="w-4 h-4 mr-2" />
                              Replay
                            </Button>
                          )}
                        </div>
                      </div>
                      {isAISpeaking && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                          <Volume2 className="w-4 h-4 animate-pulse" />
                          <span className="animate-pulse">AI is speaking...</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-muted/30 p-6 rounded-lg mb-6 min-h-[200px]">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-sm font-semibold">Your Answer:</Label>
                        <Badge variant={isRecording ? "default" : "secondary"}>
                          {isRecording ? (
                            <>
                              <Mic className="w-3 h-3 mr-1 animate-pulse" />
                              Recording...
                            </>
                          ) : (
                            "Not Recording"
                          )}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {currentAnswer && (
                          <p className="text-base leading-relaxed whitespace-pre-wrap">
                            {currentAnswer}
                          </p>
                        )}
                        {interimTranscript && (
                          <p className="text-base leading-relaxed text-muted-foreground italic">
                            {interimTranscript}
                          </p>
                        )}
                        {!currentAnswer && !interimTranscript && (
                          <p className="text-muted-foreground italic">
                            Click "Start Recording" to begin your answer...
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        onClick={handleToggleRecording}
                        variant={isRecording ? "destructive" : "default"}
                        size="lg"
                        className="flex-1"
                        disabled={isSubmittingAnswer || isGeneratingFeedback}
                      >
                        {isRecording ? (
                          <>
                            <MicOff className="w-5 h-5 mr-2" />
                            Stop Recording
                          </>
                        ) : (
                          <>
                            <Mic className="w-5 h-5 mr-2" />
                            Start Recording
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={
                          !currentAnswer.trim() ||
                          isSubmittingAnswer ||
                          isGeneratingFeedback
                        }
                        size="lg"
                        className="flex-1"
                      >
                        {isSubmittingAnswer || isGeneratingFeedback ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            {isSubmittingAnswer ? "Submitting..." : "Generating..."}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Submit Answer
                          </>
                        )}
                      </Button>
                    </div>

                    {confidence > 0 && (
                      <div className="mt-4 text-sm text-muted-foreground text-center">
                        Transcription Confidence: {(confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No active interview session</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <Card className="p-8 shadow-card">
                <h2 className="text-2xl font-bold mb-6">Interview History</h2>

                {selectedFeedback ? (
                  <div className="space-y-6">
                    <Button variant="outline" onClick={() => setSelectedFeedback(null)}>
                      ← Back to History
                    </Button>

                    <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-bold">Interview Results</h3>
                        <Badge variant="default" className="text-2xl px-6 py-3">
                          {selectedFeedback.score}/100
                        </Badge>
                      </div>
                      <p className="text-base leading-relaxed">{selectedFeedback.summary}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <Card className="p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          Strengths
                        </h4>
                        <ul className="space-y-2">
                          {selectedFeedback.strengths.map((strength, idx) => (
                            <li key={idx} className="text-sm leading-relaxed">
                              • {strength}
                            </li>
                          ))}
                        </ul>
                      </Card>

                      <Card className="p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2 text-orange-600">
                          <BarChart3 className="w-5 h-5" />
                          Areas for Improvement
                        </h4>
                        <ul className="space-y-2">
                          {selectedFeedback.improvementAreas.map((area, idx) => (
                            <li key={idx} className="text-sm leading-relaxed">
                              • {area}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </div>

                    {selectedFeedback.detailedAnalysis && (
                      <div className="space-y-4">
                        <h3 className="text-xl font-bold">Detailed Analysis</h3>
                        
                        {/* New transparent analysis format */}
                        {selectedFeedback.scoreBreakdown && typeof selectedFeedback.detailedAnalysis === 'object' && 'contentRelevance' in selectedFeedback.detailedAnalysis ? (
                          Object.entries(selectedFeedback.detailedAnalysis).map(([category, analysis]) => {
                            const breakdown = selectedFeedback.scoreBreakdown?.[category as keyof typeof selectedFeedback.scoreBreakdown];
                            return (
                              <Card key={category} className="p-6">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</h4>
                                  {breakdown && (
                                    <Badge>{breakdown.score}/{breakdown.maxScore} ({breakdown.percentage}%)</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">{typeof analysis === 'string' ? analysis : ''}</p>
                              </Card>
                            );
                          })
                        ) : (
                          /* Old format with communication/technical/behavioral */
                          Object.entries(selectedFeedback.detailedAnalysis).map(([category, data]: [string, any]) => (
                            <Card key={category} className="p-6">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold capitalize">{category}</h4>
                                <Badge>{data?.score || 0} points</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-4">{data?.feedback || ''}</p>
                              <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="font-medium mb-2">Strengths:</p>
                                  <ul className="space-y-1">
                                    {(data?.strengths || []).map((s: string, i: number) => (
                                      <li key={i}>• {s}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="font-medium mb-2">Improvements:</p>
                                  <ul className="space-y-1">
                                    {(data?.improvements || []).map((imp: string, i: number) => (
                                      <li key={i}>• {imp}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    )}

                    {selectedFeedback.scoreBreakdown && (
                      <div className="space-y-4 mt-6">
                        <h3 className="text-xl font-bold">Score Breakdown</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          {Object.entries(selectedFeedback.scoreBreakdown).map(([category, breakdown]) => (
                            <Card key={category} className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium capitalize text-sm">
                                  {category.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <Badge variant="secondary">
                                  {breakdown.score}/{breakdown.maxScore}
                                </Badge>
                              </div>
                              <Progress value={(breakdown.score / breakdown.maxScore) * 100} className="h-2" />
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : isHistoryLoading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Loader2 className="w-6 h-6 mx-auto mb-4 animate-spin" />
                    <p>Loading interview history...</p>
                  </div>
                ) : interviewHistory.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No interview history yet. Start your first interview!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {interviewHistory.map((session) => (
                      <Card key={session.id} className="p-6 hover:shadow-card-hover transition-smooth">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{session.interview_type}</h3>
                              {session.score !== null && (
                                <Badge variant={session.score >= 70 ? "default" : "secondary"}>
                                  Score: {session.score}/100
                                </Badge>
                              )}
                              <Badge variant="outline">{session.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {new Date(session.created_at).toLocaleDateString()} at{" "}
                              {new Date(session.created_at).toLocaleTimeString()}
                            </p>
                            {session.metadata && (
                              <p className="text-sm text-muted-foreground">
                                {session.metadata.jobRole} • {session.metadata.experienceLevel}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {session.feedback && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewSessionFeedback(session)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Feedback
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results">
              {selectedFeedback && (
                <Card className="p-8 shadow-card">
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-bold">Interview Results</h3>
                        <Badge variant="default" className="text-2xl px-6 py-3">
                          {selectedFeedback.score}/100
                        </Badge>
                      </div>
                      <p className="text-base leading-relaxed">{selectedFeedback.summary}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <Card className="p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          Strengths
                        </h4>
                        <ul className="space-y-2">
                          {(selectedFeedback.strengths || []).map((strength, idx) => (
                            <li key={idx} className="text-sm leading-relaxed">
                              • {strength}
                            </li>
                          ))}
                        </ul>
                      </Card>

                      <Card className="p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2 text-orange-600">
                          <BarChart3 className="w-5 h-5" />
                          Areas for Improvement
                        </h4>
                        <ul className="space-y-2">
                          {(selectedFeedback.improvementAreas || []).map((area, idx) => (
                            <li key={idx} className="text-sm leading-relaxed">
                              • {area}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </div>

                    {selectedFeedback.detailedAnalysis && (
                      <div className="space-y-4">
                        <h3 className="text-xl font-bold">Detailed Analysis</h3>
                        
                        {/* New transparent analysis format */}
                        {selectedFeedback.scoreBreakdown && typeof selectedFeedback.detailedAnalysis === 'object' && 'contentRelevance' in selectedFeedback.detailedAnalysis ? (
                          Object.entries(selectedFeedback.detailedAnalysis).map(([category, analysis]) => {
                            const breakdown = selectedFeedback.scoreBreakdown?.[category as keyof typeof selectedFeedback.scoreBreakdown];
                            return (
                              <Card key={category} className="p-6">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</h4>
                                  {breakdown && (
                                    <Badge>{breakdown.score}/{breakdown.maxScore} ({breakdown.percentage}%)</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">{typeof analysis === 'string' ? analysis : ''}</p>
                              </Card>
                            );
                          })
                        ) : (
                          /* Old format with communication/technical/behavioral */
                          Object.entries(selectedFeedback.detailedAnalysis).map(([category, data]: [string, any]) => (
                            <Card key={category} className="p-6">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold capitalize">{category}</h4>
                                <Badge>{data?.score || 0} points</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-4">{data?.feedback || ''}</p>
                              <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="font-medium mb-2">Strengths:</p>
                                  <ul className="space-y-1">
                                    {(data?.strengths || []).map((s: string, i: number) => (
                                      <li key={i}>• {s}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="font-medium mb-2">Improvements:</p>
                                  <ul className="space-y-1">
                                    {(data?.improvements || []).map((imp: string, i: number) => (
                                      <li key={i}>• {imp}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    )}

                    {selectedFeedback.scoreBreakdown && (
                      <div className="space-y-4 mt-6">
                        <h3 className="text-xl font-bold">Score Breakdown</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          {Object.entries(selectedFeedback.scoreBreakdown).map(([category, breakdown]) => (
                            <Card key={category} className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium capitalize text-sm">
                                  {category.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <Badge variant="secondary">
                                  {breakdown.score}/{breakdown.maxScore}
                                </Badge>
                              </div>
                              <Progress value={(breakdown.score / breakdown.maxScore) * 100} className="h-2" />
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <Button onClick={() => { setActiveTab("start"); setSelectedFeedback(null); setCurrentSession(null); setCurrentQuestion(null); }} className="flex-1">
                        Start New Interview
                      </Button>
                      <Button variant="outline" onClick={() => setActiveTab("history")} className="flex-1">
                        View History
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default InterviewNew;
