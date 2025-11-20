import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Briefcase, Brain, Building2, FileText, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, initializing } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Jobs", path: "/jobs", icon: Briefcase },
    { name: "Interview", path: "/interview/new", icon: Brain },
    { name: "Companies", path: "/companies", icon: Building2 },
    { name: "Resume", path: "/resume", icon: FileText },
  ];

  const handleSignOut = async () => {
    await logout();
    navigate("/auth");
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              EchoPrep
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={location.pathname === item.path ? "default" : "ghost"}
                  className="gap-2 h-11 px-6 text-base"
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {!initializing && user ? (
              <Button onClick={handleSignOut} variant="outline" className="h-11 px-6 text-base">
                Sign Out
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")} className="h-11 px-6 text-base">Sign In</Button>
                <Button className="bg-accent hover:bg-accent/90 h-11 px-6 text-base" onClick={() => navigate("/auth")}>Get Started</Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant={location.pathname === item.path ? "default" : "ghost"}
                  className="w-full justify-start gap-2 h-12 text-base"
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Button>
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-2">
              {!initializing && user ? (
                <Button onClick={handleSignOut} variant="outline" className="w-full h-12 text-base">
                  Sign Out
                </Button>
              ) : (
                <>
                  <Button variant="ghost" className="w-full h-12 text-base" onClick={() => navigate("/auth")}>Sign In</Button>
                  <Button className="w-full bg-accent hover:bg-accent/90 h-12 text-base" onClick={() => navigate("/auth")}>Get Started</Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
