import React, { useState, useEffect } from 'react';
import { events } from './events';
import upop from 'upop';
import 'upop/dist/upop.css';
import './App.css';
import { 
  INDUSTRIES, 
  getNextAssetCost, 
  getAssetEfficiencyGain, 
  ASSETS_BY_INDUSTRY, 
  getMaintenanceCost, 
  GOVERNMENTS, 
  getGovPeMultiplier 
} from './options';

const scaleText = (text, scale) => {
  if (typeof text !== 'string') return text;
  return text.replace(/\$([0-9]{1,3}(\.[0-9]{3})*)/g, (match, p1) => {
    const number = parseInt(p1.replace(/\./g, ''));
    if (isNaN(number)) return match;
    const scaled = number * scale;
    return '$' + scaled.toLocaleString();
  });
};

const calculateElectionOdds = (state) => {
  // Base odds
  const odds = {
    Liberalismo: 25,
    Justicialismo: 30,
    Radicalismo: 20,
    Provincianismo: 20,
    Comunismo: 5
  };

  // Adjust for economic cycle
  const isCrisis = ["Recesión", "Estanflación"].includes(state.economicCycle);
  const isBoom = state.economicCycle === "Crecimiento";
  const incumbent = state.governmentType;

  if (isCrisis) {
    // Incumbent loses popularity
    odds[incumbent] = Math.max(2, odds[incumbent] - 20);
    // Opposites gain popularity
    if (["Justicialismo", "Comunismo"].includes(incumbent)) {
      odds.Liberalismo += 12;
      odds.Radicalismo += 8;
    } else if (incumbent === "Liberalismo") {
      odds.Justicialismo += 12;
      odds.Provincianismo += 8;
    } else {
      odds.Liberalismo += 5;
      odds.Justicialismo += 5;
      odds.Provincianismo += 5;
      odds.Comunismo += 5;
    }
  } else if (isBoom) {
    // Incumbent gets huge boost
    odds[incumbent] += 25;
  }

  // Adjust for player influence / alignment support
  if (state.electionSupport && odds[state.electionSupport] !== undefined) {
    odds[state.electionSupport] += 25;
  }

  // Normalize
  let sum = 0;
  Object.keys(odds).forEach(k => {
    odds[k] = Math.max(1, odds[k]);
    sum += odds[k];
  });

  // Convert to percentages
  Object.keys(odds).forEach(k => {
    odds[k] = Math.round((odds[k] / sum) * 100);
  });

  return odds;
};

const rollElection = (odds) => {
  const roll = Math.random() * 100;
  let cumulative = 0;
  const parties = Object.keys(odds);
  for (let i = 0; i < parties.length; i++) {
    cumulative += odds[parties[i]];
    if (roll <= cumulative) {
      return parties[i];
    }
  }
  return parties[parties.length - 1];
};


const getBankruptcyLimit = (state, monthlyRevenue = 0) => {
  const employeesCredit = (state.employees || 0) * 50000;
  const machineryCredit = (state.machineryCount || 0) * 300000;
  const clientsCredit = (state.clients || 0) * 5000;
  const revenueCredit = Math.floor(monthlyRevenue * 0.05);

  const netAssets = state.cash + (state.hedgedCash || 0) + (state.machineryCount * 80000) - state.debt;
  const positiveNetAssets = Math.max(0, netAssets);
  const netAssetsCredit = Math.floor(positiveNetAssets * 0.10);

  return 500000 + employeesCredit + machineryCredit + clientsCredit + revenueCredit + netAssetsCredit;
};

const getActiveBankruptcyLimit = (state, monthlyRevenue = 0) => {
  const instantLimit = getBankruptcyLimit(state, monthlyRevenue);
  if (state.bankruptcyLimit && instantLimit < state.bankruptcyLimit) {
    return Math.max(instantLimit, Math.floor(state.bankruptcyLimit * 0.85));
  }
  return instantLimit;
};

const formatMoney = (val) => {
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  let str = "";
  if (absVal >= 1000000) {
    str = parseFloat((absVal / 1000000).toFixed(2)) + "M";
  } else if (absVal >= 1000) {
    str = parseFloat((absVal / 1000).toFixed(1)) + "k";
  } else {
    str = absVal.toString();
  }
  return (isNegative ? "-$" : "$") + str;
};


const DEFAULT_STATE = {
  playerName: "Juan Pérez",
  companyName: "Platero Corp",
  businessType: "industrial",
  turn: 1,
  cash: 80000,
  debt: 0,
  employees: 3,
  salaryPerEmployee: 1500,
  priceMultiplier: 1.0,
  rndInvestment: 0,
  efficiency: 40,
  innovation: 10,
  clients: 80,
  reputation: 50,
  contacts: 5,
  politicalInfluence: 5,
  stateDependence: 0,
  corruptionRisk: 0,
  independence: 80,
  governmentType: "Radicalismo",
  economicCycle: "Normal",
  electionSupport: "",
  govTurnsLeft: 24,
  activeTenders: [],
  historyLog: ["Partida iniciada. ¡Tu meta es ser el mayor empresario del país!"],
  stage: "Emprendedor de Barrio",
  machineryCount: 0,
  usedEventIds: [],
  panamaTaxShield: false,
  hedgedCash: 0,
  rawMaterialStock: 2,
  taxPlanningEnabled: false,
  marketingCampaign: "none",
  bankruptcyLimit: 500000,

  // Annual balance accumulators
  annualRevenue: 0,
  annualExpenses: 0,
  annualTaxes: 0,
  annualNet: 0,
  annualClientsStart: 80,
  annualDividendsPaid: 0,
  annualSharePriceStart: 0,
  lastYearSummary: null,

  // Stock Market (IPO)
  isPublic: false,
  sharesSold: 0,
  sharePrice: 0
};

