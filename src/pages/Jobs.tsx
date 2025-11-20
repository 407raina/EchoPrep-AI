import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { JobCardSkeleton } from "@/components/JobCardSkeleton";
import { 
  Briefcase, MapPin, DollarSign, Clock, Search, 
  ExternalLink, Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Define a simple API fetch helper if not already available
const apiFetch = async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`http://localhost:4000${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed with status ${response.status}`);
  }

  return response.json();
};

type Job = {
  id: string;
  title: string;
  company_name: string;
  website_url: string;
  logo_url?: string;
  location: string;
  job_type?: string;
  experience_level?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  description: string;
  posted_date: string;
  is_saved?: boolean;
};

const Jobs = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchJobs();
    if (user) {
      fetchSavedJobs();
      fetchAppliedJobs();
    }
  }, [user]);

  const fetchJobs = async (search?: string, location?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (location) params.append("location", location);
      
      const result = await apiFetch<{ jobs: Job[] }>(`/api/jobs?${params.toString()}`);
      // Simulate delay for testing if needed, remove in production
      setJobs(result.jobs);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedJobs = async () => {
    try {
      const result = await apiFetch<{ jobs: any[] }>("/api/jobs/user/saved");
      const savedIds = new Set(result.jobs.map((j: any) => j.job_id));
      setSavedJobs(savedIds);
    } catch (error) {
      console.error("Failed to fetch saved jobs:", error);
    }
  };

  const fetchAppliedJobs = async () => {
    try {
      const result = await apiFetch<{ applications: any[] }>("/api/jobs/user/applications");
      const appliedIds = new Set(result.applications.map((a: any) => a.job_id));
      setAppliedJobs(appliedIds);
    } catch (error) {
      console.error("Failed to fetch applied jobs:", error);
    }
  };

  const handleSearch = () => {
    fetchJobs(searchTerm, locationFilter);
  };

  const handleSaveJob = async (jobId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save jobs",
        variant: "destructive",
      });
      return;
    }

    try {
      if (savedJobs.has(jobId)) {
        await apiFetch(`/api/jobs/${jobId}/save`, { method: "DELETE" });
        setSavedJobs(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
        toast({ title: "Job removed from saved list" });
      } else {
        await apiFetch(`/api/jobs/${jobId}/save`, { method: "POST" });
        setSavedJobs(prev => new Set(prev).add(jobId));
        toast({ title: "Job saved successfully!" });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save job",
        variant: "destructive",
      });
    }
  };

  const handleApply = async (jobId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to apply for jobs",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiFetch(`/api/jobs/${jobId}/apply`, { 
        method: "POST",
        body: JSON.stringify({}),
      });
      
      // Add to applied jobs set
      setAppliedJobs(prev => new Set(prev).add(jobId));
      
      toast({
        title: "Application submitted!",
        description: "Your application has been recorded. Good luck!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit application",
        variant: "destructive",
      });
    }
  };

  const formatSalary = (min?: number, max?: number, currency = "USD") => {
    if (!min && !max) return "Salary not specified";
    
    // Handle INR separately with Indian formatting
    if (currency === "INR") {
      const formatter = (num: number) => {
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
        return `₹${(num / 1000).toFixed(0)}K`;
      };
      if (min && max) return `${formatter(min)} - ${formatter(max)}`;
      if (min) return `From ${formatter(min)}`;
      if (max) return `Up to ${formatter(max)}`;
    }
    
    // Handle other currencies
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
    if (min) return `From ${formatter.format(min)}`;
    if (max) return `Up to ${formatter.format(max)}`;
    return "";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Find Your Dream Job
          </h1>
          <p className="text-xl text-muted-foreground">
            Browse real job listings from authentic companies
          </p>
        </div>

        {/* Search Bar */}
        <Card className="p-6 mb-8 shadow-card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Job title, keywords..."
                className="pl-10 h-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Location..."
                className="pl-10 h-12"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} className="h-12 px-8 bg-primary hover:bg-primary/90">
              <Search className="w-4 h-4 mr-2" />
              Search Jobs
            </Button>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Jobs List */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              // Show skeleton loaders for better UX
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <JobCardSkeleton key={i} />
                ))}
              </>
            ) : jobs.length === 0 ? (
              <Card className="p-12 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
              </Card>
            ) : (
              jobs.map((job) => (
                <Card
                  key={job.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="flex gap-4">
                    {/* Company Logo */}
                    <div className="flex-shrink-0">
                      {job.logo_url ? (
                        <img
                          src={job.logo_url}
                          alt={job.company_name}
                          className="w-16 h-16 rounded-lg object-contain bg-muted p-2"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Briefcase className="w-8 h-8 text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Job Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="text-xl font-semibold mb-1 hover:text-primary transition-colors">
                            {job.title}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(job.website_url, "_blank");
                            }}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {job.company_name}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary">
                          <MapPin className="w-3 h-3 mr-1" />
                          {job.location}
                        </Badge>
                        {job.job_type && (
                          <Badge variant="outline">
                            <Briefcase className="w-3 h-3 mr-1" />
                            {job.job_type}
                          </Badge>
                        )}
                        {job.experience_level && (
                          <Badge variant="outline">{job.experience_level}</Badge>
                        )}
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(job.posted_date)}
                        </Badge>
                      </div>

                      {(job.salary_min || job.salary_max) && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                          <DollarSign className="w-4 h-4" />
                          {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {job.description.replace(/<[^>]*>/g, "")}
                      </p>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Job Details Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              {selectedJob ? (
                <Card className="p-6">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold">{selectedJob.title}</h2>
                  </div>

                  <button
                    onClick={() => window.open(selectedJob.website_url, "_blank")}
                    className="text-primary hover:underline flex items-center gap-1 mb-4"
                  >
                    {selectedJob.company_name}
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedJob.location}</span>
                    </div>
                    {selectedJob.job_type && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedJob.job_type}</span>
                      </div>
                    )}
                    {(selectedJob.salary_min || selectedJob.salary_max) && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {formatSalary(
                            selectedJob.salary_min,
                            selectedJob.salary_max,
                            selectedJob.salary_currency
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>Posted {formatDate(selectedJob.posted_date)}</span>
                    </div>
                  </div>

                  <div className="prose prose-sm mb-6">
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <div
                      className="text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={{
                        __html: selectedJob.description.substring(0, 500) + "...",
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(selectedJob.website_url, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visit Company Website & Apply
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-12 text-center">
                  <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Select a job to view details
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Jobs;
