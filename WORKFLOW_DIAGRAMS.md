# Career Echo AI - Complete Workflow Diagrams

This document contains comprehensive workflow diagrams for all major features of the Career Echo AI platform.

---

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend (React + TypeScript)"
        A[User Browser] --> B[React App]
        B --> C[React Router]
        B --> D[Auth Context]
        B --> E[React Query]
        C --> F[Pages]
        F --> G[API Client]
    end
    
    subgraph "Backend (Express + TypeScript)"
        G --> H[Express Server]
        H --> I[Auth Middleware]
        H --> J[Route Handlers]
        J --> K[Services Layer]
        K --> L[Database Pool]
        K --> M[AI Services]
    end
    
    subgraph "External Services"
        M --> N[Groq API]
        M --> O[OpenAI API]
        L --> P[PostgreSQL/Neon]
    end
    
    subgraph "Storage"
        J --> Q[File System]
        Q --> R[Resume Uploads]
        Q --> S[Audio Uploads]
    end
```

---

## 2. Authentication Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as API Server
    participant DB as Database
    participant JWT as JWT Service

    Note over U,JWT: Registration Flow
    U->>F: Enter email & password
    F->>API: POST /api/auth/register
    API->>DB: Check if email exists
    alt Email already exists
        DB-->>API: Email found
        API-->>F: 409 Conflict
        F-->>U: Show error
    else Email available
        DB-->>API: Email not found
        API->>API: Hash password (bcrypt)
        API->>DB: Insert new user
        DB-->>API: User created
        API->>JWT: Generate JWT token
        JWT-->>API: Token (7-day expiry)
        API->>API: Set httpOnly cookie
        API-->>F: { token, user }
        F->>F: Store token in localStorage
        F->>F: Update AuthContext
        F-->>U: Redirect to dashboard
    end

    Note over U,JWT: Login Flow
    U->>F: Enter credentials
    F->>API: POST /api/auth/login
    API->>DB: Find user by email
    DB-->>API: User data + password_hash
    API->>API: Compare password (bcrypt)
    alt Password incorrect
        API-->>F: 401 Unauthorized
        F-->>U: Show error
    else Password correct
        API->>JWT: Generate JWT token
        JWT-->>API: Token
        API->>API: Set httpOnly cookie
        API-->>F: { token, user }
        F->>F: Store token
        F->>F: Update AuthContext
        F-->>U: Redirect to dashboard
    end

    Note over U,JWT: Session Validation
    F->>API: GET /api/auth/me
    API->>JWT: Verify token
    alt Token valid
        JWT-->>API: Valid payload
        API->>DB: Get user data
        DB-->>API: User info
        API-->>F: { user }
        F->>F: Update AuthContext
    else Token invalid/expired
        JWT-->>API: Invalid
        API-->>F: 401 Unauthorized
        F->>F: Clear stored auth
        F-->>U: Redirect to /auth
    end
```

---

## 3. Resume Analysis Workflow

```mermaid
flowchart TD
    Start([User visits Resume page]) --> CheckAuth{User authenticated?}
    CheckAuth -->|No| Redirect1[Redirect to /auth]
    CheckAuth -->|Yes| ShowUpload[Show upload interface]
    
    ShowUpload --> UserSelects[User selects DOCX file]
    UserSelects --> Validate{File valid?}
    
    Validate -->|Invalid type/size| ShowError[Show error message]
    Validate -->|Valid| Upload[POST /api/resumes]
    
    Upload --> Multer[Multer saves file]
    Multer --> SavePath[File saved to server/uploads/resumes/]
    
    SavePath --> ExtractText[Extract text from DOCX]
    ExtractText --> Mammoth[Use mammoth library]
    Mammoth --> CheckText{Text extracted?}
    
    CheckText -->|No/Too short| Cleanup1[Delete file]
    Cleanup1 --> ReturnError[Return error to user]
    
    CheckText -->|Yes| CallAI[Call Groq API]
    CallAI --> GroqAPI[llama-3.3-70b-versatile]
    
    GroqAPI --> ParseResponse{AI response valid?}
    ParseResponse -->|No| MockAnalysis[Return mock analysis]
    ParseResponse -->|Yes| ParseJSON[Parse JSON response]
    
    ParseJSON --> Analysis[ResumeAnalysisResult]
    Analysis --> SaveDB[Save to database]
    
    SaveDB --> InsertResume[INSERT INTO resumes]
    InsertResume --> ReturnSuccess[Return resume + analysis]
    
    MockAnalysis --> SaveDB
    ReturnSuccess --> DisplayResults[Display results on frontend]
    DisplayResults --> ShowScores[Show Overall Score & ATS Score]
    ShowScores --> ShowStrengths[Show Strengths list]
    ShowStrengths --> ShowImprovements[Show Improvements list]
    ShowImprovements --> ShowKeywords[Show Keywords badges]
    ShowKeywords --> ShowBreakdown[Show ATS Breakdown]
    ShowBreakdown --> End([User views analysis])
    
    ReturnError --> ShowUpload
```

