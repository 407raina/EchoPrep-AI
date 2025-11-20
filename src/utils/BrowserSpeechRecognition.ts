export class BrowserSpeechRecognition {
  private recognition: any = null;
  private isListening = false;
  private onTranscriptCallback: (transcript: string, isFinal: boolean) => void;
  private onErrorCallback: (error: string) => void;

  constructor(
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onError: (error: string) => void
  ) {
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;
  }

  async initialize(): Promise<boolean> {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      this.onErrorCallback("Speech Recognition is not supported in this browser");
      return false;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const isFinal = event.results[i].isFinal;
          
          this.onTranscriptCallback(transcript, isFinal);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'no-speech') {
          // Restart if no speech detected
          if (this.isListening) {
            this.restart();
          }
        } else if (event.error === 'aborted') {
          // Restart if aborted
          if (this.isListening) {
            this.restart();
          }
        } else {
          this.onErrorCallback(`Speech recognition error: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        // Auto-restart if still supposed to be listening
        if (this.isListening) {
          this.restart();
        }
      };

      return true;
    } catch (error) {
      this.onErrorCallback("Failed to initialize speech recognition");
      return false;
    }
  }

  start() {
    if (!this.recognition) {
      this.onErrorCallback("Speech recognition not initialized");
      return;
    }

    try {
      this.isListening = true;
      this.recognition.start();
      console.log('Browser speech recognition started');
    } catch (error) {
      console.error('Error starting recognition:', error);
      // If already started, just continue
    }
  }

  stop() {
    if (!this.recognition) return;

    try {
      this.isListening = false;
      this.recognition.stop();
      console.log('Browser speech recognition stopped');
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }

  private restart() {
    if (!this.isListening) return;

    try {
      this.recognition.stop();
      setTimeout(() => {
        if (this.isListening) {
          this.recognition.start();
        }
      }, 100);
    } catch (error) {
      console.error('Error restarting recognition:', error);
    }
  }
}

export class VoiceActivityDetection {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private isMonitoring = false;
  private onVoiceActivity: (isActive: boolean) => void;
  private silenceTimeout: NodeJS.Timeout | null = null;
  private voiceThreshold = 0.02; // Adjust based on environment
  private silenceDuration = 1000; // 1 second of silence

  constructor(onVoiceActivity: (isActive: boolean) => void) {
    this.onVoiceActivity = onVoiceActivity;
  }

  async initialize(stream: MediaStream): Promise<boolean> {
    try {
      this.stream = stream;
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      return true;
    } catch (error) {
      console.error('Failed to initialize VAD:', error);
      return false;
    }
  }

  start() {
    if (!this.analyser) return;

    this.isMonitoring = true;
    this.monitor();
  }

  stop() {
    this.isMonitoring = false;
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  private monitor() {
    if (!this.isMonitoring || !this.analyser) return;

    const bufferLength = this.analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(dataArray);

    // Calculate RMS (Root Mean Square) for volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / bufferLength);

    if (rms > this.voiceThreshold) {
      // Voice detected
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
      }
      this.onVoiceActivity(true);
    } else {
      // Silence detected
      if (!this.silenceTimeout) {
        this.silenceTimeout = setTimeout(() => {
          this.onVoiceActivity(false);
          this.silenceTimeout = null;
        }, this.silenceDuration);
      }
    }

    requestAnimationFrame(() => this.monitor());
  }

  cleanup() {
    this.stop();
    if (this.microphone) {
      this.microphone.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
