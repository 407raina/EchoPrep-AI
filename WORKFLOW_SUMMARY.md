# Career Echo AI - Workflow Summary

## Quick Reference: Main Workflows

### 🔐 Authentication Flow
```
User → Register/Login → JWT Token → Protected Routes
```

### 📄 Resume Analysis Flow
```
Upload DOCX → Extract Text → AI Analysis → Display Scores & Feedback
```

### 🎤 Interview Flow
```
Start Interview → Answer 7 Questions → Generate Feedback → View Results
```

---

## Visual System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Landing  │  │  Resume  │  │Interview │  │   Jobs   │       │
│  │   Page   │  │   Page   │  │   Page   │  │   Page   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │              │              │             │
│       └─────────────┴──────────────┴──────────────┘             │
│                          │                                       │
│                    ┌─────▼─────┐                                 │
│                    │ API Client │                                 │
│                    └─────┬─────┘                                 │
└──────────────────────────┼───────────────────────────────────────┘
                           │ HTTP/HTTPS
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                    EXPRESS SERVER                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │   Auth   │  │ Resumes  │  │Interviews│  │    AI    │         │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │              │              │             │
│       └─────────────┴──────────────┴──────────────┘             │
│                          │                                       │
│                    ┌─────▼─────┐                                 │
│                    │  Services │                                 │
│                    │   Layer   │                                 │
│                    └─────┬─────┘                                 │
└──────────────────────────┼───────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼────────┐  ┌─────▼──────┐
│  PostgreSQL  │  │   Groq API      │  │ File System │
│   Database   │  │  (AI Analysis)   │  │  (Uploads)  │
└──────────────┘  └──────────────────┘  └────────────┘
```

---

## Feature Workflows at a Glance

### 1️⃣ User Registration
```
[User] → [Form] → [POST /api/auth/register]
    → [Hash Password] → [Create User] → [Generate JWT]
    → [Store Token] → [Redirect to Dashboard]
```

### 2️⃣ Resume Upload & Analysis
```
[User] → [Select DOCX] → [Upload] → [Extract Text]
    → [AI Analysis] → [Calculate Scores]
    → [Display: Overall Score, ATS Score, Strengths, Improvements]
```

### 3️⃣ Start Interview
```
[User] → [Enter Job Role & Level] → [POST /api/interviews/start]
    → [Generate 7 Questions via AI] → [Store Questions]
    → [Display First Question]
```

### 4️⃣ Answer Question
```
[User Speaks] → [Speech Recognition] → [Transcribe]
    → [POST /api/interviews/submit-answer]
    → [Store Answer] → [Get Next Question]
    → [Display Next Question OR Complete]
```

### 5️⃣ Generate Feedback
```
[User] → [Click Generate Feedback] → [POST /api/interviews/generate-feedback]
    → [Fetch All Q&A] → [Calculate Metrics] → [AI Analysis]
    → [Calculate Scores] → [Save Feedback]
    → [Display: Score, Breakdown, Strengths, Improvements]
```

---

## Data Flow Patterns

### Read Pattern
```
Frontend → API → Database → Return Data → Display
```

### Write Pattern
```
Frontend → API → Validate → Database → Return Success → Update UI
```

### AI Pattern
```
Frontend → API → Service → AI API → Process Response → Database → Return
```

---

## Key Decision Points

### Authentication Check
```
Request → Has Token? → Valid? → User Exists? → Allow
                              → Invalid/Expired → 401
```

### File Validation
```
File → Type Valid? → Size Valid? → Process
     → Invalid → Reject
```

### Interview Completion
```
Answer Submitted → More Questions? → Show Next
                                → No More → Show Feedback Button
```

---

## Error Handling Pattern

```
Request → Try → Success → Return Data
       → Catch → Error Type? → Return Appropriate Error
                            → Log → Return Generic Error
```

---

## State Management

```
┌─────────────────────────────────────┐
│         React Query                  │
│  (Server State - API Data)           │
└─────────────────────────────────────┘
              │
┌─────────────▼──────────────┐
│      Auth Context          │
│  (User Authentication)     │
└─────────────┬──────────────┘
              │
┌─────────────▼──────────────┐
│    Component State         │
│  (Local UI State)          │
└────────────────────────────┘
```

---

## File Locations Reference

- **Workflow Diagrams**: `WORKFLOW_DIAGRAMS.md` (Detailed Mermaid diagrams)
- **This Summary**: `WORKFLOW_SUMMARY.md` (Quick reference)
- **Main Code**: 
  - Frontend: `src/`
  - Backend: `server/src/`
  - Database: `server/migrations/`

---

## Quick Commands

```bash
# Start Frontend
npm run dev

# Start Backend
npm run server:dev

# Initialize Database
npm run db:init

# Build for Production
npm run build
npm run server:build
```

---

*For detailed diagrams, see WORKFLOW_DIAGRAMS.md*

