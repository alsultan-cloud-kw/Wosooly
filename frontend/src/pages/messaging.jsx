import React, { useState, useEffect, useRef } from "react";
import CustomerList from "../components/customers/woocommerce/customersList";
import CustomerListExcel from "../components/customers/excel/customersListExcel";
import TemplatesList from "../components/template_lists";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  RefreshCw, 
  X, 
  MessageSquare,
  Users,
  FileText,
  Sparkles
} from "lucide-react";
import api from "../../api_config";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";

function Messaging() {
  const { t } = useTranslation("messaging");
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [dataSource, setDataSource] = useState(localStorage.getItem("data_source") || "woocommerce");
  const [templatesRefreshTrigger, setTemplatesRefreshTrigger] = useState(0);
  const templatesListRef = useRef(null);

  // Watch for localStorage changes (dataSource)
  useEffect(() => {
    const handleStorageChange = () => {
      const newDataSource = localStorage.getItem("data_source");
      if (newDataSource) {
        setDataSource(newDataSource);
      }
    };

    // Listen for custom event from UserDashboard
    const handleDataSourceChanged = (event) => {
      const { dataSource: newDataSource } = event.detail;
      if (newDataSource) {
        setDataSource(newDataSource);
      }
    };

    // Check for changes periodically (since storage events don't fire in same window)
    const interval = setInterval(handleStorageChange, 500);
    
    // Listen for custom event
    window.addEventListener("dataSourceChanged", handleDataSourceChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener("dataSourceChanged", handleDataSourceChanged);
    };
  }, []);

  const sendMessage = async () => {
    if (selectedCustomers.length === 0) {
      toast.error(t("alerts.selectCustomerFirst"), {
        icon: "👥",
        duration: 4000,
      });
      return;
    }
    if (selectedTemplates.length === 0) {
      toast.error(t("alerts.selectTemplateFirst"), {
        icon: "📄",
        duration: 4000,
      });
      return;
    }

    const toastId = toast.loading(t("sending") || "Sending messages...", {
      duration: 0,
    });

    try {
      setIsSending(true);
      const payload = {
        customers: selectedCustomers.map(Number),
        templates: selectedTemplates.map((t) => t.template_name)
      };

      console.log("payload", payload);
      console.log("Hitting URL:", '/send-message');

      const res = await api.post('/send-message', payload);

      toast.success(t("alerts.messageSentSuccess"), {
        id: toastId,
        icon: "✅",
        duration: 5000,
      });
      console.log(res.data);
      
      // Clear selections after successful send
      setSelectedCustomers([]);
      setSelectedTemplates([]);
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error(
        err.response?.data?.detail || t("alerts.messageSendFailed"),
        {
          id: toastId,
          icon: "❌",
          duration: 5000,
        }
      );
    } finally {
      setIsSending(false);
    }
  };

  const syncTemplates = async () => {
    const toastId = toast.loading(t("syncing") || "Syncing templates...", {
      duration: 0,
    });

    try {
      setIsSyncing(true);
      const res = await api.post('/sync-templates');
      
      toast.success(res.data.message || t("alerts.templatesSyncedSuccess"), {
        id: toastId,
        icon: "🔄",
        duration: 5000,
      });

      // Automatically refresh templates list after successful sync
      // Method 1: Trigger refresh via refreshTrigger prop
      setTemplatesRefreshTrigger(prev => prev + 1);
      
      // Method 2: Also call refetch via ref (backup method)
      if (templatesListRef.current) {
        templatesListRef.current.refetch();
      }
    } catch (err) {
      console.error("Failed to sync templates:", err);
      toast.error(
        err.response?.data?.detail || t("alerts.templatesSyncFailed"),
        {
          id: toastId,
          icon: "❌",
          duration: 5000,
        }
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            {t("title")}
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Column 1: Customer List */}
        <div className="border-r border-gray-200 dark:border-gray-700 pr-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t("customers")}</h2>
            {dataSource === "excel" && (
              <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-medium">
                {t("excel")}
              </span>
            )}
            {dataSource === "woocommerce" && (
              <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                {t("woocommerce")}
              </span>
            )}
          </div>
          {dataSource === "excel" ? (
            <CustomerListExcel onSelectCustomers={setSelectedCustomers} />
          ) : (
            <CustomerList onSelectCustomers={setSelectedCustomers} displayField="phone" />
          )}
        </div>

        {/* Column 2: Templates List */}
        <div className="border-r border-gray-200 dark:border-gray-700 pr-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t("templates")}</h2>
            </div>
          </div>
          
          {/* Sync Templates Button with proper spacing */}
          <div className="mb-4">
            <Button
              onClick={syncTemplates}
              disabled={isSyncing}
              variant="outline"
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t("syncing")}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {t("syncTemplates")}
                </>
              )}
            </Button>
          </div>

          <TemplatesList
            ref={templatesListRef}
            selectedTemplates={selectedTemplates}
            onSelect={setSelectedTemplates}
            refreshTrigger={templatesRefreshTrigger}
          />
        </div>
        
        {/* Column 3: Selected Templates */}
        <div className="p-4">
          {selectedTemplates.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-center">{t("selectTemplatesToView")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedTemplates.map((template) => (
                <div
                  key={template.template_name}
                  className="relative p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-md hover:shadow-lg transition-shadow duration-200"
                >
                  {/* Remove button in top-right corner */}
                  <Button
                    onClick={() =>
                      setSelectedTemplates((prev) =>
                        prev.filter((tpl) => tpl.template_name !== template.template_name)
                      )
                    }
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 h-8 w-8 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-2 pr-8">
                    {template.template_name}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                      {t("category")}: {template.category}
                    </span>
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-medium">
                      {t("language")}: {template.language}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      template.status === 'APPROVED' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : template.status === 'REJECTED'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {t(`status.${template.status}`) || template.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line mb-3 leading-relaxed">
                    {template.body}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("lastUpdated")} {new Date(template.updated_at).toLocaleString()}
                  </p>
                </div>
              ))}

              {/* Send Message Button */}
              <Button
                onClick={sendMessage}
                disabled={isSending || selectedCustomers.length === 0 || selectedTemplates.length === 0}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 mt-6"
              >
                {isSending ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    {t("sending")}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t("sendMessage")} {selectedCustomers.length} {selectedCustomers.length === 1 ? t("customer") : t("customer_plural")}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Messaging;