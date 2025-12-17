import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload,
  FileSpreadsheet,
  ShoppingCart,
  Check,
  AlertCircle,
  Plus,
  Activity,
  Database,
  Sparkles,
  TrendingUp,
  Layers,
  Info,
  ArrowRight,
  HelpCircle,
  FileCheck,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import api from "../../api_config"

export default function UserDashboard() {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [wooCommerceConnected, setWooCommerceConnected] = useState(false)
  const [activeDataSource, setActiveDataSource] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState(null)

  const navigate = useNavigate()

  // Fetch uploaded files from backend
  const fetchUploadedFiles = async () => {
    try {
      setIsLoadingFiles(true)
      const response = await api.get("/uploaded-files")
      const files = response.data.files || []
      
      // Map backend response to frontend format
      const mappedFiles = files.map((file) => ({
        id: file.id.toString(),
        name: file.filename,
        size: 0, // Backend doesn't return size
        uploadedAt: new Date(file.uploaded_at),
        isActive: false,
        file_type: file.file_type,
        total_rows: file.total_rows,
        total_columns: file.total_columns,
      }))
      
      // Check if any file is active from localStorage (only if data source is excel)
      const dataSource = localStorage.getItem("data_source")
      const activeFileId = localStorage.getItem("active_excel_file_id")
      if (activeFileId && dataSource === "excel") {
        const updatedFiles = mappedFiles.map((f) => ({
          ...f,
          isActive: f.id === activeFileId,
        }))
        setUploadedFiles(updatedFiles)
      } else {
        setUploadedFiles(mappedFiles)
      }
    } catch (error) {
      console.error("Error fetching uploaded files:", error)
      toast.error("Failed to load files", {
        description: "Could not retrieve your uploaded files. Please try again.",
      })
    } finally {
      setIsLoadingFiles(false)
    }
  }

  // Check WooCommerce connection status from backend
  const checkWooCommerceConnection = async () => {
    try {
      const response = await api.get("/woocommerce-credentials")
      const isConnected = response.data.is_connected === true
      setWooCommerceConnected(isConnected)
      // Update localStorage to keep it in sync
      if (isConnected) {
        localStorage.setItem("woocommerce_connected", "true")
      } else {
        localStorage.removeItem("woocommerce_connected")
      }
      return isConnected
    } catch (error) {
      console.error("Error checking WooCommerce connection:", error)
      setWooCommerceConnected(false)
      localStorage.removeItem("woocommerce_connected")
      return false
    }
  }

  useEffect(() => {
    fetchUploadedFiles()
    checkWooCommerceConnection()

    const storedDataSource = localStorage.getItem("data_source")
    setActiveDataSource(storedDataSource)

    // Refresh connection status when component becomes visible (e.g., returning from connect page)
    const handleFocus = () => {
      checkWooCommerceConnection()
    }
    window.addEventListener("focus", handleFocus)
    
    return () => {
      window.removeEventListener("focus", handleFocus)
    }
  }, [])

  const validateAndUploadFile = async (file) => {
    if (!file) return

    const validTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ]

    if (
      !validTypes.includes(file.type) &&
      !file.name.endsWith(".csv") &&
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls")
    ) {
      toast.error("Invalid file type", {
        description: "Please upload an Excel (.xlsx, .xls) or CSV file.",
      })
      return
    }

    setIsUploading(true)
    setSelectedFileName(file.name)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append("file", file)

      // Upload file to backend
      const response = await api.post("/excel-upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      if (response.data && response.data.file_id) {
        toast.success("File uploaded successfully", {
          description: `${file.name} has been uploaded and is ready to use.`,
        })
        
        // Refresh files list from backend
        await fetchUploadedFiles()
        setSelectedFileName(null)
        navigate(`/column-mapping/${response.data.file_id}`)
      } else {
        throw new Error("Upload response missing file_id")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Upload failed", {
        description: error.response?.data?.detail || "There was an error uploading your file. Please try again.",
      })
      setSelectedFileName(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    await validateAndUploadFile(file)
    event.target.value = ""
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    await validateAndUploadFile(file)
  }

  const handleFileSelect = () => {
    document.getElementById("file-upload-hidden").click()
  }

  const selectExcelFile = (fileId) => {
    localStorage.setItem("data_source", "excel")
    localStorage.setItem("active_excel_file_id", fileId)
    setActiveDataSource("excel")

    const updatedFiles = uploadedFiles.map((f) => ({
      ...f,
      isActive: f.id === fileId,
    }))
    setUploadedFiles(updatedFiles)

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent("dataSourceChanged", { 
      detail: { dataSource: "excel", fileId: fileId } 
    }))

    const selectedFile = uploadedFiles.find((f) => f.id === fileId)
    toast.success("Data source activated", {
      description: `Now using "${selectedFile?.name}" as your active data source. All analytics will use this file.`,
    })
  }

  const selectWooCommerce = async () => {
    // Verify connection status before activating
    const isConnected = await checkWooCommerceConnection()
    
    if (!isConnected) {
      toast.error("WooCommerce not connected", {
        description: "Please connect your WooCommerce store first.",
      })
      navigate("/connect-woocommerce")
      return
    }

    localStorage.setItem("data_source", "woocommerce")
    localStorage.removeItem("active_excel_file_id")
    setActiveDataSource("woocommerce")

    const updatedFiles = uploadedFiles.map((f) => ({ ...f, isActive: false }))
    setUploadedFiles(updatedFiles)

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent("dataSourceChanged", { 
      detail: { dataSource: "woocommerce", fileId: null } 
    }))

    toast.success("Data source activated", {
      description: "Now using WooCommerce as your active data source. All analytics will use your store data.",
    })
  }

  const deleteFile = async (fileId) => {
    const fileToDelete = uploadedFiles.find((f) => f.id === fileId)
    
    try {
      // Try to delete from backend (if endpoint exists)
      try {
        await api.delete(`/uploaded-files/${fileId}`)
      } catch (deleteError) {
        // If delete endpoint doesn't exist (404), just remove from local state
        if (deleteError.response?.status === 404) {
          console.warn("Delete endpoint not available, removing from local state only")
        } else {
          throw deleteError
        }
      }
      
      // Refresh files list from backend
      await fetchUploadedFiles()

      if (fileToDelete?.isActive) {
        localStorage.removeItem("data_source")
        localStorage.removeItem("active_excel_file_id")
        setActiveDataSource(null)
      }

      toast.success("File deleted", {
        description: `${fileToDelete?.name} has been removed.`,
      })
    } catch (error) {
      console.error("Error deleting file:", error)
      toast.error("Failed to delete file", {
        description: error.response?.data?.detail || "There was an error deleting the file. Please try again.",
      })
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const connectWooCommerce = async () => {
    // Check if WooCommerce is already connected
    const isConnected = await checkWooCommerceConnection()
    
    if (isConnected) {
      // Already connected, activate it
      selectWooCommerce()
    } else {
      // Not connected, navigate to connect page
      navigate("/connect-woocommerce")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header Section */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent shadow-lg shadow-primary/25">
                <Database className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Data Source Manager
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Choose and manage your data sources for analytics
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Active Data Source Banner */}
        {activeDataSource ? (
          <Alert className="mb-6 border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 backdrop-blur shadow-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-md">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <AlertDescription className="ml-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-base ml-4">Active Data Source: </span>
                  <strong className="text-lg text-primary ml-2">
                    {activeDataSource === "excel" 
                      ? "Excel File" 
                      : "WooCommerce Store"}
                  </strong>
                  <p className="text-sm text-muted-foreground mt-1 ml-4">
                    {activeDataSource === "excel" 
                      ? "All analytics, reports, and messaging will use data from your selected Excel file."
                      : "All analytics, reports, and messaging will use data from your WooCommerce store."}
                  </p>
                </div>
                <Badge className="bg-gradient-to-r from-primary to-secondary border-0 shadow-md text-sm px-4 py-1.5">
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  Active
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 border-2 border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20 backdrop-blur">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="ml-4">
              <div>
                <span className="font-semibold text-base text-amber-900 dark:text-amber-100">
                  No Active Data Source
                </span>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  Please select a data source below to start analyzing your data. You can choose between uploading an Excel file or connecting your WooCommerce store.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Upload Excel File */}
            <Card className="border-2 border-primary/20 shadow-xl shadow-primary/5 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-primary/10 via-secondary/10 to-transparent rounded-full blur-3xl -z-0" />
              
              <CardHeader className="relative z-10 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-md">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        Step 1: Upload Excel File
                        <Badge variant="outline" className="text-xs">Optional</Badge>
                      </CardTitle>
                      <CardDescription className="text-base mt-1">
                        Upload your Excel or CSV files to analyze customer and order data
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="relative z-10 space-y-4">
                {/* Helpful Info Box */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      What files can I upload?
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      Upload Excel (.xlsx, .xls) or CSV files containing customer data, orders, or products. 
                      After uploading, you'll map your columns to our system format.
                    </p>
                  </div>
                </div>

                {/* Large Drag and Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleFileSelect}
                  className={`
                    relative border-2 border-dashed rounded-2xl p-12 transition-all cursor-pointer
                    ${isDragging 
                      ? "border-primary bg-primary/10 scale-[1.02] shadow-2xl shadow-primary/20" 
                      : "border-primary/30 hover:border-primary/50 hover:bg-primary/5"
                    }
                    ${isUploading ? "pointer-events-none opacity-60" : ""}
                  `}
                >
                  {/* Hidden file input */}
                  <input
                    id="file-upload-hidden"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />

                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20">
                        <span className="animate-spin text-4xl">⏳</span>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-foreground mb-1">
                          Uploading {selectedFileName}...
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Please wait while we process your file
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className={`
                        flex h-24 w-24 items-center justify-center rounded-2xl transition-all
                        ${isDragging 
                          ? "bg-gradient-to-br from-primary to-secondary shadow-xl scale-110" 
                          : "bg-gradient-to-br from-primary/10 to-secondary/10"
                        }
                      `}>
                        <Upload className={`h-12 w-12 ${isDragging ? "text-white" : "text-primary"} transition-all`} />
                      </div>
                      
                      <div className="text-center space-y-2">
                        <p className="text-xl font-bold text-foreground">
                          {isDragging ? "Drop your file here" : "Drag & drop your file here"}
                        </p>
                        <p className="text-base text-muted-foreground">
                          or <span className="text-primary font-semibold underline">click to browse</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2 border border-border/50">
                        <FileSpreadsheet className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>
                          <strong>Supported:</strong> .xlsx, .xls, .csv • <strong>Max:</strong> 10MB
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Drag overlay effect */}
                  {isDragging && (
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl animate-pulse" />
                  )}
                </div>

                {/* Alternative: Traditional file input (hidden but accessible) */}
                {/* <div className="flex items-center justify-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    Having trouble? Use the traditional file picker below
                  </p>
                </div> */}
                {/* <div className="flex gap-3">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="flex-1 border-2 border-primary/20 focus:border-primary h-11 text-sm"
                  />
                  <Button
                    disabled={isUploading}
                    variant="outline"
                    onClick={handleFileSelect}
                    className="h-11 px-4"
                  >
                    Browse Files
                  </Button>
                </div> */}
              </CardContent>
            </Card>

            {/* Step 2: Select Your Files */}
            <Card className="border-2 border-accent/20 shadow-xl shadow-accent/5">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-primary shadow-md">
                    <FileCheck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      Step 2: Select Your File
                      <Badge variant="outline" className="text-xs">Required for Excel</Badge>
                    </CardTitle>
                    <CardDescription className="text-base mt-1">
                      Choose which uploaded file to use as your data source
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {isLoadingFiles ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl bg-gradient-to-br from-muted/50 to-accent/5 border-2 border-dashed border-border">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 mb-4">
                      <span className="animate-spin text-3xl">⏳</span>
                    </div>
                    <p className="text-base font-semibold text-foreground mb-1">Loading your files...</p>
                    <p className="text-sm text-muted-foreground">Please wait while we fetch your uploaded files</p>
                  </div>
                ) : uploadedFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl bg-gradient-to-br from-muted/50 to-accent/5 border-2 border-dashed border-border">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 mb-4">
                      <FileSpreadsheet className="h-10 w-10 text-accent" />
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-2">No files uploaded yet</p>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">
                      Upload your first Excel or CSV file using the form above to get started with data analysis.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("file-upload")?.click()}
                      className="border-primary/30 text-primary hover:bg-primary hover:text-white"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">{uploadedFiles.length}</strong> file{uploadedFiles.length !== 1 ? "s" : ""} available
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5" />
                        Click "Use This File" to activate a file
                      </p>
                    </div>
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`group flex items-center justify-between p-5 rounded-xl border-2 transition-all hover:shadow-lg ${
                          file.isActive
                            ? "border-primary/50 bg-gradient-to-r from-primary/15 via-secondary/10 to-accent/10 shadow-lg shadow-primary/20"
                            : "border-border/50 hover:border-accent/50 bg-card/50 hover:bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div
                            className={`flex h-14 w-14 items-center justify-center rounded-xl flex-shrink-0 transition-all ${
                              file.isActive
                                ? "bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20 scale-105"
                                : "bg-gradient-to-br from-muted to-accent/10 group-hover:from-accent/20 group-hover:to-primary/20"
                            }`}
                          >
                            <FileSpreadsheet
                              className={`h-7 w-7 ${file.isActive ? "text-white" : "text-accent"}`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-bold text-base truncate">{file.name}</p>
                              {file.isActive && (
                                <Badge className="bg-gradient-to-r from-primary to-secondary border-0 shadow-md flex-shrink-0">
                                  <Check className="h-3.5 w-3.5 mr-1.5" />
                                  Currently Active
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                              {file.total_rows && (
                                <span className="px-2.5 py-1 bg-accent/10 text-accent rounded-md font-semibold flex items-center gap-1">
                                  <Database className="h-3 w-3" />
                                  {file.total_rows.toLocaleString()} rows
                                </span>
                              )}
                              {file.total_columns && (
                                <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-md font-semibold flex items-center gap-1">
                                  <Layers className="h-3 w-3" />
                                  {file.total_columns} columns
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <span>📅</span>
                                {formatDate(file.uploadedAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {!file.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => selectExcelFile(file.id)}
                              className="border-primary/30 text-primary hover:bg-primary hover:text-white transition-all h-10 px-4"
                            >
                              <Layers className="h-4 w-4 mr-2" />
                              Use This File
                            </Button>
                          )}
                          {file.isActive && (
                            <Badge className="bg-green-500 text-white border-0 px-3 py-1.5">
                              <Check className="h-3.5 w-3.5 mr-1.5" />
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* WooCommerce Connection */}
            <Card className="border-2 border-secondary/20 shadow-xl shadow-secondary/5 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-56 h-56 bg-gradient-to-br from-secondary/20 to-transparent rounded-full blur-3xl -z-0" />

              <CardHeader className="relative z-10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-accent shadow-md">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">WooCommerce Store</CardTitle>
                    <CardDescription className="text-sm">
                      Connect your online store
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 relative z-10">
                {wooCommerceConnected ? (
                  <>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500 shadow-md">
                        <Check className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-green-700 dark:text-green-300 block">Connected & Ready</span>
                        <span className="text-xs text-green-600 dark:text-green-400">Your store is connected</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground font-medium">
                        Activate WooCommerce as your data source:
                      </p>
                      <Button
                        className={`w-full transition-all h-12 ${
                          activeDataSource === "woocommerce"
                            ? "bg-gradient-to-r from-secondary via-accent to-primary hover:shadow-lg hover:shadow-secondary/25"
                            : "border-2 border-secondary/30 text-secondary hover:bg-secondary/10"
                        }`}
                        variant={activeDataSource === "woocommerce" ? "default" : "outline"}
                        onClick={selectWooCommerce}
                      >
                        {activeDataSource === "woocommerce" ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Currently Active
                          </>
                        ) : (
                          <>
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Activate WooCommerce
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Alert className="border-2 border-secondary/20 bg-secondary/5">
                      <AlertCircle className="h-4 w-4 text-secondary" />
                      <AlertDescription className="text-xs">
                        <strong className="text-foreground">Not Connected</strong>
                        <p className="mt-1">
                          Connect your WooCommerce store to analyze sales, products, and customer data in real-time.
                        </p>
                      </AlertDescription>
                    </Alert>

                    {/* <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Benefits:</strong>
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                        <li>Real-time data synchronization</li>
                        <li>Automatic order tracking</li>
                        <li>Customer analytics</li>
                        <li>Product performance insights</li>
                      </ul>
                    </div> */}

                    <Button
                      className="w-full bg-gradient-to-r from-secondary to-accent hover:shadow-lg hover:shadow-secondary/25 transition-all h-12"
                      onClick={connectWooCommerce}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Connect WooCommerce Store
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-2 border-primary/20 shadow-xl shadow-primary/5 overflow-hidden relative">
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-tl from-primary/20 to-transparent rounded-full blur-3xl -z-0" />

              <CardHeader className="relative z-10 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Quick Overview
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/5 border border-primary/20">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground block">Total Files</span>
                    <span className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {uploadedFiles.length}
                    </span>
                  </div>
                  <FileSpreadsheet className="h-8 w-8 text-primary/40" />
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-accent/10 to-primary/5 border border-accent/20">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground block">Active Source</span>
                    <Badge
                      variant={activeDataSource ? "default" : "secondary"}
                      className={
                        activeDataSource
                          ? "bg-gradient-to-r from-primary to-secondary border-0 shadow-md text-sm px-3 py-1.5 mt-2"
                          : "text-sm px-3 py-1.5 mt-2"
                      }
                    >
                      {activeDataSource
                        ? activeDataSource === "excel"
                          ? "Excel File"
                          : "WooCommerce"
                        : "Not Set"}
                    </Badge>
                  </div>
                  <Activity className={`h-8 w-8 ${activeDataSource ? "text-accent" : "text-muted-foreground/40"}`} />
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-secondary/10 to-accent/5 border border-secondary/20">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground block">Integrations</span>
                    <span className="text-3xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                      {wooCommerceConnected ? 1 : 0}
                    </span>
                  </div>
                  <ShoppingCart className={`h-8 w-8 ${wooCommerceConnected ? "text-secondary" : "text-muted-foreground/40"}`} />
                </div>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium">How to get started:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-blue-800 dark:text-blue-200 ml-2">
                  <li>Upload an Excel file OR connect WooCommerce</li>
                  <li>Select which data source to use</li>
                  <li>Start analyzing your data in Analytics pages</li>
                </ol>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                  <strong>Tip:</strong> You can switch between data sources anytime. Only one can be active at a time.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
