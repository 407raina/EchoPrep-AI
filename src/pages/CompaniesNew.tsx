import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CompanyCardSkeleton } from "@/components/JobCardSkeleton";
import { 
  Building2, Search, ExternalLink, Briefcase, Users, 
  MapPin, Heart, HeartOff, Eye, TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

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
    throw new Error(errorData.message || errorData.error || `API request failed`);
  }

  return response.json();
};

type Company = {
  id: string;
  name: string;
  website_url: string;
  logo_url?: string;
  industry?: string;
  location?: string;
  size?: string;
  description?: string;
  job_count: number;
  is_following?: boolean;
};

type CompanyDetails = Company & {
  jobs: Array<{
    id: string;
    title: string;
    location: string;
    job_type?: string;
    experience_level?: string;
    salary_min?: number;
    salary_max?: number;
    salary_currency?: string;
    posted_date: string;
  }>;
};

const Companies = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, initializing } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [followedCompanies, setFollowedCompanies] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async (search?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      
      const result = await apiFetch<{ companies: Company[] }>(`/api/companies?${params.toString()}`);
      
      // Filter out or move companies without logo to bottom
      const companiesWithLogo = result.companies.filter(c => c.logo_url);
      const companiesWithoutLogo = result.companies.filter(c => !c.logo_url);
      
      // Adobe check - if Adobe has no logo, move to bottom
      setCompanies([...companiesWithLogo, ...companiesWithoutLogo]);
      
      // Update followed companies
      const followed = new Set(
        result.companies.filter(c => c.is_following).map(c => c.id)
      );
      setFollowedCompanies(followed);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load companies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyDetails = async (companyId: string) => {
    try {
      const result = await apiFetch<{ company: CompanyDetails; jobs: any[] }>(
        `/api/companies/${companyId}`
      );
      setSelectedCompany({ ...result.company, jobs: result.jobs });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load company details",
        variant: "destructive",
      });
    }
  };

  const handleFollowToggle = async (companyId: string, isFollowing: boolean) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow companies",
        variant: "destructive",
      });
      // Redirect to auth page after a short delay
      setTimeout(() => navigate("/auth"), 1500);
      return;
    }

    try {
      if (isFollowing) {
        await apiFetch(`/api/companies/${companyId}/follow`, { method: "DELETE" });
        setFollowedCompanies(prev => {
          const next = new Set(prev);
          next.delete(companyId);
          return next;
        });
        toast({ title: "Company unfollowed" });
      } else {
        await apiFetch(`/api/companies/${companyId}/follow`, { method: "POST" });
        setFollowedCompanies(prev => new Set(prev).add(companyId));
        toast({ title: "Company followed!" });
      }
      
      // Update selected company if it's the one being followed
      if (selectedCompany?.id === companyId) {
        setSelectedCompany(prev => prev ? { ...prev, is_following: !isFollowing } : null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update follow status",
        variant: "destructive",
      });
    }
  };

  const handleSearch = () => {
    fetchCompanies(searchTerm);
  };

  const formatJobCount = (count: number) => {
    if (count === 0) return "No open positions";
    if (count === 1) return "1 open position";
    return `${count} open positions`;
  };

  const formatSalary = (min?: number, max?: number, currency = "USD") => {
    if (!min && !max) return "";
    
    if (currency === "INR") {
      const formatter = (num: number) => {
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
        return `₹${(num / 1000).toFixed(0)}K`;
      };
      if (min && max) return `${formatter(min)} - ${formatter(max)}`;
      return "";
    }
    
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
    return "";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Explore Companies
          </h1>
          <p className="text-xl text-muted-foreground">
            Discover top companies and their open positions
          </p>
        </div>

        {/* Search Bar */}
        <Card className="p-6 mb-8 shadow-card">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                className="pl-10 h-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} className="h-12 px-8 bg-primary hover:bg-primary/90">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Companies List */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              // Show skeleton loaders
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <CompanyCardSkeleton key={i} />
                ))}
              </>
            ) : companies.length === 0 ? (
              <Card className="p-12 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No companies found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria
                </p>
              </Card>
            ) : (
              companies.map((company) => (
                <Card
                  key={company.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => fetchCompanyDetails(company.id)}
                >
                  <div className="flex gap-4">
                    {/* Company Logo */}
                    <div className="flex-shrink-0">
                      {company.logo_url ? (
                        <img
                          src={company.logo_url}
                          alt={company.name}
                          className="w-20 h-20 rounded-lg object-contain bg-muted p-2"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-10 h-10 text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Company Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="text-2xl font-bold mb-1 hover:text-primary transition-colors">
                            {company.name}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(company.website_url, "_blank");
                            }}
                            className="text-primary hover:underline flex items-center gap-1 text-sm"
                          >
                            Visit Website
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {company.industry && (
                          <Badge variant="secondary">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {company.industry}
                          </Badge>
                        )}
                        {company.location && (
                          <Badge variant="outline">
                            <MapPin className="w-3 h-3 mr-1" />
                            {company.location}
                          </Badge>
                        )}
                        {company.size && (
                          <Badge variant="outline">
                            <Users className="w-3 h-3 mr-1" />
                            {company.size}
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-green-50">
                          <Briefcase className="w-3 h-3 mr-1" />
                          {formatJobCount(company.job_count)}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {company.description || "Leading company in the industry"}
                      </p>

                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchCompanyDetails(company.id);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Profile
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Company Details Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              {selectedCompany ? (
                <Card className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    {selectedCompany.logo_url ? (
                      <img
                        src={selectedCompany.logo_url}
                        alt={selectedCompany.name}
                        className="w-16 h-16 rounded-lg object-contain bg-muted p-2"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-primary" />
                      </div>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold mb-2">{selectedCompany.name}</h2>
                  
                  <div className="space-y-2 mb-4">
                    {selectedCompany.industry && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedCompany.industry}</span>
                      </div>
                    )}
                    {selectedCompany.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedCompany.location}</span>
                      </div>
                    )}
                    {selectedCompany.size && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedCompany.size}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-6">
                    {selectedCompany.description || "Leading company in the industry"}
                  </p>

                  <Button
                    variant="outline"
                    className="w-full mb-6"
                    onClick={() => window.open(selectedCompany.website_url, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit Website
                  </Button>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Open Positions ({selectedCompany.jobs.length})
                    </h3>
                    
                    {selectedCompany.jobs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No open positions at this time
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {selectedCompany.jobs.map((job) => (
                          <Link key={job.id} to={`/jobs`}>
                            <Card className="p-4 hover:shadow-md transition-shadow">
                              <h4 className="font-semibold mb-1 hover:text-primary transition-colors">
                                {job.title}
                              </h4>
                              <div className="flex flex-wrap gap-1 mb-2">
                                <Badge variant="secondary" className="text-xs">
                                  {job.location}
                                </Badge>
                                {job.experience_level && (
                                  <Badge variant="outline" className="text-xs">
                                    {job.experience_level}
                                  </Badge>
                                )}
                              </div>
                              {(job.salary_min || job.salary_max) && (
                                <p className="text-xs text-muted-foreground">
                                  {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                                </p>
                              )}
                            </Card>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="p-12 text-center">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Select a company to view details
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

export default Companies;
