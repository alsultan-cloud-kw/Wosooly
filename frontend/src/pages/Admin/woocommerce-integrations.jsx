import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/admin/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Globe, Mail, Phone, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react"
import api from "../../../api_config"

export default function WooCommerceIntegrationsPage() {
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await api.get("/admin/integrations/woocommerce")
      setIntegrations(data || [])
    } catch (err) {
      console.error("Failed to fetch WooCommerce integrations:", err)
      const errorMessage = err.response?.data?.detail || "Failed to load integrations"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // const getSyncStatusBadge = (status) => {
  //   switch (status) {
  //     case "COMPLETE":
  //       return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>
  //     case "IN_PROGRESS":
  //       return <Badge variant="default" className="bg-blue-500"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Syncing</Badge>
  //     case "PENDING":
  //       return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
  //     case "FAILED":
  //       return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
  //     default:
  //       return <Badge variant="secondary">{status}</Badge>
  //   }
  // }

  const formatDate = (dateString) => {
    if (!dateString) return "Never"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateString
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">WooCommerce Integrations</h1>
          </div>
          <p className="text-muted-foreground">
            View all connected WooCommerce stores and their sync status
          </p>
        </div>

        <div className="space-y-4">
          {loading && (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">Loading integrations...</p>
            </div>
          )}

          {error && !loading && (
            <Card className="border-destructive">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-destructive font-medium mb-2">Error loading integrations</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchIntegrations}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !error && integrations.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No WooCommerce Integrations</h3>
                <p className="text-sm text-muted-foreground">
                  No clients have connected their WooCommerce stores yet.
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && integrations.length > 0 && (
            <div className="grid gap-4">
              {integrations.map((integration) => (
                <Card key={integration.client_id} className="border-border">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <ShoppingCart className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{integration.client_name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {/* {getSyncStatusBadge(integration.sync_status)} */}
                              <Badge variant={integration.is_active ? "default" : "secondary"}>
                                {integration.status}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Globe className="h-4 w-4" />
                            <a
                              href={integration.store_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground break-all hover:text-primary hover:underline transition-colors"
                            >
                              {integration.store_url}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="text-foreground">{integration.email}</span>
                          </div>
                          {integration.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span className="text-foreground">{integration.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <RefreshCw className="h-4 w-4" />
                            <span className="text-foreground">
                              Last synced: {formatDate(integration.last_synced_at)}
                            </span>
                          </div>
                        </div>

                        {/* <div className="flex items-center gap-6 pt-3 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground">Orders Synced</p>
                            <p className="text-xl font-semibold text-foreground">{integration.orders_count}</p>
                          </div>
                        </div> */}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
