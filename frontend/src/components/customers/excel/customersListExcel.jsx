import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../../api_config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, Phone, CheckCircle2 } from "lucide-react";

const CustomerListExcel = ({ onSelectCustomers }) => {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(new Set()); // ✅ shared state
  const [filter, setFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filteredCustomerId, setFilteredCustomerId] = useState(null); // Track if we're showing only one customer

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    async function fetchCustomers() {
      try {
        setIsLoading(true);
        const activeFileId = localStorage.getItem("active_excel_file_id");
        const fileId = activeFileId ? parseInt(activeFileId, 10) : null;
        const params = fileId ? { params: { file_id: fileId } } : {};
        
        const res = await api.get("/excel_customers/customers-table", params);
        const rows = Array.isArray(res.data?.rows) ? res.data.rows : [];
        
        // Map Excel customer data to a consistent format
        // Excel data might have different field names, so we'll try common variations
        // IMPORTANT: Use customer_id as primary ID to match with table
        const mappedCustomers = rows.map((customer, index) => {
          // Prefer customer_id, fallback to id, then index
          const primaryId = customer.customer_id || customer.id || index;
          return {
            ...customer, // Keep all original fields first
            id: primaryId, // Override with our consistent ID (this is what we use in the Set)
            customer_id: customer.customer_id || primaryId, // Ensure customer_id exists
            name: customer.customer_name || customer.name || customer.user || customer.full_name || "Unknown",
            phone: customer.phone || customer.phone_number || customer.mobile || customer.contact || "",
            email: customer.email ? String(customer.email).toLowerCase().trim() : "", // Normalize email to lowercase
          };
        });
        
        setCustomers(mappedCustomers);
      } catch (err) {
        console.error("Error fetching Excel customers:", err);
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  // Auto-select customer from URL params and filter to show only that customer
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    if (customerId && customers.length > 0 && !isLoading) {
      // Try to match as both string and number to handle different formats
      const customerIdStr = String(customerId).trim();
      const customerIdNum = isNaN(parseInt(customerId, 10)) ? null : parseInt(customerId, 10);
      
      // Find customer by matching both id and customer_id fields as string or number
      const customer = customers.find(c => {
        // Get both possible ID values
        const cId = c.id;
        const cCustomerId = c.customer_id;
        
        // Compare as strings and numbers
        const cIdStr = String(cId || '').trim();
        const cCustomerIdStr = String(cCustomerId || '').trim();
        
        return (
          cIdStr === customerIdStr ||
          cCustomerIdStr === customerIdStr ||
          (customerIdNum !== null && (cId === customerIdNum || cCustomerId === customerIdNum)) ||
          cIdStr === String(customerIdNum || '').trim() ||
          cCustomerIdStr === String(customerIdNum || '').trim()
        );
      });
      
      if (customer) {
        // Use the mapped id field (which is what's used in the Set and checkboxes)
        const actualId = customer.id;
        setSelected(new Set([actualId]));
        setFilteredCustomerId(actualId); // Filter to show only this customer
        // Remove the param from URL after selection
        searchParams.delete('customerId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [customers, searchParams, setSearchParams, isLoading]);

  // Function to clear filter and show all customers
  const clearFilter = () => {
    setFilteredCustomerId(null);
    setFilter("");
    setCurrentPage(1);
  };

  useEffect(() => {
    onSelectCustomers(Array.from(selected)); // send selected ids to parent
  }, [selected, onSelectCustomers]);

  // Filtering - first by selected customer (if filtered), then by search term
  const filteredCustomers = customers.filter((c) => {
    // If filteredCustomerId is set, show only that customer
    if (filteredCustomerId !== null) {
      if (c.id !== filteredCustomerId) return false;
    }
    
    // Then apply search filter
    if (filter.trim()) {
      return (
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(filter.toLowerCase())) ||
        (c.phone && c.phone.toString().includes(filter))
      );
    }
    
    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredCustomers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentCustomers = filteredCustomers.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  // Selection logic
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  };

  const selectAll = () => {
    setSelected(new Set(filteredCustomers.map((c) => c.id)));
  };

  const unselectAll = () => setSelected(new Set());

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {filteredCustomerId !== null ? "Selected Customer" : "Customers List (Excel)"}
            </h2>
          </div>
          {filteredCustomerId !== null && (
            <Button
              onClick={clearFilter}
              variant="outline"
              size="sm"
              className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500"
            >
              Show All Customers
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredCustomerId !== null 
            ? "Showing only the selected customer" 
            : "Select customers to send messages"}
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search by name or email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-10 h-10 border-2 focus:border-blue-500 focus:ring-blue-500/20"
          disabled={filteredCustomerId !== null} // Disable search when showing only one customer
        />
      </div>

      {/* Select / Unselect All */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <Button
          onClick={selectAll}
          variant="outline"
          size="sm"
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Select All
        </Button>
        <Button
          onClick={unselectAll}
          variant="outline"
          size="sm"
          className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
        >
          Unselect All
        </Button>
        {selected.size > 0 && (
          <span className="ml-auto px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
            {selected.size} {selected.size === 1 ? 'customer' : 'customers'} selected
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <table className="w-full border-collapse">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-700 dark:text-gray-300">
            <tr>
              <th className="p-3 border-b border-gray-200 dark:border-gray-600 text-left w-12"></th>
              <th className="p-3 border-b border-gray-200 dark:border-gray-600 text-left">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Name
                </div>
              </th>
              <th className="p-3 border-b border-gray-200 dark:border-gray-600 text-left">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Email
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentCustomers.map((c) => (
              <tr
                key={c.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  selected.has(c.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                }`}
              >
                <td className="p-3 border-b border-gray-100 dark:border-gray-700 text-center">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </td>
                <td className="p-3 border-b border-gray-100 dark:border-gray-700 font-medium text-gray-800 dark:text-gray-200">
                  {c.name}
                </td>
                <td className="p-3 border-b border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                  {c.email ? c.email.toLowerCase() : (
                    <span className="text-gray-400 dark:text-gray-500 italic">No email</span>
                  )}
                </td>
              </tr>
            ))}
            {currentCustomers.length === 0 && (
              <tr>
                <td colSpan="3" className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {filter ? "No customers found matching your search." : "No customers available."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 text-gray-700 dark:text-gray-300">
          <Button
            onClick={goToPrevPage}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
            className="disabled:opacity-50"
          >
            Previous
          </Button>
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages} ({filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'})
          </span>
          <Button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
            className="disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default CustomerListExcel;
