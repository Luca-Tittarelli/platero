// PLATERO - Game settings, industries configurations and government parameters.

export const INDUSTRIES = {
  industrial: {
    name: "Establecimiento Industrial",
    cash: 80000,
    employees: 3,
    clients: 40,
    efficiency: 40,
    innovation: 10,
    reputation: 50,
    contacts: 5,
    baseMargin: 1000,
    baseOpCost: 700,
    fixedOpCost: 12000,
    capacityPerEmployee: 15,
    description: "Producción y manufactura pesada. Sensible a aranceles, insumos y maquinarias."
  },
  software: {
    name: "Consultora de Software",
    cash: 80000,
    employees: 2,
    clients: 35,
    efficiency: 20,
    innovation: 40,
    reputation: 60,
    contacts: 10,
    baseMargin: 1600,
    baseOpCost: 1100,
    fixedOpCost: 10000,
    capacityPerEmployee: 20,
    description: "Servicios de tecnología. Rápido crecimiento privado, pero expuesta a la fuga de talentos."
  },
  comercio: {
    name: "Distribuidora Comercial",
    cash: 60000,
    employees: 2,
    clients: 120,
    efficiency: 50,
    innovation: 5,
    reputation: 50,
    contacts: 15,
    baseMargin: 300,
    baseOpCost: 220,
    fixedOpCost: 15000,
    capacityPerEmployee: 80,
    description: "Importación y volumen masivo. Extremadamente sensible a devaluaciones y trabas aduaneras."
  },
  finanzas: {
    name: "Mesa de Dinero",
    cash: 90000,
    employees: 1,
    clients: 8,
    efficiency: 10,
    innovation: 20,
    reputation: 40,
    contacts: 20,
    baseMargin: 4000,
    baseOpCost: 3200,
    fixedOpCost: 14000,
    capacityPerEmployee: 10,
    description: "Especulación y arbitraje financiero. Altísima volatilidad, dependiente de tasas."
  },
  construccion: {
    name: "Constructora Urbana",
    cash: 100000,
    employees: 3,
    clients: 20,
    efficiency: 30,
    innovation: 10,
    reputation: 45,
    contacts: 25,
    baseMargin: 2000,
    baseOpCost: 1400,
    fixedOpCost: 18000,
    capacityPerEmployee: 8,
    description: "Obras civiles y licitaciones. Fuerte relación gremial y dependencia de fondos públicos."
  },
  agropecuario: {
    name: "Establecimiento Agropecuario",
    cash: 70000,
    employees: 4,
    clients: 15,
    efficiency: 35,
    innovation: 15,
    reputation: 55,
    contacts: 10,
    baseMargin: 2200,
    baseOpCost: 1600,
    fixedOpCost: 14000,
    capacityPerEmployee: 5,
    description: "Cultivo de granos y ganadería. Muy sensible a las retenciones, sequías y precios internacionales."
  }
};

// Calcula el costo de la próxima unidad de activo (rendimientos decrecientes)
export const getNextAssetCost = (machineryCount) => Math.floor(80000 + machineryCount * 20000);

// Eficiencia ganada por un activo
export const getAssetEfficiencyGain = (machineryCount) => {
  const gains = [20, 15, 12, 10, 9, 8, 7, 6, 5];
  return gains[Math.min(machineryCount, gains.length - 1)] ?? 4;
};

