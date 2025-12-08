import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart3, FileSpreadsheet, Check, ArrowRight, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DataSourceSelector() {
  const [selectedSource, setSelectedSource] = useState(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (!selectedSource) return;

    // Persist selected data source so dashboard can render accordingly
    try {
      localStorage.setItem("data_source", selectedSource);
    } catch (e) {
      console.warn("Unable to persist data_source", e);
    }

    if (selectedSource === "woocommerce") {
      navigate("/connect-woocommerce");
    } else if (selectedSource === "excel") {
      navigate("/upload-excel");
    }
  };

  const handleSkip = () => {
    navigate("/dashboard"); // 👈 Skip button navigation
  };

  return (
    <div className="relative w-full min-h-screen bg-background flex items-center justify-center">
      {/* Fullscreen background gradient */}
      <div className="absolute inset-0 bg-gradient-mesh z-0" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl w-full px-4 py-16">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-lg">
            <Database className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl text-balance">
            Choose Your Data Source
          </h1>
          <p className="text-lg text-muted-foreground md:text-xl text-pretty max-w-2xl mx-auto">
            Select how you want to analyze your data. You can connect your WooCommerce store or upload Excel sheets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* WooCommerce Card */}
          <div
            onClick={() => setSelectedSource("woocommerce")}
            className={`relative group cursor-pointer transition-all duration-300 ${
              selectedSource === "woocommerce" ? "scale-[1.02]" : "hover:scale-[1.01]"
            }`}
          >
            <div
              className={`absolute inset-0 gradient-primary rounded-3xl transition-opacity duration-300 ${
                selectedSource === "woocommerce"
                  ? "opacity-75 blur-2xl"
                  : "opacity-50 blur-xl group-hover:opacity-75"
              }`}
            />
            <Card
              className={`relative h-full p-8 border-2 transition-all duration-300 ${
                selectedSource === "woocommerce"
                  ? "border-primary shadow-2xl"
                  : "border-primary/20 shadow-xl hover:border-primary/40"
              }`}
            >
              {selectedSource === "woocommerce" && (
                <div className="absolute -top-3 -right-3 h-10 w-10 rounded-full gradient-primary flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
                  <Check className="h-6 w-6 text-white" />
                </div>
              )}
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl gradient-primary shadow-lg">
                <BarChart3 className="h-10 w-10 text-white" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-foreground">WooCommerce</h3>
              <p className="mb-6 text-muted-foreground leading-relaxed">
                Connect your WooCommerce store using API keys to analyze orders, customers, and products in real-time.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-foreground">Real-time data sync</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-accent" />
                  <span className="text-foreground">Automatic updates</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-foreground">Secure API connection</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Excel Card */}
          <div
            onClick={() => setSelectedSource("excel")}
            className={`relative group cursor-pointer transition-all duration-300 ${
              selectedSource === "excel" ? "scale-[1.02]" : "hover:scale-[1.01]"
            }`}
          >
            <div
              className={`absolute inset-0 gradient-secondary rounded-3xl transition-opacity duration-300 ${
                selectedSource === "excel"
                  ? "opacity-75 blur-2xl"
                  : "opacity-50 blur-xl group-hover:opacity-75"
              }`}
            />
            <Card
              className={`relative h-full p-8 border-2 transition-all duration-300 ${
                selectedSource === "excel"
                  ? "border-secondary shadow-2xl"
                  : "border-secondary/20 shadow-xl hover:border-secondary/40"
              }`}
            >
              {selectedSource === "excel" && (
                <div className="absolute -top-3 -right-3 h-10 w-10 rounded-full gradient-secondary flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
                  <Check className="h-6 w-6 text-white" />
                </div>
              )}
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl gradient-secondary shadow-lg">
                <FileSpreadsheet className="h-10 w-10 text-white" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-foreground">Excel Sheets</h3>
              <p className="mb-6 text-muted-foreground leading-relaxed">
                Upload your sales Excel files and map column names to analyze orders, customers, and product data.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-secondary" />
                  <span className="text-foreground">Flexible column mapping</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-warning" />
                  <span className="text-foreground">Multiple file formats</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-foreground">Easy upload process</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Continue & Skip Buttons */}
        <div className="text-center">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!selectedSource}
            className={`text-base shadow-lg transition-all duration-300 ${
              selectedSource === "woocommerce"
                ? "gradient-primary hover:opacity-90"
                : selectedSource === "excel"
                ? "gradient-secondary hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {selectedSource ? "Continue" : "Select a Data Source"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          {/* Skip Button */}
          <div className="mt-6">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
          </div>
          {selectedSource && (
            <p className="mt-4 text-sm text-muted-foreground animate-in fade-in duration-300">
              {selectedSource === "woocommerce"
                ? "You'll be asked to provide your WooCommerce API keys"
                : "You'll be able to upload your Excel file and map columns"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
