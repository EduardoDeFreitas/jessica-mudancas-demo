/* Área do parceiro: funciona no navegador do celular. */
(function () {
  const JA = window.JA;
  const { esc, dateBR, nowLabel } = JA.u;
  const store = JA.store;
  const short = (t) => String(t || '').replace(/\s*\(endereço omitido\)/, '').replace(/, São Paulo$/, '');

  function me() { const s = store.state; return s.partners.find((p) => p.id === s.ui.partnerId) || s.partners[0]; }

  function head(p) {
    const s = store.state;
    return `<header class="app-head"><div class="wrap">
        <div><h1>Área do parceiro</h1><div class="sub">Rede Mudanças Jéssica Araújo</div></div>
        <span class="avatar" aria-hidden="true">${esc(p.name.charAt(0))}</span>
      </div></header>
      <div class="wrap" style="margin-top:12px">
        <label class="field" for="who"><span class="small">Entrar como (demonstração, sem senha)</span>
          <select class="input" id="who" data-bind="ui.partnerId">${s.partners.map((x) => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)}${x.training !== 'aprovado' ? ' · em treinamento' : ''}</option>`).join('')}</select></label>
      </div>`;
  }

  function jobsFor(p) {
    const s = store.state;
    const all = s.orderList.map((c) => s.orders[c]);
    return {
      offers: all.filter((o) => o.partner.attempts.some((a) => a.partnerId === p.id && a.status === 'oferecido')),
      mine: all.filter((o) => o.partner.assigned === p.id),
      past: all.filter((o) => o.partner.attempts.some((a) => a.partnerId === p.id && ['recusado', 'indisponivel', 'cancelado'].includes(a.status))),
    };
  }

  function jobCard(o, tag) {
    const st = JA.u.weekday(o.draft.route.date);
    const flags = JA.highlights(o.draft).filter((h) => !h.startsWith('Fica'));
    return `<a class="order-card" href="#/parceiro/servico/${o.code}">
      <div class="row between"><span class="mono">${esc(o.code)}</span>${tag}</div>
      <div><b>${JA.u.dateLong(o.draft.route.date)}</b></div>
      <div class="small muted">${esc(short(o.draft.route.from))} → ${esc(short(o.draft.route.to))} · ${esc(o.region || '')}</div>
      ${flags.length ? `<div class="small" style="color:var(--gold-ink);font-weight:700">⚠️ ${esc(flags[0])}${flags.length > 1 ? ` +${flags.length - 1}` : ''}</div>` : ''}
    </a>`;
  }

  JA.views.partner = function () {
    const p = me();
    const { offers, mine, past } = jobsFor(p);
    const html = `${head(p)}
      <main class="panel"><div class="wrap flow-narrow stack" style="margin:0 auto">
        <div class="card-soft small row between"><span>${p.training === 'aprovado' ? '<span class="pill green">✓ Treinamento aprovado pela Jéssica</span>' : '<span class="pill amber">Treinamento em andamento: ainda não recebe serviços</span>'}</span><span class="muted">Regiões: ${esc(p.regions.join(', ') || '—')}</span></div>
        <h2 style="margin:8px 0 0">Novos serviços</h2>
        ${offers.length ? offers.map((o) => jobCard(o, '<span class="pill violet">Aguardando sua resposta</span>')).join('') : '<p class="muted small">Nenhum serviço oferecido agora.</p>'}
        <h2 style="margin:8px 0 0">Meus serviços</h2>
        ${mine.length ? mine.map((o) => jobCard(o, JA.statusPill(o.status))).join('') : '<p class="muted small">Nenhum serviço confirmado.</p>'}
        ${past.length ? `<h2 style="margin:8px 0 0">Recusados ou indisponíveis</h2>${past.map((o) => jobCard(o, '<span class="pill gray">Não atendido</span>')).join('')}` : ''}
      </div></main>`;
    return { html, title: 'Área do parceiro' };
  };

  JA.views.partnerJob = function (code) {
    const s = store.state;
    const o = s.orders[code];
    let p = me();
    if (!o) return { html: `${head(p)}<main class="panel"><div class="wrap"><p>Serviço não encontrado.</p></div></main>` };
    // Abrir pelo link do pedido entra como o parceiro envolvido
    const involved = (store.activeOffer(o) || {}).partnerId || o.partner.assigned;
    const holds = (pid) => o.partner.assigned === pid || o.partner.attempts.some((a) => a.partnerId === pid && a.status === 'oferecido');
    if (involved && involved !== p.id && !holds(p.id)) { s.ui.partnerId = involved; store.save(); p = me(); }
    const offer = o.partner.attempts.find((a) => a.partnerId === p.id && a.status === 'oferecido');
    const assigned = o.partner.assigned === p.id;
    if (!offer && !assigned) {
      return { html: `${head(p)}<main class="panel"><div class="wrap flow-narrow stack" style="margin:0 auto"><a href="#/parceiro" class="small">← Meus serviços</a><div class="notice warn">Este serviço não está com ${esc(p.name)} no momento.</div></div></main>`, title: 'Serviço' };
    }
    if (!o.partnerViewed) { o.partnerViewed = true; store.save(); }
    const d = o.draft;
    const stairs = [], notes = [], contentOnly = [];
    d.rooms.forEach((r) => r.items.forEach((i) => {
      if (i.mode === 'fica') return;
      if (i.path === 'escada') stairs.push([`${i.name} pela escada`, i.note && !/escada/i.test(i.note) ? i.note : `${r.name}: não cabe no elevador, descer e subir pela escada.`]);
      else if (i.note && i.mode === 'levar') notes.push([i.name, i.note]);
      if (i.mode === 'conteudo') contentOnly.push(`${i.name} (${r.name})`);
    }));
    const flags = stairs.concat(notes);
    if (contentOnly.length) flags.push(['Levar só o conteúdo', `${contentOnly.join(', ')}. Os móveis ficam no imóvel.`]);
    const kept = []; d.rooms.forEach((r) => r.items.forEach((i) => { if (i.mode === 'fica') kept.push(`${i.name} (${r.name})`); }));
    const disasm = []; d.rooms.forEach((r) => r.items.forEach((i) => { if (i.mode === 'levar' && (i.disassemble || i.assemble)) disasm.push(`${i.name}: ${[i.disassemble && 'desmontar', i.assemble && 'montar'].filter(Boolean).join(' e ')}`); }));
    const done = o.partner.progress.map((x) => x.step);
    const nextStep = JA.PROGRESS_STEPS.find((x) => !done.includes(x.id));

    const html = `${head(p)}
      <main class="panel"><div class="wrap flow-narrow stack" style="margin:0 auto">
        <a href="#/parceiro" class="small">← Meus serviços</a>
        <div class="row between"><h2 style="margin:0" class="mono">${esc(o.code)}</h2>${offer ? '<span class="pill violet">Novo serviço</span>' : JA.statusPill(o.status)}</div>
        ${offer ? `<div class="notice info small">Serviço oferecido a você em ${nowLabel(offer.at)}. Responda para a Jéssica seguir a distribuição.</div>` : ''}
        ${flags.length ? `<section class="stack" aria-label="Observações importantes">${flags.map(([t, sub], idx) => `<div class="flag-box ${idx < stairs.length ? 'primary' : ''}"><span aria-hidden="true" style="font-size:1.4rem">${idx < stairs.length ? '⚠️' : 'ℹ️'}</span><div><strong>${esc(t)}</strong><div class="small">${esc(sub)}</div></div></div>`).join('')}</section>` : ''}
        <div class="card stack">
          <dl class="kv">
            <dt>Data</dt><dd>${JA.u.dateLong(d.route.date)} ${o.deposit.status === 'confirmado' ? '<span class="pill green">confirmada</span>' : ''}</dd>
            <dt>Região</dt><dd>${esc(o.region || '—')}</dd>
            <dt>Saída</dt><dd>${esc(short(d.route.from))}<div class="small muted">${esc(JA.accessText(d.access.origin))}</div></dd>
            <dt>Chegada</dt><dd>${esc(short(d.route.to))}<div class="small muted">${esc(JA.accessText(d.access.dest))}</div></dd>
            <dt>Pacote</dt><dd>${esc(o.pkgName)}</dd>
            <dt>Embalagem</dt><dd>${JA.PACK_LABEL[d.services.packing]}</dd>
            <dt>Caixas</dt><dd>${d.boxes.unknown || d.boxes.qty === '' ? 'a confirmar (até 80 fornecidas)' : d.boxes.qty}</dd>
          </dl>
          <p class="tiny muted" style="margin:0">Endereços completos e contato do cliente são liberados após o aceite (omitidos na demonstração).</p>
        </div>
        <div class="card"><h3>Inventário a transportar</h3>${JA.invLines({ rooms: d.rooms.map((r) => ({ name: r.name, items: r.items.filter((i) => i.mode !== 'fica') })) })}
          ${kept.length ? `<div class="notice warn small"><b>Não levar (fica no imóvel):</b> ${esc(kept.join(', '))}</div>` : ''}</div>
        <div class="card stack"><h3 style="margin:0">Instruções de execução</h3>
          ${disasm.length ? `<div><b class="small">Desmontagem e montagem</b><ul class="small" style="margin:4px 0 0;padding-left:18px">${disasm.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
          <div><b class="small">Padrão Jéssica Araújo</b><ul class="check-list small" style="margin-top:8px">
            <li>Equipe uniformizada e identificada</li>
            <li>Móveis protegidos com plástico bolha e filme</li>
            <li>Frágeis embalados um a um</li>
            <li>Caixas etiquetadas por cômodo</li>
            <li>Posicionar os móveis uma vez, conforme orientação do cliente</li>
            <li>Organização interna de armários e gavetas só se contratada à parte</li>
          </ul></div>
          ${d.services.notes ? `<p class="small" style="margin:0">Observações: ${esc(d.services.notes)}</p>` : ''}
        </div>
        ${assigned ? `<div class="card stack"><h3 style="margin:0">Andamento</h3>
          <ol class="progress-steps">${JA.PROGRESS_STEPS.map((st) => {
            const hit = o.partner.progress.find((x) => x.step === st.id);
            return `<li class="${hit ? 'done' : ''}"><span>${hit ? '✓ ' : ''}${st.label}</span>${hit ? `<span class="tiny muted">${nowLabel(hit.at)}</span>` : nextStep && nextStep.id === st.id ? `<button class="btn btn-navy btn-sm" data-act="progress" data-code="${o.code}" data-step="${st.id}">Atualizar</button>` : ''}</li>`;
          }).join('')}</ol></div>` : ''}
        ${offer ? `<div class="sticky-actions">
          <button class="btn btn-ghost" data-act="partnerAnswer" data-code="${o.code}" data-r="indisponivel">Recusar / indisponível</button>
          <button class="btn btn-gold" data-act="partnerAnswer" data-code="${o.code}" data-r="aceito">Aceitar serviço</button>
        </div>` : ''}
      </div></main>`;
    return { html, title: `Serviço ${code}` };
  };

  Object.assign(JA.actions, {
    partnerAnswer(el) {
      const p = me();
      if (el.dataset.r !== 'aceito' && !confirm('Recusar este serviço? Ele será oferecido ao próximo parceiro.')) return;
      store.partnerRespond(el.dataset.code, p.id, el.dataset.r);
      JA.toast(el.dataset.r === 'aceito' ? 'Serviço aceito. A Jéssica foi avisada.' : 'Resposta enviada. O serviço segue para o próximo parceiro.');
      if (el.dataset.r !== 'aceito') JA.go('#/parceiro');
    },
    progress(el) { store.updateProgress(el.dataset.code, el.dataset.step, me().name); },
  });
})();
