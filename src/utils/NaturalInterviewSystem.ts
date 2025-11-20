/**
 * Natural Conversational Interview System
 * Implements automatic turn-taking, voice activity detection, and adaptive questioning
 */

interface InterviewMessage {
  role: 'ai' | 'user';
  text: string;
  timestamp: number;
}

interface ConversationOptions {
  onTranscriptUpdate: (messages: InterviewMessage[]) => void;
  onAISpeakingChange: (isSpeaking: boolean) => void;
  onUserSpeakingChange: (isSpeaking: boolean) => void;
  onQuestionAsked: (questionNumber: number, total: number) => void;
  onInterviewComplete: (transcript: InterviewMessage[]) => void;
  onError: (error: string) => void;
  jobRole: string;
  experienceLevel: string;
  confidenceLevel?: 'low' | 'medium' | 'high';
}

export class NaturalInterviewSystem {
  private options: ConversationOptions;
  private recognition: any; // SpeechRecognition
  private synthesis: SpeechSynthesis;
  private transcript: InterviewMessage[] = [];
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
  private currentQuestionIndex: number = 0;
  private totalQuestions: number = 0;
  private userName: string = '';
  private askedForName: boolean = false;

  // Voice Activity Detection thresholds
  private readonly SILENCE_THRESHOLD = -50; // dB
  private readonly SILENCE_DURATION = 1500; // 1.5 seconds for more natural flow
  private readonly MIN_SPEECH_DURATION = 600; // ms - shorter minimum
  private readonly SPEECH_THRESHOLD = -42; // dB
  private lastUserSpeechTime: number = 0;
  private lastSoundDetected: number = 0;

  // Question bank with natural variations
  private questionBank: string[] = [];

  constructor(options: ConversationOptions) {
    this.options = options;
    this.synthesis = window.speechSynthesis;
    
    // Generate randomized question count (8-20)
    this.totalQuestions = Math.floor(Math.random() * 13) + 8; // 8-20 questions
    
    // Initialize question bank
    this.initializeQuestionBank();
  }

  private initializeQuestionBank() {
    const { jobRole, experienceLevel, confidenceLevel } = this.options;
    
    // Adaptive question pool based on experience and confidence
    const easyQuestions = [
      `Tell me a bit about your background and what interests you about ${jobRole}.`,
      `What are your strongest skills related to ${jobRole}?`,
      `Can you walk me through your most recent project or work experience?`,
      `How do you typically approach learning new technologies or concepts?`,
      `What motivates you in your work?`,
    ];

    const mediumQuestions = [
      `Describe a challenging problem you faced recently and how you solved it.`,
      `Tell me about a time you had to work with a difficult team member. How did you handle it?`,
      `How do you prioritize tasks when you have multiple deadlines?`,
      `Can you share an example of when you had to learn something quickly under pressure?`,
      `What's your approach to debugging or troubleshooting complex issues?`,
      `Describe a situation where you had to make a decision without complete information.`,
    ];

    const hardQuestions = [
      `How do you balance technical excellence with business requirements?`,
      `Tell me about a time you disagreed with a technical decision. How did you handle it?`,
      `Describe your approach to mentoring or leading junior team members.`,
      `How do you stay updated with industry trends while maintaining productivity?`,
      `Can you discuss a project that didn't go as planned? What would you do differently?`,
      `How do you approach system design or architecture decisions?`,
    ];

    const behavioralQuestions = [
      `Can you give me an example of a time you showed initiative at work?`,
      `Tell me about your most significant achievement so far.`,
      `How do you handle feedback or criticism?`,
      `Describe a time when you had to adapt to a significant change.`,
      `What's your approach to work-life balance?`,
    ];

    // Build question pool based on experience level
    let questionPool: string[] = [];
    
    if (experienceLevel === 'Fresher/Entry-level') {
      questionPool = [
        ...easyQuestions,
        ...mediumQuestions.slice(0, 3),
        ...behavioralQuestions.slice(0, 2),
      ];
    } else if (experienceLevel === 'Mid-level') {
      questionPool = [
        ...easyQuestions.slice(0, 2),
        ...mediumQuestions,
        ...hardQuestions.slice(0, 3),
        ...behavioralQuestions,
      ];
    } else { // Senior
      questionPool = [
        ...easyQuestions.slice(0, 1),
        ...mediumQuestions.slice(0, 3),
        ...hardQuestions,
        ...behavioralQuestions.slice(0, 3),
      ];
    }

    // Shuffle and select questions
    const shuffled = questionPool.sort(() => Math.random() - 0.5);
    this.questionBank = shuffled.slice(0, this.totalQuestions);
  }

