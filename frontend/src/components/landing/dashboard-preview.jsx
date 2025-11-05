import React from "react";
import { Card } from "../ui/card";
import { TrendingUp, Users, ShoppingCart, DollarSign } from "lucide-react";

export function DashboardPreview() {
  return (
    <div className="relative">
      {/* Soft glowing gradient background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-accent/10 to-transparent rounded-3xl blur-3xl" />

      <Card className="relative overflow-hidden border-2 shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Store Analytics</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Live Data
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Revenue Card */}
              <Card className="p-4 bg-card/50 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-xl font-bold">$24.5K</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>+18.2%</span>
                </div>
              </Card>

              {/* Orders Card */}
              <Card className="p-4 bg-card/50 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <ShoppingCart className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Orders</p>
                    <p className="text-xl font-bold">1,429</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>+12.5%</span>
                </div>
              </Card>

              {/* Active Customers */}
              <Card className="p-4 bg-card/50 backdrop-blur col-span-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                    <Users className="h-5 w-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Active Customers
                    </p>
                    <p className="text-xl font-bold">3,842</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>+24.8%</span>
                </div>
              </Card>
            </div>

            {/* Bar Chart Mockup */}
            <div className="relative h-32 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 p-4">
              <div className="absolute inset-0 flex items-end justify-around p-4">
                {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                  <div
                    key={i}
                    className="w-8 rounded-t bg-primary/60 backdrop-blur transition-all hover:bg-primary"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
