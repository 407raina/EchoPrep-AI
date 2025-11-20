import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Briefcase, Brain, Building2, FileText, CheckCircle, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";

const Landing = () => {
  const { user, initializing } = useAuth();
  const features = [
    {
      icon: Briefcase,
      title: "Job Application",
      description: "Discover, search, and track relevant job opportunities tailored to your skills and preferences.",
      color: "bg-blue-500",
      link: "/jobs"
    },
    {
      icon: Brain,
      title: "Interview Platform",
      description: "Practice with AI-powered mock interviews featuring speech recognition and real-time feedback.",
      color: "bg-purple-500",
      link: "/interview"
    },
    {
      icon: Building2,
      title: "Company Explorer",
      description: "Get detailed insights into companies, including culture, reviews, and hiring trends.",
      color: "bg-green-500",
      link: "/companies"
    },
    {
      icon: FileText,
      title: "Resume Analyzer",
      description: "Optimize your resume with AI-powered analysis for ATS compatibility and job-role fit.",
      color: "bg-orange-500",
      link: "/resume"
    }
  ];

  const benefits = [
    "AI-driven interview simulations",
    "Real-time speech-to-text conversion",
    "Comprehensive company insights",
    "ATS-optimized resume suggestions",
    "Job tracking and application management",
    "Performance analytics and feedback"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent border border-accent/20">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI-Powered Career Platform</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              Your Complete{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Job Preparation
              </span>{" "}
              Journey
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              EchoPrep combines AI-driven insights, interview simulations, and resume optimization 
              to help you land your dream job with confidence.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {!initializing && user ? (
                <Link to="/jobs">
                  <Button size="lg" className="text-lg h-14 px-8 bg-primary hover:bg-primary/90">
                    Explore Jobs
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button size="lg" className="text-lg h-14 px-8 bg-primary hover:bg-primary/90">
                    Get Started Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Four powerful modules working together to accelerate your career journey
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {features.map((feature) => (
            <Link key={feature.title} to={feature.link}>
              <Card className="p-8 shadow-card hover:shadow-card-hover transition-smooth cursor-pointer group h-full">
                <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-smooth`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
                <div className="mt-6 flex items-center text-primary font-medium group-hover:gap-2 transition-smooth">
                  Explore <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
              Why Choose EchoPrep?
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-accent mt-1 flex-shrink-0" />
                  <span className="text-lg">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="p-12 md:p-16 text-center gradient-hero">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Ace Your Next Interview?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of job seekers who are preparing smarter with AI-powered tools
          </p>
          {!initializing && user ? (
            <Link to="/interview">
              <Button size="lg" variant="secondary" className="text-lg h-14 px-8">
                Start Interview Practice
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="text-lg h-14 px-8">
                Start Your Journey
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          )}
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold">EchoPrep</span>
            </div>
            <p className="text-muted-foreground">
              © 2025 EchoPrep. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
