import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../../../api_config";

const MessagingClassificationTable = ({
  title,
  criteria,
  customers,
  selected,
  setSelected
}) => {
  const [filter, setFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filtering
  const filtered = customers.filter(
    (c) =>
      c.customer_name.toLowerCase().includes(filter.toLowerCase()) ||
      (c.phone && c.phone.includes(filter))
  );

  // Pagination
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const current = filtered.slice(startIndex, startIndex + rowsPerPage);

  const toggleCustomer = (id) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  };

  const selectAllInGroup = () => {
    setSelected((prev) => {
      const copy = new Set(prev);
      customers.forEach((c) => copy.add(c.customer_id));
      return copy;
    });
  };

  const unselectAllInGroup = () => {
    setSelected((prev) => {
      const copy = new Set(prev);
      customers.forEach((c) => copy.delete(c.customer_id));
      return copy;
    });
  };

  const selectCurrentPage = () => {
  setSelected((prev) => {
    const copy = new Set(prev);
    current.forEach((c) => copy.add(c.customer_id));
    return copy;
  });
  };

  return (
    <div className="mt-12">
      {/* Heading */}
      <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 border border-indigo-300 rounded-xl px-4 py-3 mb-4 shadow-sm text-center">
        <h3 className="text-xl font-semibold text-indigo-800 tracking-wide">
          {title}{" "}
          <span className="text-sm text-indigo-600">
            ({customers.length})
          </span>
        </h3>
        <p className="text-sm text-indigo-700 mt-1 italic">{criteria}</p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or phone..."
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          setCurrentPage(1); // reset pagination when filter changes
        }}
        className="mb-4 p-2 border rounded w-full shadow-sm focus:ring-2 focus:ring-blue-400"
      />

      {/* Select / Unselect */}
      <div className="mb-4 flex flex-nowrap items-center gap-2 text-sm">
        <button
            onClick={selectAllInGroup}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
            Select All
        </button>
        <button
            onClick={unselectAllInGroup}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
        >
            Unselect All
        </button>
        <button
            onClick={selectCurrentPage}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
        >
            Select Current Page
        </button>
        {customers.filter((c) => selected.has(c.customer_id)).length > 0 && (
            <span className="ml-2 text-gray-700 text-sm">
            {customers.filter((c) => selected.has(c.customer_id)).length} selected
            </span>
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
              <th className="p-2 border text-left">Orders</th>
              <th className="p-2 border text-left">Churn Risk</th>
            </tr>
          </thead>
          <tbody>
            {current.map((c) => (
              <tr
                key={c.customer_id}
                className={`hover:bg-gray-50 ${
                  selected.has(c.customer_id) ? "bg-blue-50" : ""
                }`}
              >
                <td className="p-2 border text-center">
                  <input
                    type="checkbox"
                    checked={selected.has(c.customer_id)}
                    onChange={() => toggleCustomer(c.customer_id)}
                  />
                </td>
                <td className="p-2 border">{c.customer_name}</td>
                <td className="p-2 border">{c.phone}</td>
                <td className="p-2 border">{c.order_count}</td>
                <td className="p-2 border">{c.churn_risk}</td>
              </tr>
            ))}
            {current.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
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
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
        >
          Previous
        </button>
        <span className="text-sm">
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
        >
          Next
        </button>
      </div>
    </div>
  );
};

const MessagingCustomerClassificationTables = ({ selected, setSelected }) => {
  const [grouped, setGrouped] = useState({});

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/full-customer-classification`)
      .then((res) => {
        const data = res.data;
        const byGroup = data.reduce((acc, c) => {
          const key = c.classification || "Unclassified";
          if (!acc[key]) acc[key] = [];
          acc[key].push(c);
          return acc;
        }, {});
        setGrouped(byGroup);
      })
      .catch((err) =>
        console.error("Failed to fetch classified customers:", err)
      );
  }, []);

  const classificationOrder = [
    { key: "Loyal", title: "Loyal Customers", criteria: "High order frequency, low churn risk" },
    { key: "Frequent", title: "Frequent Customers", criteria: "Regular buyers with moderate activity" },
    { key: "Occasional", title: "Occasional Customers", criteria: "Buy sometimes, not consistent" },
    { key: "New", title: "New Customers", criteria: "Recently joined, early stage" },
    { key: "Dead", title: "Dead Customers", criteria: "No recent orders, high churn risk" },
    { key: "No Orders", title: "No Orders Customers", criteria: "Signed up but never ordered" },
  ];

  return (
    <div>
      {classificationOrder.map(({ key, title, criteria }) =>
        grouped[key]?.length > 0 ? (
          <MessagingClassificationTable
            key={key}
            title={title}
            criteria={criteria}
            customers={grouped[key]}
            selected={selected}
            setSelected={setSelected}
          />
        ) : null
      )}
    </div>
  );
};

export default MessagingCustomerClassificationTables;
