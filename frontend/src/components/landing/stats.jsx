import React from "react";
import { useTranslation } from "react-i18next";

export function Stats() {

  const {t, i18} = useTranslation("landing_top")
  
  const stats = [
    { value: "10K+", label: t("Active Stores"), company: t("WooCommerce Users") },
    { value: "98%", label: t("Accuracy Rate"), company: t("Data Analysis") },
    { value: "2.5x", label: t("Revenue Growth"), company: t("Average Increase") },
    { value: "<2min", label: t("Setup Time"), company: t("Quick Integration") },
  ];

  return (
    <section className="border-y border-border bg-muted/30 py-16">
      <div className="container">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">{stat.value}</div>
              <div className="text-sm font-medium text-foreground mb-1">{stat.label}</div>
              <div className="text-xs text-muted-foreground">{stat.company}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
