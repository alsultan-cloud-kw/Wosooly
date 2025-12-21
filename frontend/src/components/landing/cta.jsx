import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CTA() {
  const { t } = useTranslation("landing");
  const navigate = useNavigate();

  const handleGetStart = () => {
    navigate("/register");
  };

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh opacity-30" />

      <div className="container relative mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl border-2 border-primary/20 px-8 py-16 md:px-16 md:py-24 shadow-2xl">
          <div className="absolute inset-0 gradient-primary opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-transparent to-secondary/30" />

          <div className="absolute top-0 right-0 w-64 h-64 gradient-accent rounded-full blur-3xl opacity-30" />
          <div className="absolute bottom-0 left-0 w-64 h-64 gradient-secondary rounded-full blur-3xl opacity-30" />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-5 py-2.5 text-sm font-medium text-white shadow-lg">
              <Sparkles className="h-4 w-4" />
              <span>{t("cta.badge")}</span>
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl mb-6 text-balance">
              {t("cta.title")}
            </h2>

            <p className="text-lg text-white/90 mb-10 text-pretty leading-relaxed">
              {t("cta.description")}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto text-base shadow-xl hover:scale-105 transition-transform"
                onClick={handleGetStart}
              >
                {t("cta.button")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              {/* <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/20"
              >
                Schedule Demo
              </Button> */}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
