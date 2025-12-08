import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react"
import api from "../../api_config"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

export function ColumnMappingForm({ fileId, fileInfo, isTemplateMode = false, selectedAnalyses = [], onMappingSubmit }) {
  
  const [rows, setRows] = useState([{ id: 1, columnName: "", analysisField: "" }])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [allModelFields, setAllModelFields] = useState([])
  const [availableColumns, setAvailableColumns] = useState([])

  const navigate = useNavigate()
  // Fetch model fields and file columns on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetching(true)
        
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
        if (fileInfo && fileInfo.columns) {
          setAvailableColumns(fileInfo.columns.map(col => col.name))
          // Initialize rows with column names
          if (fileInfo.columns.length > 0) {
            setRows(
              fileInfo.columns.slice(0, 5).map((col, idx) => ({
                id: idx + 1,
                columnName: col.name,
                analysisField: ""
              }))
            )
          }
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
                  analysisField: modelField
                })
              })
            })
            if (allMappedRows.length > 0) {
              setRows(allMappedRows)
            }
          }
        } catch (mappingErr) {
          // No existing mappings, that's okay
          console.log("No existing mappings found")
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

  const handleAddRow = () => {
    setRows([...rows, { id: Date.now(), columnName: "", analysisField: "" }])
  }

  const handleRemoveRow = (id) => {
    setRows(rows.filter((r) => r.id !== id))
  }

  const handleChange = (id, field, value) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // Build a single mapping object from all rows
      const mapping = {}
      rows.forEach((r) => {
        if (r.analysisField && r.columnName) {
          mapping[r.analysisField] = r.columnName
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
      rows.forEach((r) => {
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
      navigate("/dashboard")
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

      <Card className="border-2 shadow-lg">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <CardTitle className="text-2xl font-bold text-foreground">Configure Column Mappings</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Select your Excel column and map it to the corresponding database model field
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-6">
          {rows.map((row, idx) => (
            <div
              key={row.id}
              className="group flex flex-col gap-4 rounded-xl border-2 border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md md:flex-row md:items-end"
            >
              <div className="flex-1">
                <Label htmlFor={`columnName-${row.id}`} className="text-sm font-semibold text-foreground">
                  Excel Column Name {idx + 1}
                </Label>
                {isTemplateMode || availableColumns.length === 0 ? (
                  <Input
                    id={`columnName-${row.id}`}
                    value={row.columnName}
                    onChange={(e) => handleChange(row.id, "columnName", e.target.value)}
                    placeholder="e.g., order_date, customer_name, product_id"
                    className="mt-1.5 border-2 focus:border-primary"
                    required
                  />
                ) : (
                  <select
                    id={`columnName-${row.id}`}
                    className="mt-1.5 w-full rounded-lg border-2 border-input bg-background p-2.5 text-sm text-foreground transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={row.columnName}
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
                  value={row.analysisField}
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
                {rows.length > 1 && (
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
