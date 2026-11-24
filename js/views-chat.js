/* Atendimento simulado (WhatsApp + IA). A fonte das respostas é o pedido e o preço registrado. */
(function () {
  const JA = window.JA;
  const { esc, brl, dateBR } = JA.u;
  const store = JA.store;
  let typing = false;

  function stats(d) {
    let items = 0, rooms = 0;
    d.rooms.forEach((r) => { const n = r.items.filter((i) => i.mode !== 'fica').reduce((a, i) => a + Number(i.qty), 0); if (n) rooms++; items += n; });
    return { items, rooms };
  }
  const short = (t) => String(t).replace(/\s*\(endereço omitido\)/, '').replace(/, São Paulo$/, '');

  function preparedMessage(o, evaluation) {
    const d = o.draft, pv = store.currentPrice(o), st = stats(d);
    const hl = JA.highlights(d);
    const lines = [
      evaluation ? `Olá! Preciso de uma avaliação para o pedido ${o.code}.` : `Olá! Quero continuar meu orçamento ${o.code}.`,
      pv ? `Pacote: ${pv.pkgName} · ${pv.label} ${brl(pv.value)} (versão ${pv.v})` : `Pacote de interesse: ${o.pkgName}`,
      `Trajeto: ${short(d.route.from)} → ${short(d.route.to)} · data solicitada ${dateBR(d.route.date)}`,
      `Acesso: origem ${JA.accessText(d.access.origin)}; destino ${JA.accessText(d.access.dest)}`,
      `Inventário: ${st.rooms} cômodos, ${st.items} itens para levar · caixas: ${d.boxes.unknown || d.boxes.qty === '' ? 'ainda não sei' : d.boxes.qty}`,
    ];
    if (hl.length) lines.push(`Destaques: ${hl.join('; ')}`);
    if (evaluation && o.reasons.length) lines.push(`Motivo da avaliação: ${o.reasons.join(' ')}`);
    return lines.join('\n');
  }

  function push(o, from, text) { o.chat.push({ from, text, at: Date.now() }); }

  function ensureStarted(o, evaluation) {
    const pv = store.currentPrice(o);
    if (!o.chat.length) {
      push(o, 'cliente', preparedMessage(o, evaluation));
      if (o.status === 'novo') { o.status = 'atendimento'; store.log(o, 'IA', 'Atendimento iniciado no WhatsApp (simulado) a partir do orçamento do site.'); }
      if (evaluation) {
        push(o, 'ia', `Oi${firstName(o)}! Recebi o resumo do pedido ${o.code}. Como alguns dados precisam de avaliação, já passei tudo para a equipe da Jéssica. Ela responde por aqui com o valor, sem você precisar explicar de novo.`);
        handoff(o, 'Pedido precisa de avaliação da equipe', true);
      } else {
        push(o, 'ia', `Oi${firstName(o)}! Sou a assistente virtual da Mudanças Jéssica Araújo. Já estou com o seu orçamento ${o.code}: ${pv.pkgName} por ${brl(pv.value)} (${pv.label.toLowerCase()}), válido até ${pv.validUntil}.\n\nPosso explicar o que está incluído, as formas de pagamento ou como reservar a data. É só perguntar!`);
      }
      o.chatPv = pv ? pv.v : 0;
    } else if (pv && o.chatPv !== pv.v) {
      push(o, 'sistema', `Orçamento atualizado no site: versão ${pv.v}, ${brl(pv.value)}. O atendimento passa a usar este valor.`);
      o.chatPv = pv.v;
    }
    store.save();
  }

  function firstName(o) {
    const n = (o.draft.contact.name || '').trim();
    if (!n || /demonstra/i.test(n)) return '';
    return ', ' + n.split(' ')[0];
  }

  function handoff(o, reason, silent) {
    o.humanTakeover = true;
    if (o.status === 'novo') o.status = 'atendimento';
    store.log(o, 'IA', `Transferiu para atendimento humano. Motivo: ${reason}.`);
    push(o, 'sistema', `Conversa transferida para a equipe com o resumo do pedido ${o.code}.`);
    if (!silent) push(o, 'ia', 'Vou chamar a equipe da Jéssica para te responder. Ela já recebe o seu pedido completo, sem você precisar repetir nada. No horário comercial a resposta costuma ser rápida; fora dele, ela retorna no próximo atendimento.');
  }

  /* ---------- Motor de respostas (regras sobre os dados do pedido) ---------- */
  const INTENTS = [
    { id: 'humano', re: /(humano|pessoa|atendente|jessica|falar com alguem|falar com voces)/ },
    { id: 'reservar_sim', re: /(quero reservar|pode reservar|sim,? quero|pode confirmar|quero fechar)/ },
    { id: 'desconto', topic: 'desconto', re: /(desconto|mais barato|negoci|abaixar|baixar o preco|valor menor)/ },
    { id: 'acesso', topic: 'acesso', re: /(escada|elevador|colchao|andar)/ },
    { id: 'reserva', topic: 'reserva', re: /(reserv|sinal|fechar|confirmar|garantir a data)/ },
    { id: 'pagamento', topic: 'pagamento', re: /(pag|cartao|parcel|pix|debito|credito|vezes|boleto)/ },
    { id: 'armario', topic: 'incluso', re: /(armario|gaveta|organiza|posicion|arrum)/ },
    { id: 'caixas', topic: 'caixas', re: /(caixa|material|plastico bolha)/ },
    { id: 'data', topic: 'data', re: /(data|dia |disponib|quando|agenda)/ },
    { id: 'incluso', topic: 'incluso', re: /(inclu|vem no|prestige|pacote|o que vem|servico)/ },
    { id: 'oi', re: /^(oi|ola|bom dia|boa tarde|boa noite|e ai)\b/ },
    { id: 'obrigado', re: /(obrigad|valeu|perfeito|otimo|show)/ },
  ];

  function reply(o, text) {
    const s = store.state;
    const t = JA.u.norm(text);
    const pv = store.currentPrice(o);
    const pkg = s.packages.find((p) => p.id === o.pkgId) || s.packages[0];
    const intent = INTENTS.find((i) => i.re.test(t));
    if (!intent) {
      o.unknownCount = (o.unknownCount || 0) + 1;
      if (o.unknownCount >= s.config.ai.handoffAfterUnknown) return handoff(o, `pergunta fora das regras: “${text.slice(0, 80)}”`);
      return push(o, 'ia', 'Não tenho certeza sobre isso. Posso explicar o que está incluído, pagamento, reserva ou acesso. Se preferir, chamo uma pessoa da equipe.');
    }
    if (intent.topic && !s.config.ai.topics[intent.topic]) return handoff(o, `tema configurado para a equipe responder (${intent.topic})`);
    if (!pv && ['incluso', 'pagamento', 'reserva', 'reservar_sim'].includes(intent.id)) return handoff(o, 'pedido ainda sem preço registrado');

    switch (intent.id) {
      case 'humano': return handoff(o, 'cliente pediu atendimento humano');
      case 'oi': return push(o, 'ia', `Oi! Estou com o seu pedido ${o.code} aberto. Como posso ajudar?`);
      case 'obrigado': return push(o, 'ia', 'Imagina! Se quiser, já posso te explicar como reservar a data.');
      case 'incluso':
        return push(o, 'ia', `O ${pkg.name} inclui:\n${pkg.includes.map((x) => `• ${x}`).join('\n')}\n\nAdicionais (à parte): ${pkg.extras.join('; ').toLowerCase()}.\n\nPorte de até ${pkg.porteBoxes} caixas, com até ${pkg.boxesProvided} caixas fornecidas pela empresa.\nSeu valor registrado: ${brl(pv.value)} (${pv.label.toLowerCase()}, versão ${pv.v}).`);
      case 'armario':
        return push(o, 'ia', 'O posicionamento dos móveis no destino é feito uma vez, conforme a sua orientação. A organização interna de armários e gavetas é um serviço adicional: posso pedir para a equipe te passar o valor, se quiser.');
      case 'caixas':
        return push(o, 'ia', `O ${pkg.name} atende mudanças de porte até ${pkg.porteBoxes} caixas e inclui até ${pkg.boxesProvided} caixas fornecidas pela empresa. Acima de ${pkg.boxesProvided}, o valor cresce gradualmente${s.config.boxes.extraBoxPrice ? ` (${brl(Number(s.config.boxes.extraBoxPrice))} por caixa extra)` : ', e a equipe confirma o acréscimo'}. Você marcou: ${o.draft.boxes.unknown || o.draft.boxes.qty === '' ? 'ainda não sabe a quantidade, sem problema. A equipe ajuda a estimar' : o.draft.boxes.qty + ' caixas'}.`);
      case 'data':
        return push(o, 'ia', `A data ${dateBR(o.draft.route.date)} está como solicitada. Ela é confirmada depois que a equipe verifica a disponibilidade e o sinal é pago${o.deposit.status === 'confirmado' ? '. No seu caso, o sinal já foi confirmado e a data está reservada' : ''}.`);
      case 'pagamento': {
        const p = pv.payments;
        return push(o, 'ia', `Formas de pagamento para ${brl(pv.value)}:\n• Pix ou transferência: ${brl(p.pix)}\n• Débito ou crédito em 1x (+${String(p.pct.debit1x).replace('.', ',')}%): ${brl(p.debit1x)}\n• Crédito em 4x (+${String(p.pct.credit4x).replace('.', ',')}%): ${brl(p.credit4x)}, em 4× ${brl(p.credit4xInstallment)}\n\nO sinal para reserva é de ${pv.depositPct}% do valor contratado.`);
      }
      case 'reserva':
        return push(o, 'ia', `Para reservar:\n1. A equipe confirma a disponibilidade para ${dateBR(o.draft.route.date)} (hoje a data está como solicitada).\n2. Você paga o sinal de ${pv.depositPct}% do valor contratado: ${brl(pv.payments.deposit)} no Pix. No cartão, o sinal acompanha o valor com acréscimo.\n3. Com o sinal confirmado, a data fica reservada e você recebe a confirmação aqui.\n\nO orçamento vale até ${pv.validUntil}. Quer que eu peça para a equipe confirmar a data?`);
      case 'reservar_sim':
        if (o.deposit.status === 'confirmado') return push(o, 'ia', 'Sua reserva já está confirmada! 🎉');
        if (['novo', 'atendimento', 'avaliacao'].includes(o.status)) {
          o.status = 'sinal';
          store.log(o, 'IA', 'Cliente pediu a reserva. Situação: aguardando sinal (disponibilidade a confirmar pela equipe).');
        }
        return push(o, 'ia', `Perfeito! Pedi para a equipe confirmar a disponibilidade de ${dateBR(o.draft.route.date)}. Assim que confirmar, você recebe aqui os dados para o sinal de ${brl(pv.payments.deposit)} (na demonstração, o pagamento é simulado). A reserva só vale depois do sinal confirmado.`);
      case 'acesso': {
        const colchao = findItem(o, /colchao/);
        if (/colchao/.test(t) && /escada/.test(t) && colchao) {
          const already = colchao.path === 'escada';
          colchao.path = 'escada';
          if (!colchao.note) colchao.note = 'Colchão pela escada';
          store.log(o, 'IA', `Instrução registrada pelo atendimento: ${colchao.name} pela escada.`);
          const box = findItem(o, /cama .*box/);
          const boxTxt = box && box.path === 'elevador' ? ' e o box desmontado vai pelo elevador' : '';
          return push(o, 'ia', already
            ? `Já está anotado no pedido ${o.code}: o ${colchao.name.toLowerCase()} desce pela escada${boxTxt}. Escadas estão contempladas nas condições previamente avaliadas do ${pkg.name}, por isso o valor continua ${brl(pv.value)}. A instrução vai em destaque para a equipe da mudança.`
            : `Anotei no pedido ${o.code}: o ${colchao.name.toLowerCase()} vai pela escada${boxTxt}. Escadas estão contempladas nas condições previamente avaliadas do ${pkg.name}; como é uma informação nova, a equipe confirma se muda algo no valor. A instrução vai em destaque para quem fizer a mudança.`);
        }
        return push(o, 'ia', `Escadas estão contempladas nas condições previamente avaliadas do ${pkg.name}. No seu pedido: origem ${JA.accessText(o.draft.access.origin)}; destino ${JA.accessText(o.draft.access.dest)}. Se algum item não couber no elevador, me diga qual que eu anoto para a equipe.`);
      }
      case 'desconto': return handoff(o, 'negociação de preço');
    }
  }

  function findItem(o, re) {
    for (const r of o.draft.rooms) for (const i of r.items) if (i.mode !== 'fica' && re.test(JA.u.norm(i.name))) return i;
    return null;
  }

  function send(text) {
    const s = store.state;
    const o = s.currentOrder && s.orders[s.currentOrder];
    if (!o || !text.trim()) return;
    push(o, 'cliente', text.trim());
    if (o.status === 'novo') o.status = 'atendimento';
    if (o.humanTakeover) {
      store.commit();
      return;
    }
    typing = true;
    store.commit();
    setTimeout(() => {
      typing = false;
      reply(o, text);
      store.commit();
    }, 750);
  }

  JA.chat = { ensureStarted, preparedMessage, reply, handoff };

  function msgHtml(m) {
    const who = m.from === 'ia' ? 'Assistente virtual (IA simulada)' : m.from === 'equipe' ? 'Jéssica · equipe' : '';
    return `<div class="msg ${m.from}">${who ? `<span class="who">${who}</span>` : ''}${esc(m.text)}<span class="time">${new Date(m.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>`;
  }
  JA.msgHtml = msgHtml;

  JA.views.chat = function () {
    const s = store.state;
    const o = s.currentOrder && s.orders[s.currentOrder];
    const pv = o && store.currentPrice(o);
    const quick = o ? (o.status === 'sinal' || o.deposit.status === 'confirmado'
      ? ['Formas de pagamento', 'Quando a data fica confirmada?', 'Falar com uma pessoa']
      : ['O que vem no Prestige?', 'O colchão precisa ir pela escada', 'Como eu reservo?', 'Quero reservar', 'Formas de pagamento', 'Falar com uma pessoa']) : [];
    const html = `<div class="chat-shell">
      <div class="chat-top">
        <a href="${o && o.draft.demoCase !== undefined ? '#/orcamento/4' : '#/'}" class="link-btn" style="color:#fff;text-decoration:none" aria-label="Voltar ao orçamento">←</a>
        <div class="avatar" aria-hidden="true">JA</div>
        <div class="grow"><b>Mudanças Jéssica Araújo</b><div class="sub">${o && o.humanTakeover ? 'Equipe avisada · atendimento humano' : 'Assistente virtual · responde 24h'}</div></div>
        <span class="pill gold">Simulação</span>
      </div>
      ${o ? `<div class="chat-order">
          <span class="mono">${esc(o.code)}</span>
          ${pv ? `<span>${esc(pv.pkgName)} · <b>${brl(pv.value)}</b> <span class="muted">(v${pv.v})</span></span>` : '<span class="pill amber">Aguardando avaliação</span>'}
          <span class="grow"></span>
          <button type="button" class="link-btn small" data-act="showWaMessage">Mensagem do WhatsApp</button>
        </div>
        <div class="notice sim small" style="border-radius:0;border-left:0;border-right:0">Conversa simulada: na produção ela acontece no WhatsApp da empresa, com a IA usando as regras e o preço registrados neste pedido.</div>` : ''}
      <div class="chat-log" aria-live="polite" aria-label="Mensagens">
        ${o ? o.chat.map(msgHtml).join('') : `<div class="msg ia"><span class="who">Assistente virtual (IA simulada)</span>Oi! Para te passar um preço certinho, monte seu orçamento em 4 passos. Leva poucos minutos e eu continuo daqui com tudo preenchido.</div>`}
        ${typing ? '<div class="typing">digitando…</div>' : ''}
      </div>
      ${o ? `<div class="chat-quick" aria-label="Sugestões de perguntas">${quick.map((q) => `<button type="button" class="chip" data-act="quickAsk" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
        <form class="chat-input" data-submit="chatSend">
          <label class="sr-only" for="chat-text">Mensagem</label>
          <input class="input" id="chat-text" name="text" autocomplete="off" placeholder="Escreva sua mensagem">
          <button class="btn btn-wa" type="submit" aria-label="Enviar">${JA.ICON.send}</button>
        </form>`
      : `<div class="chat-input"><button class="btn btn-gold btn-block" data-act="startQuoteEmpty">Começar meu orçamento</button></div>`}
    </div>`;
    return { html, title: 'Atendimento', bodyClass: 'chat-body' };
  };

  Object.assign(JA.actions, {
    chatSend(form) { const v = form.text.value; form.text.value = ''; send(v); setTimeout(() => { const i = document.getElementById('chat-text'); if (i) i.focus(); }, 0); },
    quickAsk(el) { send(el.dataset.q); },
    showWaMessage() {
      const s = store.state, o = s.orders[s.currentOrder];
      const msg = preparedMessage(o, o.evaluation && !store.currentPrice(o));
      const url = `https://wa.me/${JA.BRAND.whatsappNumber}?text=${encodeURIComponent(msg)}`;
      JA.dialog(`<h2>Mensagem preparada para o WhatsApp</h2>
        <p class="small muted">Na produção, o botão do orçamento abre o WhatsApp da empresa com este texto e o código do pedido. O atendimento parte destes dados.</p>
        <pre class="msg-preview">${esc(msg)}</pre>
        <div class="row"><button class="btn btn-navy btn-sm" data-act="closeDialog">Fechar</button>
        <a class="btn btn-ghost btn-sm" href="${esc(url)}" target="_blank" rel="noopener">Abrir no WhatsApp real ↗</a></div>
        <p class="tiny muted">O link real abre o WhatsApp da Jéssica. Use só se quiser mostrar o texto chegando no aplicativo.</p>`);
    },
  });
})();
