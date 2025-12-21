import React from "react";
import {
  ShoppingCart,
  FileSpreadsheet,
  TrendingUp,
  Users,
  Package,
  Lock,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {Card, CardContent, CardDescription, CardHeader, CardTitle}  from "../ui/card";

export default function Features() {
  const { t } = useTranslation("landing");

  const features = [
    {
      icon: ShoppingCart,
      title: t("features.woocommerce.title"),
      description: t("features.woocommerce.description"),
      gradient: "gradient-primary",
    },
    {
      icon: FileSpreadsheet,
      title: t("features.excel.title"),
      description: t("features.excel.description"),
      gradient: "gradient-secondary",
    },
    {
      icon: TrendingUp,
      title: t("features.analytics.title"),
      description: t("features.analytics.description"),
      gradient: "gradient-accent",
    },
    {
      icon: Users,
      title: t("features.customers.title"),
      description: t("features.customers.description"),
      gradient: "gradient-success",
    },
    {
      icon: Package,
      title: t("features.products.title"),
      description: t("features.products.description"),
      gradient: "bg-gradient-to-br from-warning to-warning",
    },
    {
      icon: Lock,
      title: t("features.security.title"),
      description: t("features.security.description"),
      gradient: "bg-gradient-to-br from-chart-5 to-chart-5",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl mb-4 text-balance">
            {t("features.title")}{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent">
              {t("features.titleHighlight")}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
            {t("features.subtitle")}
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
