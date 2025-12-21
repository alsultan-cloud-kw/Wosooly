import React from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, Menu } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Header() {
  const navigate = useNavigate("")
  const {t, i18n} = useTranslation("landing_top")
  const handleSignIn = () => {
    navigate('/login'); // navigate programmatically
  };

  const handleRegister = ()=>{
    navigate("/register")
  }

  // 🔥 Language Toggle Function
  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "ar" : "en";
    i18n.changeLanguage(newLang);
    // Persist language preference to localStorage for global access
    localStorage.setItem('language', newLang);

    // Set HTML direction for proper RTL layout
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center shadow-md">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t("brandName")}
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {/* <a
            href="#features"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Features
          </a> */}
          {/* <a
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors"
          >
            How It Works
          </a> */}
          {/* <a
            href="#benefits"
            className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors"
          >
            Benefits
          </a> */}
        </nav>


        <div className="flex items-center gap-3">
           {/* 🌍 Language Toggle Button */}
           <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="font-semibold px-3"
          >
            {i18n.language === "en" ? "العربية" : "English"}
          </Button>

          <Button variant="ghost" size="sm" className="hover:text-primary" onClick={handleSignIn}>
            {t("signIn")}
          </Button>

          <Button
            size="sm"
            className="gradient-primary text-white hover:opacity-90 transition-opacity shadow-md hidden sm:inline-flex"
            onClick={handleRegister}
          >
            {t("getStarted")}
          </Button>

          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>

      </div>
    </header>
  );
}
