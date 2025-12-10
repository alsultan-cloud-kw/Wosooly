import { useState } from "react";
import { DatabaseChat } from "@/components/chat/database-chat";
import { ExcelChat } from "@/components/chat/excel-chat";
import { Button } from "@/components/ui/button";
import { Database, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Chat() {
  const [chatType, setChatType] = useState("excel"); // Default to Excel chat

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
            Data Query Assistant
          </h1>
          <p className="text-muted-foreground text-lg mb-4">
            Ask questions about your data in natural language
          </p>
          
          {/* Chat Type Selector */}
          <div className="flex gap-2 justify-center">
            <Button
              variant={chatType === "excel" ? "default" : "outline"}
              onClick={() => setChatType("excel")}
              className={cn(
                "flex items-center gap-2 transition-all",
                chatType === "excel" && "shadow-md"
              )}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel Chat
            </Button>
            <Button
              variant={chatType === "database" ? "default" : "outline"}
              onClick={() => setChatType("database")}
              className={cn(
                "flex items-center gap-2 transition-all",
                chatType === "database" && "shadow-md"
              )}
            >
              <Database className="w-4 h-4" />
              WooCommerce Chat
            </Button>
          </div>
        </div>
        
        {/* Render the selected chat component */}
        {chatType === "excel" ? <ExcelChat /> : <DatabaseChat />}
      </div>
    </main>
  );
}
