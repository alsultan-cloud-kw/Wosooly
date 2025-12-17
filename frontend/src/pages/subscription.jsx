import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import api from "../../api_config";

export default function PricingPage() {
  const navigate = useNavigate();
  const {t, i18n} = useTranslation("subscription");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly"); // "monthly" or "yearly"

  const plans = [
    {
      id: "Free",
      name: t("name1"),
      monthlyPrice: 0,
      yearlyPrice: 0,
      currency: "KD",
      description: t("description1"),
      popular: false,
      features: [
        "Perfect for small businesses to try Wosooly",
        "Basic AI analytics",
        "Access to marketing suggestions",
        "Limited campaigns: 3 campaigns per month via WhatsApp & Email",
        "Daily, weekly, and monthly reports",
        "Customer support: 2 tickets per month",
        "Price: Free"
      ],
    },
    {
      id: "Standard",
      name: t("name2"),
      monthlyPrice: 5,
      yearlyPrice: 50,
      currency: "KD",
      description: t("description2"),
      popular: true,
      features: [
        "AI-powered orders analysis",
        "WhatsApp & Email marketing campaigns",
        "Customer segmentation for personalized experience",
        "Access to best-selling products insights",
        "Daily, weekly and monthly reports",
        "Campaign limit: up to 500 marketing campaigns",
        "Customer support: 4 tickets per month",
        
      ],
    },
    {
      id: "Professional",
      name: t("name3"),
      monthlyPrice: "25",
      yearlyPrice: "250",
      currency: "KD",
      description: t("description3"),
      popular: false,
      features: [
        "Full AI analytics & advanced orders insights",
        "WhatsApp & Email marketing campaigns",
        "VIP & top customer tracking",
        "Product performance & previous customer analysis",
        "Customizable reports (daily, weekly, monthly)",
        "AI Chatbot & premium customer support",
        "Campaign limit: up to 1500 marketing campaigns",
        "Customer support: 25 tickets per month",
        
      ],
    },
    {
      id: "Enterprise",
      name: t("name4"),
      monthlyPrice: "125",
      yearlyPrice:"1250",
      currency: "KD",
      description: t("description4"),
      popular: false,
      features: [
          "Full AI analytics & advanced orders insights",
          "Unlimited WhatsApp & Email marketing campaigns",
          "Customer Segmentation",
          "Product performance & previous customer analysis",
          "Customizable reports (daily, weekly, monthly)",
          "AI Chatbot & premium customer support",
          "Campaign limit: unlimited",
          "Customer support: unlimited",
          
      ],
    },
  ];

  const handlePlanSelect = async (plan, billingCycle = "monthly") => {
    try {
      setLoadingPlan(plan.id);
      
      const response = await api.post("/select-subscription-plan", {
        plan_name: plan.id,
        billing_cycle: billingCycle
      });
      
      console.log("Subscription plan selected:", response.data);
      
      // Navigate to datasource selector or dashboard after successful selection
      navigate("/dashboard");
    } catch (error) {
      console.error("Error selecting subscription plan:", error);
      const errorMessage = error.response?.data?.detail || "Failed to select subscription plan. Please try again.";
      alert(errorMessage);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.98_0.01_265)] via-background to-[oklch(0.96_0.02_240)]">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-foreground">{t("brand")}</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("signIn")}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 border border-primary/20">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-semibold">{t("badge")}</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 text-balance">
            {t("title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            {t("subtitle")}
          </p>
          
          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span className={`text-sm font-medium transition-colors ${billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              role="switch"
              aria-checked={billingCycle === "yearly"}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === "yearly" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${billingCycle === "yearly" ? "text-foreground" : "text-muted-foreground"}`}>
              Yearly
            </span>
            {billingCycle === "yearly" && (
              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
                Save up to 20%
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto mb-16">

          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative ${
                plan.popular ? "border-2 border-primary shadow-2xl scale-105 md:scale-110" : "border border-border shadow-lg"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent text-primary-foreground px-6 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap shadow-lg">
                  {t("mostPopular")}
                </div>
              )}

              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
                  <div className="mt-6">
                    {/* Dynamic Price based on billing cycle */}
                    <div className="flex items-baseline justify-center gap-2">
                      <span className={`text-4xl font-bold ${billingCycle === "yearly" ? "text-primary" : "text-foreground"}`}>
                        {billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                      </span>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-muted-foreground">{plan.currency}</div>
                        <div className="text-sm text-muted-foreground">
                          /{billingCycle === "monthly" ? "month" : "year"}
                        </div>
                      </div>
                    </div>
                    {billingCycle === "yearly" && plan.yearlyPrice > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {plan.currency} {plan.monthlyPrice} per month billed annually
                      </p>
                    )}
                  </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <Button
                  onClick={() => handlePlanSelect(plan, billingCycle)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full h-12 font-semibold cursor-pointer ${
                    plan.popular ? "" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {loadingPlan === plan.id ? (
                    "Loading..."
                  ) : (
                    (billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice) === 0 ? t("buttonFree") : t("buttonPaid")
                  )}
                </Button>

                <div className="pt-6 border-t border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-4">{t("featuresIncluded")}:</h4>
                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <span className="text-sm text-foreground leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mb-16">
          <Card className="border border-border/50">
            <CardContent className="py-8">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-4xl font-bold text-foreground mb-2">99.9%</div>
                  <div className="text-sm text-muted-foreground">{t("uptime")}</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-foreground mb-2">24/7</div>
                  <div className="text-sm text-muted-foreground">{t("support")}</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-foreground mb-2">5,000+</div>
                  <div className="text-sm text-muted-foreground">{t("activeUsers")}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">{t("title1")}</h2>
          <div className="space-y-4">
            <details className="group bg-card border border-border rounded-lg p-6">
              <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                {t("q1")}
                <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="text-muted-foreground mt-4">
                {t("a1")}
              </p>
            </details>

            <details className="group bg-card border border-border rounded-lg p-6">
              <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                {t("q2")}
                <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="text-muted-foreground mt-4">
                {t("a2")}
              </p>
            </details>

            <details className="group bg-card border border-border rounded-lg p-6">
              <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                {t("q3")}
                <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="text-muted-foreground mt-4">
                {t("a3")}
              </p>
            </details>

            <details className="group bg-card border border-border rounded-lg p-6">
              <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                {t("q4")}
                <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="text-muted-foreground mt-4">
                {t("a4")}              
              </p>
            </details>
          </div>
        </div>

        {/* <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-6 text-lg">{t("line1")}</p>
          <Link to="/register">
            <Button size="lg" className="h-14 px-8 text-lg font-semibold">
              {t("button")}
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">{t("subtext")}</p>
        </div> */}
      </main>

      <footer className="border-t border-border/50 mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>{t("rights")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

