/**
 * Real-time AI Interview System
 * Handles automatic turn-taking, silence detection, and dynamic question generation
 */

interface InterviewQuestion {
  id: string;
  text: string;
  category: 'technical' | 'behavioral' | 'situational' | 'experience' | 'general';
  difficulty: 'easy' | 'medium' | 'hard';
  followUpTopics?: string[];
}

interface InterviewMessage {
  role: 'ai' | 'user';
  text: string;
  timestamp: number;
}

interface RealtimeInterviewOptions {
  onTranscriptUpdate: (messages: InterviewMessage[]) => void;
  onAISpeakingChange: (isSpeaking: boolean) => void;
  onUserSpeakingChange: (isSpeaking: boolean) => void;
  onQuestionAsked: (question: InterviewQuestion) => void;
  onError: (error: string) => void;
  apiKey: string;
}

export class RealtimeInterviewSystem {
  private options: RealtimeInterviewOptions;
  private recognition: any; // SpeechRecognition
  private synthesis: SpeechSynthesisUtterance;
  private transcript: InterviewMessage[] = [];
  private questionPool: InterviewQuestion[] = [];
  private askedQuestions: Set<string> = new Set();
  private currentQuestion: InterviewQuestion | null = null;
  private isAISpeaking: boolean = false;
  private isUserSpeaking: boolean = false;
  private silenceTimer: NodeJS.Timeout | null = null;
  private userSpeechBuffer: string = '';
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private vadInterval: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  private conversationActive: boolean = false;
  private lastUserSpeechTime: number = 0;

  // Silence detection thresholds
  private readonly SILENCE_THRESHOLD = -50; // dB
  private readonly SILENCE_DURATION = 1500; // ms
  private readonly MIN_SPEECH_DURATION = 500; // ms
  private readonly SPEECH_THRESHOLD = -45; // dB

  constructor(options: RealtimeInterviewOptions) {
    this.options = options;
    this.synthesis = new SpeechSynthesisUtterance();
    this.synthesis.rate = 1.0;
    this.synthesis.pitch = 1.0;
    this.synthesis.volume = 1.0;
    
    // Initialize question pool
    this.initializeQuestionPool();
  }

  private initializeQuestionPool() {
    this.questionPool = [
      // Easy General Questions
      {
        id: 'q1',
        text: 'Tell me about yourself and your background.',
        category: 'general',
        difficulty: 'easy',
        followUpTopics: ['education', 'experience', 'skills']
      },
      {
        id: 'q2',
        text: 'What interests you most about this position?',
        category: 'general',
        difficulty: 'easy',
        followUpTopics: ['motivation', 'career goals']
      },
      {
        id: 'q3',
        text: 'Where do you see yourself in five years?',
        category: 'general',
        difficulty: 'easy',
        followUpTopics: ['ambitions', 'growth']
      },

      // Technical Questions
      {
        id: 'q4',
        text: 'What are your strongest technical skills?',
        category: 'technical',
        difficulty: 'easy',
        followUpTopics: ['projects', 'implementations']
      },
      {
        id: 'q5',
        text: 'Describe a challenging technical problem you solved recently.',
        category: 'technical',
        difficulty: 'medium',
        followUpTopics: ['problem-solving', 'methodology']
      },
      {
        id: 'q6',
        text: 'How do you stay updated with the latest technologies in your field?',
        category: 'technical',
        difficulty: 'easy',
        followUpTopics: ['learning', 'professional development']
      },
      {
        id: 'q7',
        text: 'Walk me through your approach to debugging a complex issue.',
        category: 'technical',
        difficulty: 'medium',
        followUpTopics: ['debugging', 'tools', 'methodology']
      },

      // Behavioral Questions
      {
        id: 'q8',
        text: 'Tell me about a time when you had to work with a difficult team member.',
        category: 'behavioral',
        difficulty: 'medium',
        followUpTopics: ['teamwork', 'conflict resolution']
      },
      {
        id: 'q9',
        text: 'Describe a situation where you had to meet a tight deadline.',
        category: 'behavioral',
        difficulty: 'medium',
        followUpTopics: ['time management', 'pressure handling']
      },
      {
        id: 'q10',
        text: 'Give me an example of when you showed leadership.',
        category: 'behavioral',
        difficulty: 'medium',
        followUpTopics: ['leadership', 'initiative']
      },
      {
        id: 'q11',
        text: 'Tell me about a time you failed and what you learned from it.',
        category: 'behavioral',
        difficulty: 'medium',
        followUpTopics: ['resilience', 'learning', 'growth']
      },

      // Situational Questions
      {
        id: 'q12',
        text: 'How would you handle a situation where you disagree with your manager?',
        category: 'situational',
        difficulty: 'medium',
        followUpTopics: ['communication', 'professionalism']
      },
      {
        id: 'q13',
        text: 'If you were given conflicting priorities, how would you decide what to work on?',
        category: 'situational',
        difficulty: 'medium',
        followUpTopics: ['prioritization', 'decision-making']
      },
      {
        id: 'q14',
        text: 'What would you do if you noticed a team member was struggling with their work?',
        category: 'situational',
        difficulty: 'easy',
        followUpTopics: ['empathy', 'collaboration']
      },

      // Experience Questions
      {
        id: 'q15',
        text: 'What project are you most proud of and why?',
        category: 'experience',
        difficulty: 'easy',
        followUpTopics: ['achievements', 'impact']
      },
      {
        id: 'q16',
        text: 'Tell me about a time when you had to learn something new quickly.',
        category: 'experience',
        difficulty: 'medium',
        followUpTopics: ['learning agility', 'adaptation']
      },
      {
        id: 'q17',
        text: 'Describe your most significant contribution to a team project.',
        category: 'experience',
        difficulty: 'medium',
        followUpTopics: ['collaboration', 'value add']
      },

      // Advanced Questions
      {
        id: 'q18',
        text: 'How do you balance technical excellence with business requirements?',
        category: 'technical',
        difficulty: 'hard',
        followUpTopics: ['trade-offs', 'business acumen']
      },
      {
        id: 'q19',
        text: 'Tell me about a time when you had to make a decision without complete information.',
        category: 'behavioral',
        difficulty: 'hard',
        followUpTopics: ['decision-making', 'risk assessment']
      },
      {
        id: 'q20',
        text: 'How do you handle situations where you need to give critical feedback to peers?',
        category: 'situational',
        difficulty: 'hard',
        followUpTopics: ['communication', 'leadership']
      }
    ];
  }

