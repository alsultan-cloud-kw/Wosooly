import React from "react";
import { Button } from "../ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { DashboardPreview } from "./dashboard-preview";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function Hero() {
  const navigate = useNavigate();

  const {t, i18n} = useTranslation("landing_top")

  const handleStartFreeAnalysis = () => {
    navigate("/register");
  };

  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-sm w-fit">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-muted-foreground">{t("AI-Powered Analytics")}</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-balance">
              {t("Unlock Your WooCommerce Store's")} <span className="text-primary">{t("Full Potential")}</span>
            </h1>

            <p className="text-lg text-muted-foreground text-pretty max-w-xl">
              {t("Connect your WooCommerce store in seconds and get instant, actionable insights. Understand your customers, optimize your products, and grow your revenue with data-driven decisions.")}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => {handleStartFreeAnalysis()}} size="lg" className="text-base">
                {t("Start Free Analysis")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {/* <Button size="lg" variant="outline" className="text-base bg-transparent">
                Watch Demo
              </Button> */}
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{t("No credit card required")}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{t("Setup in 2 minutes")}</span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="relative">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
