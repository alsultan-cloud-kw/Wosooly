import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { useTranslation } from "react-i18next"

const data = [
  { date: "Jan", clients: 320, files: 450 },
  { date: "Feb", clients: 425, files: 580 },
  { date: "Mar", clients: 580, files: 720 },
  { date: "Apr", clients: 690, files: 890 },
  { date: "May", clients: 820, files: 1050 },
  { date: "Jun", clients: 950, files: 1280 },
]

export function ActivityChart() {
  const { t } = useTranslation("adminDashboard");
  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="text-foreground">{t("activityChart.title")}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {t("activityChart.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="clients" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(99 102 241)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="rgb(99 102 241)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="files" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(34 197 94)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="rgb(34 197 94)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgb(226 232 240)"
              opacity={0.3}
            />

            <XAxis
              dataKey="date"
              stroke="rgb(148 163 184)"
              tick={{ fill: "rgb(100 116 139)" }}
            />
            <YAxis
              stroke="rgb(148 163 184)"
              tick={{ fill: "rgb(100 116 139)" }}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "rgb(255 255 255)",
                border: "1px solid rgb(226 232 240)",
                borderRadius: "8px",
              }}
            />

            <Area
              type="monotone"
              dataKey="clients"
              stroke="rgb(99 102 241)"
              strokeWidth={2}
              fill="url(#clients)"
              name={t("activityChart.clients")}
            />
            <Area
              type="monotone"
              dataKey="files"
              stroke="rgb(34 197 94)"
              strokeWidth={2}
              fill="url(#files)"
              name={t("activityChart.files")}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