---

## 4. AI Interview Workflow - Complete Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as API Server
    participant DB as Database
    participant Groq as Groq API
    participant Speech as Speech Recognition

    Note over U,Speech: Phase 1: Start Interview
    U->>F: Fill form (Job Role, Experience Level)
    F->>API: POST /api/interviews/start
    API->>DB: Create interview_session
    DB-->>API: Session ID
    API->>Groq: Generate 7 questions
    Groq-->>API: Questions array
    API->>DB: Store questions in interview_questions
    DB-->>API: Questions stored
    API-->>F: { session, firstQuestion, totalQuestions }
    F->>F: Initialize Speech Recognition
    F-->>U: Display first question

    Note over U,Speech: Phase 2: Answer Questions (Loop 7 times)
    loop For each question
        U->>Speech: Speak answer
        Speech-->>F: Transcribed text + confidence
        F->>F: Record audio (optional)
        F->>API: POST /api/interviews/submit-answer
        API->>DB: Verify session ownership
        API->>DB: INSERT INTO interview_answers
        API->>DB: Update metadata (questionsAsked++)
        API->>DB: Get all questions for session
        DB-->>API: Questions list
        API->>API: Find next question
        alt More questions
            API-->>F: { answer, nextQuestion, isComplete: false }
            F-->>U: Show next question
        else All questions answered
            API-->>F: { answer, nextQuestion: null, isComplete: true }
            F-->>U: Show "Generate Feedback" button
        end
    end

    Note over U,Speech: Phase 3: Generate Feedback
    U->>F: Click "Generate Feedback"
    F->>API: POST /api/interviews/generate-feedback
    API->>DB: Get all Q&A pairs
    DB-->>API: Questions + Answers
    API->>API: Calculate quality metrics
    API->>API: Build conversation transcript
    API->>Groq: Generate feedback with metrics
    Groq-->>API: Feedback JSON
    API->>API: Validate & recalculate scores
    API->>DB: UPDATE session (status: completed, feedback, score)
    DB-->>API: Updated session
    API-->>F: { feedback, session }
    F->>F: Parse feedback structure
    F-->>U: Display comprehensive feedback
```

---

## 5. Interview Answer Submission - Detailed Flow

```mermaid
flowchart TD
    Start([User sees question]) --> InitSpeech[Initialize Speech Recognition]
    InitSpeech --> StartRecording[Start recording audio]
    StartRecording --> UserSpeaks[User speaks answer]
    
    UserSpeaks --> SpeechAPI[Browser Speech Recognition API]
    SpeechAPI --> Transcribe[Transcribe speech to text]
    Transcribe --> GetConfidence[Get transcription confidence]
    
    GetConfidence --> StopRecording[Stop recording]
    StopRecording --> CreateBlob[Create audio blob]
    
    CreateBlob --> BuildFormData[Build FormData]
    BuildFormData --> AddFields[Add: sessionId, questionId, answerText]
    AddFields --> AddMetrics[Add: confidence, duration]
    AddMetrics --> AddAudio[Add audio blob]
    
    AddAudio --> Submit[POST /api/interviews/submit-answer]
    
    Submit --> ValidateSession{Session valid?}
    ValidateSession -->|No| Error1[Return 404]
    ValidateSession -->|Yes| SaveAudio[Save audio file if provided]
    
    SaveAudio --> SaveAnswer[INSERT INTO interview_answers]
    SaveAnswer --> GetQuestions[Get all questions for session]
    GetQuestions --> FindCurrent[Find current question index]
    FindCurrent --> CheckNext{More questions?}
    
    CheckNext -->|Yes| GetNext[Get next question]
    GetNext --> UpdateMeta[Update metadata]
    UpdateMeta --> ReturnNext[Return nextQuestion]
    ReturnNext --> ShowNext[Show next question to user]
    
    CheckNext -->|No| UpdateComplete[Mark as complete]
    UpdateComplete --> ReturnComplete[Return isComplete: true]
    ReturnComplete --> ShowButton[Show Generate Feedback button]
    
    Error1 --> ShowError[Show error to user]
    ShowError --> Start
    ShowNext --> Start
