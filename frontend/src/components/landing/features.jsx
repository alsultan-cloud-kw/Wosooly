import React from "react";
import {
  ShoppingCart,
  FileSpreadsheet,
  TrendingUp,
  Users,
  Package,
  Lock,
} from "lucide-react";

import {Card, CardContent, CardDescription, CardHeader, CardTitle}  from "../ui/card";

const features = [
  {
    icon: ShoppingCart,
    title: "WooCommerce Integration",
    description:
      "Securely connect your WooCommerce store using API keys. Analyze orders, customers, and products in real-time.",
    gradient: "gradient-primary",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel Sheet Analysis",
    description:
      "Upload your sales Excel files and map column names. Get instant insights from your existing data.",
    gradient: "gradient-secondary",
  },
  {
    icon: TrendingUp,
    title: "Order Analytics",
    description:
      "Track revenue trends, order patterns, and sales performance with comprehensive order analysis.",
    gradient: "gradient-accent",
  },
  {
    icon: Users,
    title: "Customer Insights",
    description:
      "Understand customer behavior, lifetime value, and purchasing patterns to boost retention.",
    gradient: "gradient-success",
  },
  {
    icon: Package,
    title: "Product Performance",
    description:
      "Identify top-selling products, inventory trends, and optimize your product catalog.",
    gradient: "bg-gradient-to-br from-warning to-warning",
  },
  {
    icon: Lock,
    title: "Secure & Private",
    description:
      "Your data is encrypted and never shared. We follow industry-best security practices.",
    gradient: "bg-gradient-to-br from-chart-5 to-chart-5",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl mb-4 text-balance">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent">
              Analyze Your Data
            </span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
            Powerful features designed to help you understand your business
            better
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-border bg-card hover:shadow-2xl hover:scale-105 transition-all duration-300 group overflow-hidden relative"
            >
              <div
                className={`absolute inset-0 ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}
              />
              <CardHeader className="relative">
                <div
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-xl ${feature.gradient} mb-4 shadow-lg`}
                >
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>

              <CardContent className="relative">
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
