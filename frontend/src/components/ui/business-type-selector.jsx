import React, { useState, useEffect, useRef } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { Label } from "./label";
import { Check, ChevronsUpDown, X, Plus, Loader2 } from "lucide-react";
import api from "../../../api_config";
import { toast } from "sonner";

export function BusinessTypeSelector({ value, onChange, label, placeholder, required, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [businessTypes, setBusinessTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newBusinessType, setNewBusinessType] = useState("");
  const wrapperRef = useRef(null);

  // Load business types on mount
  useEffect(() => {
    loadBusinessTypes();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowAddNew(false);
        setSearchTerm("");
        setNewBusinessType("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadBusinessTypes = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/business-types");
      if (response.data.success) {
        setBusinessTypes(response.data.business_types || []);
      }
    } catch (error) {
      console.error("Error loading business types:", error);
      toast.error("Failed to load business types");
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateAndAdd = async () => {
    if (!newBusinessType.trim()) {
      toast.error("Please enter a business type");
      return;
    }

    setIsValidating(true);
    try {
      const response = await api.post("/validate-business-type", {
        business_type: newBusinessType.trim(),
      });

        if (response.data.success) {
          if (response.data.can_add) {
            // Reload business types from server to get the updated list
            await loadBusinessTypes();
            // Select the newly added type
            onChange(newBusinessType.trim());
            setIsOpen(false);
            setShowAddNew(false);
            setNewBusinessType("");
            setSearchTerm("");
            toast.success(response.data.message || "Business type added successfully");
          } else if (response.data.recommendation) {
          // Similar type exists, recommend it
          toast.error(response.data.message || "A similar business type already exists", {
            description: `Did you mean "${response.data.recommendation}"?`,
            duration: 5000,
          });
          // Optionally auto-select the recommended type
          // onChange(response.data.recommendation);
        } else {
          toast.error(response.data.message || "Cannot add this business type");
        }
      }
    } catch (error) {
      console.error("Error validating business type:", error);
      toast.error(
        error.response?.data?.detail || "Failed to validate business type"
      );
    } finally {
      setIsValidating(false);
    }
  };

  const filteredTypes = businessTypes.filter((type) =>
    type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedType = value || "";

  return (
    <div className={`space-y-2 ${className}`} ref={wrapperRef}>
      <Label htmlFor="business_type">{label}</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full h-11 px-3 py-2 text-left bg-background border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-between ${
            !selectedType ? "text-muted-foreground" : ""
          }`}
        >
          <span>{selectedType || placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
            <div className="p-2">
              {/* Search input */}
              <div className="relative mb-2">
                <Input
                  type="text"
                  placeholder="Search or add new..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowAddNew(false);
                  }}
                  className="h-9"
                  onFocus={() => setIsOpen(true)}
                />
              </div>

              {/* Add new button */}
              {searchTerm && !filteredTypes.some(t => t.toLowerCase() === searchTerm.toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => {
                    setNewBusinessType(searchTerm);
                    setShowAddNew(true);
                    setSearchTerm("");
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent rounded-md flex items-center gap-2 mb-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add "{searchTerm}"</span>
                </button>
              )}

              {/* Add new form */}
              {showAddNew && (
                <div className="p-3 border border-border rounded-md mb-2 bg-muted/50">
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Enter new business type"
                      value={newBusinessType}
                      onChange={(e) => setNewBusinessType(e.target.value)}
                      className="h-9"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleValidateAndAdd();
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleValidateAndAdd}
                        disabled={isValidating || !newBusinessType.trim()}
                        className="flex-1"
                      >
                        {isValidating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Validating...
                          </>
                        ) : (
                          "Add"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowAddNew(false);
                          setNewBusinessType("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Business types list */}
              <div className="max-h-60 overflow-auto">
                {isLoading ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                    Loading...
                  </div>
                ) : filteredTypes.length === 0 && !showAddNew ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                    No business types found
                  </div>
                ) : (
                  filteredTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        onChange(type);
                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-accent rounded-md flex items-center justify-between ${
                        selectedType === type ? "bg-accent" : ""
                      }`}
                    >
                      <span>{type}</span>
                      {selectedType === type && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {required && !selectedType && (
        <p className="text-sm text-destructive">Business type is required</p>
      )}
    </div>
  );
}

