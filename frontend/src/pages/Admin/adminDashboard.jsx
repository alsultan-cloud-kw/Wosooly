import { DashboardHeader } from "@/components/admin/dashboard-header"
import { StatsOverview } from "@/components/admin/stats-overview"
import { ClientsTable } from "@/components/admin/clients-table"
import { ActivityChart } from "@/components/admin/activity-chart"
import { useTranslation } from "react-i18next"

export default function AdminDashboard() {
  // Translation hook is available for future use if needed
  // All child components (DashboardHeader, StatsOverview, ActivityChart, ClientsTable) 
  // already have translations set up
  useTranslation("adminDashboard");
  
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto p-6 space-y-6">
        <StatsOverview />
        <div className="grid gap-6 md:grid-cols-2">
          <ActivityChart />
          <ClientsTable />
        </div>
      </main>
    </div>
  )
}
