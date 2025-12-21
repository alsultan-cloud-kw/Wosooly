import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Table from '../../table/Table'; // Update path based on your actual file structure
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../../../api_config';
// import { MessageCircle } from 'lucide-react';
import { FaWhatsapp } from "react-icons/fa";

const CustomersTable = ({customers, totalCustomers}) => {
    const [topCustomers, setTopCustomers] = useState([]);
    const [subscriptionInfo, setSubscriptionInfo] = useState(null);
    const [checkingSubscription, setCheckingSubscription] = useState(false);

    const navigate = useNavigate();
    const { t } = useTranslation("customerAnalysis");

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
            navigate(`/messaging?customerId=${customerId}`);
        } catch (error) {
            console.error('Error checking subscription:', error);
            alert('Failed to check subscription. Please try again.');
        } finally {
            setCheckingSubscription(false);
        }
    };

    const topCustomerHead = ["user", "total_orders", "total_spending", "phone"];

    const renderCustomerHead = (item, index) => <th key={index}>{t(item)}</th>;

    const renderCustomerBody = (item, index) => (
        <tr 
            key={index} 
            onClick={() => navigate(`/customer-details/${item.id}`)} 
            style={{ cursor: 'pointer' }}
        >
            <td>{item.user}</td>
            <td>{item.total_orders}</td>
            <td>{item.total_spending}</td>
            <td>
                <div className="flex items-center gap-2">
                    <span>{item.phone || 'N/A'}</span>
                    {item.phone && (
                        <button
                            onClick={(e) => handleWhatsAppClick(e, item.id)}
                            disabled={checkingSubscription}
                            className="p-1.5 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Send WhatsApp message"
                            style={{ cursor: 'pointer' }}
                        >
                            <FaWhatsapp size={18} color="#128C7E" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );

    // useEffect(() => {
    //     const fetchCustomers = async () => {
    //         try {
    //             const response = await axios.get(`${API_BASE_URL}/customers-table`);
    //             setTopCustomers(response.data);
    //         } catch (error) {
    //             console.error('Error fetching customer data:', error);
    //         }
    //     };

    //     fetchCustomers();
    // }, []);

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
                            renderHead={renderCustomerHead}
                            bodyData={customers}
                            renderBody={renderCustomerBody}
                        />
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p>No customers match the selected filters.</p>
                            <p className="text-sm mt-2">Try selecting "All Governorates" or adjusting other filters.</p>
                        </div>
                    )}
                </div>
                {/* <div className="card__footer">
                    <Link to="/">View All</Link>
                </div> */}
            </div>
        </div>
    );
};

export default CustomersTable;
