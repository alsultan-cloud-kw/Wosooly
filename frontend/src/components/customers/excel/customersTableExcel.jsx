import React from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '../../table/Table';
import { useTranslation } from 'react-i18next';

const CustomersTableExcel = ({ customers = [] }) => {
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
          <h3>{t("customers")}</h3>
        </div>
        <div className="card__body">
          <Table
            limit="10"
            headData={topCustomerHead}
            renderHead={renderHead}
            bodyData={customers}
            renderBody={renderBody}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomersTableExcel;
