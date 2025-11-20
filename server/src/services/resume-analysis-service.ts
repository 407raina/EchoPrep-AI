import fs from "fs/promises";
import path from "path";
import Groq from "groq-sdk";
import { env } from "../utils/env";
import mammoth from "mammoth";

// Use a stable dynamic import for pdf-parse
// const pdf = (await import("pdf-parse"));

interface ResumeAnalysisResult {
  overallScore: number;
  atsScore: number;
  strengths: string[];
  improvements: string[];
  keywords: string[];
  atsBreakdown: {
    formatting: { score: number; note: string };
    keywords: { score: number; note: string };
    experience: { score: number; note: string };
    skillsMatch: { score: number; note: string };
  };
  skillsMatched: number;
  skillsTotal: number;
}

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.docx') {
    try {
      console.log(`[Resume Analysis] Attempting to extract text from DOCX: ${filePath}`);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (accessError) {
        console.error(`[Resume Analysis] File not accessible: ${filePath}`, accessError);
        throw new Error("Resume file not found or not accessible.");
      }

      // Read file stats
      const stats = await fs.stat(filePath);
      console.log(`[Resume Analysis] File size: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        throw new Error("The uploaded file is empty.");
      }

      // Extract text using mammoth
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      
      console.log(`[Resume Analysis] Extracted text length: ${text.length} characters`);
      
      if (!text.trim()) {
        throw new Error("No extractable text found in DOCX file. The document might be empty, corrupted, or image-only.");
      }
      
      if (text.trim().length < 50) {
        throw new Error("The extracted text is too short. Please ensure your resume contains readable text content.");
      }
      
      console.log(`[Resume Analysis] Text extraction successful`);
      return text;
    } catch (error: any) {
      console.error("[Resume Analysis] Error extracting text from DOCX:", error?.message || error);
      
      // Re-throw our custom errors
      if (error.message.includes("No extractable text") || 
          error.message.includes("uploaded file is empty") ||
          error.message.includes("too short") ||
          error.message.includes("not found")) {
        throw error;
      }
      
      throw new Error(`Failed to extract text from DOCX file: ${error?.message || 'Unknown error'}. Please ensure it is a valid, unencrypted document.`);
    }
  } else if (ext === '.pdf') {
    // Temporarily disable PDF processing to ensure DOCX works.
    throw new Error("PDF analysis is temporarily unavailable. Please use a DOCX file.");
  } else {
    throw new Error("Unsupported file format. Please upload a DOCX file.");
  }
}export async function analyzeResumeWithAI(resumeText: string): Promise<ResumeAnalysisResult> {
  // Provide a lightweight mock if no key is configured to keep local flows working
  if (!env.groqApiKey) {
    console.warn("[Resume Analysis] No Groq API key configured, using mock analysis");
    return {
      overallScore: 70,
      atsScore: 65,
      strengths: [
        "Clear section headings and layout",
        "Relevant experience listed in reverse-chronological order",
        "Concise bullet points"
      ],
      improvements: [
        "Add more quantifiable achievements (metrics, impact)",
        "Include a brief professional summary at the top",
        "Tailor keywords to the target role/job description"
      ],
      keywords: ["JavaScript", "React", "Node.js", "REST API", "TypeScript"],
      atsBreakdown: {
        formatting: { score: 80, note: "Readable structure and consistent formatting" },
        keywords: { score: 60, note: "Add more role-specific keywords" },
        experience: { score: 72, note: "Consider highlighting outcomes with metrics" },
        skillsMatch: { score: 65, note: "List core tools/technologies explicitly" }
      },
      skillsMatched: 13,
      skillsTotal: 20,
    };
  }

  const groq = new Groq({ apiKey: env.groqApiKey });

  const prompt = `You are an expert ATS (Applicant Tracking System) and resume analyzer. Analyze the following resume and provide detailed feedback.

Resume Text:
${resumeText.substring(0, 10000)}

Provide a comprehensive analysis with:
1. Overall Resume Score (0-100)
2. ATS Compatibility Score (0-100)
3. Top 3-5 Strengths (specific, actionable points)
4. Top 3-5 Areas for Improvement (specific, actionable suggestions)
5. Keywords Found (list 5-10 relevant technical/professional keywords)
6. ATS Breakdown:
   - Formatting score and note
   - Keywords score and note
   - Experience documentation score and note
   - Skills match score and note
7. Skills matched count (estimate out of 20 common skills for the role)

Format your response as JSON with this exact structure:
{
  "overallScore": number,
  "atsScore": number,
  "strengths": ["string"],
  "improvements": ["string"],
  "keywords": ["string"],
  "atsBreakdown": {
    "formatting": { "score": number, "note": "string" },
    "keywords": { "score": number, "note": "string" },
    "experience": { "score": number, "note": "string" },
    "skillsMatch": { "score": number, "note": "string" }
  },
  "skillsMatched": number,
  "skillsTotal": 20
}

Be honest but constructive. Focus on actionable improvements.`;

  try {
    console.log("[Resume Analysis] Calling Groq API...");
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert resume analyzer and ATS specialist. Provide detailed, actionable feedback in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 2048,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("[Resume Analysis] Received AI response, parsing...");
    
    const analysis = JSON.parse(content);
    
    // Validate the response has required fields
    if (typeof analysis.overallScore !== 'number' || typeof analysis.atsScore !== 'number') {
      console.error("[Resume Analysis] Invalid AI response structure:", analysis);
      throw new Error("Invalid AI response format");
    }

    console.log("[Resume Analysis] AI analysis parsed successfully");
    return analysis as ResumeAnalysisResult;
  } catch (error) {
    console.error("[Resume Analysis] Error analyzing resume with AI:", error);
    
    if (error instanceof Error) {
      throw new Error(`AI analysis failed: ${error.message}`);
    }
    throw new Error("Failed to analyze resume with AI");
  }
}

export async function analyzeResume(filePath: string): Promise<ResumeAnalysisResult> {
  console.log(`[Resume Analysis] Starting analysis for: ${filePath}`);
  
  try {
    // Extract text from file
    const resumeText = await extractTextFromFile(filePath);
    
    // Additional validation (though extractTextFromFile already checks this)
    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error("Could not extract sufficient text from the file. Please ensure it's a valid document with readable text.");
    }

    console.log(`[Resume Analysis] Sending to AI for analysis...`);
    
    // Analyze with AI
    const analysis = await analyzeResumeWithAI(resumeText);
    
    console.log(`[Resume Analysis] Analysis completed successfully`);
    console.log(`[Resume Analysis] Scores - Overall: ${analysis.overallScore}, ATS: ${analysis.atsScore}`);
    
    return analysis;
  } catch (error) {
    console.error(`[Resume Analysis] Analysis failed:`, error);
    throw error;
  }
}
