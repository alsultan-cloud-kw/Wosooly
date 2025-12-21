import React from "react";
import { Card, CardContent } from "../ui/card";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Benefits() {
  const { t } = useTranslation("landing");

  const benefits = [
    {
      stat: t("benefits.benefitCards.fasterInsights.stat"),
      label: t("benefits.benefitCards.fasterInsights.label"),
      description: t("benefits.benefitCards.fasterInsights.description"),
      gradient: "gradient-primary",
    },
    {
      stat: t("benefits.benefitCards.dataSecurity.stat"),
      label: t("benefits.benefitCards.dataSecurity.label"),
      description: t("benefits.benefitCards.dataSecurity.description"),
      gradient: "gradient-accent",
    },
    {
      stat: t("benefits.benefitCards.analyticsReports.stat"),
      label: t("benefits.benefitCards.analyticsReports.label"),
      description: t("benefits.benefitCards.analyticsReports.description"),
      gradient: "gradient-secondary",
    },
    {
      stat: t("benefits.benefitCards.realtimeSync.stat"),
      label: t("benefits.benefitCards.realtimeSync.label"),
      description: t("benefits.benefitCards.realtimeSync.description"),
      gradient: "gradient-success",
    },
  ];

  const highlights = [
    t("benefits.highlights.noTechnicalKnowledge"),
    t("benefits.highlights.automaticSync"),
    t("benefits.highlights.customMapping"),
    t("benefits.highlights.exportReports"),
    t("benefits.highlights.prioritySupport"),
  ];

  return (
    <section id="benefits" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl mb-4 text-balance">
            {t("benefits.title")}{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              {t("benefits.titleHighlight")}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
            {t("benefits.subtitle")}
          </p>
        </div>

        {/* Benefit Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {benefits.map((benefit, index) => (
            <Card
              key={index}
              className="border-2 border-border bg-card hover:shadow-2xl hover:scale-105 transition-all duration-300 group overflow-hidden relative"
            >
              <div
                className={`absolute inset-0 ${benefit.gradient} opacity-5 group-hover:opacity-10 transition-opacity`}
              />
              <CardContent className="pt-6 text-center relative">
                <div
                  className={`text-4xl md:text-5xl font-bold bg-gradient-to-br ${benefit.gradient} bg-clip-text text-transparent mb-2`}
                >
                  {benefit.stat}
                </div>
                <div className="text-lg font-semibold text-foreground mb-1">
                  {benefit.label}
                </div>
                <div className="text-sm text-muted-foreground">
                  {benefit.description}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Highlights */}
        <Card className="border-2 border-primary/20 bg-card max-w-3xl mx-auto shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-success/5" />
          <CardContent className="pt-8 pb-8 relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {highlights.map((highlight, index) => (
                <div key={index} className="flex items-center gap-3 group/item">
                  <div className="h-8 w-8 rounded-full gradient-success flex items-center justify-center shadow-md flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-foreground font-medium">{highlight}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </section>
  );
}
