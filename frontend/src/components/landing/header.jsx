import React from "react";
import { Button } from "../ui/button";
import { BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Header() {
  const navigate = useNavigate();

  const handleGetStartedClick = () => {
    navigate("/register");
  };

  const handleSignInClick = () => {
    navigate("/login")
  }
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary ml-12">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">WooInsights</span>
        </a>

        {/* Navigation */}
        {/* <nav className="hidden md:flex items-center gap-6">
          <a
            href="#features"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a
            href="/how-it-works"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            How It Works
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </a>
        </nav> */}

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          <Button onClick={() => {handleSignInClick()}} variant="ghost" size="sm">
            Sign In
          </Button>
          <Button onClick={() => {handleGetStartedClick()}} size="sm" className="bg-primary text-primary-foreground">Get Started</Button>
        </div>
      </div>
    </header>
  );
}
