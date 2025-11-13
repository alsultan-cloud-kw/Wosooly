import React from "react";
import { Button } from "../ui/button";
import { BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function Header() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('landing_top');

  const handleGetStartedClick = () => {
    navigate("/register");
  };

  const handleSignInClick = () => {
    navigate("/login")
  }

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary ml-12">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">{t("WooInsights")}</span>
        </a>

        {/* Navigation */}
        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {/* Language Switcher */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changeLanguage("en")}
            >
              EN
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changeLanguage("ar")}
            >
              AR
            </Button>
          </div>
        </nav>


        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          <Button onClick={() => {handleSignInClick()}} variant="ghost" size="sm">
            {t("Sign In")}
          </Button>
          <Button onClick={() => {handleGetStartedClick()}} size="sm" className="bg-primary text-primary-foreground">{t("Get Started")}</Button>
        </div>
      </div>
    </header>
  );
}
