/* Estado único da demonstração, persistido no navegador (localStorage). */
(function () {
  const JA = (window.JA = window.JA || {});
  const { uid, clone, round2 } = JA.u;
  const KEY = 'ja-mudancas-demo-v1';

  function withIds(draft) {
    draft.rooms.forEach((r) => {
      r.id = r.id || uid();
      r.items.forEach((i) => {
        i.id = i.id || uid();
        i.path = i.path || '';
        i.note = i.note || '';
        if (i.disassemble == null) i.disassemble = !!(JA.CATALOG[i.name] || {}).disassemble && i.mode === 'levar';
        if (i.assemble == null) i.assemble = i.disassemble;
      });
    });
    return draft;
  }

  function regionOf(text) {
    const t = JA.u.norm(text);
    for (const reg of Object.keys(JA.NEIGHBORHOODS)) {
      if (JA.NEIGHBORHOODS[reg].some((n) => t.includes(JA.u.norm(n)))) return reg;
    }
    return null;
  }

  function newCode() {
    const d = new Date();
    const yymm = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0');
    return `JA-${yymm}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  }

  function fresh() {
    const s = {
      v: 1,
      draft: withIds(JA.EMPTY_DRAFT()),
      draftOrder: null,
      currentOrder: null,
      orders: {},
      orderList: [],
      config: clone(JA.CONFIG_SEED),
      packages: clone(JA.PACKAGES_SEED),
      partners: clone(JA.PARTNERS_SEED),
      costs: clone(JA.COSTS_BASE),
      ui: { step: 1, filter: 'todos', search: '', tab: 'resumo', partnerId: 'p1', adminTab: 'regras', compare: [] },
    };
    seedOrders(s);
    return s;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.v === 1) {
          // custos reais x fictícios dependem do arquivo local: nunca misturar
          if (!!s.costs.fictional !== !!JA.COSTS_BASE.fictional) s.costs = clone(JA.COSTS_BASE);
          return s;
        }
      }
    } catch (e) { /* armazenamento indisponível: segue com estado novo */ }
    return fresh();
  }

  const store = { state: load(), listeners: [] };

  store.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(store.state)); } catch (e) { /* ignora */ }
  };
  store.commit = function (render = true) {
    store.save();
    if (render) store.listeners.forEach((fn) => fn());
  };
  store.reset = function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignora */ }
    store.state = fresh();
    store.save();
  };

  /* ---------- Rascunho do orçamento ---------- */
  store.loadDemo = function () {
    const s = store.state;
    s.draft = withIds(JA.DEMO_CASE());
    s.draftOrder = null;
    s.ui.step = 1;
    store.commit(false);
  };
  store.startQuote = function (from, to) {
    const s = store.state;
    if (s.draft.demoCase || s.draftOrder) { s.draft = withIds(JA.EMPTY_DRAFT()); s.draftOrder = null; }
    if (from != null) s.draft.route.from = from;
    if (to != null) s.draft.route.to = to;
    s.ui.step = 1;
    store.commit(false);
  };
  store.addItem = function (roomId, name) {
    const room = store.state.draft.rooms.find((r) => r.id === roomId);
    if (!room || !name.trim()) return;
    const existing = room.items.find((i) => i.name === name);
    if (existing) { existing.qty = Number(existing.qty) + 1; return existing; }
    const info = JA.CATALOG[name] || JA.DEFAULT_ITEM;
    const item = withIds({ rooms: [{ items: [{ name: name.trim(), qty: 1, mode: 'levar', custom: !JA.CATALOG[name] }] }] }).rooms[0].items[0];
    item.disassemble = !!info.disassemble; item.assemble = !!info.disassemble;
    room.items.push(item);
    return item;
  };
  store.findItem = function (itemId) {
    for (const r of store.state.draft.rooms) {
      const i = r.items.find((x) => x.id === itemId);
      if (i) return { room: r, item: i };
    }
    return {};
  };

  /* ---------- Pedidos ---------- */
  function log(order, who, text) { order.history.push({ at: Date.now(), who, text }); }
  store.log = log;

  function pricePayload(pk, cfg) {
    return { value: pk.price, label: pk.label, payments: pk.payments, pkgId: pk.pkg.id, pkgName: pk.pkg.name, depositPct: cfg.depositPct, validUntil: JA.u.endOfMonth() };
  }

  store.createOrUpdateOrder = function ({ pkgId, evaluation }) {
    const s = store.state;
    const { calc, pkgs } = JA.pricing.packagesFor(s.draft, s);
    const pk = pkgs.find((p) => p.pkg.id === pkgId) || pkgs[0];
    let order = s.draftOrder && s.orders[s.draftOrder];
    const snapshot = clone(s.draft);

    if (!order) {
      const code = newCode();
      order = {
        code, createdAt: Date.now(), status: evaluation ? 'avaliacao' : 'novo',
        region: regionOf(snapshot.route.from) || regionOf(snapshot.route.to),
        draft: snapshot, pkgId: pk.pkg.id, pkgName: pk.pkg.name,
        priceVersions: [], chat: [], history: [],
        deposit: { status: 'pendente', amount: null, at: null },
        partner: { attempts: [], assigned: null, progress: [], needsDecision: false },
        humanTakeover: false, unknownCount: 0,
        internal: { markup: s.config.previewMarkup, boxes: calc.boxes.estimated ? '' : calc.boxes.qty },
        evaluation: !!evaluation, reasons: calc.reasons,
      };
      s.orders[code] = order;
      s.orderList.unshift(code);
      s.draftOrder = code;
      log(order, 'Sistema', evaluation ? 'Pedido criado pelo site com solicitação de avaliação da equipe.' : `Pedido criado pelo site com o pacote ${pk.pkg.name}.`);
    } else {
      order.draft = snapshot; order.pkgId = pk.pkg.id; order.pkgName = pk.pkg.name;
      order.reasons = calc.reasons; order.evaluation = !!evaluation;
      if (evaluation && ['novo', 'atendimento'].includes(order.status)) order.status = 'avaliacao';
      log(order, 'Cliente', 'Cliente revisou o orçamento no site.');
    }

    if (!evaluation) {
      const last = order.priceVersions[order.priceVersions.length - 1];
      if (!last || last.value !== pk.price || last.pkgId !== pk.pkg.id) {
        const v = Object.assign({ v: order.priceVersions.length + 1, presentedAt: Date.now(), source: 'Site (cliente)' }, pricePayload(pk, s.config));
        order.priceVersions.push(v);
        log(order, 'Sistema', `Versão ${v.v} do preço apresentada ao cliente: ${JA.u.brl(v.value)} (${v.label}).`);
      }
    }
    s.currentOrder = order.code;
    store.commit(false);
    return order;
  };

  store.addPriceVersion = function (code, value, label, who) {
    const s = store.state, o = s.orders[code];
    const pay = JA.pricing.payments(round2(value), s.config);
    const v = { v: o.priceVersions.length + 1, value: round2(value), label, payments: pay, pkgId: o.pkgId, pkgName: o.pkgName, depositPct: s.config.depositPct, validUntil: JA.u.endOfMonth(), presentedAt: Date.now(), source: who };
    o.priceVersions.push(v);
    o.chat.push({ from: 'sistema', text: `Orçamento atualizado pela equipe: versão ${v.v}, ${JA.u.brl(v.value)}. O atendimento passa a usar este valor.`, at: Date.now() });
    log(o, who, `Registrou a versão ${v.v} do preço (${JA.u.brl(v.value)}) e apresentou ao cliente.`);
    if (o.status === 'avaliacao') o.status = 'atendimento';
    store.commit();
  };

  store.setStatus = function (code, status, who, note) {
    const o = store.state.orders[code];
    if (!o) return;
    const prev = o.status;
    o.status = status;
    const lbl = (id) => (JA.STATUSES.find((x) => x.id === id) || {}).label;
    log(o, who || 'Jéssica', note || `Situação: ${lbl(prev)} → ${lbl(status)}.`);
    store.commit();
  };

  store.currentPrice = function (o) { return o.priceVersions[o.priceVersions.length - 1] || null; };

  store.confirmDeposit = function (code) {
    const o = store.state.orders[code];
    const pv = store.currentPrice(o);
    o.deposit = { status: 'confirmado', amount: pv ? pv.payments.deposit : null, at: Date.now() };
    o.status = 'fechado';
    o.chat.push({ from: 'sistema', text: `Sinal de ${JA.u.brl(o.deposit.amount)} confirmado. Reserva confirmada para ${JA.u.dateBR(o.draft.route.date)}.`, at: Date.now() });
    log(o, 'Jéssica', `Sinal confirmado (${JA.u.brl(o.deposit.amount)}, simulado). Data reservada: ${JA.u.dateBR(o.draft.route.date)}. Pedido fechado.`);
    store.commit();
  };

  /* ---------- Distribuição aos parceiros ---------- */
  store.eligible = function (o) {
    const s = store.state;
    const wd = JA.u.weekday(o.draft.route.date);
    const tried = o.partner.attempts.map((a) => a.partnerId);
    return s.partners
      .filter((p) => p.active && p.training === 'aprovado')
      .filter((p) => o.region && p.regions.includes(o.region))
      .filter((p) => wd == null || p.weekdays.includes(wd))
      .filter((p) => !tried.includes(p.id))
      .sort((a, b) => a.priority - b.priority);
  };
  store.eligibilityReport = function (o) {
    const wd = JA.u.weekday(o.draft.route.date);
    return store.state.partners.slice().sort((a, b) => a.priority - b.priority).map((p) => {
      const why = [];
      if (!p.active) why.push('inativo');
      if (p.training !== 'aprovado') why.push('treinamento não aprovado');
      if (!o.region || !p.regions.includes(o.region)) why.push(`não atende ${o.region || 'região indefinida'}`);
      if (wd != null && !p.weekdays.includes(wd)) why.push('sem disponibilidade no dia');
      const att = o.partner.attempts.find((a) => a.partnerId === p.id);
      return { p, ok: why.length === 0, why, attempt: att };
    });
  };

  function offerNext(o, who) {
    const next = store.eligible(o)[0];
    if (!next) {
      o.partner.needsDecision = true;
      o.status = 'fechado';
      log(o, 'Sistema', 'Nenhum parceiro elegível disponível. Caso enviado para decisão da Jéssica.');
      return null;
    }
    o.partner.attempts.push({ partnerId: next.id, status: 'oferecido', at: Date.now() });
    o.partner.needsDecision = false;
    o.status = 'oferecido';
    log(o, who || 'Sistema', `Serviço oferecido a ${next.name} (prioridade ${next.priority}, ${o.region}).`);
    return next;
  }

  store.dispatch = function (code) {
    const o = store.state.orders[code];
    log(o, 'Jéssica', 'Encaminhou a mudança para distribuição aos parceiros.');
    offerNext(o);
    store.commit();
  };

  store.activeOffer = function (o) {
    return o.partner.attempts.find((a) => a.status === 'oferecido') || null;
  };

  store.partnerRespond = function (code, partnerId, response, who) {
    const s = store.state, o = s.orders[code];
    const att = o.partner.attempts.find((a) => a.partnerId === partnerId && a.status === 'oferecido');
    if (!att) return;
    const p = s.partners.find((x) => x.id === partnerId);
    att.status = response; att.respondedAt = Date.now();
    if (response === 'aceito') {
      o.partner.assigned = partnerId;
      o.partner.progress = [{ step: 'aceito', at: Date.now() }];
      o.status = 'confirmado';
      log(o, who || p.name, `${p.name} aceitou o serviço.`);
    } else {
      log(o, who || p.name, `${p.name} ${response === 'indisponivel' ? 'está indisponível' : 'recusou o serviço'}. Seguindo para o próximo parceiro.`);
      offerNext(o);
    }
    store.commit();
  };

  store.assignManual = function (code, partnerId) {
    const s = store.state, o = s.orders[code];
    const p = s.partners.find((x) => x.id === partnerId);
    const open = store.activeOffer(o);
    if (open) { open.status = 'cancelado'; }
    o.partner.attempts.push({ partnerId, status: 'oferecido', at: Date.now(), manual: true });
    o.partner.needsDecision = false;
    o.status = 'oferecido';
    log(o, 'Jéssica', `Interveio e ofereceu o serviço diretamente a ${p.name}.`);
    store.commit();
  };

  store.updateProgress = function (code, step, who) {
    const o = store.state.orders[code];
    if (o.partner.progress.some((x) => x.step === step)) return;
    o.partner.progress.push({ step, at: Date.now() });
    const lbl = JA.PROGRESS_STEPS.find((x) => x.id === step).label;
    log(o, who, `Andamento: ${lbl}.`);
    if (step === 'concluido') { o.status = 'concluido'; o.chat.push({ from: 'sistema', text: 'Mudança concluída. Obrigada pela confiança!', at: Date.now() }); }
    store.commit();
  };

  /* ---------- Pedidos fictícios para o painel ---------- */
  function seedOrders(s) {
    const mk = (code, daysAgo, status, from, to, date, rooms, extra) => {
      const d = JA.EMPTY_DRAFT();
      d.route = { from, to, date, type: extra.type || 'local', distanceKm: extra.km || '' };
      d.rooms = rooms.map(([name, items]) => ({ name, items: items.map(([n, q, mode]) => ({ name: n, qty: q, mode: mode || 'levar' })) }));
      d.access = { origin: { floor: extra.of ?? 2, elevator: extra.oe || 'social', bigFits: 'sim' }, dest: { floor: extra.df ?? 0, elevator: extra.de || 'casa', bigFits: 'sim' } };
      d.boxes = { unknown: false, qty: extra.boxes || 30 };
      d.contact = { name: extra.name, phone: '' };
      withIds(d);
      const calc = JA.pricing.compute(d, s.config, s.costs, s.config.previewMarkup);
      const created = Date.now() - daysAgo * 86400000;
      const o = {
        code, createdAt: created, status, region: regionOf(from) || regionOf(to), draft: d,
        pkgId: 'prestige', pkgName: 'JA Prestige', priceVersions: [], chat: [], history: [],
        deposit: { status: ['fechado', 'oferecido', 'confirmado', 'concluido'].includes(status) ? 'confirmado' : 'pendente', amount: null, at: null },
        partner: { attempts: [], assigned: null, progress: [], needsDecision: false },
        humanTakeover: false, unknownCount: 0, internal: { markup: 100, boxes: d.boxes.qty },
        evaluation: status === 'avaliacao', reasons: calc.reasons, seed: true,
      };
      if (calc.ok) {
        const pay = JA.pricing.payments(calc.price, s.config);
        o.priceVersions.push({ v: 1, value: calc.price, label: 'Estimativa online', payments: pay, pkgId: 'prestige', pkgName: 'JA Prestige', depositPct: 60, validUntil: JA.u.endOfMonth(), presentedAt: created, source: 'Site (cliente)' });
        if (o.deposit.status === 'confirmado') o.deposit.amount = pay.deposit;
      }
      o.history.push({ at: created, who: 'Sistema', text: 'Pedido criado pelo site (exemplo fictício).' });
      o.chat.push({ from: 'cliente', text: `Olá! Fiz o orçamento ${code} pelo site.`, at: created });
      if (extra.partner) {
        o.partner.attempts.push({ partnerId: extra.partner, status: 'aceito', at: created });
        o.partner.assigned = extra.partner;
        o.partner.progress = JA.PROGRESS_STEPS.map((p) => ({ step: p.id, at: created }));
      }
      s.orders[code] = o; s.orderList.push(code);
    };
    mk('JA-2611-3307', 1, 'atendimento', 'Pinheiros, São Paulo', 'Perdizes, São Paulo', '2027-01-09',
      [['Quarto', [['Cama de solteiro', 1], ['Guarda-roupa', 1], ['Roupas', 1]]], ['Sala', [['Sofá', 1], ['TV', 1], ['Estante', 1]]]],
      { name: 'Camila R. (fictícia)', boxes: 25, of: 4, oe: 'social', df: 2, de: 'social' });
    mk('JA-2611-5120', 2, 'avaliacao', 'Moema, São Paulo', 'Campinas', '2027-02-06',
      [['Quarto do casal', [['Cama king (box + cabeceira)', 1], ['Guarda-roupa', 2]]], ['Sala', [['Sofá', 2], ['Mesa de jantar', 1], ['Cadeiras de jantar', 6]]]],
      { name: 'Paulo e Ana (fictícios)', boxes: 95, type: 'viagem', km: 95, of: 12, oe: 'servico', df: 0, de: 'casa' });
    mk('JA-2611-2284', 3, 'sinal', 'Tatuapé, São Paulo', 'Mooca, São Paulo', '2026-12-19',
      [['Quarto do casal', [['Cama de casal', 1], ['Cômoda', 1]]], ['Cozinha', [['Geladeira', 1], ['Micro-ondas', 1]]]],
      { name: 'Juliana M. (fictícia)', boxes: 40, of: 1, oe: 'escada', df: 3, de: 'social' });
    mk('JA-2611-1876', 0, 'novo', 'Santana, São Paulo', 'Tucuruvi, São Paulo', '2027-01-23',
      [['Escritório', [['Escrivaninha', 3], ['Cadeira de escritório', 6], ['Arquivo', 2]]]],
      { name: 'Escritório Contábil (fictício)', boxes: 50, of: 1, oe: 'social', df: 5, de: 'social' });
    mk('JA-2610-9031', 24, 'concluido', 'Vila Mariana, São Paulo', 'Saúde, São Paulo', '2026-11-07',
      [['Quarto', [['Cama de solteiro', 2], ['Guarda-roupa', 1]]], ['Sala', [['Sofá', 1], ['Rack', 1]]]],
      { name: 'Rafael T. (fictício)', boxes: 35, of: 6, oe: 'social', df: 2, de: 'social', partner: 'p1' });
  }

  store.regionOf = regionOf;
  JA.store = store;
})();