  async initialize(): Promise<boolean> {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Initialize Audio Context for VAD
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContext();
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
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }

        if (finalTranscript) {
          this.userSpeechBuffer += finalTranscript;
          this.lastUserSpeechTime = Date.now();
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setTimeout(() => {
            if (this.conversationActive && !this.isAISpeaking) {
              try {
                this.recognition?.start();
              } catch (e) {
                // Ignore if already started
              }
            }
          }, 100);
        }
      };

      this.recognition.onend = () => {
        if (this.conversationActive && !this.isAISpeaking) {
          setTimeout(() => {
            try {
              this.recognition?.start();
            } catch (e) {
              console.log('Recognition already started');
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
    return average > 0 ? 20 * Math.log10(average / 255) : -100;
  }

  private startVoiceActivityDetection() {
    this.vadInterval = setInterval(() => {
      if (this.isAISpeaking) {
        if (this.isUserSpeaking) {
          this.isUserSpeaking = false;
          this.options.onUserSpeakingChange(false);
        }
        return;
      }

      const audioLevel = this.getAudioLevel();
      const isSpeaking = audioLevel > this.SPEECH_THRESHOLD;

      if (isSpeaking) {
        this.lastSoundDetected = Date.now();
      }

      // Update speaking state
      if (isSpeaking !== this.isUserSpeaking) {
        this.isUserSpeaking = isSpeaking;
        this.options.onUserSpeakingChange(isSpeaking);

        if (!isSpeaking && this.userSpeechBuffer.trim()) {
          // User stopped speaking - check if enough silence has passed
          this.checkSilenceTimeout();
        }
      }
    }, 100);
  }

  private checkSilenceTimeout() {
    this.clearSilenceTimer();

    this.silenceTimer = setTimeout(() => {
      const silenceDuration = Date.now() - this.lastSoundDetected;
      const speechDuration = this.lastSoundDetected - this.lastUserSpeechTime + this.userSpeechBuffer.length * 10;

      if (
        this.userSpeechBuffer.trim() && 
        silenceDuration >= this.SILENCE_DURATION &&
        speechDuration >= this.MIN_SPEECH_DURATION
      ) {
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

  private stopVoiceActivityDetection() {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
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

    // Check if user mentioned their name in response (for first question)
    if (!this.userName && this.askedForName) {
      // Simple name extraction (look for "I'm" or "I am" or common name patterns)
      const nameMatch = response.match(/(?:i'm|i am|my name is)\s+(\w+)/i);
      if (nameMatch) {
        this.userName = nameMatch[1];
      } else {
        // Try to extract first word if it looks like a name
        const words = response.trim().split(/\s+/);
        if (words.length > 0 && words[0].length > 2) {
          this.userName = words[0];
        }
      }
    }

    // Wait before AI responds (natural timing - shorter for better flow)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if answer is too short and prompt for more detail
    const wordCount = response.split(/\s+/).length;
    if (wordCount < 8 && this.currentQuestionIndex > 0) {
      await this.speakText(
        "Hmm, that's a bit brief. Could you expand on that a little? I'd love to hear more details about your experience."
      );
      // Don't move to next question, give them another chance
      return;
    }

    // Continue to next question
    await this.askNextQuestion();
  }

  private async speakText(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.isAISpeaking) {
        this.synthesis.cancel();
      }

      this.isAISpeaking = true;
      this.options.onAISpeakingChange(true);

      // Stop recognition while AI speaks
      try {
        this.recognition?.stop();
      } catch (e) {
        // Ignore
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // Slightly slower for natural feel
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Use a natural-sounding voice
      const voices = this.synthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google US English') ||
        voice.name.includes('Samantha') ||
        voice.name.includes('Karen') ||
        (voice.lang.startsWith('en') && voice.name.includes('Female'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        this.isAISpeaking = false;
        this.options.onAISpeakingChange(false);

        // Add AI message to transcript
        const aiMessage: InterviewMessage = {
          role: 'ai',
          text: text,
          timestamp: Date.now()
        };
        this.transcript.push(aiMessage);
        this.options.onTranscriptUpdate([...this.transcript]);

        // Restart recognition
        setTimeout(() => {
          if (this.conversationActive) {
            try {
              this.recognition?.start();
            } catch (e) {
              console.log('Recognition already running');
            }
          }
        }, 300);

        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        this.isAISpeaking = false;
        this.options.onAISpeakingChange(false);
        resolve();
      };

      this.synthesis.speak(utterance);
    });
  }

  private async askNextQuestion() {
    // Check if interview is complete
    if (this.currentQuestionIndex >= this.questionBank.length) {
      await this.completeInterview();
      return;
    }

    const question = this.questionBank[this.currentQuestionIndex];
    this.currentQuestionIndex++;

    this.options.onQuestionAsked(this.currentQuestionIndex, this.totalQuestions);

    // Add natural transition phrases
    let fullQuestion = question;
    
    if (this.currentQuestionIndex === 1) {
      // First question after intro - no transition needed
      fullQuestion = question;
    } else if (this.currentQuestionIndex === 2) {
      fullQuestion = `Great. Now, ${question.charAt(0).toLowerCase() + question.slice(1)}`;
    } else {
      const transitions = [
        `Okay, next question. ${question}`,
        `Alright, moving on. ${question}`,
        `Good. Let me ask you this: ${question}`,
        `Thanks for sharing. ${question}`,
        `I see. ${question}`,
        `Interesting. ${question}`,
      ];
      fullQuestion = transitions[Math.floor(Math.random() * transitions.length)];
    }

    await this.speakText(fullQuestion);
  }

  private async completeInterview() {
    const closingMessage = this.userName
      ? `Excellent, ${this.userName}. That concludes our interview today. You did great answering all ${this.totalQuestions} questions. I'm now going to analyze your responses and generate detailed feedback. This will just take a moment. Thank you!`
      : `Great job! That concludes our interview. I'm now analyzing your responses to provide you with detailed feedback. This will just take a moment. Thank you!`;

    await this.speakText(closingMessage);

    this.conversationActive = false;
    this.options.onInterviewComplete([...this.transcript]);
  }

  async start() {
    if (!this.isInitialized) {
      throw new Error('Interview system not initialized');
    }

    this.conversationActive = true;
    this.askedForName = true;

    // Start voice activity detection
    this.startVoiceActivityDetection();

    // Start speech recognition
    try {
      this.recognition?.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }

    // Begin with natural greeting introducing the AI
    const greeting = "Hi there! I'm PAUL, your AI interviewer for today. May I know your name?";
    await this.speakText(greeting);

    // Wait for name response, then start with welcome and elevator pitch
    setTimeout(async () => {
      if (this.userName) {
        await this.speakText(
          `Welcome, ${this.userName}! It's great to have you here. Let's begin with your interview. For your first question—give me your elevator pitch. Tell me about yourself and what makes you stand out.`
        );
      } else {
        await this.speakText(`Welcome to your interview! Let's begin. For your first question—give me your elevator pitch. Tell me about yourself.`);
      }
      
      // Wait a moment then continue to second question after elevator pitch
      setTimeout(() => {
        // The elevator pitch counts as first exchange, now we ask actual questions
        this.askNextQuestion();
      }, 1000);
    }, 7000); // Give 7 seconds for name response
  }

  stop() {
    this.conversationActive = false;

    try {
      this.recognition?.stop();
    } catch (e) {
      // Ignore
    }

    this.synthesis.cancel();
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

  getTotalQuestions(): number {
    return this.totalQuestions;
  }

  getCurrentQuestionNumber(): number {
    return this.currentQuestionIndex;
  }
}
