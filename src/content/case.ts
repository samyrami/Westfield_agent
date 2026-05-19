/**
 * Contenido del caso Etsy para mostrar al visitante del showcase.
 *
 * Es una versión editada y limpia del texto que vive en server/context/case.ts.
 * Está duplicado a propósito: el server tiene el texto que se inyecta a OpenAI
 * (formato bruto extraído del PDF). Acá tenemos la versión legible para UI.
 */

export const CASE_SUMMARY = {
  protagonist: {
    title: "Mariola Onetti",
    body: "Ex-creativa de publicidad, abrió en 2017 su tienda de camisetas en Etsy desde Buenos Aires. En 2018 una foto suya se viralizó en el Facebook de Etsy y vendió 1.600 copias en una semana. Para 2019 facturaba ~1,3 millones de dólares. La pandemia disparó aún más sus ventas.",
  },
  marketplace: {
    title: "Etsy",
    body: "E-marketplace global de productos artesanales y vintage. En 2023 generó $13.2B en ventas brutas, con 96.5M de compradores y 9M de vendedores activos. Cobra $0,20 por listado y 3,5% de cada venta. Se autopromueve como ejemplo de empresa Triple Bottom Line.",
  },
  challenge: {
    title: "El reto",
    body: "Las ventas de Mariola se estancaron. Compite contra miles de vendedores con productos similares, no logra construir marca propia (los clientes asocian la compra con \"Etsy\", no con \"Mariola Onetti Designs\"), y dedica horas a perseguir copias de sus diseños. La mayoría de sus ingresos ya viene de pedidos al por mayor de clientes que la descubrieron vía Etsy.",
  },
};

/**
 * Datos numéricos del caso. Sirven al estudiante para anclar argumentos en cifras
 * concretas (el criterio "Reflexión sobre Impacto IA y TBL" de la rúbrica premia
 * usar los datos del caso vs sólo opinar).
 */
export const CASE_KEY_FACTS: Array<{
  value: string;
  label: string;
  note?: string;
}> = [
  {
    value: "$13.2B",
    label: "GMS de Etsy en 2023",
    note: "Etsy $11.6B (88%) · Reverb $942M · Depop $599M",
  },
  {
    value: "9M / 96.5M",
    label: "vendedores activos · compradores activos",
    note: "al 31/12/2023",
  },
  {
    value: "$0,20 + 3,5%",
    label: "comisión por listado · sobre cada venta",
    note: "el listado se renueva cada 4 meses",
  },
  {
    value: "68% / 45%",
    label: "GMS vía móvil · GMS internacional",
    note: "tendencia móvil creciente",
  },
  {
    value: "1.600",
    label: "camisetas vendidas por Mariola en 1 semana",
    note: "tras viralizarse en Facebook de Etsy (2018)",
  },
  {
    value: "$1.3M",
    label: "ingresos de Mariola en 2019",
    note: "después su crecimiento se estancó",
  },
];

export const CASE_QUESTIONS: Array<{
  n: 1 | 2 | 3;
  title: string;
  body: string;
}> = [
  {
    n: 1,
    title: "¿Dónde está el problema y cuáles son las alternativas?",
    body: "Analicemos a Mariola: estancamiento, competencia, copias, dependencia del mayoreo. Identifica el problema central y plantea alternativas reales.",
  },
  {
    n: 2,
    title: "¿Qué aporta Etsy a sus vendedores y cómo se puede aprovechar?",
    body: "Más allá del tráfico, qué diferencia a Etsy de otros marketplaces. Herramientas, comunidad, branding — y cómo Mariola puede explotarlo.",
  },
  {
    n: 3,
    title: "Si Etsy fuera 100× o 1000× más grande, ¿impacto positivo para planeta y comunidad?",
    body: "Etsy se cita como ejemplo de empresa Triple Bottom Line. ¿Sostiene esa promesa a escala masiva, o se diluye? Defiende tu posición.",
  },
];

/**
 * Texto del caso para el Dialog "Leer caso completo".
 * Versión editorial — mismas ideas que server/context/case.ts, formato pensado para
 * lectura web (headings, bullets, sin artefactos del PDF original).
 */
