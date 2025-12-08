import { DatabaseChat } from "@/components/chat/database-chat";

export default function Chat() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
            Database Query Assistant
          </h1>
          <p className="text-muted-foreground text-lg">
            Ask questions about your data in natural language
          </p>
        </div>
        <DatabaseChat />
      </div>
    </main>
  );
}
