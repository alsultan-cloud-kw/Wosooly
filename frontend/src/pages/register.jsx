import React, { useState, useEffect, useRef } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { ShoppingBag, Lock, Eye, EyeOff } from "lucide-react";
import { useDispatch } from "react-redux";
import { register } from "../redux/actions/AuthActions";
import { useNavigate } from "react-router-dom";
import api from "../../api_config";
import { Trans,useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdvanced] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [form, setForm] = useState({
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    client_name: "",
    company_details: "",
    store_url: "",
    consumer_key: "",
    consumer_secret: "",
    accepted_terms: false,
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {t, i18n} = useTranslation('register')

  // const plan = searchParams.get("plan");   // <-- HERE

  // console.log("Selected plan:", plan);

  // refs to hold interval IDs so we can clear them reliably
  const taskIntervalRef = useRef(null);
  const syncIntervalRef = useRef(null);
  // ref to avoid starting multiple task polls
  const isTaskPollingRef = useRef(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // const startTaskPolling = (taskId) => {
  //   if (!taskId) return;
  //   if (isTaskPollingRef.current) return; // already polling
  //   isTaskPollingRef.current = true;

  //   let attempts = 0;
  //   const maxAttempts = 60; // 5 minutes at 5s

  //   taskIntervalRef.current = setInterval(async () => {
  //     try {
  //       attempts += 1;
  //       const statusRes = await api.get(`/task-status/${taskId}`);
  //       const statusData = statusRes?.data;

  //       console.log("Task status:", statusData);

  //       if (statusData?.status === "SUCCESS") {
  //         clearInterval(taskIntervalRef.current);
  //         taskIntervalRef.current = null;
  //         isTaskPollingRef.current = false;

  //         setSyncMessage(t("success"));
  //         // small delay so user sees success then navigate
  //         setTimeout(() => {
  //           setIsSyncing(false);
  //           navigate("/dashboard");
  //         }, 1200);
  //       } else if (statusData?.status === "FAILURE") {
  //         clearInterval(taskIntervalRef.current);
  //         taskIntervalRef.current = null;
  //         isTaskPollingRef.current = false;
  //         setIsSyncing(false);
  //         alert(t("failure"));
  //       } else if (attempts >= maxAttempts) {
  //         clearInterval(taskIntervalRef.current);
  //         taskIntervalRef.current = null;
  //         isTaskPollingRef.current = false;
  //         setIsSyncing(false);
  //         alert(t("delay"));
  //       } else {
  //         // optionally update message with status
  //         setSyncMessage("Setting up your store and fetching WooCommerce data...");
  //       }
  //     } catch (pollError) {
  //       console.error("Polling error:", pollError);
  //       clearInterval(taskIntervalRef.current);
  //       taskIntervalRef.current = null;
  //       isTaskPollingRef.current = false;
  //       setIsSyncing(false);
  //     }
  //   }, 5000);
  // };

  // useEffect(() => {
  //   let interval;
  
  //   const checkSyncStatus = async () => {
  //     const email = localStorage.getItem("email");
  //     if (!email) return;
  
  //     try {
  //       const { data } = await api.get(`/sync-status/${email}`);
  
  //       if (data?.sync_status === "COMPLETE") {
  //         setSyncMessage("✅ Store synced successfully!");
  //         clearInterval(interval); // stop polling
  //         setTimeout(() => {
  //           setIsSyncing(false);
  //           navigate("/dashboard");
  //         }, 1000);
  //       } else if (data?.sync_status === "IN_PROGRESS" || data?.sync_status === "PENDING") {
  //         setIsSyncing(true);
  //         setSyncMessage("🔄 Syncing your store data...");
  //       } else if (data?.sync_status === "FAILED") {
  //         clearInterval(interval);
  //         setIsSyncing(false);
  //         alert("❌ Sync failed, please try again later.");
  //       }
  //     } catch (err) {
  //       console.error("Failed to check sync status:", err);
  //     }
  //   };
  
  //   // run immediately and then every 5 seconds
  //   checkSyncStatus();
  //   interval = setInterval(checkSyncStatus, 5000);
  
  //   return () => clearInterval(interval);
  // }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

     // ✅ Check if Terms & Privacy are accepted
  if (!form.accepted_terms) {
    toast.error("Terms Required", {
      description: "You must accept the Terms and Privacy Policy to continue.",
      duration: 4000,
    });
    return;
  }

    if (form.password !== form.confirmPassword) {
      toast.error("Password Mismatch", {
        description: "The passwords you entered do not match. Please try again.",
        duration: 4000,
      });
      return;
    }

    try {
      // Show loading toast
      const loadingToast = toast.loading("Creating your account...", {
        description: "Please wait while we set up your account.",
      });

      // Dispatch Redux register action
      const res = await dispatch(
        register(
          form.email,
          form.phone,
          form.password,
          form.client_name,
          form.company_details,
          form.store_url,
          form.consumer_key,
          form.consumer_secret,
          form.accepted_terms
        )
      );

      const data = res?.payload || {};
      if (!data || !data.client_id) {
        toast.dismiss(loadingToast);
        throw new Error("Registration failed — no client data returned");
      }

      // Save email/token for background checks (dashboard or refresh)
      // if (data.access_token) localStorage.setItem("token", data.access_token);
      // if (data.email) localStorage.setItem("email", data.email);
        // Save subscription info
      localStorage.setItem("user_plan", data.plan_name);
      localStorage.setItem("available_features", JSON.stringify(data.available_features));

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success("Registration Successful!", {
        description: "Your account has been created successfully. Redirecting...",
        duration: 3000,
      });

      // Show syncing overlay
      setIsSyncing(true);
      setSyncMessage("Setting up your store and fetching WooCommerce data...");
      localStorage.setItem("email", form.email); 
      
      // Navigate after a short delay to show the success message
      setTimeout(() => {
        navigate("/user-dashboard");
      }, 1000);
      
      // ✅ Start polling task if task_id exists
      // if (data.task_id) {
      //   startTaskPolling(data.task_id);
      // } else {
      //   // fallback to sync-status polling
      //   console.warn("No task_id received, relying on periodic sync-status check.");
      // }
    } catch (err) {
      console.error(err);
      const errorMessage = err?.response?.data?.detail || err?.message || "Registration failed. Please try again.";
      toast.error("Registration Failed", {
        description: errorMessage,
        duration: 5000,
      });
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.98_0.01_265)] via-background to-[oklch(0.96_0.02_240)] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">{t("brandName")}</span>
          </a>
          <h1 className="text-4xl font-bold text-foreground mb-3 text-balance">
            {t("brandTagline")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("brandSubtitle")}
          </p>
        </div>

        {/* Registration Form */}
        <Card className="border-border/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">{t("title")}</CardTitle>
            <CardDescription>
              {t("description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("emailLabel")}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phoneLabel")}</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder={t("phonePlaceholder")}
                    value={form.phone}
                    onChange={handleChange}
                    className="h-11"
                    />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("passwordLabel")}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("passwordPlaceholder")}
                      required
                      value={form.password}
                      onChange={handleChange}
                      className="h-11 pr-10"
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
                  <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t("confirmPasswordPlaceholder")}
                      required
                      value={form.confirmPassword}
                      onChange={handleChange}
                      className="h-11 pr-10"
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

                <div className="space-y-2">
                  <Label htmlFor="client_name">{t("fullNameLabel")}</Label>
                  <Input
                    id="client_name"
                    name="client_name"
                    type="text"
                    placeholder={t("fullNamePlaceholder")}
                    value={form.client_name}
                    onChange={handleChange}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_details">{t("companyDetailsLabel")}</Label>
                <Input
                  id="company_details"
                  name="company_details"
                  type="text"
                  placeholder={t("companyDetailsPlaceholder")}
                  value={form.company_details}
                  onChange={handleChange}
                  className="h-11"
                />
              </div>

              {/* WooCommerce Credentials Section */}
              {/* <div className="border-t border-border pt-6">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground">{t("storeSectionTitle")}</span>
                </div>

                {showAdvanced && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-sm text-muted-foreground mb-4">{t("storeSectionSubtitle")}</p>

                    <div className="space-y-2">
                      <Label htmlFor="store_url">{t("storeUrlLabel")}</Label>
                      <Input
                        id="store_url"
                        name="store_url"
                        type="url"
                        placeholder={t("storeUrlPlaceholder")}
                        value={form.store_url}
                        onChange={handleChange}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="consumer_key">{t("consumerKeyLabel")}</Label>
                      <Input
                        id="consumer_key"
                        name="consumer_key"
                        type="text"
                        placeholder={t("consumerKeyPlaceholder")}
                        value={form.consumer_key}
                        onChange={handleChange}
                        className="h-11 font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="consumer_secret">{t("consumerSecretLabel")}</Label>
                      <Input
                        id="consumer_secret"
                        name="consumer_secret"
                        type="password"
                        placeholder={t("consumerSecretPlaceholder")}
                        value={form.consumer_secret}
                        onChange={handleChange}
                        className="h-11 font-mono text-sm"
                      />
                    </div>

                    <div className="bg-muted/50 border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        <Lock className="w-4 h-4 inline mr-1" />
                        {t("securityNote")}
                      </p>
                    </div>
                  </div>
                )}
              </div> */}

              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="accepted_terms"
                  name="accepted_terms"
                  checked={form.accepted_terms}
                  onChange={(e) =>
                    setForm({ ...form, accepted_terms: e.target.checked })
                  }
                  required
                  className="mt-1"
                />

                <label htmlFor="accepted_terms" className="text-sm">
                <Trans
                  i18nKey="accepted_terms_label" ns="register"
                  components={{
                    terms: (
                      <button
                        type="button"
                        className="text-primary underline"
                        onClick={() => setShowTermsModal(true)}
                      >
                    {t("terms_of_service")}
                    </button>
                    ),
                    privacy: (
                      <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => setShowPrivacyModal(true)}
                    >
                      {t("privacy_policy")}
                    </button>
                    )
                  }}
                  />
                </label>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full h-12 text-base font-semibold" size="lg">
                {t("createAccount")}
              </Button>

              {/* Terms */}
              {/* <p className="text-sm text-muted-foreground text-center">
                {t("text")}{" "}
                <a href="/terms" className="text-primary hover:underline">{t("terms")}</a> {t("and")}{" "}
                <a href="/privacy" className="text-primary hover:underline">{t("privacy")}</a>
              </p> */}
            </form>
          </CardContent>
        </Card>

        {/* Sign In Link */}
        <p className="text-center mt-6 text-muted-foreground">
          {t("text_alrdy")} <a href="/login" className="text-primary font-semibold hover:underline">{t("link")}</a>
        </p>
      </div>

      {/* ✅ Syncing Overlay */}
      {/* {isSyncing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
          <h2 className="text-lg font-semibold mb-2">{syncMessage || t("default") }</h2>
          <p className="text-sm text-muted-foreground">{t("details")}</p>
        </div>
      )} */}

      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("termsOfServiceTitle")}</DialogTitle>
          </DialogHeader>
          <p>{t("termsOfServiceContent")}</p>
        </DialogContent>
      </Dialog>

      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("privacyPolicyTitle")}</DialogTitle>
          </DialogHeader>
          <p>{t("privacyPolicyContent")}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
