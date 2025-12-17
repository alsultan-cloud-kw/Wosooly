import React from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '../../table/Table';
import { useTranslation } from 'react-i18next';

const CustomersTableExcel = ({ customers = [], totalCustomers }) => {
  const navigate = useNavigate();
  const { t } = useTranslation("customerAnalysis");

  if (!customers || customers.length === 0) {
    return <p>No customer data found.</p>;
  }

  // Detect existing columns dynamically
  const columns = Object.keys(customers[0] || {});

  const hasCivilId = columns.includes("civil_id");
  const hasCustomerId = columns.includes("customer_id");

  // Should we add DOB column?
  const shouldAddDobColumn = hasCivilId || hasCustomerId;

  // Final table headings
  const topCustomerHead = [
    ...columns,
    ...(shouldAddDobColumn ? ["dob"] : []),
  ];

  // DOB parser
  const parseDob = (civilOrCustomerId) => {
    if (!civilOrCustomerId) return "";
    const digits = String(civilOrCustomerId).replace(/\D/g, "");
    if (digits.length < 7) return "";
    const firstSeven = digits.slice(0, 7);
    const yy = firstSeven.slice(1, 3);
    const mm = firstSeven.slice(3, 5);
    const dd = firstSeven.slice(5, 7);
    return `${yy}/${mm}/${dd}`;
  };

  // Render table header
  const renderHead = (item, index) => <th key={index}>{t(item) || item}</th>;

  // Render table rows + DOB logic
  const renderBody = (row, index) => {
    const dobValue =
      hasCivilId && row?.civil_id
        ? parseDob(row.civil_id)
        : hasCustomerId && /^\d{12}$/.test(row?.customer_id)
        ? parseDob(row.customer_id)
        : "";

    return (
      <tr
        key={index}
        style={{ cursor: 'pointer' }}
        onClick={() => navigate(`/customer-details/${row.customer_id}`)}
      >
        {topCustomerHead.map((col, i) => (
          <td key={i}>
            {col === "dob" ? dobValue : (row[col] ?? "")}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="col-12">
      <div className="card">
        <div className="card__header">
          <div className="flex items-center justify-between">
            <h3>{t("customers")}</h3>
            <div className="flex items-center gap-2">
              {totalCustomers !== undefined && totalCustomers !== customers.length && (
                <span className="text-xs text-gray-500">
                  ({totalCustomers} total)
                </span>
              )}
              <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
                {totalCustomers !== undefined && totalCustomers !== customers.length && ' filtered'}
              </span>
            </div>
          </div>
        </div>
        <div className="card__body">
          {customers.length > 0 ? (
            <Table
              limit="10"
              headData={topCustomerHead}
              renderHead={renderHead}
              bodyData={customers}
              renderBody={renderBody}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No customers match the selected filters.</p>
              <p className="text-sm mt-2">Try selecting "All Governorates" or adjusting other filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomersTableExcel;
