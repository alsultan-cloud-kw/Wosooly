// src/i18n.js
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next'; 
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

i18next
  .use(initReactI18next) // Passing i18n instance to react-i18next
  .init({
    resources: {
      en: {
        landing: landingEN,
        side_bar: side_bar_EN,
        productAnalysis: productAnalysisEN,
        customerAnalysis: customerAnalysisEN,
        ordersAnalysis: ordersAnalysisEN
        
      },

      ar: {
        landing: landingAR,
        side_bar: side_bar_AR,
        productAnalysis: productAnalysisAR,
        customerAnalysis: customerAnalysisAR,
        ordersAnalysis: ordersAnalysisAR

      },

    },
    lng: 'en', // Default language
    fallbackLng: 'en', // Fallback language
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    ns: ['landing', 'side_bar', 'productAnalysis', 'customerAnalysis', 'ordersAnalysis'], // List of namespaces
    defaultNS: 'landing', // Default namespace to use
  });

export default i18next;