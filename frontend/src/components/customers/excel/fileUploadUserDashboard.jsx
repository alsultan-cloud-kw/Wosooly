import { useCallback, useState } from "react"
import { Upload, FileSpreadsheet } from "lucide-react"
import { cn } from "@/lib/utils"

export function FileUploadDropzone({
  onFileSelect,
  disabled = false,
  accept = ".xlsx,.xls,.csv",
  maxSize = 10 * 1024 * 1024, // 10MB default
}) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrag = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return

      if (e.type === "dragenter" || e.type === "dragover") {
        setIsDragging(true)
      } else if (e.type === "dragleave") {
        setIsDragging(false)
      }
    },
    [disabled]
  )

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        const file = files[0]
        if (file.size <= maxSize) {
          onFileSelect(file)
        }
      }
    },
    [disabled, maxSize, onFileSelect]
  )

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg transition-colors",
        isDragging && !disabled && "border-primary bg-primary/5",
        !isDragging && "border-border hover:border-muted-foreground/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
        {isDragging ? (
          <>
            <Upload className="w-12 h-12 mb-4 text-primary animate-bounce" />
            <p className="mb-2 text-sm font-medium text-foreground">
              Drop your file here
            </p>
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-12 h-12 mb-4 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              Excel or CSV files (up to {(maxSize / (1024 * 1024)).toFixed(0)}MB)
            </p>
          </>
        )}
      </div>
    </div>
  )
}
