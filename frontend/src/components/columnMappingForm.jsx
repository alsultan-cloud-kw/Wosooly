import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import { Plus, Trash2, Sparkles, Loader2, Wand2, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import api from "../../api_config"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

export function ColumnMappingForm({ fileId, fileInfo, isTemplateMode = false, selectedAnalyses = [], onMappingSubmit }) {
  
  const [rows, setRows] = useState([{ id: 1, columnName: "", analysisField: "", suggestedBy: "manual" }])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [allModelFields, setAllModelFields] = useState([])
  const [availableColumns, setAvailableColumns] = useState([])
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [showAISuggestions, setShowAISuggestions] = useState(true)
  const aiSuggestionsLoadedRef = useRef(false) // Prevent multiple loads
  const toastShownRef = useRef(false) // Prevent multiple toast messages

  const navigate = useNavigate()
  // Fetch model fields and file columns on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetching(true)
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log("ColumnMappingForm - fileId:", fileId, "isTemplateMode:", isTemplateMode)
        }
        
        // Always fetch model fields
        const fieldsResponse = await api.get("/model-fields")
        const fields = fieldsResponse.data
        
        // Combine all fields from all types into one flat list
        const allFields = [
          ...fields.customer.map(f => ({
            key: f.field_name,
            label: f.field_name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
            description: f.description,
            required: f.required,
            type: f.field_type,
            category: "Customer"
          })),
          ...fields.order.map(f => ({
            key: f.field_name,
            label: f.field_name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
            description: f.description,
            required: f.required,
            type: f.field_type,
            category: "Order"
          })),
          ...fields.product.map(f => ({
            key: f.field_name,
            label: f.field_name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
            description: f.description,
            required: f.required,
            type: f.field_type,
            category: "Product"
          }))
        ]
        
        setAllModelFields(allFields)
        
        // If we have file info, set available columns from file
        let columnNames = []
        if (fileInfo && fileInfo.columns) {
          columnNames = fileInfo.columns.map(col => col.name)
          setAvailableColumns(columnNames)
        }
        
        // Fetch existing mappings
        try {
          let mappingsResponse
          if (isTemplateMode || !fileId) {
            // Fetch default/template mappings
            mappingsResponse = await api.get("/column-mapping/default")
          } else {
            // Fetch file-specific mappings
            mappingsResponse = await api.get(`/column-mapping/${fileId}`)
          }
          
          if (mappingsResponse.data && mappingsResponse.data.length > 0) {
            // Flatten all mappings from all analysis types into one list
            const allMappedRows = []
            mappingsResponse.data.forEach(mapping => {
              Object.entries(mapping.mapping).forEach(([modelField, excelColumn]) => {
                allMappedRows.push({
                  id: allMappedRows.length + 1,
                  columnName: excelColumn,
                  analysisField: modelField,
                  suggestedBy: "manual"
                })
              })
            })
            if (allMappedRows.length > 0) {
              // Sort rows by column order if columnNames exists
              if (columnNames.length > 0) {
                allMappedRows.sort((a, b) => {
                  const indexA = columnNames.indexOf(a.columnName)
                  const indexB = columnNames.indexOf(b.columnName)
                  // If column not found in order, put it at the end
                  if (indexA === -1 && indexB === -1) return 0
                  if (indexA === -1) return 1
                  if (indexB === -1) return -1
                  return indexA - indexB
                })
              }
              setRows(allMappedRows)
            } else if (fileInfo && fileInfo.columns && fileInfo.columns.length > 0 && !isTemplateMode) {
              // No existing mappings but we have file columns - initialize with first few columns
              const initialRows = fileInfo.columns.slice(0, 5).map((col, idx) => ({
                id: idx + 1,
                columnName: col.name,
                analysisField: "",
                suggestedBy: "manual"
              }))
              setRows(initialRows)
            }
          } else if (fileId && !isTemplateMode && !aiSuggestionsLoadedRef.current) {
            // No existing mappings - try AI auto-mapping (only if not already loaded)
            if (process.env.NODE_ENV === 'development') {
              console.log("No existing mappings found, triggering AI auto-mapping for fileId:", fileId)
            }
            // Only call if fileId is a valid number
            if (typeof fileId === 'number' && fileId > 0) {
              loadAISuggestions(fileId)
            }
          }
        } catch (mappingErr) {
          // No existing mappings, that's okay - this is expected for new files
          // Only trigger AI if we have a valid fileId and haven't loaded yet
          if (fileId && !isTemplateMode && typeof fileId === 'number' && fileId > 0 && !aiSuggestionsLoadedRef.current) {
            if (process.env.NODE_ENV === 'development') {
              console.log("Triggering AI auto-mapping for fileId:", fileId)
            }
            loadAISuggestions(fileId)
          }
        }
        
      } catch (err) {
        console.error("Error fetching data:", err)
        toast.error("Error", {
          description: "Failed to load mapping data. Please refresh the page.",
        })
        setError("Failed to load data")
      } finally {
        setFetching(false)
      }
    }

    fetchData()
  }, [fileId, fileInfo, isTemplateMode])
  
  // Reset AI suggestions loaded flag when fileId changes
  useEffect(() => {
    aiSuggestionsLoadedRef.current = false
    toastShownRef.current = false
    setAiSuggestions(null) // Clear suggestions when fileId changes
  }, [fileId])

  const loadAISuggestions = async (fileId) => {
    // Validate fileId before proceeding
    if (!fileId || isTemplateMode) {
      if (process.env.NODE_ENV === 'development') {
        console.log("Skipping AI suggestions - fileId:", fileId, "isTemplateMode:", isTemplateMode)
      }
      if (!fileId) {
        toast.warning("No File Selected", {
          description: "Please upload a file first to use AI mapping suggestions.",
        })
      }
      return
    }
    
    // Ensure fileId is a valid number
    const numericFileId = typeof fileId === 'string' ? parseInt(fileId, 10) : fileId
    if (isNaN(numericFileId) || numericFileId <= 0) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Invalid fileId for AI suggestions:", fileId)
      }
      toast.error("Invalid File ID", {
        description: "The file ID is invalid. Please upload a file first.",
      })
      return
    }
    
    // Prevent multiple simultaneous loads for the same file
    if (loadingAI || (aiSuggestionsLoadedRef.current && aiSuggestions)) {
      if (process.env.NODE_ENV === 'development') {
        console.log("AI suggestions already loaded or loading, skipping...")
      }
      return
    }
    
    try {
      setLoadingAI(true)
      if (process.env.NODE_ENV === 'development') {
        console.log("Loading AI suggestions for fileId:", numericFileId)
      }
      const response = await api.post(`/auto-map-columns/${numericFileId}`)
      if (process.env.NODE_ENV === 'development') {
        console.log("AI suggestions response:", response.data)
      }
      setAiSuggestions(response.data)
      aiSuggestionsLoadedRef.current = true
      
      // Auto-populate rows with AI suggestions (high confidence only)
      if (response.data) {
        // Use functional update to get current rows state
        setRows(prevRows => {
          const suggestedRows = []
          const existingMappings = new Set() // Track existing mappings to avoid duplicates
          let rowId = prevRows.length > 0 ? Math.max(...prevRows.map(r => r.id)) + 1 : 1
          
          // Helper function to create unique key for a mapping
          const getMappingKey = (columnName, analysisField) => `${columnName}::${analysisField}`
          
          // Check existing rows to avoid duplicates
          prevRows.forEach(row => {
            if (row.columnName && row.analysisField) {
              existingMappings.add(getMappingKey(row.columnName, row.analysisField))
            }
          })
          
          // Process all suggestions and deduplicate
          const allSuggestions = [
            ...(response.data.customer || []),
            ...(response.data.order || []),
            ...(response.data.product || [])
          ]
          
          // Deduplicate by column+field combination, keeping highest confidence
          const uniqueSuggestions = new Map()
          allSuggestions.forEach(suggestion => {
            if (suggestion.confidence >= 0.7 && suggestion.excel_column && suggestion.canonical_field) {
              const key = getMappingKey(suggestion.excel_column, suggestion.canonical_field)
              
              // Skip if already exists in current rows
              if (existingMappings.has(key)) {
                return
              }
              
              // Keep the suggestion with highest confidence if duplicate
              const existing = uniqueSuggestions.get(key)
              if (!existing || suggestion.confidence > existing.confidence) {
                uniqueSuggestions.set(key, suggestion)
              }
            }
          })
          
          // Convert to rows
          uniqueSuggestions.forEach(suggestion => {
            suggestedRows.push({
              id: rowId++,
              columnName: suggestion.excel_column,
              analysisField: suggestion.canonical_field,
              suggestedBy: "ai",
              confidence: suggestion.confidence
            })
          })
          
          // Sort suggested rows by column order if availableColumns exists
          if (availableColumns.length > 0) {
            suggestedRows.sort((a, b) => {
              const indexA = availableColumns.indexOf(a.columnName)
              const indexB = availableColumns.indexOf(b.columnName)
              if (indexA === -1 && indexB === -1) return 0
              if (indexA === -1) return 1
              if (indexB === -1) return -1
              return indexA - indexB
            })
          }
          
          if (suggestedRows.length > 0) {
            if (!toastShownRef.current) {
              toast.success("AI Suggestions Loaded", {
                description: `Found ${suggestedRows.length} unique high-confidence column mappings. Review and adjust as needed.`,
                duration: 5000,
              })
              toastShownRef.current = true
            }
            // Combine and sort all rows by column order
            const combinedRows = [...prevRows, ...suggestedRows]
            if (availableColumns.length > 0) {
              combinedRows.sort((a, b) => {
                if (!a.columnName && !b.columnName) return 0
                if (!a.columnName) return 1
                if (!b.columnName) return -1
                const indexA = availableColumns.indexOf(a.columnName)
                const indexB = availableColumns.indexOf(b.columnName)
                if (indexA === -1 && indexB === -1) return 0
                if (indexA === -1) return 1
                if (indexB === -1) return -1
                return indexA - indexB
              })
            }
            return combinedRows
          } else {
            if (!toastShownRef.current) {
              toast.info("AI Analysis Complete", {
                description: "AI analyzed your file but found no new high-confidence mappings. You can still use the suggestions below.",
                duration: 4000,
              })
              toastShownRef.current = true
            }
            return prevRows
          }
        })
      }
    } catch (err) {
      aiSuggestionsLoadedRef.current = false // Reset on error so user can retry
      console.error("Error loading AI suggestions:", err)
      const errorMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Failed to load AI suggestions"
      const statusCode = err?.response?.status
      
      if (statusCode === 422) {
        toast.error("Invalid Request", {
          description: "The file ID format is invalid. Please ensure you're accessing a valid file.",
          duration: 5000,
        })
      } else if (statusCode === 404) {
        toast.error("File Not Found", {
          description: "The file was not found. Please upload a file first.",
          duration: 5000,
        })
      } else if (statusCode === 400) {
        toast.error("Bad Request", {
          description: errorMsg,
          duration: 5000,
        })
      } else {
        toast.error("AI Mapping Error", {
          description: errorMsg,
          duration: 5000,
        })
      }
    } finally {
      setLoadingAI(false)
    }
  }
  
  // Deduplicate rows and sort by column order - use useMemo to compute unique rows for display
  const uniqueRows = useMemo(() => {
    const seen = new Map()
    const unique = []
    
    rows.forEach(row => {
      // Keep empty rows (no columnName or analysisField)
      if (!row.columnName || !row.analysisField) {
        unique.push(row)
        return
      }
      
      const key = `${row.columnName}::${row.analysisField}`
      const existing = seen.get(key)
      
      // If duplicate, keep the one with higher confidence (if AI) or first one
      if (existing) {
        // If current row is AI with higher confidence, replace
        if (row.suggestedBy === "ai" && row.confidence && 
            (!existing.confidence || row.confidence > existing.confidence)) {
          const index = unique.findIndex(r => r.id === existing.id)
          if (index !== -1) {
            unique[index] = row
            seen.set(key, row)
          }
        }
        // Otherwise, skip duplicate
      } else {
        unique.push(row)
        seen.set(key, row)
      }
    })
    
    // Sort by column order if availableColumns exists
    if (availableColumns.length > 0) {
      unique.sort((a, b) => {
        // Empty rows go to the end
        if (!a.columnName && !b.columnName) return 0
        if (!a.columnName) return 1
        if (!b.columnName) return -1
        
        const indexA = availableColumns.indexOf(a.columnName)
        const indexB = availableColumns.indexOf(b.columnName)
        // If column not found in order, put it at the end
        if (indexA === -1 && indexB === -1) return 0
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
      })
    }
    
    return unique
  }, [rows, availableColumns])
  
  // Clean up duplicates in rows state when detected
  useEffect(() => {
    if (uniqueRows.length < rows.length) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Removing ${rows.length - uniqueRows.length} duplicate row(s)`)
      }
      // Update state with deduplicated rows
      setRows(uniqueRows)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]) // Only check when row count changes

  const handleAcceptAllAI = () => {
    if (!aiSuggestions) return
    
    const allSuggestedRows = []
    const existingMappings = new Set()
    // Use uniqueRows to get accurate count and avoid duplicates
    let rowId = uniqueRows.length > 0 ? Math.max(...uniqueRows.map(r => r.id)) + 1 : 1
    
    // Helper function to create unique key for a mapping
    const getMappingKey = (columnName, analysisField) => `${columnName}::${analysisField}`
    
    // Track existing rows from uniqueRows (deduplicated)
    uniqueRows.forEach(row => {
      if (row.columnName && row.analysisField) {
        existingMappings.add(getMappingKey(row.columnName, row.analysisField))
      }
    })
    
    // Combine all AI suggestions
    const allSuggestions = [
      ...(aiSuggestions.customer || []),
      ...(aiSuggestions.order || []),
      ...(aiSuggestions.product || [])
    ]
    
    // Deduplicate by column+field combination, keeping highest confidence
    const uniqueSuggestions = new Map()
    allSuggestions.forEach(suggestion => {
      if (suggestion.excel_column && suggestion.canonical_field) {
        const key = getMappingKey(suggestion.excel_column, suggestion.canonical_field)
        
        // Skip if already exists
        if (existingMappings.has(key)) {
          return
        }
        
        // Keep the suggestion with highest confidence if duplicate
        const existing = uniqueSuggestions.get(key)
        if (!existing || suggestion.confidence > existing.confidence) {
          uniqueSuggestions.set(key, suggestion)
        }
      }
    })
    
    // Convert to rows
    uniqueSuggestions.forEach(suggestion => {
      allSuggestedRows.push({
        id: rowId++,
        columnName: suggestion.excel_column,
        analysisField: suggestion.canonical_field,
        suggestedBy: "ai",
        confidence: suggestion.confidence
      })
    })
    
    if (allSuggestedRows.length > 0) {
      setRows(prevRows => {
        // Deduplicate against existing rows
        const existingKeys = new Set()
        prevRows.forEach(row => {
          if (row.columnName && row.analysisField) {
            existingKeys.add(`${row.columnName}::${row.analysisField}`)
          }
        })
        
        const newUniqueRows = allSuggestedRows.filter(newRow => {
          if (!newRow.columnName || !newRow.analysisField) return true
          const key = `${newRow.columnName}::${newRow.analysisField}`
          return !existingKeys.has(key)
        })
        
        if (newUniqueRows.length === 0) {
          toast.info("No New Suggestions", {
            description: "All AI suggestions are already in your mapping list.",
          })
          return prevRows
        }
        
        return [...prevRows, ...newUniqueRows]
      })
      toast.success("AI Suggestions Applied", {
        description: `Added ${allSuggestedRows.length} unique AI-suggested mappings.`,
      })
    } else {
      toast.info("No New Suggestions", {
        description: "All AI suggestions are already in your mapping list.",
      })
    }
  }

  const handleAddRow = () => {
    setRows([...rows, { id: Date.now(), columnName: "", analysisField: "", suggestedBy: "manual" }])
  }

  const handleRemoveRow = (id) => {
    setRows(prevRows => prevRows.filter((r) => r.id !== id))
  }

  const handleChange = (id, field, value) => {
    setRows(prevRows => prevRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // Build a single mapping object from unique rows (deduplicated)
      const mapping = {}
      uniqueRows.forEach((r) => {
        if (r.analysisField && r.columnName) {
          // If duplicate field, keep the first one (or you could prefer AI suggestions)
          if (!mapping[r.analysisField]) {
            mapping[r.analysisField] = r.columnName
          }
        }
      })

      if (Object.keys(mapping).length === 0) {
        setError("Please map at least one column to a model field before submitting.")
        toast.error("Validation Error", {
          description: "Please map at least one column to a model field.",
        })
        setLoading(false)
        return
      }

      // Determine analysis type based on the fields being mapped
      // Check which category has the most mapped fields
      const fieldCategories = {}
      uniqueRows.forEach((r) => {
        if (r.analysisField) {
          const field = allModelFields.find(f => f.key === r.analysisField)
          if (field) {
            const category = field.category.toLowerCase()
            fieldCategories[category] = (fieldCategories[category] || 0) + 1
          }
        }
      })

      // Get the most common category, default to "order" if none
      const analysisType = Object.keys(fieldCategories).length > 0
        ? Object.entries(fieldCategories).sort((a, b) => b[1] - a[1])[0][0]
        : "order"

      // Save the mapping (file_id is optional - send null if not provided or in template mode)
      const payload = {
        file_id: (fileId && !isTemplateMode) ? fileId : null,
        analysis_type: analysisType,
        mapping: mapping
      }

      await api.post("/column-mapping", payload)

      toast.success("Mapping Saved!", {
        description: "Your column mappings have been saved successfully.",
        duration: 3000,
      })
      
      setSuccess("Mapping submitted successfully!")
      navigate("/user-dashboard")
      onMappingSubmit && onMappingSubmit({ [analysisType]: mapping })
    } catch (err) {
      console.error(err)
      const errorMsg = err.response?.data?.detail || "Failed to submit mapping. Please try again."
      setError(errorMsg)
      toast.error("Error", {
        description: errorMsg,
      })
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading mapping data...</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-hover to-chart-4 p-8 text-primary-foreground shadow-lg">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Column Mapping Setup</h1>
            <p className="mt-1 text-primary-foreground/90 text-balance">
              Map your Excel columns to database model fields
            </p>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent" />
      </div>

      {/* <div className="grid gap-4 md:grid-cols-3">
        {["order", "customer", "product"].map((type) => {
          const meta = analysisMetadata[type]
          const Icon = meta.icon
          return (
            <Card key={type} className={`border-2 ${meta.borderClass} ${meta.bgClass} transition-all hover:shadow-md`}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.bgClass} ${meta.textClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground capitalize">{type} Analysis</p>
                  <p className="text-xs text-muted-foreground">{analysisFields[type].length} fields available</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div> */}

      {/* AI Suggestions Banner - Always show when fileId exists */}
      {fileId && !isTemplateMode && (
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                  {loadingAI ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <Wand2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AI-Powered Column Mapping</h3>
                  <p className="text-sm text-muted-foreground">
                    {loadingAI 
                      ? "Analyzing your file and generating suggestions..."
                      : aiSuggestions 
                        ? `AI found ${(aiSuggestions.customer?.length || 0) + (aiSuggestions.order?.length || 0) + (aiSuggestions.product?.length || 0)} suggested mappings. Review and accept the ones you want.`
                        : "Click the button to get AI-powered column mapping suggestions automatically"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!aiSuggestions && !loadingAI && (
                  <Button
                    type="button"
                    onClick={() => {
                      const numericFileId = typeof fileId === 'string' ? parseInt(fileId, 10) : fileId
                      if (process.env.NODE_ENV === 'development') {
                        console.log("Manual AI trigger - fileId:", fileId, "numeric:", numericFileId)
                      }
                      if (numericFileId && !isNaN(numericFileId) && numericFileId > 0) {
                        loadAISuggestions(numericFileId)
                      } else {
                        toast.error("Invalid File ID", {
                          description: "Please ensure you have a valid file selected.",
                        })
                      }
                    }}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={loadingAI || !fileId}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Get AI Suggestions
                  </Button>
                )}
                {aiSuggestions && (
                  <Button
                    type="button"
                    onClick={handleAcceptAllAI}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Accept All High Confidence
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions Details */}
      {/* {aiSuggestions && showAISuggestions && (
        <Card className="border-2 border-primary/30 bg-muted/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                AI Suggestions
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAISuggestions(!showAISuggestions)}
              >
                {showAISuggestions ? "Hide" : "Show"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { type: "customer", label: "Customer Fields", suggestions: aiSuggestions.customer },
              { type: "order", label: "Order Fields", suggestions: aiSuggestions.order },
              { type: "product", label: "Product Fields", suggestions: aiSuggestions.product }
            ].map(({ type, label, suggestions }) => {
              if (!suggestions || suggestions.length === 0) return null
              
              // Deduplicate suggestions within each category
              const uniqueSuggestions = new Map()
              suggestions.forEach(suggestion => {
                if (suggestion.excel_column && suggestion.canonical_field) {
                  const key = `${suggestion.excel_column}::${suggestion.canonical_field}`
                  const existing = uniqueSuggestions.get(key)
                  if (!existing || suggestion.confidence > existing.confidence) {
                    uniqueSuggestions.set(key, suggestion)
                  }
                }
              })
              
              const deduplicatedSuggestions = Array.from(uniqueSuggestions.values())
              
              if (deduplicatedSuggestions.length === 0) return null
              
              return (
                <div key={type} className="rounded-lg border border-border bg-card p-3">
                  <h4 className="mb-2 text-sm font-semibold text-foreground">{label}</h4>
                  <div className="space-y-2">
                    {deduplicatedSuggestions.map((suggestion, idx) => {
                      const confidenceColor = 
                        suggestion.confidence >= 0.8 ? "text-green-600" :
                        suggestion.confidence >= 0.6 ? "text-yellow-600" :
                        "text-orange-600"
                      
                      const isApplied = uniqueRows.some(r => 
                        r.analysisField === suggestion.canonical_field && 
                        r.columnName === suggestion.excel_column
                      )
                      
                      return (
                        <div
                          key={`${type}-${suggestion.excel_column}-${suggestion.canonical_field}-${idx}`}
                          className={`flex items-center justify-between rounded border p-2 ${
                            isApplied ? "bg-green-50 border-green-200" : "bg-background"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {suggestion.excel_column}
                              </span>
                              <span className="text-xs text-muted-foreground">→</span>
                              <span className="text-sm text-foreground">
                                {suggestion.canonical_field}
                              </span>
                              {isApplied && (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={`text-xs font-medium ${confidenceColor}`}>
                                {Math.round(suggestion.confidence * 100)}% confidence
                              </span>
                            </div>
                          </div>
                          {!isApplied && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Check if this exact mapping already exists
                                const exists = rows.some(r => 
                                  r.analysisField === suggestion.canonical_field && 
                                  r.columnName === suggestion.excel_column
                                )
                                
                                if (exists) {
                                  toast.info("Mapping Already Exists", {
                                    description: "This mapping is already in your list.",
                                  })
                                  return
                                }
                                
                                const newRow = {
                                  id: Date.now() + idx,
                                  columnName: suggestion.excel_column,
                                  analysisField: suggestion.canonical_field,
                                  suggestedBy: "ai",
                                  confidence: suggestion.confidence
                                }
                                setRows(prevRows => {
                                  // Check for duplicates before adding
                                  const exists = prevRows.some(r => 
                                    r.columnName === newRow.columnName && 
                                    r.analysisField === newRow.analysisField
                                  )
                                  if (exists) {
                                    toast.info("Mapping Already Exists", {
                                      description: "This mapping is already in your list.",
                                    })
                                    return prevRows
                                  }
                                  return [...prevRows, newRow]
                                })
                                toast.success("Mapping Added", {
                                  description: `${suggestion.excel_column} → ${suggestion.canonical_field}`,
                                })
                              }}
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Add
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )} */}

      <Card className="border-2 shadow-lg">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <CardTitle className="text-2xl font-bold text-foreground">Configure Column Mappings</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Select your Excel column and map it to the corresponding database model field
            {(() => {
              // Count unique AI-suggested mappings from uniqueRows
              const aiRows = uniqueRows.filter(r => r.suggestedBy === "ai")
              return aiRows.length > 0 ? (
                <span className="ml-2 text-primary">
                  • {aiRows.length} AI-suggested mappings
                </span>
              ) : null
            })()}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-6">
          {uniqueRows.map((row, idx) => (
            <div
              key={row.id}
              className={`group relative flex flex-col gap-4 rounded-xl border-2 p-5 transition-all hover:shadow-md md:flex-row md:items-end ${
                row.suggestedBy === "ai" 
                  ? "border-primary/40 bg-primary/5" 
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              {row.suggestedBy === "ai" && (
                <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-primary/20 px-2 py-1">
                  <Wand2 className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium text-primary">AI</span>
                  {row.confidence && (
                    <span className="text-xs text-primary/70">
                      {Math.round(row.confidence * 100)}%
                    </span>
                  )}
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor={`columnName-${row.id}`} className="text-sm font-semibold text-foreground">
                  Excel Column Name {idx + 1}
                  {row.suggestedBy === "ai" && (
                    <span className="ml-2 text-xs text-primary">(AI Suggested)</span>
                  )}
                </Label>
                {isTemplateMode || availableColumns.length === 0 ? (
                  <Input
                    id={`columnName-${row.id}`}
                    value={row.columnName || ""}
                    onChange={(e) => handleChange(row.id, "columnName", e.target.value)}
                    placeholder="e.g., order_date, customer_name, product_id"
                    className="mt-1.5 border-2 focus:border-primary"
                    required
                  />
                ) : (
                  <select
                    id={`columnName-${row.id}`}
                    className="mt-1.5 w-full rounded-lg border-2 border-input bg-background p-2.5 text-sm text-foreground transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={row.columnName || ""}
                    onChange={(e) => handleChange(row.id, "columnName", e.target.value)}
                    required
                  >
                    <option value="">Select column from file</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex-1">
                <Label htmlFor={`analysisField-${row.id}`} className="text-sm font-semibold text-foreground">
                  Map To Model Field
                </Label>
                <select
                  id={`analysisField-${row.id}`}
                  className="mt-1.5 w-full rounded-lg border-2 border-input bg-background p-2.5 text-sm text-foreground transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={row.analysisField || ""}
                  onChange={(e) => handleChange(row.id, "analysisField", e.target.value)}
                  required
                >
                  <option value="">Select model field</option>
                  <optgroup label="Customer Fields">
                    {allModelFields.filter(f => f.category === "Customer").map((opt) => (
                      <option key={opt.key} value={opt.key} title={opt.description}>
                        {opt.label} {opt.required && "*"}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Order Fields">
                    {allModelFields.filter(f => f.category === "Order").map((opt) => (
                      <option key={opt.key} value={opt.key} title={opt.description}>
                        {opt.label} {opt.required && "*"}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Product Fields">
                    {allModelFields.filter(f => f.category === "Product").map((opt) => (
                      <option key={opt.key} value={opt.key} title={opt.description}>
                        {opt.label} {opt.required && "*"}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex gap-2 md:pb-0.5">
                {uniqueRows.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Remove this mapping"
                    onClick={() => handleRemoveRow(row.id)}
                    className="border-2 border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={handleAddRow}
            className="w-full border-2 border-dashed border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Another Column Mapping
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border-2 border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border-2 border-success/20 bg-success/10 p-4 text-sm font-medium text-success">
          {success}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          className="min-w-[240px] bg-gradient-to-r from-primary via-primary-hover to-chart-4 text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Submitting...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Submit Mapping
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
