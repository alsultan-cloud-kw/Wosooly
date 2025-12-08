import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageSquare, CheckCircle2, Info } from "lucide-react"

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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-500/10">
            <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-500" />
          </div>
          <div>
            <CardTitle className="text-2xl">WhatsApp Business API</CardTitle>
            <CardDescription>
              Connect your WhatsApp Business account to fetch message templates
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {showSuccess && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
              <AlertDescription className="text-green-900 dark:text-green-100">
                Credentials saved successfully!
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="phoneNumberId" className="text-base">
              Phone Number ID
            </Label>
            <Input
              id="phoneNumberId"
              type="text"
              placeholder="Enter your WhatsApp Phone Number ID"
              value={formData.phoneNumberId}
              onChange={(e) => handleChange("phoneNumberId", e.target.value)}
              className="h-11"
              disabled={isLoading}
              required
            />
            <p className="text-sm text-muted-foreground flex items-start gap-1.5">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Find this in your Meta Business Manager under WhatsApp &gt; API
                Setup
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wabaId" className="text-base">
              WhatsApp Business Account ID (WABA ID)
            </Label>
            <Input
              id="wabaId"
              type="text"
              placeholder="Enter your WABA ID"
              value={formData.wabaId}
              onChange={(e) => handleChange("wabaId", e.target.value)}
              className="h-11"
              disabled={isLoading}
              required
            />
            <p className="text-sm text-muted-foreground flex items-start gap-1.5">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Your WhatsApp Business Account ID from Meta Business Suite</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken" className="text-base">
              Access Token
            </Label>
            <Input
              id="accessToken"
              type="password"
              placeholder="Enter your WhatsApp Access Token"
              value={formData.accessToken}
              onChange={(e) => handleChange("accessToken", e.target.value)}
              className="h-11 font-mono text-sm"
              disabled={isLoading}
              required
            />
            <p className="text-sm text-muted-foreground flex items-start gap-1.5">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Generate a permanent access token from your Meta App settings
              </span>
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-base"
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? "Connecting..." : "Connect WhatsApp Business"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
