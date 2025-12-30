import { Bell, Search, Settings, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNavigate, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"

export function DashboardHeader() {
  const { t } = useTranslation("adminDashboard");
  const navigate = useNavigate()
  const location = useLocation()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check if current user is an admin
    const userType = localStorage.getItem("user_type")
    setIsAdmin(userType === "admin")
  }, [])

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-semibold text-foreground">{t("header.title")}</h1>
          <nav className="hidden md:flex gap-6">
            <button
              onClick={() => navigate("/admin-dashboard")}
              className={`text-sm font-medium transition-colors ${
                location.pathname === "/admin-dashboard"
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("header.overview")}
            </button>
            <button
              onClick={() => navigate("/clients")}
              className={`text-sm font-medium transition-colors ${
                location.pathname === "/clients"
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("header.clients")}
            </button>
            <button
              onClick={() => navigate("/admin/integrations")}
              className={`text-sm font-medium transition-colors ${
                location.pathname === "/admin/integrations"
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("header.integrations")}
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate("/admin-register")}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === "/admin-register"
                    ? "text-primary hover:text-primary/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("header.registerAdmin")}
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("header.searchPlaceholder")}
              className="pl-10 w-64"
            />
          </div> */}

          {/* <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button> */}

          {/* <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button> */}

          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("header.myAccount")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>{t("header.profile")}</DropdownMenuItem>
              <DropdownMenuItem>{t("header.settings")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>{t("header.logout")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}
        </div>
      </div>
    </header>
  )
}
