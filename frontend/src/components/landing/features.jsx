import React from "react";
import { Card } from "../ui/card";
import {
  BarChart3,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Package,
} from "lucide-react";

export function Features() {
  const features = [
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description:
        "Monitor your store performance with live data updates and instant insights into sales, orders, and customer behavior.",
    },
    {
      icon: Zap,
      title: "Instant Setup",
      description:
        "Connect your WooCommerce store in under 2 minutes. Just enter your credentials and start analyzing immediately.",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description:
        "Enterprise-grade security with encrypted connections. Your data is protected with industry-leading standards.",
    },
    {
      icon: TrendingUp,
      title: "Growth Insights",
      description:
        "Discover opportunities to increase revenue with AI-powered recommendations and trend analysis.",
    },
    {
      icon: Users,
      title: "Customer Intelligence",
      description:
        "Understand your customers better with detailed segmentation, behavior patterns, and lifetime value analysis.",
    },
    {
      icon: Package,
      title: "Product Performance",
      description:
        "Track which products drive the most revenue, identify slow movers, and optimize your inventory.",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-32">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
            Everything You Need to{" "}
            <span className="text-primary">Grow Your Store</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Powerful analytics tools designed specifically for WooCommerce store
            owners who want to make data-driven decisions.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-6 hover:shadow-lg transition-shadow rounded-2xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-pretty leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
