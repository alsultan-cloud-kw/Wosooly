import { useEffect, useState } from "react"
import { DashboardHeader } from "./dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Input } from "../ui/input"
import { MoreVertical, Download, Eye, Search, Filter } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { ClientDetailsDialog } from "./client-details-dialog"
import { ExcelViewerDialog } from "./excel-viewer-dialog"
import api from "../../../api_config"

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [togglingClientId, setTogglingClientId] = useState(null)

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true)
        setError(null)
        const { data } = await api.get("/admin/clients")

        const mapped = (data || []).map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          userType: c.user_type,
          createdAt: c.created_at,
          lastLoginTime: c.last_login_time,
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

  const toggleClientStatus = async (clientId) => {
    try {
      setTogglingClientId(clientId)
      setError(null)
      
      // Call the backend API to toggle status
      const { data } = await api.patch(`/admin/clients/${clientId}/toggle-status`)
      
      // Update local state with the response from backend
      setClients((prev) =>
        prev.map((client) =>
          client.id === clientId
            ? { ...client, status: data.status, is_active: data.is_active }
            : client
        )
      )
      
      // Update selected client if it's the one being toggled
      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient({
          ...selectedClient,
          status: data.status,
          is_active: data.is_active
        })
      }
      
      // Show success message (optional - you can add a toast notification here)
      console.log(data.message)
    } catch (err) {
      console.error("Failed to toggle client status:", err)
      const errorMessage = err.response?.data?.detail || "Failed to update client status"
      setError(errorMessage)
      
      // Optionally show error to user (you can add a toast notification here)
      alert(errorMessage)
    } finally {
      setTogglingClientId(null)
    }
  }

  const openDetails = (client) => {
    setSelectedClient(client)
    setShowDetails(true)
  }

  const openExcelViewer = (client) => {
    setSelectedClient(client)
    setShowExcel(true)
  }

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = filterStatus === "all" || client.status === filterStatus

    return matchesSearch && matchesFilter
  })

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">All Clients</h1>
          <p className="text-muted-foreground">
            Manage and monitor all your clients in one place
          </p>
        </div>

        <Card className="border border-border">
          <CardHeader className="border-b border-border">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <CardTitle>Client Directory</CardTitle>

              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 bg-transparent">
                      <Filter className="h-4 w-4" />
                      Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                      All Clients
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus("active")}>
                      Active Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus("disabled")}>
                      Disabled Only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-3">
            {loading && <p className="text-sm text-muted-foreground">Loading clients...</p>}
            {error && !loading && <p className="text-sm text-destructive mb-2">{error}</p>}

            {!loading &&
              !error &&
              filteredClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-semibold text-primary">
                      {client.name.charAt(0)}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{client.name}</p>
                      <Badge variant={client.status === "active" ? "default" : "secondary"}>
                        {client.status}
                      </Badge>
                      {client.userType && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {client.userType}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{client.email}</p>
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
                    <DropdownMenuItem 
                      onClick={() => toggleClientStatus(client.id)}
                      disabled={loading || togglingClientId === client.id}
                    >
                      {togglingClientId === client.id 
                        ? "Updating..." 
                        : client.status === "active" 
                          ? "Disable Client" 
                          : "Enable Client"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {!loading && !error && filteredClients.length === 0 && (
              <p className="text-center text-muted-foreground py-12">
                No clients found
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      {selectedClient && (
        <>
          <ClientDetailsDialog
            client={selectedClient}
            open={showDetails}
            onOpenChange={setShowDetails}
            onToggleStatus={async () => {
              await toggleClientStatus(selectedClient.id)
            }}
            isToggling={togglingClientId === selectedClient.id}
          />
          <ExcelViewerDialog
            client={selectedClient}
            open={showExcel}
            onOpenChange={setShowExcel}
          />
        </>
      )}
    </div>
  )
}
