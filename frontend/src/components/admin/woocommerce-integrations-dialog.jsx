import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ShoppingCart, Globe, Mail, Phone, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react"
import api from "../../../api_config"

export function WooCommerceIntegrationsDialog({ open, onOpenChange }) {
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      fetchIntegrations()
    }
  }, [open])

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

  const getSyncStatusBadge = (status) => {
    switch (status) {
      case "COMPLETE":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>
      case "IN_PROGRESS":
        return <Badge variant="default" className="bg-blue-500"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Syncing</Badge>
      case "PENDING":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case "FAILED":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            WooCommerce Integrations
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            View all connected WooCommerce stores and their sync status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Loading integrations...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={fetchIntegrations}
              >
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && integrations.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-foreground mb-2">No WooCommerce Integrations</p>
              <p className="text-sm text-muted-foreground">
                No clients have connected their WooCommerce stores yet.
              </p>
            </div>
          )}

          {!loading && !error && integrations.length > 0 && (
            <div className="space-y-3">
              {integrations.map((integration) => (
                <Card key={integration.client_id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{integration.client_name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {getSyncStatusBadge(integration.sync_status)}
                              <Badge variant={integration.is_active ? "default" : "secondary"}>
                                {integration.status}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Globe className="h-4 w-4" />
                            <span className="text-foreground break-all">{integration.store_url}</span>
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

                        <div className="flex items-center gap-4 pt-2 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground">Orders Synced</p>
                            <p className="text-lg font-semibold text-foreground">{integration.orders_count}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
