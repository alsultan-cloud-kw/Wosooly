import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"
import {
  FileSpreadsheet,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  Zap,
  Shield,
  Clock,
} from "lucide-react"

export default function AnalysisSelector() {
  const navigate = useNavigate()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/user/analysis-access")
        if (!response.ok) {
          // If endpoint doesn't exist or returns error, use defaults
          throw new Error(`HTTP ${response.status}`)
        }
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          // If response is not JSON (e.g., HTML error page), use defaults
          throw new Error("Response is not JSON")
        }
        const data = await response.json()
        setUserData(data)
      } catch (error) {
        // Endpoint doesn't exist yet - silently use defaults
        // This is expected behavior until the endpoint is implemented
        setUserData({
          hasExcelAccess: true,
          hasWooCommerceAccess: true,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const handleAnalysisSelect = (type) => {
    setSelectedAnalysis(type)
    
    // Set data source in localStorage
    localStorage.setItem("data_source", type)
    
    if (type === "excel") {
      // Navigate to Excel upload page
      navigate("/upload-excel")
    } else if (type === "woocommerce") {
      // Navigate to WooCommerce setup page
      navigate("/connect-woocommerce")
    }
  }

  const handleLogout = () => {
    console.log("Logging out user")
  }

  const handleSettings = () => {
    console.log("Opening settings")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 lg:px-12">
          <div className="flex items-center gap-3">
            {/* <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
              <BarChart3 className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
            </div> */}
            {/* <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">DataViz Pro</h1>
              <p className="text-xs text-muted-foreground">Analytics Platform</p>
            </div> */}
          </div>

          {/* {userData && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full ring-2 ring-primary/10 transition-all hover:ring-primary/30"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userData.avatar || "/placeholder.svg"} alt={userData.name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-sm font-semibold text-primary-foreground">
                      {getInitials(userData.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold leading-none">{userData.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{userData.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSettings}>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )} */}
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-12 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col">
            <div className="mb-8">
              <h2 className="text-balance text-4xl font-bold tracking-tight text-foreground">Choose Your Analysis</h2>
              <p className="mt-3 text-pretty text-lg text-muted-foreground">
                Select your data source and unlock powerful insights
              </p>
            </div>

            <div className="flex flex-col gap-5">
              <Card
                className="group relative overflow-hidden border-2 border-border cursor-pointer transition-all duration-300 hover:border-chart-2 hover:shadow-xl hover:shadow-chart-2/10"
                onClick={() => handleAnalysisSelect("excel")}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-chart-2/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <CardHeader className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-chart-2 to-chart-2/80 shadow-lg shadow-chart-2/20">
                      <FileSpreadsheet className="h-7 w-7 text-white" strokeWidth={2} />
                    </div>
                    {userData?.hasExcelAccess && (
                      <div className="rounded-full bg-chart-2/10 p-1.5">
                        <CheckCircle2 className="h-5 w-5 text-chart-2" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                  <CardTitle className="mt-4 text-2xl">Excel Sheet Analysis</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Analyze data from your Excel spreadsheets with AI-powered insights and beautiful visualizations
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  {userData?.hasExcelAccess ? (
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-chart-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Ready to analyze</span>
                    </div>
                  ) : (
                    <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Upload Excel files to get started</span>
                    </div>
                  )}
                  <Button
                    className="w-full shadow-md transition-all hover:shadow-lg"
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAnalysisSelect("excel")
                    }}
                  >
                    {userData?.hasExcelAccess ? "Start Analysis" : "Upload Excel Files"}
                  </Button>
                </CardContent>
              </Card>

              <Card
                className="group relative overflow-hidden border-2 border-border cursor-pointer transition-all duration-300 hover:border-chart-4 hover:shadow-xl hover:shadow-chart-4/10"
                onClick={() => handleAnalysisSelect("woocommerce")}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-chart-4/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <CardHeader className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-chart-4 to-chart-4/80 shadow-lg shadow-chart-4/20">
                      <ShoppingCart className="h-7 w-7 text-white" strokeWidth={2} />
                    </div>
                    {userData?.hasWooCommerceAccess && (
                      <div className="rounded-full bg-chart-4/10 p-1.5">
                        <CheckCircle2 className="h-5 w-5 text-chart-4" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                  <CardTitle className="mt-4 text-2xl">WooCommerce Analysis</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Connect your store and get real-time insights on sales, products, and customer behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  {userData?.hasWooCommerceAccess ? (
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-chart-4">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Ready to analyze</span>
                    </div>
                  ) : (
                    <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Configure credentials to get started</span>
                    </div>
                  )}
                  <Button
                    className="w-full shadow-md transition-all hover:shadow-lg"
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAnalysisSelect("woocommerce")
                    }}
                  >
                    {userData?.hasWooCommerceAccess ? "Start Analysis" : "Setup WooCommerce"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Side: Hero + Features */}
          <div className="flex flex-col gap-8">
            <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground shadow-2xl shadow-primary/20 lg:p-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                <Zap className="h-4 w-4" />
                <span>Powerful Analytics Engine</span>
              </div>
              <h3 className="text-balance text-3xl font-bold leading-tight lg:text-4xl">
                Transform Your Data Into Actionable Insights
              </h3>
              <p className="mt-4 text-pretty text-lg leading-relaxed text-primary-foreground/90">
                Our AI-powered platform helps you understand your data better, make informed decisions faster, and drive
                business growth with confidence.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