export const CASE_FULL_TEXT: Array<{ heading: string; paragraphs: string[] }> = [
  {
    heading: "Contexto personal — Mariola Onetti",
    paragraphs: [
      "Mariola estaba en su taller en Buenos Aires, meditando sobre el futuro de su proyecto. Todo había cambiado mucho en los últimos cinco años.",
      "Hacía cinco años, había dejado su trabajo como creativa en publicidad, y no sabía muy bien qué hacer con su vida. Sus diseños tenían muy buena difusión en Pinterest, y se decidió a abrir una tienda de camisetas en Etsy. Abrió su tienda, Mariola Onetti Designs, en 2017.",
      "En 2018, la foto de una de sus camisetas salió en la página de Facebook de Etsy y logró vender 1.600 copias en una semana. Su progreso fue tal que en 2019 le estaban haciendo entrevistas porque había conseguido ingresos equivalentes a 1,3 millones de dólares con su pequeño negocio artesanal. La pandemia fue complicada, pero el hecho de que tanta gente estuviese ociosa y en casa casi impulsó la venta de camisetas.",
      "Sin embargo, ahora se encontraba en una encrucijada: su tienda en Etsy Argentina había tenido un crecimiento meteórico, pero las ventas parecían haberse estancado desde hace algún tiempo.",
    ],
  },
  {
    heading: "Qué es Etsy",
    paragraphs: [
      "Etsy es un e-marketplace especializado en objetos fabricados de manera artesanal y artículos vintage. La empresa se anuncia como un \"mercado global de artículos únicos y creativos\", inspirado en poner en contacto a compradores y vendedores \"en una época donde todo está cada vez más automatizado\".",
      "Según su reporte 10K de 2024, Etsy opera mercados online bilaterales que conectan a millones de compradores y vendedores creativos en todo el mundo. Estos mercados conforman una \"Casa de Marcas\" que comparte misión, modelos de negocio y compromiso de usar la tecnología para fortalecer las comunidades y empoderar personas.",
      "Su mercado principal, Etsy.com, conecta a artesanos con consumidores reflexivos que buscan artículos únicos que sean una \"expresión alegre de su gusto y valores\". La narrativa oficial es que ofrecer listados de calidad a buen precio y experiencia confiable crea un ciclo virtuoso: \"ellos ganan, Etsy gana\".",
      "La \"Casa de Marcas\" incluye también Reverb (mercado de instrumentos musicales, adquirido en 2019) y Depop (mercado de reventa de moda, adquirido en 2021). En agosto de 2023 Etsy vendió Elo7, el mercado brasileño de artículos hechos a mano que había comprado en 2021.",
    ],
  },
  {
    heading: "Historia y salida a bolsa",
    paragraphs: [
      "Etsy fue fundada el 18 de junio de 2005 por Robert Kalin, Haim Schoppik, Jared Tarbell y Chris Maguire.",
      "En 2010 ya tenía 7 millones de usuarios y 314 millones de dólares en ingresos. En 2012, las ventas habían crecido 70%, los compradores 80%, y se alcanzaron los 10 millones de usuarios.",
      "Originalmente, toda la mercancía debía ser hecha a mano o de manera artesanal. Para no limitar su crecimiento, en 2013 suavizaron la norma permitiendo también artículos vintage (con al menos 20 años de antigüedad). Las ventas totales en 2013 alcanzaron los 1.300 millones de dólares. A finales de 2015 tenía 400 empleados.",
      "Salió a bolsa en el Nasdaq el 19 de abril de 2015 con el ticker ETSY. La IPO recaudó $265 millones a $16,50 por acción. La operación vino acompañada de polémica: una demanda de inversores denunció fraude por falta de transparencia sobre problemas de copyright que podrían afectar al precio, alegando que ~5% de la mercancía vendida podía ser falsificación o violar derechos de autor.",
      "Aun así, la compañía ha mantenido una trayectoria estable de crecimiento en ventas y ganancias, con un precio de acción volátil pero al alza en el largo plazo.",
    ],
  },
  {
    heading: "Estadísticas clave (2023)",
    paragraphs: [
      "• Los mercados de Etsy, Reverb y Depop conectaron a 9,0 millones de vendedores activos con 96,5 millones de compradores activos al 31/12/2023.",
      "• Las 6 categorías top del mercado de Etsy (hogar y muebles, joyas y accesorios, ropa, materiales de artesanía, papelería y fiesta, juguetes y juegos) representaron ~$10.000 millones, el 87% del GMS.",
      "• 45% del GMS consolidado se generó cuando vendedor o comprador (o ambos) estaban fuera de Estados Unidos.",
      "• ~68% del GMS consolidado provino de compras realizadas en dispositivos móviles. La app móvil es el dispositivo de más rápido crecimiento.",
      "• Sus operaciones se concentran principalmente en Estados Unidos, Reino Unido, Canadá, Australia, Francia y Alemania.",
    ],
  },
  {
    heading: "Modelo de negocio",
    paragraphs: [
      "Etsy no fabrica ni envía nada — pone en contacto a vendedores y compradores. Cada vendedor abre su tienda y se ocupa de la logística (aunque Etsy ofrece servicios de envío adicionales que la mayoría adopta).",
      "El perfil de usuario es mayoritariamente femenino (~67%) en ambos lados: compradoras jóvenes (18–24) y vendedoras con educación universitaria entre 20 y 40 años, principalmente artistas o dueñas de pequeños negocios. Abundan productos de artesanía, joyería y vintage.",
      "Etsy ha adoptado una idea de comercio vertical centrado en lo artesanal y vintage, frente a enfoques horizontales como eBay o Amazon. Ya en 2010, Etsy tenía 6,7 millones de productos diferentes a la venta, frente a 117 millones en eBay — pero eBay sólo tenía 3,2 millones de productos hechos a mano en inventario.",
    ],
  },
  {
    heading: "Fuentes de ingreso de Etsy",
    paragraphs: [
      "• Comisión de $0,20 por cada artículo listado (se cobra cada 4 meses). Pequeña, pero por volumen es una parte relevante de los ingresos.",
      "• Comisión del 3,5% sobre cada venta. Etsy obliga a usar su pasarela de pago, así que la comisión se detrae automáticamente.",
      "• Servicios de pasarela de pago (\"direct checkout\") con múltiples opciones.",
      "• Publicidad en plataforma: vendedores pueden promocionar sus artículos.",
      "• Pattern: servicio de creación y personalización de páginas web propias por $15/mes.",
      "• APIs: Etsy desarrolló su propio entorno de aplicaciones, en parte en código abierto, lo que permite que terceros creen herramientas para vendedores (y los desarrolladores pagan por integrarse).",
      "• Otras: venta de espacio publicitario a empresas, servicios de procesamiento de pago y protección antifraude, merchandising propio con la marca Etsy.",
    ],
  },
  {
    heading: "Herramientas y comunidad para vendedores",
    paragraphs: [
      "Más allá del tráfico, Etsy ofrece infraestructura específica para artesanos: Etsy Ads para promocionar listados internos, integraciones logísticas con etiquetas de envío descontadas, herramientas de SEO interno, panel de métricas de tienda, y reseñas/ratings que generan reputación.",
      "Etsy invierte en formación: talleres y seminarios web sobre marketing, branding y gestión de negocios, mentorización para vendedores nuevos, y en algunos casos pequeños préstamos a artistas.",
      "El otro diferencial duro frente a Amazon o eBay es el espíritu de comunidad. Las usuarias rápidamente viralizaron el sitio por boca-oreja y por su filosofía de apoyar a pequeños artistas. La sensación de pertenencia genera lealtad — tanto entre vendedores que se ayudan en foros como entre compradores que vuelven por afinidad con la marca, no sólo por precio.",
    ],
  },
  {
    heading: "El reto de Mariola",
    paragraphs: [
      "Pocos vendedores de Etsy consiguen más allá de unos cientos de dólares en ventas. Mariola había llegado a la cima, pero la competencia era terrible: aunque exista \"comunidad\", compite contra miles de vendedores y millones de artículos similares.",
      "Diferenciarse era cada vez más difícil. No había forma de fortalecer su marca: sus clientes hablaban en redes sociales de lo que habían comprado en Etsy, no en Mariola Onetti Designs.",
      "Estaba también el problema de las copias. Etsy es muy escrupulosa en políticas de copyright, pero el volumen es tal que muchas pasan filtros. Mariola dedicaba buena parte de su día a enviar mensajes pidiendo retirar productos que copiaban su trabajo.",
      "Y el detalle clave: el grueso de sus ingresos no venía de las ventas en Etsy, sino de pedidos al por mayor de clientes que la habían descubierto allí. Sin Etsy nunca habría despegado; con Etsy, ya no crece.",
      "¿Cómo podría seguir creciendo en el futuro?",
    ],
  },
  {
    heading: "Fuentes y datos adicionales (anexo del caso)",
    paragraphs: [
      "• Reportes 10K de Etsy en la SEC: sec.gov/edgar/browse/?CIK=1370637",
      "• Datos históricos de ingresos en Statista: statista.com/statistics/409371/etsy-annual-revenue/",
      "• Crunchbase: crunchbase.com/organization/etsy",
      "• Bloomberg: bloomberg.com/research/stocks (snapshot privcapId=28492682)",
      "• Sitio institucional: etsy.com/es/about",
    ],
  },
];

export const CASE_AUTHOR = "Ignacio Maroto Mateo · Westfield Business School";
