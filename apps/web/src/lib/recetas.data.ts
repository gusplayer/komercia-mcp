// Recetas (prompts library) shared between the landing modal and the
// sign-in page modal. Each receta has a bilingual user prompt and a
// short simulated Claude response (Spanish-only — realistic store data
// stays Spanish/Colombian for cultural fit).

export type RecetaCat = 'analitica' | 'reportes' | 'operacion' | 'migracion';

export interface Receta {
  cat: RecetaCat;
  catEs: string;
  catEn: string;
  promptEs: string;
  promptEn: string;
  response: string[];
  tools: string[];
}

export const categories: readonly RecetaCat[] = ['analitica', 'reportes', 'operacion', 'migracion'] as const;

export const recetas: Receta[] = [
  {
    cat: 'analitica', catEs: 'analítica', catEn: 'analytics',
    promptEs: '¿Cuál fue mi producto más vendido el mes pasado? Top 5 con totales.',
    promptEn: 'What was my best-selling product last month? Top 5 with totals.',
    response: [
      'consultando export_orders + export_products...',
      '',
      'top 5 del último mes:',
      '  1. camiseta negra L     · 47 uds · $1.84M COP',
      '  2. pines edición lim.   · 31 uds · $1.24M COP',
      '  3. bolso lona           · 22 uds · $880K COP',
      '  4. stickers pack        · 18 uds · $360K COP',
      '  5. gorra snapback       · 14 uds · $560K COP',
      '',
      'total top 5: $4.88M COP (62% del mes).',
    ],
    tools: ['export_orders', 'export_products'],
  },
  {
    cat: 'analitica', catEs: 'analítica', catEn: 'analytics',
    promptEs: 'Compara mis ventas de este mes vs el anterior. ¿Qué productos crecieron y cuáles cayeron?',
    promptEn: "Compare this month's sales vs last month. Which products grew and which fell?",
    response: [
      'septiembre: $12.4M COP (↑18% vs agosto)',
      '',
      'crecieron:',
      '  camisetas    +34%',
      '  bolsos       +22%',
      '  accesorios   +11%',
      '',
      'cayeron:',
      '  gorras       -8%',
      '  stickers     -12%',
    ],
    tools: ['export_orders', 'export_products'],
  },
  {
    cat: 'analitica', catEs: 'analítica', catEn: 'analytics',
    promptEs: '¿Quiénes son mis 10 mejores clientes por monto comprado en los últimos 6 meses?',
    promptEn: 'Who are my top 10 customers by purchase amount in the last 6 months?',
    response: [
      'top 10 clientes (últimos 6 meses):',
      '  1. m.gomez@...      · $890K · 8 órdenes',
      '  2. l.rivera@...     · $670K · 5 órdenes',
      '  3. p.castro@...     · $540K · 6 órdenes',
      '  4. a.martin@...     · $510K · 4 órdenes',
      '  5. j.salazar@...    · $470K · 7 órdenes',
      '  +5 más con email completo',
    ],
    tools: ['export_customers', 'export_orders'],
  },
  {
    cat: 'analitica', catEs: 'analítica', catEn: 'analytics',
    promptEs: '¿Qué método de pago usan más mis clientes? Dame el porcentaje por cada uno.',
    promptEn: 'Which payment method do my customers use most? Give me the percentage for each.',
    response: [
      'distribución últimos 30 días:',
      '  PSE              47%',
      '  tarjeta crédito  31%',
      '  Nequi            14%',
      '  efectivo          8%',
    ],
    tools: ['export_orders', 'list_payment_gateways'],
  },
  {
    cat: 'analitica', catEs: 'analítica', catEn: 'analytics',
    promptEs: 'Identifica productos que venden bien pero tienen poco stock. Lista los que se van a quedar sin inventario en menos de 30 días.',
    promptEn: 'Identify products that sell well but have low stock. List those that will run out in less than 30 days.',
    response: [
      '⚠ alerta de stock bajo:',
      '  camiseta negra L     12 uds · vende ~14/sem → ~6 días',
      '  bolso lona            8 uds · vende ~6/sem  → ~9 días',
      '  pines edición lim.    4 uds                  → restock ya',
    ],
    tools: ['export_products', 'export_inventory_movements'],
  },
  {
    cat: 'reportes', catEs: 'reportes', catEn: 'reports',
    promptEs: 'Exporta todas las órdenes pagadas del último trimestre como CSV. Incluye nombre del cliente, ciudad, total y método de pago.',
    promptEn: 'Export all paid orders from the last quarter as CSV. Include customer name, city, total, and payment method.',
    response: [
      '✓ 247 órdenes pagadas (Q4 2025)',
      '✓ orders_q4.csv generado (45KB)',
      '',
      'columnas: order_id, customer, city, total_cop, payment, paid_at',
    ],
    tools: ['export_orders'],
  },
  {
    cat: 'reportes', catEs: 'reportes', catEn: 'reports',
    promptEs: 'Dame mi catálogo completo en formato Shopify, listo para importar.',
    promptEn: 'Give me my full catalog in Shopify format, ready to import.',
    response: [
      '✓ 86 productos exportados a formato shopify',
      '✓ products_shopify.csv (32KB)',
      '',
      'incluye: title, variants, tags, weight, vendor, type',
    ],
    tools: ['export_products'],
  },
  {
    cat: 'reportes', catEs: 'reportes', catEn: 'reports',
    promptEs: 'Genera un JSON con todos mis clientes, sus direcciones y total comprado.',
    promptEn: 'Generate a JSON with all my customers, their addresses, and total purchased.',
    response: [
      '✓ 423 clientes activos serializados',
      '✓ customers.json (89KB)',
      '',
      '{ id, name, email, address, city, total_purchased }',
    ],
    tools: ['export_customers', 'export_orders'],
  },
  {
    cat: 'reportes', catEs: 'reportes', catEn: 'reports',
    promptEs: 'Resume mi inventario por categoría. Cuántos productos hay y cuál es el stock total de cada categoría.',
    promptEn: 'Summarize my inventory by category. How many products and what is the total stock of each category.',
    response: [
      'inventario por categoría:',
      '  ropa         34 productos · 1,247 uds',
      '  accesorios   18 productos ·   432 uds',
      '  misc         12 productos ·    89 uds',
      '',
      'total: 64 productos · 1,768 uds en stock',
    ],
    tools: ['export_categories', 'export_products'],
  },
  {
    cat: 'reportes', catEs: 'reportes', catEn: 'reports',
    promptEs: 'Backup completo de mi tienda en JSON: productos, órdenes, clientes, categorías, imágenes.',
    promptEn: 'Full backup of my store in JSON: products, orders, customers, categories, images.',
    response: [
      'generando backup completo...',
      '  ✓ 86 productos',
      '  ✓ 247 órdenes',
      '  ✓ 423 clientes',
      '  ✓ 12 categorías',
      '  ✓ 156 imágenes (32MB)',
      '',
      '→ backup_2026-05-11.zip',
    ],
    tools: ['export_products', 'export_orders', 'export_customers', 'export_categories', 'download_media_archive'],
  },
  {
    cat: 'operacion', catEs: 'operación', catEn: 'operations',
    promptEs: 'Detecta productos sin imagen, sin descripción, o sin precio. Lista los que necesitan atención.',
    promptEn: 'Detect products without image, description, or price. List those needing attention.',
    response: [
      'detectados 7 productos incompletos:',
      '  · bolso azul          (sin precio)',
      '  · pines v2            (sin imagen)',
      '  · stickers mini       (sin descripción)',
      '  · gorra retro         (sin imagen + sin descripción)',
      '  +3 más',
    ],
    tools: ['export_products'],
  },
  {
    cat: 'operacion', catEs: 'operación', catEn: 'operations',
    promptEs: '¿Qué clientes me compraron más de una vez en los últimos 3 meses? Dame nombres y emails.',
    promptEn: 'Which customers bought more than once in the last 3 months? Names and emails.',
    response: [
      '23 clientes recurrentes (3 meses):',
      '  m.gomez@...      4 órdenes',
      '  l.rivera@...     3 órdenes',
      '  p.castro@...     3 órdenes',
      '  +20 más · csv listo para email marketing',
    ],
    tools: ['export_customers', 'export_orders'],
  },
  {
    cat: 'operacion', catEs: 'operación', catEn: 'operations',
    promptEs: 'Productos creados o modificados este mes — ¿cuáles son?',
    promptEn: 'Products created or modified this month — which ones?',
    response: [
      '12 productos modificados en mayo:',
      '  · camiseta verde       (creado 03/05)',
      '  · bolso XL             (precio +15%, 08/05)',
      '  · pines edición v3     (variante nueva, 10/05)',
      '  +9 más',
    ],
    tools: ['export_products'],
  },
  {
    cat: 'operacion', catEs: 'operación', catEn: 'operations',
    promptEs: '¿Cuántas órdenes hubo entre $100.000 y $500.000 COP el mes pasado? ¿Y promedio por método de pago?',
    promptEn: 'How many orders between $100K and $500K COP last month? And average per payment method?',
    response: [
      '81 órdenes en ese rango.',
      '',
      'promedio por método:',
      '  PSE              $245K',
      '  tarjeta          $278K',
      '  Nequi            $189K',
      '  efectivo         $156K',
    ],
    tools: ['export_orders'],
  },
  {
    cat: 'migracion', catEs: 'migración', catEn: 'migration',
    promptEs: 'Prepara un export completo en formato Tiendanube, con productos, variantes, categorías y precios.',
    promptEn: 'Prepare a full export in Tiendanube format with products, variants, categories, and prices.',
    response: [
      '✓ 86 productos con variantes',
      '✓ 12 categorías mapeadas a tiendanube',
      '✓ tiendanube_export.csv (38KB)',
      '',
      'listo para importar en tiendanube admin.',
    ],
    tools: ['export_products', 'export_categories'],
  },
  {
    cat: 'migracion', catEs: 'migración', catEn: 'migration',
    promptEs: '¿A qué plataforma me conviene migrar mi tienda según mi catálogo y tipo de productos?',
    promptEn: 'Which platform should I migrate my store to based on my catalog and product type?',
    response: [
      'análisis: 86 productos · multi-variante · precio medio $35K COP',
      '',
      'recomendación:',
      '  1. shopify       (mejor fit · setup ~2h)',
      '  2. tiendanube    (LATAM · setup ~3h)',
      '  3. woocommerce   (control total · técnico)',
    ],
    tools: ['suggest_alternative_platforms', 'get_store_info', 'export_products'],
  },
  {
    cat: 'migracion', catEs: 'migración', catEn: 'migration',
    promptEs: '¿Mis APIs de Komercia están funcionando? Hazme un health check.',
    promptEn: 'Are my Komercia APIs working? Run a health check.',
    response: [
      '✓ Laravel API     · 142ms',
      '✓ Node API        · 89ms',
      '✓ Auth            · token válido (5h 47m restantes)',
      '✓ Discovery       · operacional',
      '',
      'todo en línea.',
    ],
    tools: ['validate_komercia_apis'],
  },
  {
    cat: 'migracion', catEs: 'migración', catEn: 'migration',
    promptEs: 'Datos generales de mi tienda: nombre, plan, dominio, estado. Resúmemelo.',
    promptEn: 'General data about my store: name, plan, domain, status. Summarize it.',
    response: [
      'tu tienda:',
      '  nombre:   Foster Studios',
      '  plan:     Premium',
      '  dominio:  fosterstudios.com',
      '  estado:   activa',
      '  miembro:  desde 2022',
    ],
    tools: ['get_store_info'],
  },
];

export const catCounts: Record<RecetaCat, number> = categories.reduce(
  (acc, c) => ({ ...acc, [c]: recetas.filter((r) => r.cat === c).length }),
  {} as Record<RecetaCat, number>,
);
