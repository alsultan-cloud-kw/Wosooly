import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Download, Eye } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ClientDetailsDialog } from "@/components/admin/client-details-dialog"
import { ExcelViewerDialog } from "@/components/admin/excel-viewer-dialog"
import api from "../../../api_config"

export function ClientsTable() {
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true)
        setError(null)
        const { data } = await api.get("/admin/clients")

        // Map backend fields to the shape used by the UI
        const mapped = (data || []).map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          status: c.status,
          filesCount: c.files_count ?? 0,
          wooCommerce: c.woo_commerce ?? false,
        }))

        setClients(mapped)
      } catch (err) {
        console.error("Failed to fetch admin clients:", err)
        const backendMessage = err.response?.data?.detail
        setError(backendMessage || "Failed to load clients.")
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [])

  const toggleClientStatus = (clientId) => {
    setClients((prev) =>
      prev.map((client) =>
        client.id === clientId
          ? { ...client, status: client.status === "active" ? "disabled" : "active" }
          : client
      )
    )
  }

  const openDetails = (client) => {
    setSelectedClient(client)
    setShowDetails(true)
  }

  const openExcelViewer = (client) => {
    setSelectedClient(client)
    setShowExcel(true)
  }

  return (
    <>
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Loading clients...</p>}
          {error && !loading && (
            <p className="text-sm text-destructive mb-2">{error}</p>
          )}
          {!loading && !error && (
            <div className="space-y-4">
              {clients.length === 0 && (
                <p className="text-sm text-muted-foreground">No clients found yet.</p>
              )}
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {client.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{client.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={client.status === "active" ? "default" : "secondary"}>
                        {client.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {client.filesCount} files
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDetails(client)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openExcelViewer(client)}>
                        <Download className="h-4 w-4 mr-2" />
                        View Excel Files
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleClientStatus(client.id)}>
                        {client.status === "active" ? "Disable Client" : "Enable Client"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClient && (
        <>
          <ClientDetailsDialog
            client={selectedClient}
            open={showDetails}
            onOpenChange={setShowDetails}
            onToggleStatus={() => toggleClientStatus(selectedClient.id)}
          />
          <ExcelViewerDialog
            client={selectedClient}
            open={showExcel}
            onOpenChange={setShowExcel}
          />
        </>
      )}
    </>
  )
}
