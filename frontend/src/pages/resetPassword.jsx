import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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

const Eye = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const EyeOff = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
    />
  </svg>
);

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { t } = useTranslation("signin");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError(t("resetPassword.noToken") || "Invalid reset link. Please request a new password reset.");
    }
  }, [token, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError(t("resetPassword.noToken") || "Invalid reset link. Please request a new password reset.");
      return;
    }

    if (!password || !confirmPassword) {
      setError(t("resetPassword.passwordRequired") || "Please enter both password fields");
      return;
    }

    if (password.length < 6) {
      setError(t("resetPassword.passwordTooShort") || "Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError(t("resetPassword.passwordsDontMatch") || "Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/reset-password", {
        token: token,
        new_password: password,
      });
      if (response.data.success) {
        setMessage(response.data.message || t("resetPassword.successMessage") || "Password has been reset successfully!");
        setTimeout(() => {
          navigate("/sign-in");
        }, 2000);
      } else {
        setError(response.data.message || t("resetPassword.errorMessage") || "An error occurred. Please try again.");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError(err.response?.data?.detail || t("resetPassword.errorMessage") || "An error occurred. Please try again.");
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
            {t("resetPassword.title") || "Reset Password"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("resetPassword.subtitle") || "Enter your new password below"}
          </p>
        </div>

        {/* Reset Password Form */}
        <Card className="border-border/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{t("resetPassword.cardTitle") || "Set New Password"}</CardTitle>
            <CardDescription className="text-center">
              {t("resetPassword.cardDescription") || "Choose a strong password for your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">{t("passwordLabel")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("passwordPlaceholder")}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {t("resetPassword.confirmPasswordLabel") || "Confirm Password"}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t("resetPassword.confirmPasswordPlaceholder") || "Confirm your password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
              <Button type="submit" className="w-full h-12 text-base font-semibold" size="lg" disabled={isLoading || !token}>
                {isLoading
                  ? t("resetPassword.buttonLoading") || "Resetting..."
                  : t("resetPassword.button") || "Reset Password"}
              </Button>

              {/* Back to Login */}
              <div className="text-center">
                <Link to="/sign-in" className="text-sm text-primary hover:underline">
                  {t("resetPassword.backToLogin") || "Back to Login"}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

