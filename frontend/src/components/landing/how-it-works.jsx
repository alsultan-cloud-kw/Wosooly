import React from "react";
import { Card, CardContent } from "../ui/card";
import { Key, Upload, BarChart, Rocket } from "lucide-react";

const steps = [
  {
    icon: Key,
    step: "01",
    title: "Connect Your Data Source",
    description:
      "Choose between WooCommerce API integration or Excel file upload. Provide your credentials or map your column names.",
    gradient: "gradient-primary",
  },
  {
    icon: Upload,
    step: "02",
    title: "Import & Process",
    description:
      "Our system securely imports your data and processes it in real-time. All data is encrypted and stored safely.",
    gradient: "gradient-accent",
  },
  {
    icon: BarChart,
    step: "03",
    title: "Analyze & Visualize",
    description:
      "Explore comprehensive dashboards with order, customer, and product analytics. Filter, sort, and drill down into your data.",
    gradient: "gradient-secondary",
  },
  {
    icon: Rocket,
    step: "04",
    title: "Make Better Decisions",
    description:
      "Use actionable insights to optimize your business. Export reports and share findings with your team.",
    gradient: "gradient-success",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh opacity-50" />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl mb-4 text-balance">
            Get Started in{" "}
            <span className="bg-gradient-to-r from-accent to-success bg-clip-text text-transparent">
              Minutes
            </span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
            Simple process to unlock powerful analytics for your business
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
