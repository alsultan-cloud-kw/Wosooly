import React from "react";
import { Card } from "../ui/card";
import { Link2, Database, LineChart } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";

export function HowItWorks() {

  const {t, i18n} = useTranslation("landing_top")

  const steps = [
    { icon: Link2, step: "01", title: t("step1Title"), description: t("step1Description") },
    { icon: Database, step: "02", title: t("step2Title"), description: t("step2Description") },
    { icon: LineChart, step: "03", title: t("step3Title"), description: t("step3Description") },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
            <Trans i18nKey="howItWorksTitle" ns="landing_top">
              Start Analyzing in <span className="text-primary">3 Simple Steps</span>
            </Trans>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
          {t("howItWorksSubtitle")}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-border" />
              )}
              <Card className="relative p-8 text-center hover:shadow-lg transition-shadow">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-6">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute top-6 right-6 text-6xl font-bold text-muted/20">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-pretty leading-relaxed">{step.description}</p>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
