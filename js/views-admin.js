/* Painel da Jéssica: pedidos, detalhe, simulação interna, distribuição e cadastros. */
(function () {
  const JA = window.JA;
  const { esc, brl, dateBR, nowLabel, round2 } = JA.u;
  const store = JA.store;
  const statusOf = (id) => JA.STATUSES.find((s) => s.id === id) || { label: id, tone: 'gray' };
  const pill = (id) => { const st = statusOf(id); return `<span class="pill ${st.tone}">${st.label}</span>`; };
  const partnerName = (id) => (store.state.partners.find((p) => p.id === id) || {}).name || '—';
  JA.statusPill = pill;
  const short = (t) => String(t || '').replace(/\s*\(endereço omitido\)/, '').replace(/, São Paulo$/, '');

  function head(active) {
    const s = store.state;
    return `<header class="app-head"><div class="wrap">
        <div><h1>Painel da Jéssica</h1><div class="sub">Gestão de orçamentos · demonstração sem login</div></div>
        <a class="btn btn-ghost btn-sm" style="color:#fff;border-color:rgba(255,255,255,.35)" href="#/">Ver site</a>
      </div></header>
      <nav class="app-tabs" aria-label="Seções do painel"><div class="wrap row" style="gap:0;flex-wrap:nowrap">
        <a href="#/painel" ${active === 'pedidos' ? 'aria-current="page"' : ''}>Pedidos</a>
        <a href="#/painel/config" ${active === 'config' ? 'aria-current="page"' : ''}>Regras, pacotes e parceiros</a>
      </div></nav>
      ${s.costs.fictional ? '<div class="wrap" style="margin-top:12px"><div class="notice sim small">Modo público: custos e resultados internos usam <b>dados fictícios</b>. Os valores reais ficam em um arquivo local que não é publicado.</div></div>' : ''}`;
  }

  /* ---------- Lista ---------- */
  JA.views.panel = function () {
    const s = store.state;
    const q = JA.u.norm(s.ui.search);
    const all = s.orderList.map((c) => s.orders[c]).filter(Boolean);
    const counts = {}; all.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    const decisions = all.filter((o) => o.partner.needsDecision).length;
    const list = all.filter((o) => {
      if (s.ui.filter === 'decisao' && !o.partner.needsDecision) return false;
      if (s.ui.filter !== 'todos' && s.ui.filter !== 'decisao' && o.status !== s.ui.filter) return false;
      if (!q) return true;
      return JA.u.norm([o.code, o.draft.contact.name, o.draft.route.from, o.draft.route.to, o.region, o.pkgName].join(' ')).includes(q);
    });
    const f = (id, label, n) => `<button type="button" data-act="setFilter" data-f="${id}" aria-pressed="${s.ui.filter === id}">${label}<span class="n">${n}</span></button>`;
    const html = `${head('pedidos')}
      <main class="panel"><div class="wrap">
        <div class="row between" style="margin-bottom:10px"><h2 style="margin:0">Orçamentos</h2><span class="small muted">${all.length} pedidos</span></div>
        <label class="sr-only" for="p-search">Buscar pedidos</label>
        <input class="input" id="p-search" type="search" placeholder="Buscar por código, cliente, bairro ou região" data-bind="ui.search" data-rerender value="${esc(s.ui.search)}">
        <div class="filters" role="group" aria-label="Filtrar por situação" style="margin-top:10px">
          ${f('todos', 'Todos', all.length)}
          ${decisions ? f('decisao', '⚠ Decisão da Jéssica', decisions) : ''}
          ${JA.STATUSES.map((st) => f(st.id, st.label, counts[st.id] || 0)).join('')}
        </div>
        <div class="order-list">
          ${list.length ? list.map((o) => {
            const pv = store.currentPrice(o);
            const pid = o.partner.assigned || (store.activeOffer(o) || {}).partnerId;
            return `<a class="order-card ${o.code === s.currentOrder ? 'current' : ''}" href="#/painel/pedido/${o.code}">
              <div class="row between"><span class="mono">${esc(o.code)}</span>${pill(o.status)}</div>
              <div><b>${esc(o.draft.contact.name || 'Cliente sem nome')}</b>${o.code === s.currentOrder ? ' <span class="pill gold">Pedido da apresentação</span>' : ''}${o.partner.needsDecision ? ' <span class="pill red">Decisão da Jéssica</span>' : ''}</div>
              <div class="small muted">${esc(short(o.draft.route.from))} → ${esc(short(o.draft.route.to))} · ${dateBR(o.draft.route.date)} · ${esc(o.region || 'região a definir')}</div>
              <div class="row between small"><span>${esc(o.pkgName)} · <b>${pv ? brl(pv.value) : 'avaliação'}</b></span><span class="muted">${pid ? 'Parceiro: ' + esc(partnerName(pid)) : ''}</span></div>
            </a>`;
          }).join('') : '<p class="muted">Nenhum pedido encontrado.</p>'}
        </div>
      </div></main>`;
    return { html, title: 'Painel' };
  };

  /* ---------- Simulação interna ---------- */
  function simFor(o, s) {
    const m = Number(o.internal.markup);
    const calc = JA.pricing.compute(o.draft, s.config, s.costs, m);
    const c = s.costs;
    let helpers = calc.comp.helpers, packers = calc.comp.packers, truckCost = calc.comp.truckCost;
    if (o.draft.demoCase) { helpers = JA.REFERENCE_INTERNAL.helpers; packers = JA.REFERENCE_INTERNAL.packers; truckCost = c.truckSmall; }
    const extra = calc.comp.travelCost + calc.comp.extraBoxesCost;
    const subtotal = truckCost + helpers * c.helper + packers * c.packer + extra;
    const marked = round2(subtotal * (1 + m / 100));
    const boxes = o.internal.boxes;
    const materials = boxes === '' || boxes == null ? null : round2(Number(boxes) * c.boxMaterial * (s.config.materialsMarkup ? 1 + m / 100 : 1));
    const total = round2(marked + (materials || 0));
    return { m, helpers, packers, truckCost, extra, subtotal, marked, materials, total, reasons: calc.reasons };
  }

  function priceTab(o, s) {
    const sim = simFor(o, s);
    const pv = store.currentPrice(o);
    const c = s.costs;
    const hist = o.draft.demoCase ? JA.REFERENCE_PRICE : pv && pv.value;
    const toMatch = hist && sim.marked < hist && c.boxMaterial ? (hist - sim.marked) / c.boxMaterial : null;
    return `<div class="card stack">
      <div class="row between"><h3 style="margin:0">Simulação interna do preço</h3><span class="pill ${c.fictional ? 'amber' : 'green'}">${esc(c.label)}</span></div>
      <p class="small muted" style="margin:0">Custo de caminhão, equipe e materiais com o acréscimo escolhido. Os percentuais são opções de simulação; a ligação automática com porte ou complexidade será definida com a Jéssica.</p>
      <div class="filters" role="group" aria-label="Acréscimo sobre o custo">
        ${s.config.markupOptions.map((p) => `<button type="button" data-act="setMarkup" data-code="${o.code}" data-m="${p}" aria-pressed="${sim.m === p}">+${p}%${p === s.config.previewMarkup ? ' (prévia)' : ''}</button>`).join('')}
      </div>
      <table class="sim-table"><tbody>
        <tr><td>Caminhão</td><td>${brl(sim.truckCost)}</td></tr>
        <tr><td>${sim.helpers} ajudantes × ${brl(c.helper)}</td><td>${brl(sim.helpers * c.helper)}</td></tr>
        <tr><td>${sim.packers} embalador${sim.packers === 1 ? '' : 'es'} × ${brl(c.packer)}</td><td>${brl(sim.packers * c.packer)}</td></tr>
        ${sim.extra ? `<tr><td>Viagem e caixas extras</td><td>${brl(sim.extra)}</td></tr>` : ''}
        <tr><td><b>Subtotal caminhão e equipe</b></td><td>${brl(sim.subtotal)}</td></tr>
        <tr><td>Com acréscimo de ${sim.m}% (custo × ${(1 + sim.m / 100).toFixed(1).replace('.', ',')})</td><td>${brl(sim.marked)}</td></tr>
        <tr><td><label for="sim-boxes">Materiais: ${brl(c.boxMaterial)} por caixa utilizada</label>
          <div class="row" style="margin-top:6px"><input class="input" style="max-width:120px;min-height:40px" type="number" min="0" inputmode="numeric" id="sim-boxes" data-type="number" data-bind="orders.${o.code}.internal.boxes" data-rerender value="${esc(o.internal.boxes)}" placeholder="qtd."><span class="small muted">${o.internal.boxes === '' ? 'quantidade real ainda não informada' : 'caixas'}</span></div></td>
          <td>${sim.materials == null ? '—' : brl(sim.materials)}</td></tr>
        <tr class="total"><td><b>Total simulado</b>${sim.materials == null ? '<div class="small muted">antes dos materiais</div>' : ''}</td><td>${brl(sim.total)}</td></tr>
      </tbody></table>
      ${sim.reasons.length ? `<div class="notice warn small"><b>Parâmetros pendentes (avaliação manual):</b><ul style="margin:6px 0 0;padding-left:18px">${sim.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
      ${hist ? `<div class="card-soft stack small">
        <div class="row between"><span>${o.draft.demoCase ? 'Orçamento histórico (referência)' : 'Preço apresentado ao cliente'}</span><b>${brl(hist)}</b></div>
        <div class="row between"><span>Diferença para o subtotal de caminhão e equipe</span><b>${brl(hist - sim.subtotal)}</b></div>
        <p class="muted" style="margin:0">Antes de descontar materiais e despesas administrativas.</p>
        ${toMatch && Number.isInteger(round2(toMatch)) ? `<p class="muted" style="margin:0">Com +${sim.m}%, ${round2(toMatch)} caixas de material igualariam o valor de ${brl(hist)}.</p>` : ''}
      </div>` : ''}
      <button type="button" class="btn btn-ghost" data-act="registerPrice" data-code="${o.code}">Registrar ${brl(sim.total)} como nova versão para o cliente</button>
      <p class="hint" style="margin:0">Registrar cria uma nova versão do preço, avisa na conversa e passa a ser a fonte do atendimento. A versão anterior fica no histórico.</p>
    </div>`;
  }

  function actionsCard(o, s) {
    const pv = store.currentPrice(o);
    const offer = store.activeOffer(o);
    const parts = [];
    if (o.partner.needsDecision) {
      parts.push(`<div class="notice danger"><b>Decisão da Jéssica:</b> nenhum parceiro elegível para ${esc(o.region || 'a região')} em ${dateBR(o.draft.route.date)}. Escolha um parceiro abaixo ou ajuste os cadastros.</div>`);
    }
    if (['novo', 'atendimento', 'avaliacao'].includes(o.status)) {
      if (!pv) parts.push(`<div class="notice warn small">Pedido sem preço: use a aba <b>Preço interno</b> para registrar uma versão após a avaliação.</div>`);
      else parts.push(`<button class="btn btn-ghost" data-act="markSinal" data-code="${o.code}">Marcar como aguardando sinal</button>`);
    }
    if (['novo', 'atendimento', 'avaliacao', 'sinal'].includes(o.status) && pv) {
      parts.push(`<button class="btn btn-gold" data-act="confirmDeposit" data-code="${o.code}">Simular sinal confirmado (${brl(pv.payments.deposit)})</button>`);
    }
    if (o.status === 'fechado' && !offer && !o.partner.assigned) {
      parts.push(`<button class="btn btn-navy" data-act="dispatch" data-code="${o.code}">${o.partner.attempts.length ? 'Tentar distribuição novamente' : 'Encaminhar a mudança aos parceiros'}</button>`);
    }
    if (offer) {
      const p = s.partners.find((x) => x.id === offer.partnerId);
      parts.push(`<div class="card-soft small"><b>Oferecido a ${esc(p.name)}</b> · prioridade ${p.priority} · desde ${nowLabel(offer.at)}<br><span class="muted">Um parceiro por vez. Se recusar ou não estiver disponível, o sistema segue para o próximo.</span></div>
        <div class="grid grid-2">
          <button class="btn btn-ghost btn-sm" data-act="simPartner" data-code="${o.code}" data-pid="${p.id}" data-r="indisponivel">Simular: ${esc(p.name.split(' ')[0])} indisponível</button>
          <button class="btn btn-ghost btn-sm" data-act="simPartner" data-code="${o.code}" data-pid="${p.id}" data-r="aceito">Simular: ${esc(p.name.split(' ')[0])} aceitou</button>
        </div>
        <a class="btn btn-navy btn-sm" href="#/parceiro/servico/${o.code}" data-act="openPartner" data-pid="${p.id}" data-code="${o.code}">Abrir como ${esc(p.name)}</a>`);
    }
    if (o.partner.assigned) {
      const p = s.partners.find((x) => x.id === o.partner.assigned);
      const last = o.partner.progress[o.partner.progress.length - 1];
      parts.push(`<div class="notice ok small"><b>${esc(p.name)}</b> confirmou o serviço. Andamento: ${esc((JA.PROGRESS_STEPS.find((x) => x.id === (last || {}).step) || {}).label || '—')}.</div>
        <a class="btn btn-navy btn-sm" href="#/parceiro/servico/${o.code}" data-act="openPartner" data-pid="${p.id}" data-code="${o.code}">Abrir área do parceiro</a>`);
    }
    if (['fechado', 'oferecido'].includes(o.status) || o.partner.needsDecision) {
      const opts = s.partners.filter((p) => p.active).map((p) => `<option value="${p.id}">${esc(p.name)}${p.training !== 'aprovado' ? ' (treinamento pendente)' : ''}</option>`).join('');
      parts.push(`<div class="add-row"><label class="sr-only" for="manual-p">Oferecer diretamente a</label>
        <select class="input" id="manual-p">${opts}</select>
        <button class="btn btn-ghost btn-sm" data-act="assignManual" data-code="${o.code}">Intervir</button></div>`);
    }
    if (!parts.length) parts.push('<p class="small muted" style="margin:0">Sem ações pendentes.</p>');
    return `<div class="card actions-card"><h3 style="margin:0">Próximo passo</h3>${parts.join('')}</div>`;
  }

  function resumoTab(o, s) {
    const d = o.draft, pv = store.currentPrice(o);
    return `<div class="card stack">
      <dl class="kv">
        <dt>Cliente</dt><dd>${esc(d.contact.name || '—')}</dd>
        <dt>Trajeto</dt><dd>${esc(short(d.route.from))} → ${esc(short(d.route.to))}</dd>
        <dt>Região</dt><dd>${esc(o.region || 'a definir')}</dd>
        <dt>Data</dt><dd>${dateBR(d.route.date)} ${o.deposit.status === 'confirmado' ? '<span class="pill green">confirmada</span>' : '<span class="pill amber">solicitada</span>'}</dd>
        <dt>Tipo</dt><dd>${d.route.type === 'viagem' ? `Viagem${d.route.distanceKm ? ` · ${d.route.distanceKm} km` : ''}` : 'Local'}</dd>
        <dt>Origem</dt><dd>${esc(JA.accessText(d.access.origin))}</dd>
        <dt>Destino</dt><dd>${esc(JA.accessText(d.access.dest))}</dd>
        <dt>Serviços</dt><dd>${JA.PACK_LABEL[d.services.packing]}; ${[d.services.disassembly && 'desmontagem', d.services.assembly && 'montagem'].filter(Boolean).join(' e ') || 'sem montagem'}</dd>
        <dt>Pacote</dt><dd>${esc(o.pkgName)}</dd>
        <dt>Orçamento</dt><dd>${pv ? `${brl(pv.value)} · ${esc(pv.label)} · versão ${pv.v}` : 'aguardando avaliação'}</dd>
        <dt>Sinal</dt><dd>${o.deposit.status === 'confirmado' ? `<span class="pill green">Confirmado</span> ${brl(o.deposit.amount)}` : `<span class="pill amber">Pendente</span> ${pv ? `${pv.depositPct}% = ${brl(pv.payments.deposit)}` : ''}`}</dd>
        <dt>Parceiro</dt><dd>${o.partner.assigned ? esc(partnerName(o.partner.assigned)) : store.activeOffer(o) ? `oferecido a ${esc(partnerName(store.activeOffer(o).partnerId))}` : '—'}</dd>
      </dl>
      ${JA.highlights(d).length ? `<div class="stack">${JA.highlights(d).map((h) => `<div class="instr flag small">⚠️ ${esc(h)}</div>`).join('')}</div>` : ''}
      ${o.reasons && o.reasons.length ? `<div class="notice warn small"><b>Motivos de avaliação:</b> ${o.reasons.map(esc).join(' ')}</div>` : ''}
      ${pv ? `<div class="card-soft small"><b>Versões do preço apresentadas ao cliente</b>
        <ul style="margin:6px 0 0;padding-left:18px">${o.priceVersions.map((v) => `<li>v${v.v}: ${brl(v.value)} · ${esc(v.label)} · ${esc(v.source)} · ${nowLabel(v.presentedAt)}</li>`).join('')}</ul>
        <p class="muted" style="margin:6px 0 0">O atendimento usa sempre a última versão apresentada (v${pv.v}).</p></div>` : ''}
    </div>`;
  }

  function chatTab(o) {
    return `<div class="card stack">
      <div class="row between"><h3 style="margin:0">Conversa</h3>
        ${o.humanTakeover ? `<button class="btn btn-ghost btn-sm" data-act="toggleTakeover" data-code="${o.code}">Devolver para a IA</button>` : `<button class="btn btn-ghost btn-sm" data-act="toggleTakeover" data-code="${o.code}">Assumir conversa</button>`}</div>
      <p class="small muted" style="margin:0">${o.humanTakeover ? 'Atendimento humano: a IA não responde até você devolver.' : 'A IA responde com base no pedido e na versão do preço registrada.'}</p>
      <div class="chat-log" style="background:#efeae2;border-radius:12px;max-height:420px">${o.chat.length ? o.chat.map(JA.msgHtml).join('') : '<p class="small muted">Sem mensagens.</p>'}</div>
      <form class="add-row" data-submit="teamReply" data-code="${o.code}">
        <label class="sr-only" for="team-msg">Responder como equipe</label>
        <input class="input" id="team-msg" name="text" placeholder="Responder como Jéssica…" autocomplete="off">
        <button class="btn btn-navy btn-sm" type="submit">Enviar</button>
      </form>
    </div>`;
  }

  function partnerTab(o) {
    const rep = store.eligibilityReport(o);
    const statusTxt = { oferecido: ['violet', 'Oferecido'], aceito: ['green', 'Aceitou'], recusado: ['red', 'Recusou'], indisponivel: ['red', 'Indisponível'], cancelado: ['gray', 'Cancelado'] };
    return `<div class="card stack">
      <h3 style="margin:0">Distribuição</h3>
      <p class="small muted" style="margin:0">Elegível = ativo, treinamento aprovado, atende a região (${esc(o.region || 'indefinida')}) e tem disponibilidade no dia. Ordem pela prioridade configurada.</p>
      ${rep.map(({ p, ok, why, attempt }) => `<div class="partner-row ${ok || attempt ? '' : 'off'}">
        <div class="row between"><b>${p.priority}. ${esc(p.name)}</b>${attempt ? `<span class="pill ${statusTxt[attempt.status][0]}">${statusTxt[attempt.status][1]}</span>` : ok ? '<span class="pill blue">Elegível</span>' : '<span class="pill gray">Não elegível</span>'}</div>
        <div class="small muted">${esc(p.regions.join(', '))} · ${p.training === 'aprovado' ? '✓ treinamento aprovado' : '⏳ em treinamento'}</div>
        ${why.length && !attempt ? `<div class="small" style="color:var(--red)">${esc(why.join('; '))}</div>` : ''}
      </div>`).join('')}
    </div>`;
  }

  function historyTab(o) {
    return `<div class="card"><h3>Histórico de decisões</h3><ol class="timeline">${o.history.slice().reverse().map((h) => `<li><div><div>${esc(h.text)}</div><div class="meta">${esc(h.who)} · ${nowLabel(h.at)}</div></div></li>`).join('')}</ol></div>`;
  }

  JA.views.panelOrder = function (code) {
    const s = store.state;
    const o = s.orders[code];
    if (!o) return { html: `${head('pedidos')}<main class="panel"><div class="wrap"><p>Pedido não encontrado.</p><a href="#/painel">Voltar</a></div></main>` };
    const tabs = [['resumo', 'Resumo'], ['inventario', 'Inventário'], ['conversa', 'Conversa'], ['preco', 'Preço interno'], ['parceiro', 'Parceiros'], ['historico', 'Histórico']];
    const tab = s.ui.tab || 'resumo';
    const body = tab === 'inventario' ? `<div class="card">${JA.invLines(o.draft)}<p class="small">Caixas: <b>${o.draft.boxes.unknown || o.draft.boxes.qty === '' ? 'cliente ainda não sabe' : o.draft.boxes.qty}</b></p>${o.draft.services.notes ? `<p class="small">Observações: ${esc(o.draft.services.notes)}</p>` : ''}</div>`
      : tab === 'conversa' ? chatTab(o)
      : tab === 'preco' ? priceTab(o, s)
      : tab === 'parceiro' ? partnerTab(o)
      : tab === 'historico' ? historyTab(o)
      : resumoTab(o, s);
    const html = `${head('pedidos')}
      <main class="panel"><div class="wrap">
        <a href="#/painel" class="small">← Todos os pedidos</a>
        <div class="row between" style="margin:8px 0 12px">
          <div><h2 style="margin:0" class="mono">${esc(o.code)}</h2>
          <div class="small muted">${esc(o.draft.contact.name || '')} · criado ${nowLabel(o.createdAt)}</div></div>
          <div class="row">${pill(o.status)}${o.code === s.currentOrder ? '<span class="pill gold">Pedido da apresentação</span>' : ''}</div>
        </div>
        <div class="detail-grid">
          <div>
            <div class="app-tabs" role="tablist" aria-label="Detalhes do pedido" style="border-radius:12px 12px 0 0;margin-bottom:12px">
              ${tabs.map(([id, l]) => `<button type="button" role="tab" aria-selected="${tab === id}" data-act="setTab" data-tab="${id}">${l}</button>`).join('')}
            </div>
            ${body}
          </div>
          <div>${actionsCard(o, s)}</div>
        </div>
      </div></main>`;
    return { html, title: `Pedido ${code}` };
  };

  /* ---------- Configurações ---------- */
  function num(label, bind, value, hint, id) {
    return `<label class="field" for="${id}"><span>${label}</span><input class="input" type="number" step="any" inputmode="decimal" id="${id}" data-type="number" data-bind="${bind}" data-rerender value="${esc(value == null ? '' : value)}">${hint ? `<span class="hint">${hint}</span>` : ''}</label>`;
  }

  function rulesTab(s) {
    const c = s.config, k = s.costs;
    return `<div class="stack">
      <div class="card stack"><h3 style="margin:0">Preço e pagamento</h3>
        <label class="field" for="c-mk"><span>Acréscimo usado na prévia do site</span>
          <select class="input" id="c-mk" data-type="number" data-bind="config.previewMarkup">${c.markupOptions.map((p) => `<option value="${p}" ${c.previewMarkup === p ? 'selected' : ''}>+${p}% (custo × ${(1 + p / 100).toFixed(1).replace('.', ',')})</option>`).join('')}</select>
          <span class="hint">Vale para novas estimativas. Preços já apresentados não mudam: ficam registrados na versão do pedido.</span></label>
        <div class="form-grid two">
          ${num('Sinal para reserva (%)', 'config.depositPct', c.depositPct, '', 'c-dep')}
          ${num('Débito 1x (+%)', 'config.payment.debit1x', c.payment.debit1x, '', 'c-d1')}
          ${num('Crédito 1x (+%)', 'config.payment.credit1x', c.payment.credit1x, '', 'c-c1')}
          ${num('Crédito 4x (+%)', 'config.payment.credit4x', c.payment.credit4x, '', 'c-c4')}
        </div></div>
      <div class="card stack"><h3 style="margin:0">Caixas, viagem e acesso</h3>
        <div class="form-grid two">
          ${num('Caixas fornecidas no pacote', 'config.boxes.included', c.boxes.included, '', 'c-bi')}
          ${num('Porte máximo (caixas)', 'config.boxes.porte', c.boxes.porte, '', 'c-bp')}
          ${num('Valor por caixa acima de 80 (R$)', 'config.boxes.extraBoxPrice', c.boxes.extraBoxPrice, 'Em branco: avaliação manual até a Jéssica definir.', 'c-be')}
          ${num('Viagem: custo por km (R$)', 'config.travel.pricePerKm', c.travel.pricePerKm, 'Em branco: viagens vão para avaliação.', 'c-km')}
          ${num('Só escada: andar máximo sem avaliação', 'config.access.maxFloorStairsOnly', c.access.maxFloorStairsOnly, 'Acima disso, exceção de acesso.', 'c-st')}
          ${num('Capacidade do caminhão padrão (pontos)', 'config.capacity.smallTruckPts', c.capacity.smallTruckPts, '', 'c-cap')}
        </div></div>
      <div class="card stack"><div class="row between"><h3 style="margin:0">Custos internos</h3><span class="pill ${k.fictional ? 'amber' : 'green'}">${esc(k.label)}</span></div>
        <div class="form-grid two">
          ${num('Caminhão padrão (R$)', 'costs.truckSmall', k.truckSmall, '', 'k-t')}
          ${num('Caminhão maior (R$)', 'costs.truckLarge', k.truckLarge, 'Em branco: avaliação manual.', 'k-tl')}
          ${num('Ajudante (R$)', 'costs.helper', k.helper, '', 'k-h')}
          ${num('Embalador (R$)', 'costs.packer', k.packer, '', 'k-p')}
          ${num('Material por caixa (R$)', 'costs.boxMaterial', k.boxMaterial, '', 'k-b')}
        </div>
        <label class="check" for="k-mm"><input type="checkbox" id="k-mm" data-bind="config.materialsMarkup" ${c.materialsMarkup ? 'checked' : ''}> Aplicar o acréscimo também sobre materiais</label>
      </div>
    </div>`;
  }

  function packagesTab(s) {
    return `<div class="stack">
      <p class="small muted">O JA Prestige é o único pacote comercial confirmado. Pacotes novos aparecem no site lado a lado para comparação quando ativos.</p>
      ${s.packages.map((p, i) => `<div class="card stack">
        <div class="row between"><h3 style="margin:0">${esc(p.name)}</h3>${p.confirmed ? '<span class="pill gold">Confirmado</span>' : '<span class="pill gray">Rascunho</span>'}</div>
        <div class="form-grid two">
          <label class="field" for="pk-n-${i}"><span>Nome</span><input class="input" id="pk-n-${i}" data-bind="packages.${i}.name" value="${esc(p.name)}"></label>
          <label class="field" for="pk-t-${i}"><span>Descrição curta</span><input class="input" id="pk-t-${i}" data-bind="packages.${i}.tagline" value="${esc(p.tagline)}"></label>
          ${num('Porte (caixas)', `packages.${i}.porteBoxes`, p.porteBoxes, '', `pk-pb-${i}`)}
          ${num('Caixas fornecidas', `packages.${i}.boxesProvided`, p.boxesProvided, '', `pk-bp-${i}`)}
          ${p.id === 'prestige' ? '' : num('Fator de preço sobre a estimativa', `packages.${i}.priceFactor`, p.priceFactor, 'Ex.: 0,8 para um pacote mais simples.', `pk-f-${i}`)}
        </div>
        <label class="field" for="pk-i-${i}"><span>Incluído (um por linha)</span><textarea class="input" id="pk-i-${i}" rows="5" data-lines="packages.${i}.includes">${esc(p.includes.join('\n'))}</textarea></label>
        <label class="field" for="pk-e-${i}"><span>Adicionais (um por linha)</span><textarea class="input" id="pk-e-${i}" rows="2" data-lines="packages.${i}.extras">${esc(p.extras.join('\n'))}</textarea></label>
        <div class="row between"><label class="check" for="pk-a-${i}"><input type="checkbox" id="pk-a-${i}" data-bind="packages.${i}.active" ${p.active ? 'checked' : ''}> Ativo no site</label>
        ${p.confirmed ? '' : `<button class="link-btn small" data-act="removePackage" data-i="${i}">Excluir</button>`}</div>
      </div>`).join('')}
      <button class="btn btn-ghost" data-act="addPackage">+ Cadastrar pacote</button>
    </div>`;
  }

  function partnersTab(s) {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return `<div class="stack">
      <p class="small muted">${s.partners.length} de 10 parceiros da rede inicial. Só parceiros com treinamento aprovado recebem serviços automaticamente.</p>
      ${s.partners.map((p, i) => `<div class="card stack">
        <div class="row between"><h3 style="margin:0">${esc(p.name)}</h3>${p.training === 'aprovado' ? '<span class="pill green">✓ Aprovado pela Jéssica</span>' : '<span class="pill amber">Em treinamento</span>'}</div>
        <div class="form-grid two">
          <label class="field" for="pt-n-${i}"><span>Nome</span><input class="input" id="pt-n-${i}" data-bind="partners.${i}.name" value="${esc(p.name)}"></label>
          <label class="field" for="pt-c-${i}"><span>Contato</span><input class="input" id="pt-c-${i}" data-bind="partners.${i}.contact" value="${esc(p.contact)}"></label>
          ${num('Prioridade (1 = primeiro)', `partners.${i}.priority`, p.priority, '', `pt-p-${i}`)}
          <label class="field" for="pt-t-${i}"><span>Treinamento</span><select class="input" id="pt-t-${i}" data-bind="partners.${i}.training">
            <option value="aprovado" ${p.training === 'aprovado' ? 'selected' : ''}>Aprovado pela Jéssica</option>
            <option value="em_treinamento" ${p.training !== 'aprovado' ? 'selected' : ''}>Em treinamento</option></select></label>
        </div>
        <fieldset class="seg sm"><legend>Regiões atendidas</legend>${JA.REGIONS.map((r) => `<label for="pr-${i}-${r}"><input type="checkbox" id="pr-${i}-${r}" data-act="toggleArr" data-path="partners.${i}.regions" data-v="${esc(r)}" ${p.regions.includes(r) ? 'checked' : ''}><span>${esc(r)}</span></label>`).join('')}</fieldset>
        <fieldset class="seg sm"><legend>Dias disponíveis</legend>${days.map((d, di) => `<label for="pd-${i}-${di}"><input type="checkbox" id="pd-${i}-${di}" data-act="toggleArr" data-path="partners.${i}.weekdays" data-v="${di}" data-num ${p.weekdays.includes(di) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</fieldset>
        <label class="check" for="pt-a-${i}"><input type="checkbox" id="pt-a-${i}" data-bind="partners.${i}.active" ${p.active ? 'checked' : ''}> Ativo</label>
      </div>`).join('')}
      ${s.partners.length < 10 ? '<button class="btn btn-ghost" data-act="addPartner">+ Cadastrar parceiro</button>' : ''}
    </div>`;
  }

  function aiTab(s) {
    const a = s.config.ai;
    return `<div class="card stack">
      <h3 style="margin:0">O que a IA responde</h3>
      <p class="small muted" style="margin:0">Temas desmarcados vão direto para uma pessoa, com o resumo do pedido. A IA sempre usa o preço e as regras registrados no pedido.</p>
      ${JA.AI_TOPICS.map((t) => `<label class="check" for="ai-${t.id}"><input type="checkbox" id="ai-${t.id}" data-bind="config.ai.topics.${t.id}" ${a.topics[t.id] ? 'checked' : ''}> ${esc(t.label)}</label>`).join('')}
      ${num('Passar para uma pessoa após quantas perguntas sem resposta', 'config.ai.handoffAfterUnknown', a.handoffAfterUnknown, '', 'ai-h')}
      <div class="notice info small">Sempre vão para a equipe: pedidos fora das regras, pedidos de desconto (enquanto desmarcado) e quando o cliente pede uma pessoa. A reserva só é confirmada com disponibilidade e sinal confirmados.</div>
    </div>`;
  }

  JA.views.panelConfig = function () {
    const s = store.state;
    const t = s.ui.adminTab || 'regras';
    const tabs = [['regras', 'Regras'], ['pacotes', 'Pacotes'], ['parceiros', 'Parceiros'], ['ia', 'Atendimento IA']];
    const html = `${head('config')}
      <main class="panel"><div class="wrap flow-narrow" style="margin:0 auto">
        <div class="app-tabs" role="tablist" style="border-radius:12px;margin-bottom:14px">${tabs.map(([id, l]) => `<button type="button" role="tab" aria-selected="${t === id}" data-act="setAdminTab" data-tab="${id}">${l}</button>`).join('')}</div>
        ${t === 'pacotes' ? packagesTab(s) : t === 'parceiros' ? partnersTab(s) : t === 'ia' ? aiTab(s) : rulesTab(s)}
        <p class="hint" style="margin-top:14px">Alterações salvas automaticamente neste navegador.</p>
      </div></main>`;
    return { html, title: 'Regras e cadastros' };
  };

  /* ---------- Ações ---------- */
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-lines]');
    if (!el) return;
    const keys = el.dataset.lines.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => o[k], store.state);
    target[last] = el.value.split('\n').map((x) => x.trim()).filter(Boolean);
    store.commit(false);
    JA.toast('Pacote atualizado.');
  });

  Object.assign(JA.actions, {
    setFilter(el) { store.state.ui.filter = el.dataset.f; store.commit(); },
    setTab(el) { store.state.ui.tab = el.dataset.tab; store.commit(); },
    setAdminTab(el) { store.state.ui.adminTab = el.dataset.tab; store.commit(); },
    setMarkup(el) { store.state.orders[el.dataset.code].internal.markup = Number(el.dataset.m); store.commit(); },
    markSinal(el) { store.setStatus(el.dataset.code, 'sinal', 'Jéssica'); },
    confirmDeposit(el) { store.confirmDeposit(el.dataset.code); JA.toast('Sinal confirmado (simulado). Pedido fechado.'); },
    dispatch(el) { store.dispatch(el.dataset.code); const o = store.state.orders[el.dataset.code]; JA.toast(o.partner.needsDecision ? 'Sem parceiro elegível: decisão da Jéssica.' : `Oferecido a ${partnerName(store.activeOffer(o).partnerId)}.`); },
    simPartner(el) {
      store.partnerRespond(el.dataset.code, el.dataset.pid, el.dataset.r, `${partnerName(el.dataset.pid)} (simulado no painel)`);
      const o = store.state.orders[el.dataset.code];
      const next = store.activeOffer(o);
      JA.toast(el.dataset.r === 'aceito' ? 'Parceiro confirmado.' : next ? `Seguindo para ${partnerName(next.partnerId)}.` : 'Sem próximo parceiro: decisão da Jéssica.');
    },
    assignManual(el) { const pid = document.getElementById('manual-p').value; store.assignManual(el.dataset.code, pid); },
    openPartner(el) { store.state.ui.partnerId = el.dataset.pid; store.save(); JA.go(`#/parceiro/servico/${el.dataset.code}`); },
    toggleTakeover(el) {
      const o = store.state.orders[el.dataset.code];
      o.humanTakeover = !o.humanTakeover;
      if (!o.humanTakeover) o.unknownCount = 0;
      store.log(o, 'Jéssica', o.humanTakeover ? 'Assumiu a conversa.' : 'Devolveu a conversa para a IA.');
      o.chat.push({ from: 'sistema', text: o.humanTakeover ? 'A Jéssica entrou na conversa.' : 'A assistente virtual voltou a responder.', at: Date.now() });
      store.commit();
    },
    teamReply(form) {
      const o = store.state.orders[form.dataset.code];
      const v = form.text.value.trim();
      if (!v) return;
      o.chat.push({ from: 'equipe', text: v, at: Date.now() });
      if (!o.humanTakeover) { o.humanTakeover = true; store.log(o, 'Jéssica', 'Assumiu a conversa ao responder.'); }
      store.commit();
      const i = document.getElementById('team-msg'); if (i) i.focus();
    },
    registerPrice(el) {
      const o = store.state.orders[el.dataset.code];
      const sim = simFor(o, store.state);
      if (!confirm(`Registrar ${brl(sim.total)} como versão ${o.priceVersions.length + 1} do preço e apresentar ao cliente?`)) return;
      store.addPriceVersion(o.code, sim.total, 'Orçamento revisado pela equipe', 'Jéssica');
      JA.toast('Nova versão do preço registrada.');
    },
    toggleArr(el) {
      const keys = el.dataset.path.split('.');
      const arr = keys.reduce((o, k) => o[k], store.state);
      const v = el.dataset.num != null ? Number(el.dataset.v) : el.dataset.v;
      const idx = arr.indexOf(v);
      if (el.checked && idx < 0) arr.push(v); else if (!el.checked && idx >= 0) arr.splice(idx, 1);
      // data-act faz preventDefault; reflete o estado manualmente
      setTimeout(() => store.commit(), 0);
    },
    addPackage() {
      store.state.packages.push({ id: 'pk' + JA.u.uid(), name: 'Novo pacote', confirmed: false, active: false, tagline: 'Descreva o pacote', porteBoxes: 60, boxesProvided: 40, priceFactor: 0.8, includes: ['Transporte', 'Equipe'], extras: [] });
      store.commit();
    },
    removePackage(el) { if (confirm('Excluir este pacote?')) { store.state.packages.splice(Number(el.dataset.i), 1); store.commit(); } },
    addPartner() {
      const n = store.state.partners.length + 1;
      store.state.partners.push({ id: 'p' + JA.u.uid(), name: `Parceiro ${n}`, contact: '', regions: [], weekdays: [1, 2, 3, 4, 5, 6], priority: n, training: 'em_treinamento', active: true, trucks: '' });
      store.commit();
    },
  });
})();
