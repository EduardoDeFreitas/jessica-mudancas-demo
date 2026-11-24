/* Orçamento em quatro passos + resultado com pacotes. */
(function () {
  const JA = window.JA;
  const { esc, brl, dateBR } = JA.u;
  const store = JA.store;
  const STEPS = ['Trajeto e data', 'Inventário', 'Acesso e serviços', 'Conferência'];
  const MODE_LABEL = { levar: 'Levar o móvel', conteudo: 'Levar só o conteúdo', fica: 'Fica no imóvel' };
  const ELEV = { social: 'Elevador social', servico: 'Elevador de serviço', escada: 'Só escada', casa: 'Casa ou térreo' };
  const FITS = { sim: 'Itens grandes cabem', parcial: 'Alguns itens não cabem', nao: 'Itens grandes não cabem' };
  const PACK = { completa: 'Embalagem profissional completa', frageis: 'Só itens frágeis', nao: 'Eu mesmo embalo' };
  const PATH = { elevador: 'Pelo elevador', escada: 'Pela escada', '': 'A definir' };

  function seg(name, bind, value, options, cls = '', legend = '') {
    return `<fieldset class="seg ${cls}">${legend ? `<legend>${legend}</legend>` : ''}
      ${Object.entries(options).map(([v, l]) => {
        const id = `${name}-${v || 'nd'}`;
        return `<label for="${id}"><input type="radio" id="${id}" name="${name}" value="${esc(v)}" data-bind="${bind}" ${String(value) === v ? 'checked' : ''}><span>${esc(l)}</span></label>`;
      }).join('')}</fieldset>`;
  }
  JA.seg = seg;

  function stepsNav(step) {
    return `<ol class="steps" aria-label="Etapas do orçamento">${STEPS.map((t, i) => {
      const n = i + 1;
      const cls = n < step ? 'done' : n === step ? 'cur' : '';
      return `<li class="${cls}"><button type="button" data-act="toStep" data-step="${n}" ${n === step ? 'aria-current="step"' : ''}>
        <span class="bar"></span><span class="lbl">${n}. ${t}</span></button></li>`;
    }).join('')}</ol>`;
  }

  /* ---------- Passo 1 ---------- */
  function step1(d, ui) {
    const reg = store.regionOf(d.route.from);
    const today = new Date().toISOString().slice(0, 10);
    return `<div class="flow-card">
      <h2>Trajeto e data</h2>
      ${ui.err1 ? `<div class="notice danger" role="alert">${esc(ui.err1)}</div>` : ''}
      <label class="field" for="q-from"><span>De onde você vai sair?</span>
        <input class="input" id="q-from" data-bind="draft.route.from" value="${esc(d.route.from)}" placeholder="Bairro ou cidade" autocomplete="off">
        ${reg ? `<span class="hint">Região identificada: ${esc(reg)}</span>` : '<span class="hint">Bairro ou cidade já ajuda. O endereço completo só é pedido na confirmação.</span>'}</label>
      <label class="field" for="q-to"><span>Pra onde vai?</span>
        <input class="input" id="q-to" data-bind="draft.route.to" value="${esc(d.route.to)}" placeholder="Bairro ou cidade" autocomplete="off"></label>
      <label class="field" for="q-date"><span>Data desejada</span>
        <input class="input" type="date" id="q-date" min="${today}" data-bind="draft.route.date" data-rerender value="${esc(d.route.date)}">
        <span class="hint">${d.route.date ? `<span class="pill amber">Solicitada</span> ${esc(JA.u.dateLong(d.route.date))}. ` : ''}A data fica como solicitada até a confirmação da disponibilidade e do sinal.</span></label>
      ${seg('q-type', 'draft.route.type', d.route.type, { local: 'Mudança local (São Paulo e região)', viagem: 'Viagem (outra cidade)' }, '', 'Tipo de mudança')}
      ${d.route.type === 'viagem' ? `<label class="field" for="q-km"><span>Distância aproximada (km)</span>
        <input class="input" type="number" inputmode="numeric" min="0" id="q-km" data-type="number" data-bind="draft.route.distanceKm" value="${esc(d.route.distanceKm)}">
        <span class="hint">Em viagens, a distância entra no cálculo.</span></label>` : ''}
    </div>`;
  }

  /* ---------- Passo 2 ---------- */
  function itemRow(item, ri, ii) {
    const info = JA.pricing.itemInfo(item.name);
    const opts = info.kind === 'conteudo' ? { levar: 'Levar', fica: 'Fica no imóvel' } : MODE_LABEL;
    const base = `draft.rooms.${ri}.items.${ii}`;
    return `<div class="item ${item.mode === 'fica' ? 'fica' : ''}">
      <div class="item-top">
        <span class="item-name">${esc(item.name)}${item.custom ? ' <span class="pill gray">personalizado</span>' : ''}</span>
        <div class="stepper" role="group" aria-label="Quantidade de ${esc(item.name)}">
          <button type="button" data-act="qty" data-id="${item.id}" data-d="-1" aria-label="Diminuir ${esc(item.name)}" id="dec-${item.id}">−</button>
          <output aria-live="polite">${item.qty}</output>
          <button type="button" data-act="qty" data-id="${item.id}" data-d="1" aria-label="Aumentar ${esc(item.name)}" id="inc-${item.id}">+</button>
        </div>
      </div>
      ${seg(`m-${item.id}`, `${base}.mode`, item.mode, opts, 'sm', `<span class="sr-only">O que fazer com ${esc(item.name)}</span>`)}
      ${item.note ? `<span class="hint">📝 ${esc(item.note)}</span>` : ''}
    </div>`;
  }

  function step2(d) {
    const presetNames = Object.keys(JA.ROOM_PRESETS);
    const rooms = d.rooms.map((r, ri) => {
      const preset = JA.ROOM_PRESETS[r.name] || JA.ROOM_PRESETS[r.name.replace(/ \d+$/, '')] || [];
      const missing = preset.filter((n) => !r.items.some((i) => i.name === n));
      const moving = r.items.filter((i) => i.mode !== 'fica').reduce((a, i) => a + Number(i.qty), 0);
      return `<section class="room" aria-labelledby="room-${r.id}">
        <div class="row between" style="padding:12px 14px;background:var(--paper)">
          <h3 id="room-${r.id}" style="margin:0;font-family:var(--sans);font-size:1rem;font-weight:700">${esc(r.name)}</h3>
          <span class="row"><span class="pill">${moving} para levar</span>
          <button type="button" class="link-btn small" data-act="removeRoom" data-id="${r.id}" aria-label="Remover cômodo ${esc(r.name)}">Remover</button></span>
        </div>
        <div class="room-body">
          ${r.items.length ? r.items.map((it, ii) => itemRow(it, ri, ii)).join('') : '<p class="small muted" style="margin:6px 2px">Nenhum item ainda. Toque nas sugestões abaixo.</p>'}
          ${missing.length ? `<div class="chips" aria-label="Sugestões para ${esc(r.name)}">${missing.map((n) => `<button type="button" class="chip" data-act="addItem" data-room="${r.id}" data-name="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div>` : ''}
          <div class="add-row">
            <label class="sr-only" for="add-${r.id}">Item personalizado em ${esc(r.name)}</label>
            <input class="input" id="add-${r.id}" placeholder="Outro item (ex.: piano, aquário)" data-enter="addCustom" data-room="${r.id}">
            <button type="button" class="btn btn-ghost btn-sm" data-act="addCustom" data-room="${r.id}">Adicionar</button>
          </div>
        </div>
      </section>`;
    }).join('');
    return `<div class="flow-card">
      <div><h2>Inventário por cômodo</h2>
      <p class="muted small" style="margin:0">Ajuste as quantidades e diga o que vai: o móvel, só o conteúdo ou se fica no imóvel.</p></div>
      ${rooms}
      <div class="add-row">
        <label class="sr-only" for="new-room">Novo cômodo</label>
        <select class="input" id="new-room">${presetNames.map((n) => `<option>${esc(n)}</option>`).join('')}<option value="__outro">Outro cômodo…</option></select>
        <button type="button" class="btn btn-ghost btn-sm" data-act="addRoom">+ Cômodo</button>
      </div>
      <div class="card-soft stack">
        <h3 style="margin:0;font-family:var(--sans);font-size:1rem;font-weight:700">Quantas caixas você imagina?</h3>
        <div class="row">
          <label class="field grow" for="q-boxes"><span class="sr-only">Estimativa de caixas</span>
            <input class="input" type="number" inputmode="numeric" min="0" id="q-boxes" data-type="number" data-bind="draft.boxes.qty" value="${esc(d.boxes.qty)}" ${d.boxes.unknown ? 'disabled' : ''} placeholder="Ex.: 40"></label>
          <label class="check" for="q-boxes-unk"><input type="checkbox" id="q-boxes-unk" data-bind="draft.boxes.unknown" ${d.boxes.unknown ? 'checked' : ''}> Ainda não sei</label>
        </div>
        <p class="hint" style="margin:0">O JA Prestige atende mudanças de porte até 100 caixas e inclui até 80 caixas fornecidas pela empresa. Acima de 80, o valor cresce aos poucos.</p>
      </div>
    </div>`;
  }

  /* ---------- Passo 3 ---------- */
  function accessBlock(key, a) {
    const lbl = key === 'origin' ? 'Saída (origem)' : 'Chegada (destino)';
    const b = `draft.access.${key}`;
    const hasElev = a.elevator === 'social' || a.elevator === 'servico';
    return `<div class="card-soft stack">
      <h3 style="margin:0;font-family:var(--sans);font-size:1rem;font-weight:700">${lbl}</h3>
      <label class="field" for="fl-${key}"><span>Andar</span>
        <input class="input" type="number" inputmode="numeric" min="0" id="fl-${key}" data-type="number" data-bind="${b}.floor" value="${esc(a.floor)}" placeholder="0 para térreo"></label>
      ${seg(`el-${key}`, `${b}.elevator`, a.elevator, ELEV, 'sm', 'Acesso')}
      ${hasElev ? seg(`fit-${key}`, `${b}.bigFits`, a.bigFits, FITS, 'sm', 'Itens grandes no elevador') : ''}
    </div>`;
  }

  function step3(d) {
    const anyPartial = ['origin', 'dest'].some((k) => ['parcial', 'nao'].includes(d.access[k].bigFits));
    const instr = [];
    d.rooms.forEach((r, ri) => r.items.forEach((it, ii) => {
      if (it.mode === 'fica') return;
      const info = JA.pricing.itemInfo(it.name);
      if (info.kind === 'conteudo' && it.mode === 'levar') return;
      const base = `draft.rooms.${ri}.items.${ii}`;
      const flagged = it.path === 'escada' || !!it.note;
      instr.push(`<div class="instr ${flagged ? 'flag' : ''}">
        <div class="row between"><b>${esc(it.name)}${it.qty > 1 ? ` (${it.qty})` : ''}</b><span class="small muted">${esc(r.name)} · ${esc(MODE_LABEL[it.mode] || '')}</span></div>
        ${it.mode === 'levar' ? seg(`p-${it.id}`, `${base}.path`, it.path || '', PATH, 'sm', `<span class="sr-only">Como ${esc(it.name)} passa</span>`) : ''}
        ${it.mode === 'levar' && info.disassemble ? `<div class="row">
          <label class="check small" for="ds-${it.id}"><input type="checkbox" id="ds-${it.id}" data-bind="${base}.disassemble" ${it.disassemble ? 'checked' : ''}> Desmontar</label>
          <label class="check small" for="as-${it.id}"><input type="checkbox" id="as-${it.id}" data-bind="${base}.assemble" ${it.assemble ? 'checked' : ''}> Montar no destino</label></div>` : ''}
        <label class="sr-only" for="nt-${it.id}">Instrução para ${esc(it.name)}</label>
        <input class="input" id="nt-${it.id}" style="min-height:42px;padding:8px 12px" data-bind="${base}.note" value="${esc(it.note)}" placeholder="Instrução (opcional)">
      </div>`);
    }));
    return `<div class="flow-card">
      <h2>Acesso e serviços</h2>
      <div class="access-grid">${accessBlock('origin', d.access.origin)}${accessBlock('dest', d.access.dest)}</div>
      ${seg('q-pack', 'draft.services.packing', d.services.packing, PACK, '', 'Embalagem')}
      <div class="stack">
        <label class="check" for="q-dis"><input type="checkbox" id="q-dis" data-bind="draft.services.disassembly" ${d.services.disassembly ? 'checked' : ''}> Preciso de desmontagem de móveis na saída</label>
        <label class="check" for="q-asm"><input type="checkbox" id="q-asm" data-bind="draft.services.assembly" ${d.services.assembly ? 'checked' : ''}> Preciso de montagem no destino</label>
      </div>
      <div>
        <h3 style="font-family:var(--sans);font-size:1rem;font-weight:700;margin-bottom:4px">Instruções por item</h3>
        <p class="hint" style="margin:0 0 10px">${anyPartial ? 'Você indicou que alguns itens não cabem no elevador. Marque quais vão pela escada: o box desmontado pode ir no elevador e o colchão, pela escada.' : 'Diga como cada item passa e se precisa desmontar. Ex.: o box desmontado cabe no elevador, mas o colchão vai pela escada.'}</p>
        <div class="stack">${instr.join('') || '<p class="small muted">Adicione itens no inventário para dar instruções.</p>'}</div>
      </div>
      <label class="field" for="q-notes"><span>Outras observações</span>
        <textarea class="input" id="q-notes" data-bind="draft.services.notes" placeholder="Horário do condomínio, vaga para o caminhão, itens de valor…">${esc(d.services.notes)}</textarea></label>
    </div>`;
  }

  /* ---------- Passo 4 ---------- */
  function invLines(d) {
    return d.rooms.filter((r) => r.items.length).map((r) => `<div><b class="small">${esc(r.name)}</b>
      <ul class="small" style="margin:4px 0 8px;padding-left:18px">${r.items.map((i) => `<li>${i.qty}× ${esc(i.name)}${i.mode !== 'levar' ? ` <span class="pill ${i.mode === 'fica' ? 'gray' : 'gold'}">${MODE_LABEL[i.mode]}</span>` : ''}${i.path === 'escada' ? ' <span class="pill amber">escada</span>' : i.path === 'elevador' ? ' <span class="pill blue">elevador</span>' : ''}</li>`).join('')}</ul></div>`).join('');
  }
  JA.invLines = invLines;

  function highlights(d) {
    const out = [];
    d.rooms.forEach((r) => r.items.forEach((i) => {
      if (i.mode === 'fica') return;
      if (i.path === 'escada') out.push(`${i.name} pela escada`);
      else if (i.note) out.push(`${i.name}: ${i.note}`);
    }));
    const kept = [];
    d.rooms.forEach((r) => r.items.forEach((i) => { if (i.mode === 'fica') kept.push(i.name); }));
    if (kept.length) out.push(`Fica no imóvel: ${kept.join(', ')}`);
    return out;
  }
  JA.highlights = highlights;

  function accessText(a) {
    if (a.floor === '' || a.floor == null) return 'não informado';
    const fl = Number(a.floor) === 0 ? 'Térreo' : `${a.floor}º andar`;
    return `${fl} · ${ELEV[a.elevator] || 'acesso não informado'}${a.bigFits ? ` · ${FITS[a.bigFits].toLowerCase()}` : ''}`;
  }
  JA.accessText = accessText;
  JA.PACK_LABEL = PACK;
  JA.MODE_LABEL = MODE_LABEL;

  function packageCard(pk, selected, s, d) {
    const p = pk.payments, cfg = s.config;
    const isPrestige = pk.pkg.id === 'prestige';
    return `<article class="pkg ${selected ? 'selected' : ''}" aria-label="Pacote ${esc(pk.pkg.name)}">
      <div class="pkg-head">
        <div><h3>${esc(pk.pkg.name)}</h3><p class="small muted" style="margin:4px 0 0">${esc(pk.pkg.tagline || '')}</p></div>
        ${pk.pkg.confirmed ? '<span class="pill gold">Pacote oficial</span>' : '<span class="pill gray">Em definição</span>'}
      </div>
      <div><div class="price-label">${esc(pk.label)}</div><div class="price">${brl(pk.price)}</div>
        <div class="small muted">Válido no mês vigente (até ${JA.u.endOfMonth()})</div></div>
      ${!pk.applicable ? '<div class="notice warn">Este pacote não comporta a quantidade de caixas informada.</div>' : ''}
      <div><b class="small">O que está incluído</b><ul class="check-list small" style="margin-top:8px">${pk.pkg.includes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      ${pk.pkg.extras && pk.pkg.extras.length ? `<div><b class="small">Adicionais (cobrados à parte)</b><ul class="check-list plus small" style="margin-top:8px">${pk.pkg.extras.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${isPrestige ? `<div class="boxes-note small"><div><b>até ${pk.pkg.porteBoxes}</b>caixas: porte de mudança atendido</div><div><b>até ${pk.pkg.boxesProvided}</b>caixas fornecidas pela empresa</div></div>
        <p class="hint" style="margin:0">Acima de ${pk.pkg.boxesProvided} caixas, o preço cresce gradualmente${cfg.boxes.extraBoxPrice ? ` (${brl(Number(cfg.boxes.extraBoxPrice))} por caixa extra)` : ' (valor confirmado pela equipe)'}.</p>` : ''}
      <div><b class="small">Formas de pagamento</b>
        <table class="pay-table"><tbody>
          <tr><td>Pix ou transferência</td><td>${brl(p.pix)}</td></tr>
          <tr><td>Débito ou crédito em 1x <span class="muted">(+${String(p.pct.debit1x).replace('.', ',')}%)</span></td><td>${brl(p.debit1x)}</td></tr>
          <tr><td>Crédito em 4x <span class="muted">(+${String(p.pct.credit4x).replace('.', ',')}%)</span></td><td>${brl(p.credit4x)}<div class="small muted" style="font-weight:500">4× ${brl(p.credit4xInstallment)}</div></td></tr>
        </tbody></table></div>
      <div class="notice info small">Sinal para reserva: <b>${cfg.depositPct}% do valor contratado</b> (${brl(p.deposit)} no valor base). Data solicitada: <b>${dateBR(d.route.date)}</b>, confirmada após disponibilidade e sinal.</div>
      ${selected
        ? `<button type="button" class="btn btn-wa btn-block" data-act="continueWhatsApp" data-pkg="${pk.pkg.id}">${JA.ICON.wa} Continuar com este orçamento no WhatsApp</button>`
        : `<button type="button" class="btn btn-ghost btn-block" data-act="selectPkg" data-pkg="${pk.pkg.id}">Escolher ${esc(pk.pkg.name)}</button>`}
    </article>`;
  }

  function step4(d, s) {
    const { calc, pkgs } = JA.pricing.packagesFor(d, s);
    const sel = s.ui.selectedPkg && pkgs.some((p) => p.pkg.id === s.ui.selectedPkg) ? s.ui.selectedPkg : (pkgs.length === 1 ? pkgs[0].pkg.id : null);
    const hl = highlights(d);
    const editBtn = (n) => `<button type="button" class="link-btn small" data-act="toStep" data-step="${n}">Editar</button>`;
    const order = s.draftOrder && s.orders[s.draftOrder];
    return `<div class="flow-card">
      <h2>Confira e veja o preço</h2>
      ${order ? `<div class="notice ok small">Este orçamento já tem o código <b class="mono">${esc(order.code)}</b>. Se você mudar algo, o mesmo pedido é atualizado.</div>` : ''}
      <div class="summary-sec"><div class="row between"><h3>Trajeto e data</h3>${editBtn(1)}</div>
        <dl class="kv"><dt>De</dt><dd>${esc(d.route.from || '—')}</dd><dt>Para</dt><dd>${esc(d.route.to || '—')}</dd>
        <dt>Data</dt><dd>${dateBR(d.route.date)} <span class="pill amber">solicitada</span></dd>
        <dt>Tipo</dt><dd>${d.route.type === 'viagem' ? `Viagem${d.route.distanceKm ? ` · ${d.route.distanceKm} km` : ''}` : 'Mudança local'}</dd></dl></div>
      <div class="summary-sec"><div class="row between"><h3>Inventário</h3>${editBtn(2)}</div>
        ${invLines(d) || '<p class="small muted">Nenhum item.</p>'}
        <p class="small" style="margin:0">Caixas: <b>${d.boxes.unknown || d.boxes.qty === '' ? 'ainda não sabe' : d.boxes.qty}</b></p></div>
      <div class="summary-sec"><div class="row between"><h3>Acesso e serviços</h3>${editBtn(3)}</div>
        <dl class="kv"><dt>Origem</dt><dd>${esc(accessText(d.access.origin))}</dd><dt>Destino</dt><dd>${esc(accessText(d.access.dest))}</dd>
        <dt>Embalagem</dt><dd>${PACK[d.services.packing]}</dd>
        <dt>Montagem</dt><dd>${[d.services.disassembly && 'desmontagem', d.services.assembly && 'montagem'].filter(Boolean).join(' e ') || 'não precisa'}</dd></dl>
        ${hl.length ? `<div class="stack" style="margin-top:10px">${hl.map((h) => `<div class="instr flag small">⚠️ ${esc(h)}</div>`).join('')}</div>` : ''}</div>
      <label class="field" for="q-name"><span>Seu nome (opcional)</span>
        <input class="input" id="q-name" data-bind="draft.contact.name" value="${esc(d.contact.name)}" autocomplete="name"></label>
    </div>

    <div style="margin-top:16px" class="stack">
      ${calc.ok ? `
        <h2 style="margin-top:8px">${pkgs.length > 1 ? 'Compare os pacotes' : 'Seu pacote'}</h2>
        <div class="packages ${pkgs.length > 1 ? 'multi' : ''}" role="radiogroup" aria-label="Pacotes disponíveis">
          ${pkgs.map((pk) => packageCard(pk, pk.pkg.id === sel, s, d)).join('')}
          ${pkgs.length === 1 ? '<div class="compare-placeholder small">Comparação de pacotes pronta: novos pacotes cadastrados no painel aparecem aqui lado a lado.</div>' : ''}
        </div>
        ${d.demoCase ? '<p class="hint">Orçamento de referência registrado para este caso. Ajustes no inventário passam pela revisão da equipe antes da confirmação.</p>' : ''}
        ${s.costs.fictional && !d.demoCase ? '<p class="hint">Na demonstração pública, as estimativas usam parâmetros fictícios.</p>' : ''}
        <p class="center"><button type="button" class="link-btn small" data-act="requestEvaluation">Prefiro que a equipe avalie antes</button></p>
      ` : `
        <div class="flow-card">
          <h2>Precisamos de uma avaliação da equipe</h2>
          <p class="muted small" style="margin:0">Com estas informações, o preço não pode ser calculado automaticamente:</p>
          <ul class="small">${calc.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
          <p class="small" style="margin:0">Você pode ajustar os dados ou enviar o resumo preenchido para a equipe avaliar. Nada precisa ser explicado de novo.</p>
          <button type="button" class="btn btn-gold btn-block" data-act="requestEvaluation">Solicitar avaliação da equipe</button>
        </div>`}
    </div>`;
  }

  JA.views.quote = function (stepParam) {
    const s = store.state;
    const step = Math.min(4, Math.max(1, stepParam || s.ui.step || 1));
    if (s.ui.step !== step) { s.ui.step = step; store.save(); }
    if (step === 4 && !s.ui.reachedStep4) { s.ui.reachedStep4 = true; store.save(); }
    const d = s.draft;
    const body = step === 1 ? step1(d, s.ui) : step === 2 ? step2(d) : step === 3 ? step3(d) : step4(d, s);
    const calc = step === 4 ? JA.pricing.packagesFor(d, s) : null;
    let mainBtn;
    if (step < 4) mainBtn = `<button type="button" class="btn btn-navy" data-act="nextStep">Continuar</button>`;
    else if (calc.calc.ok) {
      const sel = s.ui.selectedPkg || (calc.pkgs.length === 1 ? calc.pkgs[0].pkg.id : null);
      mainBtn = sel ? `<button type="button" class="btn btn-wa" data-act="continueWhatsApp" data-pkg="${sel}">${JA.ICON.wa} Continuar no WhatsApp</button>`
        : '<button type="button" class="btn btn-navy" disabled>Escolha um pacote</button>';
    } else mainBtn = '<button type="button" class="btn btn-gold" data-act="requestEvaluation">Solicitar avaliação da equipe</button>';

    const html = `
      <header class="app-head"><div class="wrap">
        <a class="logo" href="#/" aria-label="Voltar ao site"><span class="mark">${JA.ICON.box}</span><span><small>ORÇAMENTO</small><strong>Jéssica Araújo</strong></span></a>
        ${d.demoCase ? '<span class="pill gold">Mudança de exemplo</span>' : ''}
      </div></header>
      <main class="flow"><div class="wrap flow-narrow">
        <div class="flow-head">${stepsNav(step)}<p class="small muted" style="margin:0">Passo ${step} de 4 · seu preenchimento fica salvo neste aparelho.</p></div>
        ${body}
      </div></main>
      <div class="flow-foot"><div class="wrap">
        <button type="button" class="btn btn-ghost" data-act="prevStep">${step === 1 ? 'Site' : 'Voltar'}</button>
        ${mainBtn}
      </div></div>`;
    return { html, title: `Orçamento · ${STEPS[step - 1]}`, after: bindEnter };
  };

  function bindEnter() {
    document.querySelectorAll('[data-enter]').forEach((inp) => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); JA.actions[inp.dataset.enter](inp); }
      });
    });
  }

  function toStep(n) {
    const s = store.state;
    if (s.ui.reachedStep4 && n < 4) s.ui.editedBack = true;
    s.ui.err1 = '';
    store.save();
    JA.go(`#/orcamento/${n}`);
  }

  Object.assign(JA.actions, {
    toStep(el) { toStep(Number(el.dataset.step)); },
    nextStep() {
      const s = store.state;
      if (s.ui.step === 1 && (!s.draft.route.from.trim() || !s.draft.route.to.trim())) {
        s.ui.err1 = 'Informe de onde você vai sair e para onde vai.';
        store.commit();
        document.getElementById(s.draft.route.from.trim() ? 'q-to' : 'q-from').focus();
        return;
      }
      toStep(s.ui.step + 1);
    },
    prevStep() {
      const s = store.state;
      if (s.ui.step === 1) JA.go('#/'); else toStep(s.ui.step - 1);
    },
    qty(el) {
      const { item } = store.findItem(el.dataset.id);
      if (!item) return;
      const next = Number(item.qty) + Number(el.dataset.d);
      if (next <= 0) {
        if (!confirm(`Remover "${item.name}" do inventário?`)) return;
        const { room } = store.findItem(el.dataset.id);
        room.items = room.items.filter((i) => i.id !== item.id);
      } else item.qty = next;
      if (store.state.ui.reachedStep4) store.state.ui.editedBack = true;
      store.commit();
    },
    addItem(el) { store.addItem(el.dataset.room, el.dataset.name); store.commit(); },
    addCustom(el) {
      const inp = document.getElementById(`add-${el.dataset.room}`);
      const v = inp && inp.value.trim();
      if (!v) { inp && inp.focus(); return; }
      store.addItem(el.dataset.room, v);
      store.commit();
      const again = document.getElementById(`add-${el.dataset.room}`);
      if (again) again.focus();
      JA.toast(`${v} adicionado.`);
    },
    addRoom() {
      const sel = document.getElementById('new-room');
      let name = sel.value;
      if (name === '__outro') { name = (prompt('Nome do cômodo') || '').trim(); if (!name) return; }
      const rooms = store.state.draft.rooms;
      const same = rooms.filter((r) => r.name === name || r.name.startsWith(name + ' ')).length;
      rooms.push({ id: JA.u.uid(), name: same ? `${name} ${same + 1}` : name, items: [] });
      store.commit();
    },
    removeRoom(el) {
      const d = store.state.draft;
      const r = d.rooms.find((x) => x.id === el.dataset.id);
      if (r.items.length && !confirm(`Remover o cômodo "${r.name}" e seus itens?`)) return;
      d.rooms = d.rooms.filter((x) => x.id !== el.dataset.id);
      store.commit();
    },
    selectPkg(el) { store.state.ui.selectedPkg = el.dataset.pkg; store.commit(); },
    continueWhatsApp(el) {
      const order = store.createOrUpdateOrder({ pkgId: el.dataset.pkg });
      JA.chat.ensureStarted(order);
      JA.go('#/atendimento');
    },
    requestEvaluation() {
      const order = store.createOrUpdateOrder({ pkgId: 'prestige', evaluation: true });
      JA.chat.ensureStarted(order, true);
      JA.go('#/atendimento');
    },
  });
})();
