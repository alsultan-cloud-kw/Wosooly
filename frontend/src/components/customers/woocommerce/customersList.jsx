import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../../api_config";
// import MessagingCustomerClassificationTables from "../Messaging_customer_classsification";

const CustomerList = ({ onSelectCustomers }) => {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(new Set()); // ✅ shared state
  const [filter, setFilter] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [filteredCustomerId, setFilteredCustomerId] = useState(null); // Track if we're showing only one customer

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    api
      .get('/customers-table')
      .then((res) => setCustomers(res.data))
      .catch((err) => console.error(err));
  }, []);

  // Auto-select customer from URL params and filter to show only that customer
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    if (customerId && customers.length > 0) {
      const customerIdNum = parseInt(customerId, 10);
      const customerExists = customers.some(c => c.id === customerIdNum);
      
      if (customerExists) {
        setSelected(new Set([customerIdNum]));
        setFilteredCustomerId(customerIdNum); // Filter to show only this customer
        // Remove the param from URL after selection
        searchParams.delete('customerId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [customers, searchParams, setSearchParams]);

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
        c.user.toLowerCase().includes(filter.toLowerCase()) ||
        c.phone.includes(filter)
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          {filteredCustomerId !== null ? "Selected Customer" : "Customers List (all customers)"}
        </h2>
        {filteredCustomerId !== null && (
          <button
            onClick={clearFilter}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            title="Show all customers"
          >
            Show All Customers
          </button>
        )}
      </div>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search by name or phone..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-4 p-2 border rounded w-full shadow-sm focus:ring-2 focus:ring-blue-400"
        disabled={filteredCustomerId !== null} // Disable search when showing only one customer
      />

      {/* Select / Unselect All */}
      <div className="mb-4 space-x-2">
        <button
          onClick={selectAll}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Select All
        </button>
        <button
          onClick={unselectAll}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Unselect All
        </button>
        {selected.size > 0 && (
          <span className="ml-4 text-gray-700">{selected.size} selected</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-2 border"></th>
              <th className="p-2 border text-left">Name</th>
              <th className="p-2 border text-left">Phone</th>
            </tr>
          </thead>
          <tbody>
            {currentCustomers.map((c) => (
              <tr
                key={c.id}
                className={`hover:bg-gray-50 ${
                  selected.has(c.id) ? "bg-blue-50" : ""
                }`}
              >
                <td className="p-2 border text-center">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                  />
                </td>
                <td className="p-2 border">{c.user}</td>
                <td className="p-2 border">{c.phone}</td>
              </tr>
            ))}
            {currentCustomers.length === 0 && (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-500">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 text-gray-700">
        <button
          onClick={goToPrevPage}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
        >
          Previous
        </button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
        >
          Next
        </button>
      </div>

      {/* Classifications */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">
          Customer Classifications
        </h2>
        {/* <MessagingCustomerClassificationTables
          selected={selected}
          setSelected={setSelected}
        /> */}
      </div>
    </div>
  );
};

export default CustomerList;
