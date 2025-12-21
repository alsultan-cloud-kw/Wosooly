import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, FileSpreadsheet, User, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "../../../api_config";

export function ExcelChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Load uploaded files on mount
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setIsLoadingFiles(true);
      const { data } = await api.get("/excel-chat/files");
      setFiles(data.files || []);
      if (data.files && data.files.length > 0) {
        setSelectedFileId(data.files[0].id);
      }
    } catch (error) {
      console.error("Failed to load files:", error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

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
      const { data: result } = await api.post("/excel-chat/query", {
        question: userMessage.content,
        file_id: selectedFileId,
      });
  
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.answer || "Query executed successfully",
        data: result.result,
        code: result.code,
        error: result.error,
        resultType: result.type,
        timestamp: new Date(),
      };
  
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Failed to execute query",
        error: error?.response?.data?.detail || error?.message || "Unknown error",
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

  // Ready-made questions for Excel chat
  const readyQuestions = [
    "Show me top 10 customers by total orders",
    "What's the total revenue?",
    "Which products sold the most last month?",
    "How many orders do I have?",
    "Show me customers with highest spending",
    "What are the best-selling products?",
    "Show me recent orders",
    "Calculate average order value",
  ];

  const handleQuestionClick = (question) => {
    setInput(question);
    textareaRef.current?.focus();
  };

  const selectedFile = files.find(f => f.id === selectedFileId);

  return (
    <Card className="flex flex-col h-[600px] bg-card shadow-lg">
      {/* File Selector */}
      {files.length > 0 && (
        <div className="border-b border-border p-3 bg-muted/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium text-foreground">File:</label>
            <select
              value={selectedFileId || ""}
              onChange={(e) => setSelectedFileId(Number(e.target.value))}
              className="flex-1 text-sm border border-border rounded px-2 py-1 bg-background text-foreground"
              disabled={isLoading}
            >
              {files.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.filename} ({file.total_rows} rows)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileSpreadsheet className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Chat with your Excel data
            </h3>
            <p className="text-muted-foreground max-w-md mb-4">
              Ask questions about your uploaded Excel file in plain English. For example:
            </p>
            <div className="text-sm text-muted-foreground space-y-1 max-w-md">
              <p>"Show me top 10 customers by total orders"</p>
              <p>"What's the total revenue in December?"</p>
              <p>"Which products sold the most last month?"</p>
              <p>"How many orders do I have?"</p>
            </div>
            {isLoadingFiles && (
              <p className="text-xs text-muted-foreground mt-4">Loading files...</p>
            )}
            {!isLoadingFiles && files.length === 0 && (
              <p className="text-xs text-destructive mt-4">
                No Excel files found. Please upload a file first.
              </p>
            )}
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
                <FileSpreadsheet className="w-4 h-4 text-primary-foreground" />
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

              {/* Code Display (optional, can be toggled) */}
              {message.code && !message.error && (
                <details className="w-full">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Show generated code
                  </summary>
                  <Card className="w-full bg-secondary/50 p-3 border border-border mt-2">
                    <code className="text-xs font-mono text-foreground block overflow-x-auto whitespace-pre">
                      {message.code}
                    </code>
                  </Card>
                </details>
              )}

              {/* Data Results Display */}
              {message.data && !message.error && (
                <Card className="w-full bg-card p-4 border border-border max-h-64 overflow-auto">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">
                    {message.resultType === "dataframe" && Array.isArray(message.data)
                      ? `Results (${message.data.length} rows):`
                      : message.resultType === "scalar"
                      ? "Result:"
                      : "Results:"}
                  </p>
                  
                  {message.resultType === "dataframe" && Array.isArray(message.data) && message.data.length > 0 ? (
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
                                  {value !== null && value !== undefined ? String(value) : "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : message.resultType === "scalar" ? (
                    <div className="text-lg font-semibold text-foreground">
                      {message.data}
                    </div>
                  ) : message.resultType === "series" && typeof message.data === "object" ? (
                    <div className="space-y-1">
                      {Object.entries(message.data).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="text-foreground font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <pre className="text-xs text-muted-foreground overflow-x-auto">
                      {JSON.stringify(message.data, null, 2)}
                    </pre>
                  )}
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
              <FileSpreadsheet className="w-4 h-4 text-primary-foreground" />
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
        {/* Ready-made Questions - Always visible when files are loaded */}
        {files.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              Try asking:
            </p>
            <div className="flex flex-wrap gap-2">
              {readyQuestions.map((question, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleQuestionClick(question)}
                  className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-full border border-border transition-colors cursor-pointer"
                  disabled={isLoading || files.length === 0}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={files.length > 0 ? "Ask a question about your Excel data..." : "Upload an Excel file first..."}
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading || files.length === 0}
          />
          <Button
            type="submit"
            size="icon"
            className="h-[60px] w-[60px] flex-shrink-0"
            disabled={!input.trim() || isLoading || files.length === 0}
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
