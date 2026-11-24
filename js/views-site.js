/* Página inicial (site público). */
(function () {
  const JA = window.JA;
  const { esc } = JA.u;
  const store = JA.store;
  const I = (p) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICONS = {
    home: I('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    office: I('<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/>'),
    box: I('<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>'),
    glass: I('<path d="M8 3h8l-1 7a3 3 0 0 1-6 0z"/><path d="M12 13v7M8 21h8"/>'),
  };

  JA.views.home = function () {
    const s = store.state;
    const b = JA.BRAND;
    const gallery = [
      ['entrega.jpg', 'Móvel embalado com plástico bolha pela equipe'],
      ['sofas.jpg', 'Sofás embalados e identificados'],
      ['caixas.jpg', 'Caixas organizadas por cômodo'],
      ['frageis.jpg', 'Itens frágeis embalados um a um'],
      ['equipe.jpg', 'Equipe carregando espelho com proteção'],
      ['embalado-1.jpg', 'Móvel protegido para transporte'],
      ['embalado-2.jpg', 'Móvel embalado na sala'],
      ['fragil.jpg', 'Embalagem com fita de frágil'],
    ];
    const html = `
    <header class="site-header">
      <div class="wrap">
        <a class="logo" href="#/" aria-label="Mudanças Jéssica Araújo, início">
          <span class="mark">${JA.ICON.box}</span>
          <span><small>MUDANÇAS</small><strong>Jéssica Araújo</strong></span>
        </a>
        <nav class="site-nav" aria-label="Seções">
          <a href="#servicos" data-act="scrollTo" data-target="servicos">Serviços</a>
          <a href="#embalagem" data-act="scrollTo" data-target="embalagem">Embalagem</a>
          <a href="#galeria" data-act="scrollTo" data-target="galeria">Galeria</a>
          <a href="#avaliacoes" data-act="scrollTo" data-target="avaliacoes">Avaliações</a>
          <a href="#contato" data-act="scrollTo" data-target="contato">Contato</a>
        </nav>
        <button class="btn btn-gold btn-sm" data-act="startQuoteEmpty">Orçamento</button>
      </div>
    </header>

    <section class="hero on-dark" aria-labelledby="hero-title">
      <div class="wrap hero-grid">
        <div>
          <p class="eyebrow">Mudanças em São Paulo · embalagem premium</p>
          <h1 id="hero-title">Quanto vai custar a sua <em>mudança?</em></h1>
          <p class="lead">Monte a lista dos seus móveis, veja o preço e tudo o que está incluído antes de falar com a gente.</p>
          <form class="quote-box" data-submit="startQuote" id="hero-form" aria-label="Começar orçamento">
            <label class="field" for="h-from"><span>De onde você vai sair?</span>
              <input class="input" id="h-from" name="from" autocomplete="address-level3" placeholder="Bairro ou cidade" value="${esc(s.draft.demoCase ? '' : s.draft.route.from)}"></label>
            <label class="field" for="h-to"><span>Pra onde vai?</span>
              <input class="input" id="h-to" name="to" autocomplete="off" placeholder="Bairro ou cidade" value="${esc(s.draft.demoCase ? '' : s.draft.route.to)}"></label>
            <div class="hero-actions" id="hero-actions">
              <button class="btn btn-gold" type="submit">Começar meu orçamento</button>
              <button class="btn btn-ghost" type="button" data-act="openWhatsApp">${JA.ICON.wa} Falar no WhatsApp</button>
            </div>
          </form>
          <p class="demo-link">Modo demonstração · <button type="button" class="link-btn" data-act="loadDemo">Testar com uma mudança de exemplo</button></p>
          <div class="trust" aria-label="Diferenciais">
            <span>🛡 Proteção total</span><span>📦 Embalagem premium</span><span>🏷 Caixas etiquetadas por cômodo</span>
          </div>
        </div>
        <div class="hero-photo">
          <img src="assets/img/entrega.jpg" alt="Jéssica ao lado de um móvel embalado com plástico bolha" width="1200" height="1000" fetchpriority="high">
          <div class="badge-rating">${esc(b.googleRating)} ★<span>no Google</span></div>
        </div>
      </div>
    </section>

    <section class="section" id="servicos" aria-labelledby="t-serv">
      <div class="wrap">
        <div class="section-head"><p class="eyebrow">Serviços</p><h2 id="t-serv">Tudo o que a sua mudança precisa.</h2>
          <p class="muted">Do apartamento pequeno ao escritório inteiro, com o mesmo cuidado em cada caixa.</p></div>
        <div class="grid grid-4">
          ${[
            [ICONS.home, 'Mudança residencial', 'Casas e apartamentos, com planejamento do dia e equipe dedicada.'],
            [ICONS.office, 'Mudança comercial', 'Escritórios e lojas, com o mínimo de tempo parado.'],
            [ICONS.box, 'Embalagem profissional', 'Móveis e utensílios embalados com material de alta qualidade.'],
            [ICONS.glass, 'Itens frágeis', 'Louças, vidros, espelhos e peças delicadas protegidas uma a uma.'],
          ].map(([ic, t, d]) => `<article class="card service"><div class="ico">${ic}</div><h3>${t}</h3><p class="muted small">${d}</p></article>`).join('')}
        </div>
      </div>
    </section>

    <section class="section section-alt" id="embalagem" aria-labelledby="t-emb">
      <div class="wrap pack-split">
        <div>
          <p class="eyebrow">Embalagem premium</p>
          <h2 id="t-emb">Cada item chega como saiu.</h2>
          <p class="muted">É o que os clientes mais elogiam: o cuidado na hora de embalar. O mesmo padrão vale para as equipes parceiras treinadas pela Jéssica.</p>
          <ul class="check-list">
            <li>Móveis protegidos com plástico bolha e filme</li>
            <li>Louças e itens frágeis embalados um a um</li>
            <li>Caixas etiquetadas por cômodo, para desembalar sem caos</li>
            <li>Equipe uniformizada e identificada</li>
          </ul>
          <button class="btn btn-navy" data-act="startQuoteEmpty">Ver quanto custa a minha mudança</button>
        </div>
        <div class="photo-stack">
          <img src="assets/img/sofas.jpg" alt="Sofás embalados e identificados" loading="lazy">
          <img src="assets/img/fragil.jpg" alt="Móvel com fita de frágil" loading="lazy">
          <img src="assets/img/caixas.jpg" alt="Caixas identificadas organizadas no cômodo" loading="lazy">
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="t-como">
      <div class="wrap">
        <div class="section-head"><p class="eyebrow">Orçamento online</p><h2 id="t-como">Preço na tela em 4 passos.</h2>
          <p class="muted">Você vê o valor e o que está incluído. Depois continua no WhatsApp com tudo preenchido, sem explicar de novo.</p></div>
        <ol class="grid grid-4" style="list-style:none;padding:0;margin:0">
          ${['Trajeto e data', 'Inventário por cômodo', 'Acesso e serviços', 'Conferência e preço'].map((t, i) => `<li class="card-soft"><span class="price-label">Passo ${i + 1}</span><h3 style="margin-top:6px">${t}</h3></li>`).join('')}
        </ol>
        <div class="row" style="margin-top:18px"><button class="btn btn-gold" data-act="startQuoteEmpty">Começar meu orçamento</button></div>
      </div>
    </section>

    <section class="section section-alt" id="galeria" aria-labelledby="t-gal">
      <div class="wrap">
        <div class="section-head"><p class="eyebrow">Nosso trabalho</p><h2 id="t-gal">Fotos de mudanças reais.</h2></div>
        <div class="gallery">
          ${gallery.map(([f, alt]) => `<figure><img src="assets/img/${f}" alt="${esc(alt)}" loading="lazy"><figcaption>${esc(alt)}</figcaption></figure>`).join('')}
        </div>
      </div>
    </section>

    <section class="section" id="avaliacoes" aria-labelledby="t-av">
      <div class="wrap">
        <!-- Confirmar nota e depoimentos com a Jéssica antes de publicar -->
        <div class="section-head"><p class="eyebrow">★ ${esc(b.googleRating)} no Google</p><h2 id="t-av">Quem mudou com a gente recomenda.</h2></div>
        <div class="grid grid-2">
          <article class="review"><div class="stars" aria-label="5 estrelas">★★★★★</div>
            <blockquote>“Uma grata surpresa em meio ao caos da mudança. Equipe profissional, rápida e organizada, com tudo embalado com muito cuidado e as caixas etiquetadas.”</blockquote>
            <p class="small muted">Cliente · avaliação no Google</p></article>
          <article class="review"><div class="stars" aria-label="5 estrelas">★★★★★</div>
            <blockquote>“Sou cliente há anos e não troco. Tenho muitos itens delicados e todos foram embalados com muito profissionalismo. Indico demais!”</blockquote>
            <p class="small muted">Cliente · avaliação no Google</p></article>
        </div>
      </div>
    </section>

    <section class="section section-alt" id="contato" aria-labelledby="t-ct">
      <div class="wrap grid grid-2">
        <div>
          <p class="eyebrow">Contato</p><h2 id="t-ct">Fale com a gente.</h2>
          <p>📍 ${esc(b.address)}</p>
          <p class="small muted">🏳️‍🌈 Empresa que acolhe a comunidade LGBTQ+</p>
          <div class="row"><button class="btn btn-gold" data-act="startQuoteEmpty">Pedir orçamento</button>
            <button class="btn btn-wa" data-act="openWhatsApp">${JA.ICON.wa} WhatsApp</button></div>
        </div>
        <div class="card">
          <h3>Horário de atendimento</h3>
          <dl class="hours">${b.hours.map(([d, h]) => `<dt>${d}</dt><dd style="margin:0">${h}</dd>`).join('')}</dl>
          <p class="small muted" style="margin-top:12px">O atendimento com IA responde fora do horário e passa para a equipe quando precisa.</p>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="wrap">
        <div>© Mudanças Jéssica Araújo · São Paulo</div>
        <div class="foot-links"><a href="#/parceiro">Área do parceiro</a><a href="#/painel">Painel da equipe</a></div>
        <p class="tiny" style="margin-top:12px;opacity:.75">Demonstração criada pela PMV Sistemas. Integrações de WhatsApp, IA e pagamento estão simuladas.</p>
      </div>
    </footer>

    <div class="wa-bar" id="wa-bar" aria-hidden="true">
      <div class="inner">
        <button class="btn btn-gold btn-sm" data-act="startQuoteEmpty" tabindex="-1">Ver meu preço</button>
        <button class="btn btn-wa btn-sm" data-act="openWhatsApp" tabindex="-1">${JA.ICON.wa} WhatsApp</button>
      </div>
    </div>`;

    return {
      html, bodyClass: 'has-wa-bar', title: '',
      after() {
        // Barra fixa aparece só depois que os botões do topo saem da tela
        const bar = document.getElementById('wa-bar');
        const target = document.getElementById('hero-actions');
        if (!bar || !target || !('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver(([en]) => {
          const show = !en.isIntersecting && en.boundingClientRect.top < 0;
          bar.classList.toggle('show', show);
          bar.setAttribute('aria-hidden', String(!show));
          bar.querySelectorAll('button').forEach((x) => (x.tabIndex = show ? 0 : -1));
        });
        io.observe(target);
      },
    };
  };

  Object.assign(JA.actions, {
    scrollTo(el) {
      const t = document.getElementById(el.dataset.target);
      if (t) { t.scrollIntoView({ behavior: 'smooth' }); const h = t.querySelector('h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
    },
    startQuote(form) {
      store.startQuote(form.from.value.trim(), form.to.value.trim());
      JA.go('#/orcamento/1');
    },
    startQuoteEmpty() {
      const f = document.getElementById('hero-form');
      store.startQuote(f ? f.from.value.trim() : null, f ? f.to.value.trim() : null);
      JA.go('#/orcamento/1');
    },
    loadDemo() {
      store.loadDemo();
      JA.toast('Mudança de exemplo carregada (dados anonimizados).');
      JA.go('#/orcamento/1');
    },
    openWhatsApp() {
      // Na demonstração o WhatsApp é simulado: abre o atendimento dentro da aplicação.
      JA.go('#/atendimento');
    },
  });
})();