export const ASSETS_BY_INDUSTRY = {
  industrial: {
    singular: "Máquina Industrial",
    plural: "Activos en Maquinarias",
    emoji: "🏭",
    baseBtnLabel: "🏭 Comprar Máquina",
    confirmText: (cost, gain) => `¿Deseas comprar maquinaria pesada por $${cost.toLocaleString()}? Aumentará tu eficiencia operativa en +${gain}%.`,
    successMsg: "¡Maquinaria adquirida e instalada!",
    historyMsg: (cost, gain) => `Compraste maquinaria industrial ($${cost.toLocaleString()}). +${gain}% Eficiencia.`
  },
  software: {
    singular: "Servidor Cloud",
    plural: "Servidores / Servidores Cloud",
    emoji: "🖥️",
    baseBtnLabel: "🖥️ Adquirir Servidores",
    confirmText: (cost, gain) => `¿Deseas adquirir infraestructura y servidores cloud por $${cost.toLocaleString()}? Aumentará tu eficiencia operativa en +${gain}%.`,
    successMsg: "¡Servidores Cloud adquiridos y configurados!",
    historyMsg: (cost, gain) => `Adquiriste servidores cloud ($${cost.toLocaleString()}). +${gain}% Eficiencia.`
  },
  comercio: {
    singular: "Sucursal / Depósito",
    plural: "Sucursales / Depósitos",
    emoji: "🏪",
    baseBtnLabel: "🏪 Expandir Sucursal",
    confirmText: (cost, gain) => `¿Deseas abrir o expandir una sucursal y centro de distribución por $${cost.toLocaleString()}? Mejorará tu eficiencia logística en +${gain}%.`,
    successMsg: "¡Sucursal inaugurada y operativa!",
    historyMsg: (cost, gain) => `Expandiste una nueva sucursal ($${cost.toLocaleString()}). +${gain}% Eficiencia.`
  },
  finanzas: {
    singular: "Terminal de Bolsa / Servidor",
    plural: "Terminales Financieras / Servidores",
    emoji: "📈",
    baseBtnLabel: "📈 Adquirir Terminal",
    confirmText: (cost, gain) => `¿Deseas licenciar una terminal financiera avanzada por $${cost.toLocaleString()}? Aumentará tu eficiencia operativa en +${gain}%.`,
    successMsg: "¡Terminal financiera integrada!",
    historyMsg: (cost, gain) => `Licenciaste terminales financieras ($${cost.toLocaleString()}). +${gain}% Eficiencia.`
  },
  construccion: {
    singular: "Maquinaria Vial",
    plural: "Equipos de Obra",
    emoji: "🚜",
    baseBtnLabel: "🚜 Comprar Maquinaria",
    confirmText: (cost, gain) => `¿Deseas comprar maquinaria vial pesada por $${cost.toLocaleString()}? Aumentará tu eficiencia de obra en +${gain}%.`,
    successMsg: "¡Maquinaria vial incorporada a la flota!",
    historyMsg: (cost, gain) => `Compraste maquinaria vial ($${cost.toLocaleString()}). +${gain}% Eficiencia.`
  },
  agropecuario: {
    singular: "Tractor / Cosechadora",
    plural: "Flota de Tractores",
    emoji: "🌾",
    baseBtnLabel: "🌾 Comprar Tractor",
    confirmText: (cost, gain) => `¿Deseas adquirir una cosechadora avanzada por $${cost.toLocaleString()}? Aumentará tu eficiencia de siembra en +${gain}%.`,
    successMsg: "¡Cosechadora agrícola adquirida y lista para la siembra!",
    historyMsg: (cost, gain) => `Compraste cosechadora agrícola ($${cost.toLocaleString()}). +${gain}% Eficiencia.`
  }
};

// Costo de mantenimiento preventivo: 3% del valor total de activos
export const getMaintenanceCost = (machineryCount) => Math.floor(machineryCount * 80000 * 0.03);

export const GOVERNMENTS = {
  Liberalismo: {
    name: "Liberalismo",
    taxRate: 0.10,
    interestRate: 0.02,
    tendersChance: 0.20,
    bribeEfficiency: 0.20,
    badgeClass: "gov-liberal",
    taxRatePct: 10,
    interestPct: 2,
    description: "Impuestos mínimos, libre mercado absoluto, pocas licitaciones estatales. Sindicatos débiles."
  },
  Radicalismo: {
    name: "Radicalismo",
    taxRate: 0.22,
    interestRate: 0.04,
    tendersChance: 0.50,
    bribeEfficiency: 0.50,
    badgeClass: "gov-radical",
    taxRatePct: 22,
    interestPct: 4,
    description: "Moderación fiscal, licitaciones transparentes, sindicatos institucionalizados. Coimas con doble penalidad."
  },
  Justicialismo: {
    name: "Justicialismo",
    taxRate: 0.30,
    interestRate: 0.07,
    tendersChance: 0.85,
    bribeEfficiency: 1.20,
    badgeClass: "gov-justicialista",
    taxRatePct: 30,
    interestPct: 7,
    description: "Fuerte gasto público, licitaciones abundantes, sindicatos poderosos (paros frecuentes) y alta inflación."
  },
  Comunismo: {
    name: "Comunismo",
    taxRate: 0.45,
    interestRate: 0.12,
    tendersChance: 1.00,
    bribeEfficiency: 1.50,
    badgeClass: "gov-comunismo",
    taxRatePct: 45,
    interestPct: 12,
    description: "Economía planificada. Licitaciones forzosas, salarios estatales fijos, fuga masiva de clientes privados (-5% mes)."
  },
  Provincianismo: {
    name: "Provincianismo",
    taxRate: 0.18,
    interestRate: 0.035,
    tendersChance: 0.65,
    bribeEfficiency: 0.90,
    badgeClass: "gov-provincial",
    taxRatePct: 18,
    interestPct: 3.5,
    description: "Foco regional, subsidios fáciles, rebaja tributaria (-5%) para industria y construcción."
  }
};

export const getGovPeMultiplier = (govType) => {
  if (govType === "Liberalismo") return 1.20;
  if (govType === "Radicalismo") return 1.00;
  if (govType === "Provincianismo") return 0.95;
  if (govType === "Justicialismo") return 0.70;
  if (govType === "Comunismo") return 0.25;
  return 1.00;
};
