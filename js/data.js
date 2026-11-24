/* Dados base da demonstração: catálogo, pacotes, parceiros e caso JA Prestige. */
(function () {
  const JA = (window.JA = window.JA || {});

  JA.BRAND = {
    name: 'Mudanças Jéssica Araújo',
    city: 'São Paulo',
    whatsappNumber: '5511965979403',
    address: 'Av. Padre Antônio José dos Santos, 288 · Cidade Monções, São Paulo',
    // Confirmar com a Jéssica antes de publicar (nota e depoimentos vieram da prévia).
    googleRating: '4,6',
    hours: [
      ['Segunda', '8h às 19h'], ['Terça', '8h às 19h'], ['Quarta', '8h às 19h'],
      ['Quinta', '9h30 às 20h'], ['Sexta', '9h30 às 20h30'], ['Sábado', '10h às 15h30'], ['Domingo', 'Fechado'],
    ],
  };

  /* Custos internos FICTÍCIOS (seguros para publicar).
     Os reais ficam em js/data-internal.local.js, fora do Git. */
  const FICTIONAL_COSTS = {
    label: 'Custos fictícios de demonstração',
    fictional: true,
    truckSmall: 750,
    truckLarge: null, // caminhão maior: valor a definir → avaliação manual
    helper: 150,
    packer: 150,
    boxMaterial: 2,
  };
  const override = window.JA_INTERNAL_OVERRIDE;
  JA.COSTS_BASE = override ? Object.assign({}, FICTIONAL_COSTS, override, { fictional: false }) : FICTIONAL_COSTS;

  JA.ROOM_PRESETS = {
    'Quarto do casal': ['Cama queen (box + cabeceira)', 'Colchão queen', 'Guarda-roupa', 'Criado-mudo', 'Cômoda', 'Roupas', 'Maleiro'],
    'Quarto de hóspedes': ['Cama de casal', 'Colchão de casal', 'Escrivaninha', 'Cadeira de escritório', 'Roupas', 'Sapatos', 'Maleiro'],
    'Quarto': ['Cama de solteiro', 'Guarda-roupa', 'Cômoda', 'Roupas'],
    'Sala': ['Sofá', 'TV', 'Rack', 'Mesa de jantar', 'Cadeiras de jantar', 'Estante', 'Tapete'],
    'Cozinha': ['Geladeira', 'Fogão', 'Micro-ondas', 'Armários', 'Eletrodomésticos pequenos', 'Louças e utensílios'],
    'Área de serviço': ['Máquina de lavar', 'Tanquinho', 'Varal', 'Produtos de limpeza'],
    'Escritório': ['Escrivaninha', 'Cadeira de escritório', 'Estante', 'Computador e monitor', 'Arquivo'],
    'Banheiro': ['Gabinete', 'Itens de banheiro'],
  };

  /* pontos = volume/complexidade aproximados; kind: movel | conteudo (só tem "levar" ou "fica") */
  JA.CATALOG = {
    'Cama queen (box + cabeceira)': { pts: 5, kind: 'movel', disassemble: true },
    'Colchão queen': { pts: 3, kind: 'movel' },
    'Cama king (box + cabeceira)': { pts: 6, kind: 'movel', disassemble: true },
    'Cama de casal': { pts: 5, kind: 'movel', disassemble: true },
    'Colchão de casal': { pts: 3, kind: 'movel' },
    'Cama de solteiro': { pts: 3, kind: 'movel', disassemble: true },
    'Guarda-roupa': { pts: 8, kind: 'movel', disassemble: true },
    'Criado-mudo': { pts: 1, kind: 'movel' },
    'Cômoda': { pts: 3, kind: 'movel' },
    'Escrivaninha': { pts: 2, kind: 'movel', disassemble: true },
    'Cadeira de escritório': { pts: 1, kind: 'movel' },
    'Sofá': { pts: 6, kind: 'movel' },
    'TV': { pts: 1.5, kind: 'movel', fragile: true },
    'Rack': { pts: 3, kind: 'movel', disassemble: true },
    'Mesa de jantar': { pts: 4, kind: 'movel', disassemble: true },
    'Cadeiras de jantar': { pts: 0.5, kind: 'movel' },
    'Estante': { pts: 3, kind: 'movel', disassemble: true },
    'Tapete': { pts: 1, kind: 'movel' },
    'Geladeira': { pts: 5, kind: 'movel' },
    'Fogão': { pts: 3, kind: 'movel' },
    'Micro-ondas': { pts: 1, kind: 'movel' },
    'Máquina de lavar': { pts: 4, kind: 'movel' },
    'Tanquinho': { pts: 2, kind: 'movel' },
    'Armários': { pts: 6, kind: 'movel', disassemble: true },
    'Maleiro': { pts: 4, kind: 'movel' },
    'Gabinete': { pts: 2, kind: 'movel' },
    'Arquivo': { pts: 2, kind: 'movel' },
    'Computador e monitor': { pts: 1, kind: 'conteudo', fragile: true },
    'Roupas': { pts: 1, kind: 'conteudo' },
    'Sapatos': { pts: 0.5, kind: 'conteudo' },
    'Eletrodomésticos pequenos': { pts: 1, kind: 'conteudo' },
    'Louças e utensílios': { pts: 1, kind: 'conteudo', fragile: true },
    'Varal': { pts: 0.5, kind: 'movel' },
    'Produtos de limpeza': { pts: 0.5, kind: 'conteudo' },
    'Itens de banheiro': { pts: 0.5, kind: 'conteudo' },
  };
  JA.DEFAULT_ITEM = { pts: 2, kind: 'movel' };

  /* Bairros → região (para distribuição aos parceiros). Lista curta de exemplo. */
  JA.REGIONS = ['Zona Sul', 'Zona Oeste', 'Centro', 'Zona Leste', 'Zona Norte', 'ABC e Grande SP'];
  JA.NEIGHBORHOODS = {
    'Zona Sul': ['moema', 'campo belo', 'cidade monções', 'brooklin', 'vila mariana', 'saúde', 'ipiranga', 'jabaquara', 'santo amaro', 'itaim', 'vila olímpia', 'morumbi', 'campo limpo', 'interlagos', 'cursino', 'vila clementino', 'chácara santo antônio', 'zona sul'],
    'Zona Oeste': ['pinheiros', 'vila madalena', 'perdizes', 'lapa', 'butantã', 'alto de pinheiros', 'jaguaré', 'pompeia', 'barra funda', 'zona oeste'],
    'Centro': ['centro', 'bela vista', 'consolação', 'república', 'liberdade', 'higienópolis', 'santa cecília', 'jardins', 'paraíso', 'cambuci', 'aclimação'],
    'Zona Leste': ['tatuapé', 'mooca', 'penha', 'itaquera', 'vila prudente', 'belém', 'carrão', 'anália franco', 'são mateus', 'zona leste'],
    'Zona Norte': ['santana', 'tucuruvi', 'vila guilherme', 'casa verde', 'mandaqui', 'freguesia do ó', 'vila maria', 'zona norte'],
    'ABC e Grande SP': ['santo andré', 'são bernardo', 'são caetano', 'diadema', 'osasco', 'guarulhos', 'barueri', 'taboão', 'mauá', 'cotia'],
  };

  JA.PACKAGES_SEED = [
    {
      id: 'prestige',
      name: 'JA Prestige',
      confirmed: true,
      active: true,
      tagline: 'Mudança completa, do planejamento ao último móvel no lugar.',
      porteBoxes: 100,      // porte descrito no pacote
      boxesProvided: 80,    // caixas fornecidas pela empresa
      priceFactor: 1,
      includes: [
        'Planejamento e coordenação da mudança',
        'Equipe especializada e uniformizada',
        'Embalagem profissional',
        'Materiais de proteção (plástico bolha, filme, mantas)',
        'Desmontagem e montagem necessárias',
        'Transporte',
        'Organização dos volumes por cômodo',
        'Escadas contempladas nas condições previamente avaliadas',
        'Posicionamento dos móveis uma vez, conforme sua orientação',
      ],
      extras: [
        'Organização interna de armários e gavetas',
        'Caixas acima das 80 fornecidas (acréscimo gradual)',
      ],
    },
  ];

  JA.PARTNERS_SEED = [
    {
      id: 'p1', name: 'Rota Sul Mudanças', contact: 'Marcos (fictício)',
      regions: ['Zona Sul', 'Centro', 'Zona Oeste'], weekdays: [1, 2, 3, 4, 5, 6],
      priority: 1, training: 'aprovado', active: true, trucks: 'Caminhão baú 3/4',
    },
    {
      id: 'p2', name: 'Leste Carga & Cuidado', contact: 'Renata (fictícia)',
      regions: ['Zona Leste', 'Zona Sul', 'ABC e Grande SP'], weekdays: [1, 2, 3, 4, 5, 6],
      priority: 2, training: 'aprovado', active: true, trucks: 'Caminhão baú 3/4 e HR',
    },
    {
      id: 'p3', name: 'Norte Fácil Transportes', contact: 'Diego (fictício)',
      regions: ['Zona Norte', 'Zona Oeste', 'Centro'], weekdays: [0, 1, 2, 3, 4, 5, 6],
      priority: 3, training: 'em_treinamento', active: true, trucks: 'Caminhão toco',
    },
  ];

  JA.AI_TOPICS = [
    { id: 'incluso', label: 'O que está incluído no pacote' },
    { id: 'pagamento', label: 'Formas de pagamento e acréscimos' },
    { id: 'reserva', label: 'Sinal e como reservar' },
    { id: 'acesso', label: 'Instruções de acesso (escada, elevador)' },
    { id: 'caixas', label: 'Caixas e materiais' },
    { id: 'data', label: 'Data e disponibilidade' },
    { id: 'desconto', label: 'Desconto e negociação de preço' },
  ];

  JA.CONFIG_SEED = {
    previewMarkup: 100,
    markupOptions: [60, 70, 80, 100],
    depositPct: 60,
    payment: { debit1x: 4.01, credit1x: 4.01, credit4x: 7.01 },
    validity: 'mes_vigente',
    boxes: { included: 80, porte: 100, extraBoxPrice: null },
    travel: { pricePerKm: null },
    access: { maxFloorStairsOnly: 4 },
    capacity: { smallTruckPts: 120, maxPts: 160 },
    materialsMarkup: false,
    ai: {
      topics: { incluso: true, pagamento: true, reserva: true, acesso: true, caixas: true, data: true, desconto: false },
      handoffAfterUnknown: 1,
      offHoursOn: true,
    },
  };

  /* Caso de demonstração anonimizado (mudança real informada pela Jéssica, sem endereços). */
  JA.DEMO_CASE = function () {
    const it = (name, qty, mode, extra) => Object.assign({ name, qty, mode }, extra || {});
    return {
      demoCase: true,
      route: {
        from: 'Moema, São Paulo (endereço omitido)',
        to: 'Campo Belo, São Paulo (endereço omitido)',
        date: '2027-01-16',
        type: 'local',
        distanceKm: '',
      },
      rooms: [
        { name: 'Quarto do casal', items: [
          it('Cama queen (box + cabeceira)', 1, 'levar', { path: 'elevador', note: 'Box desmontado vai pelo elevador', disassemble: true, assemble: true }),
          it('Colchão queen', 1, 'levar', { path: 'escada', note: 'Colchão queen pela escada (não cabe no elevador)' }),
          it('Roupas', 1, 'levar'),
          it('Maleiro', 1, 'conteudo', { note: 'Levar o conteúdo do maleiro' }),
        ] },
        { name: 'Quarto de hóspedes', items: [
          it('Cama de casal', 1, 'levar', { disassemble: true, assemble: true }),
          it('Escrivaninha', 1, 'levar'),
          it('Cadeira de escritório', 1, 'levar'),
          it('Roupas', 1, 'levar'),
          it('Sapatos', 1, 'levar'),
          it('Maleiro', 1, 'conteudo'),
        ] },
        { name: 'Sala', items: [
          it('Sofá', 1, 'levar'),
          it('TV', 1, 'levar'),
          it('Mesa de jantar', 1, 'levar', { disassemble: true, assemble: true }),
          it('Cadeiras de jantar', 4, 'levar'),
          it('Cadeira de escritório', 1, 'levar'),
          it('Rack', 1, 'conteudo', { note: 'O rack fica; levar só o conteúdo' }),
        ] },
        { name: 'Cozinha', items: [
          it('Geladeira', 1, 'levar'),
          it('Armários', 1, 'conteudo'),
          it('Eletrodomésticos pequenos', 1, 'levar', { note: 'Conforme a lista informada no pedido' }),
          it('Fogão', 1, 'fica'),
          it('Máquina de lavar', 1, 'fica'),
        ] },
      ],
      boxes: { unknown: true, qty: '' },
      access: {
        origin: { floor: 10, elevator: 'servico', bigFits: 'parcial' },
        dest: { floor: 9, elevator: 'servico', bigFits: 'parcial' },
      },
      services: { packing: 'completa', disassembly: true, assembly: true, fragileCare: true, notes: '' },
      contact: { name: 'Cliente demonstração', phone: '' },
    };
  };

  /* Caso interno de referência (composição informada). */
  JA.REFERENCE_INTERNAL = { helpers: 3, packers: 1, truck: 'small', historicPrice: 2970 };
  JA.REFERENCE_PRICE = 2970;

  JA.EMPTY_DRAFT = function () {
    return {
      demoCase: false,
      route: { from: '', to: '', date: '', type: 'local', distanceKm: '' },
      rooms: [
        { name: 'Quarto do casal', items: [] },
        { name: 'Sala', items: [] },
        { name: 'Cozinha', items: [] },
      ],
      boxes: { unknown: false, qty: '' },
      access: {
        origin: { floor: '', elevator: '', bigFits: '' },
        dest: { floor: '', elevator: '', bigFits: '' },
      },
      services: { packing: 'completa', disassembly: true, assembly: true, fragileCare: true, notes: '' },
      contact: { name: '', phone: '' },
    };
  };

  JA.STATUSES = [
    { id: 'novo', label: 'Novo pedido', tone: 'blue' },
    { id: 'atendimento', label: 'Em atendimento', tone: 'blue' },
    { id: 'avaliacao', label: 'Aguardando avaliação', tone: 'amber' },
    { id: 'sinal', label: 'Aguardando sinal', tone: 'amber' },
    { id: 'fechado', label: 'Fechado', tone: 'green' },
    { id: 'oferecido', label: 'Oferecido ao parceiro', tone: 'violet' },
    { id: 'confirmado', label: 'Parceiro confirmado', tone: 'green' },
    { id: 'concluido', label: 'Concluído', tone: 'gray' },
  ];

  JA.PROGRESS_STEPS = [
    { id: 'aceito', label: 'Serviço aceito' },
    { id: 'a_caminho', label: 'Equipe a caminho' },
    { id: 'embalando', label: 'Embalando na origem' },
    { id: 'transporte', label: 'Em transporte' },
    { id: 'montando', label: 'Montando no destino' },
    { id: 'concluido', label: 'Mudança concluída' },
  ];
})();
