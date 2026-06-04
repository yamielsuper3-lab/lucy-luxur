const SERVICES_DATA = {
  "ceja-hiperrealista": {
    title: "Ceja Hiperrealista (Micropigmentación)",
    subtitle: "El Arte de la Mirada Perfecta",
    price: "Valoración Gratis",
    duration: "2.5 Hrs (Sesión Inicial)",
    frequency: "Retoque anual recomendado",
    description: "Diseño y micropigmentación orgánica de cejas adaptada a la simetría y armonía única de tu rostro. Creamos trazos hiperrealistas que imitan el crecimiento natural del vello para un efecto elegante, tridimensional y duradero.",
    benefits: [
      "Define y enmarca tu fisionomía facial de forma natural.",
      "Ahorra tiempo diario eliminando la necesidad de maquillar las cejas.",
      "Técnica de autor indolora con pigmentos orgánicos hipoalergénicos.",
      "Ideal para corregir asimetrías o rellenar áreas despobladas."
    ],
    steps: [
      {
        title: "Visagismo y Diseño de Autor",
        desc: "Medición matemática precisa del rostro para trazar la estructura de cejas ideal antes de iniciar."
      },
      {
        title: "Implantación de Pigmento",
        desc: "Creación de trazos ultra-finos pelo a pelo utilizando tecnología de micropigmentación de última generación."
      },
      {
        title: "Sellado e Instrucciones",
        desc: "Aplicación de bálsamo regenerador y entrega del kit exclusivo de cuidados posteriores."
      }
    ],
    aftercare: [
      "No mojar las cejas directamente durante las primeras 48 horas.",
      "Aplicar el bálsamo regenerador de autor dos veces al día.",
      "Evitar la exposición solar, albercas y saunas durante 10 días.",
      "No rascar ni retirar las pequeñas costras del proceso de cicatrización."
    ],
    image: "",
    stripeServiceId: "Micropigmentación de Cejas"
  },
  "diseno-cejas": {
    title: "Diseño & Perfilado de Cejas",
    subtitle: "Definición y Simetría Natural",
    price: "$250",
    duration: "45 Min",
    frequency: "Cada 3 a 4 semanas",
    description: "Perfilado preciso utilizando cera e hilo orgánico europeo. Evaluamos tus facciones para limpiar y definir la línea de tu ceja, respetando al máximo tu fisionomía y promoviendo un crecimiento ordenado.",
    benefits: [
      "Resultados inmediatos y de alta precisión.",
      "El hilo orgánico debilita el vello desde la raíz sin dañar la piel.",
      "Apto para pieles sensibles y propensas a rojeces.",
      "Estructura la ceja para abrir y rejuvenecer la mirada."
    ],
    steps: [
      {
        title: "Medición y Limpieza",
        desc: "Asepsia del área facial y marcado de puntos de inicio, arco y finalización."
      },
      {
        title: "Perfilado con Hilo y Cera",
        desc: "Remoción precisa del exceso de vellos finos mediante técnica combinada de autor."
      },
      {
        title: "Calmante e Hidratación",
        desc: "Aplicación de gel de aloe vera clínico y masaje estimulante en la zona frontal."
      }
    ],
    aftercare: [
      "Evitar aplicar maquillaje de cejas en las siguientes 12 horas.",
      "No exponerse directamente al sol inmediatamente después de la sesión.",
      "Aplicar crema hidratante suave si se presenta una ligera rojez cutánea."
    ],
    image: "",
    stripeServiceId: "Micropigmentación de Cejas"
  },
  "planchado-cejas": {
    title: "Planchado de Cejas",
    subtitle: "Control y Estilo Semi-Permanente",
    price: "$350",
    duration: "1 Hr",
    frequency: "Cada 4 a 6 semanas",
    description: "Tratamiento de alineación y alisado para vellos rebeldes o que crecen en direcciones incorrectas. Logra un efecto de cejas peinadas, ordenadas y con mayor volumen visual al instante.",
    benefits: [
      "Define y fija las cejas en una dirección pulida y estética.",
      "Aporta una apariencia de mayor volumen y densidad al vello facial.",
      "Efecto duradero ideal para cejas rizadas, rebeldes o despeinadas.",
      "Fórmula suave enriquecida con queratina para proteger la fibra capilar."
    ],
    steps: [
      {
        title: "Direccionamiento de Vello",
        desc: "Peinado y colocación del vello en la dirección deseada aplicando la crema alisadora."
      },
      {
        title: "Fijación y Nutrición",
        desc: "Aplicación del neutralizante para sellar la nueva forma, seguido de un baño de queratina."
      },
      {
        title: "Estilizado Final",
        desc: "Perfilado de excedentes y cepillado final de las cejas fijadas."
      }
    ],
    aftercare: [
      "No mojar las cejas ni aplicar vapor durante las primeras 24 horas.",
      "Cepillar las cejas diariamente hacia arriba para mantener el efecto.",
      "Evitar desmaquillantes a base de aceites pesados en la zona."
    ],
    image: "",
    stripeServiceId: "Micropigmentación de Cejas"
  },
  "facial-limpieza": {
    title: "Facial Limpieza Profunda",
    subtitle: "Purificación Clínica y Luminosidad Real",
    price: "$800",
    duration: "2 Hrs",
    frequency: "Recomendado mensual",
    description: "El tratamiento clínico definitivo para purificar tu piel de forma profunda. Es el tratamiento facial ideal para la eliminación de impurezas, estimulación de la circulación sanguínea, reducción de inflamación, prevención de acné y afinamiento de la textura cutánea.",
    benefits: [
      "Eliminación meticulosa de puntos negros y comedones acumulados.",
      "Reduce la inflamación cutánea y previene brotes de acné.",
      "Estimula la circulación sanguínea promoviendo la oxigenación celular.",
      "Amina la textura cutánea revelando una piel más suave, sana y luminosa."
    ],
    steps: [
      {
        title: "Diagnóstico e Higiene",
        desc: "Análisis clínico de tu tipo de piel, seguido de limpieza desincrustante y tonificación botánica."
      },
      {
        title: "Apertura de Poros y Extracción",
        desc: "Exposición al vapor-ozono, exfoliación ultrasónica de alta precisión y extracción manual minuciosa."
      },
      {
        title: "Alta Frecuencia y Mascarilla",
        desc: "Aplicación de alta frecuencia bactericida, mascarilla hidroplástica calmante de autor y sellado con sérum de ácido hialurónico."
      }
    ],
    aftercare: [
      "Evitar la exposición solar directa durante las primeras 24 horas.",
      "No aplicar maquillaje pesado o bases abrasivas en el rostro el mismo día del servicio.",
      "Mantener una hidratación constante y aplicar protector solar FPS 50+ cada 4 horas."
    ],
    image: "",
    stripeServiceId: "Facial Limpieza Profunda"
  },
  "facial-hidratante": {
    title: "Facial Hidratante de Autor",
    subtitle: "Nutrición Celular e Hidratación Extrema",
    price: "$1,200",
    duration: "2 Hrs",
    frequency: "Cada 1 a 2 meses",
    description: "Infusión profunda de activos hidratantes formulada para pieles deshidratadas, opacas o expuestas a cambios climáticos bruscos. Combinamos aparatología molecular con mascarillas exclusivas que devuelven la elasticidad y juventud al rostro.",
    benefits: [
      "Restaura los niveles óptimos de agua en las capas profundas de la dermis.",
      "Aporta un brillo radiante y disminuye líneas de expresión por deshidratación.",
      "Suaviza la textura de la piel y mejora su elasticidad natural.",
      "Experiencia sensorial sumamente relajante con aromaterapia premium."
    ],
    steps: [
      {
        title: "Exfoliación Enzimática",
        desc: "Limpieza suave para retirar células muertas sin irritar la piel, preparándola para los activos."
      },
      {
        title: "Ionización de Ácido Hialurónico",
        desc: "Introducción de ampolletas de ácido hialurónico de bajo peso molecular mediante aparatología galvánica."
      },
      {
        title: "Mascarilla de Colágeno y Sellado",
        desc: "Colocación de mascarilla velo colágeno, crioterapia reafirmante y crema sellante ultra-hidratante."
      }
    ],
    aftercare: [
      "Tomar suficiente agua durante los días posteriores para potenciar el efecto celular.",
      "Mantener tu rutina diaria de cuidado con cremas hidratantes ligeras.",
      "Usar protector solar diariamente para evitar manchas."
    ],
    image: "",
    stripeServiceId: "Facial Hidratante"
  },
  "facial-despigmentante": {
    title: "Despigmentante Clínico",
    subtitle: "Tono Uniforme y Renovación Cutánea",
    price: "$1,200",
    duration: "2 Hrs",
    frequency: "Sesiones semanales (según valoración)",
    description: "Tratamiento avanzado enfocado en disminuir manchas solares, secuelas de acné y melasma. Mediante una exfoliación química controlada y sueros inhibidores de melanina, restauramos la uniformidad y el brillo natural de tu rostro.",
    benefits: [
      "Disminuye progresivamente la pigmentación de manchas oscuras.",
      "Unifica el tono del cutis y aporta luminosidad general.",
      "Favorece la renovación celular epidérmica atenuando cicatrices finas.",
      "Fórmula clínica de autor segura y progresiva que no daña la piel."
    ],
    steps: [
      {
        title: "Peeling Químico Suave",
        desc: "Aplicación de exfoliante químico controlado para retirar capas manchadas superficiales."
      },
      {
        title: "Tratamiento de Manchas",
        desc: "Ionización de sueros despigmentantes con activos concentrados como vitamina C y ácido kójico."
      },
      {
        title: "Fototerapia LED y Bloqueo",
        desc: "Sesión de máscara LED verde (reguladora de melanina) y aplicación de protector solar de amplio espectro."
      }
    ],
    aftercare: [
      "Uso OBLIGATORIO de protector solar FPS 50+ cada 3 horas en interiores y exteriores.",
      "Evitar la exposición al sol directo y saunas por 7 días.",
      "No utilizar productos con retinol o ácidos exfoliantes en casa durante 5 días."
    ],
    image: "",
    stripeServiceId: "Facial Despigmentante"
  },
  "facial-antiedad": {
    title: "Anti-Edad Colágeno Premium",
    subtitle: "Efecto Tensor y Juventud Celular",
    price: "$1,300",
    duration: "2 Hrs",
    frequency: "Cada 3 a 4 semanas",
    description: "Terapia de rejuvenecimiento de autor enfocada en combatir la flacidez cutánea, pérdida de volumen y arrugas prematuras. Combina aparatología de radiofrecuencia con activos tensores para un efecto lifting no invasivo inmediato.",
    benefits: [
      "Estimula la producción de colágeno y elastina propios de la piel.",
      "Efecto tensor que redefine el óvalo facial y disminuye la papada.",
      "Rellena arrugas finas y suaviza surcos nasogenianos.",
      "Nutre a profundidad aportando volumen y firmeza epidérmica."
    ],
    steps: [
      {
        title: "Radiofrecuencia Reafirmante",
        desc: "Aplicación de calor controlado en la dermis profunda para contraer las fibras de colágeno."
      },
      {
        title: "Crioterapia Facial",
        desc: "Masaje frío para cerrar poros, tensar la piel de inmediato y calmar el tejido estimulado."
      },
      {
        title: "Mascarilla Hidroplástica Tensora",
        desc: "Aplicación de mascarilla rica en péptidos tensores y sellado con elixir de células madre."
      }
    ],
    aftercare: [
      "Evitar lavar la cara con agua muy caliente en las siguientes 24 horas.",
      "Mantener una rutina de hidratación enfocada en cremas tensoras o nutritivas.",
      "Aplicar protector solar diariamente."
    ],
    image: "",
    stripeServiceId: "Facial Anti-Edad Premium"
  },
  "unas-esculturales": {
    title: "Uñas Esculturales Elite",
    subtitle: "Arquitectura y Diseño Fino de Autor",
    price: "$650 (Aplicación)",
    duration: "2 a 3 Hrs",
    frequency: "Mantenimiento cada 3 semanas",
    description: "Esculpido premium personalizado de uñas diseñado a la fisionomía exacta de tus manos. Moldeamos la uña directamente sobre moldes profesionales sin tips de plástico pegados, respetando tu queratina natural y logrando una delgadez y resistencia excepcionales.",
    benefits: [
      "Esculpido arquitectónico personalizado y ultra-fino.",
      "Máxima durabilidad y resistencia al uso diario.",
      "Uso de monómero y polímeros premium libres de MMA que cuidan tu salud.",
      "Acabados sofisticados incluyendo pedrería fina y hojas de oro."
    ],
    steps: [
      {
        title: "Preparación de la Uña",
        desc: "Retiro de cutícula y deshidratación de la placa ungueal sin limados excesivos."
      },
      {
        title: "Esculpido a Medida",
        desc: "Colocación del molde y modelado del acrílico o gel con pinceles de autor."
      },
      {
        title: "Limado Estético y Esmaltado",
        desc: "Perfilado técnico de la forma, esmaltado semipermanente de alta costura y sellado ultra-brillo."
      }
    ],
    aftercare: [
      "No utilizar las uñas como herramientas para abrir objetos pesados o latas.",
      "Lavar diariamente con un cepillo suave para mantener la asepsia de la base.",
      "Agendar puntualmente tu retoque a las 3 semanas para evitar palancas o fracturas."
    ],
    image: "",
    stripeServiceId: "Uñas Esculturales (Aplicación)"
  },
  "poligel-premium": {
    title: "Poligel Premium",
    subtitle: "Flexibilidad y Resistencia Híbrida",
    price: "$650 (Aplicación)",
    duration: "2 Hrs",
    frequency: "Retoque cada 3 a 4 semanas",
    description: "Fusión revolucionaria entre el acrílico y el gel tradicional. El poligel es sumamente ligero, flexible y resistente, no tiene olores fuertes y produce un acabado fino, elástico y cómodo sobre tu uña natural.",
    benefits: [
      "Material 20% más ligero que el acrílico común.",
      "Mayor flexibilidad que reduce la probabilidad de rupturas dolorosas.",
      "Sin olores a químicos molestos en la cabina.",
      "Ideal para recubrir uñas naturales frágiles o realizar extensiones."
    ],
    steps: [
      {
        title: "Manicura y Asepsia",
        desc: "Limpieza detallada de la cutícula y aplicación de balanceador de PH."
      },
      {
        title: "Aplicación y Curado LED",
        desc: "Modelado del poligel con solución especial y curado rápido en cabina LED de baja emisión de calor."
      },
      {
        title: "Acabado de Autor",
        desc: "Limado estructural y aplicación del color semipermanente premium a tu elección."
      }
    ],
    aftercare: [
      "Evitar el contacto prolongado con químicos de limpieza pesados (usar guantes).",
      "No morder ni limar los bordes laterales de las uñas en casa.",
      "Asistir a mantenimiento para rebalancear el punto de tensión de la estructura."
    ],
    image: "",
    stripeServiceId: "Poligel Premium (Aplicación)"
  },
  "soft-gel": {
    title: "Soft Gel de Lujo",
    subtitle: "Puntas de Gel Express de Alta Definición",
    price: "$650 (Aplicación)",
    duration: "1.5 Hrs",
    frequency: "Retoque cada 3 semanas",
    description: "La técnica express de mayor tendencia. Aplicamos extensiones pre-diseñadas fabricadas con gel flexible que se adhieren directamente a tu uña natural mediante bases de goma niveladoras, logrando una apariencia orgánica y delgada en tiempo récord.",
    benefits: [
      "Aplicación rápida y sin limados agresivos sobre la placa de la uña.",
      "Extensiones 100% de gel que se sienten ligeras y naturales.",
      "Retiro express seguro que cuida la salud de la uña natural.",
      "Formas perfectas pre-establecidas (Stiletto, Almendra, Coffin)."
    ],
    steps: [
      {
        title: "Selección de Tips",
        desc: "Medición exacta de cada tip de soft gel para encajar perfectamente con tus paredes ungueales."
      },
      {
        title: "Adherencia Molecular",
        desc: "Aplicación de base niveladora Rubber y pegado de la extensión bajo cabina LED focalizada."
      },
      {
        title: "Esmaltado de Gala",
        desc: "Decoración artística del set a mano alzada y recubrimiento con gel de alto brillo."
      }
    ],
    aftercare: [
      "Evitar mojar las manos con agua caliente de forma prolongada durante las primeras 12 horas.",
      "No ejercer palanca frontal para evitar levantamientos rápidos de la zona de cutícula.",
      "Retirar la aplicación únicamente en boutique para asegurar la queratina de tus uñas."
    ],
    image: "",
    stripeServiceId: "Soft Gel (Aplicación)"
  },
  "ruber-base": {
    title: "Ruber Base Nivelador",
    subtitle: "Grosor Estructural y Salud Ungueal",
    price: "$350",
    duration: "1.5 Hrs",
    frequency: "Cada 3 a 4 semanas",
    description: "Gel de caucho autonivelante diseñado para dar resistencia y grosor estructural a la uña natural débil o cóncava. Ideal para clientas que desean dejar crecer sus propias uñas de forma natural y segura.",
    benefits: [
      "Rellena estrías y corrige imperfecciones en la superficie de la uña.",
      "Aporta una flexibilidad elástica que amortigua los golpes cotidianos.",
      "Evita el quiebre y escamado de las uñas naturales.",
      "Base perfecta de alta adherencia para el esmalte en gel."
    ],
    steps: [
      {
        title: "Manicura Rusa",
        desc: "Limpieza profunda de cutículas con torno y fresas finas de diamante."
      },
      {
        title: "Nivelación con Rubber",
        desc: "Modelado de la gota de gel Rubber buscando crear un arco estético reforzado."
      },
      {
        title: "Color y Brillo",
        desc: "Aplicación del tono semipermanente deseado y sellado brillante."
      }
    ],
    aftercare: [
      "No limar las puntas en casa para evitar abrir el sello del gel protector.",
      "Aplicar aceite de cutículas diariamente para mantener el área hidratada y limpia.",
      "Agendar retoque puntual para evitar desplazamientos del centro de gravedad de la uña."
    ],
    image: "",
    stripeServiceId: "Ruber Base (Aplicación)"
  },
  "gel-semipermanente": {
    title: "Gel Semipermanente",
    subtitle: "Color Radiante y Brillo Duradero",
    price: "$250",
    duration: "1 Hr",
    frequency: "Cada 3 semanas",
    description: "Esmaltado profesional en gel de alta costura sobre uñas naturales sanas y fuertes. Brindamos un acabado limpio, con colores vibrantes y un brillo tipo cristal que se mantiene impecable durante semanas.",
    benefits: [
      "Secado instantáneo en lámpara LED, sal de la boutique lista.",
      "Brillo espejo duradero que no se opaca con las tareas del día.",
      "Gran gama de tonos de tendencia y colecciones de temporada.",
      "Protege ligeramente la uña natural de roturas menores."
    ],
    steps: [
      {
        title: "Manicura Básica",
        desc: "Acomodo de bordes libres con lima suave y limpieza ligera de cutículas."
      },
      {
        title: "Capas de Esmaltado",
        desc: "Aplicación de base protectora, dos capas de color pigmentado de alta cobertura y curado LED."
      },
      {
        title: "Top Coat de Lujo",
        desc: "Capa finalizadora anti-rayones, limpieza de capa de inhibición y aceites aromáticos."
      }
    ],
    aftercare: [
      "Evitar usar acetona pura en casa (puede dañar la cobertura del esmalte).",
      "No arrancar el gel levantado con los dientes o pinzas para no descamar la uña.",
      "Usar removedores recomendados en tu próxima cita."
    ],
    image: "",
    stripeServiceId: "Gel Semipermanente"
  },
  "vitamina-e": {
    title: "Tratamiento Vitamina E",
    subtitle: "Restauración e Hidratación Profunda",
    price: "$150",
    duration: "1 Hr",
    frequency: "Recomendado mensual",
    description: "Tratamiento fortalecedor enriquecido con vitamina E y aceites esenciales. Ideal para restaurar la queratina, hidratar la cutícula y revitalizar uñas dañadas por aplicaciones previas descuidadas o debilitadas por agentes externos.",
    benefits: [
      "Fortalece la placa ungueal de adentro hacia afuera.",
      "Hidrata profundamente cutículas secas o agrietadas.",
      "Promueve el crecimiento fuerte y rápido de tus uñas.",
      "Apto como descanso entre aplicaciones de acrílico o gel."
    ],
    steps: [
      {
        title: "Preparación Relajante",
        desc: "Lavado higiénico con sales y limado muy suave de los bordes ásperos de las uñas."
      },
      {
        title: "Tratamiento Nutritivo",
        desc: "Aplicación de mascarilla concentrada de vitamina E y masaje de penetración cutánea."
      },
      {
        title: "Sellado Protector",
        desc: "Capa protectora de calcio endurecedor y pulido para dar brillo natural."
      }
    ],
    aftercare: [
      "Aplicar aceites de almendra o cutícula recomendados por la especialista antes de dormir.",
      "Dejar descansar la uña libre de esmaltes de color al menos durante 3 días para su oxigenación.",
      "Evitar morder o pellizcar los padrastros que rodeen tu uña."
    ],
    image: "",
    stripeServiceId: "Tratamiento Vitamina E"
  }
};

if (typeof module !== 'undefined') {
  module.exports = SERVICES_DATA;
}
