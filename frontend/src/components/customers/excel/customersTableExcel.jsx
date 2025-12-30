import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '../../table/Table';
import { useTranslation } from 'react-i18next';
import api from '../../../../api_config';
// import { MessageCircle } from 'lucide-react';
import { FaWhatsapp } from "react-icons/fa";
import { toast } from 'react-hot-toast';

const CustomersTableExcel = ({ customers = [], totalCustomers }) => {
  const navigate = useNavigate();
  const { t } = useTranslation("customerAnalysis");
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  // Fetch subscription info on mount
  useEffect(() => {
    const fetchSubscriptionInfo = async () => {
      try {
        const res = await api.get('/subscription-info');
        setSubscriptionInfo(res.data);
      } catch (error) {
        console.error('Failed to fetch subscription info:', error);
        setSubscriptionInfo(null);
      }
    };
    fetchSubscriptionInfo();
  }, []);

  // Check if user has WhatsApp messaging feature
  const hasWhatsAppAccess = () => {
    if (!subscriptionInfo) return false;
    const features = subscriptionInfo.available_features || [];
    return features.includes('whatsapp_messaging');
  };

  const handleWhatsAppClick = async (e, customerId) => {
    e.stopPropagation(); // Prevent row click navigation
    
    if (checkingSubscription) return;

    try {
      setCheckingSubscription(true);
      
      // If subscription info not loaded, fetch it
      if (!subscriptionInfo) {
        const res = await api.get('/subscription-info');
        setSubscriptionInfo(res.data);
        
        const features = res.data?.available_features || [];
        if (!features.includes('whatsapp_messaging')) {
          alert('WhatsApp messaging is not available in your current subscription plan. Please upgrade to Standard, Professional, or Enterprise plan.');
          return;
        }
      } else {
        // Check with cached subscription info
        if (!hasWhatsAppAccess()) {
          alert('WhatsApp messaging is not available in your current subscription plan. Please upgrade to Standard, Professional, or Enterprise plan.');
          return;
        }
      }

      // Navigate to messaging page with customer pre-selected
      // Ensure customerId is converted to string for URL consistency
      const customerIdStr = String(customerId);
      navigate(`/messaging?customerId=${customerIdStr}`);
    } catch (error) {
      console.error('Error checking subscription:', error);
      alert('Failed to check subscription. Please try again.');
    } finally {
      setCheckingSubscription(false);
    }
  };

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

    // Get phone number from various possible field names
    const phone = row.phone || row.phone_number || row.mobile || row.contact || "";
    // Ensure customerId is consistent - prefer customer_id, fallback to id
    // Convert to string for consistent comparison
    const customerId = row.customer_id || row.id;

    // Check if a column is a phone-related column
    const isPhoneColumn = (colName) => {
      const phoneKeywords = ['phone', 'mobile', 'contact', 'tel', 'telephone'];
      return phoneKeywords.some(keyword => 
        colName.toLowerCase().includes(keyword)
      );
    };

    const handleCustomerRowClick = () => {
      // Check if user has advanced_analytics feature
      let availableFeatures = [];
      try {
        const featuresStr = localStorage.getItem("available_features");
        if (featuresStr) {
          availableFeatures = JSON.parse(featuresStr);
        }
      } catch (error) {
        console.error("Error parsing available_features from localStorage:", error);
        availableFeatures = [];
        localStorage.removeItem("available_features");
      }

      // Check if advanced_analytics is in available features
      if (!availableFeatures.includes("advanced_analytics")) {
        toast.error("Upgrade your plan to get advanced analysis! 🚀", {
          icon: "👑",
          duration: 4000,
          style: {
            borderRadius: "10px",
            background: "#ef4444",
            color: "#fff",
            fontWeight: "500",
          },
        });
        // Navigate to subscription page after a short delay
        setTimeout(() => {
          navigate("/subscription");
        }, 500);
        return;
      }

      // User has the feature, proceed with navigation
      navigate(`/customer-details/${customerId}`);
    };

    return (
      <tr
        key={index}
        style={{ cursor: 'pointer' }}
        onClick={handleCustomerRowClick}
      >
        {topCustomerHead.map((col, i) => {
          // Special handling for phone column - add WhatsApp button
          if (isPhoneColumn(col)) {
            const phoneValue = row[col] || phone || "";
            return (
              <td key={i}>
                <div className="flex items-center gap-2">
                  <span>{phoneValue || 'N/A'}</span>
                  {phoneValue && customerId && (
                    <button
                      onClick={(e) => handleWhatsAppClick(e, customerId)}
                      disabled={checkingSubscription}
                      className="p-1.5 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send WhatsApp message"
                      style={{ cursor: 'pointer' }}
                    >
                      <FaWhatsapp size={18} color="#128C7E"/>
                    </button>
                  )}
                </div>
              </td>
            );
          }
          
          return (
            <td key={i}>
              {col === "dob" ? dobValue : (row[col] ?? "")}
            </td>
          );
        })}
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
