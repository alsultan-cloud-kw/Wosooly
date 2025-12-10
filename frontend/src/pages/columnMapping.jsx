import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ColumnMappingForm } from "@/components/columnMappingForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Sparkles, Loader2, AlertCircle } from "lucide-react";
import api from "../../api_config";
import { toast } from "sonner";

export default function ColumnMappingPage() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [submittedMapping, setSubmittedMapping] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTemplateMode, setIsTemplateMode] = useState(false);

  useEffect(() => {
    const fetchFileInfo = async () => {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log("ColumnMappingPage - fileId from params:", fileId, "type:", typeof fileId);
      }
      
      if (!fileId) {
        // No fileId means template/default mapping mode - this is expected behavior
        if (process.env.NODE_ENV === 'development') {
          console.log("No fileId in URL - entering template mode (expected for template mappings)");
        }
        setIsTemplateMode(true);
        setLoading(false);
        return;
      }

      // Ensure fileId is a number
      const numericFileId = typeof fileId === 'string' ? parseInt(fileId, 10) : fileId;
      
      if (isNaN(numericFileId) || numericFileId <= 0) {
        console.error("Invalid fileId:", fileId);
        setIsTemplateMode(true);
        setLoading(false);
        toast.error("Invalid File ID", {
          description: "The file ID in the URL is invalid. Please upload a file first.",
        });
        return;
      }

      try {
        if (process.env.NODE_ENV === 'development') {
          console.log("Fetching file info for fileId:", numericFileId);
        }
        const response = await api.get(`/uploaded-files/${numericFileId}`);
        setFileInfo(response.data);
        setIsTemplateMode(false);
        if (process.env.NODE_ENV === 'development') {
          console.log("File info loaded successfully");
        }
      } catch (err) {
        const statusCode = err?.response?.status;
        const errorDetail = err?.response?.data?.detail || err?.message;
        
        if (process.env.NODE_ENV === 'development') {
          console.error("Error fetching file info:", err);
          console.error("Status:", statusCode, "Detail:", errorDetail);
        }
        
        // If file not found or access denied, allow template mode as fallback
        setIsTemplateMode(true);
        
        if (statusCode === 403) {
          toast.error("Access Denied", {
            description: errorDetail || "This file belongs to another account. Please upload your own file.",
            action: {
              label: "Upload File",
              onClick: () => navigate("/upload-excel")
            }
          });
        } else if (statusCode === 404) {
          toast.warning("File Not Found", {
            description: errorDetail || `File with ID ${numericFileId} does not exist. Please upload a file first.`,
            action: {
              label: "Upload File",
              onClick: () => navigate("/upload-excel")
            }
          });
        } else {
          toast.warning("Error Loading File", {
            description: errorDetail || "Could not load file information. Creating template mapping instead.",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFileInfo();
  }, [fileId]);

  const handleMappingSubmit = (mapping) => {
    setSubmittedMapping(mapping);
    console.log("Mapping submitted:", mapping);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

      <div className="relative p-6 md:p-12">
        <div className="mx-auto max-w-6xl space-y-8">

          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary border border-primary/20 text-center">
              <Sparkles className="h-4 w-4" />
              Data Integration Platform
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary-hover to-accent bg-clip-text text-transparent">
              {isTemplateMode ? "Template Column Mapping" : "Column Mapping Configuration"}
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-3xl">
              {isTemplateMode 
                ? "Create a template mapping that can be applied to future file uploads. You can manually enter column names."
                : "Configure your data column mappings for comprehensive business analytics and unlock powerful insights"}
            </p>
            
            {isTemplateMode && (
              <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Tip:</strong> You're creating a template mapping. When you upload a file later, you can apply this template or create file-specific mappings.
                </p>
              </div>
            )}
          </div>

          <ColumnMappingForm 
            fileId={fileId && !isNaN(parseInt(fileId)) && fileInfo ? parseInt(fileId, 10) : null} 
            fileInfo={fileInfo}
            isTemplateMode={isTemplateMode}
            onMappingSubmit={handleMappingSubmit} 
          />

          {submittedMapping && (
            <Card className="border-2 border-success/50 bg-gradient-to-br from-success/5 to-success/10 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-success p-2">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-success text-2xl">Mapping Submitted Successfully</CardTitle>
                    <CardDescription className="text-base mt-1">
                      Your column mappings have been configured and saved
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="rounded-xl bg-card border-2 p-4 shadow-sm">
                  <pre className="text-sm overflow-auto leading-relaxed font-mono">
                    {JSON.stringify(submittedMapping, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
