import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  MessageSquare, 
  CheckCircle2, 
  Info, 
  ExternalLink, 
  Shield, 
  Key, 
  Smartphone,
  BookOpen,
  Sparkles
} from "lucide-react"

export function WhatsAppCredentialsForm({ onSubmit, isLoading = false }) {
  const [formData, setFormData] = useState({
    phoneNumberId: "",
    wabaId: "",
    accessToken: "",
  })

  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (onSubmit) {
      await onSubmit(formData)
    }

    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const isFormValid =
    formData.phoneNumberId && formData.wabaId && formData.accessToken

  return (
    <div className="w-full max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
      {/* Left Side - Form */}
      <Card className="w-full border-2 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                WhatsApp Business API
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Connect your WhatsApp Business account
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {showSuccess && (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                  Credentials saved successfully! Redirecting...
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-green-600" />
                <Label htmlFor="phoneNumberId" className="text-base font-semibold">
                  Phone Number ID
                </Label>
              </div>
              <Input
                id="phoneNumberId"
                type="text"
                placeholder="e.g., 123456789012345"
                value={formData.phoneNumberId}
                onChange={(e) => handleChange("phoneNumberId", e.target.value)}
                className="h-12 text-base border-2 focus:border-green-500 focus:ring-green-500/20"
                disabled={isLoading}
                required
              />
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Find this in your <strong>Meta Business Manager</strong> under <strong>WhatsApp → API Setup</strong>
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <Label htmlFor="wabaId" className="text-base font-semibold">
                  WhatsApp Business Account ID (WABA ID)
                </Label>
              </div>
              <Input
                id="wabaId"
                type="text"
                placeholder="e.g., 987654321098765"
                value={formData.wabaId}
                onChange={(e) => handleChange("wabaId", e.target.value)}
                className="h-12 text-base border-2 focus:border-green-500 focus:ring-green-500/20"
                disabled={isLoading}
                required
              />
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Your <strong>WhatsApp Business Account ID</strong> from Meta Business Suite
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-green-600" />
                <Label htmlFor="accessToken" className="text-base font-semibold">
                  Access Token
                </Label>
              </div>
              <Input
                id="accessToken"
                type="password"
                placeholder="Enter your permanent access token"
                value={formData.accessToken}
                onChange={(e) => handleChange("accessToken", e.target.value)}
                className="h-12 text-base font-mono border-2 focus:border-green-500 focus:ring-green-500/20"
                disabled={isLoading}
                required
              />
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Generate a <strong>permanent access token</strong> from your Meta App settings. Make sure it has <strong>whatsapp_business_messaging</strong> permission.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Connecting...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4" />
                  Connect WhatsApp Business
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Right Side - Guide */}
      <div className="space-y-6">
        {/* Quick Start Guide */}
        <Card className="border-2 shadow-xl bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              <CardTitle className="text-xl font-bold">Quick Start Guide</CardTitle>
            </div>
            <CardDescription>
              Follow these steps to get your WhatsApp Business API credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-1">Create Meta Business Account</p>
                  <p className="text-sm text-muted-foreground">
                    Sign up for a Meta Business account if you don't have one
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-1">Set Up WhatsApp Business</p>
                  <p className="text-sm text-muted-foreground">
                    Add WhatsApp Business to your Meta Business Manager
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-1">Create Meta App</p>
                  <p className="text-sm text-muted-foreground">
                    Create a new app in Meta for Developers
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-1">Get Your Credentials</p>
                  <p className="text-sm text-muted-foreground">
                    Find Phone Number ID, WABA ID, and generate Access Token
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documentation Links */}
        <Card className="border-2 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-green-600" />
              <CardTitle className="text-xl font-bold">Documentation & Resources</CardTitle>
            </div>
            <CardDescription>
              Official guides and resources to help you set up WhatsApp Business API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                    <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      Getting Started Guide
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Official WhatsApp Cloud API documentation
                    </p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
              </div>
            </a>

            <a
              href="https://business.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      Meta Business Manager
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Manage your WhatsApp Business account
                    </p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
              </div>
            </a>

            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                    <Key className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      API Overview & Authentication
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Learn about access tokens and API setup
                    </p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
              </div>
            </a>

            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-business-profile"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                    <Smartphone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      Business Profile Setup
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Configure your WhatsApp Business profile
                    </p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
              </div>
            </a>
          </CardContent>
        </Card>

        {/* Security Note */}
        <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-lg font-bold text-amber-900 dark:text-amber-100">
                Security Note
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Your access token is encrypted and stored securely. Never share your credentials with anyone. 
              For production use, consider using environment variables or a secure vault.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
