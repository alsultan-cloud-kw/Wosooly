import React, { useState, useEffect } from "react";
import CustomerList from "../components/customers/woocommerce/customersList";
import CustomerListExcel from "../components/customers/excel/customersListExcel";
import EmailTemplatesList from "../components/email_templates_list";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  X, 
  Mail,
  Users,
  FileText,
  Sparkles,
  Plus,
  Paperclip
} from "lucide-react";
import api from "../../api_config";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function Emailing() {
  const { t } = useTranslation("emailing");
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [dataSource, setDataSource] = useState(localStorage.getItem("data_source") || "woocommerce");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    template_name: "",
    subject: "",
    category: "",
    language: "",
    body: ""
  });
  const [attachments, setAttachments] = useState([]);
  const [templateRefreshTrigger, setTemplateRefreshTrigger] = useState(0);

  // Watch for localStorage changes (dataSource)
  useEffect(() => {
    const handleStorageChange = () => {
      const newDataSource = localStorage.getItem("data_source");
      if (newDataSource) {
        setDataSource(newDataSource);
      }
    };

    const handleDataSourceChanged = (event) => {
      const { dataSource: newDataSource } = event.detail;
      if (newDataSource) {
        setDataSource(newDataSource);
      }
    };

    const interval = setInterval(handleStorageChange, 500);
    window.addEventListener("dataSourceChanged", handleDataSourceChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener("dataSourceChanged", handleDataSourceChanged);
    };
  }, []);

  const sendEmail = async () => {
    if (selectedCustomers.length === 0) {
      alert(t("alerts.selectCustomer"));
      return;
    }
    if (selectedTemplates.length === 0) {
      alert(t("alerts.selectTemplate"));
      return;
    }

    try {
      setIsSending(true);
      const activeFileId = localStorage.getItem("active_excel_file_id");
      const fileId = activeFileId ? parseInt(activeFileId, 10) : null;
      
      const payload = {
        customers: selectedCustomers.map(Number),
        templates: selectedTemplates.map((t) => t.template_name),
        attachments: attachments.length > 0 ? attachments.map(a => typeof a === 'string' ? a : a.url) : undefined,
        data_source: dataSource,
        file_id: dataSource === "excel" ? fileId : undefined
      };

      console.log("Sending email payload:", payload);

      const res = await api.post('/send-email-to-customers', payload);

      // Check results
      const failed = res.data.filter(r => r.status === "failed");
      const sent = res.data.filter(r => r.status === "sent");

      if (failed.length > 0) {
        const failedList = failed.map(f => `- ${f.email}: ${f.error || 'Unknown error'}`).join('\n');
        alert(`${t("alerts.sendPartial", { sent: sent.length, failed: failed.length })}\n\n${t("alerts.failedEmails")}\n${failedList}`);
      } else {
        alert(t("alerts.sendSuccess", { count: sent.length }));
      }

      console.log(res.data);
    } catch (err) {
      console.error("Failed to send email:", err);
      alert(err.response?.data?.detail || t("alerts.sendFailed"));
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      template_name: "",
      subject: "",
      category: "",
      language: "",
      body: ""
    });
    setShowTemplateDialog(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      template_name: template.template_name,
      subject: template.subject,
      category: template.category || "",
      language: template.language || "",
      body: template.body || ""
    });
    setShowTemplateDialog(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (!templateForm.template_name || !templateForm.subject || !templateForm.body) {
        alert(t("alerts.fillRequired"));
        return;
      }

      if (editingTemplate) {
        await api.put(`/email-templates/${editingTemplate.id}`, templateForm);
        alert(t("alerts.templateUpdated"));
      } else {
        await api.post('/email-templates', templateForm);
        alert(t("alerts.templateCreated"));
      }

      setShowTemplateDialog(false);
      setTemplateRefreshTrigger(prev => prev + 1); // Trigger refresh
    } catch (err) {
      console.error("Failed to save template:", err);
      alert(err.response?.data?.detail || t("alerts.templateSaveFailed"));
    }
  };

  const handleDeleteTemplate = () => {
    // Handled in EmailTemplatesList component
  };

  const handleAttachmentChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) {
      return;
    }

    try {
      // Upload each file to Cloudinary and get URLs
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await api.post("/upload-email-attachment", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        
        return {
          url: response.data.url,
          filename: response.data.filename,
          size: response.data.size
        };
      });

      const newAttachments = await Promise.all(uploadPromises);
      // Append new attachments to existing ones
      setAttachments(prev => [...prev, ...newAttachments]);
      
      // Reset the file input so the same file can be selected again if needed
      e.target.value = '';
    } catch (err) {
      console.error("Failed to upload attachments:", err);
      alert(t("alerts.uploadFailed"));
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
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
                Excel
              </span>
            )}
            {dataSource === "woocommerce" && (
              <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                WooCommerce
              </span>
            )}
          </div>
          {dataSource === "excel" ? (
            <CustomerListExcel onSelectCustomers={setSelectedCustomers} />
          ) : (
            <CustomerList onSelectCustomers={setSelectedCustomers} displayField="email" />
          )}
        </div>

        {/* Column 2: Email Templates List */}
        <div className="border-r border-gray-200 dark:border-gray-700 pr-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t("emailTemplates")}</h2>
            </div>
          </div>
          
          <EmailTemplatesList
            selectedTemplates={selectedTemplates}
            onSelect={setSelectedTemplates}
            onCreateNew={handleCreateTemplate}
            onEdit={handleEditTemplate}
            onDelete={handleDeleteTemplate}
            refreshTrigger={templateRefreshTrigger}
          />
        </div>
        
        {/* Column 3: Selected Templates & Send */}
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
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("subject")}: {template.subject}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    {template.category && (
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                        {template.category}
                      </span>
                    )}
                    {template.language && (
                      <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-medium">
                        {template.language}
                      </span>
                    )}
                    {!template.is_active && (
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full font-medium">
                        {t("inactive")}
                      </span>
                    )}
                  </div>
                  <div 
                    className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line mb-3 leading-relaxed max-h-40 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: template.body }}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("updated")} {new Date(template.updated_at).toLocaleString()}
                  </p>
                </div>
              ))}

              {/* Attachments Section */}
              <div className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                <Label htmlFor="attachments" className="flex items-center gap-2 mb-2">
                  <Paperclip className="h-4 w-4" />
                  {t("attachments.label")}
                </Label>
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleAttachmentChange}
                  className="mb-2"
                />
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      {attachments.length} {t("attachments.uploaded")}
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {attachments.map((attachment, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs"
                        >
                          <div className="flex-1 truncate text-gray-600 dark:text-gray-400">
                            {attachment.filename || attachment.url.split('/').pop()}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleRemoveAttachment(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Send Email Button */}
              <Button
                onClick={sendEmail}
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
                    {t("sendEmail")} {selectedCustomers.length} {selectedCustomers.length === 1 ? t("customer") : t("customers")}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Template Create/Edit Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t("dialog.editTitle") : t("dialog.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="template_name">{t("dialog.templateName")}</Label>
              <Input
                id="template_name"
                value={templateForm.template_name}
                onChange={(e) => setTemplateForm({ ...templateForm, template_name: e.target.value })}
                placeholder={t("dialog.templateNamePlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="subject">{t("dialog.subject")}</Label>
              <Input
                id="subject"
                value={templateForm.subject}
                onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                placeholder={t("dialog.subjectPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">{t("dialog.category")}</Label>
                <Input
                  id="category"
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                  placeholder={t("dialog.categoryPlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="language">{t("dialog.language")}</Label>
                <Input
                  id="language"
                  value={templateForm.language}
                  onChange={(e) => setTemplateForm({ ...templateForm, language: e.target.value })}
                  placeholder={t("dialog.languagePlaceholder")}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="body">{t("dialog.body")}</Label>
              <Textarea
                id="body"
                value={templateForm.body}
                onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                placeholder={t("dialog.bodyPlaceholder")}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t("dialog.bodyHelp")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              {t("dialog.cancel")}
            </Button>
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? t("dialog.update") : t("dialog.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Emailing;