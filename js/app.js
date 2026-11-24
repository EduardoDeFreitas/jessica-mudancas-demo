/* Roteador, barra de demonstração e ligação de eventos. */
(function () {
  const JA = window.JA;
  const { esc } = JA.u;
  const store = JA.store;
  JA.views = JA.views || {};
  JA.actions = JA.actions || {};

  /* ---------- Caminhos no estado (data-bind="draft.route.from") ---------- */
  function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
  function setPath(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => o[k], obj);
    target[last] = value;
  }
  JA.getPath = getPath;

  /* ---------- Rotas ---------- */
  function parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean);
    return { parts, name: parts[0] || '' };
  }
  JA.go = function (hash) {
    if (location.hash === hash) render(true);
    else location.hash = hash;
  };

  const ICON = {
    box: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg>',
    wa: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.5-.3z"/></svg>',
    send: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z"/></svg>',
  };
  JA.ICON = ICON;

  function currentNav() {
    const { name } = parse();
    if (name === 'orcamento') return 'orcamento';
    if (name === 'atendimento') return 'atendimento';
    if (name === 'painel') return 'painel';
    if (name === 'parceiro') return 'parceiro';
    return 'site';
  }

  function demobar() {
    const s = store.state;
    const code = s.currentOrder;
    const o = code && s.orders[code];
    const cur = currentNav();
    const link = (id, href, label) => `<a href="${href}" ${cur === id ? 'aria-current="page"' : ''}>${label}</a>`;
    let partnerHref = '#/parceiro';
    if (o) {
      const pid = (store.activeOffer(o) || {}).partnerId || o.partner.assigned;
      if (pid) partnerHref = `#/parceiro/servico/${code}`;
    }
    return `<div class="wrap">
      <span class="tag" title="Modo demonstração">DEMO</span>
      ${o ? `<span class="code hide-sm" aria-label="Pedido da apresentação">${esc(code)}</span>` : ''}
      <nav aria-label="Áreas da demonstração">
        ${link('site', '#/', 'Site')}
        ${link('orcamento', '#/orcamento', 'Orçamento')}
        ${link('atendimento', '#/atendimento', '<span class="hide-sm">Atendimento</span><span class="show-sm">Chat</span>')}
        ${link('painel', o ? `#/painel/pedido/${code}` : '#/painel', 'Painel')}
        ${link('parceiro', partnerHref, 'Parceiro')}
        <button type="button" data-act="openGuide">Roteiro</button>
      </nav>
      <button type="button" class="reset" data-act="resetDemo" aria-label="Reiniciar a apresentação" title="Reiniciar a apresentação">↺<span class="hide-sm"> Reiniciar</span></button>
    </div>`;
  }

  /* ---------- Render ---------- */
  let lastRoute = null;
  function render(forceTop) {
    const app = document.getElementById('app');
    const route = parse();
    const key = location.hash;
    const routeChanged = key !== lastRoute;
    lastRoute = key;

    // Preserva foco e posição ao re-renderizar a mesma tela
    const active = document.activeElement;
    const focusId = active && active.id;
    const selStart = active && typeof active.selectionStart === 'number' ? active.selectionStart : null;
    const scrollY = window.scrollY;
    const chatLog = document.querySelector('.chat-log');
    const chatAtBottom = chatLog ? chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight < 40 : true;

    let view;
    const p = route.parts;
    switch (route.name) {
      case 'orcamento': view = JA.views.quote(p[1] ? Number(p[1]) : null); break;
      case 'atendimento': view = JA.views.chat(); break;
      case 'painel':
        if (p[1] === 'pedido' && p[2]) view = JA.views.panelOrder(p[2]);
        else if (p[1] === 'config') view = JA.views.panelConfig();
        else view = JA.views.panel();
        break;
      case 'parceiro':
        view = p[1] === 'servico' && p[2] ? JA.views.partnerJob(p[2]) : JA.views.partner();
        break;
      default: view = JA.views.home();
    }
    document.getElementById('demobar').innerHTML = demobar();
    app.innerHTML = `<div class="${routeChanged ? 'view' : ''}">${view.html}</div>`;
    document.body.className = view.bodyClass || '';
    document.title = view.title ? `${view.title} · Mudanças Jéssica Araújo` : 'Mudanças Jéssica Araújo · Quanto vai custar a sua mudança?';

    if (routeChanged || forceTop) {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => window.scrollTo(0, 0));
      const h = app.querySelector('h1, h2');
      if (h && route.name && !forceTop) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    } else {
      window.scrollTo(0, scrollY);
      if (focusId) {
        const el = document.getElementById(focusId);
        if (el) { el.focus({ preventScroll: true }); if (selStart != null && el.setSelectionRange) try { el.setSelectionRange(selStart, selStart); } catch (e) { /* tipo sem seleção */ } }
      }
    }
    const log = document.querySelector('.chat-log');
    if (log && (routeChanged || chatAtBottom)) log.scrollTop = log.scrollHeight;
    if (view.after) view.after();
  }
  JA.render = render;
  store.listeners.push(() => render(false));

  /* ---------- Toast e diálogo ---------- */
  JA.toast = function (text) {
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  };
  JA.dialog = function (html) {
    let d = document.getElementById('dlg');
    if (!d) { d = document.createElement('dialog'); d.id = 'dlg'; document.body.appendChild(d); }
    d.innerHTML = `<div class="dlg">${html}</div>`;
    d.showModal();
    return d;
  };
  JA.closeDialog = function () { const d = document.getElementById('dlg'); if (d && d.open) d.close(); };

  /* ---------- Ações globais ---------- */
  Object.assign(JA.actions, {
    resetDemo() {
      if (!confirm('Reiniciar a apresentação? O pedido de demonstração e as alterações serão apagados deste navegador.')) return;
      store.reset();
      JA.go('#/');
      JA.toast('Apresentação reiniciada.');
    },
    closeDialog() { JA.closeDialog(); },
    goto(el) { JA.go(el.dataset.href); },
    openGuide() {
      const s = store.state, o = s.currentOrder && s.orders[s.currentOrder];
      const steps = [
        ['Abrir o site e carregar a mudança de exemplo', s.draft.demoCase || (o && o.draft.demoCase)],
        ['Passar pelos 4 passos, voltar e editar um item', s.ui.reachedStep4 && s.ui.editedBack],
        ['Ver o JA Prestige de R$ 2.970 e as condições', !!(o && o.priceVersions.length)],
        ['Continuar no chat simulado com o pedido', !!(o && o.chat.some((m) => m.from === 'cliente'))],
        ['Abrir no painel e simular o sinal confirmado', !!(o && o.deposit.status === 'confirmado')],
        ['Encaminhar: 1º parceiro indisponível, próximo aceita', !!(o && o.partner.attempts.some((a) => a.status === 'indisponivel' || a.status === 'recusado') && o.partner.assigned)],
        ['Ver a instrução do colchão na área do parceiro', !!(o && o.partnerViewed)],
      ];
      JA.dialog(`<h2>Roteiro da apresentação</h2>
        <p class="small muted">Pedido: <b class="mono">${o ? esc(o.code) : 'ainda não criado'}</b>. Os passos marcam sozinhos conforme você avança.</p>
        <ol class="progress-steps">${steps.map(([t, ok], i) => `<li class="${ok ? 'done' : ''}"><span>${i + 1}. ${t}</span><span aria-label="${ok ? 'feito' : 'pendente'}">${ok ? '✓' : '○'}</span></li>`).join('')}</ol>
        <div class="row"><button class="btn btn-navy btn-sm" data-act="closeDialog">Fechar</button></div>`);
    },
  });

  /* ---------- Delegação de eventos ---------- */
  function coerce(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.dataset.type === 'number') return el.value === '' ? '' : Number(el.value);
    return el.value;
  }
  function onBind(e) {
    const el = e.target.closest('[data-bind]');
    if (!el) return;
    if (e.type === 'input' && (el.type === 'radio' || el.type === 'checkbox' || el.tagName === 'SELECT')) return;
    setPath(store.state, el.dataset.bind, coerce(el));
    const rerender = el.dataset.rerender != null || el.type === 'radio' || el.type === 'checkbox' || el.tagName === 'SELECT';
    if (el.dataset.onchange && JA.actions[el.dataset.onchange]) JA.actions[el.dataset.onchange](el, e);
    if (e.type === 'change' || rerender) store.commit(rerender);
    else store.save();
  }
  document.addEventListener('input', onBind);
  document.addEventListener('change', onBind);
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = JA.actions[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-submit]');
    if (!f) return;
    e.preventDefault();
    const fn = JA.actions[f.dataset.submit];
    if (fn) fn(f, e);
  });
  window.addEventListener('hashchange', () => render(false));
  window.addEventListener('DOMContentLoaded', () => render(false));
})();
