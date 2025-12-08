import React from "react";
import { Card, CardContent } from "../ui/card";
import { CheckCircle2 } from "lucide-react";

const benefits = [
  {
    stat: "10x",
    label: "Faster Insights",
    description: "Get instant analytics instead of manual spreadsheet work",
    gradient: "gradient-primary",
  },
  {
    stat: "100%",
    label: "Data Security",
    description: "Enterprise-grade encryption and secure API connections",
    gradient: "gradient-accent",
  },
  {
    stat: "50+",
    label: "Analytics Reports",
    description: "Pre-built reports for orders, customers, and products",
    gradient: "gradient-secondary",
  },
  {
    stat: "24/7",
    label: "Real-time Sync",
    description: "Always up-to-date data from your WooCommerce store",
    gradient: "gradient-success",
  },
];

const highlights = [
  "No technical knowledge required",
  "Automatic data synchronization",
  "Custom column mapping for Excel",
  "Export reports to PDF or Excel",
  // "Team collaboration features",
  "Priority customer support",
];

export default function Benefits() {
  return (
    <section id="benefits" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl mb-4 text-balance">
            Why Choose{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Wosooly
            </span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
            Join hundreds of businesses making smarter decisions with their data
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