  async initialize(): Promise<boolean> {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Initialize Audio Context for VAD
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      // Initialize Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Speech Recognition not supported in this browser');
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          this.userSpeechBuffer += finalTranscript + ' ';
          this.lastUserSpeechTime = Date.now();
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          // Restart recognition
          setTimeout(() => {
            if (this.conversationActive) {
              this.recognition?.start();
            }
          }, 100);
        }
      };

      this.recognition.onend = () => {
        // Auto-restart if conversation is active
        if (this.conversationActive && !this.isAISpeaking) {
          setTimeout(() => {
            try {
              this.recognition?.start();
            } catch (e) {
              console.log('Recognition restart error:', e);
            }
          }, 100);
        }
      };

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize interview system:', error);
      this.options.onError(error instanceof Error ? error.message : 'Initialization failed');
      return false;
    }
  }

  private getAudioLevel(): number {
    if (!this.analyser) return -100;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;

    // Convert to dB
    return 20 * Math.log10(average / 255);
  }

  private startVoiceActivityDetection() {
    this.vadInterval = setInterval(() => {
      if (this.isAISpeaking) {
        // Don't detect user speech while AI is speaking
        if (this.isUserSpeaking) {
          this.isUserSpeaking = false;
          this.options.onUserSpeakingChange(false);
        }
        return;
      }

      const audioLevel = this.getAudioLevel();
      const isSpeaking = audioLevel > this.SPEECH_THRESHOLD;

      if (isSpeaking !== this.isUserSpeaking) {
        this.isUserSpeaking = isSpeaking;
        this.options.onUserSpeakingChange(isSpeaking);

        if (isSpeaking) {
          // User started speaking
          this.clearSilenceTimer();
        } else {
          // User stopped speaking - start silence timer
          this.startSilenceTimer();
        }
      }
    }, 100);
  }

  private stopVoiceActivityDetection() {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
  }

  private startSilenceTimer() {
    this.clearSilenceTimer();

    const timeSinceLastSpeech = Date.now() - this.lastUserSpeechTime;
    if (timeSinceLastSpeech < this.MIN_SPEECH_DURATION) {
      return; // Too short to be meaningful speech
    }

    this.silenceTimer = setTimeout(() => {
      if (this.userSpeechBuffer.trim()) {
        this.processUserResponse(this.userSpeechBuffer.trim());
        this.userSpeechBuffer = '';
      }
    }, this.SILENCE_DURATION);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private async processUserResponse(response: string) {
    // Add user message to transcript
    const userMessage: InterviewMessage = {
      role: 'user',
      text: response,
      timestamp: Date.now()
    };
    this.transcript.push(userMessage);
    this.options.onTranscriptUpdate([...this.transcript]);

    // Wait a moment before AI responds (natural conversation timing)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate and ask next question
    await this.askNextQuestion(response);
  }

  private selectNextQuestion(previousResponse?: string): InterviewQuestion | null {
    // Filter out already asked questions
    const availableQuestions = this.questionPool.filter(q => !this.askedQuestions.has(q.id));

    if (availableQuestions.length === 0) {
      return null; // All questions asked
    }

    // Simple selection strategy: randomize with preference for variety
    const askedCount = this.askedQuestions.size;
    let targetDifficulty: 'easy' | 'medium' | 'hard' = 'easy';

    if (askedCount < 3) {
      targetDifficulty = 'easy';
    } else if (askedCount < 6) {
      targetDifficulty = 'medium';
    } else {
      targetDifficulty = 'hard';
    }

    // Filter by difficulty and randomize
    let candidates = availableQuestions.filter(q => q.difficulty === targetDifficulty);
    if (candidates.length === 0) {
      candidates = availableQuestions;
    }

    // Prefer different categories from last question
    if (this.currentQuestion) {
      const differentCategory = candidates.filter(q => q.category !== this.currentQuestion!.category);
      if (differentCategory.length > 0) {
        candidates = differentCategory;
      }
    }

    // Randomize
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  }

  private async speakText(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isAISpeaking) {
        window.speechSynthesis.cancel();
      }

      this.isAISpeaking = true;
      this.options.onAISpeakingChange(true);

      // Stop user speech recognition while AI is speaking
      try {
        this.recognition?.stop();
      } catch (e) {
        // Ignore errors
      }

      this.synthesis.text = text;
      
      this.synthesis.onend = () => {
        this.isAISpeaking = false;
        this.options.onAISpeakingChange(false);

        // Restart speech recognition after AI finishes
        setTimeout(() => {
          if (this.conversationActive) {
            try {
              this.recognition?.start();
            } catch (e) {
              console.log('Recognition restart error:', e);
            }
          }
        }, 300);

        resolve();
      };

      this.synthesis.onerror = (event) => {
        this.isAISpeaking = false;
        this.options.onAISpeakingChange(false);
        console.error('Speech synthesis error:', event);
        resolve(); // Resolve anyway to continue
      };

      window.speechSynthesis.speak(this.synthesis);
    });
  }

  private async askNextQuestion(previousResponse?: string) {
    const question = this.selectNextQuestion(previousResponse);

    if (!question) {
      // Interview complete
      await this.speakText("Thank you for your responses. That concludes our interview today. We'll be in touch soon with the results.");
      this.conversationActive = false;
      return;
    }

    this.currentQuestion = question;
    this.askedQuestions.add(question.id);
    this.options.onQuestionAsked(question);

    // Add question to transcript
    const aiMessage: InterviewMessage = {
      role: 'ai',
      text: question.text,
      timestamp: Date.now()
    };
    this.transcript.push(aiMessage);
    this.options.onTranscriptUpdate([...this.transcript]);

    // Speak the question
    await this.speakText(question.text);
  }

  async start() {
    if (!this.isInitialized) {
      throw new Error('Interview system not initialized');
    }

    this.conversationActive = true;

    // Start voice activity detection
    this.startVoiceActivityDetection();

    // Start speech recognition
    try {
      this.recognition?.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }

    // Begin with greeting
    const greeting = "Hello! Thank you for joining us today. I'm your AI interviewer, and I'll be asking you a series of questions to learn more about your experience and skills. Let's get started!";
    
    const greetingMessage: InterviewMessage = {
      role: 'ai',
      text: greeting,
      timestamp: Date.now()
    };
    this.transcript.push(greetingMessage);
    this.options.onTranscriptUpdate([...this.transcript]);

    await this.speakText(greeting);

    // Ask first question
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.askNextQuestion();
  }

  stop() {
    this.conversationActive = false;

    // Stop all components
    try {
      this.recognition?.stop();
    } catch (e) {
      // Ignore
    }

    window.speechSynthesis.cancel();
    this.stopVoiceActivityDetection();
    this.clearSilenceTimer();

    this.isAISpeaking = false;
    this.isUserSpeaking = false;
    this.options.onAISpeakingChange(false);
    this.options.onUserSpeakingChange(false);
  }

  cleanup() {
    this.stop();

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
  }

  getTranscript(): InterviewMessage[] {
    return [...this.transcript];
  }

  getAskedQuestions(): InterviewQuestion[] {
    return Array.from(this.askedQuestions).map(id => 
      this.questionPool.find(q => q.id === id)!
    );
  }
}
