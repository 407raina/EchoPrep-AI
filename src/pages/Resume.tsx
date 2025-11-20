import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, Zap, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

const Resume = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, initializing } = useAuth();
  const [uploaded, setUploaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  useEffect(() => {
    if (!initializing && !user) {
      navigate("/auth");
    }
  }, [initializing, navigate, user]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a DOCX file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiFetch<{ resume: any; analysis: any }>("/api/resumes", {
        method: "POST",
        body: formData,
      });

      // Get the analysis from the response
      const data = response;
      
      if (data.analysis) {
        setAnalysisResults(data.analysis);
        setUploaded(true);
        toast({
          title: "Resume Analyzed!",
          description: `Your resume scored ${data.analysis.overallScore}/100`,
        });
      } else {
        throw new Error("No analysis data received");
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'Failed to upload and analyze resume',
        variant: "destructive",
      });
      setFileName("");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              AI Resume Analyzer
            </h1>
            <p className="text-xl text-muted-foreground">
              Get instant feedback and optimize your resume for ATS systems
            </p>
          </div>

          {!uploaded ? (
            <>
              {/* Upload Section */}
              <Card className="p-12 shadow-card text-center mb-8">
                <div className="max-w-2xl mx-auto">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Upload className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Upload Your Resume</h2>
                  <p className="text-muted-foreground mb-8">
                    Upload your resume in DOCX format to get a comprehensive AI-powered analysis
                  </p>
                  <input
                    type="file"
                    id="resume-upload"
                    accept=".docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <Button 
                    size="lg" 
                    className="h-14 px-8 bg-primary hover:bg-primary/90"
                    onClick={() => document.getElementById('resume-upload')?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Choose File
                      </>
                    )}
                  </Button>
                  {fileName && (
                    <p className="text-sm text-primary mt-4">
                      Selected: {fileName}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    Supported format: DOCX (Max 5MB)
                  </p>
                </div>
              </Card>

              {/* Features */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6 shadow-card">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">ATS Optimization</h3>
                  <p className="text-muted-foreground">
                    Check if your resume passes Applicant Tracking Systems
                  </p>
                </Card>

                <Card className="p-6 shadow-card">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Keyword Analysis</h3>
                  <p className="text-muted-foreground">
                    Identify missing keywords for your target role
                  </p>
                </Card>

                <Card className="p-6 shadow-card">
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Improvement Tips</h3>
                  <p className="text-muted-foreground">
                    Get actionable suggestions to enhance your resume
                  </p>
                </Card>
              </div>
            </>
          ) : (
            <>
              {/* Analysis Results */}
              {analysisResults && (
                <>
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 shadow-card text-center">
                  <div className="text-5xl font-bold text-primary mb-2">
                    {analysisResults.overallScore}
                  </div>
                  <p className="text-muted-foreground">Overall Score</p>
                </Card>

                <Card className="p-6 shadow-card text-center">
                  <div className="text-5xl font-bold text-accent mb-2">
                    {analysisResults.atsScore}%
                  </div>
                  <p className="text-muted-foreground">ATS Compatible</p>
                </Card>

                <Card className="p-6 shadow-card text-center">
                  <div className="text-5xl font-bold text-green-500 mb-2">
                    {analysisResults.skillsMatched}/{analysisResults.skillsTotal}
                  </div>
                  <p className="text-muted-foreground">Skills Matched</p>
                </Card>
              </div>

              {/* ATS Score Breakdown */}
              <Card className="p-6 shadow-card mb-6">
                <h3 className="text-2xl font-bold mb-4">ATS Score Breakdown</h3>
                <div className="space-y-4">
                  {Object.entries(analysisResults.atsBreakdown).map(([key, value]: [string, any]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="text-sm text-muted-foreground">{value.note}</p>
                        </div>
                        <Badge variant={value.score >= 85 ? "default" : "secondary"} className="text-lg px-4 py-1">
                          {value.score}%
                        </Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${value.score >= 85 ? 'bg-green-500' : value.score >= 70 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                          style={{ width: `${value.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Strengths */}
                <Card className="p-6 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <h3 className="text-2xl font-bold">Strengths</h3>
                  </div>
                  <div className="space-y-3">
                    {analysisResults.strengths.map((strength, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
                        <p className="text-muted-foreground">{strength}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Improvements */}
                <Card className="p-6 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-6 h-6 text-orange-500" />
                    <h3 className="text-2xl font-bold">Areas to Improve</h3>
                  </div>
                  <div className="space-y-3">
                    {analysisResults.improvements.map((improvement, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 shrink-0" />
                        <p className="text-muted-foreground">{improvement}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Keywords - Only show detected keywords */}
              <Card className="p-6 shadow-card mb-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Detected Keywords
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  These keywords were found in your resume and are relevant to your target role:
                </p>
                <div className="flex flex-wrap gap-2">
                  {analysisResults.keywords.map((keyword) => (
                    <Badge key={keyword} variant="default" className="text-sm px-3 py-1 bg-green-500">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </Card>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="outline" onClick={() => { setUploaded(false); setAnalysisResults(null); setFileName(""); }}>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Another Resume
                </Button>
              </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Resume;
