// PLATERO - Events database representing 50 Argentine business events and conditional choices.

const isIntervencionista = (gov) => ["Justicialismo", "Comunismo"].includes(gov);
const isProMercado = (gov) => ["Liberalismo", "Provincianismo"].includes(gov);

export const events = [
  {
    id: 1,
    title: "El Inspector Coimero",
    category: "AUDITORÍA",
    description: "Un inspector municipal se presenta en tu establecimiento. Revisa todo con lupa y dice encontrar 'graves infracciones' que clausurarían tu negocio por 3 semanas. Sin embargo, te guiña el ojo y murmura: 'Podemos arreglarlo acá...'",
    trigger: (state) => state.contacts < 30 && state.employees > 1,
    options: [
      {
        text: "Agradecer el 'favor' y deslizarle un billete grueso bajo la mesa (-$5.000)",
        outcomeText: "El inspector sonríe, anota que todo está en orden y te da su número. Ganás contactos pero aumenta tu riesgo ante futuras auditorías.",
        action: (state) => {
          state.cash -= 5000;
          state.contacts = Math.min(100, state.contacts + 15);
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 10);
          state.historyLog.unshift(`[Inspector] Pagaste coima discrecional. +15 Contactos, +10 Riesgo Judicial.`);
        }
      },
      {
        text: "Denunciarlo formalmente y seguir los canales legales (-$10.000)",
        outcomeText: "Los abogados municipales demoran todo. Lográs evitar la clausura, pero el sindicato y otros inspectores te marcan como 'problemático'.",
        action: (state) => {
          state.cash -= 10000;
          state.reputation = Math.min(100, state.reputation + 20);
          state.contacts = Math.max(0, state.contacts - 10);
          state.independence = Math.min(100, state.independence + 10);
          state.historyLog.unshift(`[Inspector] Denunciaste coima por canales legales. +20 Reputación, -10 Contactos.`);
        }
      },
      {
        text: "Usar tus contactos en la intendencia para anular la inspección",
        condition: (state) => state.contacts >= 20,
        conditionText: "Requiere 20% de Contactos",
        outcomeText: "Llamás al secretario del intendente. Minutos después, el inspector recibe un llamado, pide disculpas y se retira colorado.",
        action: (state) => {
          state.contacts = Math.max(0, state.contacts - 5);
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 5);
          state.historyLog.unshift(`[Inspector] Cancelaste inspección mediante favores en la intendencia.`);
        }
      }
    ]
  },
  {
    id: 2,
    title: "Cepo al Dólar",
    category: "POLÍTICA & MACRO",
    description: "El Banco Central anuncia restricciones severas para acceder al mercado de cambios formal. Tus proveedores de materias primas o insumos importados te dicen que no pueden entregar mercadería si no les pagás en moneda extranjera.",
    trigger: (state) => isIntervencionista(state.governmentType) && state.turn > 2,
    options: [
      {
        text: "Pagar a través de canales informales ('Dólar Blue') para no frenar la producción (-$20.000)",
        outcomeText: "La producción continúa con normalidad, pero operaste fuera de la ley. +15 Riesgo de AFIP.",
        action: (state) => {
          state.cash -= 20000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 15);
          state.efficiency = Math.min(100, state.efficiency + 5);
          state.historyLog.unshift(`[Dólar] Usaste dólares blue para insumos. -$20.000, +15 Riesgo Judicial.`);
        }
      },
      {
        text: "Hacer arbitraje cambiario aprovechando la brecha (Especial Mesa de Dinero)",
        condition: (state) => state.businessType === "finanzas",
        conditionText: "Exclusivo Mesa de Dinero",
        outcomeText: "Comprás en el oficial y vendés en el paralelo mediante sociedades fantasma. Haces una ganancia descomunal.",
        action: (state) => {
          state.cash += 80000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 25);
          state.historyLog.unshift(`[Finanzas] Arbitraje de brecha cambiaria exitoso. +$80.000, +25 Riesgo AFIP.`);
        }
      },
      {
        text: "Reemplazar insumos por alternativas nacionales ('Comprá Nacional!')",
        outcomeText: "Apoyas el mercado local y el gobierno lo celebra. No obstante, la calidad de tu producto baja notablemente.",
        action: (state) => {
          state.efficiency = Math.max(10, state.efficiency - 15);
          state.reputation = Math.min(100, state.reputation + 10);
          state.contacts = Math.min(100, state.contacts + 5);
          state.historyLog.unshift(`[Dólar] Reemplazaste insumos por nacionales. -15% Eficiencia, +10 Reputación.`);
        }
      }
    ]
  },
  {
    id: 3,
    title: "El Apriete del Sindicato",
    category: "SINDICATO",
    description: "El delegado gremial golpea tu puerta. Exige un bono extraordinario 'anti-inflación' inmediato para todos los empleados. Si no accedes, amenazan con un paro por tiempo indeterminado y bloqueo de tu establecimiento.",
    trigger: (state) => state.employees >= 3,
    options: [
      {
        text: "Ceder y pagar el bono completo a todos (-$25.000 en caja)",
        outcomeText: "Los trabajadores están felices y la eficiencia sube temporalmente. Conservas la paz social.",
        action: (state) => {
          state.cash -= 25000;
          state.reputation = Math.min(100, state.reputation + 15);
          state.efficiency = Math.min(100, state.efficiency + 10);
          state.historyLog.unshift(`[Sindicato] Pagaste bono extraordinario al gremio. Paz social asegurada.`);
        }
      },
      {
        text: "Llamar a un 'amigo' del Ministerio de Trabajo para que dicte Conciliación Obligatoria",
        condition: (state) => state.contacts >= 20,
        conditionText: "Requiere 20% de Contactos",
        outcomeText: "El funcionario firma el decreto y frena el paro sin pagarles nada. Ahorraste dinero, pero tus empleados están resentidos.",
        action: (state) => {
          state.contacts = Math.max(0, state.contacts - 5);
          state.stateDependence = Math.min(100, state.stateDependence + 10);
          state.efficiency = Math.max(10, state.efficiency - 10);
          state.historyLog.unshift(`[Sindicato] Usaste contactos para dictar Conciliación Obligatoria. Empleados molestos.`);
        }
      },
      {
        text: "Negarte rotundamente y resistir el bloqueo de la fábrica",
        outcomeText: "La fábrica sufre vandalismo menor y perdés ingresos de inmediato por parálisis de producción. No obstante, te volvés un héroe de las cámaras empresariales privadas.",
        action: (state) => {
          state.cash -= 15000;
          state.reputation = Math.max(0, state.reputation - 10);
          state.independence = Math.min(100, state.independence + 25);
          state.historyLog.unshift(`[Sindicato] Enfrentaste el paro gremial. -$15.000 por parálisis, +25 Independencia.`);
        }
      }
    ]
  },
  {
    id: 4,
    title: "Plan Platita (Campañas Electorales)",
    category: "POLÍTICA",
    description: "Faltan pocos meses para las elecciones presidenciales. Un recaudador de campaña del partido gobernante te visita informalmente. Te sugiere hacer un 'aporte patriótico' en efectivo para financiar los afiches de campaña a cambio de 'futuras consideraciones legislativas'.",
    trigger: (state) => state.turn % 24 >= 18 && state.turn % 24 <= 22 && state.cash >= 40000,
    options: [
      {
        text: "Aportar $40.000 a la campaña oficialista",
        outcomeText: "Te convertís en un 'amigo de la casa'. Tus contactos explotan. Si ganan, tendrás enormes beneficios. Si pierden, estarás en la mira del nuevo gobierno.",
        action: (state) => {
          state.cash -= 40000;
          state.contacts = Math.min(100, state.contacts + 30);
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 15);
          state.stateDependence = Math.min(100, state.stateDependence + 15);
          state.historyLog.unshift(`[Elecciones] Aportaste $40.000 al partido oficialista. +30 Contactos.`);
        }
      },
      {
        text: "Financiar en secreto a la oposición reformista ($30.000)",
        outcomeText: "Apuestas al cambio. Los contactos actuales se enfrían, pero si la oposición asume el poder, tendrás un canal directo.",
        action: (state) => {
          state.cash -= 30000;
          state.contacts = Math.max(0, state.contacts - 10);
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 10);
          state.independence = Math.min(100, state.independence + 10);
          state.historyLog.unshift(`[Elecciones] Aportaste $30.000 a la oposición. -10 Contactos oficiales.`);
        }
      },
      {
        text: "Declinar amablemente y declarar neutralidad corporativa",
        outcomeText: "No gastas dinero. Te mantienes alejado de la corrupción, pero el partido gobernante toma nota de tu 'falta de compromiso'.",
        action: (state) => {
          state.contacts = Math.max(0, state.contacts - 15);
          state.independence = Math.min(100, state.independence + 20);
          state.reputation = Math.min(100, state.reputation + 10);
          state.historyLog.unshift(`[Elecciones] Declinaste financiar la política. +20 Independencia, -15 Contactos.`);
        }
      }
    ]
  },
  {
    id: 5,
    title: "Auditoría de la AFIP",
    category: "AUDITORÍA",
    description: "Inspectores de la AFIP (fisco) llegan a tus oficinas con una orden de inspección exhaustiva debido a inconsistencias de facturación reportadas por tu sistema tributario.",
    trigger: (state) => state.corruptionRisk > 30,
    options: [
      {
        text: "Arreglar con el supervisor de la auditoría en privado (-$40.000)",
        outcomeText: "Firma un acta limpia sin reclamos. Tu riesgo de causa judicial baja ya que los expedientes se 'traspapelan'.",
        action: (state) => {
          state.cash -= 40000;
          state.corruptionRisk = Math.max(0, state.corruptionRisk - 25);
          state.contacts = Math.min(100, state.contacts + 10);
          state.historyLog.unshift(`[AFIP] Coimeaste al auditor de AFIP. -25 Riesgo Judicial, +10 Contactos.`);
        }
      },
      {
        text: "Pagar la multa fiscal y regularizar la deuda (-$90.000)",
        outcomeText: "Impacto demoledor a tu liquidez inmediata, pero tu reputación se mantiene impecable y limpias tu historial legal.",
        action: (state) => {
          state.cash -= 90000;
          state.corruptionRisk = Math.max(0, state.corruptionRisk - 40);
          state.reputation = Math.min(100, state.reputation + 15);
          state.historyLog.unshift(`[AFIP] Pagaste multa impositiva completa. -$90.000, -40 Riesgo Judicial.`);
        }
      },
      {
        text: "Iniciar litigio judicial mediante un bufete tributario influyente (-$25.000)",
        outcomeText: "Los abogados congelan la multa apelando en tribunales. Ganas tiempo, pero tu riesgo judicial se incrementa.",
        action: (state) => {
          state.cash -= 25000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 15);
          state.historyLog.unshift(`[AFIP] Litigaste contra la AFIP. Juicio en curso. +15 Riesgo Judicial.`);
        }
      }
    ]
  },
  {
    id: 6,
    title: "La Gran Devaluación",
    category: "ECONOMÍA",
    description: "Debido a presiones macroeconómicas, el Banco Central devalúa la moneda oficial un 40% en un solo día. Los precios de insumos se disparan y la inflación se acelera de inmediato.",
    trigger: (state) => state.turn % 12 === 0,
    options: [
      {
        text: "Trasladar de inmediato el 35% del costo a tus precios de lista",
        outcomeText: "Salvas tu margen de ganancia pero tus clientes privados se indignan. Pierdes un 20% de tus clientes privados.",
        action: (state) => {
          const clientsLost = Math.floor(state.clients * 0.2);
          state.clients = Math.max(10, state.clients - clientsLost);
          state.reputation = Math.max(0, state.reputation - 15);
          state.historyLog.unshift(`[Devaluación] Remarcaste precios 35%. Perdiste ${clientsLost} clientes.`);
        }
      },
      {
        text: "Absorber el costo para mantener la clientela intacta",
        outcomeText: "Tus márgenes caen drásticamente este mes pero tus clientes alaban tu solidaridad. Tu reputación aumenta.",
        action: (state) => {
          state.cash -= 25000;
          state.reputation = Math.min(100, state.reputation + 20);
          state.historyLog.unshift(`[Devaluación] Absorber costos redujo tu caja -$25.000. +20 Reputación.`);
        }
      },
      {
        text: "Aprovechar tus contactos para obtener un subsidio compensatorio",
        condition: (state) => state.contacts >= 25,
        conditionText: "Requiere 25% de Contactos",
        outcomeText: "El gobierno te rescata con un aporte no reembolsable alegando 'sostén de la producción y el empleo'. Recibes $30.000.",
        action: (state) => {
          state.cash += 30000;
          state.stateDependence = Math.min(100, state.stateDependence + 15);
          state.historyLog.unshift(`[Devaluación] Obtuviste rescate estatal de $30.000 por contactos.`);
        }
      }
    ]
  },
  {
    id: 7,
    title: "Licitación de Obra Municipal",
    category: "LICITACIÓN",
    description: "La intendencia abre una licitación de urgencia para proveer insumos/servicios al hospital local. La licitación paga muy bien, pero exige participar rápido.",
    trigger: (state) => isIntervencionista(state.governmentType) && state.cash >= 15000,
    options: [
      {
        text: "Hacer una oferta honesta con un pliego técnico intachable (-$10.000)",
        outcomeText: "Competís legalmente. Tu reputación técnica sube, pero las chances de ganar son bajas si el intendente tiene amigos.",
        action: (state) => {
          state.cash -= 10000;
          state.reputation = Math.min(100, state.reputation + 10);
          const win = Math.random() < 0.2;
          if (win) {
            state.cash += 120000;
            state.stateDependence = Math.min(100, state.stateDependence + 10);
            state.historyLog.unshift(`[Licitación] Ganaste la licitación honestamente. +$120.000.`);
          } else {
            state.historyLog.unshift(`[Licitación] Participaste en licitación municipal honesta pero la perdiste.`);
          }
        }
      },
      {
        text: "Hablar con el chofer del intendente y acordar un retorno impositivo (-$15.000 coima)",
        outcomeText: "Tu propuesta técnica es floja, pero aseguras la adjudicación de inmediato. +20 Riesgo Judicial.",
        action: (state) => {
          state.cash -= 15000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 20);
          state.contacts = Math.min(100, state.contacts + 15);
          state.stateDependence = Math.min(100, state.stateDependence + 20);
          const win = Math.random() < 0.85;
          if (win) {
            state.cash += 140000;
            state.historyLog.unshift(`[Licitación] Adjudicación directa por coima. +$140.000, +20 Riesgo AFIP.`);
          } else {
            state.historyLog.unshift(`[Licitación] Pagaste coima pero el pliego fue auditoriado y anulado. Perdiste $15.000.`);
          }
        }
      },
      {
        text: "Abstenerse e invertir ese dinero en mejorar tu capacidad técnica (-$10.000)",
        outcomeText: "Prefieres no lidiar con el gobierno. Tu eficiencia operativa aumenta permanentemente.",
        action: (state) => {
          state.cash -= 10000;
          state.efficiency = Math.min(100, state.efficiency + 8);
          state.independence = Math.min(100, state.independence + 15);
          state.historyLog.unshift(`[Licitación] Rechazaste licitación. Invertiste en capacidad. +8% Eficiencia.`);
        }
      }
    ]
  },
  {
    id: 8,
    title: "Fuga de Cerebros",
    category: "OPERACIONES",
    description: "Tres de tus ingenieros / especialistas más calificados reciben ofertas de trabajo en el exterior para cobrar en dólares. Si no les igualás las condiciones, se irán de inmediato, dañando tu calidad operativa.",
    trigger: (state) => state.employees >= 3 && state.businessType === "software",
    options: [
      {
        text: "Dolarizar sus sueldos (aumenta tus gastos salariales mensuales 40%)",
        outcomeText: "Retienes al personal clave. Tu innovación técnica da un salto positivo, pero tu costo fijo explota.",
        action: (state) => {
          state.salaryPerEmployee = Math.floor(state.salaryPerEmployee * 1.4);
          state.innovation = Math.min(100, state.innovation + 15);
          state.historyLog.unshift(`[Sueldos] Dolarizaste sueldos del personal clave. Gastos fijos +40%.`);
        }
      },
      {
        text: "Dejarlos ir y contratar juniors a menor sueldo",
        outcomeText: "Tus costos salariales bajan temporalmente, pero tu innovación y la satisfacción del cliente sufren gravemente.",
        action: (state) => {
          state.innovation = Math.max(0, state.innovation - 20);
          state.efficiency = Math.max(10, state.efficiency - 10);
          const lostClients = Math.floor(state.clients * 0.15);
          state.clients = Math.max(10, state.clients - lostClients);
          state.historyLog.unshift(`[Talento] Pérdida de ingenieros clave. Reemplazados por juniors. -20% Innovación.`);
        }
      }
    ]
  },
  {
    id: 9,
    title: "Subsidio Industrial Amigo",
    category: "POLÍTICA",
    description: "La Secretaría de Producción abre un registro para subsidios compensatorios no reembolsables de reactivación industrial. Solo hay cupo para empresas aliadas.",
    trigger: (state) => state.contacts >= 20 && isIntervencionista(state.governmentType) && state.businessType === "industrial",
    options: [
      {
        text: "Llamar al Director para ingresar tu CUIT en la lista de beneficiarios",
        outcomeText: "Recibes un jugoso subsidio en efectivo ($150.000). A cambio, te comprometes a participar en eventos del partido oficialista.",
        action: (state) => {
          state.cash += 150000;
          state.stateDependence = Math.min(100, state.stateDependence + 25);
          state.contacts = Math.min(100, state.contacts + 10);
          state.historyLog.unshift(`[Subsidio] Obtuviste subsidio discrecional. +$150.000 cash, +25 Dependencia.`);
        }
      },
      {
        text: "Rechazar ayuda estatal y priorizar tu independencia",
        outcomeText: "Tus competidores reciben la plata y tú no. Sin embargo, tu perfil técnico privado es valorado internacionalmente.",
        action: (state) => {
          state.independence = Math.min(100, state.independence + 25);
          state.reputation = Math.min(100, state.reputation + 15);
          state.historyLog.unshift(`[Subsidio] Rechazaste subsidio estatal. +25 Independencia.`);
        }
      }
    ]
  },
  {
    id: 10,
    title: "Exportación al Mercosur",
    category: "ECONOMÍA & MERCADO",
    description: "Una distribuidora de San Pablo, Brasil, está interesada en tu catálogo de productos. Te exigen pasar rigurosos controles de calidad internacionales para cerrar el contrato de venta.",
    // Corrected logic: Restrict to non-software, non-finance industries since software has its own ISO 9001 quality event
    trigger: (state) => (state.businessType === "industrial" || state.businessType === "comercio") && state.innovation >= 35 && state.efficiency >= 35 && state.cash >= 30000,
    options: [
      {
        text: "Adecuar tu planta e infraestructura para exportar (-$30.000)",
        outcomeText: "El contrato se sella. Logras una fuente masiva de clientes privados recurrentes y tu reputación explota.",
        action: (state) => {
          state.cash -= 30000;
          state.clients = Math.min(1000, state.clients + 120);
          state.reputation = Math.min(100, state.reputation + 25);
          state.independence = Math.min(100, state.independence + 15);
          state.historyLog.unshift(`[Mercosur] Exportación a Brasil cerrada exitosamente. +120 Clientes, +25 Reputación.`);
        }
      },
      {
        text: "Desestimar y mantener foco en el mercado doméstico",
        outcomeText: "Ahorras el desembolso inicial, pero tu competencia toma el mercado brasileño.",
        action: (state) => {
          state.independence = Math.max(0, state.independence - 10);
          state.historyLog.unshift(`[Mercosur] Rechazaste exportar. El competidor tomó el mercado internacional.`);
        }
      }
    ]
  },
  {
    id: 11,
    title: "El Lavado de Campaña",
    category: "POLÍTICA",
    description: "Un empresario vinculado al gobierno te propone sobrefacturar servicios de consultoría o subcontratos para 'retornar' dinero de la campaña electoral. A cambio te dejará un 30% de comisión libre en mano.",
    trigger: (state) => state.contacts >= 40 && state.cash < 200000,
    options: [
      {
        text: "Aceptar el negocio sucio (Recibes $250.000 limpios)",
        outcomeText: "Tu cuenta bancaria brilla. Pero la maniobra es grosera y la oposición toma nota para futuras auditorías penales.",
        action: (state) => {
          state.cash += 250000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 35);
          state.contacts = Math.min(100, state.contacts + 15);
          state.stateDependence = Math.min(100, state.stateDependence + 15);
          state.historyLog.unshift(`[Lavado] Aceptaste sobrefacturación política. +$250.000, +35 Riesgo AFIP.`);
        }
      },
      {
        text: "Rechazar la propuesta de manera anónima y limpiar tus libros",
        outcomeText: "Te ganas enemigos en el ministerio, pero ganas una reputación inquebrantable en el sector privado.",
        action: (state) => {
          state.contacts = Math.max(0, state.contacts - 25);
          state.reputation = Math.min(100, state.reputation + 30);
          state.independence = Math.min(100, state.independence + 20);
          state.historyLog.unshift(`[Lavado] Denunciaste sobrefacturación. -25 Contactos, +30 Reputación.`);
        }
      }
    ]
  },
  {
    id: 12,
    title: "Crisis de Energía y Cortes",
    category: "OPERACIONES",
    description: "El sistema eléctrico nacional colapsa por ola de calor. Se imponen cortes rotativos de 8 horas diarias. Tu capacidad operativa corre peligro de paralizarse.",
    trigger: (state) => state.turn > 5,
    options: [
      {
        // Dynamic text context (software/finance uses UPS backup systems; industrial/building/commerce uses diesel generators)
        text: (state) => state.businessType === "software" || state.businessType === "finanzas" 
          ? "Comprar sistemas de UPS y baterías de respaldo (-$50.000)" 
          : "Comprar un generador diésel industrial de emergencia (-$50.000)",
        outcomeText: "Garantizas la continuidad operativa. La eficiencia sube a largo plazo y demuestras confiabilidad ante clientes.",
        action: (state) => {
          state.cash -= 50000;
          state.efficiency = Math.min(100, state.efficiency + 15);
          state.reputation = Math.min(100, state.reputation + 10);
          state.historyLog.unshift(`[Corte] Compraste energía propia de respaldo. +15% Eficiencia operativa.`);
        }
      },
      {
        text: "Pedir un favor a la Secretaría de Energía para ser exceptuado del corte",
        condition: (state) => state.contacts >= 20,
        conditionText: "Requiere 20% de Contactos",
        outcomeText: "Consigues que reconecten tu cuadrícula eléctrica sin gastar dinero en generadores mediante favores políticos.",
        action: (state) => {
          state.stateDependence = Math.min(100, state.stateDependence + 10);
          state.historyLog.unshift(`[Corte] Evitaste cortes mediante influencias en la Secretaría de Energía.`);
        }
      },
      {
        text: "Reducir turnos de trabajo y aceptar demoras",
        outcomeText: "No inviertes dinero, pero tu producción cae y pierdes un 10% de clientes insatisfechos.",
        action: (state) => {
          const lost = Math.floor(state.clients * 0.1);
          state.clients = Math.max(10, state.clients - lost);
          state.historyLog.unshift(`[Corte] Ajustaste turnos por cortes. Perdiste ${lost} clientes.`);
        }
      }
    ]
  },
  {
    id: 13,
    title: "Inversor Tecnológico (Venture Capital)",
    category: "MERCADO & INNOVACIÓN",
    description: "Un fondo de capitales privados de Silicon Valley se interesa en tu infraestructura técnica. Te ofrecen comprar una participación minoritaria de tu empresa.",
    trigger: (state) => state.innovation >= 30 && state.businessType === "software" && state.independence >= 50,
    options: [
      {
        text: "Vender el 15% de participación a cambio de $200.000",
        outcomeText: "Inyección masiva de dinero que te permite expandir operaciones. Subes tu competitividad de inmediato.",
        action: (state) => {
          state.cash += 200000;
          state.reputation = Math.min(100, state.reputation + 20);
          state.efficiency = Math.min(100, state.efficiency + 15);
          state.independence = Math.max(0, state.independence - 15);
          state.historyLog.unshift(`[Inversión] Inversor VC aportó $200.000. +15% Eficiencia.`);
        }
      },
      {
        text: "Rechazar la oferta para mantener control absoluto",
        outcomeText: "Tus clientes valoran tu soberanía local y tu independencia permanece intacta.",
        action: (state) => {
          state.independence = Math.min(100, state.independence + 20);
          state.reputation = Math.min(100, state.reputation + 10);
          state.historyLog.unshift(`[Inversión] Rechazaste capital extranjero. +20 Independencia.`);
        }
      }
    ]
  },
  {
    id: 14,
    title: "Moratoria Fiscal Impositiva",
    category: "POLÍTICA & FINANZAS",
    description: "El congreso sanciona una moratoria impositiva histórica. Permite regularizar deudas fiscales acumuladas sin intereses y con quitas del 50%. Ideal para ordenar los números.",
    trigger: (state) => isIntervencionista(state.governmentType) && state.corruptionRisk > 20 && state.cash >= 30000,
    options: [
      {
        text: "Adherir a la moratoria blanqueando tus deudas (-$30.000)",
        outcomeText: "Limpias tu legajo fiscal de manera legal a bajo costo. Tu riesgo judicial disminuye notablemente.",
        action: (state) => {
          state.cash -= 30000;
          state.corruptionRisk = Math.max(0, state.corruptionRisk - 20);
          state.contacts = Math.min(100, state.contacts + 5);
          state.historyLog.unshift(`[AFIP] Adheriste a moratoria impositiva. -20 Riesgo Judicial.`);
        }
      },
      {
        text: "No adherir y mostrar tu conducta fiscal intachable",
        outcomeText: "Ganas la admiración del sector bancario privado. Mejora tu perfil para créditos futuros.",
        action: (state) => {
          state.reputation = Math.min(100, state.reputation + 15);
          state.independence = Math.min(100, state.independence + 10);
          state.historyLog.unshift(`[AFIP] Ignoraste la moratoria fiscal. +15 Reputación.`);
        }
      }
    ]
  },
  {
    id: 15,
    title: "El Sobrino Acomodado",
    category: "POLÍTICA & EMPRESA",
    description: "Un subsecretario clave del Ministerio de Obras Públicas te sugiere sutilmente contratar a su sobrino recién graduado como 'asesor de relaciones gubernamentales' con un sueldo alto ($4.000/mes). Si lo haces, tus propuestas de adjudicación de servicios y pliegos avanzarán rápido.",
    trigger: (state) => state.contacts >= 20 && state.employees > 2,
    options: [
      {
        text: "Contratar al sobrino como asesor estrella (-$4.000 mensuales en sueldos)",
        outcomeText: "Es un inútil total, pero el subsecretario te allana el camino en licitaciones del estado. Tus contactos se fortalecen.",
        action: (state) => {
          state.salaryPerEmployee = Math.floor(state.salaryPerEmployee + 1000);
          state.contacts = Math.min(100, state.contacts + 25);
          state.stateDependence = Math.min(100, state.stateDependence + 15);
          state.historyLog.unshift(`[Nepotismo] Contrataste al sobrino del subsecretario. +25 Contactos.`);
        }
      },
      {
        text: "Rechazar la propuesta basándote en mérito profesional",
        outcomeText: "El subsecretario se ofende profundamente. Tus posibilidades en contratos de obras y licitaciones del estado caen.",
        action: (state) => {
          state.contacts = Math.max(0, state.contacts - 20);
          state.reputation = Math.min(100, state.reputation + 20);
          state.independence = Math.min(100, state.independence + 15);
          state.historyLog.unshift(`[Nepotismo] Rechazaste nepotismo del subsecretario. -20 Contactos, +20 Reputación.`);
        }
      }
    ]
  },
  {
    id: 16,
    title: "Escándalo de Cuadernos y Coimas",
    category: "POLÍTICA & AUDITORÍA",
    description: "Un chofer arrepentido entrega a la justicia cuadernos con registros de coimas en obras públicas. Un competidor te menciona en una declaración. Los periodistas empiezan a acosar a tu empresa.",
    trigger: (state) => state.corruptionRisk >= 40,
    options: [
      {
        text: "Pagar una pauta publicitaria millonaria para blindarte mediáticamente (-$60.000)",
        condition: (state) => state.cash >= 60000,
        conditionText: "Requiere $60.000 en Caja",
        outcomeText: "Los grandes medios ocultan tu nombre. Minimizas la pérdida de reputación pública, pero tu bolsillo duele.",
        action: (state) => {
          state.cash -= 60000;
          state.reputation = Math.max(0, state.reputation - 5);
          state.historyLog.unshift(`[Prensa] Blindaste mediáticamente tu nombre. -$60.000.`);
        }
      },
      {
        text: "Declarar ante la justicia como arrepentido y aportar pruebas sobre funcionarios",
        outcomeText: "Traicionas al partido oficialista. Tus contactos gubernamentales se pulverizan, pero evitas multas penales.",
        action: (state) => {
          state.contacts = Math.max(0, state.contacts - 40);
          state.corruptionRisk = Math.max(0, state.corruptionRisk - 30);
          state.reputation = Math.max(0, state.reputation - 20);
          state.independence = Math.min(100, state.independence + 15);
          state.historyLog.unshift(`[Prensa] Declaraste como arrepentido. -40 Contactos, -30 Riesgo Judicial.`);
        }
      },
      {
        text: "Negar todo y resistir las acusaciones sin declarar",
        outcomeText: "Estalla el escándalo. Tu reputación cae en picada y tus clientes privados huyen del susto. Pierdes un 30% de tus clientes.",
        action: (state) => {
          state.reputation = Math.max(0, state.reputation - 35);
          const lost = Math.floor(state.clients * 0.3);
          state.clients = Math.max(10, state.clients - lost);
          state.historyLog.unshift(`[Prensa] Negaste las acusaciones del chofer. Perdiste ${lost} clientes por escándalo.`);
        }
      }
    ]
  },
  {
    id: 17,
    title: "Aranceles Proteccionistas",
    category: "ECONOMÍA & POLÍTICA",
    description: "Bajo presión de las cámaras fabriles, el gobierno intervencionista impone aranceles prohibitivos a los productos importados. La competencia extranjera queda bloqueada.",
    trigger: (state) => isIntervencionista(state.governmentType) && state.businessType === "industrial",
    options: [
      {
        text: "Festejar la medida y aumentar tus precios de lista un 15%",
        outcomeText: "Aprovechas el monopolio de facto para inflar ganancias. Tus ganancias suben, pero la reputación social baja.",
        action: (state) => {
          state.reputation = Math.max(0, state.reputation - 10);
          state.cash += 40000;
          state.historyLog.unshift(`[Aranceles] Aprovechaste protección arancelaria para subir precios. +$40.000.`);
        }
      },
      {
        text: "Mantener precios estables y ganar participación de mercado",
        outcomeText: "Capturas clientes que antes importaban. Tu base de clientes privados sube significativamente.",
        action: (state) => {
          state.clients = Math.min(1000, state.clients + 60);
          state.reputation = Math.min(100, state.reputation + 15);
          state.historyLog.unshift(`[Aranceles] Mantuviste precios estables ante el arancel. +60 Clientes nuevos.`);
        }
      }
    ]
  },
  {
    id: 18,
    title: "Apertura de Importaciones",
    category: "ECONOMÍA & POLÍTICA",
    description: "El nuevo gobierno liberal abre unilateralmente las aduanas. Productos extranjeros inundan el mercado doméstico a mitad de precio de lo que te cuesta producir a ti.",
    trigger: (state) => isProMercado(state.governmentType) && state.turn > 2 && (state.businessType === "industrial" || state.businessType === "comercio"),
    options: [
      {
        text: "Reducir la calidad de fabricación o distribución para bajar costos un 30%",
        outcomeText: "Puedes competir en precio, pero tu reputación de marca sufre un golpe irreparable.",
        action: (state) => {
          state.efficiency = Math.min(100, state.efficiency + 10);
          state.reputation = Math.max(0, state.reputation - 25);
          state.historyLog.unshift(`[Apertura] Redujiste calidad de tus productos para sobrevivir en precio.`);
        }
      },
      {
        text: "Invertir en automatización y logística avanzada para ganar eficiencia genuina (-$80.000)",
        condition: (state) => state.cash >= 80000,
        conditionText: "Requiere $80.000 en Caja",
        outcomeText: "La inversión moderniza tu infraestructura. La competitividad y la eficiencia operativa suben.",
        action: (state) => {
          state.cash -= 80000;
          state.efficiency = Math.min(100, state.efficiency + 25);
          state.reputation = Math.min(100, state.reputation + 10);
          state.historyLog.unshift(`[Apertura] Automatizaste tu infraestructura. -$80.000, +25% Eficiencia.`);
        }
      },
      {
        text: "Hacer lobby político para conseguir un arancel excepcional",
        condition: (state) => state.contacts >= 35 && state.cash >= 30000,
        conditionText: "Requiere 35% de Contactos y $30.000",
        outcomeText: "Logras exceptuar temporalmente a tu rubro de la apertura cambiaria pagando gestores.",
        action: (state) => {
          state.cash -= 30000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 15);
          state.stateDependence = Math.min(100, state.stateDependence + 15);
          state.historyLog.unshift(`[Apertura] Conseguiste arancel excepcional por lobby. -$30.000.`);
        }
      }
    ]
  },
  {
    id: 19,
    title: "Huelga Salvaje en la Constructora",
    category: "SINDICATO",
    description: "Una facción disidente del gremio de la construcción (UOCRA) bloquea tus obras reclamando viáticos inflados y recategorización compulsiva. El sindicato oficial se desentiende.",
    trigger: (state) => state.employees >= 5 && state.businessType === "construccion" && state.cash >= 20000,
    options: [
      {
        text: "Pagarle al delegado disidente 'por afuera' en efectivo (-$20.000)",
        outcomeText: "El bloqueo se levanta misteriosamente en horas. Retomas operaciones, pero tu riesgo impositivo y penal sube.",
        action: (state) => {
          state.cash -= 20000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 15);
          state.contacts = Math.min(100, state.contacts + 10);
          state.historyLog.unshift(`[Huelga] Pagaste coima al delegado disidente para levantar huelga.`);
        }
      },
      {
        text: "Pedir al intendente local que envíe la fuerza pública",
        condition: (state) => state.contacts >= 25,
        conditionText: "Requiere 25% de Contactos",
        outcomeText: "La policía desaloja el bloqueo. Ahorras dinero, pero te tildan de 'represor' públicamente.",
        action: (state) => {
          state.reputation = Math.max(0, state.reputation - 20);
          state.historyLog.unshift(`[Huelga] Desalojo policial del bloqueo. -20 Reputación.`);
        }
      }
    ]
  },
  {
    id: 20,
    title: "La Coima de Emergencia",
    category: "POLÍTICA",
    description: "La AFIP detecta una cuenta no declarada vinculada a tu empresa. Un intermediario te contacta con un directivo del organismo tributario dispuesto a 'cerrar la carpeta' a cambio de un bolso en efectivo.",
    trigger: (state) => state.corruptionRisk >= 35 && state.cash >= 50000,
    options: [
      {
        text: "Pagar el soborno de urgencia (-$50.000)",
        outcomeText: "La investigación se archiva de por vida. Tu riesgo judicial se reduce notablemente.",
        action: (state) => {
          state.cash -= 50000;
          state.corruptionRisk = Math.max(0, state.corruptionRisk - 30);
          state.contacts = Math.min(100, state.contacts + 15);
          state.historyLog.unshift(`[AFIP] Pagaste soborno fiscal de emergencia. -30 Riesgo Judicial.`);
        }
      },
      {
        text: "Rechazar y afrontar el juicio por evasión impositiva",
        outcomeText: "Te embargan activos temporales, tu reputación sufre, pero decides cortar la cadena de corrupción corporativa.",
        action: (state) => {
          state.cash -= 80000;
          state.reputation = Math.max(0, state.reputation - 15);
          state.corruptionRisk = Math.max(0, state.corruptionRisk - 15);
          state.independence = Math.min(100, state.independence + 20);
          state.historyLog.unshift(`[AFIP] Anulaste soborno. Juicio por evasión fiscal iniciado. -$80.000.`);
        }
      }
    ]
  },
  {
    id: 21,
    title: "Huelga de Camioneros",
    category: "SINDICATO",
    description: "El sindicato de choferes bloquea las rutas comerciales. Tu empresa no puede despachar mercadería a los centros comerciales privados ni recibir insumos clave de aduana.",
    trigger: (state) => state.businessType === "comercio" || state.businessType === "industrial",
    options: [
      {
        text: "Desviar mercadería por ferrocarril estatal (Ahorras flete)",
        condition: (state) => state.efficiency >= 40,
        conditionText: "Requiere 40% de Eficiencia",
        outcomeText: "Tu logística es flexible. Eludes el corte de camioneros sin incurrir en deudas.",
        action: (state) => {
          state.reputation = Math.min(100, state.reputation + 10);
          state.historyLog.unshift(`[Gremio] Logística ferroviaria exitosa ante paro. +10 Reputación.`);
        }
      },
      {
        text: "Pactar 'peajes de tránsito' con los jefes de las bases del sindicato (-$15.000)",
        outcomeText: "Liberan tus camiones escoltados. Pudiendo despachar, pero tu riesgo judicial se incrementa.",
        action: (state) => {
          state.cash -= 15000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 12);
          state.contacts = Math.min(100, state.contacts + 10);
          state.historyLog.unshift(`[Gremio] Pagaste peajes de paso al sindicato. -$15.000.`);
        }
      },
      {
        text: "Frenar envíos y acumular stock",
        outcomeText: "Cumples con la ley y evitas gastos dudosos. Tus clientes se impacientan perdiendo un 10% de la clientela.",
        action: (state) => {
          const lost = Math.floor(state.clients * 0.1);
          state.clients = Math.max(10, state.clients - lost);
          state.historyLog.unshift(`[Gremio] Despachos congelados. Perdiste ${lost} clientes privados.`);
        }
      }
    ]
  },
  {
    id: 22,
    title: "El Blanqueo de Capitales",
    category: "ECONOMÍA & FINANZAS",
    description: "El congreso promulga un régimen extraordinario de regularización de activos ('blanqueo'). Tienes fondos no declarados de operaciones dudosas del pasado que puedes blanquear pagando una tasa impositiva mínima.",
    trigger: (state) => state.corruptionRisk >= 25 && state.cash >= 25000,
    options: [
      {
        text: "Adherir al blanqueo y pagar la tasa del fisco (-$25.000)",
        outcomeText: "Legalizas tu situación financiera. Tu riesgo de causa judicial se borra casi por completo.",
        action: (state) => {
          state.cash -= 25000;
          state.corruptionRisk = Math.max(0, state.corruptionRisk - 25);
          state.reputation = Math.min(100, state.reputation + 10);
          state.historyLog.unshift(`[Blanqueo] Adheriste al blanqueo legalizador. -25 Riesgo Judicial.`);
        }
      },
      {
        text: "Lavar los fondos en la 'mesa de dinero' mediante swaps de bonos (Especial Mesa de Dinero)",
        condition: (state) => state.businessType === "finanzas",
        conditionText: "Exclusivo Mesa de Dinero",
        outcomeText: "Lavas los fondos de inmediato sin pagar tasa estatal alguna, incrementando enormemente tus contactos.",
        action: (state) => {
          state.contacts = Math.min(100, state.contacts + 25);
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 15);
          state.historyLog.unshift(`[Finanzas] Lavado mediante arbitraje de bonos. +25 Contactos, +15 Riesgo.`);
        }
      },
      {
        text: "Ignorar la moratoria y mantener tus activos ocultos",
        outcomeText: "No pagas nada al fisco. El riesgo impositivo de auditorías imprevistas sigue latente.",
        action: (state) => {
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 5);
          state.historyLog.unshift(`[Blanqueo] Decidiste no regularizar tus activos.`);
        }
      }
    ]
  },
  {
    id: 23,
    title: "El Ciberataque de Ransomware",
    category: "OPERACIONES & TECNOLOGÍA",
    description: "Servidores críticos de tu empresa son infectados por hackers de Europa del Este. Exigen un rescate en criptomonedas para devolver los accesos. Si eres una empresa de software, esto paraliza el 100% de tus servicios.",
    trigger: (state) => state.turn > 4 && state.cash >= 30000,
    options: [
      {
        text: "Restaurar respaldos con tu infraestructura de I+D",
        condition: (state) => state.innovation >= 40,
        conditionText: "Requiere 40% de Innovación",
        outcomeText: "Tus defensas tecnológicas eran robustas. Recuperas el sistema en 24 horas y tus clientes te aclaman.",
        action: (state) => {
          state.reputation = Math.min(100, state.reputation + 15);
          state.historyLog.unshift(`[Hack] Recuperaste servidores mediante I+D. +15 Reputación.`);
        }
      },
      {
        text: "Pagar el rescate de inmediato (-$30.000)",
        outcomeText: "Los ciberdelincuentes entregan las llaves de desencriptación. Los sistemas se restauran pero duele la caja.",
        action: (state) => {
          state.cash -= 30000;
          state.historyLog.unshift(`[Hack] Pagaste rescate de ransomware. -$30.000.`);
        }
      },
      {
        text: "Denunciar a la División Ciberdelito y congelar operaciones",
        outcomeText: "La policía clausura tus servidores durante 2 semanas para recabar pruebas forenses. Pierdes el 20% de tus clientes privados.",
        action: (state) => {
          const lost = Math.floor(state.clients * 0.2);
          state.clients = Math.max(10, state.clients - lost);
          state.reputation = Math.min(100, state.reputation + 10);
          state.historyLog.unshift(`[Hack] Litigio judicial forense por ciberdelito. Perdiste ${lost} clientes.`);
        }
      }
    ]
  },
  {
    id: 24,
    title: "La Licitación de la Autopista",
    category: "LICITACIÓN",
    description: "Se anuncia la mayor licitación vial de la década. El pliego exige una solvencia patrimonial enorme, ideal para empresas de construcción o industriales consolidadas.",
    trigger: (state) => (state.businessType === "construccion" || state.businessType === "industrial") && isIntervencionista(state.governmentType) && state.cash >= 40000,
    options: [
      {
        text: "Presentarse asociado a un gigante extranjero honestamente (-$30.000)",
        outcomeText: "Preparación de pliegos viales costosos. Ganas excelente reputación pero tus chances son del 25%.",
        action: (state) => {
          state.cash -= 30000;
          state.reputation = Math.min(100, state.reputation + 25);
          const win = Math.random() < 0.25;
          if (win) {
            const contract = {
              id: 999,
              title: "Mega-Licitación Autopista Nacional",
              monthlyRevenue: 35000,
              turnsLeft: 24
            };
            state.activeTenders = [...state.activeTenders, contract];
            state.stateDependence = Math.min(100, state.stateDependence + 20);
            state.historyLog.unshift(`[Licitación] ¡Ganaste la mega autopista honestamente! +$35.000/mes.`);
          } else {
            state.historyLog.unshift(`[Licitación] Perdiste la licitación de la autopista vial.`);
          }
        }
      },
      {
        text: "Pactar cartelización con otras constructoras de la cámara (-$20.000 coima en cámara)",
        condition: (state) => state.contacts >= 30,
        conditionText: "Requiere 30% de Contactos",
        outcomeText: "Acuerdan quién gana y a qué precio sobrevalorado. Tienes un 90% de probabilidades de ganar el contrato.",
        action: (state) => {
          state.cash -= 20000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 30);
          state.stateDependence = Math.min(100, state.stateDependence + 25);
          const win = Math.random() < 0.9;
          if (win) {
            const contract = {
              id: 999,
              title: "Mega-Licitación Autopista Cartelizada",
              monthlyRevenue: 48000,
              turnsLeft: 24
            };
            state.activeTenders = [...state.activeTenders, contract];
            state.historyLog.unshift(`[Licitación] ¡Ganaste la autopista cartelizada! +$48.000/mes.`);
          } else {
            state.historyLog.unshift(`[Licitación] Incluso cartelizado, un decreto imprevisto anuló la licitación.`);
          }
        }
      }
    ]
  },
  {
    id: 25,
    title: "Subsidio de Fomento a la Exportación",
    category: "POLÍTICA & MERCADO",
    description: "El Ministerio de Desarrollo Productivo ofrece reintegros impositivos no reembolsables para empresas que logren facturar en divisas al exterior. Ideal para Consultoras de Software o Establecimientos Industriales.",
    trigger: (state) => state.innovation >= 30 && state.reputation >= 40,
    options: [
      {
        text: "Certificar normas internacionales de calidad para calificar",
        condition: (state) => state.efficiency >= 45,
        conditionText: "Requiere 45% de Eficiencia",
        outcomeText: "Tu altísima eficiencia te hace calificar de manera automática. Recibes un reintegro de $80.000 sin comprometer tu independencia.",
        action: (state) => {
          state.cash += 80000;
          state.independence = Math.min(100, state.independence + 10);
          state.reputation = Math.min(100, state.reputation + 15);
          state.historyLog.unshift(`[Subsidio] Obtuviste incentivo exportador por calidad. +$80.000.`);
        }
      },
      {
        text: "Hablar con el Secretario para obviar las certificaciones técnicas (-$15.000 coima)",
        outcomeText: "Recibes el subsidio completo, pero eleva tu dependencia estatal y riesgo impositivo.",
        action: (state) => {
          state.cash += 80000 - 15000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 15);
          state.contacts = Math.min(100, state.contacts + 10);
          state.stateDependence = Math.min(100, state.stateDependence + 15);
          state.historyLog.unshift(`[Subsidio] Incentivo exportador aprobado por contactos de lobby.`);
        }
      }
    ]
  },
  {
    id: 26,
    title: "Boicot de Consumidores",
    category: "MERCADO",
    description: "Se viraliza en redes sociales que tu empresa utiliza materiales o mano de obra precarizada. Los consumidores de clase media inician una campaña de boicot contra tu marca.",
    trigger: (state) => state.reputation < 35 && state.clients > 100,
    options: [
      {
        text: "Lanzar campaña de relaciones públicas y disculpas (-$30.000)",
        outcomeText: "Muestras auditorías internas honestas. Logras recomponer tu reputación y detienes la fuga de clientes.",
        action: (state) => {
          state.cash -= 30000;
          state.reputation = Math.min(100, state.reputation + 25);
          state.historyLog.unshift(`[Prensa] Campaña de PR contuvo el boicot de la marca. -$30.000.`);
        }
      },
      {
        text: "Llamar a medios de pauta amigos para desacreditar la denuncia",
        condition: (state) => state.contacts >= 25 && state.cash >= 15000,
        conditionText: "Requiere 25% de Contactos y $15.000",
        outcomeText: "Los canales oficiales catalogan el boicot como una 'operación política maliciosa'. Salvas tus clientes, pero sube tu dependencia del gobierno.",
        action: (state) => {
          state.cash -= 15000;
          state.stateDependence = Math.min(100, state.stateDependence + 15);
          state.historyLog.unshift(`[Prensa] Desacreditaste boicot en medios amigos. -$15.000.`);
        }
      },
      {
        text: "Ignorar la polémica y bajar los precios un mes",
        outcomeText: "Tu margen del mes cae a cero y pierdes un 15% de clientes indignados, aunque mantienes a los buscadores de ofertas.",
        action: (state) => {
          const lost = Math.floor(state.clients * 0.15);
          state.clients = Math.max(10, state.clients - lost);
          state.reputation = Math.max(0, state.reputation - 10);
          state.historyLog.unshift(`[Prensa] Ignoraste boicot. Pérdida del ${lost} de clientes por imagen.`);
        }
      }
    ]
  },
  {
    id: 27,
    title: "La Inspección de Seguridad Industrial",
    category: "SINDICATO & AUDITORÍA",
    // Corrected logic: Software and Finance have offices with license audits, others have operary safety audits
    description: (state) => state.businessType === "software" || state.businessType === "finanzas"
      ? "Inspectores de la municipalidad y del gremio administrativo se presentan para auditar la seguridad eléctrica de tus oficinas y la tenencia de licencias de software comercial."
      : "Una delegación mixta del Ministerio de Trabajo y del Sindicato se presenta en tu establecimiento para auditar las condiciones de higiene de tus operarios y maquinaria.",
    trigger: (state) => state.employees >= 4 && state.turn > 3,
    options: [
      {
        text: (state) => state.businessType === "software" || state.businessType === "finanzas"
          ? "Cumplir requerimientos pagando licencias y seguros de oficina (-$20.000)"
          : "Cumplir los requerimientos invirtiendo en protección laboral industrial (-$20.000)",
        outcomeText: "Tus instalaciones quedan certificadas y en orden. La eficiencia y la reputación interna suben.",
        action: (state) => {
          state.cash -= 20000;
          state.efficiency = Math.min(100, state.efficiency + 12);
          state.reputation = Math.min(100, state.reputation + 10);
          state.historyLog.unshift(`[Auditoría] Adecuaste normas operativas del establecimiento. -$20.000.`);
        }
      },
      {
        text: "Arreglar con el secretario gremial en un bar de la esquina (-$8.000)",
        outcomeText: "El acta de inspección se aprueba con firmas fraguadas. Ahorras caja pero tu riesgo de AFIP y deudas impositivas aumenta.",
        action: (state) => {
          state.cash -= 8000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 12);
          state.contacts = Math.min(100, state.contacts + 10);
          state.historyLog.unshift(`[Auditoría] Arreglo en negro con delegado gremial. -$8.000.`);
        }
      }
    ]
  },
  {
    id: 28,
    title: "El Consultor 'Chantún' del Círculo Rojo",
    category: "POLÍTICA & LOBBY",
    description: "Un autoproclamado 'consultor del círculo rojo' se reúne contigo. Te asegura que por una retribución de lobby ($15.000), puede presentarte a diputados nacionales de la comisión de presupuesto.",
    trigger: (state) => state.contacts < 40 && state.cash >= 20000,
    options: [
      {
        text: "Contratar sus servicios de consultoría estratégica (-$15.000 de adelanto)",
        outcomeText: "La mitad de lo que dice es mentira, pero logras conseguir 2 contactos reales en las comisiones técnicas legislativas.",
        action: (state) => {
          state.cash -= 15000;
          state.contacts = Math.min(100, state.contacts + 20);
          state.historyLog.unshift(`[Lobby] Contrataste consultor de influencias. +20 Contactos, -$15.000.`);
        }
      },
      {
        text: "Rechazar sus servicios y sacarlo de tu oficina",
        outcomeText: "Prefieres expandir tu negocio basándote en la calidad y no en lobbistas de pasillo.",
        action: (state) => {
          state.independence = Math.min(100, state.independence + 10);
          state.historyLog.unshift(`[Lobby] Declinaste lobby corporativo informal.`);
        }
      }
    ]
  },
  {
    id: 29,
    title: "Fusiones y Adquisiciones",
    category: "MERCADO & OPERACIONES",
    description: "Tu principal competidor privado local está al borde del ahogo financiero y te ofrece venderte su fondo de comercio y su cartera de clientes privados.",
    trigger: (state) => state.clients > 50 && state.cash >= 50000,
    options: [
      {
        text: "Comprar a tu competidor al contado (-$50.000)",
        outcomeText: "Absorbes su cuota. Tu base de clientes privados se incrementa de inmediato en un 40%.",
        action: (state) => {
          state.cash -= 50000;
          const clientsGained = Math.floor(state.clients * 0.40);
          state.clients = Math.min(1000, state.clients + clientsGained);
          state.reputation = Math.min(100, state.reputation + 10);
          state.historyLog.unshift(`[M&A] Absorber competidor sumó ${clientsGained} clientes nuevos.`);
        }
      },
      {
        text: "Utilizar tus contactos ministeriales para forzar su clausura (Lobby Sucio)",
        condition: (state) => state.contacts >= 30 && state.cash >= 15000,
        conditionText: "Requiere 30% de Contactos y $15.000",
        // Corrected logic: Software is closed for patent infringements, industrial/commerce/construction for municipal safety/noises
        outcomeText: (state) => state.businessType === "software" 
          ? "Un juzgado amigo clausura sus servidores por presunta infracción de patentes. Capturas el 20% de sus clientes gratis." 
          : "La municipalidad le clausura el establecimiento por ruidos molestos. Capturas la mitad de sus clientes gratis.",
        action: (state) => {
          state.cash -= 15000;
          const clientsGained = Math.floor(state.clients * 0.20);
          state.clients = Math.min(1000, state.clients + clientsGained);
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 20);
          state.historyLog.unshift(`[M&A] Clausuraste competidor usando lobby. +${clientsGained} clientes.`);
        }
      },
      {
        text: "Dejar que quiebre por su cuenta",
        outcomeText: "No gastas efectivo. Ganas independencia pero tu reputación privada se mantiene estable.",
        action: (state) => {
          state.independence = Math.min(100, state.independence + 10);
          state.historyLog.unshift(`[M&A] Dejaste que la competencia caiga sin intervenir.`);
        }
      }
    ]
  },
  {
    id: 30,
    title: "Sociedades en Panamá",
    category: "FINANZAS & AUDITORÍA",
    description: "Un bufete internacional te sugiere derivar dividendos de tu empresa a una sociedad instrumental constituida en un paraíso fiscal (Panamá/Delaware). Esto reduciría tu pago de impuestos a la mitad.",
    trigger: (state) => state.cash >= 100000,
    options: [
      {
        text: "Aceptarla y girar utilidades al extranjero (Impuestos futuros se reducen 50%)",
        outcomeText: "Tus gastos mensuales en impuestos bajan a la mitad permanentemente, pero tu riesgo judicial con la AFIP se duplica.",
        action: (state) => {
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 30);
          state.independence = Math.min(100, state.independence + 10);
          state.panamaTaxShield = true;
          state.historyLog.unshift(`[Finanzas] Giraste utilidades a Panamá. Impuestos mensuales a mitad de costo.`);
        }
      },
      {
        text: "Rechazar maniobras tributarias offshore",
        outcomeText: "Pagas el total de los impuestos locales. El sector financiero e inversores de calidad alaban tu transparencia corporativa.",
        action: (state) => {
          state.reputation = Math.min(100, state.reputation + 25);
          state.independence = Math.min(100, state.independence + 15);
          state.historyLog.unshift(`[Finanzas] Rechazaste maniobras fiscales offshore. +25 Reputación.`);
        }
      }
    ]
  },

  // ================= RUBRO: SOFTWARE SPECIFIC =================
  {
    id: 31,
    title: "Fuga del Código Fuente",
    category: "TECNOLOGÍA & RIESGO",
    description: "Se detecta que el repositorio central de software de tu consultora fue filtrado en foros de internet por un programador resentido. Tus patentes y algoritmos están expuestos.",
    trigger: (state) => state.businessType === "software" && state.turn > 3,
    options: [
      {
        text: "Ignorar la filtración y migrar a un modelo 'Open Source'",
        outcomeText: "Muestras resiliencia y el sector tecnológico te elogia. Tu innovación y reputación dan un gran salto positivo.",
        action: (state) => {
          state.innovation = Math.min(100, state.innovation + 20);
          state.reputation = Math.min(100, state.reputation + 15);
          state.historyLog.unshift(`[Software] Código liberado a Open Source. +20 Innovation, +15 Reputación.`);
        }
      },
      {
        text: "Contratar un bufete de ciberseguridad para borrar el código y auditar la fuga (-$25.000)",
        outcomeText: "Logras contener la filtración. Conservas las patentes pero sufres un fuerte desembolso de dinero.",
        action: (state) => {
          state.cash -= 25000;
          state.efficiency = Math.min(100, state.efficiency + 10);
          state.historyLog.unshift(`[Software] Auditoría informática externa. -$25.000, +10 Eficiencia.`);
        }
      }
    ]
  },
  {
    id: 32,
    title: "Caída de Servidores en la Nube",
    category: "OPERACIONES",
    description: "Amazon Web Services (AWS) reporta una caída global que afecta tus servidores de producción. Tus clientes de software no pueden operar y tus canales de soporte explotan.",
    trigger: (state) => state.businessType === "software" && state.clients > 100,
    options: [
      {
        text: "Pagar un plan de servidores redundantes multi-cloud de emergencia (-$15.000)",
        outcomeText: "Los servicios vuelven en minutos. Demuestras robustez operativa internacional, subiendo la eficiencia.",
        action: (state) => {
          state.cash -= 15000;
          state.efficiency = Math.min(100, state.efficiency + 15);
          state.historyLog.unshift(`[Software] Servidores multi-cloud activos. -$15.000, +15% Eficiencia.`);
        }
      },
      {
        text: "Esperar pacientemente a que AWS restaure el servicio global",
        outcomeText: "Ahorras dinero, pero tu marca sufre. Varios clientes cancelan suscripciones por demoras. Pierdes 20 clientes.",
        action: (state) => {
          state.clients = Math.max(10, state.clients - 20);
          state.reputation = Math.max(0, state.reputation - 10);
          state.historyLog.unshift(`[Software] Esperaste restauración de AWS. Perdiste 20 clientes.`);
        }
      }
    ]
  },

  // ================= RUBRO: INDUSTRIAL SPECIFIC =================
  {
    id: 33,
    title: "Rotura del Alto Horno",
    category: "OPERACIONES",
    description: "La caldera industrial de fundición de tu planta sufre una fisura térmica. La producción pesada queda totalmente paralizada hasta cambiar los refractarios.",
    trigger: (state) => state.businessType === "industrial" && state.machineryCount > 0,
    options: [
      {
        text: "Hacer una reparación express e informal con soldadores locales (-$10.000)",
        outcomeText: "Retomas producción rápido, pero tu riesgo operativo de AFIP y accidentes laborales se duplica.",
        action: (state) => {
          state.cash -= 10000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 15);
          state.historyLog.unshift(`[Industrial] Reparación express de caldera. -$10.000, +15 Riesgo.`);
        }
      },
      {
        text: "Importar refractarios certificados de Alemania (-$35.000)",
        outcomeText: "La reparación es perfecta. Tu planta gana en eficiencia y seguridad industrial.",
        action: (state) => {
          state.cash -= 35000;
          state.efficiency = Math.min(100, state.efficiency + 15);
          state.historyLog.unshift(`[Industrial] Repuestos alemanes certificados. -$35.000, +15% Eficiencia.`);
        }
      }
    ]
  },
  {
    id: 34,
    title: "Bloqueo Aduanero de Acero",
    category: "ECONOMÍA & OPERACIONES",
    description: "Una huelga de inspectores de aduana (SICA) retiene tus bobinas de acero importado en el puerto de Buenos Aires. Tu fábrica no tiene materia prima para procesar.",
    trigger: (state) => state.businessType === "industrial",
    options: [
      {
        text: "Pagar tarifa discrecional de despacho de aduana a un despachante amigo (-$12.000)",
        outcomeText: "Las bobinas se liberan en 24 horas. Retomas producción pero eleva tu riesgo fiscal.",
        action: (state) => {
          state.cash -= 12000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 12);
          state.contacts = Math.min(100, state.contacts + 10);
          state.historyLog.unshift(`[Industrial] Despacho aduanero discrecional pagado. -$12.000.`);
        }
      },
      {
        text: "Comprar acero nacional de menor calidad a precio inflado (-$20.000)",
        outcomeText: "Apoyas el mercado interno, pero tu margen operativo cae de inmediato y tu eficiencia técnica baja.",
        action: (state) => {
          state.cash -= 20000;
          state.efficiency = Math.max(10, state.efficiency - 8);
          state.historyLog.unshift(`[Industrial] Acero nacional de emergencia comprado. -8% Eficiencia.`);
        }
      }
    ]
  },

  // ================= RUBRO: COMERCIO SPECIFIC =================
  {
    id: 35,
    title: "Contrabando en el Puerto",
    category: "RIESGO & AUDITORÍA",
    description: "Gendarmería allana un contenedor en el puerto consignado a tu nombre. Encuentran mercadería electrónica no declarada que venía oculta en el fondo del cargamento.",
    trigger: (state) => state.businessType === "comercio" && state.corruptionRisk >= 15,
    options: [
      {
        text: "Sobornar al oficial a cargo del allanamiento de aduanas (-$35.000)",
        outcomeText: "El acta se labra culpando a la empresa transportista. Salvás tu cargamento pero sube tu riesgo penal.",
        action: (state) => {
          state.cash -= 35000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 20);
          state.contacts = Math.min(100, state.contacts + 12);
          state.historyLog.unshift(`[Comercio] Soborno aduanero exitoso. +20 Riesgo Judicial.`);
        }
      },
      {
        text: "Aceptar el secuestro del contenedor y culpar formalmente al exportador",
        outcomeText: "Pierdes la mercadería por completo. Tu reputación se salva, pero asumes una pérdida demoledora.",
        action: (state) => {
          state.cash -= 60000;
          state.reputation = Math.min(100, state.reputation + 10);
          state.corruptionRisk = Math.max(0, state.corruptionRisk - 10);
          state.historyLog.unshift(`[Comercio] Cargas incautadas en aduana. Pérdida neta -$60.000.`);
        }
      }
    ]
  },
  {
    id: 36,
    title: "Precios Cuidados",
    category: "POLÍTICA & ECONOMÍA",
    description: "La Secretaría de Comercio Interior te exige firmar el convenio de 'Precios Cuidados' para tus principales líneas de distribución mayorista bajo amenaza de clausura compulsiva.",
    trigger: (state) => state.businessType === "comercio" && isIntervencionista(state.governmentType),
    options: [
      {
        text: "Firmar el acuerdo de congelamiento de precios a pérdida",
        outcomeText: "Evitas multas. El gobierno te elogia y ganas contactos, pero tus ingresos mensuales caen de inmediato.",
        action: (state) => {
          state.priceMultiplier = 0.8;
          state.contacts = Math.min(100, state.contacts + 15);
          state.reputation = Math.max(0, state.reputation - 5);
          state.historyLog.unshift(`[Comercio] Firmaste Precios Cuidados. Multiplicador de precios al 80%.`);
        }
      },
      {
        text: "Retirar los productos congelados de las góndolas (Desabastecimiento especulativo)",
        outcomeText: "Mantienes márgenes altos vendiendo por canales paralelos. No obstante, te comes denuncias y tu reputación social se desploma.",
        action: (state) => {
          state.reputation = Math.max(0, state.reputation - 25);
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 15);
          state.historyLog.unshift(`[Comercio] Retiro de stock congelado. -25 Reputación, +15 Riesgo.`);
        }
      }
    ]
  },

  // ================= RUBRO: FINANZAS SPECIFIC =================
  {
    id: 37,
    title: "El Corralito Financiero",
    category: "ECONOMÍA & FINANZAS",
    description: "Por decreto de necesidad y urgencia, el Ministerio de Economía congela todos los depósitos en pesos del sistema financiero. Tu mesa de dinero no puede retirar sus encajes bancarios.",
    trigger: (state) => state.businessType === "finanzas" && state.cash >= 80000,
    options: [
      {
        text: "Pagar un amparo judicial express para liberar tus cuentas (-$20.000 de soborno judicial)",
        outcomeText: "Un juez federal firma el amparo y retiras tu liquidez intacta. Subes tu riesgo penal.",
        action: (state) => {
          state.cash -= 20000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 25);
          state.contacts = Math.min(100, state.contacts + 15);
          state.historyLog.unshift(`[Finanzas] Cuentas liberadas por amparo judicial. +25 Riesgo.`);
        }
      },
      {
        text: "Aceptar la reprogramación de depósitos en bonos a 10 años",
        outcomeText: "Tus fondos quedan licuados y atrapados. Pierdes liquidez y tu efectividad cae.",
        action: (state) => {
          state.cash -= Math.floor(state.cash * 0.35);
          state.efficiency = Math.max(10, state.efficiency - 15);
          state.historyLog.unshift(`[Finanzas] Corralito de depósitos aceptado. 35% de caja pesificada.`);
        }
      }
    ]
  },
  {
    id: 38,
    title: "La Corrida Cambiaria",
    category: "FINANZAS & MACRO",
    description: "El mercado financiero desconfía del ministro y el precio del dólar paralelo trepa 25% en una tarde. La demanda de pesos en tu financiera cae a cero.",
    trigger: (state) => state.businessType === "finanzas" && state.turn > 2,
    options: [
      {
        text: "Girar toda tu cartera de pesos a bonos dolarizados soberanos (-$30.000)",
        outcomeText: "Logras dolarizar la cartera. Proteges tu patrimonio del derrumbe inflacionario y ganas reputación.",
        action: (state) => {
          state.cash -= 30000;
          state.reputation = Math.min(100, state.reputation + 15);
          state.independence = Math.min(100, state.independence + 10);
          state.historyLog.unshift(`[Finanzas] Cobertura cambiaria exitosa en bonos. +15 Reputación.`);
        }
      },
      {
        text: "Aprovechar la corrida para vender pesos con tasas usurarias (12% interés)",
        outcomeText: "Haces un negocio enorme cobrando tasas altísimas a clientes desesperados, pero tu reputación social se desploma.",
        action: (state) => {
          state.cash += 50000;
          state.reputation = Math.max(0, state.reputation - 25);
          state.historyLog.unshift(`[Finanzas] Colocación usuraria durante la corrida. +$50.000, -25 Reputación.`);
        }
      }
    ]
  },

  // ================= RUBRO: CONSTRUCCION SPECIFIC =================
  {
    id: 39,
    title: "Derrumbe en Obra de Belgrano",
    category: "RIESGO & OPERACIONES",
    description: "Un apuntalamiento cede en los cimientos de tu edificio multifamiliar en Belgrano. Una medianera lindera se resquebraja gravemente. Vecinos y bomberos evacúan la zona.",
    trigger: (state) => state.businessType === "construccion" && state.turn > 3,
    options: [
      {
        text: "Hablar con el Director de Obras Civiles para tapar el informe (-$25.000)",
        outcomeText: "Se fragua el informe técnico de seguridad. Evitas la clausura penal de la obra pero el riesgo de derrumbe judicial es alto.",
        action: (state) => {
          state.cash -= 25000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 30);
          state.contacts = Math.min(100, state.contacts + 15);
          state.historyLog.unshift(`[Construcción] Informe de derrumbe cajoneado. +30 Riesgo.`);
        }
      },
      {
        text: "Parar la obra e indemnizar a los vecinos linderos (-$75.000)",
        outcomeText: "Impacto durísimo a tu liquidez, pero consolida tu imagen corporativa limpia ante futuros pliegos de edificación.",
        action: (state) => {
          state.cash -= 75000;
          state.reputation = Math.min(100, state.reputation + 25);
          state.corruptionRisk = Math.max(0, state.corruptionRisk - 15);
          state.historyLog.unshift(`[Construcción] Indemnización por daños edilicios. -$75.000.`);
        }
      }
    ]
  },
  {
    id: 40,
    title: "Cártel del Cemento",
    category: "MERCADO & OPERACIONES",
    description: "Las tres cementeras monopólicas del país anuncian una suba concertada del 45% del precio del hormigón. Tus costos de construcción proyectados vuelan por los aires.",
    trigger: (state) => state.businessType === "construccion",
    options: [
      {
        text: "Firmar el aumento y recalcular precios del pozo (+10% su valor)",
        outcomeText: "Los compradores se quejan pero absorben el incremento. Mantienes márgenes estables, aunque pierdes clientes.",
        action: (state) => {
          state.reputation = Math.max(0, state.reputation - 10);
          state.clients = Math.max(10, state.clients - 8);
          state.historyLog.unshift(`[Construcción] Traslado de suba del cemento a compradores.`);
        }
      },
      {
        text: "Utilizar tus contactos en Defensa de la Competencia para denunciarlos",
        condition: (state) => state.contacts >= 25,
        conditionText: "Requiere 25% de Contactos",
        outcomeText: "El gobierno abre una investigación sumaria y frena cautelarmente la suba impositiva del cemento. Compras hormigón al precio original.",
        action: (state) => {
          state.stateDependence = Math.min(100, state.stateDependence + 12);
          state.historyLog.unshift(`[Construcción] Frenaste cártel de cemento mediante Defensa de Competencia.`);
        }
      }
    ]
  },

  // ================= GENERAL HIGH-VARIANCE EVENTS =================
  {
    id: 41,
    title: "Subsidio Verde Descarbonización",
    category: "POLÍTICA & OPERACIONES",
    description: "La Unión Europea financia un programa no reembolsable de transición ecológica. Exige certificar huella de carbono cero en tus procesos de producción.",
    trigger: (state) => state.businessType === "industrial" && state.innovation >= 30,
    options: [
      {
        text: "Adecuar tu maquinaria para certificar norma ecológica (-$15.000)",
        outcomeText: "Recibes $90.000 del fondo verde y exportas al mercado común con arancel preferencial.",
        action: (state) => {
          state.cash += 90000 - 15000;
          state.reputation = Math.min(100, state.reputation + 20);
          state.independence = Math.min(100, state.independence + 10);
          state.historyLog.unshift(`[Subsidio] Certificación ecológica verde. +$75.000 netos.`);
        }
      },
      {
        text: "Sobornar al certificador local para fraguar los papeles ecológicos (-$5.000)",
        outcomeText: "Recibes el subsidio de $90.000, pero tu riesgo judicial impositivo se incrementa notablemente.",
        action: (state) => {
          state.cash += 90000 - 5000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 18);
          state.historyLog.unshift(`[Subsidio] Certificado verde fraguado con coima. +$85.000.`);
        }
      }
    ]
  },
  {
    id: 42,
    title: "Norma de Calidad ISO 9001",
    category: "MERCADO & OPERACIONES",
    description: "Tu consultora de software quiere licitar servicios para un banco suizo. Te exigen de manera indispensable poseer la certificación ISO 9001 de calidad de procesos.",
    trigger: (state) => state.businessType === "software" && state.cash >= 25000,
    options: [
      {
        text: "Pagar consultora homologadora externa para auditoría técnica (-$25.000)",
        outcomeText: "La empresa certifica legalmente. Ganas una excelente reputación internacional y sumas 35 clientes.",
        action: (state) => {
          state.cash -= 25000;
          state.reputation = Math.min(100, state.reputation + 25);
          state.clients = Math.min(1000, state.clients + 35);
          state.historyLog.unshift(`[Software] Normas ISO 9001 certificadas formalmente. -$25.000.`);
        }
      },
      {
        text: "Desestimar el mercado internacional de exportación",
        outcomeText: "Te quedas en el mercado doméstico, ahorrando efectivo, pero tu competidor local avanza.",
        action: (state) => {
          state.independence = Math.max(0, state.independence - 10);
          state.historyLog.unshift(`[Software] Desestimaste certificación ISO internacional.`);
        }
      }
    ]
  },
  {
    id: 43,
    title: "Piratería del Asfalto",
    category: "RIESGO & OPERACIONES",
    description: "Una banda de piratas del asfalto asalta el camión distribuidor de tu comercio que transportaba mercadería importada valuada en $40.000. El chofer está ileso.",
    trigger: (state) => state.businessType === "comercio" && state.cash >= 40000,
    options: [
      {
        text: "Presentar el siniestro ante la compañía de seguros honesta (Trámite de 4 meses)",
        outcomeText: "Ahorras problemas legales. El seguro te reintegrará el 80% de la carga pero el trámite es lento.",
        action: (state) => {
          state.cash -= 8000;
          state.reputation = Math.min(100, state.reputation + 5);
          state.historyLog.unshift(`[Comercio] Carga asaltada asegurada. Reintegro lento con 20% franquicia.`);
        }
      },
      {
        text: "Hablar con el comisario de la zona para que 'recupere' la carga (-$10.000 coima)",
        outcomeText: "La policía hace una redada express y te devuelve la carga robada en 12 horas. +15 Riesgo Judicial.",
        action: (state) => {
          state.cash -= 10000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 15);
          state.contacts = Math.min(100, state.contacts + 10);
          state.historyLog.unshift(`[Comercio] Mercadería recuperada por comisaría amiga. -$10.000.`);
        }
      }
    ]
  },
  {
    id: 44,
    title: "Arbitraje de Criptomonedas",
    category: "FINANZAS",
    description: "Se abre una brecha cambiaria masiva en los precios de las criptomonedas (Stablecoins) entre las plataformas locales y los exchanges extranjeros. Permite hacer arbitraje financiero.",
    trigger: (state) => state.businessType === "finanzas" && state.cash >= 40000,
    options: [
      {
        text: "Hacer arbitraje electrónico automatizado por tu cuenta",
        condition: (state) => state.innovation >= 40,
        conditionText: "Requiere 40% de Innovación",
        outcomeText: "Tu infraestructura técnica automatiza la compraventa. Ganas $70.000 libres de impuestos.",
        action: (state) => {
          state.cash += 70000;
          state.historyLog.unshift(`[Finanzas] Arbitraje cripto automatizado exitoso. +$70.000.`);
        }
      },
      {
        text: "Operar a mano a través de cuevas locales asociadas (-$10.000 de costos operativos)",
        outcomeText: "Consigues una rentabilidad menor ($40.000 limpios) pero aumenta tu riesgo de fiscalización de AFIP.",
        action: (state) => {
          state.cash += 30000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 15);
          state.historyLog.unshift(`[Finanzas] Arbitraje manual de stablecoins cerrado. +$30.000.`);
        }
      }
    ]
  },
  {
    id: 45,
    title: "Licitación de Barrio Social",
    category: "LICITACIÓN",
    description: "El Ministerio de Desarrollo Social abre el pliego para construir un complejo de 150 viviendas sociales en el conurbano.",
    trigger: (state) => state.businessType === "construccion" && state.cash >= 30000,
    options: [
      {
        text: "Presentar una propuesta honesta ajustando márgenes operativos (-$15.000)",
        outcomeText: "El pliego compite formalmente. Tienes un 30% de ganar el contrato debido a precio ajustado.",
        action: (state) => {
          state.cash -= 15000;
          const win = Math.random() < 0.3;
          if (win) {
            const newContract = {
              id: 777,
              title: "Construcción Barrio de Viviendas Social",
              monthlyRevenue: 28000,
              turnsLeft: 18
            };
            state.activeTenders = [...state.activeTenders, newContract];
            state.stateDependence = Math.min(100, state.stateDependence + 15);
            state.historyLog.unshift(`[Licitación] Ganaste pliego de vivienda social. +$28.000/mes.`);
          } else {
            state.historyLog.unshift(`[Licitación] Perdiste licitación de viviendas en el ministerio.`);
          }
        }
      },
      {
        text: "Pactar con el puntero de la zona que maneja las firmas (-$10.000 de coima)",
        outcomeText: "Se digita la adjudicación directa de la obra a tu favor. Ganas el pliego pero sube tu dependencia y corrupción.",
        action: (state) => {
          state.cash -= 10000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 22);
          state.stateDependence = Math.min(100, state.stateDependence + 20);
          const newContract = {
            id: 777,
            title: "Construcción Barrio de Viviendas Social Digitado",
            monthlyRevenue: 33000,
            turnsLeft: 18
          };
          state.activeTenders = [...state.activeTenders, newContract];
          state.historyLog.unshift(`[Licitación] Adjudicación forzada de viviendas sociales por puntero.`);
        }
      }
    ]
  },
  {
    id: 46,
    title: "Aporte Extraordinario de Solidaridad",
    category: "POLÍTICA & FINANZAS",
    description: "Por emergencia nacional ante el déficit fiscal, el gobierno intervencionista crea un impuesto extraordinario único a las empresas con excedente de caja líquida mayor a $300.000.",
    trigger: (state) => state.cash >= 300000 && isIntervencionista(state.governmentType),
    options: [
      {
        text: "Pagar el gravamen sin chistar (-$70.000)",
        outcomeText: "El fisco te felicita y tu reputación social se incrementa considerablemente.",
        action: (state) => {
          state.cash -= 70000;
          state.reputation = Math.min(100, state.reputation + 25);
          state.historyLog.unshift(`[Fisco] Pagaste Aporte Extraordinario de Solidaridad. -$70.000.`);
        }
      },
      {
        text: "Contratar un buffet contable de lobby para ampararte judicialmente (-$20.000)",
        outcomeText: "Logras eludir la alícuota en tribunales. Proteges tu caja pero el fisco te pone en la lista negra impositiva.",
        action: (state) => {
          state.cash -= 20000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 18);
          state.contacts = Math.max(0, state.contacts - 15);
          state.historyLog.unshift(`[Fisco] Amparado contra el aporte extraordinario. -$20.000.`);
        }
      }
    ]
  },
  {
    id: 47,
    title: "La Paritaria Gremial Obligatoria",
    category: "SINDICATO",
    description: "El Ministerio de Trabajo de la Nación sanciona un aumento salarial del 35% de carácter obligatorio y retroactivo para todo tu personal por paritarias gremiales de tu sector.",
    trigger: (state) => state.employees >= 3,
    options: [
      {
        text: "Aceptar el aumento y actualizar salarios (Gastos salariales mensuales +35%)",
        outcomeText: "Mantienes a tus empleados felices y la eficiencia operativa sube temporalmente.",
        action: (state) => {
          state.salaryPerEmployee = Math.floor(state.salaryPerEmployee * 1.35);
          state.efficiency = Math.min(100, state.efficiency + 10);
          state.historyLog.unshift(`[Gremio] Paritaria obligatoria homologada. Salarios mensuales +35%.`);
        }
      },
      {
        text: "Registrar a la mitad de tus empleados como 'monotributistas' informales",
        outcomeText: "Ahorras costos fijos esquivando la paritaria impositiva. Sin embargo, tu reputación cae y tu riesgo ante la AFIP y juicios laborales explota.",
        action: (state) => {
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 25);
          state.reputation = Math.max(0, state.reputation - 20);
          state.historyLog.unshift(`[Gremio] Monotributización forzada de operarios. +25 Riesgo Judicial.`);
        }
      }
    ]
  },
  {
    id: 48,
    title: "El 'Rulo' Cambiario con Bonos Soberanos",
    category: "FINANZAS",
    description: "Se detecta una inconsistencia en la cotización de los bonos AL30 en Pesos frente a la cotización en Dólares Cable. Permite girar la brecha cambiaria de manera instantánea.",
    trigger: (state) => state.cash >= 80000 && state.turn > 3,
    options: [
      {
        text: "Hacer la operatoria completa ('Rulo') (Recibes $40.000 netos)",
        outcomeText: "Ganas efectivo instantáneamente aprovechando la brecha cambiaria. El BCRA investiga a las cuentas que hicieron esto.",
        action: (state) => {
          state.cash += 40000;
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 12);
          state.historyLog.unshift(`[Finanzas] Hiciste el 'rulo' cambiario de bonos. +$40.000, +12 Riesgo.`);
        }
      },
      {
        text: "Ignorar la maniobra especulativa",
        outcomeText: "Mantienes tus libros limpios de especulaciones normativas.",
        action: (state) => {
          state.independence = Math.min(100, state.independence + 10);
          state.historyLog.unshift(`[Finanzas] Decidiste no participar en la especulación del AL30.`);
        }
      }
    ]
  },
  {
    id: 49,
    title: "DNU de Desregulación de Comercio",
    category: "POLÍTICA & ECONOMÍA",
    description: "El poder ejecutivo liberal emite un Mega-Decreto de Necesidad y Urgencia que desregula todos los mercados, liberando precios y eliminando registros de licencias comerciales.",
    trigger: (state) => isProMercado(state.governmentType),
    options: [
      {
        text: "Subir tus márgenes de ganancia aprovechando el libre mercado",
        outcomeText: "Tus ganancias brutas aumentan, pero tus clientes libres te tildan de especulador corporativo.",
        action: (state) => {
          state.priceMultiplier = 1.15;
          state.reputation = Math.max(0, state.reputation - 12);
          state.historyLog.unshift(`[DNU] Aprovechaste desregulación comercial para subir precios.`);
        }
      },
      {
        text: "Utilizar la libertad de precios para ofrecer descuentos agresivos",
        outcomeText: "Sumas una base de clientes privados nuevos. Tu cuota de mercado se incrementa en 70 clientes.",
        action: (state) => {
          state.clients = Math.min(1000, state.clients + 70);
          state.reputation = Math.min(100, state.reputation + 15);
          state.historyLog.unshift(`[DNU] Precios de oferta aplicados por desregulación. +70 Clientes.`);
        }
      }
    ]
  },
  {
    id: 50,
    title: "La Patente de Automatización Alemana",
    category: "MERCADO & INNOVACIÓN",
    description: "Se subasta la licencia de uso local para una patente alemana de automatización operativa de última generación.",
    trigger: (state) => state.cash >= 60000,
    options: [
      {
        text: "Comprar los derechos exclusivos de la patente local (-$60.000)",
        outcomeText: "Tu nivel de innovación técnica y eficiencia operativa dan un salto de competitividad que te posiciona líder de rubro.",
        action: (state) => {
          state.cash -= 60000;
          state.innovation = Math.min(100, state.innovation + 25);
          state.efficiency = Math.min(100, state.efficiency + 20);
          state.historyLog.unshift(`[Patente] Adquiriste derechos de patente de automatización. +25% Innovación.`);
        }
      },
      {
        text: "Dejar pasar la licitación y ahorrar capital",
        outcomeText: "Mantienes tu liquidez intacta para financiar tus operaciones ordinarias de mes.",
        action: (state) => {
          state.historyLog.unshift(`[Patente] Dejaste pasar la subasta de la licencia de automatización.`);
        }
      }
    ]
  },
  {
    id: 51,
    title: "Crisis de la Mediana Edad",
    category: "PERSONAL",
    description: "Cumplís años y sentís la presión del paso del tiempo. Tus asesores sugieren que te tomes un retiro de meditación o que adquieras un costoso auto deportivo importado para mejorar tu estatus en el club de golf empresarial.",
    trigger: (state) => state.turn >= 48 && state.cash >= 150000,
    options: [
      {
        text: "Comprar un auto deportivo importado (-$80.000)",
        outcomeText: "Te mudas a un estatus superior. Consigues llamar la atención en el club de golf y sumas contactos.",
        action: (state) => {
          state.cash -= 80000;
          state.contacts = Math.min(100, state.contacts + 15);
          state.reputation = Math.min(100, state.reputation + 10);
          state.historyLog.unshift(`[Personal] Compraste un deportivo importado. +15 Contactos, +10 Reputación.`);
        }
      },
      {
        text: "Tomarse un mes de retiro espiritual en la Patagonia (-$15.000)",
        outcomeText: "Vuelves con la mente clara. Tu eficiencia empresarial sube y logras regularizar tu nivel de estrés.",
        action: (state) => {
          state.cash -= 15000;
          state.efficiency = Math.min(100, state.efficiency + 15);
          state.corruptionRisk = Math.max(0, state.corruptionRisk - 10);
          state.historyLog.unshift(`[Personal] Retiro espiritual completado. +15% Eficiencia, -10 Riesgo Judicial.`);
        }
      },
      {
        text: "Ignorar la crisis y seguir trabajando",
        outcomeText: "Ahorras tu dinero, pero sientes el agotamiento del día a día.",
        action: (state) => {
          state.historyLog.unshift(`[Personal] Decidiste ignorar tu crisis de mediana edad.`);
        }
      }
    ]
  },
  {
    id: 52,
    title: "La Sucesión Familiar",
    category: "PERSONAL",
    description: "Tu hijo mayor finaliza sus estudios en una prestigiosa escuela de negocios. Debes decidir si colocarlo directamente en un puesto de dirección, obligarlo a empezar de abajo en la fábrica, o contratar a un CEO profesional externo.",
    trigger: (state) => (state.stage === "Empresa Consolidada" || state.stage === "Corporación Nacional") && state.employees >= 5,
    options: [
      {
        text: "Nombrarlo Director Ejecutivo (Gratis)",
        outcomeText: "Aumenta la lealtad familiar y tu control de la empresa, pero el personal se resiente por el acomodo y cae la eficiencia.",
        action: (state) => {
          state.independence = Math.min(100, state.independence + 15);
          state.efficiency = Math.max(10, state.efficiency - 15);
          state.historyLog.unshift(`[Personal] Nombraste a tu hijo Director Ejecutivo. -15% Eficiencia.`);
        }
      },
      {
        text: "Obligarlo a empezar en la fábrica desde abajo (-$5.000)",
        outcomeText: "Tus empleados respetan el gesto y ven equidad. Tu reputación corporativa mejora sensiblemente.",
        action: (state) => {
          state.cash -= 5000;
          state.reputation = Math.min(100, state.reputation + 20);
          state.historyLog.unshift(`[Personal] Tu hijo empieza de abajo en planta. +20 Reputación.`);
        }
      },
      {
        text: "Contratar un CEO externo profesional (-$30.000)",
        outcomeText: "Traes a un ejecutivo con experiencia multinacional. La eficiencia y la innovación dan un salto inmediato.",
        action: (state) => {
          state.cash -= 30000;
          state.efficiency = Math.min(100, state.efficiency + 25);
          state.innovation = Math.min(100, state.innovation + 15);
          state.historyLog.unshift(`[Personal] Contrataste un CEO corporativo profesional. +25% Eficiencia.`);
        }
      }
    ]
  },
  {
    id: 53,
    title: "El Heredero Caprichoso",
    category: "PERSONAL",
    description: "Tu hijo menor choca el auto corporativo de la empresa contra el portal de una residencia privada. Los vecinos amenazan con llamar a los medios si no pagás los daños de inmediato.",
    trigger: (state) => state.employees >= 3 && state.cash >= 50000,
    options: [
      {
        text: "Pagar el arreglo y silenciar el asunto (-$20.000)",
        outcomeText: "Evitas que la noticia trascienda. Mantienes tu reputación intacta a costa de caja.",
        action: (state) => {
          state.cash -= 20000;
          state.reputation = Math.min(100, state.reputation + 5);
          state.historyLog.unshift(`[Personal] Pagaste los daños del choque familiar. Evitaste escándalo.`);
        }
      },
      {
        text: "Dejar que intervenga la justicia y deslindar responsabilidad",
        outcomeText: "Te ahorras el dinero, pero el escándalo mediático y el juicio afectan la reputación de tu empresa.",
        action: (state) => {
          state.reputation = Math.max(0, state.reputation - 20);
          state.independence = Math.min(100, state.independence + 10);
          state.historyLog.unshift(`[Personal] Dejaste el choque en manos de la justicia. Escándalo en prensa.`);
        }
      },
      {
        text: "Usar contactos políticos para archivar la causa judicial",
        condition: (state) => state.contacts >= 25,
        conditionText: "Requiere 25% de Contactos",
        outcomeText: "Llamas al comisario de la zona. Se archiva la causa, pero aumentas tu nivel de exposición y riesgo de AFIP.",
        action: (state) => {
          state.contacts = Math.max(0, state.contacts - 5);
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 15);
          state.historyLog.unshift(`[Personal] Archivaste el choque usando influencia policial.`);
        }
      }
    ]
  },
  {
    id: 54,
    title: "Compra de Mansión en San Isidro",
    category: "PERSONAL",
    description: "Tu estatus social ha crecido. Se libera una propiedad histórica en las barrancas de San Isidro. Adquirirla consolidará tu prestigio frente al 'Círculo Rojo' empresarial argentino.",
    trigger: (state) => (state.stage === "Corporación Nacional" || state.stage === "Pulpo Económico / Magnate") && state.cash >= 600000,
    options: [
      {
        text: "Comprar la mansión al contado (-$400.000)",
        outcomeText: "Te mudas a la zona más exclusiva. Tus contactos sociales y reputación crecen enormemente.",
        action: (state) => {
          state.cash -= 400000;
          state.contacts = Math.min(100, state.contacts + 30);
          state.reputation = Math.min(100, state.reputation + 20);
          state.historyLog.unshift(`[Personal] Compraste mansión en San Isidro. +30 Contactos.`);
        }
      },
      {
        text: "Rechazar la propiedad y seguir viviendo de forma austera",
        outcomeText: "Demuestras austeridad. Tu independencia y foco corporativo mejoran, ganando respeto interno.",
        action: (state) => {
          state.independence = Math.min(100, state.independence + 15);
          state.efficiency = Math.min(100, state.efficiency + 10);
          state.historyLog.unshift(`[Personal] Declinaste comprar la mansión. Foco en la austeridad.`);
        }
      }
    ]
  },
  {
    id: 55,
    title: "Filantropía en el Museo Nacional",
    category: "PERSONAL",
    description: "El Museo Nacional de Bellas Artes te invita a ser su mecenas principal financiando la restauración de un ala histórica, posicionándote como un referente cultural del país.",
    trigger: (state) => state.cash >= 200000 && state.reputation >= 40,
    options: [
      {
        text: "Donar fondos para la restauración del museo (-$60.000)",
        outcomeText: "La opinión pública celebra tu compromiso. Tu reputación sube al máximo y obtienes una desgravación fiscal.",
        action: (state) => {
          state.cash -= 60000;
          state.reputation = Math.min(100, state.reputation + 30);
          state.contacts = Math.min(100, state.contacts + 10);
          state.historyLog.unshift(`[Personal] Donaste $60.000 al Museo Nacional. Reputación al máximo.`);
        }
      },
      {
        text: "Adquirir una colección de arte privada como resguardo (-$80.000)",
        outcomeText: "Inviertes en activos tangibles que retienen valor. La alta sociedad alaba tu buen gusto.",
        action: (state) => {
          state.cash -= 80000;
          state.reputation = Math.min(100, state.reputation + 15);
          state.historyLog.unshift(`[Personal] Adquiriste colección de arte privada como inversión.`);
        }
      },
      {
        text: "Declinar la propuesta amablemente",
        outcomeText: "Conservas la liquidez, pero los círculos culturales te tildan de insensible.",
        action: (state) => {
          state.reputation = Math.max(0, state.reputation - 5);
          state.historyLog.unshift(`[Personal] Declinaste el mecenazgo del Museo Nacional.`);
        }
      }
    ]
  },
  {
    id: 56,
    title: "Boda de Elite",
    category: "PERSONAL",
    description: "Se celebra tu boda (o la de tu hijo) con la hija de un influyente camarista federal. El evento es el acontecimiento social del año.",
    trigger: (state) => state.turn >= 36 && state.contacts >= 25 && state.cash >= 100000,
    options: [
      {
        text: "Organizar una gala masiva en el Alvear Palace Hotel (-$50.000)",
        outcomeText: "Asisten ministros, empresarios y jueces. Tus contactos políticos y sociales explotan.",
        action: (state) => {
          state.cash -= 50000;
          state.contacts = Math.min(100, state.contacts + 35);
          state.reputation = Math.min(100, state.reputation + 15);
          state.historyLog.unshift(`[Personal] Mega boda en el Alvear. +35% Contactos.`);
        }
      },
      {
        text: "Hacer una celebración íntima en tu estancia (-$15.000)",
        outcomeText: "Mantienes un perfil bajo y resguardas tu independencia empresarial.",
        action: (state) => {
          state.cash -= 15000;
          state.independence = Math.min(100, state.independence + 20);
          state.historyLog.unshift(`[Personal] Celebración de boda privada. +20 Independencia.`);
        }
      }
    ]
  },
  {
    id: 57,
    title: "Doctorado Honoris Causa",
    category: "PERSONAL",
    description: "Una prestigiosa universidad nacional te confiere el Doctorado Honoris Causa por tu trayectoria y aporte al desarrollo tecnológico y empresarial.",
    trigger: (state) => state.innovation >= 55 && state.reputation >= 55,
    options: [
      {
        text: "Aceptar la distinción y dar el discurso de graduación (-$5.000)",
        outcomeText: "Tu imagen pública es impecable. Los medios te retratan como un líder ético y visionario.",
        action: (state) => {
          state.cash -= 5000;
          state.reputation = Math.min(100, state.reputation + 25);
          state.innovation = Math.min(100, state.innovation + 10);
          state.historyLog.unshift(`[Personal] Recibiste Doctorado Honoris Causa. +25 Reputación.`);
        }
      },
      {
        text: "Rechazar por motivos de agenda corporativa",
        outcomeText: "Evitas el foco de atención, ganando tiempo para concentrarte en tus operaciones.",
        action: (state) => {
          state.efficiency = Math.min(100, state.efficiency + 5);
          state.historyLog.unshift(`[Personal] Rechazaste el Doctorado Honoris Causa.`);
        }
      }
    ]
  },
  {
    id: 58,
    title: "Alianza Estratégica Internacional",
    category: "CRECIMIENTO",
    description: "Una multinacional extranjera líder en tu rubro te propone firmar un joint-venture de distribución cruzada para expandir tus operaciones a nivel latinoamericano.",
    trigger: (state) => (state.stage === "Corporación Nacional" || state.stage === "Pulpo Económico / Magnate") && state.cash >= 150000,
    options: [
      {
        text: "Firmar la alianza e integrar operaciones (-$100.000)",
        outcomeText: "Tus clientes se multiplican de inmediato y accedes a transferencia tecnológica que dispara tu innovación.",
        action: (state) => {
          state.cash -= 100000;
          state.clients = Math.min(1000, state.clients + 150);
          state.innovation = Math.min(100, state.innovation + 20);
          state.efficiency = Math.min(100, state.efficiency + 15);
          state.historyLog.unshift(`[Alianza] Firmaste Joint-Venture internacional. +150 Clientes, +20% Innovación.`);
        }
      },
      {
        text: "Rechazar la propuesta para mantener control total",
        outcomeText: "Preservas tu total independencia societaria sin diluciones ni influencia extranjera.",
        action: (state) => {
          state.independence = Math.min(100, state.independence + 20);
          state.historyLog.unshift(`[Alianza] Declinaste joint-venture. Mantienes independencia del 100%.`);
        }
      }
    ]
  },
  {
    id: 59,
    title: "Subsidio de Fomento del BID",
    category: "FINANZAS & TECNOLOGÍA",
    description: "El Banco Interamericano de Desarrollo (BID) abre un cupo de fomento tecnológico para empresas que inviertan en procesos y eficiencia digital sustentable.",
    trigger: (state) => state.innovation >= 30 && state.cash >= 20000,
    options: [
      {
        text: "Contratar consultora para preparar pliego del BID (-$10.000)",
        outcomeText: "Tu propuesta es aprobada. Recibes un subsidio internacional no reembolsable libre de impuestos e independiente del Estado.",
        action: (state) => {
          state.cash += 110000; // $120k grant minus $10k cost
          state.efficiency = Math.min(100, state.efficiency + 15);
          state.historyLog.unshift(`[BID] Obtuviste subsidio no reembolsable del BID. +$120.000, +15% Eficiencia.`);
        }
      },
      {
        text: "No aplicar y ahorrar capital operativo",
        outcomeText: "Mantienes tu liquidez ordinaria sin desviar recursos de ingeniería a pliegos.",
        action: (state) => {
          state.historyLog.unshift(`[BID] Declinaste aplicar al subsidio del BID.`);
        }
      }
    ]
  },
  {
    id: 60,
    title: "Boom de Demanda por Eco-Trend",
    category: "MERCADO",
    description: "Se instala una fuerte tendencia de consumo verde y sustentable en tu mercado principal. Los clientes buscan activamente marcas con responsabilidad ecológica.",
    trigger: (state) => state.reputation >= 45 && ["industrial", "comercio", "agropecuario"].includes(state.businessType) && state.cash >= 30000,
    options: [
      {
        text: "Lanzar línea sustentable con certificación ecológica (-$20.000)",
        outcomeText: "El mercado responde con entusiasmo. Atraes un aluvión de clientes y consolidas tu reputación.",
        action: (state) => {
          state.cash -= 20000;
          state.clients = Math.min(1000, state.clients + 80);
          state.reputation = Math.min(100, state.reputation + 20);
          state.historyLog.unshift(`[Mercado] Lanzaste línea Eco-Friendly. +80 Clientes, +20 Reputación.`);
        }
      },
      {
        text: "Ignorar la tendencia verde y ahorrar caja",
        outcomeText: "Mantienes tus procesos productivos estándar y evitas costos de reestructuración.",
        action: (state) => {
          state.historyLog.unshift(`[Mercado] Declinaste cambiar a empaques verdes.`);
        }
      }
    ]
  },
  {
    id: 61,
    title: "Exención Impositiva Provincial",
    category: "POLÍTICA & FINANZAS",
    description: "Una provincia vecina busca atraer inversiones y te ofrece una exención de ingresos brutos y tasas municipales si trasladas una sucursal o planta operativa allí.",
    trigger: (state) => state.stage === "Empresa Consolidada" && state.cash >= 100000,
    options: [
      {
        text: "Establecer sede provincial secundaria (-$80.000)",
        outcomeText: "La inversión inicial es costosa, pero reduce tu alícuota fiscal neta de forma permanente y atraes clientes de la nueva región.",
        action: (state) => {
          state.cash -= 80000;
          state.clients = Math.min(1000, state.clients + 60);
          state.panamaTaxShield = true; // Simulates tax break by sharing offshore shield code path or lowering rate
          state.historyLog.unshift(`[Expansión] Nueva planta provincial inaugurada. +60 Clientes, rebaja fiscal del 50%.`);
        }
      },
      {
        text: "Permanecer centralizado en tu sede actual",
        outcomeText: "Evitas los costos de mudanza y mantienes la supervisión centralizada de tu negocio.",
        action: (state) => {
          state.historyLog.unshift(`[Expansión] Declinaste la exención impositiva de la provincia vecina.`);
        }
      }
    ]
  },
  {
    id: 62,
    title: "Nominación a Empresario del Año",
    category: "PRESTIGIO",
    description: "La cámara empresarial del Círculo Rojo te nomina al prestigioso premio 'Empresario del Año' debido a tu trayectoria y crecimiento sustentable.",
    trigger: (state) => state.reputation >= 60 && state.cash >= 150000,
    options: [
      {
        text: "Patrocinar la gala anual de premiación (-$15.000)",
        outcomeText: "Te consagras ganador indiscutido. Las portadas de prensa te aclaman y tu red de contactos corporativos se amplía.",
        action: (state) => {
          state.cash -= 15000;
          state.reputation = Math.min(100, state.reputation + 25);
          state.contacts = Math.min(100, state.contacts + 20);
          state.historyLog.unshift(`[Prestigio] Ganador 'Empresario del Año'. +25 Reputación, +20 Contactos.`);
        }
      },
      {
        text: "Asistir a la premiación como invitado de perfil bajo",
        outcomeText: "Ganas reconocimiento corporativo entre tus pares sin necesidad de desembolsar capital de auspicio.",
        action: (state) => {
          state.reputation = Math.min(100, state.reputation + 10);
          state.historyLog.unshift(`[Prestigio] Asististe a los premios Empresario del Año. +10 Reputación.`);
        }
      }
    ]
  },
  {
    id: 63,
    title: "Patente Registrada con Éxito",
    category: "TECNOLOGÍA & INNOVACIÓN",
    description: "Tu equipo de ingeniería o desarrollo registra con éxito una nueva patente ante el Instituto Nacional de la Propiedad Industrial (INPI) optimizando procesos críticos.",
    trigger: (state) => state.innovation >= 50 && state.cash >= 10000,
    options: [
      {
        text: "Aplicar la patente a tu propia línea productiva (-$10.000)",
        outcomeText: "Obtienes un incremento drástico y permanente en la eficiencia y la innovación de tus servicios o productos.",
        action: (state) => {
          state.cash -= 10000;
          state.efficiency = Math.min(200, state.efficiency + 30);
          state.innovation = Math.min(100, state.innovation + 10);
          state.historyLog.unshift(`[INPI] Implementaste patente INPI en operaciones. +30% Eficiencia.`);
        }
      },
      {
        text: "Vender la patente a una corporación rival",
        outcomeText: "Recibes una inyección inmediata de capital en efectivo, renunciando a las ventajas operativas futuras.",
        action: (state) => {
          state.cash += 50000;
          state.historyLog.unshift(`[INPI] Vendiste patente a un competidor por +$50.000 cash.`);
        }
      }
    ]
  },
  {
    id: 64,
    title: "Contrato de Exportación Industrial",
    category: "CRECIMIENTO COMERCIAL",
    description: "Un gran distribuidor en Brasil se interesa en importar tu línea de manufacturas, requiriendo readecuar el embalaje y pagar tasas de aduana iniciales por -$15.000.",
    trigger: (state) => state.businessType === "industrial" && state.efficiency >= 40 && state.cash >= 20000,
    options: [
      {
        text: "Firmar acuerdo de exportación y costear aduana (-$15.000)",
        outcomeText: "Cierras el contrato comercial. Otorgará un flujo de ingresos mensuales lícitos por 12 meses.",
        action: (state) => {
          state.cash -= 15000;
          const netAssets = state.cash + (state.hedgedCash || 0) + (state.machineryCount * 80000) - state.debt;
          const scale = Math.max(1, Math.floor(netAssets / 120000));
          const monthlyRevenue = 20000 * scale;
          state.activeTenders.push({
            id: Math.floor(Math.random() * 100000) + 10000,
            title: "Exportación a Brasil",
            monthlyRevenue,
            turnsLeft: 12
          });
          state.historyLog.unshift(`[Comercial] Firmaste exportación a Brasil (+$${monthlyRevenue.toLocaleString()}/mes) por 12 meses.`);
        }
      },
      {
        text: "Dejar pasar la oportunidad para ahorrar caja",
        outcomeText: "Decides enfocarte en el mercado interno y evitas los gastos logísticos iniciales.",
        action: (state) => {
          state.historyLog.unshift(`[Comercial] Dejaste pasar el contrato de exportación industrial.`);
        }
      }
    ]
  },
  {
    id: 65,
    title: "Exportación de Granos a Europa",
    category: "CRECIMIENTO COMERCIAL",
    description: "Un bróker de granos en Róterdam te propone un contrato a término de 12 meses para exportar tu cosecha, requiriendo adaptar controles fitosanitarios por -$15.000.",
    trigger: (state) => state.businessType === "agropecuario" && state.efficiency >= 40 && state.cash >= 20000,
    options: [
      {
        text: "Financiar controles fitosanitarios y firmar (-$15.000)",
        outcomeText: "Firmas el contrato de exportación. Recibirás pagos mensuales lícitos garantizados por 12 meses.",
        action: (state) => {
          state.cash -= 15000;
          const netAssets = state.cash + (state.hedgedCash || 0) + (state.machineryCount * 80000) - state.debt;
          const scale = Math.max(1, Math.floor(netAssets / 120000));
          const monthlyRevenue = 20000 * scale;
          state.activeTenders.push({
            id: Math.floor(Math.random() * 100000) + 10000,
            title: "Exportación a Róterdam",
            monthlyRevenue,
            turnsLeft: 12
          });
          state.historyLog.unshift(`[Comercial] Firmaste exportación a Europa (+$${monthlyRevenue.toLocaleString()}/mes) por 12 meses.`);
        }
      },
      {
        text: "Declinar la oferta internacional",
        outcomeText: "Vendes la cosecha en acopios locales sin incurrir en costos de certificación internacional.",
        action: (state) => {
          state.historyLog.unshift(`[Comercial] Declinaste exportar granos a Róterdam.`);
        }
      }
    ]
  },
  {
    id: 66,
    title: "Contrato de Desarrollo Cloud Enterprise",
    category: "CRECIMIENTO COMERCIAL",
    description: "Una multinacional de servicios financieros te invita a firmar el desarrollo de su infraestructura de datos en la nube por 12 meses, requiriendo auditorías de seguridad por -$10.000.",
    trigger: (state) => state.businessType === "software" && state.innovation >= 45 && state.cash >= 15000,
    options: [
      {
        text: "Pagar auditoría y firmar contrato cloud (-$10.000)",
        outcomeText: "Consigues el contrato corporativo privado de desarrollo, sumando facturación lícita mensual por 12 meses.",
        action: (state) => {
          state.cash -= 10000;
          const netAssets = state.cash + (state.hedgedCash || 0) + (state.machineryCount * 80000) - state.debt;
          const scale = Math.max(1, Math.floor(netAssets / 120000));
          const monthlyRevenue = 15000 * scale;
          state.activeTenders.push({
            id: Math.floor(Math.random() * 100000) + 10000,
            title: "Desarrollo Cloud Enterprise",
            monthlyRevenue,
            turnsLeft: 12
          });
          state.historyLog.unshift(`[Comercial] Firmaste contrato de desarrollo cloud (+$${monthlyRevenue.toLocaleString()}/mes) por 12 meses.`);
        }
      },
      {
        text: "Dejar pasar y enfocar desarrolladores en SaaS propio",
        outcomeText: "Evitas el gasto y continúas mejorando tus productos internos.",
        action: (state) => {
          state.historyLog.unshift(`[Comercial] Declinaste el contrato de desarrollo cloud corporativo.`);
        }
      }
    ]
  },
  {
    id: 67,
    title: "Gran Canal de Distribución Mayorista",
    category: "CRECIMIENTO COMERCIAL",
    description: "La mayor cadena de supermercados del país te ofrece ingresar tus productos en sus góndolas nacionales, requiriendo un aporte logístico inicial de -$20.000.",
    trigger: (state) => state.businessType === "comercio" && state.reputation >= 40 && state.cash >= 25000,
    options: [
      {
        text: "Financiar integración logística y firmar (-$20.000)",
        outcomeText: "El contrato se sella. Garantizas ventas masivas a precio mayorista fijo por 12 meses.",
        action: (state) => {
          state.cash -= 20000;
          const netAssets = state.cash + (state.hedgedCash || 0) + (state.machineryCount * 80000) - state.debt;
          const scale = Math.max(1, Math.floor(netAssets / 120000));
          const monthlyRevenue = 22000 * scale;
          state.activeTenders.push({
            id: Math.floor(Math.random() * 100000) + 10000,
            title: "Acuerdo Supermercado Nacional",
            monthlyRevenue,
            turnsLeft: 12
          });
          state.historyLog.unshift(`[Comercial] Firmaste acuerdo mayorista con supermercados (+$${monthlyRevenue.toLocaleString()}/mes) por 12 meses.`);
        }
      },
      {
        text: "Permanecer vendiendo en locales propios",
        outcomeText: "Mantienes márgenes minoristas más altos pero menor escala de volumen.",
        action: (state) => {
          state.historyLog.unshift(`[Comercial] Declinaste ingresar a la cadena nacional de supermercados.`);
        }
      }
    ]
  },
  {
    id: 68,
    title: "Adjudicación de Obra Civil Privada",
    category: "CRECIMIENTO COMERCIAL",
    description: "Un importante consorcio de desarrolladores privados te propone adjudicarte la cimentación de un complejo de torres en Belgrano, exigiendo seguros de caución por -$25.000.",
    trigger: (state) => state.businessType === "construccion" && state.machineryCount >= 2 && state.cash >= 30000,
    options: [
      {
        text: "Adquirir seguros de caución y firmar (-$25.000)",
        outcomeText: "Sellas el acuerdo privado. Obtienes ingresos mensuales certificados por 12 meses.",
        action: (state) => {
          state.cash -= 25000;
          const netAssets = state.cash + (state.hedgedCash || 0) + (state.machineryCount * 80000) - state.debt;
          const scale = Math.max(1, Math.floor(netAssets / 120000));
          const monthlyRevenue = 30000 * scale;
          state.activeTenders.push({
            id: Math.floor(Math.random() * 100000) + 10000,
            title: "Obra Torres de Belgrano",
            monthlyRevenue,
            turnsLeft: 12
          });
          state.historyLog.unshift(`[Comercial] Firmaste obra civil privada de torres (+$${monthlyRevenue.toLocaleString()}/mes) por 12 meses.`);
        }
      },
      {
        text: "Rechazar y licitar obras de menor escala",
        outcomeText: "Evitas el desembolso inicial de seguros corporativos.",
        action: (state) => {
          state.historyLog.unshift(`[Comercial] Declinaste obra civil privada de gran envergadura.`);
        }
      }
    ]
  },
  {
    id: 69,
    title: "Estructuración de Fideicomiso Privado",
    category: "CRECIMIENTO COMERCIAL",
    description: "Una red de oficinas de banca privada te ofrece estructurar en conjunto un fideicomiso de inversión, demandando gastos legales y regulatorios por -$30.000.",
    trigger: (state) => state.businessType === "finanzas" && state.contacts >= 20 && state.cash >= 35000,
    options: [
      {
        text: "Costear gastos de estructuración y firmar (-$30.000)",
        outcomeText: "Lanzas el fideicomiso. Ganas comisiones fijas mensuales por administración durante 12 meses.",
        action: (state) => {
          state.cash -= 30000;
          const netAssets = state.cash + (state.hedgedCash || 0) + (state.machineryCount * 80000) - state.debt;
          const scale = Math.max(1, Math.floor(netAssets / 120000));
          const monthlyRevenue = 35000 * scale;
          state.activeTenders.push({
            id: Math.floor(Math.random() * 100000) + 10000,
            title: "Fideicomiso Privado",
            monthlyRevenue,
            turnsLeft: 12
          });
          state.historyLog.unshift(`[Comercial] Firmaste estructuración de fideicomiso privado (+$${monthlyRevenue.toLocaleString()}/mes) por 12 meses.`);
        }
      },
      {
        text: "No participar de la estructuración",
        outcomeText: "Mantienes tu liquidez libre de costos legales extraordinarios.",
        action: (state) => {
          state.historyLog.unshift(`[Comercial] Declinaste estructurar fideicomiso privado.`);
        }
      }
    ]
  },
  {
    id: 70,
    title: "Derrame de Crudo en Plataforma",
    category: "RIESGO AMBIENTAL",
    description: "Una fisura en una junta de presión de tu pozo petrolero libera crudo al mar. Las organizaciones ambientalistas y el Estado te exigen multas y remediación.",
    trigger: (state) => state.businessType === "petrolera" && state.machineryCount >= 1,
    options: [
      {
        text: "Pagar la remediación ecológica inmediata (-$100.000)",
        outcomeText: "Evitas un juicio multimillonario y mejoras tu reputación pública, pero drena tu liquidez.",
        action: (state) => {
          state.cash -= 100000;
          state.reputation = Math.min(100, state.reputation + 15);
          state.historyLog.unshift(`[Petróleo] Pagaste remediación por derrame de crudo. -$100.000.`);
        }
      },
      {
        text: "Apelar la multa ante la justicia y retrasar obras",
        outcomeText: "Evitas el pago inmediato, pero la prensa y activistas destruyen tu reputación corporativa.",
        action: (state) => {
          state.reputation = Math.max(0, state.reputation - 30);
          state.corruptionRisk = Math.min(100, state.corruptionRisk + 10);
          state.historyLog.unshift(`[Petróleo] Apelaste judicialmente la sanción por derrame. Daño reputacional.`);
        }
      }
    ]
  },
  {
    id: 71,
    title: "Concesión de Shale Gas en Vaca Muerta",
    category: "CRECIMIENTO COMERCIAL",
    description: "Geólogos confirman reservas de gas no convencional masivas en tus lotes de Vaca Muerta. Requiere costear fractura hidráulica para explotarlo.",
    trigger: (state) => state.businessType === "petrolera" && state.cash >= 80000,
    options: [
      {
        text: "Financiar explotación hidráulica de Shale (-$80.000)",
        outcomeText: "La producción se dispara, atrayendo nuevos clientes de exportación industrial.",
        action: (state) => {
          state.cash -= 80000;
          state.efficiency = Math.min(200, state.efficiency + 30);
          state.clients = Math.min(1000, state.clients + 90);
          state.historyLog.unshift(`[Petróleo] Financiaste Shale Gas en Vaca Muerta. +30% Eficiencia.`);
        }
      },
      {
        text: "Vender la concesión a una corporación extranjera",
        outcomeText: "Cedes los derechos futuros a cambio de una inyección de caja masiva inmediata.",
        action: (state) => {
          state.cash += 150000;
          state.historyLog.unshift(`[Petróleo] Vendiste concesión de yacimiento. +$150.000.`);
        }
      }
    ]
  },
  {
    id: 72,
    title: "Derrumbe de Galería Minera",
    category: "RIESGO OPERATIVO",
    description: "Un sismo provoca el derrumbe de una galería subterránea de extracción de litio, paralizando temporalmente las faenas mineras.",
    trigger: (state) => state.businessType === "minera" && state.machineryCount >= 1,
    options: [
      {
        text: "Indemnizar personal y reconstruir con seguridad máxima (-$80.000)",
        outcomeText: "Ganas el apoyo absoluto del gremio y recuperas eficiencia operativa.",
        action: (state) => {
          state.cash -= 80000;
          state.reputation = Math.min(100, state.reputation + 20);
          state.efficiency = Math.min(200, state.efficiency + 15);
          state.historyLog.unshift(`[Minería] Reconstruiste galería colapsada. Gremio conforme.`);
        }
      },
      {
        text: "Forzar el reinicio de tareas sin obras de contención",
        outcomeText: "Te ahorras el dinero, pero desatas una huelga sindical masiva que desploma la productividad.",
        action: (state) => {
          state.efficiency = Math.max(10, state.efficiency - 25);
          state.reputation = Math.max(0, state.reputation - 20);
          state.historyLog.unshift(`[Minería] Forzaste tareas en zona insegura. Huelga y caída de eficiencia.`);
        }
      }
    ]
  },
  {
    id: 73,
    title: "Bloqueo Indígena en el Yacimiento",
    category: "CONFLICTO SOCIAL",
    description: "Comunidades originarias locales cortan las rutas de acceso a tu mina de cobre por la preocupación del impacto del proyecto sobre las napas acuíferas.",
    trigger: (state) => state.businessType === "minera",
    options: [
      {
        text: "Financiar acueducto público comunitario (-$50.000)",
        outcomeText: "Desactivas el corte de forma pacífica sumando reputación y contactos regionales.",
        action: (state) => {
          state.cash -= 50000;
          state.reputation = Math.min(100, state.reputation + 20);
          state.contacts = Math.min(100, state.contacts + 10);
          state.historyLog.unshift(`[Minería] Donaste acueducto comunitario. Conflicto social resuelto.`);
        }
      },
      {
        text: "Solicitar desalojo policial de la ruta",
        condition: (state) => ["Liberalismo", "Radicalismo"].includes(state.governmentType) || state.contacts >= 30,
        conditionText: "Requiere Gobierno Afín o 30% de Contactos",
        outcomeText: "La policía desaloja la ruta liberando el yacimiento, pero la opinión pública condena la represión.",
        action: (state) => {
          state.reputation = Math.max(0, state.reputation - 30);
          state.historyLog.unshift(`[Minería] Desalojo policial del yacimiento. Caída severa de reputación.`);
        }
      }
    ]
  },
  {
    id: 74,
    title: "Provisión de Crudo a Refinería",
    category: "CRECIMIENTO COMERCIAL",
    description: "La refinería petrolera nacional YPF te ofrece un contrato de provisión preferencial de crudo por 12 meses si pagas la tasa de ducto por -$30.000.",
    trigger: (state) => state.businessType === "petrolera" && state.efficiency >= 35 && state.cash >= 35000,
    options: [
      {
        text: "Pagar tasa de ducto y firmar contrato (-$30.000)",
        outcomeText: "Firmas el contrato. Otorga un flujo mensual de facturación lícita garantizado por 12 meses.",
        action: (state) => {
          state.cash -= 30000;
          const netAssets = state.cash + (state.hedgedCash || 0) + (state.machineryCount * 80000) - state.debt;
          const scale = Math.max(1, Math.floor(netAssets / 120000));
          const monthlyRevenue = 40000 * scale;
          state.activeTenders.push({
            id: Math.floor(Math.random() * 100000) + 10000,
            title: "Venta Crudo Refinería",
            monthlyRevenue,
            turnsLeft: 12
          });
          state.historyLog.unshift(`[Petróleo] Sellaste provisión de crudo (+$${monthlyRevenue.toLocaleString()}/mes) por 12 meses.`);
        }
      },
      {
        text: "Dejar pasar la oportunidad comercial",
        outcomeText: "Conservas la liquidez inmediata para especulaciones financieras de mes.",
        action: (state) => {
          state.historyLog.unshift(`[Petróleo] Rechazaste contrato de provisión de crudo.`);
        }
      }
    ]
  },
  {
    id: 75,
    title: "Exportación de Litio a Asia",
    category: "CRECIMIENTO COMERCIAL",
    description: "Un gigante tecnológico de Corea del Sur te ofrece comprar tu producción de litio por 12 meses, requiriendo un canon portuario inicial por -$25.000.",
    trigger: (state) => state.businessType === "minera" && state.efficiency >= 35 && state.cash >= 30000,
    options: [
      {
        text: "Pagar canon portuario y firmar contrato (-$25.000)",
        outcomeText: "El contrato se sella. Aseguras ventas masivas internacionales garantizadas por 12 meses.",
        action: (state) => {
          state.cash -= 25000;
          const netAssets = state.cash + (state.hedgedCash || 0) + (state.machineryCount * 80000) - state.debt;
          const scale = Math.max(1, Math.floor(netAssets / 120000));
          const monthlyRevenue = 35000 * scale;
          state.activeTenders.push({
            id: Math.floor(Math.random() * 100000) + 10000,
            title: "Exportación Litio Asia",
            monthlyRevenue,
            turnsLeft: 12
          });
          state.historyLog.unshift(`[Minería] Exportación de Litio sellada (+$${monthlyRevenue.toLocaleString()}/mes) por 12 meses.`);
        }
      },
      {
        text: "Declinar la exportación y acopiar stock",
        outcomeText: "Mantienes la producción en inventario esperando mejores precios de commodity.",
        action: (state) => {
          state.historyLog.unshift(`[Minería] Declinaste exportar litio a Corea del Sur.`);
        }
      }
    ]
  }
];
