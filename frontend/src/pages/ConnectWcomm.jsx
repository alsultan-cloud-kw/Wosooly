import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Lock, Store, Key, CheckCircle2, AlertCircle, ExternalLink, Sparkles } from "lucide-react"
import api from "../../api_config"
import { useNavigate } from "react-router-dom"

export default function WooCommerceCredentialsForm() {
  const [storeUrl, setStoreUrl] = useState("")
  const [consumerKey, setConsumerKey] = useState("")
  const [consumerSecret, setConsumerSecret] = useState("")
  const [showSecret, setShowSecret] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsConnecting(true)
    setConnectionStatus("idle")
    setErrorMessage("")

    try {
      // Submit credentials to backend
      const response = await api.post("/woocommerce-credentials", {
        store_url: storeUrl.trim(),
        consumer_key: consumerKey.trim(),
        consumer_secret: consumerSecret.trim(),
      })

      if (response.data && response.data.message) {
        setConnectionStatus("success")
        setErrorMessage("")
        navigate("/dashboard")
        // Optionally clear form or redirect
        // setStoreUrl("")
        // setConsumerKey("")
        // setConsumerSecret("")
      } else {
        setConnectionStatus("error")
        setErrorMessage("Failed to connect. Please try again.")
      }
    } catch (error) {
      console.error("Error connecting WooCommerce:", error)
      setConnectionStatus("error")
      
      // Show more specific error message if available
      if (error.response?.data?.detail) {
        setErrorMessage(error.response.data.detail)
      } else if (error.response?.status === 401) {
        setErrorMessage("You are not authenticated. Please log in and try again.")
      } else if (error.response?.status === 400) {
        setErrorMessage(error.response.data?.detail || "Invalid credentials. Please check your input.")
      } else if (error.message === "Network Error") {
        setErrorMessage("Network error. Please check your connection and try again.")
      } else {
        setErrorMessage("Failed to connect. Please check your credentials and try again.")
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const isValidUrl = (url) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-chart-1/5 via-chart-2/5 to-chart-3/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-2 shadow-2xl bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-4 bg-gradient-to-r from-chart-1/10 via-chart-2/10 to-chart-5/10 border-b-2 border-chart-2/20">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-chart-1 to-chart-5 shadow-lg">
              <Store className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-3xl font-bold text-balance bg-gradient-to-r from-chart-1 to-chart-2 bg-clip-text text-transparent">
                Connect Your WooCommerce Store
              </CardTitle>
              <CardDescription className="text-base mt-2 leading-relaxed">
                Enter your store credentials to sync your products and orders securely
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-8">
            {connectionStatus === "success" && (
              <Alert className="border-2 border-chart-2 bg-gradient-to-r from-chart-2/20 to-chart-4/20 shadow-md">
                <CheckCircle2 className="h-5 w-5 text-chart-2" />
                <AlertDescription className="text-chart-2 font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Successfully connected to your WooCommerce store!
                </AlertDescription>
              </Alert>
            )}

            {connectionStatus === "error" && (
              <Alert className="border-2 border-destructive bg-gradient-to-r from-destructive/20 to-destructive/10 shadow-md">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <AlertDescription className="text-destructive font-semibold">
                  {errorMessage || "Failed to connect. Please check your credentials and try again."}
                </AlertDescription>
              </Alert>
            )}

            {/* Store URL Field */}
            <div className="space-y-3 group">
              <Label htmlFor="store-url" className="text-base font-bold flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-gradient-to-br from-chart-1 to-chart-1/70 shadow-sm">
                  <Store className="h-4 w-4 text-white" />
                </div>
                <span className="text-chart-1">Store URL</span>
              </Label>
              <Input
                id="store-url"
                type="url"
                placeholder="https://yourstore.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                className="h-12 text-base border-2 focus:border-chart-1 focus:ring-chart-1/20 transition-all"
                required
              />
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-chart-1"></span>
                Your WooCommerce store's full URL (including https://)
              </p>
            </div>

            {/* Consumer Key Field */}
            <div className="space-y-3 group">
              <Label htmlFor="consumer-key" className="text-base font-bold flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-gradient-to-br from-chart-2 to-chart-2/70 shadow-sm">
                  <Key className="h-4 w-4 text-white" />
                </div>
                <span className="text-chart-2">Consumer Key</span>
              </Label>
              <Input
                id="consumer-key"
                type="text"
                placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
                className="h-12 font-mono text-sm border-2 focus:border-chart-2 focus:ring-chart-2/20 transition-all"
                required
              />
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-chart-2"></span>
                Starts with <code className="px-2 py-1 bg-chart-2/10 text-chart-2 rounded text-xs font-mono font-bold">ck_</code>
              </p>
            </div>

            {/* Consumer Secret Field */}
            <div className="space-y-3 group">
              <Label htmlFor="consumer-secret" className="text-base font-bold flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-gradient-to-br from-chart-4 to-chart-4/70 shadow-sm">
                  <Lock className="h-4 w-4 text-white" />
                </div>
                <span className="text-chart-4">Consumer Secret</span>
              </Label>
              <div className="relative">
                <Input
                  id="consumer-secret"
                  type={showSecret ? "text" : "password"}
                  placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  className="h-12 font-mono text-sm pr-12 border-2 focus:border-chart-4 focus:ring-chart-4/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-chart-4 hover:text-chart-4/70 transition-colors p-1 rounded-md hover:bg-chart-4/10"
                  aria-label={showSecret ? "Hide secret" : "Show secret"}
                >
                  {showSecret ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-chart-4"></span>
                Starts with <code className="px-2 py-1 bg-chart-4/10 text-chart-4 rounded text-xs font-mono font-bold">cs_</code>
              </p>
            </div>

            {/* Help Section */}
            <Alert className="bg-gradient-to-r from-chart-3/10 via-chart-3/5 to-transparent border-2 border-chart-3/30 shadow-md">
              {/* <div className="p-2 rounded-lg bg-chart-3 inline-block"> */}
                {/* <AlertCircle className="h-4 w-4 text-white" /> */}
              {/* </div> */}
              <AlertDescription className="text-sm leading-relaxed">
                <span className="font-bold text-chart-3 block mb-2 text-base">Need help finding your credentials?</span>
                Go to <span className="font-semibold text-foreground">WooCommerce → Settings → Advanced → REST API</span> to generate new keys.
                <a
                  href="https://woocommerce.com/document/woocommerce-rest-api/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-chart-3 hover:text-chart-3/70 font-semibold underline decoration-2 underline-offset-4 mt-2"
                >
                  View Documentation
                  <ExternalLink className="h-4 w-4" />
                </a>
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-4 bg-gradient-to-r from-chart-5/10 to-chart-1/10 border-t-2 border-chart-2/20 pt-6">
            <Button
              type="submit"
              className="w-full sm:flex-1 h-12 px-8 text-base font-bold bg-gradient-to-r from-chart-1 via-chart-5 to-chart-1 hover:shadow-xl hover:scale-[1.02] transition-all shadow-lg text-white border-0"
              disabled={isConnecting || !storeUrl || !consumerKey || !consumerSecret || !isValidUrl(storeUrl)}
            >
              {isConnecting ? (
                <>
                  <div className="h-5 w-5 border-3 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5 mr-2" />
                  Connect Securely
                </>
              )}
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground sm:max-w-xs">
              <div className="p-1.5 rounded-md bg-chart-2/20">
                <Lock className="h-3.5 w-3.5 text-chart-2" />
              </div>
              <span>Your credentials are encrypted and stored securely</span>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
