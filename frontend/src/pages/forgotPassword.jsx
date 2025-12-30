import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useTranslation } from "react-i18next";
import api from "../../api_config";

const ShoppingBag = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { t } = useTranslation("signin");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError(t("forgotPassword.emailRequired") || "Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/forgot-password", { email });
      if (response.data.success) {
        setMessage(response.data.message || t("forgotPassword.successMessage") || "If an account with that email exists, a password reset link has been sent.");
      } else {
        setError(response.data.message || t("forgotPassword.errorMessage") || "An error occurred. Please try again.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(err.response?.data?.detail || t("forgotPassword.errorMessage") || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.98_0.01_265)] via-background to-[oklch(0.96_0.02_240)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">{t("brandName")}</span>
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-3 text-balance">
            {t("forgotPassword.title") || "Forgot Password?"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("forgotPassword.subtitle") || "Enter your email address and we'll send you a link to reset your password."}
          </p>
        </div>

        {/* Forgot Password Form */}
        <Card className="border-border/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{t("forgotPassword.cardTitle") || "Reset Password"}</CardTitle>
            <CardDescription className="text-center">
              {t("forgotPassword.cardDescription") || "We'll send you a password reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">{t("emailLabel")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {message && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">{message}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button type="submit" className="w-full h-12 text-base font-semibold" size="lg" disabled={isLoading}>
                {isLoading
                  ? t("forgotPassword.buttonLoading") || "Sending..."
                  : t("forgotPassword.button") || "Send Reset Link"}
              </Button>

              {/* Back to Login */}
              <div className="text-center">
                <Link to="/sign-in" className="text-sm text-primary hover:underline">
                  {t("forgotPassword.backToLogin") || "Back to Login"}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

