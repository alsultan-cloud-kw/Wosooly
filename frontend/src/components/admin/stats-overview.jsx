import { useState, useEffect } from "react"
import { Users, FileSpreadsheet, ShoppingCart } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import api from "../../../api_config"

export function StatsOverview() {
  const [stats, setStats] = useState({
    total_clients: 0,
    total_excel_files: 0,
    woo_commerce_connected: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await api.get("/admin/stats")
        setStats(response.data)
      } catch (err) {
        console.error("Failed to fetch admin stats:", err)
        setError(err.response?.data?.detail || "Failed to load statistics")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-US").format(num)
  }

  const statsConfig = [
    {
      title: "Total Clients",
      value: stats.total_clients,
      icon: Users,
    },
    {
      title: "Excel Files",
      value: stats.total_excel_files,
      icon: FileSpreadsheet,
    },
    {
      title: "WooCommerce Connected",
      value: stats.woo_commerce_connected,
      icon: ShoppingCart,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                {loading ? (
                  <p className="text-2xl font-semibold text-foreground">Loading...</p>
                ) : error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : (
                  <p className="text-2xl font-semibold text-foreground">
                    {formatNumber(stat.value)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
