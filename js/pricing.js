/* Calculadora: custo de caminhão + equipe + materiais, com acréscimo configurável.
   Regras sem parâmetro definido mandam o pedido para avaliação manual. */
(function () {
  const JA = (window.JA = window.JA || {});
  const { round2 } = JA.u;

  function itemInfo(name) { return JA.CATALOG[name] || JA.DEFAULT_ITEM; }

  function inventoryStats(draft) {
    let pts = 0, moved = 0, kept = 0, contentOnly = 0;
    draft.rooms.forEach((r) => r.items.forEach((i) => {
      const info = itemInfo(i.name);
      const q = Number(i.qty) || 0;
      if (i.mode === 'fica') { kept += q; return; }
      if (i.mode === 'conteudo') { contentOnly += q; pts += 1 * q; return; }
      moved += q; pts += info.pts * q;
    }));
    return { pts: round2(pts), moved, kept, contentOnly };
  }

  function boxCount(draft, pts) {
    if (draft.boxes.unknown || draft.boxes.qty === '' || draft.boxes.qty == null) {
      return { qty: Math.max(10, Math.min(80, Math.round(pts))), estimated: true };
    }
    return { qty: Number(draft.boxes.qty) || 0, estimated: false };
  }

  /* Retorna composição de custos + motivos para avaliação manual. */
  function compute(draft, config, costs, markupPct) {
    const reasons = [];
    const st = inventoryStats(draft);
    const bx = boxCount(draft, st.pts);
    const vol = round2(st.pts + bx.qty * 0.4);
    const m = markupPct == null ? config.previewMarkup : markupPct;

    if (!draft.route.from.trim() || !draft.route.to.trim()) reasons.push('Origem ou destino não informados.');
    if (st.moved + st.contentOnly === 0) reasons.push('Nenhum item marcado para levar.');
    ['origin', 'dest'].forEach((k) => {
      const a = draft.access[k];
      const lbl = k === 'origin' ? 'origem' : 'destino';
      if (a.floor === '' || a.floor == null) reasons.push(`Andar da ${lbl} não informado.`);
      if (!a.elevator) reasons.push(`Acesso da ${lbl} (elevador ou escada) não informado.`);
      if (a.elevator === 'escada' && Number(a.floor) > config.access.maxFloorStairsOnly)
        reasons.push(`Só escada no ${a.floor}º andar da ${lbl}: exceção de acesso, precisa de avaliação.`);
    });

    // Caixas
    let extraBoxesCost = 0;
    if (!bx.estimated && bx.qty > config.boxes.porte)
      reasons.push(`${bx.qty} caixas: acima do porte de até ${config.boxes.porte} caixas do pacote.`);
    else if (!bx.estimated && bx.qty > config.boxes.included) {
      if (config.boxes.extraBoxPrice == null || config.boxes.extraBoxPrice === '')
        reasons.push(`Acima de ${config.boxes.included} caixas o preço cresce gradualmente; valor por caixa extra ainda não definido.`);
      else extraBoxesCost = (bx.qty - config.boxes.included) * Number(config.boxes.extraBoxPrice);
    }

    // Viagem
    let travelCost = 0;
    if (draft.route.type === 'viagem') {
      if (config.travel.pricePerKm == null || config.travel.pricePerKm === '')
        reasons.push('Mudança de viagem: o valor por distância ainda não foi definido.');
      else if (!Number(draft.route.distanceKm)) reasons.push('Informe a distância aproximada da viagem.');
      else travelCost = Number(draft.route.distanceKm) * Number(config.travel.pricePerKm);
    }

    // Equipe
    let helpers = 2 + (vol >= 30 ? 1 : 0) + (vol >= 70 ? 1 : 0) + (vol >= 110 ? 1 : 0);
    const stairsLow = ['origin', 'dest'].some((k) => draft.access[k].elevator === 'escada' && Number(draft.access[k].floor) >= 2);
    if (stairsLow) helpers += 1;
    const pk = draft.services.packing;
    const packers = pk === 'completa' ? 1 + (vol >= 90 ? 1 : 0) : pk === 'frageis' ? 1 : 0;

    // Caminhão
    let truckCost = costs.truckSmall, truck = 'Caminhão padrão';
    if (vol > config.capacity.maxPts) reasons.push('Volume acima da capacidade cadastrada: precisa de avaliação.');
    else if (vol > config.capacity.smallTruckPts) {
      truck = 'Caminhão maior';
      if (costs.truckLarge == null || costs.truckLarge === '') { reasons.push('Volume pede caminhão maior, sem valor cadastrado.'); truckCost = costs.truckSmall; }
      else truckCost = costs.truckLarge;
    }

    const teamCost = helpers * costs.helper + packers * costs.packer;
    const subtotal = truckCost + teamCost + travelCost + extraBoxesCost;
    const materials = bx.qty * costs.boxMaterial;
    const factor = 1 + m / 100;
    const subtotalMarked = round2(subtotal * factor);
    const materialsCharged = round2(config.materialsMarkup ? materials * factor : materials);
    const price = round2(subtotalMarked + materialsCharged);

    return {
      ok: reasons.length === 0, reasons, stats: st, vol,
      boxes: bx, markup: m,
      comp: { truck, truckCost, helpers, helperCost: costs.helper, packers, packerCost: costs.packer, teamCost, travelCost, extraBoxesCost, subtotal, materials, subtotalMarked, materialsCharged },
      price,
    };
  }

  function payments(base, config) {
    const p = config.payment;
    const d1 = round2(base * (1 + p.debit1x / 100));
    const c1 = round2(base * (1 + p.credit1x / 100));
    const c4 = round2(base * (1 + p.credit4x / 100));
    return {
      base,
      pix: base,
      debit1x: d1, credit1x: c1, credit4x: c4, credit4xInstallment: round2(c4 / 4),
      deposit: round2(base * config.depositPct / 100),
      pct: p,
    };
  }

  /* Pacotes aplicáveis ao pedido, com preço apresentado ao cliente. */
  function packagesFor(draft, state) {
    const config = state.config;
    const calc = compute(draft, config, state.costs, config.previewMarkup);
    const pkgs = state.packages.filter((p) => p.active).map((pkg) => {
      const fits = calc.boxes.estimated || calc.boxes.qty <= pkg.porteBoxes;
      let price, label;
      if (draft.demoCase && pkg.id === 'prestige') { price = JA.REFERENCE_PRICE; label = 'Orçamento de referência'; }
      else { price = round2(calc.price * (pkg.priceFactor || 1)); label = state.costs.fictional ? 'Estimativa online (parâmetros de demonstração)' : 'Estimativa online'; }
      return { pkg, price, label, applicable: fits, payments: payments(price, config) };
    });
    return { calc, pkgs };
  }

  JA.pricing = { compute, payments, packagesFor, inventoryStats, itemInfo };
})();
