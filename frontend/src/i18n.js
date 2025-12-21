// src/i18n.js
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next'; 
import landingtopEN from '../public/locales/en/landing_top.json';
import landingtopAR from '../public/locales/ar/landing_top.json';
import landingEN from '../public/locales/en/landing.json'; 
import landingAR from '../public/locales/ar/landing.json'; 
import side_bar_EN from '../public/locales/en/side_bar.json';
import side_bar_AR from '../public/locales/ar/side_bar.json'; 
import productAnalysisEN from '../public/locales/en/productAnalysis.json'; 
import productAnalysisAR from '../public/locales/ar/productAnalysis.json';
import customerAnalysisEN from '../public/locales/en/customerAnalysis.json';
import customerAnalysisAR from '../public/locales/ar/customerAnalysis.json';
import ordersAnalysisEN from '../public/locales/en/ordersAnalysis.json';
import ordersAnalysisAR from '../public/locales/ar/ordersAnalysis.json';
import registerEN from '../public/locales/en/register.json';
import registerAR from '../public/locales/ar/register.json';
import signinEN from '../public/locales/en/signin.json';
import signinAR from '../public/locales/ar/signin.json';
import subscriptionEN from '../public/locales/en/subscription.json';
import subscriptionAR from '../public/locales/ar/subscription.json';
import chatEN from '../public/locales/en/chat.json';
import chatAR from '../public/locales/ar/chat.json';
import messagingEN from '../public/locales/en/messaging.json';
import messagingAR from '../public/locales/ar/messaging.json';
import whatsappEN from '../public/locales/en/whatsapp.json';
import whatsappAR from '../public/locales/ar/whatsapp.json';
import userDashboardEN from '../public/locales/en/userDashboard.json';
import userDashboardAR from '../public/locales/ar/userDashboard.json';
import adminDashboardEN from '../public/locales/en/adminDashboard.json';
import adminDashboardAR from '../public/locales/ar/adminDashboard.json';
import adminRegisterEN from '../public/locales/en/adminRegister.json';
import adminRegisterAR from '../public/locales/ar/adminRegister.json';

// Get initial language from localStorage
const getInitialLanguage = () => {
  // Check for both possible keys for backward compatibility
  return localStorage.getItem('language') || 
         localStorage.getItem('appLanguage') || 
         'en';
};

// Set initial language in localStorage if not present
const initialLang = getInitialLanguage();
if (!localStorage.getItem('language')) {
  localStorage.setItem('language', initialLang);
}

i18next
  .use(initReactI18next) // Passing i18n instance to react-i18next
  .init({
    resources: {
      en: {
        landing_top: landingtopEN,
        landing: landingEN,
        side_bar: side_bar_EN,
        productAnalysis: productAnalysisEN,
        customerAnalysis: customerAnalysisEN,
        ordersAnalysis: ordersAnalysisEN,
        register: registerEN,
        signin: signinEN,
        subscription: subscriptionEN,
        chat: chatEN,
        messaging: messagingEN,
        whatsapp: whatsappEN,
        userDashboard: userDashboardEN,
        adminDashboard: adminDashboardEN,
        adminRegister: adminRegisterEN
        
      },

      ar: {
        landing_top: landingtopAR,
        landing: landingAR,
        side_bar: side_bar_AR,
        productAnalysis: productAnalysisAR,
        customerAnalysis: customerAnalysisAR,
        ordersAnalysis: ordersAnalysisAR,
        register: registerAR,
        signin: signinAR,
        subscription: subscriptionAR,
        chat: chatAR,
        messaging: messagingAR,
        whatsapp: whatsappAR,
        userDashboard: userDashboardAR,
        adminDashboard: adminDashboardAR,
        adminRegister: adminRegisterAR

      },

    },
    lng: initialLang,
    fallbackLng: 'en', // Fallback language
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    ns: ['landing_top','landing', 'side_bar', 'productAnalysis', 'customerAnalysis', 'ordersAnalysis', 'register', 'signin', 'subscription', 'chat', 'messaging', 'whatsapp', 'userDashboard', 'adminDashboard', 'adminRegister'], // List of namespaces
    defaultNS: 'landing', // Default namespace to use
  });

// Listen for language changes and persist to localStorage
i18next.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  // Also update appLanguage for backward compatibility
  localStorage.setItem('appLanguage', lng);
  // Update HTML attributes for RTL support
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lng;
});

export default i18next;