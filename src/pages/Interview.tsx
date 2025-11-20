import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import TranscriptModal from "@/components/TranscriptModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, PhoneOff, Loader2, History, Play, Eye, Mic, MicOff, Volume2 } from "lucide-react";
import { NaturalInterviewSystem } from "@/utils/NaturalInterviewSystem";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

type InterviewSession = {
  id: string;
  user_id?: string;
  interview_type: string;
  duration: number | null;
  transcript: { messages: string[] } | null;
  feedback: Record<string, unknown> | null;
  score: number | null;
  status: string;
  created_at: string;
  completed_at: string | null;
};

type InterviewMessage = {
  role: 'ai' | 'user';
  text: string;
  timestamp: number;
};

const Interview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, initializing } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [interviewHistory, setInterviewHistory] = useState<InterviewSession[]>([]);
  const [activeTab, setActiveTab] = useState("interview");
  const [selectedSession, setSelectedSession] = useState<InterviewSession | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [jobRole, setJobRole] = useState<string>("");
  const [experienceLevel, setExperienceLevel] = useState<string>("");
  const [confidenceLevel, setConfidenceLevel] = useState<string>("medium");
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const interviewSystemRef = useRef<NaturalInterviewSystem | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initializing && !user) {
      navigate("/auth");
    }
  }, [initializing, navigate, user]);

  useEffect(() => {
    if (user) {
      fetchInterviewHistory();
    } else if (!initializing) {
      setInterviewHistory([]);
    }
  }, [user, initializing]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchInterviewHistory = async () => {
    if (!user) {
      return;
    }

    try {
  const { sessions } = await apiFetch<{ sessions: InterviewSession[] }>("/api/interviews");
      setInterviewHistory(sessions);
    } catch (error) {
      console.error("Failed to fetch interview history", error);
      toast({
        title: "Error",
        description: "Unable to load interview history",
        variant: "destructive",
      });
    }
  };

  const startInterview = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setIsLoading(true);
    
    try {
      // Create interview session
      const { session } = await apiFetch<{ session: any }>("/api/interviews", {
        method: "POST",
        body: JSON.stringify({ interview_type: "AI Real-time Interview" }),
      });

      if (session) {
        setSessionId(session.id);
      }

      // Initialize natural interview system
      interviewSystemRef.current = new NaturalInterviewSystem({
        jobRole: "Software Engineer", // Default value
        experienceLevel: "Mid-level", // Default value
        onTranscriptUpdate: (newMessages) => {
          setMessages(newMessages);
        },
        onAISpeakingChange: (speaking) => {
          setIsSpeaking(speaking);
        },
        onUserSpeakingChange: (speaking) => {
          setIsUserSpeaking(speaking);
        },
        onQuestionAsked: (questionNum, total) => {
          setCurrentQuestionNumber(questionNum);
          setTotalQuestions(total);
        },
        onInterviewComplete: async (transcript) => {
          // Handle completion
          await endInterview();
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error,
            variant: "destructive",
          });
        },
      });

      const initialized = await interviewSystemRef.current.initialize();
      
      if (!initialized) {
        throw new Error('Failed to initialize interview system');
      }

      setIsConnected(true);
      
      toast({
        title: "Interview Started",
        description: "The AI interviewer will begin shortly. Speak naturally - the system will automatically detect when you're done speaking.",
      });

      // Start the interview conversation
      await interviewSystemRef.current.start();
      
    } catch (error) {
      console.error('Error starting interview:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to start interview',
        variant: "destructive",
      });
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const endInterview = async () => {
    // Stop the interview system
    interviewSystemRef.current?.stop();
    
    setIsConnected(false);
    setIsSpeaking(false);
    setIsUserSpeaking(false);
    
    if (sessionId && messages.length > 0) {
      // Show analyzing state immediately
      setIsAnalyzing(true);
      
      try {
        // Convert messages to transcript format
        const transcript = messages.map(msg => 
          `${msg.role === 'ai' ? 'AI' : 'You'}: ${msg.text}`
        );

        // Save transcript first
        await apiFetch(`/api/interviews/${sessionId}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: "completed",
            transcript: { messages: transcript },
          }),
        });

        // Start analysis immediately
        const analysisPromise = apiFetch<any>("/api/ai/analyze-interview", {
          method: "POST",
          body: JSON.stringify({ transcript }),
        });

        // Show immediate feedback that analysis started
        toast({
          title: "Generating Feedback",
          description: "Analyzing your interview performance...",
        });

        const analysis = await analysisPromise;

        // Update with feedback immediately
        await apiFetch(`/api/interviews/${sessionId}`, {
          method: "PATCH",
          body: JSON.stringify({
            feedback: analysis,
            score: analysis?.overall_score ?? null,
          }),
        });

        // Show score immediately
        if (typeof analysis?.overall_score === "number") {
          toast({
            title: "Feedback Ready!",
            description: `Your interview score: ${analysis.overall_score}/100. Check the History tab for details.`,
          });
        } else {
          toast({
            title: "Feedback Ready!",
            description: "Your interview analysis is complete. Check the History tab.",
          });
        }

        await fetchInterviewHistory();
      } catch (error) {
        console.error('Error ending interview:', error);
        toast({
          title: "Error",
          description: "Failed to analyze interview, but transcript was saved.",
          variant: "destructive",
        });
      } finally {
        setIsAnalyzing(false);
      }
    }
    
    setMessages([]);
    setSessionId(null);
    setCurrentQuestionNumber(0);
    setTotalQuestions(0);
    setActiveTab("history");
  };

  useEffect(() => {
    return () => {
      interviewSystemRef.current?.cleanup();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
              AI Voice Interview Platform
            </h1>
            <p className="text-xl text-muted-foreground">
              Practice with real-time voice conversations
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="interview">
                <Play className="w-4 h-4 mr-2" />
                Interview
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="w-4 h-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="interview">
              {!isConnected ? (
                <Card className="p-8 shadow-card text-center">
                  <div className="max-w-2xl mx-auto">
                    <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-6">
                      <Phone className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Ready for Your Real-time Interview?</h2>
                    <p className="text-muted-foreground mb-8">
                      Experience a natural, two-way conversation with our AI interviewer. The system automatically 
                      detects when you're speaking and when you're done, creating a seamless interview experience. 
                      No buttons to press - just speak naturally!
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8 text-left">
                      <h3 className="text-sm font-semibold text-green-900 mb-2">✨ What to expect:</h3>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Meet PAUL - your AI interviewer who'll guide you through the session</li>
                        <li>• 8-20 randomized interview questions adapted to your experience</li>
                        <li>• Automatic turn-taking with Voice Activity Detection (no manual controls)</li>
                        <li>• Natural conversation flow - just like talking to a real person</li>
                        <li>• Immediate comprehensive feedback when you finish</li>
                        <li>• Transparent scoring breakdown in your history</li>
                      </ul>
                    </div>
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2 text-primary">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Connecting to interviewer...</span>
                      </div>
                    ) : (
                      <Button 
                        size="lg"
                        onClick={startInterview}
                        className="h-14 px-8"
                      >
                        <Phone className="w-5 h-5 mr-2" />
                        Start Interview
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="p-8 shadow-card">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">Real-time AI Interview</h2>
                      <p className="text-muted-foreground">Automatic conversation - no buttons needed</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={isUserSpeaking ? "default" : "secondary"} className="text-lg px-4 py-2">
                        {isUserSpeaking ? (
                          <>
                            <Mic className="w-4 h-4 mr-2 animate-pulse" />
                            You Speaking
                          </>
                        ) : (
                          <>
                            <MicOff className="w-4 h-4 mr-2" />
                            Listening
                          </>
                        )}
                      </Badge>
                      <Badge variant={isSpeaking ? "default" : "secondary"} className="text-lg px-4 py-2">
                        {isSpeaking ? (
                          <>
                            <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
                            AI Speaking
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4 mr-2 opacity-50" />
                            AI Listening
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>

                  {/* Progress Display */}
                  {totalQuestions > 0 && (
                    <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-lg mb-6">
                      <p className="text-xs font-semibold text-primary mb-1">Progress:</p>
                      <p className="text-base font-medium text-foreground">
                        Question {currentQuestionNumber} of {totalQuestions}
                      </p>
                    </div>
                  )}

                  <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-8 rounded-lg mb-6 text-center">
                    <div className="flex justify-center items-center gap-2 mb-4">
                      {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                        <div
                          key={bar}
                          className={`w-3 rounded-full transition-all duration-150 ${
                            isSpeaking ? 'bg-accent animate-pulse' : isUserSpeaking ? 'bg-primary animate-pulse' : 'bg-muted'
                          }`}
                          style={{
                            height: isSpeaking || isUserSpeaking ? `${Math.random() * 50 + 30}px` : '30px',
                            animationDelay: `${bar * 0.1}s`
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-lg font-medium mb-2">
                      {isSpeaking ? "🎤 AI is speaking - listen carefully" : isUserSpeaking ? "🎙️ You're speaking - keep going" : "⏸️ Waiting for next turn"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isSpeaking 
                        ? "The AI will wait for you to respond" 
                        : "Speak naturally - the AI detects when you're done (1.5 sec of silence)"}
                    </p>
                  </div>

                  <div className="bg-muted/30 p-6 rounded-lg mb-6 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-muted-foreground">Live Conversation:</p>
                      <Badge variant="outline" className="text-xs">
                        {messages.length} exchanges
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {messages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Conversation will appear here...</p>
                        </div>
                      ) : (
                        messages.map((message, index) => (
                          <div
                            key={index}
                            className={`p-4 rounded-lg transition-all ${
                              message.role === 'ai'
                                ? 'bg-primary/10 text-foreground'
                                : 'bg-accent/10 text-foreground ml-8'
                            }`}
                          >
                            <p className="text-sm font-semibold mb-2">
                              {message.role === 'ai' ? '🤖 AI Interviewer' : '👤 You'}
                            </p>
                            <p className="text-base leading-relaxed">
                              {message.text}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        ))
                      )}
                      <div ref={transcriptEndRef} />
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 How it works:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• The AI interviewer (PAUL) will greet you and ask for your name</li>
                      <li>• Speak naturally - no need to press any buttons</li>
                      <li>• The system detects when you're done (1.5 sec silence)</li>
                      <li>• The AI will respond conversationally and ask the next question</li>
                      <li>• Questions are randomized (8-20 questions total)</li>
                      <li>• Feedback appears immediately after you end the interview</li>
                    </ul>
                  </div>

                  <div className="flex justify-center">
                    <Button 
                      size="lg"
                      variant="destructive"
                      onClick={endInterview}
                      className="h-14 px-8"
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Analyzing Interview...
                        </>
                      ) : (
                        <>
                          <PhoneOff className="w-5 h-5 mr-2" />
                          End Interview
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history">
              <div className="mb-6">
                <h2 className="text-3xl font-bold mb-2">Interview History</h2>
                <p className="text-muted-foreground">Review your past interviews and track your progress</p>
              </div>
              {interviewHistory.length === 0 ? (
                <Card className="p-12 shadow-card text-center">
                  <History className="w-20 h-20 mx-auto mb-4 opacity-30 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No interviews yet</h3>
                  <p className="text-muted-foreground mb-6">Start your first interview to see your progress here</p>
                  <Button onClick={() => setActiveTab("interview")}>
                    <Play className="w-4 h-4 mr-2" />
                    Start Interview
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {interviewHistory.map((session) => {
                    // Calculate performance level based on score
                    const getPerformanceLevel = (score: number | null) => {
                      if (score === null || score === undefined) return { label: "Pending", variant: "secondary" as const, color: "text-gray-500" };
                      if (score >= 85) return { label: "Excellent", variant: "default" as const, color: "text-green-600" };
                      if (score >= 70) return { label: "Good", variant: "default" as const, color: "text-blue-600" };
                      if (score >= 50) return { label: "Mixed", variant: "secondary" as const, color: "text-yellow-600" };
                      return { label: "Needs Work", variant: "secondary" as const, color: "text-red-600" };
                    };

                    const performance = getPerformanceLevel(session.score);
                    const messageCount = session.transcript?.messages?.length || 0;

                    return (
                      <Card 
                        key={session.id} 
                        className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/50"
                        onClick={() => {
                          if (session.transcript?.messages) {
                            setSelectedSession(session);
                            setModalOpen(true);
                          }
                        }}
                      >
                        {/* Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div className="relative p-6">
                          {/* Icon/Image Section */}
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-md">
                            <Phone className="w-8 h-8 text-white" />
                          </div>

                          {/* Title */}
                          <h3 className="text-xl font-bold mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                            {session.interview_type}
                          </h3>

                          {/* Date */}
                          <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
                            <span>📅</span>
                            {new Date(session.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>

                          {/* Score Display */}
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Your Score</p>
                              <p className={`text-3xl font-bold ${performance.color}`}>
                                {session.score !== null && session.score !== undefined 
                                  ? `${session.score}/100`
                                  : '---/100'
                                }
                              </p>
                            </div>
                            <Badge variant={performance.variant} className="text-sm px-3 py-1">
                              {performance.label}
                            </Badge>
                          </div>

                          {/* Stats Bar */}
                          <div className="bg-muted/50 rounded-lg p-3 mb-4 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Status:</span>
                              <span className="font-semibold capitalize">{session.status}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Exchanges:</span>
                              <span className="font-semibold">{messageCount} messages</span>
                            </div>
                            {session.duration && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Duration:</span>
                                <span className="font-semibold">{Math.round(session.duration / 60)} min</span>
                              </div>
                            )}
                          </div>

                          {/* CTA Section */}
                          <div className="flex items-center justify-between pt-3 border-t border-border">
                            <span className="text-sm text-muted-foreground">
                              {session.transcript?.messages ? "Click to view details" : "No transcript"}
                            </span>
                            {session.transcript?.messages && (
                              <Eye className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                            )}
                          </div>

                          {/* Hover Overlay */}
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xl">👁️</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <TranscriptModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        session={selectedSession}
      />
    </div>
  );
};

export default Interview;
