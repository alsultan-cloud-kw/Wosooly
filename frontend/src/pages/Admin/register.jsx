import React, { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldCheck, Mail, Lock, User, Building2, AlertCircle, CheckCircle2 } from "lucide-react"
import api from "../../../api_config"
import { DashboardHeader } from "@/components/admin/dashboard-header"

export default function AdminRegister() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    // company: "",
    password: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // if (formData.password.length < 8) {
    //   setError("Password must be at least 8 characters")
    //   return
    // }

    setIsLoading(true)

    try {
      const { data } = await api.post("/admin/register", {
        full_name: formData.fullName,
        email: formData.email,
        // company: formData.company,
        password: formData.password,
      })

      // Store token, user type and email for future use
      if (data?.access_token) {
        localStorage.setItem("token", data.access_token)
      }
      if (data?.user_type) {
        localStorage.setItem("user_type", data.user_type)
      }
      if (data?.email) {
        localStorage.setItem("email", data.email)
      }

      window.location.href = "/admin-dashboard"
    } catch (err) {
      console.error("Failed to register admin:", err)
      const backendMessage = err.response?.data?.detail
      setError(backendMessage || "Failed to create admin account. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <>
      <DashboardHeader />
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4">
      <div className="w-full max-w-md space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary to-accent shadow-lg shadow-primary/30">
            <ShieldCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Admin Portal</h1>
          <p className="text-sm text-muted-foreground">
            Create your admin account and start managing your clients with a{" "}
            <span className="font-semibold text-primary">colorful, modern dashboard</span>.
          </p>
        </div>

        <Card className="border border-primary/10 bg-gradient-to-br from-background via-background/95 to-primary/5 shadow-xl shadow-primary/10 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Create Admin Account
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              A few quick details to personalize your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/80" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => updateFormData("fullName", e.target.value)}
                    className="pl-10 border-border/60 focus-visible:ring-primary/80"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Work Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@company.com"
                    value={formData.email}
                    onChange={(e) => updateFormData("email", e.target.value)}
                    className="pl-10 border-border/60 focus-visible:ring-accent/80"
                    required
                  />
                </div>
              </div>

              {/* <div className="space-y-2">
                <Label htmlFor="company" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Company
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    id="company"
                    type="text"
                    placeholder="Acme Corporation"
                    value={formData.company}
                    onChange={(e) => updateFormData("company", e.target.value)}
                    className="pl-10 border-border/60 focus-visible:ring-primary/80"
                    required
                  />
                </div>
              </div> */}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => updateFormData("password", e.target.value)}
                    className="pl-10 border-border/60 focus-visible:ring-accent/80"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                    className="pl-10 border-border/60 focus-visible:ring-primary/80"
                    required
                  />
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-chart-3" />
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-primary/90 hover:to-accent/90 shadow-md shadow-primary/30 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? "Creating Your Space..." : "Create Admin Account"}
              </Button>
            </form>
          </CardContent>
          {/* <CardFooter className="flex flex-col space-y-4 pt-0">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/70" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Already have an account?</span>
              </div>
            </div>
            <Link href="/admin/signin" className="w-full">
              <Button
                variant="outline"
                className="w-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
              >
                Sign In Instead
              </Button>
            </Link>
          </CardFooter> */}
        </Card>

        {/* <p className="text-center text-xs text-muted-foreground mt-2">
          By registering, you agree to our{" "}
          <span className="font-medium text-primary hover:underline cursor-pointer">Terms of Service</span>.
        </p> */}
      </div>
    </div>
    </>
  )
}
