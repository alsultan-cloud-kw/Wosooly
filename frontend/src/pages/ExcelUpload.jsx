import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  FileCheck2,
  ArrowUpCircle,
} from "lucide-react"
import api from "../../api_config"
import { useNavigate } from "react-router-dom"

export default function ExcelUpload() {
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState("idle")
  const [isDragging, setIsDragging] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [uploadedFileId, setUploadedFileId] = useState(null)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  const handleFileSelect = (selectedFile) => {
    const isExcel =
      selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      selectedFile.type === "application/vnd.ms-excel" ||
      selectedFile.name.endsWith(".xlsx") ||
      selectedFile.name.endsWith(".xls")

    if (!isExcel) {
      setUploadStatus("error")
      return
    }

    setFile(selectedFile)
    setUploadStatus("idle")
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadStatus("uploading")
    setUploadProgress(0)
    setErrorMessage("")

    // Create FormData for file upload
    const formData = new FormData()
    formData.append("file", file)

    try {
      // Upload file with progress tracking
      const response = await api.post("/excel-upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            setUploadProgress(percentCompleted)
          }
        },
      })

      if (response.data && response.data.file_id) {
        setUploadedFileId(response.data.file_id)
        // Automatically navigate to column mapping with the uploaded file ID
        setTimeout(() => {
          navigate(`/column-mapping/${response.data.file_id}`)
        }, 1500) // Wait 1.5 seconds to show success message
        setUploadStatus("success")
        setUploadProgress(100)
        
        // Optionally navigate to column mapping page after successful upload
        // navigate(`/column-mapping/${response.data.file_id}`)
      } else {
        setUploadStatus("error")
        setErrorMessage("Upload failed. Please try again.")
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      setUploadStatus("error")
      
      if (error.response?.data?.detail) {
        setErrorMessage(error.response.data.detail)
      } else if (error.response?.status === 401) {
        setErrorMessage("You are not authenticated. Please log in and try again.")
      } else if (error.response?.status === 400) {
        setErrorMessage(error.response.data?.detail || "Invalid file. Please upload a valid Excel file.")
      } else if (error.message === "Network Error") {
        setErrorMessage("Network error. Please check your connection and try again.")
      } else {
        setErrorMessage("Failed to upload file. Please try again.")
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setUploadStatus("idle")
    setUploadProgress(0)
    setIsUploading(false)
    setErrorMessage("")
    setUploadedFileId(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-chart-2/5 via-chart-4/5 to-chart-1/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-2 shadow-2xl bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-4 bg-gradient-to-r from-chart-2/10 via-chart-4/10 to-chart-1/10 border-b-2 border-chart-4/20">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-chart-2 to-chart-4 shadow-lg animate-pulse-subtle">
              <FileSpreadsheet className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-3xl font-bold text-balance bg-gradient-to-r from-chart-2 to-chart-4 bg-clip-text text-transparent">
                Upload Excel File
              </CardTitle>
              <CardDescription className="text-base mt-2 leading-relaxed">
                Upload your Excel spreadsheet to import data into the system
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-8">
          {uploadStatus === "success" && (
            <Alert className="border-2 border-chart-2 bg-gradient-to-r from-chart-2/20 to-chart-4/20 shadow-md animate-in fade-in slide-in-from-top-4 duration-500">
              <CheckCircle2 className="h-5 w-5 text-chart-2" />
              <AlertDescription className="text-chart-2 font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 animate-pulse" />
                Upload completed successfully! Your data is ready to process.
              </AlertDescription>
            </Alert>
          )}

          {uploadStatus === "error" && (
            <Alert className="border-2 border-destructive bg-gradient-to-r from-destructive/20 to-destructive/10 shadow-md animate-in fade-in slide-in-from-top-4 duration-500">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <AlertDescription className="text-destructive font-semibold">
                {errorMessage || "Please upload a valid Excel file (.xlsx or .xls)"}
              </AlertDescription>
            </Alert>
          )}

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300
              ${
                isDragging
                  ? "border-chart-2 bg-gradient-to-br from-chart-2/20 to-chart-4/20 scale-[1.02]"
                  : "border-muted-foreground/30 hover:border-chart-2/50 hover:bg-gradient-to-br hover:from-chart-2/5 hover:to-chart-4/5"
              }
              ${file && uploadStatus !== "uploading" ? "bg-gradient-to-br from-chart-4/10 to-chart-2/10" : ""}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0]
                if (selectedFile) handleFileSelect(selectedFile)
              }}
              className="hidden"
            />

            {!file && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-chart-2 to-chart-4 shadow-xl">
                  <Upload className="h-12 w-12 text-white" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold bg-gradient-to-r from-chart-2 to-chart-4 bg-clip-text text-transparent">
                    Drop your Excel file here
                  </p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 bg-gradient-to-r from-chart-2 via-chart-4 to-chart-2 hover:shadow-xl hover:scale-105 transition-all shadow-lg text-white font-bold"
                >
                  <ArrowUpCircle className="h-5 w-5 mr-2" />
                  Select File
                </Button>
                <p className="text-xs text-muted-foreground mt-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-chart-2"></span>
                  Supported formats: .xlsx, .xls
                </p>
              </div>
            )}

            {file && uploadStatus !== "uploading" && uploadStatus !== "success" && (
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="p-4 rounded-xl bg-gradient-to-br from-chart-4 to-chart-1 shadow-lg">
                  <FileSpreadsheet className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate text-lg">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  className="shrink-0 hover:bg-destructive/20 hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}

            {uploadStatus === "uploading" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-chart-2 to-chart-4 shadow-lg">
                    <FileSpreadsheet className="h-8 w-8 text-white animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate text-lg">{file?.name}</p>
                    <p className="text-sm text-chart-2 font-semibold animate-pulse">Uploading...</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-chart-2">Progress</span>
                    <span className="font-bold text-chart-4">{uploadProgress}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-chart-2 via-chart-4 to-chart-1 rounded-full transition-all duration-300 ease-out animate-pulse shadow-lg"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <div className="w-2 h-2 rounded-full bg-chart-2 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-chart-4 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-chart-1 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {uploadStatus === "success" && (
              <div className="flex flex-col items-center gap-4 text-center animate-in zoom-in duration-700">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-chart-2 to-chart-4 shadow-xl animate-bounce-subtle">
                  <FileCheck2 className="h-12 w-12 text-white" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold bg-gradient-to-r from-chart-2 to-chart-4 bg-clip-text text-transparent">
                    Upload Complete!
                  </p>
                  <p className="text-sm text-muted-foreground">{file?.name}</p>
                  <p className="text-xs text-chart-2 font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {formatFileSize(file?.size || 0)} uploaded successfully
                  </p>
                </div>
              </div>
            )}
          </div>

          {file && uploadStatus !== "uploading" && uploadStatus !== "success" && (
            <div className="flex gap-3 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Button
                onClick={handleUpload}
                className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-chart-2 via-chart-4 to-chart-1 hover:shadow-xl hover:scale-[1.02] transition-all shadow-lg text-white"
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload File
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                className="h-12 px-6 border-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-all bg-transparent"
              >
                Cancel
              </Button>
            </div>
          )}

          {uploadStatus === "success" && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Button
                onClick={() => navigate(`/column-mapping`)}
                className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-chart-2 via-chart-4 to-chart-1 hover:shadow-xl hover:scale-[1.02] transition-all shadow-lg text-white"
              >
                Proceed to Column Mapping
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="h-12 px-6 border-2 border-chart-2 text-chart-2 hover:bg-chart-2/10 transition-all bg-transparent"
              >
                Upload Another File
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
