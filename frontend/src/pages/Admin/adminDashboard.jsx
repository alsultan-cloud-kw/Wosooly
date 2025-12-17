import { DashboardHeader } from "@/components/admin/dashboard-header"
import { StatsOverview } from "@/components/admin/stats-overview"
import { ClientsTable } from "@/components/admin/clients-table"
import { ActivityChart } from "@/components/admin/activity-chart"

export default function AdminDashboard() {
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