```

---

## 6. Feedback Generation - Detailed Flow

```mermaid
flowchart TD
    Start([User clicks Generate Feedback]) --> Validate{Session complete?}
    Validate -->|No| Error1[Show error]
    Validate -->|Yes| FetchQA[Fetch all Q&A from database]
    
    FetchQA --> BuildPairs[Build conversation pairs]
    BuildPairs --> CalcMetrics[Calculate quality metrics]
    
    CalcMetrics --> AvgLength[Average answer length]
    CalcMetrics --> TechDepth[Technical depth score]
    CalcMetrics --> Structure[Structure score]
    CalcMetrics --> Specificity[Specificity score]
    
    AvgLength --> BuildPrompt[Build AI prompt]
    TechDepth --> BuildPrompt
    Structure --> BuildPrompt
    Specificity --> BuildPrompt
    
    BuildPrompt --> CallGroq[Call Groq API]
    CallGroq --> GroqResponse{Groq responds?}
    
    GroqResponse -->|No| Fallback[Use metrics-based fallback]
    GroqResponse -->|Yes| ParseJSON[Parse JSON response]
    
    ParseJSON --> ValidateScores{Valid scores?}
    ValidateScores -->|No| Fallback
    ValidateScores -->|Yes| Recalculate[Recalculate with transparent system]
    
    Recalculate --> ContentScore[Content & Relevance: 0-50]
    Recalculate --> DetailScore[Detail & Depth: 0-20]
    Recalculate --> FluencyScore[Fluency & Clarity: 0-15]
    Recalculate --> ConfidenceScore[Confidence & Tone: 0-10]
    Recalculate --> GrammarScore[Grammar & Structure: 0-5]
    
    ContentScore --> TotalScore[Total = Sum of all]
    DetailScore --> TotalScore
    FluencyScore --> TotalScore
    ConfidenceScore --> TotalScore
    GrammarScore --> TotalScore
    
    TotalScore --> SaveFeedback[Save feedback to database]
    Fallback --> SaveFeedback
    
    SaveFeedback --> UpdateSession[Update session status]
    UpdateSession --> ReturnFeedback[Return feedback to frontend]
    
    ReturnFeedback --> DisplayScore[Display overall score]
    DisplayScore --> DisplayBreakdown[Display score breakdown]
    DisplayBreakdown --> DisplayStrengths[Display strengths]
    DisplayStrengths --> DisplayImprovements[Display improvements]
    DisplayImprovements --> DisplayAnalysis[Display detailed analysis]
    DisplayAnalysis --> DisplayAnalytics[Display analytics metrics]
    DisplayAnalytics --> End([User views feedback])
    
    Error1 --> End
```

---

## 7. Database Operations Flow

```mermaid
graph LR
    subgraph "User Operations"
        A1[Register] --> B1[INSERT users]
        A2[Login] --> B2[SELECT users WHERE email]
    end
    
    subgraph "Resume Operations"
        C1[Upload Resume] --> D1[INSERT resumes]
        C2[List Resumes] --> D2[SELECT resumes WHERE user_id]
        C3[Get Resume] --> D3[SELECT resumes WHERE id AND user_id]
        C4[Delete Resume] --> D4[DELETE resumes + file]
    end
    
    subgraph "Interview Operations"
        E1[Start Interview] --> F1[INSERT interview_sessions]
        E1 --> F2[INSERT interview_questions]
        E2[Submit Answer] --> F3[INSERT interview_answers]
        E2 --> F4[UPDATE interview_sessions metadata]
        E3[Generate Feedback] --> F5[SELECT interview_answers JOIN questions]
        E3 --> F6[UPDATE interview_sessions feedback]
        E4[List Sessions] --> F7[SELECT interview_sessions WHERE user_id]
    end
    
    subgraph "Job Operations"
        G1[List Jobs] --> H1[SELECT jobs WHERE is_active]
        G2[Get Job] --> H2[SELECT jobs WHERE id]
        G3[Save Job] --> H3[INSERT saved_jobs]
    end
