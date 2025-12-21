import React from "react";
import { Card, CardContent } from "../ui/card";
import { Key, Upload, BarChart, Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function HowItWorks() {
  const { t } = useTranslation("landing");

  const steps = [
    {
      icon: Key,
      step: "01",
      title: t("howItWorks.steps.step1.title"),
      description: t("howItWorks.steps.step1.description"),
      gradient: "gradient-primary",
    },
    {
      icon: Upload,
      step: "02",
      title: t("howItWorks.steps.step2.title"),
      description: t("howItWorks.steps.step2.description"),
      gradient: "gradient-accent",
    },
    {
      icon: BarChart,
      step: "03",
      title: t("howItWorks.steps.step3.title"),
      description: t("howItWorks.steps.step3.description"),
      gradient: "gradient-secondary",
    },
    {
      icon: Rocket,
      step: "04",
      title: t("howItWorks.steps.step4.title"),
      description: t("howItWorks.steps.step4.description"),
      gradient: "gradient-success",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh opacity-50" />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl mb-4 text-balance">
            {t("howItWorks.title")}{" "}
            <span className="bg-gradient-to-r from-accent to-success bg-clip-text text-transparent">
              {t("howItWorks.titleHighlight")}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-1 bg-gradient-to-r from-primary via-accent to-secondary -translate-x-1/2 translate-y-6 opacity-30" />
              )}
              <Card className="relative border-2 border-border bg-card hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden">
                <div
                  className={`absolute inset-0 ${step.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}
                />
                <CardContent className="pt-6 relative">
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full ${step.gradient} text-white font-bold text-lg shadow-lg`}
                    >
                      {step.step}
                    </div>
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-lg ${step.gradient} shadow-md`}
                    >
                      <step.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
