import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, Calendar, ShoppingCart } from "lucide-react"

function formatLastActive(lastLoginTime) {
  if (!lastLoginTime) return ""

  const last = new Date(lastLoginTime)
  if (Number.isNaN(last.getTime())) return ""

  const now = new Date()
  const diffMs = now.getTime() - last.getTime()
  if (diffMs <= 0) return "Just now"

  const hours = Math.floor(diffMs / (1000 * 60 * 60))

  if (hours < 1) {
    const minutes = Math.floor(diffMs / (1000 * 60))
    return minutes <= 1 ? "Just now" : `${minutes}m ago`
  }

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ClientDetailsDialog({ client, open, onOpenChange, onToggleStatus, isToggling = false }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Client Details</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Complete information about {client.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-semibold text-primary">
                {client.name.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{client.name}</h3>
              <Badge variant={client.status === "active" ? "default" : "secondary"}>
                {client.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{client.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{client.phone}</span>
            </div>
            {/* <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">San Francisco, CA</span>
            </div> */}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">
                Joined {client.createdAt ? client.createdAt.split("T")[0] : ""}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">
                WooCommerce: {client.wooCommerce ? "Connected" : "Not Connected"}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-2">
            <h4 className="font-medium text-foreground">Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Files</p>
                <p className="text-lg font-semibold text-foreground">
                  {client.filesCount}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Active</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatLastActive(client.lastLoginTime)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={client.status === "active" ? "destructive" : "default"}
              className="flex-1"
              onClick={async () => {
                await onToggleStatus()
                onOpenChange(false)
              }}
              disabled={isToggling}
            >
              {isToggling 
                ? "Updating..." 
                : client.status === "active" 
                  ? "Disable Client" 
                  : "Enable Client"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => onOpenChange(false)}
              disabled={isToggling}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
