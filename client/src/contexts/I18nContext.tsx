import React, { createContext, useContext, useState } from "react";

export type Language = "en" | "hi" | "ta";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    "app.title": "Annadata Direct",
    "nav.marketplace": "Marketplace",
    "nav.operations": "Operations",
    "nav.fpoStudio": "FPO Studio",
    "nav.farmer": "Farmer Portal",
    "nav.driver": "Driver e-POD",
    "nav.telemetry": "IoT Cold-Chain",
    "nav.disputes": "Disputes & Claims",
    "nav.impact": "Impact",
    "btn.explore": "Explore Produce",
    "btn.order": "Reserve Direct Order",
    "badge.demo": "Demo Mode",
  },
  hi: {
    "app.title": "अन्नदाता डायरेक्ट",
    "nav.marketplace": "बाज़ार (Marketplace)",
    "nav.operations": "संचालन (Operations)",
    "nav.fpoStudio": "एफपीओ स्टूडियो (FPO Studio)",
    "nav.farmer": "किसान पोर्टल (Farmer Portal)",
    "nav.driver": "ड्राइवर ई-पीओडी (Driver e-POD)",
    "nav.telemetry": "कोल्ड-चेन सेंसर (IoT Cold-Chain)",
    "nav.disputes": "विवाद निवारण (Disputes)",
    "nav.impact": "प्रभाव रिपोर्ट (Impact)",
    "btn.explore": "उपज देखें",
    "btn.order": "ऑर्डर आरक्षित करें",
    "badge.demo": "डेमो मोड",
  },
  ta: {
    "app.title": "அன்னதாதா டைரக்ட்",
    "nav.marketplace": "சந்தை (Marketplace)",
    "nav.operations": "செயல்பாடுகள் (Operations)",
    "nav.fpoStudio": "FPO ஸ்டுடியோ (FPO Studio)",
    "nav.farmer": "விவசாயி போர்டல் (Farmer Portal)",
    "nav.driver": "டிரைவர் e-POD (Driver e-POD)",
    "nav.telemetry": "குளிர்பதன சென்சார் (IoT Cold-Chain)",
    "nav.disputes": "புகார் தீர்வு (Disputes)",
    "nav.impact": "தாக்க அறிக்கை (Impact)",
    "btn.explore": "விளைபொருட்களைப் பார்க்க",
    "btn.order": "ஆர்டர் முன்பதிவு",
    "badge.demo": "டெமோ பயன்முறை",
  },
};

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string): string => {
    return translations[language]?.[key] ?? translations.en[key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
