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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Settings,
  Eye,
  EyeOff,
  Store,
  Key,
  Lock,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import api from "../../api_config"
import { useTranslation } from "react-i18next"

export default function UserDashboard() {
  const { t } = useTranslation("userDashboard");
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [wooCommerceConnected, setWooCommerceConnected] = useState(false)
  const [activeDataSource, setActiveDataSource] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState(null)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [updateStoreUrl, setUpdateStoreUrl] = useState("")
  const [updateConsumerKey, setUpdateConsumerKey] = useState("")
  const [updateConsumerSecret, setUpdateConsumerSecret] = useState("")
  const [showUpdateSecret, setShowUpdateSecret] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentStoreUrl, setCurrentStoreUrl] = useState("")

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
      toast.error(t("toasts.failedToLoadFiles"), {
        description: t("toasts.failedToLoadFilesDesc"),
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
      setCurrentStoreUrl(response.data.store_url || "")
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

  // Handle opening update dialog
  const handleOpenUpdateDialog = () => {
    setUpdateStoreUrl(currentStoreUrl || "")
    setUpdateConsumerKey("")
    setUpdateConsumerSecret("")
    setShowUpdateSecret(false)
    setIsUpdateDialogOpen(true)
  }

  // Handle updating WooCommerce credentials
  const handleUpdateCredentials = async (e) => {
    e.preventDefault()
    setIsUpdating(true)

    try {
      const response = await api.post("/woocommerce-credentials", {
        store_url: updateStoreUrl.trim(),
        consumer_key: updateConsumerKey.trim(),
        consumer_secret: updateConsumerSecret.trim(),
      })

      if (response.data && response.data.message) {
        toast.success(t("toasts.credentialsUpdated") || "Credentials updated successfully", {
          description: t("toasts.credentialsUpdatedDesc") || "Your WooCommerce credentials have been updated and sync has started.",
        })
        setIsUpdateDialogOpen(false)
        // Refresh connection status
        await checkWooCommerceConnection()
      } else {
        toast.error("Failed to update credentials. Please try again.")
      }
    } catch (error) {
      console.error("Error updating WooCommerce credentials:", error)
      let errorMessage = "Failed to update credentials. Please check your input."
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.response?.status === 401) {
        errorMessage = "You are not authenticated. Please log in and try again."
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.detail || "Invalid credentials. Please check your input."
      }
      
      toast.error(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  const isValidUrl = (url) => {
    try {
      new URL(url)
      return true
    } catch {
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
      toast.error(t("toasts.invalidFileType"), {
        description: t("toasts.invalidFileTypeDesc"),
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
        toast.success(t("toasts.fileUploadedSuccess"), {
          description: `${file.name} ${t("toasts.fileUploadedSuccessDesc")}`,
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
      toast.error(t("toasts.uploadFailed"), {
        description: error.response?.data?.detail || t("toasts.uploadFailedDesc"),
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
    toast.success(t("toasts.dataSourceActivated"), {
      description: t("toasts.dataSourceActivatedExcelDesc").replace("{fileName}", selectedFile?.name || ""),
    })
  }

  const selectWooCommerce = async () => {
    // Verify connection status before activating
    const isConnected = await checkWooCommerceConnection()
    
    if (!isConnected) {
      toast.error(t("toasts.woocommerceNotConnected"), {
        description: t("toasts.woocommerceNotConnectedDesc"),
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

    toast.success(t("toasts.dataSourceActivated"), {
      description: t("toasts.dataSourceActivatedWooCommerceDesc"),
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

      toast.success(t("toasts.fileDeleted"), {
        description: `${fileToDelete?.name} ${t("toasts.fileDeletedDesc")}`,
      })
    } catch (error) {
      console.error("Error deleting file:", error)
      toast.error(t("toasts.failedToDeleteFile"), {
        description: error.response?.data?.detail || t("toasts.failedToDeleteFileDesc"),
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
                  {t("title")}
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("subtitle")}
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
                  <span className="font-semibold text-base ml-4">{t("activeDataSource.label")} </span>
                  <strong className="text-lg text-primary ml-2">
                    {activeDataSource === "excel" 
                      ? t("activeDataSource.excelFile")
                      : t("activeDataSource.woocommerceStore")}
                  </strong>
                  <p className="text-sm text-muted-foreground mt-1 ml-4">
                    {activeDataSource === "excel" 
                      ? t("activeDataSource.excelDescription")
                      : t("activeDataSource.woocommerceDescription")}
                  </p>
                </div>
                <Badge className="bg-gradient-to-r from-primary to-secondary border-0 shadow-md text-sm px-4 py-1.5">
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  {t("activeDataSource.badge")}
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
                  {t("noActiveDataSource.title")}
                </span>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  {t("noActiveDataSource.description")}
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
                        {t("step1.title")}
                        <Badge variant="outline" className="text-xs">{t("step1.optional")}</Badge>
                      </CardTitle>
                      <CardDescription className="text-base mt-1">
                        {t("step1.description")}
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
                      {t("step1.whatFilesCanUpload")}
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      {t("step1.whatFilesInfo")}
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
                          {t("step1.uploading")} {selectedFileName}...
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("step1.pleaseWait")}
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
                          {isDragging ? t("step1.dropHere") : t("step1.dragDrop")}
                        </p>
                        <p className="text-base text-muted-foreground">
                          {t("step1.orClick")} <span className="text-primary font-semibold underline">{t("step1.clickToBrowse")}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2 border border-border/50">
                        <FileSpreadsheet className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>
                          <strong>{t("step1.supported")}</strong> .xlsx, .xls, .csv • <strong>{t("step1.max")}</strong> 10MB
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
                      {t("step2.title")}
                      <Badge variant="outline" className="text-xs">{t("step2.required")}</Badge>
                    </CardTitle>
                    <CardDescription className="text-base mt-1">
                      {t("step2.description")}
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
                    <p className="text-base font-semibold text-foreground mb-1">{t("step2.loadingFiles")}</p>
                    <p className="text-sm text-muted-foreground">{t("step2.loadingDescription")}</p>
                  </div>
                ) : uploadedFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl bg-gradient-to-br from-muted/50 to-accent/5 border-2 border-dashed border-border">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 mb-4">
                      <FileSpreadsheet className="h-10 w-10 text-accent" />
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-2">{t("step2.noFiles")}</p>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">
                      {t("step2.noFilesDescription")}
                    </p>
                    {/* <Button
                      variant="outline"
                      onClick={() => document.getElementById("file-upload")?.click()}
                      className="border-primary/30 text-primary hover:bg-primary hover:text-white"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {t("step2.uploadFirstFile")}
                    </Button> */}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">{uploadedFiles.length}</strong> {uploadedFiles.length !== 1 ? t("step2.filesAvailablePlural") : t("step2.filesAvailable")} {t("step2.available")}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5" />
                        {t("step2.clickToActivate")}
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
                                  {t("step2.currentlyActive")}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                              {file.total_rows && (
                                <span className="px-2.5 py-1 bg-accent/10 text-accent rounded-md font-semibold flex items-center gap-1">
                                  <Database className="h-3 w-3" />
                                  {file.total_rows.toLocaleString()} {t("step2.rows")}
                                </span>
                              )}
                              {file.total_columns && (
                                <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-md font-semibold flex items-center gap-1">
                                  <Layers className="h-3 w-3" />
                                  {file.total_columns} {t("step2.columns")}
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
                              {t("step2.useThisFile")}
                            </Button>
                          )}
                          {file.isActive && (
                            <Badge className="bg-green-500 text-white border-0 px-3 py-1.5">
                              <Check className="h-3.5 w-3.5 mr-1.5" />
                              {t("step2.active")}
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
                    <CardTitle className="text-xl">{t("woocommerce.title")}</CardTitle>
                    <CardDescription className="text-sm">
                      {t("woocommerce.description")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 relative z-10">
                {wooCommerceConnected ? (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500 shadow-md">
                          <Check className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-green-700 dark:text-green-300 block">{t("woocommerce.connectedReady")}</span>
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {currentStoreUrl ? `Store: ${currentStoreUrl}` : t("woocommerce.yourStoreConnected")}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenUpdateDialog}
                        className="border-secondary/30 text-secondary hover:bg-secondary/10"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Update
                      </Button>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground font-medium">
                        {t("woocommerce.activateWooCommerce")}
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
                            {t("woocommerce.currentlyActive")}
                          </>
                        ) : (
                          <>
                            <TrendingUp className="h-4 w-4 mr-2" />
                            {t("woocommerce.activateButton")}
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
                        <strong className="text-foreground">{t("woocommerce.notConnected")}</strong>
                        <p className="mt-1">
                          {t("woocommerce.notConnectedDescription")}
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
                      {t("woocommerce.connectButton")}
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
                  {t("quickOverview.title")}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/5 border border-primary/20">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground block">{t("quickOverview.totalFiles")}</span>
                    <span className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {uploadedFiles.length}
                    </span>
                  </div>
                  <FileSpreadsheet className="h-8 w-8 text-primary/40" />
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-accent/10 to-primary/5 border border-accent/20">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground block">{t("quickOverview.activeSource")}</span>
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
                          ? t("activeDataSource.excelFile")
                          : t("woocommerce.title")
                        : t("quickOverview.notSet")}
                    </Badge>
                  </div>
                  <Activity className={`h-8 w-8 ${activeDataSource ? "text-accent" : "text-muted-foreground/40"}`} />
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-secondary/10 to-accent/5 border border-secondary/20">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground block">{t("quickOverview.integrations")}</span>
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
                  {t("help.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium">{t("help.howToGetStarted")}</p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-blue-800 dark:text-blue-200 ml-2">
                  <li>{t("help.step1")}</li>
                  <li>{t("help.step2")}</li>
                  <li>{t("help.step3")}</li>
                </ol>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                  <strong>{t("help.tip")}</strong> {t("help.tipDescription")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Update WooCommerce Credentials Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <div className="p-2 rounded-lg bg-gradient-to-br from-secondary to-accent">
                <Settings className="h-5 w-5 text-white" />
              </div>
              Update WooCommerce Credentials
            </DialogTitle>
            <DialogDescription>
              Update your store credentials to sync your products and orders. Your credentials are encrypted and stored securely.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateCredentials}>
            <div className="space-y-4 py-4">
              {/* Store URL Field */}
              <div className="space-y-2">
                <Label htmlFor="update-store-url" className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Store URL
                </Label>
                <Input
                  id="update-store-url"
                  type="url"
                  placeholder="https://yourstore.com"
                  value={updateStoreUrl}
                  onChange={(e) => setUpdateStoreUrl(e.target.value)}
                  className="h-11"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Your WooCommerce store's full URL (including https://)
                </p>
              </div>

              {/* Consumer Key Field */}
              <div className="space-y-2">
                <Label htmlFor="update-consumer-key" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Consumer Key
                </Label>
                <Input
                  id="update-consumer-key"
                  type="text"
                  placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={updateConsumerKey}
                  onChange={(e) => setUpdateConsumerKey(e.target.value)}
                  className="h-11 font-mono text-sm"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Starts with <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">ck_</code>
                </p>
              </div>

              {/* Consumer Secret Field */}
              <div className="space-y-2">
                <Label htmlFor="update-consumer-secret" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Consumer Secret
                </Label>
                <div className="relative">
                  <Input
                    id="update-consumer-secret"
                    type={showUpdateSecret ? "text" : "password"}
                    placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={updateConsumerSecret}
                    onChange={(e) => setUpdateConsumerSecret(e.target.value)}
                    className="h-11 font-mono text-sm pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowUpdateSecret(!showUpdateSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showUpdateSecret ? "Hide secret" : "Show secret"}
                  >
                    {showUpdateSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Starts with <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">cs_</code>
                </p>
              </div>

              {/* Help Section */}
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong className="block mb-1">Need help finding your credentials?</strong>
                  Go to <strong>WooCommerce → Settings → Advanced → REST API</strong> to generate new keys.
                  <a
                    href="https://woocommerce.com/document/woocommerce-rest-api/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline ml-1"
                  >
                    View Documentation
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUpdateDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating || !updateStoreUrl || !updateConsumerKey || !updateConsumerSecret || !isValidUrl(updateStoreUrl)}
                className="bg-gradient-to-r from-secondary to-accent"
              >
                {isUpdating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Update Credentials
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
