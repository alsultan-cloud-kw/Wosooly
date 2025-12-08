import React from "react";
import { useNavigate } from "react-router-dom"
import { Button } from "../ui/button";
import { ArrowRight, Sparkles, BarChart3, FileSpreadsheet } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Hero() {
  const navigate = useNavigate()

  const handleGetStart=()=>{
    navigate("/register")
  }

  const {t, i18n} = useTranslation("landing_top")

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh" />

      <div className="container relative mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full gradient-primary px-5 py-2.5 text-sm font-medium text-white shadow-lg">
            <Sparkles className="h-4 w-4" />
            <span>{t("badgeText")}</span>
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl text-balance">
            {t("title.part1")}{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t("title.woo")}
            </span>{" "}
            {t("title.and")}{" "}
            <span className="bg-gradient-to-r from-secondary to-success bg-clip-text text-transparent">
              {t("title.excel")}
            </span>
          </h1>

          <p className="mb-10 text-lg text-muted-foreground md:text-xl text-pretty max-w-2xl mx-auto leading-relaxed">
            {t("description")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="w-full sm:w-auto text-base gradient-primary hover:opacity-90 transition-opacity shadow-lg"
              onClick={handleGetStart}
            >
              {t("startButton")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            {/* <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-base border-2 hover:bg-accent/10 bg-transparent"
            >
              Watch Demo
            </Button> */}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <span>{t("badges.noCard")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span>{t("badges.setup")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-secondary" />
              <span>{t("badges.secure")}</span>
            </div>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">

          {/* WooCommerce Card */}
          <div className="relative group">
            <div className="absolute inset-0 gradient-primary rounded-2xl opacity-75 blur-xl group-hover:opacity-100 transition-opacity" />
            <div className="relative rounded-2xl border-2 border-primary/20 bg-card p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-xl gradient-primary flex items-center justify-center text-white shadow-lg">
                  <BarChart3 className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{t("woocommerce.title")}</h3>
                  <p className="text-sm text-muted-foreground">{t("woocommerce.subtitle")}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <span className="text-sm font-medium text-foreground">{t("woocommerce.orders")}</span>
                  <div className="h-2 w-20 rounded-full gradient-primary" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/10">
                  <span className="text-sm font-medium text-foreground">{t("woocommerce.customers")}</span>
                  <div className="h-2 w-24 rounded-full gradient-accent" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/10">
                  <span className="text-sm font-medium text-foreground">{t("woocommerce.products")}</span>
                  <div className="h-2 w-16 rounded-full gradient-success" />
                </div>
              </div>
            </div>
          </div>

          {/* Excel Card */}
          <div className="relative group">
            <div className="absolute inset-0 gradient-secondary rounded-2xl opacity-75 blur-xl group-hover:opacity-100 transition-opacity" />
            <div className="relative rounded-2xl border-2 border-secondary/20 bg-card p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-xl gradient-secondary flex items-center justify-center text-white shadow-lg">
                  <FileSpreadsheet className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{t("excel.title")}</h3>
                  <p className="text-sm text-muted-foreground">{t("excel.subtitle")}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/5 border border-secondary/10">
                  <span className="text-sm font-medium text-foreground">{t("excel.sales")}</span>
                  <div className="h-2 w-24 rounded-full gradient-secondary" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/10">
                  <span className="text-sm font-medium text-foreground">{t("excel.revenue")}</span>
                  <div className="h-2 w-20 rounded-full bg-gradient-to-r from-warning to-warning" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/10">
                  <span className="text-sm font-medium text-foreground">{t("excel.metrics")}</span>
                  <div className="h-2 w-16 rounded-full gradient-success" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
