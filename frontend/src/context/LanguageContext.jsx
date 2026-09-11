import React, { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext();

export const translations = {
  en: {
    // Header & Police Branding
    policeDept: "ગુજરાત પોલીસ • GUJARAT POLICE",
    gridBadge: "EGUJCOP CCTNS GRID",
    projectTitle: "SENTINEL",
    projectTitleSuffix: "Unified CCTV & AI ANPR Command Grid",
    projectSubtitle: "Connecting 80,000 Heterogeneous Cameras across Municipal Corporations, Smart Cities, RTOs & Police",
    liveFeeds: "Live Feeds:",
    online: "Online",
    officer: "Officer",
    adminRole: "Dy. Commissioner (Admin)",
    operatorRole: "Control Room Operator",
    viewerRole: "External Auditor (Viewer)",
    signOut: "Sign out of control room",

    // Sidebar navigation
    operationsMenu: "OPERATIONS MENU",
    dashboard: "Dashboard",
    cameras: "Camera Grid",
    vehicleSearch: "Vehicle Tracking",
    watchlist: "Watchlist",
    alerts: "Live Alerts",
    registry: "Camera Registry",
    auditLogs: "Security & Audit",
    networkHealthy: "Network Healthy",
    relayGateway: "HLS Relay Gateway: Active",

    // Dashboard Page
    commandDashboard: "Command Situational Dashboard",
    statewideSurveillance: "Gujarat Police Statewide CCTV Surveillance • Real-time Feeds",
    simulateIntercept: "Simulate Live Intercept",
    all30Streaming: "All 30 Feeds Streaming",
    deploymentMap: "Gujarat GIS Deployment Map (30 Target Cameras)",
    totalCameras: "Total Cameras",
    govtOnboarded: "Government Onboarded",
    liveFeedsCount: "Live Feeds",
    relayOperational: "HLS Relay Operational",
    alertsToday: "Alerts Today",
    watchlistMatches: "Watchlist Matches",
    trackedPlates: "Tracked",
    anprProcessed: "ANPR Plates Processed",
    deptDeployment: "Department Deployment",
    cityPolice: "City Police (Ahmedabad/Rajkot/Junagadh)",
    trafficPolice: "Traffic Police & Toll Plazas",
    highwayPatrol: "Highway Patrol & Transport",
    coastalGram: "Coastal Security & Gram Panchayat",
    inspectLiveFeeds: "Inspect Live Feeds",
    openGrid: "Open Grid",
    switchMultiGrid: "Switch to 30-camera multi-grid viewer",
    close: "Close",
    watchLiveCctv: "Watch Live CCTV Feed",
    liveAnprFeed: "Live ANPR Feed",
    googleSatellite: "Google Satellite",
    openStreetMap: "OpenStreetMap",
    googleRoads: "Google Roads",
    googleTerrain: "Google Terrain",

    // Camera Registry
    mandatoryModel1: "Model 1: Mandatory Asset Registry",
    registryTitle: "Centralised CCTV Asset Registry",
    registrySubtitle: "Gujarat Police Statewide Hardware Inventory, Codec Profiles & AMC Maintenance Health",
    exportCsv: "Export CSV",
    filterBy: "Filter by:",
    allDistricts: "All Districts / Cities",
    allDepts: "All Departments",
    resetFilters: "Reset Filters",
  },
  gu: {
    // Header & Police Branding
    policeDept: "ગુજરાત પોલીસ • GUJARAT POLICE",
    gridBadge: "EGUJCOP CCTNS ગ્રીડ",
    projectTitle: "સેન્ટીનેલ",
    projectTitleSuffix: "સંકલિત સીસીટીવી અને AI ANPR કમાન્ડ ગ્રીડ",
    projectSubtitle: "મ્યુનિસિપલ કોર્પોરેશનો, સ્માર્ટ સિટી, RTO અને પોલીસના 80,000 કેમેરાનું જોડાણ",
    liveFeeds: "લાઇવ ફીડ્સ:",
    online: "ઓનલાઇન",
    officer: "પોલીસ અધિકારી",
    adminRole: "નાયબ પોલીસ કમિશનર (એડમિન)",
    operatorRole: "કંટ્રોલ રૂમ ઓપરેટર",
    viewerRole: "ઓડિટર (દર્શક)",
    signOut: "કંટ્રોલ રૂમમાંથી બહાર નીકળો",

    // Sidebar navigation
    operationsMenu: "કામગીરી મેનૂ",
    dashboard: "ડેશબોર્ડ",
    cameras: "કેમેરા ગ્રીડ",
    vehicleSearch: "વાહન ટ્રેકિંગ",
    watchlist: "વોચલિસ્ટ",
    alerts: "લાઇવ એલર્ટ્સ",
    registry: "કેમેરા રજિસ્ટ્રી",
    auditLogs: "સુરક્ષા અને ઓડિટ",
    networkHealthy: "નેટવર્ક સક્રિય",
    relayGateway: "HLS રિલે ગેટવે: સક્રિય",

    // Dashboard Page
    commandDashboard: "કમાન્ડ પરિસ્થિતિગત ડેશબોર્ડ",
    statewideSurveillance: "ગુજરાત પોલીસ રાજ્યવ્યાપી સીસીટીવી સર્વેલન્સ • રીઅલ-ટાઇમ ફીડ્સ",
    simulateIntercept: "લાઇવ ઇન્ટરસેપ્ટ સિમ્યુલેશન",
    all30Streaming: "તમામ 30 ફીડ્સ લાઇવ",
    deploymentMap: "ગુજરાત GIS ડિપ્લોયમેન્ટ મેપ (30 કેમેરા)",
    totalCameras: "કુલ કેમેરા",
    govtOnboarded: "સરકારી રજિસ્ટર્ડ",
    liveFeedsCount: "લાઇવ ફીડ્સ",
    relayOperational: "HLS રિલે સક્રિય",
    alertsToday: "આજના એલર્ટ્સ",
    watchlistMatches: "વોચલિસ્ટ મેચ",
    trackedPlates: "ટ્રેક કરેલા",
    anprProcessed: "નંબર પ્લેટ પ્રોસેસ થઈ",
    deptDeployment: "વિભાગીય તહેનાત",
    cityPolice: "શહેર પોલીસ (અમદાવાદ/રાજકોટ/જૂનાગઢ)",
    trafficPolice: "ટ્રાફિક પોલીસ અને ટોલ પ્લાઝા",
    highwayPatrol: "હાઇવે પેટ્રોલ અને પરિવહન",
    coastalGram: "દરિયાકાંઠા સુરક્ષા અને ગ્રામ પંચાયત",
    inspectLiveFeeds: "લાઇવ ફીડ્સ જુઓ",
    openGrid: "ગ્રીડ ખોલો",
    switchMultiGrid: "30-કેમેરા મલ્ટી-ગ્રીડ વ્યુઅર",
    close: "બંધ કરો",
    watchLiveCctv: "લાઇવ સીસીટીવી ફીડ જુઓ",
    liveAnprFeed: "લાઇવ ANPR ફીડ",
    googleSatellite: "ગૂગલ સેટેલાઇટ",
    openStreetMap: "ઓપનસ્ટ્રીટમેપ",
    googleRoads: "ગૂગલ રોડ્સ",
    googleTerrain: "ગૂગલ ટેરેઇન",

    // Camera Registry
    mandatoryModel1: "મોડેલ 1: ફરજિયાત એસેટ રજિસ્ટ્રી",
    registryTitle: "કેન્દ્રીયકૃત સીસીટીવી એસેટ રજિસ્ટ્રી",
    registrySubtitle: "ગુજરાત પોલીસ રાજ્યવ્યાપી હાર્ડવેર ઈન્વેન્ટરી, કોડેક પ્રોફાઇલ અને AMC સ્વાસ્થ્ય",
    exportCsv: "CSV એક્સપોર્ટ કરો",
    filterBy: "ફિલ્ટર કરો:",
    allDistricts: "તમામ જિલ્લાઓ / શહેરો",
    allDepts: "તમામ વિભાગો",
    resetFilters: "ફિલ્ટર્સ રીસેટ કરો",
  },
  hi: {
    // Header & Police Branding
    policeDept: "गुजरात पुलिस • GUJARAT POLICE",
    gridBadge: "EGUJCOP CCTNS ग्रिड",
    projectTitle: "सेंटिनल",
    projectTitleSuffix: "एकीकृत सीसीटीवी और एआई एएनपीआर कमांड ग्रिड",
    projectSubtitle: "नगर निगमों, स्मार्ट शहरों, आरटीओ और पुलिस के 80,000 कैमरों का एकीकरण",
    liveFeeds: "लाइव फीड:",
    online: "ऑनलाइन",
    officer: "अधिकारी",
    adminRole: "उप पुलिस आयुक्त (एडमिन)",
    operatorRole: "कंट्रोल रूम ऑपरेटर",
    viewerRole: "ऑडिटर (दर्शक)",
    signOut: "कंट्रोल रूम से साइन आउट करें",

    // Sidebar navigation
    operationsMenu: "संचालन मेनू",
    dashboard: "डैशबोर्ड",
    cameras: "कैमरा ग्रिड",
    vehicleSearch: "वाहन ट्रैकिंग",
    watchlist: "वॉचलिस्ट",
    alerts: "लाइव अलर्ट्स",
    registry: "कैमरा रजिस्ट्री",
    auditLogs: "सुरक्षा और ऑडिट",
    networkHealthy: "नेटवर्क सक्रिय",
    relayGateway: "HLS रिले गेटवे: सक्रिय",

    // Dashboard Page
    commandDashboard: "कमांड स्थितिजन्य डैशबोर्ड",
    statewideSurveillance: "गुजरात पुलिस राज्यव्यापी सीसीटीवी निगरानी • रियल-टाइम फीड",
    simulateIntercept: "लाइव इंटरसेप्ट सिमुलेशन",
    all30Streaming: "सभी 30 फीड्स लाइव",
    deploymentMap: "गुजरात जीआईएस डिप्लॉयमेंट मैप (30 कैमरे)",
    totalCameras: "कुल कैमरे",
    govtOnboarded: "सरकारी पंजीकृत",
    liveFeedsCount: "लाइव फीड्स",
    relayOperational: "HLS रिले सक्रिय",
    alertsToday: "आज के अलर्ट्स",
    watchlistMatches: "वॉचलिस्ट मैच",
    trackedPlates: "ट्रैक किए गए",
    anprProcessed: "नंबर प्लेट प्रोसेस हुईं",
    deptDeployment: "विभागीय तैनाती",
    cityPolice: "नगर पुलिस (अहमदाबाद/राजकोट/जूनागढ़)",
    trafficPolice: "यातायात पुलिस और टोल प्लाजा",
    highwayPatrol: "हाईवे पेट्रोल और परिवहन",
    coastalGram: "तटीय सुरक्षा और ग्राम पंचायत",
    inspectLiveFeeds: "लाइव फीड्स देखें",
    openGrid: "ग्रिड खोलें",
    switchMultiGrid: "30-कैमरा मल्टी-ग्रिड व्यूअर",
    close: "बंद करें",
    watchLiveCctv: "लाइव सीसीटीवी फीड देखें",
    liveAnprFeed: "लाइव ANPR फीड",
    googleSatellite: "गूगल सैटेलाइट",
    openStreetMap: "ओपनस्ट्रीटमैप",
    googleRoads: "गूगल रोड्स",
    googleTerrain: "गूगल टेरेन",

    // Camera Registry
    mandatoryModel1: "मॉडल 1: अनिवार्य एसेट रजिस्ट्री",
    registryTitle: "केंद्रीकृत सीसीटीवी एसेट रजिस्ट्री",
    registrySubtitle: "गुजरात पुलिस राज्यव्यापी हार्डवेयर इन्वेंट्री, कोडेक प्रोफाइल और एएमसी स्वास्थ्य",
    exportCsv: "CSV निर्यात करें",
    filterBy: "फिल्टर करें:",
    allDistricts: "सभी जिले / शहर",
    allDepts: "सभी विभाग",
    resetFilters: "फ़िल्टर रीसेट करें",
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem("sentinel_lang") || "en";
  });

  const setLanguage = (lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("sentinel_lang", lang);
    } catch (e) {
      // safe fallback
    }
  };

  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: "en",
      setLanguage: () => {},
      t: (key) => translations.en[key] || key,
    };
  }
  return context;
}