```

---

## 8. API Request Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as Middleware
    participant RH as Route Handler
    participant SVC as Service
    participant DB as Database
    participant AI as AI Service

    C->>MW: HTTP Request
    MW->>MW: CORS Check
    MW->>MW: Parse JSON/Body
    MW->>MW: Check Auth Token
    
    alt Auth Required
        MW->>MW: Verify JWT
        alt Invalid Token
            MW-->>C: 401 Unauthorized
        else Valid Token
            MW->>RH: Attach user to req
        end
    end
    
    MW->>RH: Forward request
    RH->>RH: Validate input (Zod)
    
    alt Validation Failed
        RH-->>C: 400 Bad Request
    else Validation Passed
        RH->>SVC: Call service function
        
        alt Database Operation
            SVC->>DB: Query/Insert/Update
            DB-->>SVC: Result
        end
        
        alt AI Operation
            SVC->>AI: Call AI service
            AI->>AI: Process with Groq/OpenAI
            AI-->>SVC: AI Response
        end
        
        SVC-->>RH: Service result
        RH->>RH: Format response
        RH-->>C: JSON Response
    end
```

---

## 9. Error Handling Flow

```mermaid
flowchart TD
    Request[API Request] --> TryCatch{Try block}
    
    TryCatch -->|Success| Process[Process request]
    Process --> Success[Return success response]
    
    TryCatch -->|Error| Catch[Catch error]
    Catch --> ErrorType{Error type?}
    
    ErrorType -->|Zod Validation| ZodError[400 Bad Request<br/>Validation message]
    ErrorType -->|JWT Invalid| AuthError[401 Unauthorized<br/>Invalid token]
    ErrorType -->|Not Found| NotFound[404 Not Found<br/>Resource not found]
    ErrorType -->|DB Constraint| ConstraintError[400/409<br/>Constraint violation]
    ErrorType -->|AI API Error| AIError[500/400<br/>AI service error]
    ErrorType -->|Unknown| GenericError[500 Internal Error<br/>Generic message]
    
    ZodError --> Next[Next error handler]
    AuthError --> Next
    NotFound --> Next
    ConstraintError --> Next
    AIError --> Next
    GenericError --> Next
    
    Next --> GlobalHandler[Global error handler]
    GlobalHandler --> LogError[Log error to console]
    LogError --> ReturnError[Return error response]
    
    Success --> Client[Client receives response]
    ReturnError --> Client
```

---

## 10. File Upload Flow

```mermaid
flowchart TD
    Start([User selects file]) --> ValidateType{File type valid?}
    ValidateType -->|No| Error1[Show error: Invalid type]
    ValidateType -->|Yes| ValidateSize{File size valid?}
    
    ValidateSize -->|No| Error2[Show error: File too large]
    ValidateSize -->|Yes| CreateFormData[Create FormData]
    
    CreateFormData --> AddFile[Append file to FormData]
    AddFile --> SendRequest[POST with FormData]
    
    SendRequest --> Multer[Multer middleware]
    Multer --> CheckMime{MIME type valid?}
    
    CheckMime -->|No| Error3[400: Unsupported file type]
    CheckMime -->|Yes| CheckSize2{Size within limit?}
    
    CheckSize2 -->|No| Error4[400: File too large]
    CheckSize2 -->|Yes| GenerateName[Generate unique filename]
    
    GenerateName --> SaveFile[Save to uploads directory]
    SaveFile --> SaveSuccess{Save successful?}
    
    SaveSuccess -->|No| Error5[500: File save failed]
    SaveSuccess -->|Yes| ProcessFile[Process file]
    
    ProcessFile --> Extract[Extract text/content]
    Extract --> Analyze[Analyze with AI]
    Analyze --> SaveDB[Save to database]
    
    SaveDB --> ReturnSuccess[Return success response]
    ReturnSuccess --> Display[Display results]
    
    Error1 --> Start
    Error2 --> Start
    Error3 --> ClientError[Client receives error]
    Error4 --> ClientError
    Error5 --> ClientError
    Display --> End([Complete])
    ClientError --> End
```