export default function App() {
  // Navigation & Screen transitions
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("tab-event");
  const [mobilePanelTab, setMobilePanelTab] = useState("juego"); // 'finanzas' | 'juego' | 'perfil'

  const [setupName, setSetupName] = useState("Juan Pérez");
  const [setupCompanyName, setSetupCompanyName] = useState("Platero Corp");
  const [setupType, setSetupType] = useState("industrial");

  // Game Core State
  const [state, setState] = useState(DEFAULT_STATE);

  // Event Engine State
  const [currentEvent, setCurrentEvent] = useState(null);
  const [lastMonthOutcome, setLastMonthOutcome] = useState("");

  // Modals & Overlays
  const [showElectionModal, setShowElectionModal] = useState(false);
  const [electionDetails, setElectionDetails] = useState({ oldGov: "", newGov: "" });
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [gameOverReason, setGameOverReason] = useState("bankruptcy");

  // Annual Balance Modal
  const [showAnnualModal, setShowAnnualModal] = useState(false);
  const [annualSummary, setAnnualSummary] = useState(null);

  // Stock Market (IPO) Modal and Inputs
  const [showIpoModal, setShowIpoModal] = useState(false);
  const [ipoSharesToSell, setIpoSharesToSell] = useState(20);
  const [buybackPercentage, setBuybackPercentage] = useState(5);

  // Bidding Panel State
  const [openTender, setOpenTender] = useState(null);
  const [honestOffer, setHonestOffer] = useState(150000);
  const [bribeAmount, setBribeAmount] = useState(0);
  const [tenderResult, setTenderResult] = useState(null);

  // Auto-generate company name default when type changes
  useEffect(() => {
    const businessLabels = {
      industrial: "Platero Industrial S.A.",
      software: "SoftPlatero S.A.",
      comercio: "Distribuidora Platero",
      finanzas: "Platero Finanzas",
      construccion: "Platero Construcciones",
      agropecuario: "Agropecuaria del Plata S.A."
    };
    setSetupCompanyName(businessLabels[setupType]);
  }, [setupType]);

  // Load game from localStorage on start
  useEffect(() => {
    const saved = localStorage.getItem('platero_game_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...DEFAULT_STATE, ...parsed };
        setState(merged);
        setIsPlaying(true);
        setLastMonthOutcome(merged.lastMonthOutcome || "");
        if (merged.currentEventId !== undefined && merged.currentEventId !== null) {
          const ev = events.find(e => e.id === merged.currentEventId);
          setCurrentEvent(ev || null);
        } else {
          triggerRandomEvent(merged);
        }
      } catch (e) {
        console.error("Error loading saved game:", e);
      }
    }
  }, []);

  // Sync state to localStorage
  const saveState = (newState, lastOutcomeText = lastMonthOutcome, eventId = null) => {
    const stateToSave = {
      ...newState,
      currentEventId: eventId !== null ? eventId : (currentEvent ? currentEvent.id : null),
      lastMonthOutcome: lastOutcomeText
    };
    localStorage.setItem('platero_game_state', JSON.stringify(stateToSave));
  };

  // Starts a new game session
  const handleStartGame = () => {
    const template = INDUSTRIES[setupType];
    const initial = {
      ...DEFAULT_STATE,
      playerName: setupName || "Empresario",
      companyName: setupCompanyName || "Platero Corp S.A.",
      businessType: setupType,
      cash: template.cash,
      employees: template.employees,
      clients: template.clients,
      efficiency: template.efficiency,
      innovation: template.innovation,
      reputation: template.reputation,
      contacts: template.contacts,
      independence: 80 - template.contacts,
      historyLog: [`¡${setupName} fundó la corporación "${setupCompanyName || "Platero S.A."}"!`],
      stage: "Emprendedor de Barrio",
      governmentType: ["Liberalismo", "Radicalismo", "Justicialismo", "Provincianismo"][Math.floor(Math.random() * 4)],
      govTurnsLeft: 12 + Math.floor(Math.random() * 12),
      usedEventIds: [],
      panamaTaxShield: false,
      annualRevenue: 0,
      annualExpenses: 0,
      annualTaxes: 0,
      annualNet: 0,
      annualClientsStart: template.clients,
      isPublic: false,
      sharesSold: 0,
      sharePrice: 0,
      marketingCampaign: "none"
    };
    
    // Set initial bankruptcy limit
    const initialRevenue = template.clients * template.baseMargin * 1.0;
    initial.bankruptcyLimit = getBankruptcyLimit(initial, initialRevenue);

    setState(initial);
    setIsPlaying(true);
    setLastMonthOutcome("");
    setActiveTab("tab-event");
    setTenderResult(null);
    const chosenEvent = triggerRandomEvent(initial);
    generateTender(initial);
    saveState(initial, "", chosenEvent ? chosenEvent.id : null);
  };

  // Confirm and restart game (using upop)
  const confirmRestartGame = () => {
    upop.confirm.warning("¿Estás seguro de que deseas reiniciar la partida? Se perderán todos tus datos de juego.", {
      textoAceptar: "Reiniciar",
      textoCancelar: "Volver",
      onConfirm: () => handleRestart()
    });
  };

  const handleRestart = () => {
    localStorage.removeItem('platero_game_state');
    setState(DEFAULT_STATE);
    setIsPlaying(false);
    setShowGameOverModal(false);
    setShowElectionModal(false);
    setShowAnnualModal(false);
    setShowIpoModal(false);
    setCurrentEvent(null);
    setLastMonthOutcome("");
  };

  // Generates a public tender open for bids
  const generateTender = (currentState) => {
    if (["Justicialismo", "Comunismo"].includes(currentState.governmentType) || Math.random() < 0.45) {
      const netAssets = currentState.cash + (currentState.hedgedCash || 0) + (currentState.machineryCount * 80000) - currentState.debt;
      const scale = Math.max(1, Math.floor(netAssets / 120000));
      const baseBudget = 180000 + Math.floor(Math.random() * 220000);
      const budget = baseBudget * scale;
      setOpenTender({
        id: Math.floor(Math.random() * 10000),
        title: currentState.businessType === "construccion" ? "Pavimentación Vial Regional" :
               currentState.businessType === "software" ? "Sistemas de Catastro Tributario" :
               currentState.businessType === "industrial" ? "Lote de Estructuras Modulares" :
               currentState.businessType === "comercio" ? "Suministro de Logística de Alimentos" :
               currentState.businessType === "agropecuario" ? "Abastecimiento Agropecuario del Estado" :
               "Bonos de Deuda Soberana",
        budget,
        duration: 12,
        payoutPerMonth: Math.floor((budget * 1.1) / 12)
      });
      setHonestOffer(Math.floor(budget * 0.95));
      setBribeAmount(0);
      setTenderResult(null);
    } else {
      setOpenTender(null);
    }
  };

  // Live calculation of winning odds for tenders
  const calculateLiveOdds = () => {
    if (!openTender) return 0;
    const ratio = honestOffer / openTender.budget;
    let baseChance = 0.35 + (0.95 - ratio) * 0.5;
    baseChance += (state.politicalInfluence / 100) * 0.25;

    const bribeRatio = bribeAmount / openTender.budget;
    const bribeChance = bribeRatio * 2.5;

    return Math.floor(Math.min(95, Math.max(5, (baseChance + bribeChance) * 100)));
  };

  // Bidding processing logic
  const handleBidTender = () => {
    if (!openTender) return;
    if (state.cash < bribeAmount) {
      upop.alert.error("No tenés suficiente dinero en caja para pagar esa coima.");
      return;
    }

    const netAssets = state.cash + (state.hedgedCash || 0) + (state.machineryCount * 80000) - state.debt;
    const scale = Math.max(1, Math.floor(netAssets / 120000));
    const bidPrepCost = 8000 * scale;
    const liveOdds = calculateLiveOdds() / 100;
    const win = Math.random() < liveOdds;

    setState(prev => {
      const nextState = { ...prev };
      nextState.cash -= (bidPrepCost + bribeAmount);
      
      if (bribeAmount > 0) {
        nextState.corruptionRisk = Math.min(100, nextState.corruptionRisk + Math.floor(bribeAmount / (4500 * scale)) + 5);
        nextState.contacts = Math.min(100, nextState.contacts + Math.floor(bribeAmount / (6000 * scale)) + 3);
        nextState.stateDependence = Math.min(100, nextState.stateDependence + 10);
      }

      if (win) {
        const newContract = {
          id: openTender.id,
          title: openTender.title,
          monthlyRevenue: Math.floor(honestOffer / 12),
          turnsLeft: 12
        };
        nextState.activeTenders = [...nextState.activeTenders, newContract];
        nextState.stateDependence = Math.min(100, nextState.stateDependence + 15);
        nextState.historyLog.unshift(`[Licitación Ganada] Adjudicado contrato "${openTender.title}" (+$${Math.floor(honestOffer / 12)}/mes)`);
        setTenderResult(`¡ÉXITO! Adjudicatario oficial. Ingreso mensual: +$${Math.floor(honestOffer / 12)}.`);
      } else {
        nextState.historyLog.unshift(`[Licitación Perdida] Oferta rechazada en "${openTender.title}".`);
        setTenderResult(`Rechazado. Otro oferente se quedó con el pliego.`);
      }

      saveState(nextState);
      return nextState;
    });

    setOpenTender(null);
  };

  // Subsidies requested directly
  const confirmRequestSubsidy = () => {
    if (state.contacts < 25) {
      upop.toast.warning("No tenés suficientes contactos políticos.");
      return;
    }
    if (!["Justicialismo", "Comunismo"].includes(state.governmentType)) {
      upop.toast.warning("Este gobierno no otorga subsidios discrecionales.");
      return;
    }
    upop.confirm.info("¿Deseas solicitar un subsidio estatal de fomento productivo? Aumentará tu dependencia oficial.", {
      textoAceptar: "Solicitar",
      textoCancelar: "Cancelar",
      onConfirm: () => handleRequestSubsidy()
    });
  };

  const handleRequestSubsidy = () => {
    setState(prev => {
      const nextState = { ...prev };
      nextState.cash += 150000;
      nextState.stateDependence = Math.min(100, nextState.stateDependence + 25);
      nextState.historyLog.unshift(`[Subsidio] Recibiste $150.000 de fomento ministerial.`);
      saveState(nextState);
      upop.toast.success("¡Subsidio estatal otorgado!");
      return nextState;
    });
  };

  // Taking bank debt (using confirm)
  const confirmTakeLoan = () => {
    upop.confirm.info("¿Deseas tomar un crédito bancario de $100.000? Deberás pagar intereses mensuales.", {
      textoAceptar: "Tomar Crédito",
      textoCancelar: "Cancelar",
      onConfirm: () => handleTakeLoan()
    });
  };

  const handleTakeLoan = () => {
    setState(prev => {
      const nextState = { ...prev };
      nextState.cash += 100000;
      nextState.debt += 100000;
      nextState.historyLog.unshift(`[Finanzas] Préstamo tomado: +$100.000.`);
      saveState(nextState);
      upop.toast.success("¡Crédito de $100.000 acreditado!");
      return nextState;
    });
  };

  // Repaying bank debt (using confirm)
  const confirmPayLoan = () => {
    if (state.debt <= 0) return;
    const payAmt = Math.min(50000, state.debt);
    if (state.cash < payAmt) {
      upop.toast.warning("No tenés suficiente caja.");
      return;
    }
    upop.confirm.info(`¿Deseas pagar $${payAmt.toLocaleString()} para amortizar tu deuda acumulada?`, {
      textoAceptar: "Amortizar",
      textoCancelar: "Volver",
      onConfirm: () => handlePayLoan()
    });
  };

  const handlePayLoan = () => {
    setState(prev => {
      const nextState = { ...prev };
      const payAmt = Math.min(50000, state.debt);
      nextState.cash -= payAmt;
      nextState.debt -= payAmt;
      nextState.historyLog.unshift(`[Finanzas] Devolución deuda: -$${payAmt}.`);
      saveState(nextState);
      upop.toast.success(`Amortizaste $${payAmt.toLocaleString()} de deuda.`);
      return nextState;
    });
  };

  // Buying machinery/assets — diminishing returns on efficiency, scaling cost
  const confirmBuyAsset = (count = 1) => {
    const assetDef = ASSETS_BY_INDUSTRY[state.businessType] || ASSETS_BY_INDUSTRY.industrial;
    let totalCost = 0;
    let totalGain = 0;
    for (let i = 0; i < count; i++) {
      totalCost += getNextAssetCost(state.machineryCount + i);
      totalGain += getAssetEfficiencyGain(state.machineryCount + i);
    }
    
    if (state.cash < totalCost) {
      upop.toast.warning(`Falta capital para esta inversión ($${totalCost.toLocaleString()}).`);
      return;
    }
    
    const assetName = count === 1 ? (assetDef.singular || "activo") : (assetDef.plural || "activos");
    upop.confirm.success(`¿Invertir $${totalCost.toLocaleString()} en comprar x${count} ${assetName}? Sube eficiencia en +${totalGain}%.`, {
      textoAceptar: "Invertir",
      textoCancelar: "Cancelar",
      onConfirm: () => handleBuyAsset(count)
    });
  };

  const handleBuyAsset = (count = 1) => {
    setState(prev => {
      const nextState = { ...prev };
      const assetDef = ASSETS_BY_INDUSTRY[prev.businessType] || ASSETS_BY_INDUSTRY.industrial;
      let totalCost = 0;
      let totalGain = 0;
      for (let i = 0; i < count; i++) {
        totalCost += getNextAssetCost(prev.machineryCount + i);
        totalGain += getAssetEfficiencyGain(prev.machineryCount + i);
      }
      
      nextState.cash -= totalCost;
      nextState.machineryCount += count;
      nextState.efficiency = Math.min(200, nextState.efficiency + totalGain);
      nextState.independence = Math.min(100, nextState.independence + (5 * count));
      
      const assetName = count === 1 ? (assetDef.singular || "activo") : (assetDef.plural || "activos");
      nextState.historyLog.unshift(`[Activos] Compraste x${count} ${assetName} por $${totalCost.toLocaleString()}.`);
      saveState(nextState);
      upop.toast.success(`Inversión completada: x${count} ${assetName} incorporados.`);
      return nextState;
    });
  };

  // Mantenimiento preventivo — frena la depreciación y sube +3% eficiencia
  const confirmMaintenance = () => {
    const cost = getMaintenanceCost(state.machineryCount);
    if (state.machineryCount === 0) {
      upop.toast.warning("No tenés activos para mantener. Comprá maquinaria primero.");
      return;
    }
    if (state.cash < cost) {
      upop.toast.warning(`Falta caja para mantenimiento preventivo ($${cost.toLocaleString()}).`);
      return;
    }
    upop.confirm.success(
      `¿Invertir $${cost.toLocaleString()} en mantenimiento preventivo de tus activos? Reducirá la depreciación mensual y recuperará +3% de Eficiencia.`,
      {
        textoAceptar: "Mantener",
        textoCancelar: "Cancelar",
        onConfirm: () => handleMaintenance()
      }
    );
  };

  const handleMaintenance = () => {
    setState(prev => {
      const nextState = { ...prev };
      const cost = getMaintenanceCost(prev.machineryCount);
      nextState.cash -= cost;
      nextState.efficiency = Math.min(200, nextState.efficiency + 3);
      // Mark that maintenance was done this month — skip natural depreciation
      nextState.maintenanceDoneThisTurn = true;
      nextState.historyLog.unshift(`[Activos] Mantenimiento preventivo realizado (-$${cost.toLocaleString()}). +3% Eficiencia, depreciación frenada.`);
      saveState(nextState);
      upop.toast.success("Mantenimiento preventivo completado.");
      return nextState;
    });
  };

  const confirmBuyRawMaterials = () => {
    const cost = 8000 + state.employees * 1500;
    if (state.rawMaterialStock >= 6) {
      upop.toast.warning("Ya tenés el depósito lleno de materias primas (límite de 6 meses).");
      return;
    }
    if (state.cash < cost) {
      upop.toast.warning(`Falta caja para acopiar insumos ($${cost.toLocaleString()}).`);
      return;
    }
    upop.confirm.info(
      `¿Adquirir 1 mes adicional de materias primas y repuestos por $${cost.toLocaleString()}? Protege la producción contra el cepo y cortes de cadena de valor.`,
      {
        textoAceptar: "Acopiar",
        textoCancelar: "Cancelar",
        onConfirm: () => handleBuyRawMaterials()
      }
    );
  };

  const handleBuyRawMaterials = () => {
    setState(prev => {
      const nextState = { ...prev };
      const cost = 8000 + prev.employees * 1500;
      nextState.cash -= cost;
      nextState.rawMaterialStock = Math.min(6, (nextState.rawMaterialStock || 0) + 1);
      nextState.historyLog.unshift(`[Abasto] Compraste 1 mes de stock de materias primas e insumos (-$${cost.toLocaleString()}).`);
      saveState(nextState);
      upop.toast.success("Insumos acopiados correctamente.");
      return nextState;
    });
  };

  const handleHedgeDeposit = (amount) => {
    setState(prev => {
      const nextState = { ...prev };
      const actualAmount = amount === 'all' ? prev.cash : amount;
      if (actualAmount <= 0) {
        upop.toast.warning("No tenés efectivo libre.");
        return prev;
      }
      if (prev.cash < actualAmount) {
        upop.toast.warning("No tenés suficiente efectivo libre.");
        return prev;
      }
      
      nextState.cash -= actualAmount;
      nextState.hedgedCash = (nextState.hedgedCash || 0) + actualAmount;
      nextState.historyLog.unshift(`[Mesa] Colocaste $${actualAmount.toLocaleString()} en fondos de cobertura protegidos contra inflación.`);
      saveState(nextState);
      upop.toast.success("Fondos invertidos en cobertura.");
      return nextState;
    });
  };

  const handleHedgeWithdraw = (amount) => {
    setState(prev => {
      const nextState = { ...prev };
      const availablePrev = prev.hedgedCash || 0;
      const actualAmount = amount === 'all' ? availablePrev : amount;
      if (actualAmount <= 0) {
        upop.toast.warning("No tenés fondos invertidos en cobertura.");
        return prev;
      }
      if (actualAmount > availablePrev) {
        upop.toast.warning("El monto supera el saldo invertido.");
        return prev;
      }
      
      nextState.hedgedCash = availablePrev - actualAmount;
      nextState.cash += actualAmount;
      nextState.historyLog.unshift(`[Mesa] Rescataste $${actualAmount.toLocaleString()} de cobertura a tu caja líquida.`);
      saveState(nextState);
      upop.toast.success("Fondos rescatados.");
      return nextState;
    });
  };

  const handleToggleTaxPlanning = () => {
    setState(prev => {
      const nextState = { ...prev };
      nextState.taxPlanningEnabled = !prev.taxPlanningEnabled;
      const status = nextState.taxPlanningEnabled ? "ACTIVADA" : "DESACTIVADA";
      nextState.historyLog.unshift(`[Impuestos] Asesoría y planificación fiscal corporativa ${status}. Costo mensual: $3.000.`);
      saveState(nextState);
      upop.toast.success(`Planificación fiscal ${nextState.taxPlanningEnabled ? 'contratada' : 'cancelada'}.`);
      return nextState;
    });
  };

  const handleChangeMarketingCampaign = (campaignType) => {
    setState(prev => {
      const nextState = { ...prev, marketingCampaign: campaignType };
      saveState(nextState);
      
      const campaignNames = {
        none: "Sin campaña activa",
        digital: "Campaña de Marketing Digital",
        mass_media: "Campaña de Prensa y TV",
        b2b: "Fuerza de Ventas B2B"
      };
      
      upop.toast.success(`Estrategia de captación actualizada a: ${campaignNames[campaignType]}.`);
      return nextState;
    });
  };



  // Hiring employees (using confirm)
  const confirmHireEmployee = (count = 1) => {
    upop.confirm.success(`¿Deseas contratar x${count} operarios? Aumentará tus costos fijos de nómina mensuales.`, {
      textoAceptar: "Contratar",
      textoCancelar: "Cancelar",
      onConfirm: () => handleHireEmployee(count)
    });
  };

  const handleHireEmployee = (count = 1) => {
    setState(prev => {
      const nextState = { ...prev };
      nextState.employees += count;
      nextState.historyLog.unshift(`[Personal] Contrataste x${count} operarios.`);
      saveState(nextState);
      upop.toast.success(`x${count} operarios contratados.`);
      return nextState;
    });
  };

  // Firing employees (using confirm)
  const confirmFireEmployee = (count = 1) => {
    if (state.employees <= count) {
      upop.toast.warning("No podés despedir a todos tus empleados.");
      return;
    }
    const cost = 3000 * count;
    if (state.cash < cost) {
      upop.toast.warning(`No tenés caja para pagar la indemnización ($${cost.toLocaleString()}).`);
      return;
    }
    upop.confirm.error(`¿Deseas despedir x${count} operarios? Pagarás una indemnización de $${cost.toLocaleString()} inmediatamente.`, {
      textoAceptar: "Despedir",
      textoCancelar: "Cancelar",
      onConfirm: () => handleFireEmployee(count)
    });
  };

  const handleFireEmployee = (count = 1) => {
    setState(prev => {
      const nextState = { ...prev };
      const cost = 3000 * count;
      nextState.cash -= cost;
      nextState.employees -= count;
      nextState.historyLog.unshift(`[Personal] x${count} operarios despedidos. Indemnizaciones: -$${cost.toLocaleString()}.`);
      saveState(nextState);
      upop.toast.success(`x${count} operarios despedidos.`);
      return nextState;
    });
  };

  // Stock Market (IPO) Launch
  const handleLaunchIPO = () => {
    if (state.stage !== "Empresa Consolidada" && state.stage !== "Corporación Nacional" && state.stage !== "Pulpo Económico / Magnate") {
      upop.alert.error("No tenés suficiente rango de mercado para salir a bolsa. Requiere rango de Empresa Consolidada o superior.");
      return;
    }

    // Qualification: company must be profitable (positive projected monthly net)
    if (projNet <= 0) {
      upop.alert.error("Tu empresa no es rentable. El mercado no acepta una IPO de una empresa en pérdidas. Mejora tus ganancias mensuales primero.");
      return;
    }

    // MARKET VALUATION (P/E based, not book value)
    // P/E multiple: base 12x + reputation premium (up to +10x) + innovation premium (up to +5x)
    // Annualized earnings = projNet * 12
    const annualizedEarnings = projNet * 12;
    const basePe = 12 + Math.floor((state.reputation / 100) * 10) + Math.floor((state.innovation / 100) * 5);
    const peMultiple = Math.max(1, Math.floor(basePe * getGovPeMultiplier(state.governmentType)));
    const marketCap = Math.floor(annualizedEarnings * peMultiple);
    const ipoSharePrice = Math.max(10, Math.floor(marketCap / 100));
    const cashGained = ipoSharePrice * ipoSharesToSell;

    setState(prev => {
      const nextState = { ...prev };
      nextState.isPublic = true;
      nextState.sharesSold = ipoSharesToSell;
      nextState.sharePrice = ipoSharePrice;
      nextState.cash += cashGained;
      nextState.annualSharePriceStart = ipoSharePrice;
      nextState.annualDividendsPaid = 0;
      nextState.independence = Math.max(0, nextState.independence - Math.floor(ipoSharesToSell / 2));
      nextState.historyLog.unshift(`[BOLSA] ¡Salida a Bolsa Exitosa! Vendiste el ${ipoSharesToSell}% de tu empresa. Cap. de mercado: $${marketCap.toLocaleString()} (P/E ${peMultiple}x). Caja: +$${cashGained.toLocaleString()}.`);
      saveState(nextState);
      return nextState;
    });

    setShowIpoModal(false);
    upop.alert.success(`¡OFERTA PÚBLICA EXITOSA!\nCapitalización de mercado: $${marketCap.toLocaleString()} (P/E ${peMultiple}x)\nIngresaron $${cashGained.toLocaleString()} a tu caja.`);
  };

  // Stock Repurchase (Buyback)
  const confirmBuybackShares = () => {
    if (state.sharesSold < buybackPercentage) {
      upop.toast.warning("No podés recomprar más acciones de las que están en manos públicas.");
      return;
    }
    const cost = state.sharePrice * buybackPercentage;
    if (state.cash < cost) {
      upop.toast.warning(`No tenés suficiente dinero en caja para recomprar el ${buybackPercentage}% ($${cost.toLocaleString()}).`);
      return;
    }
    upop.confirm.success(`¿Deseas recomprar el ${buybackPercentage}% de tus acciones por $${cost.toLocaleString()} del público?`, {
      textoAceptar: "Recomprar",
      textoCancelar: "Cancelar",
      onConfirm: () => handleBuybackShares()
    });
  };

  const handleBuybackShares = () => {
    setState(prev => {
      const nextState = { ...prev };
      const cost = state.sharePrice * buybackPercentage;
      nextState.cash -= cost;
      nextState.sharesSold -= buybackPercentage;
      nextState.independence = Math.min(100, nextState.independence + Math.floor(buybackPercentage / 2));
      nextState.sharePrice = Math.floor(nextState.sharePrice * 1.05);
      
      if (nextState.sharesSold <= 0) {
        nextState.isPublic = false;
      }
      nextState.historyLog.unshift(`[Bolsa] Recompraste ${buybackPercentage}% de tus acciones por $${cost.toLocaleString()}.`);
      saveState(nextState);
      upop.toast.success(`Recompraste el ${buybackPercentage}% de las acciones.`);
      return nextState;
    });
  };

  // Financing election campaigns
  const handleFundCampaign = (partyName, cost) => {
    if (state.cash < cost) {
      upop.toast.warning("Dinero insuficiente para financiar la campaña.");
      return;
    }
    setState(prev => {
      const next = { ...prev };
      next.cash -= cost;
      next.electionSupport = partyName;
      next.corruptionRisk = Math.min(100, next.corruptionRisk + 10);
      next.historyLog.unshift(`[Lobby] Aportaste $${cost.toLocaleString()} a la campaña de ${partyName}.`);
      saveState(next);
      return next;
    });
    upop.toast.success(`Aporte registrado. ${partyName} tiene ahora +20% de probabilidades de ganar.`);
  };

  // Vender más acciones en el mercado secundario
  const confirmSellMoreShares = () => {
    const extraShares = 5;
    if (state.sharesSold + extraShares > 49) {
      upop.toast.warning("No podés vender más del 49% de tu empresa para no perder el control mayoritario.");
      return;
    }
    const cashGained = state.sharePrice * extraShares;
    upop.confirm.warning(`¿Deseas emitir y vender 5% adicional de acciones al público por $${cashGained.toLocaleString()}?`, {
      textoAceptar: "Vender",
      textoCancelar: "Cancelar",
      onConfirm: () => handleSellMoreShares()
    });
  };

  const handleSellMoreShares = () => {
    const extraShares = 5;
    const cashGained = state.sharePrice * extraShares;
    setState(prev => {
      const nextState = { ...prev };
      nextState.cash += cashGained;
      nextState.sharesSold += extraShares;
      nextState.independence = Math.max(0, nextState.independence - 3);
      nextState.sharePrice = Math.floor(nextState.sharePrice * 0.96);
      nextState.historyLog.unshift(`[Bolsa] Vendiste ${extraShares}% adicional de tus acciones por $${cashGained.toLocaleString()}.`);
      saveState(nextState);
      upop.toast.success(`Emitiste y vendiste 5% adicional de acciones.`);
      return nextState;
    });
  };

  const triggerRandomEvent = (currentState) => {
    let eligible = events.filter(ev => ev.trigger(currentState) && !currentState.usedEventIds.includes(ev.id));
    if (eligible.length === 0) {
       currentState.usedEventIds = currentState.usedEventIds.slice(-15); 
       eligible = events.filter(ev => ev.trigger(currentState) && !currentState.usedEventIds.includes(ev.id));
    }

    if (eligible.length > 0) {
      const chosen = eligible[Math.floor(Math.random() * eligible.length)];
      setCurrentEvent(chosen);
      return chosen;
    } else {
      const defaultEv = {
        id: 0,
        title: "Mes de Transición Económica",
        category: "MACROECONOMÍA",
        description: "El mercado se encuentra estable, la inflación da una tregua temporal y los sindicatos están en calma. Aprovecha para reorganizar tus planes operativos.",
        options: [
          {
            text: "Continuar gestionando la empresa...",
            outcomeText: "El mes pasa con tranquilidad.",
            action: (state) => {
              state.historyLog.unshift(`[Mes ${state.turn}] Mes tranquilo de planificación.`);
            }
          }
        ]
      };
      setCurrentEvent(defaultEv);
      return defaultEv;
    }
  };

  // Resolves narrative choice AND triggers month financial update automatically
  const handleSelectOption = (option) => {
    const nextState = { ...state };
    
    if (option.condition && !option.condition(nextState)) {
      upop.toast.error(`Opción bloqueada: ${option.conditionText}`);
      return;
    }

    // 1. Resolve event option action with dynamic scale mapping
    const oldCash = nextState.cash;
    const oldDebt = nextState.debt;
    option.action(nextState);
    
    const cashDelta = nextState.cash - oldCash;
    const debtDelta = nextState.debt - oldDebt;
    
    const isPersonal = currentEvent && currentEvent.category === "PERSONAL";
    const netAssets = oldCash + (nextState.hedgedCash || 0) + (nextState.machineryCount * 80000) - oldDebt;
    const scale = isPersonal ? 1 : Math.max(1, Math.floor(netAssets / 120000));
    
    nextState.cash = oldCash + (cashDelta * scale);
    nextState.debt = oldDebt + (debtDelta * scale);
    
    const rawOutcome = typeof option.outcomeText === 'function' ? option.outcomeText(nextState) : option.outcomeText;
    const eventOutcome = scaleText(rawOutcome, scale);

    if (currentEvent && currentEvent.id !== 0) {
      nextState.usedEventIds = [...nextState.usedEventIds, currentEvent.id];
    }

    // 2. Perform monthly financial updates (End of Month Tick)
    const template = INDUSTRIES[nextState.businessType];
    const govDef = GOVERNMENTS[nextState.governmentType] || GOVERNMENTS.Radicalismo;

    // Marketing Campaign Expenses and Gains
    let marketingCost = 0;
    let marketingClientGain = 0;
    let marketingRepGain = 0;

    const isEstanflacion = nextState.economicCycle === "Estanflación";
    const isRecesion = nextState.economicCycle === "Recesión";

    if (nextState.marketingCampaign === "digital") {
      marketingCost = 5000;
      marketingClientGain = 1 + Math.floor(Math.random() * 3); // 1-3 clients
      marketingRepGain = 1;
    } else if (nextState.marketingCampaign === "mass_media") {
      marketingCost = 25000;
      marketingClientGain = 5 + Math.floor(Math.random() * 6); // 5-10 clients
      marketingRepGain = 2;
    } else if (nextState.marketingCampaign === "b2b") {
      marketingCost = 80000;
      marketingClientGain = 15 + Math.floor(Math.random() * 11); // 15-25 clients
      marketingRepGain = 3;
    }

    if (isEstanflacion || isRecesion) {
      marketingClientGain = Math.floor(marketingClientGain * 0.5);
      marketingRepGain = Math.max(0, marketingRepGain - 1);
    }

    // Enforce client capacity per employee
    const maxCapacity = nextState.employees * (template.capacityPerEmployee || 20);
    const servedClients = Math.min(nextState.clients, maxCapacity);
    const unservedClients = Math.max(0, nextState.clients - maxCapacity);
    
    let bottleneckText = "";
    if (unservedClients > 0) {
      nextState.reputation = Math.max(0, nextState.reputation - Math.min(5, Math.ceil(unservedClients * 0.1)));
      // Unserved clients leave next month
      nextState.clients = Math.max(10, nextState.clients - Math.floor(unservedClients * 0.25) - 2);
      bottleneckText = ` | ⚠️ Clientes no atendidos: -${unservedClients}`;
    }

    // Revenues (Cycle and Government affects client margin, based on served clients)
    const clientBaseMargin = (() => {
      if (!template) return 0;
      let base = template.baseMargin;
      if (nextState.economicCycle === "Recesión") base = Math.floor(base * 0.82);
      if (nextState.economicCycle === "Crecimiento") base = Math.floor(base * 1.12);
      if (nextState.governmentType === "Justicialismo") base = Math.floor(base * 1.05);
      return base;
    })();
    const clientRevenue = Math.floor(servedClients * clientBaseMargin * nextState.priceMultiplier);
    
    let tenderRevenue = 0;
    nextState.activeTenders = nextState.activeTenders.map(t => {
      tenderRevenue += t.monthlyRevenue;
      return { ...t, turnsLeft: t.turnsLeft - 1 };
    }).filter(t => t.turnsLeft > 0);

    const totalRevenue = clientRevenue + tenderRevenue;

    // Expenses (Estanflación increases operating costs by 30%. Justicialismo by 15%)
    const salaryCost = nextState.employees * nextState.salaryPerEmployee;
    
    // Raw materials stock check & penalty
    let supplyShortagePenalty = false;
    if (nextState.rawMaterialStock > 0) {
      nextState.rawMaterialStock -= 1;
    } else {
      const isCrisis = ["Recesión", "Estanflación"].includes(nextState.economicCycle);
      const isInterventor = ["Justicialismo", "Comunismo"].includes(nextState.governmentType);
      if (isCrisis || isInterventor) {
        supplyShortagePenalty = true;
      }
    }

    let opCostMultiplier = nextState.economicCycle === "Estanflación" ? 1.30 : 1.0;
    if (nextState.governmentType === "Justicialismo") opCostMultiplier *= 1.15; // labor overheads
    
    // Scale fixed operating cost based on current company stage (includes hedgedCash in net worth)
    const tempNetAssets = nextState.cash + (nextState.hedgedCash || 0) + (nextState.machineryCount * 80000) - nextState.debt;
    const stageMultiplier = (() => {
      if (tempNetAssets < 150000) return 1.0;
      if (tempNetAssets < 500000) return 1.5;
      if (tempNetAssets < 1500000) return 2.5;
      if (tempNetAssets < 5000000) return 5.0;
      return 10.0;
    })();
    
    const fixedCostBase = template.fixedOpCost || 10000;
    const stageFixedCost = Math.floor(fixedCostBase * stageMultiplier);
    // Efficiency now scales up to 200. At 100 = -37.5% costs, at 200 = -62.5% costs (diminishing returns curve)
    const efficiencyFactor = Math.max(0.375, 1 - (nextState.efficiency / 320));
    let variableCost = Math.floor(servedClients * template.baseOpCost * opCostMultiplier * efficiencyFactor);
    if (supplyShortagePenalty) {
      variableCost = Math.floor(variableCost * 1.25); // +25% cost of goods sold due to supply issues
      nextState.efficiency = Math.max(5, nextState.efficiency - 2);
    }
    const operatingCost = stageFixedCost + variableCost;
    
    // Tax Shield check (using Gov taxRate)
    let taxRate = govDef.taxRate;
    if (nextState.governmentType === "Provincianismo" && (nextState.businessType === "industrial" || nextState.businessType === "construccion")) {
      taxRate = Math.max(0.05, taxRate - 0.05); // provincial tax break
    }
    if (nextState.panamaTaxShield) {
      taxRate = taxRate * 0.5;
    }
    if (nextState.taxPlanningEnabled) {
      taxRate = Math.max(0.02, taxRate - 0.05); // -5% legal tax reduction
      nextState.corruptionRisk = Math.max(0, nextState.corruptionRisk - 1);
    }
    const taxCost = Math.floor(totalRevenue * taxRate);
    
    // Interest rates (using Gov interestRate + cycle premium)
    const interestBaseRate = govDef.interestRate;
    const interestRate = nextState.economicCycle === "Estanflación" ? interestBaseRate + 0.03 : interestBaseRate;
    const interestCost = Math.floor(nextState.debt * interestRate);

    // Overdraft interest if starting cash is negative
    let overdraftInterest = 0;
    if (nextState.cash < 0) {
      const overdraftRate = (interestRate + 0.04) / 12;
      overdraftInterest = Math.floor(Math.abs(nextState.cash) * overdraftRate);
      nextState.historyLog.unshift(`[Finanzas] Recargo por descubierto bancario: -$${overdraftInterest.toLocaleString()}.`);
    }

    const taxPlanningCost = nextState.taxPlanningEnabled ? 3000 : 0;
    const totalExpenses = salaryCost + operatingCost + taxCost + interestCost + Number(nextState.rndInvestment) + taxPlanningCost + marketingCost + overdraftInterest;
    let netProfit = totalRevenue - totalExpenses;

    // 3. SHAREHOLDER DIVIDENDS & SHARE PRICE FLUCTUATIONS
    let dividendCost = 0;
    if (nextState.isPublic && netProfit > 0) {
      dividendCost = Math.floor(netProfit * (nextState.sharesSold / 100));
      nextState.cash += (netProfit - dividendCost);
      nextState.annualDividendsPaid += dividendCost;
      nextState.historyLog.unshift(`[Bolsa] Pagaste $${dividendCost.toLocaleString()} en dividendos al sector público.`);
    } else {
      nextState.cash += netProfit;
    }

    // Hedge yield & Inflation loss process
    const hedgeYield = nextState.economicCycle === "Estanflación" ? 0.0075 : 0.0045;
    const yieldAmount = Math.floor((nextState.hedgedCash || 0) * hedgeYield);
    if (yieldAmount > 0) {
      nextState.hedgedCash += yieldAmount;
      nextState.historyLog.unshift(`[Inversión] Tus fondos de cobertura rindieron +$${yieldAmount.toLocaleString()}.`);
    }

    const inflationRate = nextState.governmentType === "Comunismo" ? 0.05 : nextState.governmentType === "Justicialismo" ? 0.03 : nextState.economicCycle === "Estanflación" ? 0.04 : 0.0;
    if (inflationRate > 0 && nextState.cash > 0) {
      const loss = Math.floor(nextState.cash * inflationRate);
      nextState.cash -= loss;
      nextState.historyLog.unshift(`[Inflación] La inflación devoró -$${loss.toLocaleString()} de tu caja líquida en pesos.`);
    }

    if (supplyShortagePenalty) {
      nextState.historyLog.unshift(`[Abasto] Desabastecimiento de insumos. +25% costos variables y -2% eficiencia.`);
    }

    // Update share price drift (realistic P/E-based model + market noise)
    if (nextState.isPublic) {
      const trailingAnnualEarnings = netProfit * 12; // annualize current month's net
      const basePe = 12 + Math.floor((nextState.reputation / 100) * 10) + Math.floor((nextState.innovation / 100) * 5);
      const peMultiple = Math.max(1, Math.floor(basePe * getGovPeMultiplier(nextState.governmentType)));
      const fairValueMarketCap = trailingAnnualEarnings > 0
        ? Math.floor(trailingAnnualEarnings * peMultiple)
        : Math.max(1000, nextState.cash - nextState.debt);
      const targetPrice = Math.max(10, Math.floor(fairValueMarketCap / 100));

      const gap = targetPrice - nextState.sharePrice;
      const adjustment = Math.floor(gap * 0.08);

      const noisePercent = -0.015 + Math.random() * 0.04;
      const noise = Math.floor(nextState.sharePrice * noisePercent);

      nextState.sharePrice = Math.max(10, nextState.sharePrice + adjustment + noise);
    }

    // Accumulate annual totals
    nextState.annualRevenue += totalRevenue;
    nextState.annualExpenses += totalExpenses;
    nextState.annualTaxes += taxCost;
    nextState.annualNet += (netProfit - dividendCost);

    // === EFFICIENCY DEPRECIATION (monthly) ===
    // Assets get outdated, staff rotates, processes degrade without investment
    // Depreciation rate grows with machinery count (bigger fleet = harder to keep updated)
    // Maintenance action this turn prevents depreciation
    if (!nextState.maintenanceDoneThisTurn) {
      const baseDepreciation = nextState.machineryCount > 0
        ? 1 + Math.floor(nextState.machineryCount / 4) // +1% per 4 assets
        : 1;
      const depreciationHit = nextState.economicCycle === "Estanflación" ? baseDepreciation + 1 : baseDepreciation;
      nextState.efficiency = Math.max(5, nextState.efficiency - depreciationHit);
    }
    nextState.maintenanceDoneThisTurn = false;

    // R&D & Salary effects on efficiency (can push above 100, up to 200)
    if (nextState.rndInvestment > 0) {
      nextState.innovation = Math.min(100, nextState.innovation + Math.floor((nextState.rndInvestment / 8000) + 1));
      // R&D improves efficiency — more impactful at higher investment levels
      const rndEffGain = Math.floor((nextState.rndInvestment / 10000) + 0.5);
      nextState.efficiency = Math.min(200, nextState.efficiency + rndEffGain);
    }

    if (nextState.salaryPerEmployee > 1600) {
      nextState.efficiency = Math.min(200, nextState.efficiency + 2); // motivated workforce
    } else if (nextState.salaryPerEmployee < 1400) {
      nextState.efficiency = Math.max(5, nextState.efficiency - 4); // brain drain, low morale
    }

    // Client growth/decay based on price multiplier, reputation, and macro cycle
    if (nextState.priceMultiplier > 1.2) {
      nextState.clients = Math.max(10, nextState.clients - Math.floor(nextState.clients * 0.05));
    } else if (nextState.priceMultiplier < 0.9) {
      // Promotional price growth is slowed down, and halved in stagflation
      const multiplierFactor = isEstanflacion ? 0.015 : 0.03;
      nextState.clients = Math.min(10000, nextState.clients + Math.floor(nextState.clients * multiplierFactor) + 1);
    }

    if (!isEstanflacion) {
      if (nextState.reputation > 70) {
        const repGrowthFactor = (nextState.reputation - 70) / 1200;
        const repGain = Math.floor(nextState.clients * repGrowthFactor) + 1;
        nextState.clients = Math.min(10000, nextState.clients + repGain);
      } else if (nextState.reputation < 35) {
        const repDecayFactor = (35 - nextState.reputation) / 600;
        const repLoss = Math.floor(nextState.clients * repDecayFactor) + 1;
        nextState.clients = Math.max(10, nextState.clients - repLoss);
      }

      // Government specific organic growth
      if (nextState.governmentType === "Liberalismo") {
        nextState.clients = Math.min(10000, nextState.clients + 5);
      } else if (nextState.governmentType === "Radicalismo") {
        nextState.clients = Math.min(10000, nextState.clients + 2);
      } else if (nextState.governmentType === "Provincianismo" && ["industrial", "construccion"].includes(nextState.businessType)) {
        nextState.clients = Math.min(10000, nextState.clients + 3);
      }
    }

    // Apply marketing campaign gains
    if (marketingClientGain > 0) {
      nextState.clients = Math.min(10000, nextState.clients + marketingClientGain);
    }
    if (marketingRepGain > 0) {
      nextState.reputation = Math.min(100, nextState.reputation + marketingRepGain);
    }

    if (nextState.marketingCampaign !== "none" && marketingCost > 0) {
      const campaignNames = {
        digital: "Marketing Digital",
        mass_media: "Prensa y TV",
        b2b: "Fuerza de Ventas B2B"
      };
      nextState.historyLog.unshift(`[Marketing] Campaña ${campaignNames[nextState.marketingCampaign]} activa: -$${marketingCost.toLocaleString()} | +${marketingClientGain} clientes, +${marketingRepGain}% reputación.`);
    }

    // Comunismo suppresses private market and sets wages by decree
    if (nextState.governmentType === "Comunismo") {
      nextState.clients = Math.max(5, nextState.clients - Math.floor(nextState.clients * 0.05) - 1);
      nextState.salaryPerEmployee = 1400; // Decree
    }

    // Crisis client attrition in recession
    if (isRecesion) {
      nextState.clients = Math.max(10, nextState.clients - Math.floor(nextState.clients * 0.02) - 1);
    }

    // State alignment balance
    if (tenderRevenue > 0) {
      nextState.independence = Math.max(0, nextState.independence - 8);
    } else {
      nextState.independence = Math.min(100, nextState.independence + 4);
    }

    // Log monthly summary
    nextState.historyLog.unshift(`[Balance Mes ${nextState.turn}] Ingresos: $${totalRevenue} | Gastos: $${totalExpenses} | Neto: ${netProfit >= 0 ? '+' : ''}$${netProfit}.`);

    // Check bankrupt — no upper victory limit (open-ended sandbox)
    const nextNetAssets = nextState.cash + (nextState.hedgedCash || 0) + (nextState.machineryCount * 80000) - nextState.debt;
    const activeLimit = getActiveBankruptcyLimit(nextState, totalRevenue);
    if (nextState.cash < -activeLimit) {
      setGameOverReason("bankruptcy");
      setShowGameOverModal(true);
      return;
    }
    nextState.bankruptcyLimit = activeLimit;

    // Progression Milestones
    if (nextNetAssets < 150000) {
      nextState.stage = "Emprendedor de Barrio";
    } else if (nextNetAssets < 500000) {
      nextState.stage = "Pyme Familiar";
    } else if (nextNetAssets < 1500000) {
      nextState.stage = "Empresa Consolidada";
    } else if (nextNetAssets < 5000000) {
      nextState.stage = "Corporación Nacional";
    } else {
      nextState.stage = "Pulpo Económico / Magnate";
    }

    // Elections Timer
    nextState.govTurnsLeft -= 1;
    let govFlip = false;
    let oldGov = nextState.governmentType;
    let newGov = oldGov;

    if (nextState.govTurnsLeft <= 0) {
      govFlip = true;
      const odds = calculateElectionOdds(nextState);
      newGov = rollElection(odds);
      nextState.governmentType = newGov;
      nextState.govTurnsLeft = 24;
      nextState.electionSupport = ""; // Reset supported campaign
      
      // Dynamic reactions to election outcomes
      if (newGov === "Liberalismo") {
        nextState.activeTenders = [];
        nextState.stateDependence = Math.max(0, nextState.stateDependence - 30);
        if (nextState.isPublic) {
          nextState.sharePrice = Math.floor(nextState.sharePrice * 1.40); // +40% stock rally
          nextState.historyLog.unshift(`[Bolsa] RALLY HISTÓRICO: La acción subió +40% tras la victoria del Liberalismo.`);
        }
      } else if (newGov === "Justicialismo") {
        if (nextState.isPublic) {
          nextState.sharePrice = Math.max(10, Math.floor(nextState.sharePrice * 0.70)); // -30% country-risk drop
          nextState.historyLog.unshift(`[Bolsa] CAÍDA: La cotización bajó -30% tras la victoria del Justicialismo.`);
        }
        // Expropriation risk under Justicialismo (15% chance of losing 1 asset if player has more than 3 assets)
        if (nextState.machineryCount > 3 && Math.random() < 0.15) {
          nextState.machineryCount -= 1;
          const assetName = ASSETS_BY_INDUSTRY[nextState.businessType]?.singular || "activo";
          nextState.historyLog.unshift(`[Expropiación] El nuevo gobierno justicialista estatizó 1 ${assetName} clave para regular producción.`);
          upop.alert.error(`¡Expropiación Justicialista! El nuevo gobierno expropió 1 ${assetName} de tu flota en pos del bien social.`);
        }
      } else if (newGov === "Comunismo") {
        if (nextState.isPublic) {
          nextState.sharePrice = Math.max(10, Math.floor(nextState.sharePrice * 0.30)); // -70% crash
          nextState.historyLog.unshift(`[Bolsa] DERRUMBE DE ACCIONES: La cotización se desplomó -70% por riesgo de confiscación comunista.`);
        }
        // Expropriation risk under Comunismo (Immediate confiscation of 25% of assets, minimum 1 if they have assets)
        if (nextState.machineryCount > 0) {
          const seized = Math.ceil(nextState.machineryCount * 0.25);
          nextState.machineryCount -= seized;
          const assetName = ASSETS_BY_INDUSTRY[nextState.businessType]?.singular || "activo";
          nextState.historyLog.unshift(`[Expropiación] El nuevo régimen comunista confiscó ${seized} ${assetName}(s) bajo la ley de utilidad nacional.`);
          upop.alert.error(`¡CONFISCACIÓN MASIVA! El régimen comunista expropió el 25% de tu capacidad operativa (${seized} ${assetName}s) sin indemnización.`);
        }
      }
      nextState.historyLog.unshift(`[🗳️ ELECCIONES] Ganó ${newGov}. ${GOVERNMENTS[newGov].description}`);
    }

    // Outcome summary
    const outcomeSummary = `Efecto: ${eventOutcome} (${netProfit >= 0 ? 'Ganancia' : 'Pérdida'} neta de este mes: ${netProfit >= 0 ? '+' : ''}$${(netProfit - dividendCost).toLocaleString()}${bottleneckText})`;
    setLastMonthOutcome(outcomeSummary);

    // 4. CHECK END OF FISCAL YEAR
    let triggerAnnualReport = false;
    if (nextState.turn > 1 && nextState.turn % 12 === 0) {
      triggerAnnualReport = true;
      
      const prevSharePrice = state.annualSharePriceStart || state.sharePrice || 10;
      const finalSharePrice = nextState.sharePrice;
      const stockReturn = nextState.isPublic ? Math.floor(((finalSharePrice - prevSharePrice) / prevSharePrice) * 100) : 0;

      const currentYearSummary = {
        year: Math.floor(nextState.turn / 12),
        revenue: nextState.annualRevenue,
        expenses: nextState.annualExpenses,
        taxes: nextState.annualTaxes,
        net: nextState.annualNet,
        clientGrowth: nextState.clients - nextState.annualClientsStart,
        dominance: stateBarometerVal > 50 ? "Contratista del Estado (Lobby / Contactos)" : "Independiente de Mercado (Eficiencia / R&D)",
        isPublic: nextState.isPublic,
        sharePriceStart: prevSharePrice,
        sharePriceEnd: finalSharePrice,
        stockReturn: stockReturn,
        dividendsPaid: nextState.annualDividendsPaid
      };

      setAnnualSummary({
        current: currentYearSummary,
        previous: state.lastYearSummary
      });
      
      // Save current year for next year's comparison
      nextState.lastYearSummary = currentYearSummary;

      // Roll a new macroeconomic cycle for the upcoming year
      const rand = Math.random();
      let nextCycle = "Normal";
      if (rand < 0.25) nextCycle = "Crecimiento";
      else if (rand < 0.45) nextCycle = "Recesión";
      else if (rand < 0.60) nextCycle = "Estanflación";
      nextState.economicCycle = nextCycle;
      
      const cycleMessages = {
        Normal: "El nuevo año comienza con estabilidad macroeconómica normal.",
        Crecimiento: "¡BOOM ECONÓMICO! Se proyecta un año de alto crecimiento del consumo interno.",
        Recesión: "¡CRISIS! Entramos en recesión. Disminuye la demanda del mercado privado y caen los ingresos.",
        Estanflación: "¡ESTANFLACIÓN! Inflación alta y estancamiento. Los costos operativos de insumos suben fuertemente."
      };
      nextState.historyLog.unshift(`[🌍 Macro] ${cycleMessages[nextCycle]}`);

      // Reset yearly stats
      nextState.annualRevenue = 0;
      nextState.annualExpenses = 0;
      nextState.annualTaxes = 0;
      nextState.annualNet = 0;
      nextState.annualDividendsPaid = 0;
      nextState.annualSharePriceStart = nextState.isPublic ? nextState.sharePrice : 0;
      nextState.annualClientsStart = nextState.clients;
    }

    // Increment month index
    nextState.turn += 1;

    // Load next event and generate next tender
    const nextEvent = triggerRandomEvent(nextState);
    generateTender(nextState);

    // Save final turn state
    setState(nextState);
    saveState(nextState, outcomeSummary, nextEvent ? nextEvent.id : null);
    


    if (triggerAnnualReport) {
      setShowAnnualModal(true);
    } else if (govFlip) {
      setElectionDetails({ oldGov, newGov });
      setShowElectionModal(true);
    }

    setActiveTab("tab-event");
  };

  const netAssetsVal = state.cash + (state.hedgedCash || 0) + (state.machineryCount * 80000) - state.debt;

  // Live monthly projection calculations (shown in left sidebar)
  const template = INDUSTRIES[state.businessType];
  const projMaxCapacity = state.employees * (template?.capacityPerEmployee || 20);
  const projServedClients = Math.min(state.clients, projMaxCapacity);

  const projClientBaseMargin = (() => {
    if (!template) return 0;
    if (state.economicCycle === "Recesión") return Math.floor(template.baseMargin * 0.82);
    if (state.economicCycle === "Crecimiento") return Math.floor(template.baseMargin * 1.12);
    return template.baseMargin;
  })();
  
  const projClientRevenue = template ? Math.floor(projServedClients * projClientBaseMargin * state.priceMultiplier) : 0;
  const projTenderRevenue = state.activeTenders.reduce((acc, t) => acc + t.monthlyRevenue, 0);
  const projTotalRevenue = projClientRevenue + projTenderRevenue;
  const projSalaryCost = state.employees * state.salaryPerEmployee;
  
  let projOpCostMultiplier = state.economicCycle === "Estanflación" ? 1.30 : 1.0;
  if (state.governmentType === "Justicialismo") projOpCostMultiplier *= 1.15;
  const projStageMultiplier = (() => {
    if (netAssetsVal < 150000) return 1.0;
    if (netAssetsVal < 500000) return 1.5;
    if (netAssetsVal < 1500000) return 2.5;
    if (netAssetsVal < 5000000) return 5.0;
    return 10.0;
  })();
  
  const projFixedCostBase = template?.fixedOpCost || 10000;
  const projStageFixedCost = Math.floor(projFixedCostBase * projStageMultiplier);
  let projVariableCost = template ? Math.floor(projServedClients * template.baseOpCost * projOpCostMultiplier * Math.max(0.375, 1 - state.efficiency / 320)) : 0;
  const willPenaltyApply = (state.rawMaterialStock || 0) === 0 && (["Recesión", "Estanflación"].includes(state.economicCycle) || ["Justicialismo", "Comunismo"].includes(state.governmentType));
  if (willPenaltyApply) {
    projVariableCost = Math.floor(projVariableCost * 1.25);
  }
  const projOpCost = projStageFixedCost + projVariableCost;
  
  const projTaxRate = (() => {
    const govDef = GOVERNMENTS[state.governmentType] || GOVERNMENTS.Radicalismo;
    let rate = govDef.taxRate;
    if (state.governmentType === "Provincianismo" && (state.businessType === "industrial" || state.businessType === "construccion")) {
      rate = Math.max(0.05, rate - 0.05);
    }
    if (state.panamaTaxShield) {
      rate = rate * 0.5;
    }
    if (state.taxPlanningEnabled) {
      rate = Math.max(0.02, rate - 0.05);
    }
    return rate;
  })();
  const projTaxCost = Math.floor(projTotalRevenue * projTaxRate);
  
  const projInterestBaseRate = (() => {
    const govDef = GOVERNMENTS[state.governmentType] || GOVERNMENTS.Radicalismo;
    return govDef.interestRate;
  })();
  const projInterestRate = state.economicCycle === "Estanflación" ? projInterestBaseRate + 0.03 : projInterestBaseRate;
  const projInterestCost = Math.floor(state.debt * projInterestRate);
  
  const projTaxPlanningCost = state.taxPlanningEnabled ? 3000 : 0;
  const projRndCost = Number(state.rndInvestment);
  const projTotalCost = projSalaryCost + projOpCost + projTaxCost + projInterestCost + projRndCost + projTaxPlanningCost;
  const projNet = projTotalRevenue - projTotalCost;

  // Valuation helper (Estimated Market Cap or Exchange Market Cap)
  const baseCurrentPe = 12 + Math.floor((state.reputation / 100) * 10) + Math.floor((state.innovation / 100) * 5);
  const currentPeMultiple = Math.max(1, Math.floor(baseCurrentPe * getGovPeMultiplier(state.governmentType)));
  const estAnnualEarnings = projNet * 12;
  
  const stageDiscount = (() => {
    if (state.stage === "Emprendedor de Barrio") return 0.05;
    if (state.stage === "Pyme Familiar") return 0.15;
    if (state.stage === "Empresa Consolidada") return 0.40;
    if (state.stage === "Corporación Nacional") return 0.75;
    return 1.00;
  })();

  const currentMarketCap = state.isPublic 
    ? (state.sharePrice * 100)
    : Math.max(0, Math.max(Math.floor(netAssetsVal * 1.1), Math.floor(estAnnualEarnings * currentPeMultiple * stageDiscount)));

  const getOptionImpact = (opt) => {
    if (!state) return [];
    
    // Create a dry-run clone to execute action safely
    const testState = JSON.parse(JSON.stringify(state));
    
    const preCash = testState.cash;
    const preRep = testState.reputation;
    const preContacts = testState.contacts;
    const preEff = testState.efficiency;
    const preInn = testState.innovation;
    const preInd = testState.independence;
    const preRisk = testState.corruptionRisk;
    const preClients = testState.clients;
    const preDebt = testState.debt;
    
    try {
      opt.action(testState);
    } catch (e) {
      return [];
    }
    
    const isPersonal = currentEvent && currentEvent.category === "PERSONAL";
    const netAssets = state.cash + (state.hedgedCash || 0) + (state.machineryCount * 80000) - state.debt;
    const scale = isPersonal ? 1 : Math.max(1, Math.floor(netAssets / 120000));
    
    const impacts = [];
    if (testState.cash !== preCash) {
      const diff = (testState.cash - preCash) * scale;
      impacts.push(`${diff >= 0 ? '+' : ''}$${diff.toLocaleString()} Caja`);
    }
    if (testState.reputation !== preRep) {
      const diff = testState.reputation - preRep;
      impacts.push(`${diff > 0 ? '+' : ''}${diff}% Reputación`);
    }
    if (testState.contacts !== preContacts) {
      const diff = testState.contacts - preContacts;
      impacts.push(`${diff > 0 ? '+' : ''}${diff}% Contactos`);
    }
    if (testState.efficiency !== preEff) {
      const diff = testState.efficiency - preEff;
      impacts.push(`${diff > 0 ? '+' : ''}${diff}% Eficiencia`);
    }
    if (testState.innovation !== preInn) {
      const diff = testState.innovation - preInn;
      impacts.push(`${diff > 0 ? '+' : ''}${diff}% Innovación`);
    }
    if (testState.independence !== preInd) {
      const diff = testState.independence - preInd;
      impacts.push(`${diff > 0 ? '+' : ''}${diff}% Independencia`);
    }
    if (testState.corruptionRisk !== preRisk) {
      const diff = testState.corruptionRisk - preRisk;
      impacts.push(`${diff > 0 ? '+' : ''}${diff}% Riesgo AFIP`);
    }
    if (testState.clients !== preClients) {
      const diff = testState.clients - preClients;
      impacts.push(`${diff > 0 ? '+' : ''}${diff} Clientes`);
    }
    if (testState.debt !== preDebt) {
      const diff = (testState.debt - preDebt) * scale;
      impacts.push(`${diff > 0 ? '+' : '−'}$${Math.abs(diff).toLocaleString()} Deuda`);
    }

    
    return impacts;
  };

  // Visual helpers for slider badges
  const getPriceBadge = () => {
    if (state.priceMultiplier > 1.2) return { text: "Precio Excesivo (Fuga de clientes)", cl: "badge-state-warning" };
    if (state.priceMultiplier < 0.9) return { text: "Precio Promocional (Atracción de clientes)", cl: "badge-market-benefit" };
    return { text: "Precio Equilibrado", cl: "badge-market-warning" };
  };

  const getSalaryBadge = () => {
    if (state.salaryPerEmployee > 1650) return { text: "Sueldo Alto (Sindicato en calma, +Eficiencia)", cl: "badge-market-benefit" };
    if (state.salaryPerEmployee < 1400) return { text: "Sueldo Bajo (Tensión gremial alta, riesgo de paro)", cl: "badge-state-warning" };
    return { text: "Sueldo Competitivo", cl: "badge-market-warning" };
  };

  const govDefObj = GOVERNMENTS[state.governmentType] || GOVERNMENTS.Radicalismo;
  const currentGovRate = govDefObj.taxRatePct;
  const rawTaxRate = (() => {
    let rate = govDefObj.taxRate;
    if (state.governmentType === "Provincianismo" && (state.businessType === "industrial" || state.businessType === "construccion")) {
      rate = Math.max(0.05, rate - 0.05);
    }
    return rate;
  })();
  const finalTaxDisplayRate = Math.round((state.panamaTaxShield ? rawTaxRate * 0.5 : rawTaxRate) * 100);
  const currentInterest = (() => {
    const base = govDefObj.interestPct;
    return state.economicCycle === "Estanflación" ? base + 3 : base;
  })();

  // Dynamic Barometer Balance Values
  const stateBarometerVal = Math.floor(state.stateDependence * 0.5 + state.contacts * 0.5);
  const marketBarometerVal = 100 - stateBarometerVal;

  return (
    <div id="game-container">
      
      {/* ================= SCREEN 1: SETUP ================= */}
      {!isPlaying ? (
        <main id="setup-screen" className="active-screen">
          <div className="setup-card glass animated-scale-up">
            <header className="setup-header">
              <h1 className="logo-text">PLATERO</h1>
              <p className="subtitle-text">Simulador de Empresario</p>
            </header>

            <section className="setup-form">
              <div className="form-group" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                <div>
                  <label htmlFor="player-name">Nombre del Empresario/a:</label>
                  <input 
                    type="text" 
                    id="player-name" 
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    placeholder="Ej: Franco Macri" 
                    maxLength={25}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor="company-name">Nombre de la Empresa:</label>
                  <input 
                    type="text" 
                    id="company-name" 
                    value={setupCompanyName}
                    onChange={(e) => setSetupCompanyName(e.target.value)}
                    placeholder="Ej: Metales del Plata S.A." 
                    maxLength={35}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Elige tu Rubro Inicial:</label>
                <div className="business-selector">
                  {Object.entries(INDUSTRIES).map(([key, data]) => (
                    <div 
                      key={key} 
                      className={`business-option glass ${setupType === key ? 'selected' : ''}`}
                      onClick={() => setSetupType(key)}
                    >
                      <h3>
                        {key === 'industrial' ? '🏭' : 
                         key === 'software' ? '💻' : 
                         key === 'comercio' ? '🚢' : 
                         key === 'finanzas' ? '💵' : 
                         key === 'construccion' ? '🏗️' : 
                         key === 'agropecuario' ? '🌾' :
                         key === 'petrolera' ? '🛢️' : '⛏️'} {data.name}
                      </h3>
                      <p className="desc">{data.description}</p>
                      <div className="option-stats">
                        <span>💰 ${data.cash.toLocaleString()}</span>
                        <span>👷 {data.employees} Empleados</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                id="start-game-btn" 
                onClick={handleStartGame}
                className="btn btn-primary btn-large w-100"
              >
                Comenzar Aventura Empresarial
              </button>
            </section>
          </div>
        </main>
      ) : (
        
        // ================= SCREEN 2: GAMEPLAY (3-Column Layout) =================
        <main id="game-screen" className="active-screen">
          
          {/* HEADER BAR & BAROMETER */}
          <header id="game-header" className="glass">
            <div className="header-left">
              <h2 className="mini-logo">PLATERO</h2>
              <span id="player-badge" className="badge" title={state.stage}>
                <span className="stage-full">{state.stage}</span>
                <span className="stage-short">
                  {state.stage === "Emprendedor de Barrio" ? "Emprendedor" :
                   state.stage === "Pyme Familiar" ? "PyME" :
                   state.stage === "Empresa Consolidada" ? "Consol." :
                   state.stage === "Corporación Nacional" ? "Corp. Nac." :
                   state.stage === "Pulpo Económico / Magnate" ? "Magnate" : state.stage}
                </span>
              </span>
              <span className="badge" title="Edad del empresario" style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                🎂 {30 + Math.floor((state.turn - 1) / 12)} años
              </span>
              <span className="badge badge-month-mobile">
                M{state.turn}
              </span>
              {state.isPublic && (
                <span className="badge" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', background: 'rgba(16,185,129,0.05)', whiteSpace: 'nowrap' }}>
                  📈 ${state.sharePrice.toLocaleString()}
                </span>
              )}
            </div>
            
            {/* The Electoral / Alignment Barometer */}
            <div className="electoral-barometer">
              <div className="barometer-labels">
                <span className="text-state" style={{ fontWeight: '700' }}>Casta: {stateBarometerVal}%</span>
                <span className="text-info" style={{ fontWeight: '700' }}>Mercado: {marketBarometerVal}%</span>
              </div>
              <div className="barometer-track" style={{ height: '8px' }}>
                <div className="barometer-fill-nacional" style={{ width: `${stateBarometerVal}%`, background: 'var(--color-estado)' }}></div>
                <div className="barometer-fill-liberal" style={{ width: `${marketBarometerVal}%`, background: 'var(--color-market)' }}></div>
              </div>
            </div>

            <div className="game-controls">
              <div className={`gov-ticker glass ${state.govTurnsLeft <= 3 ? 'pulse-red-border' : ''}`} id="gov-ticker" style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                <span id="gov-type" className={`badge-gov ${govDefObj.badgeClass}`}>
                  {state.governmentType}
                </span>
                <span id="gov-countdown" className={`ticker-val ${state.govTurnsLeft <= 3 ? 'text-negative font-bold' : ''}`} style={{ transition: 'color 0.3s' }}>
                  {state.govTurnsLeft}m {state.govTurnsLeft <= 3 ? '🗳️' : ''}
                </span>
              </div>
              <button onClick={confirmRestartGame} className="btn btn-secondary btn-sm" title="Reiniciar partida" style={{ padding: '6px' }}>🔄</button>
            </div>
          </header>

          {/* MAIN 3-COLUMN BODY */}
          <div id="game-body">
            
            {/* COLUMN 1: FINANCIAL LEDGER */}
            <aside id="sidebar-col1" className={`mobile-panel ${mobilePanelTab === 'finanzas' ? 'mobile-active' : ''}`}>
              <div className="ledger-card glass">
                <div className="ledger-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>💰 {state.companyName}</h3>
                  <span className={`badge-cycle cycle-${state.economicCycle}`} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }} title="Ciclo macroeconómico anual vigente">
                    {state.economicCycle === 'Crecimiento' && '📈 Crecimiento'}
                    {state.economicCycle === 'Normal' && '💼 Normal'}
                    {state.economicCycle === 'Recesión' && '📉 Recesión'}
                    {state.economicCycle === 'Estanflación' && '⚠️ Estanflación'}
                  </span>
                </div>
                
                <div className="stat-row-large" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <div className="glass" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                    <span className="stat-label" style={{ fontSize: '0.72rem', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Caja Líquida</span>
                    <span className={`stat-value ${state.cash >= 0 ? 'text-positive' : 'text-negative'}`} style={{ fontSize: '1.1rem', display: 'block' }}>
                      {formatMoney(state.cash)}
                    </span>
                    <span style={{ fontSize: '0.68rem', display: 'block', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      Límite: -{formatMoney(getActiveBankruptcyLimit(state, projTotalRevenue))}
                    </span>
                  </div>
                  <div className="glass" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                    <span className="stat-label" style={{ fontSize: '0.72rem', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {state.isPublic ? 'Valuación Bolsa' : 'Valuación Est.'}
                    </span>
                    <span className="stat-value text-warning" style={{ fontSize: '1.1rem' }}>
                      {formatMoney(currentMarketCap)}
                    </span>
                  </div>
                </div>

                <div className="ledger-details">
                  <div className="stat-row">
                    <span className="stat-label">Deuda Acumulada:</span>
                    <span className="stat-value text-negative">${state.debt.toLocaleString()}</span>
                  </div>
                  {state.hedgedCash > 0 && (
                    <div className="stat-row">
                      <span className="stat-label">Fondo de Cobertura:</span>
                      <span className="stat-value text-positive">${state.hedgedCash.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="stat-row">
                    <span className="stat-label">Stock de Insumos:</span>
                    <span className="stat-value text-info">{state.rawMaterialStock} meses</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Tasas Interés Deuda:</span>
                    <span className="stat-value text-warning">{currentInterest}% / mes</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label" title={state.panamaTaxShield ? "Reducido por tu cuenta Offshore en Panamá" : ""}>
                      Impuesto Facturación:
                    </span>
                    <span className={`stat-value ${state.panamaTaxShield ? 'text-positive' : 'text-negative'}`}>
                      {finalTaxDisplayRate}% {state.panamaTaxShield && "(Panamá 🌴)"}
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Ingresos Contratos:</span>
                    <span className="stat-value text-positive">
                      +${state.activeTenders.reduce((acc, curr) => acc + curr.monthlyRevenue, 0).toLocaleString()}/mes
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Costo Operativo/Cliente:</span>
                    <span className="stat-value text-negative">
                       ${Math.floor(INDUSTRIES[state.businessType]?.baseOpCost * Math.max(0.375, 1 - state.efficiency / 320))}
                    </span>
                  </div>
                </div>

                {/* MONTHLY PROJECTION BREAKDOWN */}
                <div className="ledger-projection">
                  <div className="projection-header">📊 Proyección Este Mes</div>
                  <div className="stat-row" title={state.clients > projMaxCapacity ? `Capacidad de empleados superada. Límite de atención: ${projMaxCapacity} clientes.` : ""}>
                    <span className="stat-label">
                      + Clientes ({projServedClients}/{state.clients}):
                      {state.clients > projMaxCapacity && <span className="text-negative" style={{ marginLeft: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>⚠️</span>}
                    </span>
                    <span className="stat-value text-positive">+${projClientRevenue.toLocaleString()}</span>
                  </div>
                  {projTenderRevenue > 0 && (
                    <div className="stat-row">
                      <span className="stat-label">+ Contratos Estado:</span>
                      <span className="stat-value text-positive">+${projTenderRevenue.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="stat-row">
                    <span className="stat-label">− Salarios ({state.employees}):</span>
                    <span className="stat-value text-negative">-${projSalaryCost.toLocaleString()}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">− Costos Operativos:</span>
                    <span className="stat-value text-negative">-${projOpCost.toLocaleString()}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">− Impuestos ({finalTaxDisplayRate}%):</span>
                    <span className="stat-value text-negative">-${projTaxCost.toLocaleString()}</span>
                  </div>
                  {state.taxPlanningEnabled && (
                    <div className="stat-row">
                      <span className="stat-label">− Planificación Fiscal:</span>
                      <span className="stat-value text-negative">-$3.000</span>
                    </div>
                  )}
                  {(() => {
                    const inflationRate = state.governmentType === "Comunismo" ? 0.05 : state.governmentType === "Justicialismo" ? 0.03 : state.economicCycle === "Estanflación" ? 0.04 : 0.0;
                    const loss = Math.floor(state.cash * inflationRate);
                    return loss > 0 ? (
                      <div className="stat-row">
                        <span className="stat-label text-warning" title="Pérdida proyectada por no tener el dinero invertido en el Fondo de Cobertura">⚠️ Licuación pesos:</span>
                        <span className="stat-value text-negative">-${loss.toLocaleString()}</span>
                      </div>
                    ) : null;
                  })()}
                  {projInterestCost > 0 && (
                    <div className="stat-row">
                      <span className="stat-label">− Intereses Deuda:</span>
                      <span className="stat-value text-negative">-${projInterestCost.toLocaleString()}</span>
                    </div>
                  )}
                  {projRndCost > 0 && (
                    <div className="stat-row">
                      <span className="stat-label">− I+D Mensual:</span>
                      <span className="stat-value text-negative">-${projRndCost.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="stat-row projection-net">
                    <span className="stat-label"><strong>= Resultado Neto Est.:</strong></span>
                    <span className={`stat-value font-bold ${projNet >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {projNet >= 0 ? '+' : ''}${projNet.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="stat-row total-row ledger-total">
                  <span className="stat-label">{ASSETS_BY_INDUSTRY[state.businessType]?.plural || 'Activos'}:</span>
                  <span className="stat-value text-info">
                    {state.machineryCount} (${(state.machineryCount * 80000).toLocaleString()})
                  </span>
                </div>

                {state.isPublic ? (
                  <>
                    <div className="stat-row" style={{borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '10px'}}>
                      <span className="stat-label">Acción (1%):</span>
                      <span className="stat-value text-positive">${state.sharePrice.toLocaleString()}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Valuación Bolsa:</span>
                      <span className="stat-value text-warning">${(state.sharePrice * 100).toLocaleString()}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Flotante Público:</span>
                      <span className="stat-value text-state">{state.sharesSold}%</span>
                    </div>
                  </>
                ) : (
                  <div className="stat-row" style={{borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '10px'}}>
                    <span className="stat-label">Bolsa (IPO):</span>
                    <span className="stat-value text-muted" style={{fontSize: '0.8rem'}}>No Cotiza (Privada)</span>
                  </div>
                )}
              </div>

              {/* FINANCING & ACTIONS */}
              <div className="sidebar-actions">
                {/* Salida a bolsa directa desde el flujo principal en el panel izquierdo */}
                {!state.isPublic ? (
                  <button 
                    onClick={() => {
                      if (netAssetsVal < 1500000 || (state.stage !== "Empresa Consolidada" && state.stage !== "Corporación Nacional" && state.stage !== "Pulpo Económico / Magnate")) {
                        upop.toast.warning(`No calificas para IPO. Requiere Rango Empresa Consolidada y Patrimonio Neto >= $1.500.000.`);
                        return;
                      }
                      setShowIpoModal(true);
                    }}
                    className={`btn w-100 ${netAssetsVal >= 1500000 && (state.stage === "Empresa Consolidada" || state.stage === "Corporación Nacional" || state.stage === "Pulpo Económico / Magnate") ? 'btn-warning' : 'btn-secondary'}`}
                    style={{ opacity: netAssetsVal >= 1500000 ? 1 : 0.6 }}
                  >
                    🚀 Salir a Bolsa (IPO)
                  </button>
                ) : (
                  <button 
                    onClick={() => setActiveTab("tab-tenders")}
                    className="btn btn-warning w-100"
                  >
                    📈 Gestionar Acciones ({state.sharesSold}% Bolsa)
                  </button>
                )}

                {/* Asset investment button — clean & compact display to prevent wrapping */}
                {(() => {
                  const assetDef = ASSETS_BY_INDUSTRY[state.businessType];
                  
                  const getBulkCost = (cnt) => {
                    let cost = 0;
                    for (let i = 0; i < cnt; i++) {
                      cost += getNextAssetCost(state.machineryCount + i);
                    }
                    return cost;
                  };

                  const canAfford1 = state.cash >= getBulkCost(1);
                  const canAfford5 = state.cash >= getBulkCost(5);
                  const canAfford10 = state.cash >= getBulkCost(10);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span className="card-desc" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>🛒 Inversión en {assetDef?.plural || 'Activos'}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => confirmBuyAsset(1)}
                          className={`btn btn-sm ${canAfford1 ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1, padding: '6px 2px', fontSize: '0.75rem', opacity: canAfford1 ? 1 : 0.6 }}
                          title={`Comprar 1 activo. Costo: $${getBulkCost(1).toLocaleString()}`}
                        >
                          x1
                        </button>
                        <button
                          onClick={() => confirmBuyAsset(5)}
                          className={`btn btn-sm ${canAfford5 ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1, padding: '6px 2px', fontSize: '0.75rem', opacity: canAfford5 ? 1 : 0.6 }}
                          title={`Comprar 5 activos. Costo: $${getBulkCost(5).toLocaleString()}`}
                        >
                          x5
                        </button>
                        <button
                          onClick={() => confirmBuyAsset(10)}
                          className={`btn btn-sm ${canAfford10 ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1, padding: '6px 2px', fontSize: '0.75rem', opacity: canAfford10 ? 1 : 0.6 }}
                          title={`Comprar 10 activos. Costo: $${getBulkCost(10).toLocaleString()}`}
                        >
                          x10
                        </button>
                      </div>
                    </div>
                  );
                })()}
                {/* Mantenimiento preventivo — solo si hay activos */}
                {state.machineryCount > 0 && (() => {
                  const maintCost = getMaintenanceCost(state.machineryCount);
                  const canAfford = state.cash >= maintCost;
                  return (
                    <button
                      onClick={confirmMaintenance}
                      className="btn btn-secondary w-100"
                      style={{ opacity: canAfford ? 1 : 0.5 }}
                      title={`Frena la depreciación mensual y recupera +3% de Eficiencia. Costo: $${maintCost.toLocaleString()}`}
                    >
                      🔧 Mantenimiento (${maintCost.toLocaleString()})
                    </button>
                  );
                })()}
                <button onClick={confirmTakeLoan} className="btn btn-warning w-100">
                  🏦 Tomar Crédito $100.000
                </button>
                {state.debt > 0 && (
                  <button onClick={confirmPayLoan} className="btn btn-secondary w-100">
                    💳 Cancelar Deuda ($50.000)
                  </button>
                )}
                <button 
                  onClick={confirmRequestSubsidy} 
                  className="btn btn-secondary w-100"
                  disabled={state.contacts < 25 || !["Justicialismo", "Comunismo"].includes(state.governmentType)}
                >
                  🤝 Solicitar Subsidio ($150k)
                </button>
              </div>
            </aside>

            {/* COLUMN 2: ACTION WORKSPACE */}
            <main id="workspace-col2" className={`mobile-panel ${mobilePanelTab === 'juego' ? 'mobile-active' : ''}`}>
              {/* TAB NAVIGATION */}
              <nav id="workspace-nav" className="glass">
                <button 
                  className={`tab-btn ${activeTab === 'tab-event' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('tab-event')}
                >
                  🔔 Decisiones Directas
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'tab-mgmt' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('tab-mgmt')}
                >
                  ⚙️ Operaciones y Gestión
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'tab-tenders' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('tab-tenders')}
                >
                  🏛️ Licitaciones y Bolsa
                </button>
              </nav>

              {/* TAB CONTENTS */}
              <div id="workspace-content" style={{flex: 1}}>
                
                {/* TAB 1: DECISION/EVENT */}
                {activeTab === 'tab-event' && (
                  <div className="tab-panel active">
                    {lastMonthOutcome && (
                      <div className={`last-month-alert animated-fade-in ${lastMonthOutcome.includes('AFIP') || lastMonthOutcome.includes('Coima') || lastMonthOutcome.includes('Pérdida') || lastMonthOutcome.includes('cuello') ? 'alert-state' : ''}`}>
                        <p>{lastMonthOutcome}</p>
                      </div>
                    )}

                    {currentEvent && (
                      <div className="event-card glass animated-fade-in" style={{margin: '0 auto'}}>
                        <div className="event-header">
                          <span className="event-category">{currentEvent.category}</span>
                          <h2 id="event-title">{currentEvent.title}</h2>
                        </div>
                        {(() => {
                          const isPersonal = currentEvent && currentEvent.category === "PERSONAL";
                          const netAssets = state.cash + (state.hedgedCash || 0) + (state.machineryCount * 80000) - state.debt;
                          const scale = isPersonal ? 1 : Math.max(1, Math.floor(netAssets / 120000));
                          return (
                            <>
                              <div className="event-body">
                                <p>{scaleText(typeof currentEvent.description === 'function' ? currentEvent.description(state) : currentEvent.description, scale)}</p>
                              </div>
                              <div className="event-options">
                                {currentEvent.options.map((opt, idx) => {
                                  const isLocked = opt.condition ? !opt.condition(state) : false;
                                  const optText = scaleText(typeof opt.text === 'function' ? opt.text(state) : opt.text, scale);
                            const impacts = getOptionImpact(opt);
                            return (
                              <button 
                                key={idx}
                                className={`btn btn-option option-${idx === 0 ? 'a' : idx === 1 ? 'b' : 'c'}`}
                                disabled={isLocked}
                                style={{ opacity: isLocked ? 0.4 : 1, cursor: isLocked ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '6px', height: 'auto', padding: '12px 16px' }}
                                onClick={() => handleSelectOption(opt)}
                                title={isLocked ? opt.conditionText : ""}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', textAlign: 'left', width: '100%' }}>
                                  <span className="option-letter" style={{ flexShrink: 0 }}>{idx === 0 ? 'A' : idx === 1 ? 'B' : 'C'}</span>
                                  <span style={{ flex: 1 }}>
                                    {optText} {isLocked && <strong className="text-state" style={{marginLeft: '10px', fontSize: '0.8rem'}}>({opt.conditionText})</strong>}
                                  </span>
                                </div>
                                {!isLocked && impacts && impacts.length > 0 && (
                                  <div className="option-impacts" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginLeft: '32px' }}>
                                    {impacts.map((imp, impIdx) => {
                                      const isNegative = imp.includes('-') || (imp.includes('Riesgo AFIP') && !imp.includes('-'));
                                      const isCaja = imp.includes('Caja');
                                      const isDeuda = imp.includes('Deuda');
                                      
                                      let badgeColor = 'rgba(16, 185, 129, 0.15)'; // success green
                                      let textColor = '#10b981';
                                      
                                      if (isNegative) {
                                        badgeColor = 'rgba(239, 68, 68, 0.15)'; // error red
                                        textColor = '#ef4444';
                                      } else if (isCaja || isDeuda) {
                                        badgeColor = 'rgba(245, 158, 11, 0.15)'; // warning orange
                                        textColor = '#f59e0b';
                                      }
                                      
                                      return (
                                        <span 
                                          key={impIdx} 
                                          style={{ 
                                            fontSize: '0.72rem', 
                                            padding: '2px 6px', 
                                            borderRadius: '4px', 
                                            background: badgeColor, 
                                            color: textColor, 
                                            fontWeight: 'bold',
                                            border: `1px solid ${textColor}20` 
                                          }}
                                        >
                                          {imp}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* ESTRATEGIA DE MARKETING (FLUJO PRINCIPAL) */}
                    <div className="event-card glass animated-fade-in" style={{ margin: '20px auto 0', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '20px' }}>
                      <div className="event-header" style={{ paddingBottom: '10px', borderBottom: '1px solid rgba(56, 189, 248, 0.15)', marginBottom: '15px' }}>
                        <span className="event-category" style={{ background: '#38bdf8', color: 'black', fontWeight: 'bold' }}>📣 MEDIDAS DE CAPTACIÓN</span>
                        <h2 style={{ fontSize: '1.4rem', color: '#38bdf8', margin: '4px 0 0' }}>Campaña de Marketing Activa</h2>
                        <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                          Ajustá tu inversión en marketing digital o tradicional para acelerar activamente la entrada de nuevos clientes y potenciar tu reputación corporativa.
                        </p>
                      </div>

                      <div className="marketing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                        {[
                          {
                            id: "none",
                            name: "🚫 Sin Campaña",
                            cost: 0,
                            desc: "Crecimiento puramente orgánico por reputación y precio.",
                            effect: "Costo: $0 | Sin impacto extra"
                          },
                          {
                            id: "digital",
                            name: "📱 Marketing Digital",
                            cost: 5000,
                            desc: "Anuncios optimizados en redes sociales y buscadores.",
                            effect: "Costo: $5.000/mes | +1 a +3 clientes/mes, +1% reputación/mes"
                          },
                          {
                            id: "mass_media",
                            name: "📺 Campaña de Prensa y TV",
                            cost: 25000,
                            desc: "Presencia en radio, TV local y cartelería en vía pública.",
                            effect: "Costo: $25.000/mes | +5 a +10 clientes/mes, +2% reputación/mes"
                          },
                          {
                            id: "b2b",
                            name: "🤝 Fuerza de Ventas B2B",
                            cost: 80000,
                            desc: "Equipo comercial dedicado a captar grandes cuentas corporativas.",
                            effect: "Costo: $80.000/mes | +15 a +25 clientes/mes, +3% reputación/mes"
                          }
                        ].map(camp => {
                          const isActive = state.marketingCampaign === camp.id;
                          return (
                            <div 
                              key={camp.id}
                              onClick={() => handleChangeMarketingCampaign(camp.id)}
                              style={{
                                border: isActive ? '1px solid var(--color-success)' : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '8px',
                                padding: '12px',
                                background: isActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.015)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                              className={isActive ? 'active-camp' : ''}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '70%' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: isActive ? 'var(--color-success)' : 'var(--text-primary)' }}>
                                  {camp.name}
                                </span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{camp.desc}</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: isActive ? 'var(--color-success)' : 'var(--color-peso)' }}>
                                  {camp.effect} { (state.economicCycle === "Recesión" || state.economicCycle === "Estanflación") && camp.id !== "none" ? " (⚠️ Efectividad -50% por crisis)" : "" }
                                </span>
                              </div>
                              <div>
                                <span className={`badge ${isActive ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.72rem', padding: '4px 8px' }}>
                                  {isActive ? 'ACTIVO' : 'ELEGIR'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ELECTION CAMPAIGN LOBBY BOX */}
                    {state.govTurnsLeft <= 3 && (() => {
                      const electionOdds = calculateElectionOdds(state);
                      return (
                        <div className="event-card glass animated-fade-in" style={{ margin: '20px auto 0', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                          <div className="event-header" style={{ paddingBottom: '10px', borderBottom: '1px solid rgba(245, 158, 11, 0.15)' }}>
                            <span className="event-category" style={{ background: '#f59e0b', color: 'white' }}>🗳️ ELECCIONES PRESIDENCIALES</span>
                            <h2 style={{ fontSize: '1.4rem', color: '#f59e0b', margin: '4px 0 0' }}>Sondeos Electorales</h2>
                            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                              Faltan <strong>{state.govTurnsLeft} meses</strong> para las elecciones. Podés financiar la campaña de un candidato para influir en las probabilidades de su victoria.
                            </p>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', padding: '15px 0' }}>
                            {Object.keys(electionOdds).map((partyKey) => {
                              const gov = GOVERNMENTS[partyKey];
                              const pChance = electionOdds[partyKey];
                              const isCurrentlySupported = state.electionSupport === partyKey;
                              const cost = ['Comunismo', 'Justicialismo'].includes(partyKey) ? 60000 : 45000;
                              const hasSupportSelected = !!state.electionSupport;

                              return (
                                <div key={partyKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                                      {partyKey} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>({pChance}% intención)</span>
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{gov.description}</span>
                                  </div>
                                  <div>
                                    {isCurrentlySupported ? (
                                      <span className="badge text-positive" style={{ borderColor: 'var(--color-success)', background: 'rgba(16,185,129,0.05)', fontSize: '0.75rem' }}>
                                        ✅ Financiado
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleFundCampaign(partyKey, cost)}
                                        disabled={hasSupportSelected || state.cash < cost}
                                        className={`btn btn-sm ${hasSupportSelected ? 'btn-secondary' : 'btn-warning'}`}
                                        style={{ fontSize: '0.75rem', padding: '5px 10px', opacity: (hasSupportSelected || state.cash < cost) ? 0.45 : 1 }}
                                        title={hasSupportSelected ? "Ya apoyaste a un candidato en esta elección" : `Aportar $${cost.toLocaleString()} para sumar +20% a sus odds.`}
                                      >
                                        Aportar ${cost / 1000}k
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* TAB 2: MANAGEMENT */}
                {activeTab === 'tab-mgmt' && (
                  <div className="tab-panel active">
                    <div className="mgmt-grid" style={{gridTemplateColumns: '1fr'}}>
                      
                      {/* PRECIOS */}
                      <div className="mgmt-card glass mb-15">
                        <h3>🏷️ Ajuste de Precios</h3>
                        <p className="card-desc">Fija el precio del producto/servicio. Precios altos aumentan el ingreso por cliente pero causan bajas paulatinas.</p>
                        
                        <div className="slider-group">
                          <div className="slider-labels">
                            <span>Económico (70%)</span>
                            <span className="slider-current">{Math.floor(state.priceMultiplier * 100)}%</span>
                            <span>Premium (150%)</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.7" 
                            max="1.5" 
                            step="0.1" 
                            value={state.priceMultiplier}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setState(prev => ({ ...prev, priceMultiplier: val }));
                            }}
                          />
                          <span className={`slider-consequence-badge ${getPriceBadge().cl}`}>
                            {getPriceBadge().text}
                          </span>
                        </div>
                      </div>

                      {/* I+D */}
                      <div className="mgmt-card glass mb-15">
                        <h3>💡 Fomento y Desarrollo (I+D)</h3>
                        <p className="card-desc">Asigna fondos mensuales para investigación. Aumenta la Innovación del producto y la Eficiencia de fabricación.</p>
                        
                        <div className="slider-group">
                          <div className="slider-labels">
                            <span>$0</span>
                            <span className="slider-current">${Number(state.rndInvestment).toLocaleString()} / mes</span>
                            <span>$50.000</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="50000" 
                            step="5000" 
                            value={state.rndInvestment}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setState(prev => ({ ...prev, rndInvestment: val }));
                            }}
                          />
                        </div>
                      </div>

                      {/* PERSONAL */}
                      <div className="mgmt-card glass">
                        <h3>👥 Dotación de Empleados y Salario</h3>
                        <p className="card-desc">Gestiona tu equipo. Salarios generosos disparan el desempeño del personal y neutralizan huelgas.</p>
                        
                        <div className="staff-actions-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.85rem', minWidth: '80px', color: 'var(--text-secondary)' }}>Contratar:</strong>
                            <button onClick={() => confirmHireEmployee(1)} className="btn btn-success btn-sm" style={{ flex: 1, padding: '6px' }}>x1</button>
                            <button onClick={() => confirmHireEmployee(5)} className="btn btn-success btn-sm" style={{ flex: 1, padding: '6px' }}>x5</button>
                            <button onClick={() => confirmHireEmployee(10)} className="btn btn-success btn-sm" style={{ flex: 1, padding: '6px' }}>x10</button>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.85rem', minWidth: '80px', color: 'var(--text-secondary)' }}>Despedir:</strong>
                            <button onClick={() => confirmFireEmployee(1)} className="btn btn-danger btn-sm" style={{ flex: 1, padding: '6px' }}>x1</button>
                            <button onClick={() => confirmFireEmployee(5)} className="btn btn-danger btn-sm" style={{ flex: 1, padding: '6px' }}>x5</button>
                            <button onClick={() => confirmFireEmployee(10)} className="btn btn-danger btn-sm" style={{ flex: 1, padding: '6px' }}>x10</button>
                          </div>
                        </div>
                        
                        <div className="slider-group mt-15">
                          <div className="slider-labels">
                            <span>Bajo ($1200)</span>
                            <span className="slider-current">${state.salaryPerEmployee} / mes</span>
                            <span>Alto ($2000)</span>
                          </div>
                          <input 
                            type="range" 
                            min="1200" 
                            max="2000" 
                            step="100" 
                            value={state.salaryPerEmployee}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setState(prev => ({ ...prev, salaryPerEmployee: val }));
                            }}
                          />
                          <span className={`slider-consequence-badge ${getSalaryBadge().cl}`}>
                            {getSalaryBadge().text}
                          </span>
                        </div>
                      </div>

                      {/* OPERACIONES Y ESTRATEGIA CORPORATIVA */}
                      <div className="mgmt-card glass mb-15">
                        <h3>💼 Estrategia Administrativa y Cobertura</h3>
                        <p className="card-desc">Administra el inventario y protege los activos financieros de tu empresa de forma realista.</p>
                        
                        <div className="operations-grid" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                          
                          {/* ACOPIO DE INSUMOS */}
                          <div className="ops-row p-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <strong>📦 Acopio de Materias Primas:</strong>
                              <span className="text-info">{state.rawMaterialStock} / 6 Meses</span>
                            </div>
                            <p className="card-desc" style={{ fontSize: '0.8rem', margin: '0 0 8px 0' }}>
                              Previene paradas de fábrica e incrementos de costo de importaciones durante cepos o crisis cambiarias.
                            </p>
                            <button 
                              onClick={confirmBuyRawMaterials} 
                              className="btn btn-primary btn-sm"
                              disabled={state.rawMaterialStock >= 6}
                            >
                              Acopiar 1 Mes (+${(8000 + state.employees * 1500).toLocaleString()})
                            </button>
                          </div>

                          {/* MESA DE DINERO / COBERTURA */}
                          <div className="ops-row p-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <strong>📈 Fondo de Cobertura (Letras/FCI):</strong>
                              <span className="text-positive">${(state.hedgedCash || 0).toLocaleString()}</span>
                            </div>
                            <p className="card-desc" style={{ fontSize: '0.8rem', margin: '0 0 8px 0' }}>
                              Los pesos líquidos en caja sufren depreciación mensual bajo alta inflación o Cepos. El fondo de cobertura los protege y rinde intereses mensuales.
                            </p>
                            <div className="hedge-buttons" style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => handleHedgeDeposit(20000)} className="btn btn-success btn-xs" disabled={state.cash < 20000}>
                                Colocar $20.000
                              </button>
                              <button onClick={() => handleHedgeDeposit('all')} className="btn btn-success btn-xs" disabled={state.cash <= 0}>
                                Colocar Todo
                              </button>
                              <button onClick={() => handleHedgeWithdraw('all')} className="btn btn-warning btn-xs" disabled={!state.hedgedCash || state.hedgedCash <= 0}>
                                Rescatar Todo
                              </button>
                            </div>
                          </div>

                          {/* PLANIFICACION FISCAL */}
                          <div className="ops-row p-10">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <strong>⚖️ Asesoría & Planificación Fiscal:</strong>
                              <span className={`badge ${state.taxPlanningEnabled ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: state.taxPlanningEnabled ? 'rgba(46, 204, 113, 0.2)' : 'rgba(255,255,255,0.1)' }}>
                                {state.taxPlanningEnabled ? 'CONTRATADO' : 'INACTIVO'}
                              </span>
                            </div>
                            <p className="card-desc" style={{ fontSize: '0.8rem', margin: '0 0 8px 0' }}>
                              Contrata un estudio contable corporativo. Reduce la alícuota de impuesto de facturación un 5% y reduce los incrementos de riesgo judicial.
                            </p>
                            <button 
                              onClick={handleToggleTaxPlanning} 
                              className={`btn ${state.taxPlanningEnabled ? 'btn-danger' : 'btn-primary'} btn-sm`}
                            >
                              {state.taxPlanningEnabled ? 'Suspender Asesoría' : 'Contratar ($3.000/mes)'}
                            </button>
                          </div>

                        </div>
                      </div>



                    </div>
                  </div>
                )}

                {/* TAB 3: TENDERS & STOCK MARKET */}
                {activeTab === 'tab-tenders' && (
                  <div className="tab-panel active">
                    
                    {/* MERCADO DE VALORES / IPO */}
                    <div className="mgmt-card glass mb-15">
                      <h3>📈 Mercado de Valores (Cotización en Bolsa)</h3>
                      <p className="card-desc">
                        Saca a cotizar tu empresa para conseguir una inyección masiva de liquidez a cambio de vender capital accionario a inversionistas públicos.
                      </p>

                      {!state.isPublic ? (
                        <div className="ipo-setup-box text-center p-15">
                          <p className="mb-10 font-bold">Estado: Privada S.A.</p>
                          {netAssetsVal >= 1500000 ? (
                            <div>
                              <p className="text-positive mb-10">¡Calificas para una IPO pública!</p>
                              <p className="mb-15 text-secondary">
                                Valuación Estimada de Salida: <strong className="text-warning">${(netAssetsVal * (1 + state.reputation/100)).toLocaleString()}</strong>
                              </p>
                              <button onClick={() => setShowIpoModal(true)} className="btn btn-warning btn-large">
                                Iniciar Salida a Bolsa (IPO)
                              </button>
                            </div>
                          ) : (
                            <p className="text-muted" style={{fontSize: '0.85rem'}}>
                              🚫 Requisitos para IPO: Patrimonio neto mayor a $1.500.000 (Posees ${netAssetsVal.toLocaleString()}) y Rango de Empresa Consolidada.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="ipo-status-box animated-fade-in">
                          <div className="tender-specs" style={{gridTemplateColumns: '1fr 1fr'}}>
                            <div><strong>Precio de Acción (1%):</strong> <span className="text-positive">${state.sharePrice.toLocaleString()}</span></div>
                            <div><strong>Valuación de Mercado:</strong> <span className="text-warning">${(state.sharePrice * 100).toLocaleString()}</span></div>
                            <div><strong>Capital Público:</strong> <span className="text-state">{state.sharesSold}%</span></div>
                            <div><strong>Tu Participación:</strong> <span className="text-info">{100 - state.sharesSold}%</span></div>
                          </div>

                          <div className="slider-group" style={{borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '15px'}}>
                            <h5>💼 Gestión de Acciones y Recompra</h5>
                            <p className="card-desc">Si tienes capital, recompra tus acciones en el mercado para evitar drenaje mensual de dividendos.</p>
                            
                            <div className="slider-labels">
                              <span>Recomprar 5% (-${(state.sharePrice * 5).toLocaleString()})</span>
                              <span className="slider-current">Acción: {buybackPercentage}%</span>
                              <span>Recomprar 15% (-${(state.sharePrice * 15).toLocaleString()})</span>
                            </div>
                            <input 
                              type="range"
                              min="5"
                              max="15"
                              step="5"
                              value={buybackPercentage}
                              onChange={(e) => setBuybackPercentage(parseInt(e.target.value))}
                            />

                            <div className="loan-actions mt-10">
                              <button onClick={confirmBuybackShares} className="btn btn-success w-100 mb-10">
                                Recomprar {buybackPercentage}% Acciones (-${(state.sharePrice * buybackPercentage).toLocaleString()})
                              </button>
                              {state.sharesSold < 45 && (
                                <button onClick={confirmSellMoreShares} className="btn btn-warning w-100">
                                  Diluir capital: vender 5% adicional (+${(state.sharePrice * 5).toLocaleString()})
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* LICITACIONES PÚBLICAS */}
                    <div className="mgmt-card glass">
                      <h3>🏛️ Licitaciones del Estado</h3>
                      <p className="card-desc">Adjudica contratos del sector público. Usa coimas si posees los contactos y el capital necesarios.</p>
                      
                      <div className="tender-box">
                        {openTender ? (
                          <div className="active-tender-card animated-fade-in w-100">
                            <h4>📋 {openTender.title}</h4>
                            <div className="tender-specs">
                              <div><strong>Presupuesto Oficial:</strong> ${openTender.budget.toLocaleString()}</div>
                              <div><strong>Contrato:</strong> 12 meses</div>
                              <div><strong>Gastos Pliego:</strong> ${(8000 * Math.max(1, Math.floor((state.cash + (state.hedgedCash || 0) + (state.machineryCount * 80000) - state.debt) / 120000))).toLocaleString()}</div>
                            </div>

                            <div className="slider-group">
                              <label className="font-bold">Tu Oferta de Cotización: <span className="text-warning">${honestOffer.toLocaleString()}</span></label>
                              <input 
                                type="range"
                                min={Math.floor(openTender.budget * 0.6)}
                                max={Math.floor(openTender.budget * 1.3)}
                                step="5000"
                                value={honestOffer}
                                onChange={(e) => setHonestOffer(parseInt(e.target.value))}
                              />
                            </div>

                            <div className="bribe-panel slider-group mt-15">
                              <h5>💼 Aceitar Trámite (Coima)</h5>
                              <div className="slider-labels">
                                <span>$0</span>
                                <span className="text-state font-bold">${bribeAmount.toLocaleString()}</span>
                                <span>${Math.floor(openTender.budget * 0.3).toLocaleString()}</span>
                              </div>
                              <input 
                                type="range"
                                min="0"
                                max={Math.floor(openTender.budget * 0.3)}
                                step="5000"
                                value={bribeAmount}
                                onChange={(e) => setBribeAmount(parseInt(e.target.value))}
                              />
                            </div>

                            {/* Dynamic Probability Circular Dial */}
                            <div className="odds-dial-container">
                              <span className="card-desc mb-10" style={{fontSize: '0.8rem'}}>Probabilidad Estimada de Adjudicación</span>
                              <div 
                                className="circular-progress" 
                                style={{ 
                                  background: `conic-gradient(var(--color-market) ${calculateLiveOdds()}%, var(--bg-tertiary) ${calculateLiveOdds()}%)` 
                                }}
                              >
                                <span className="odds-percentage-value">{calculateLiveOdds()}%</span>
                              </div>
                            </div>

                            <button onClick={handleBidTender} className="btn btn-primary w-100">
                              Presentar Pliego y Soborno
                            </button>
                          </div>
                        ) : (
                          <div className="no-tender-message w-100">
                            {tenderResult ? (
                              <div className="animated-fade-in">
                                <p className="font-bold text-info mb-10">{tenderResult}</p>
                                <button onClick={() => setTenderResult(null)} className="btn btn-secondary btn-sm">Continuar</button>
                              </div>
                            ) : (
                              <p>No hay pliegos de licitación abiertos en este mes.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}

              </div>
            </main>

            {/* COLUMN 3: PROFILE, METERS & LOGS */}
            <aside id="sidebar-col3" className={`mobile-panel ${mobilePanelTab === 'perfil' ? 'mobile-active' : ''}`}>
              {/* ALINEACIÓN E IDENTIDAD */}
              <div className="sidebar-section">
                <h3>⚖️ Perfil del Empresario</h3>
                <div className="stat-row">
                  <span className="stat-label">Público:</span>
                  <span className="stat-value">{state.playerName}</span>
                </div>
                <div className="stat-row mt-10">
                  <span className="stat-label" title="Reputación corporativa general.">🌟 Reputación: {state.reputation}%</span>
                  <div className="progress-bar-container">
                    <div id="bar-reputation" className="progress-bar bar-market" style={{ width: `${state.reputation}%` }}></div>
                  </div>
                </div>
                <div className="stat-row">
                  <span className="stat-label" title="Contactos de influencia en ministerios.">🤝 Contactos: {state.contacts}%</span>
                  <div className="progress-bar-container">
                    <div id="bar-contacts" className="progress-bar bar-state" style={{ width: `${state.contacts}%` }}></div>
                  </div>
                </div>
                <div className="stat-row">
                  <span className="stat-label" title="Porcentaje de ventas atadas a contratos del gobierno.">🏛️ Dependencia: {state.stateDependence}%</span>
                  <div className="progress-bar-container">
                    <div id="bar-dependence" className="progress-bar bar-state" style={{ width: `${state.stateDependence}%` }}></div>
                  </div>
                </div>
                <div className="stat-row">
                  <span className="stat-label" title="Riesgo de inspecciones fiscales sorpresivas.">⚠️ Riesgo AFIP: {state.corruptionRisk}%</span>
                  <div className="progress-bar-container">
                    <div id="bar-corruption" className="progress-bar bar-alert" style={{ width: `${state.corruptionRisk}%` }}></div>
                  </div>
                </div>
              </div>

              {/* OPERACIONES SECUNDARIAS */}
              <div className="sidebar-section">
                <h3>⚙️ Capacidades</h3>
                <div className="stat-row">
                  <span className="stat-label">Clientes Activos:</span>
                  <span className="stat-value font-mono">{state.clients}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Maquinarias:</span>
                  <span className="stat-value font-mono">{state.machineryCount}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Eficiencia Operativa: {state.efficiency}%</span>
                  <div className="progress-bar-container" style={{position:'relative'}} title={`Eficiencia Operativa: ${state.efficiency}% / 200 (Depreciación: -${state.machineryCount > 0 ? 1 + Math.floor(state.machineryCount / 4) : 1}%/mes)`}>
                    <div style={{position:'absolute', left:'50%', top:0, bottom:0, width:'1px', background:'rgba(255,255,255,0.25)', zIndex:1, pointerEvents:'none'}}/>
                    <div id="bar-efficiency" className="progress-bar" style={{ width: `${Math.min(100, (state.efficiency / 200) * 100)}%`, backgroundColor: state.efficiency >= 150 ? '#f59e0b' : state.efficiency >= 100 ? '#06b6d4' : 'var(--color-success)' }}></div>
                  </div>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Innovación Técnica: {state.innovation}%</span>
                  <div className="progress-bar-container">
                    <div id="bar-innovation" className="progress-bar" style={{ width: `${state.innovation}%`, backgroundColor: '#9b51e0' }}></div>
                  </div>
                </div>
              </div>

              {/* HISTORIAL / DIARIO */}
              <div className="history-view sidebar-section" style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                <h3>📰 Diario de Negocios</h3>
                <div id="history-log-list" className="log-container" style={{flex: 1}}>
                  {state.historyLog.map((log, index) => {
                    let typeClass = 'system';
                    if (log.includes('Licitación') || log.includes('contrato') || log.includes('subsidio')) typeClass = 'state';
                    else if (log.includes('blue') || log.includes('coimeaste') || log.includes('Riesgo') || log.includes('AFIP')) typeClass = 'danger';
                    else if (log.includes('Clientes') || log.includes('clientes') || log.includes('exportar')) typeClass = 'market';
                    else if (log.includes('Neto') || log.includes('Balance') || log.includes('dividendos')) typeClass = 'money';
                    else if (log.includes('ELECCIONES') || log.includes('BOLSA')) typeClass = 'election';

                    return (
                      <div key={index} className={`log-item ${typeClass}`}>
                        {log}
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
            
          </div>

          {/* MOBILE BOTTOM NAVIGATION */}
          <nav id="mobile-bottom-nav">
            <button
              className={`mobile-nav-btn ${mobilePanelTab === 'finanzas' ? 'active' : ''}`}
              onClick={() => setMobilePanelTab('finanzas')}
            >
              <span className="mobile-nav-icon">💰</span>
              <span className="mobile-nav-label">Finanzas</span>
            </button>
            <button
              className={`mobile-nav-btn ${mobilePanelTab === 'juego' ? 'active' : ''}`}
              onClick={() => setMobilePanelTab('juego')}
            >
              <span className="mobile-nav-icon">🎮</span>
              <span className="mobile-nav-label">Juego</span>
            </button>
            <button
              className={`mobile-nav-btn ${mobilePanelTab === 'perfil' ? 'active' : ''}`}
              onClick={() => setMobilePanelTab('perfil')}
            >
              <span className="mobile-nav-icon">📊</span>
              <span className="mobile-nav-label">Perfil</span>
            </button>
          </nav>

          {/* FOOTER BAR */}
          <footer id="game-footer" className="glass">
            <div className="turn-counter">
              <span>📅 Período: <strong>Mes {state.turn}</strong></span>
              <span className="divider">|</span>
              <span>🏢 Rubro: <strong className="text-info">{INDUSTRIES[state.businessType]?.name}</strong></span>
            </div>
            
            <p className="text-muted" style={{fontSize: '0.8rem', fontStyle: 'italic'}}>
              💡 Para pasar de mes, toma una decisión en el panel central de 'Decisiones Directas'.
            </p>
          </footer>
        </main>
      )}

      {/* ================= MODAL: IPO INITIAL SETUP ================= */}
      {showIpoModal && (() => {
        // Pre-calculate IPO valuation for display (mirrors handleLaunchIPO logic)
        const ipoAnnualEarnings = projNet * 12;
        const baseIpoPe = 12 + Math.floor((state.reputation / 100) * 10) + Math.floor((state.innovation / 100) * 5);
        const ipoPeMultiple = Math.max(1, Math.floor(baseIpoPe * getGovPeMultiplier(state.governmentType)));
        const ipoMarketCap = Math.max(0, Math.floor(ipoAnnualEarnings * ipoPeMultiple));
        const ipoPreviewPrice = Math.max(10, Math.floor(ipoMarketCap / 100));
        const ipoPreviewCash = ipoPreviewPrice * ipoSharesToSell;
        const ipoDividendEst = Math.floor(projNet * (ipoSharesToSell / 100));

        return (
          <div className="modal-overlay">
            <div className="modal-card glass animated-scale-up">
              <h2>📈 Oferta Pública Inicial (IPO)</h2>
              <div className="modal-body">
                <p className="mb-10">
                  Estás por listar <strong>{state.companyName}</strong> en la Bolsa de Valores. El mercado valuará tu empresa por su <strong>rentabilidad futura estimada</strong>, no por su patrimonio contable.
                </p>

                {/* P/E Valuation breakdown */}
                <div className="glass p-15 mb-15" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="projection-header" style={{ marginBottom: '10px' }}>📐 Valuación de Mercado (Método P/E)</div>
                  <div className="stat-row" style={{ fontSize: '0.85rem' }}>
                    <span className="stat-label">Ganancia mensual neta actual:</span>
                    <span className={`stat-value ${projNet >= 0 ? 'text-positive' : 'text-negative'}`}>${projNet.toLocaleString()}</span>
                  </div>
                  <div className="stat-row" style={{ fontSize: '0.85rem' }}>
                    <span className="stat-label">Ganancias anualizadas (×12):</span>
                    <span className="stat-value text-info">${ipoAnnualEarnings.toLocaleString()}</span>
                  </div>
                  <div className="stat-row" style={{ fontSize: '0.85rem' }}>
                    <span className="stat-label" title="Base 12x + Reputación (hasta +10x) + Innovación (hasta +5x)">Múltiplo P/E del mercado:</span>
                    <span className="stat-value text-warning">{ipoPeMultiple}x</span>
                  </div>
                  <div className="stat-row projection-net" style={{ fontSize: '0.9rem' }}>
                    <span className="stat-label"><strong>Capitalización estimada:</strong></span>
                    <span className="stat-value font-bold text-positive">${ipoMarketCap.toLocaleString()}</span>
                  </div>
                </div>

                <div className="slider-group">
                  <div className="slider-labels">
                    <span>10% Acciones</span>
                    <span className="text-warning font-bold">{ipoSharesToSell}% a vender</span>
                    <span>45% Acciones</span>
                  </div>
                  <input 
                    type="range"
                    min="10"
                    max="45"
                    step="5"
                    value={ipoSharesToSell}
                    onChange={(e) => setIpoSharesToSell(parseInt(e.target.value))}
                  />
                </div>

                <div className="election-changes-box glass mt-15">
                  <ul className="card-desc" style={{paddingLeft: '15px', color: 'var(--text-primary)'}}>
                    <li>💵 Inyección Inmediata de Caja: <strong className="text-positive">+${ipoPreviewCash.toLocaleString()}</strong></li>
                    <li>💸 Dividendos mensuales estimados: <strong className="text-negative">-${ipoDividendEst.toLocaleString()}/mes</strong> ({ipoSharesToSell}% del resultado neto).</li>
                    <li>📉 Dilución de independencia: Tu alineación de independencia se reducirá.</li>
                    <li>📊 Precio inicial de la acción (1%): <strong className="text-warning">${ipoPreviewPrice.toLocaleString()}</strong></li>
                  </ul>
                </div>
              </div>
              <div className="modal-actions" style={{gap: '10px'}}>
                <button onClick={handleLaunchIPO} className="btn btn-warning" disabled={projNet <= 0}>
                  {projNet <= 0 ? '⚠️ Empresa no rentable' : 'Lanzar al Mercado'}
                </button>
                <button onClick={() => setShowIpoModal(false)} className="btn btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* ================= MODAL: ANNUAL REPORT ================= */}
      {showAnnualModal && annualSummary && (
        <div className="modal-overlay">
          <div className="modal-card glass animated-scale-up" style={{ maxWidth: '620px', padding: '30px' }}>
            <h2 className="text-positive text-center" style={{ fontSize: '1.8rem', marginBottom: '5px' }}>📊 BALANCE DE EJERCICIO ANUAL</h2>
            <p className="text-center text-muted mb-15">Resultados consolidados de {state.companyName} — Año {annualSummary.current.year}</p>
            
            <div className="modal-body">
              <table className="balance-table">
                <thead>
                  <tr>
                    <th>Métrica Financiera</th>
                    <th style={{ textAlign: 'right' }}>Año {annualSummary.current.year}</th>
                    <th style={{ textAlign: 'right' }}>Año {annualSummary.current.year - 1 || '-'}</th>
                    <th style={{ textAlign: 'right' }}>Variación</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Ingresos Totales:</strong></td>
                    <td className="num">${annualSummary.current.revenue.toLocaleString()}</td>
                    <td className="num">{annualSummary.previous ? `$${annualSummary.previous.revenue.toLocaleString()}` : '-'}</td>
                    <td className={`num ${annualSummary.previous ? (annualSummary.current.revenue >= annualSummary.previous.revenue ? 'text-positive' : 'text-negative') : ''}`}>
                      {annualSummary.previous ? `${annualSummary.current.revenue >= annualSummary.previous.revenue ? '▲' : '▼'} ${Math.floor(Math.abs((annualSummary.current.revenue - annualSummary.previous.revenue) / Math.max(1, annualSummary.previous.revenue) * 100))}%` : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Gastos Operativos:</strong></td>
                    <td className="num">${annualSummary.current.expenses.toLocaleString()}</td>
                    <td className="num">{annualSummary.previous ? `$${annualSummary.previous.expenses.toLocaleString()}` : '-'}</td>
                    <td className="num text-muted">
                      {annualSummary.previous ? `${annualSummary.current.expenses >= annualSummary.previous.expenses ? '▲' : '▼'} ${Math.floor(Math.abs((annualSummary.current.expenses - annualSummary.previous.expenses) / Math.max(1, annualSummary.previous.expenses) * 100))}%` : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Impuestos Estatales:</strong></td>
                    <td className="num">${annualSummary.current.taxes.toLocaleString()}</td>
                    <td className="num">{annualSummary.previous ? `$${annualSummary.previous.taxes.toLocaleString()}` : '-'}</td>
                    <td className="num text-muted">
                      {annualSummary.previous ? `${annualSummary.current.taxes >= annualSummary.previous.taxes ? '▲' : '▼'} ${Math.floor(Math.abs((annualSummary.current.taxes - annualSummary.previous.taxes) / Math.max(1, annualSummary.previous.taxes) * 100))}%` : '-'}
                    </td>
                  </tr>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <td><strong className="text-info">Utilidad Neta Anual:</strong></td>
                    <td className={`num font-bold ${annualSummary.current.net >= 0 ? 'text-positive' : 'text-negative'}`}>
                      ${annualSummary.current.net.toLocaleString()}
                    </td>
                    <td className="num">{annualSummary.previous ? `$${annualSummary.previous.net.toLocaleString()}` : '-'}</td>
                    <td className={`num ${annualSummary.previous ? (annualSummary.current.net >= annualSummary.previous.net ? 'text-positive' : 'text-negative') : ''}`}>
                      {annualSummary.previous ? `${annualSummary.current.net >= annualSummary.previous.net ? '▲' : '▼'} ${Math.floor(Math.abs((annualSummary.current.net - annualSummary.previous.net) / Math.max(1, Math.abs(annualSummary.previous.net)) * 100))}%` : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Clientes sumados:</strong></td>
                    <td className="num text-info">{annualSummary.current.clientGrowth >= 0 ? '+' : ''}{annualSummary.current.clientGrowth}</td>
                    <td className="num">{annualSummary.previous ? `${annualSummary.previous.clientGrowth >= 0 ? '+' : ''}${annualSummary.previous.clientGrowth}` : '-'}</td>
                    <td className="num">-</td>
                  </tr>
                </tbody>
              </table>

              {/* Stock exchange metrics inside annual balance if public */}
              {annualSummary.current.isPublic && (
                <div className="glass p-15 mt-10 mb-10" style={{ borderColor: 'var(--color-market-glow)', background: 'rgba(255,255,255,0.01)' }}>
                  <h4 className="text-info mb-10" style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>📈 Rendimiento en Bolsa de Valores</h4>
                  <div className="end-stat-grid" style={{ gridTemplateColumns: '1fr 1fr', rowGap: '8px' }}>
                    <div><strong>Acción Inicio de Año:</strong> <span className="font-mono">${annualSummary.current.sharePriceStart.toLocaleString()}</span></div>
                    <div><strong>Acción Cierre de Año:</strong> <span className="font-mono">${annualSummary.current.sharePriceEnd.toLocaleString()}</span></div>
                    <div><strong>Rendimiento Anual:</strong> <span className={`font-bold ${annualSummary.current.stockReturn >= 0 ? 'text-positive' : 'text-negative'}`}>{annualSummary.current.stockReturn >= 0 ? '+' : ''}{annualSummary.current.stockReturn}%</span></div>
                    <div><strong>Dividendos Pagados:</strong> <span className="text-warning font-mono">${annualSummary.current.dividendsPaid.toLocaleString()}</span></div>
                  </div>
                </div>
              )}

              <div className="glass p-15 card-desc mt-15 text-center" style={{ background: 'rgba(255,255,255,0.01)' }}>
                <strong>Perfil del Ejercicio:</strong> <span className="text-warning">{annualSummary.current.dominance}</span>
                <p style={{ fontSize: '0.82rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
                  {annualSummary.current.net >= 0 ? 
                    "🚀 Un año de excelente solvencia. El directorio celebra tus decisiones estratégicas." : 
                    "⚠️ Ejercicio con pérdidas netas acumuladas. Los accionistas exigen explicaciones."
                  }
                </p>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-primary btn-large w-100"
                onClick={() => setShowAnnualModal(false)}
              >
                Comenzar Siguiente Año de Ejercicio ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ELECTION RESULTS ================= */}
      {showElectionModal && (() => {
        const gov = GOVERNMENTS[electionDetails.newGov] || GOVERNMENTS.Radicalismo;
        return (
          <div id="election-modal" className="modal-overlay">
            <div className="modal-card glass animated-scale-up" style={{ maxWidth: '500px' }}>
              <h2 style={{ textAlign: 'center' }}>🗳️ ¡RESULTADO ELECTORAL!</h2>
              
              <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                <span className={`badge-gov ${gov.badgeClass}`} style={{ fontSize: '1.2rem', padding: '8px 24px', borderRadius: '6px' }}>
                  {electionDetails.newGov}
                </span>
              </div>

              <div className="modal-body">
                <p id="election-outcome-text" style={{ textAlign: 'center', marginBottom: '15px' }}>
                  El país ha votado. Asume la presidencia el partido de corte <strong>{electionDetails.newGov}</strong>.
                </p>
                
                <div className="election-changes-box glass p-15" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="projection-header" style={{ marginBottom: '10px' }}>📋 Programa Económico</div>
                  <ul id="election-changes-list" className="card-desc" style={{ paddingLeft: '15px', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>🏢 Filosofía: {gov.description}</li>
                    <li>💵 Tasa Impositiva Base: <strong>{gov.taxRatePct}%</strong></li>
                    <li>🏦 Interés de Deuda Base: <strong>{gov.interestPct}% / mes</strong></li>
                    {electionDetails.newGov === 'Liberalismo' && (
                      <>
                        <li>⚠️ Recorte Estatal: Se cancelan todas las licitaciones estatales activas.</li>
                        <li>🚀 Libre Mercado: Crecimiento acelerado de clientes privados (+5/mes).</li>
                      </>
                    )}
                    {electionDetails.newGov === 'Justicialismo' && (
                      <>
                        <li>📈 Consumo Subvencionado: Mayor rendimiento por cliente (+5% facturación).</li>
                        <li>⚠️ Sindicatos Fuertes: Mayores costos operativos (+15% costos de gestión).</li>
                      </>
                    )}
                    {electionDetails.newGov === 'Comunismo' && (
                      <>
                        <li>⚠️ Fuga de Clientes: Tu clientela privada cae un -5% mensual debido a regulaciones.</li>
                        <li>💵 Sueldos por Decreto: El salario se fija en $1.400 y no puede modificarse.</li>
                        <li>🤝 Licitaciones Abundantes: El Estado es el único comprador garantizado.</li>
                      </>
                    )}
                    {electionDetails.newGov === 'Provincianismo' && (
                      <>
                        <li>🏭 Alivio Regional: Rebaja de -5% de impuestos si eres rubro Industrial o Construcción.</li>
                        <li>🤝 Subsidios Directos: Requiere menos contactos para solicitar subsidios estatales.</li>
                      </>
                    )}
                    {electionDetails.newGov === 'Radicalismo' && (
                      <>
                        <li>⚖️ Institucionalidad: Licitaciones estables. Las coimas tienen doble riesgo jurídico.</li>
                        <li>📈 Previsibilidad: Sin sorpresas macroeconómicas extremas.</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button 
                  id="election-modal-close-btn" 
                  className="btn btn-primary w-100"
                  onClick={() => setShowElectionModal(false)}
                >
                  Afrontar las consecuencias
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* ================= MODAL: GAME OVER / WIN ================= */}

      {showGameOverModal && (
        <div id="gameover-modal" className="modal-overlay">
          <div className="modal-card glass animated-scale-up text-center">
            <h2 id="end-title">
              {gameOverReason === 'bankruptcy' ? '💸 QUIEBRA FINANCIERA' : '🏆 GRAN MAGNATE NACIONAL'}
            </h2>
            <div className="modal-body">
              <p id="end-description">
                {gameOverReason === 'bankruptcy' ? 
                  `Tus fondos en caja cayeron a ${formatMoney(state.cash)}, superando tu límite de descubierto autorizado de -${formatMoney(state.bankruptcyLimit || 500000)}. Los bancos congelaron tus actividades comerciales y remataron tus maquinarias.` :
                  "¡FELICITACIONES! Has alcanzado un patrimonio neto que supera los $10.000.000. Tu corporación es ahora dueña oculta de los resortes económicos de la patria."
                }
              </p>
              
              <div className="end-stats-box glass">
                <h3>Resumen de tu Imperio</h3>
                <div className="end-stat-grid">
                  <div><strong>Patrimonio:</strong> <span className="text-warning">{formatMoney(netAssetsVal)}</span></div>
                  <div><strong>Caja Final:</strong> <span className="text-positive">{formatMoney(state.cash)}</span></div>
                  <div><strong>Contactos Políticos:</strong> <span className="text-state">{state.contacts}%</span></div>
                  <div><strong>Eficiencia Operativa:</strong> <span className="text-positive">{state.efficiency}%</span></div>
                  <div><strong>Innovación Técnica:</strong> <span className="text-info">{state.innovation}%</span></div>
                  <div><strong>Meses Sobrevividos:</strong> <span>{state.turn} meses</span></div>
                </div>
              </div>
              
              <p className="final-verdict" id="end-verdict">
                {gameOverReason === 'bankruptcy' ? (
                  state.contacts > 40 ? "Tu ruina fue política: confiaste demasiado en los retornos oficiales." : "Tu ruina fue técnica: el mercado libre arrasó con tus costos altos."
                ) : (
                  state.contacts > 50 ? "Ganaste a base de favores y coimas. Sos un prócer de la patria contratista." : "Ganaste innovando y exportando de manera independiente. ¡Un verdadero héroe comercial!"
                )}
              </p>
            </div>
            <div className="modal-actions">
              <button 
                id="end-restart-btn" 
                className="btn btn-primary btn-large"
                onClick={handleRestart}
              >
                Volver a Jugar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
