import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, Database, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "../../../api_config";

export function DatabaseChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
  
    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
  
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
  
    try {
      // Axios automatically parses JSON
      const { data: result } = await api.post("/nl2sql", {
        question: userMessage.content,
      });
  
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Query executed successfully",   // Or you can put result.explanation if available
        sql: result.sql_query,                   // Correct field
        data: result.results,                    // Correct field
        error: result.error,
        timestamp: new Date(),
      };
  
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Failed to execute query",
        error: error?.message ?? "Unknown error",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] bg-card shadow-lg">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Database className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Start a conversation
            </h3>
            <p className="text-muted-foreground max-w-md">
              Ask questions about your database in plain English. For example:
              "Show me all customers" or "What are the top 5 products by sales?"
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Database className="w-4 h-4 text-primary-foreground" />
              </div>
            )}

            <div
              className={cn(
                "flex flex-col max-w-[80%] gap-2",
                message.role === "user" ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "rounded-lg px-4 py-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>

              {/* SQL Query Display */}
              {/* {message.sql && (
                <Card className="w-full bg-secondary/50 p-3 border border-border">
                  <p className="text-xs font-mono text-muted-foreground mb-1">
                    SQL Query:
                  </p>
                  <code className="text-xs font-mono text-foreground block overflow-x-auto">
                    {message.sql}
                  </code>
                </Card>
              )} */}

              {/* Data Results Display */}
              {message.data && message.data.length > 0 && (
                <Card className="w-full bg-card p-4 border border-border max-h-64 overflow-auto">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">
                    Results ({message.data.length} rows):
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {Object.keys(message.data[0]).map((key) => (
                            <th
                              key={key}
                              className="text-left py-2 px-3 font-semibold text-foreground"
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {message.data.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-border last:border-0"
                          >
                            {Object.values(row).map((value, cellIdx) => (
                              <td
                                key={cellIdx}
                                className="py-2 px-3 text-muted-foreground"
                              >
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Error Display */}
              {message.error && (
                <Card className="w-full bg-destructive/10 p-3 border border-destructive/50">
                  <p className="text-xs font-semibold text-destructive mb-1">
                    Error:
                  </p>
                  <p className="text-xs text-destructive/90">
                    {message.error}
                  </p>
                </Card>
              )}

              <span className="text-xs text-muted-foreground">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-4 h-4 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Database className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-lg px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 bg-card">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your database..."
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="h-[60px] w-[60px] flex-shrink-0"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <SendHorizontal className="w-5 h-5" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </Card>
  );
}
