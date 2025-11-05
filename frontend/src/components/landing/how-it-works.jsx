import React from "react";
import { Card } from "../ui/card";
import { Link2, Database, LineChart } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      icon: Link2,
      step: "01",
      title: "Connect Your Store",
      description:
        "Enter your WooCommerce site URL and API credentials. We use secure, read-only access to protect your data.",
    },
    {
      icon: Database,
      step: "02",
      title: "Analyze Your Data",
      description:
        "Our AI engine processes your store data, identifying patterns, trends, and opportunities for growth.",
    },
    {
      icon: LineChart,
      step: "03",
      title: "Get Actionable Insights",
      description:
        "Receive clear, actionable recommendations to optimize your products, pricing, and marketing strategies.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
            Start Analyzing in <span className="text-primary">3 Simple Steps</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            No technical knowledge required. Get up and running in minutes.
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
