import React from "react";
import { DataSourceSelector } from "@/components/DataSourceSelector_component"

export default function SelectDataSourcePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8">
      <div className="container mx-auto px-4 w-full">
        <DataSourceSelector />
      </div>
    </div>
  )
}