---

## 11. State Management Flow (Frontend)

```mermaid
graph TB
    subgraph "React Query (Server State)"
        A[API Calls] --> B[React Query Cache]
        B --> C[Automatic Refetch]
        B --> D[Optimistic Updates]
    end
    
    subgraph "React Context (Auth State)"
        E[AuthContext] --> F[User State]
        E --> G[Login/Register]
        E --> H[Logout]
        F --> I[Protected Routes]
    end
    
    subgraph "Local State (Component State)"
        J[useState] --> K[Form Inputs]
        J --> L[UI State]
        J --> M[Loading States]
    end
    
    A --> E
    B --> J
    F --> J
```

---

## 12. Complete User Journey

```mermaid
journey
    title User Journey Through Career Echo AI
    section Registration
      Visit Landing Page: 5: User
      Click Sign Up: 4: User
      Fill Registration Form: 3: User
      Submit: 5: User
      Receive JWT Token: 5: System
      Redirect to Dashboard: 5: System
    
    section Resume Analysis
      Navigate to Resume Page: 5: User
      Upload DOCX File: 4: User
      Wait for Analysis: 3: User
      View Overall Score: 5: User
      View ATS Score: 5: User
      Read Strengths: 4: User
      Read Improvements: 4: User
      View Keywords: 4: User
    
    section Interview Practice
      Navigate to Interview Page: 5: User
      Fill Job Details: 4: User
      Start Interview: 5: User
      Answer Question 1: 4: User
      Answer Question 2: 4: User
      Answer Question 3: 4: User
      Answer Question 4: 4: User
      Answer Question 5: 4: User
      Answer Question 6: 4: User
      Answer Question 7: 4: User
      Generate Feedback: 5: User
      View Score Breakdown: 5: User
      Read Detailed Analysis: 4: User
      Review Strengths: 4: User
      Review Improvements: 4: User
    
    section Job Search
      Browse Jobs: 5: User
      Filter by Location: 4: User
      Save Job: 5: User
      View Company: 4: User
      Apply for Job: 5: User
```

---

## 13. Security Flow

```mermaid
flowchart TD
    Request[Incoming Request] --> CheckAuth{Auth Required?}
    
    CheckAuth -->|No| Allow[Allow request]
    CheckAuth -->|Yes| GetToken[Get token from cookie/header]
    
    GetToken --> HasToken{Token exists?}
    HasToken -->|No| Reject1[401: Authentication required]
    HasToken -->|Yes| VerifyJWT[Verify JWT signature]
    
    VerifyJWT --> ValidToken{Token valid?}
    ValidToken -->|No| Reject2[401: Invalid token]
    ValidToken -->|Expired| Reject3[401: Token expired]
    ValidToken -->|Yes| ExtractUser[Extract user from payload]
    
    ExtractUser --> CheckUser{User exists?}
    CheckUser -->|No| Reject4[401: User not found]
    CheckUser -->|Yes| AttachUser[Attach user to request]
    
    AttachUser --> CheckOwnership{Resource ownership check}
    CheckOwnership -->|Not owner| Reject5[403: Forbidden]
    CheckOwnership -->|Owner| Allow
    
    Allow --> Process[Process request]
    Reject1 --> End[End]
    Reject2 --> End
    Reject3 --> End
    Reject4 --> End
    Reject5 --> End
    Process --> End
```

---

## Notes

- All diagrams use Mermaid syntax and can be rendered in:
  - GitHub/GitLab markdown
  - VS Code (with Mermaid extension)
  - Online Mermaid editors
  - Documentation tools (Docusaurus, MkDocs, etc.)

- To view these diagrams:
  1. Copy the Mermaid code blocks
  2. Paste into https://mermaid.live/
  3. Or use a VS Code extension like "Markdown Preview Mermaid Support"

- These workflows represent the complete system architecture and data flow for Career Echo AI.

