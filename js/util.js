(function () {
  const JA = (window.JA = window.JA || {});
  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  JA.u = {
    brl: (v) => (v == null || isNaN(v) ? '—' : fmt.format(v)),
    round2: (v) => Math.round((v + Number.EPSILON) * 100) / 100,
    esc: (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
    uid: () => Math.random().toString(36).slice(2, 9),
    clone: (o) => JSON.parse(JSON.stringify(o)),
    dateBR: (iso) => {
      if (!iso) return 'a combinar';
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    },
    dateLong: (iso) => {
      if (!iso) return 'Data a combinar';
      const d = new Date(iso + 'T12:00:00');
      return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    },
    weekday: (iso) => (iso ? new Date(iso + 'T12:00:00').getDay() : null),
    nowLabel: (ts) => {
      const d = ts ? new Date(ts) : new Date();
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    },
    endOfMonth: () => {
      const n = new Date();
      const e = new Date(n.getFullYear(), n.getMonth() + 1, 0);
      return e.toLocaleDateString('pt-BR');
    },
    norm: (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
    plural: (n, one, many) => `${n} ${n === 1 ? one : many}`,
  };
})();
