// =====================================================================
// METODOLOGÍA DE EVALUACIÓN DE RIESGOS — neuraler
// Contenido versionado. La pestaña "Metodología" y el generador de
// documentos leen de aquí. Si se cambia el texto, se sube la versión:
// cada evaluación guarda la versión vigente cuando se hizo.
// =====================================================================

export const METODOLOGIA_VERSION = "1.0";
export const METODOLOGIA_FECHA = "2026-10-02";

// ---------- Escalas (fuente única: también las usa el cálculo) ----------

export const CONSECUENCIAS = [
  {
    codigo: "LD",
    nombre: "Ligeramente dañino",
    descripcion:
      "Lesiones superficiales o molestias que no impiden seguir trabajando.",
    ejemplos:
      "Arañazos, pequeños cortes, contusiones leves, irritación ocular, cefalea o malestar pasajero, empujón o arañazo de un paciente sin lesión.",
  },
  {
    codigo: "D",
    nombre: "Dañino",
    descripcion:
      "Lesiones o enfermedades que suelen causar baja, sin secuelas graves permanentes.",
    ejemplos:
      "Esguinces, quemaduras localizadas, fracturas menores, lumbalgia con baja, dermatitis, lesión por agresión con baja, cuadro de ansiedad o estrés laboral con baja.",
  },
  {
    codigo: "ED",
    nombre: "Extremadamente dañino",
    descripcion:
      "Lesiones graves, secuelas permanentes, enfermedades que acortan la vida o muerte.",
    ejemplos:
      "Fracturas graves, amputaciones, lesiones múltiples, intoxicación grave, agresión con lesión permanente, contagio de enfermedad grave por pinchazo accidental.",
  },
];

export const PROBABILIDADES = [
  {
    codigo: "B",
    nombre: "Baja",
    descripcion: "El daño se producirá en raras ocasiones.",
  },
  {
    codigo: "M",
    nombre: "Media",
    descripcion: "El daño se producirá en algunas ocasiones.",
  },
  {
    codigo: "A",
    nombre: "Alta",
    descripcion: "El daño se producirá siempre o casi siempre.",
  },
];

// Matriz P × C → nivel de riesgo (idéntica al cálculo de VR de la ER)
export const MATRIZ = {
  B: { LD: "T", D: "TO", ED: "MO" },
  M: { LD: "TO", D: "MO", ED: "IM" },
  A: { LD: "MO", D: "IM", ED: "IN" },
};

export const NIVELES = [
  {
    codigo: "T",
    nombre: "Trivial",
    actuacion: "No requiere ninguna acción específica.",
    plazo: "Sin plazo",
  },
  {
    codigo: "TO",
    nombre: "Tolerable",
    actuacion:
      "Las medidas existentes son suficientes. Se valoran mejoras de bajo coste y se comprueba periódicamente que las medidas siguen siendo eficaces.",
    plazo: "Comprobación en la revisión anual",
  },
  {
    codigo: "MO",
    nombre: "Moderado",
    actuacion:
      "Hay que reducir el riesgo. Se planifican las medidas, con su coste y responsable, y se implantan dentro del plazo fijado.",
    plazo: "Máximo 6 meses",
  },
  {
    codigo: "IM",
    nombre: "Importante",
    actuacion:
      "No se inicia el trabajo hasta reducir el riesgo. Si el trabajo ya se está realizando, la corrección es prioritaria frente a los riesgos moderados, aunque requiera recursos considerables.",
    plazo: "Antes de iniciar; en curso, máximo 1 mes",
  },
  {
    codigo: "IN",
    nombre: "Intolerable",
    actuacion:
      "No se inicia ni se continúa el trabajo hasta reducir el riesgo. Si no es posible reducirlo, el trabajo queda prohibido.",
    plazo: "Inmediato",
  },
];

// ---------- PAC: comprobación de condiciones en la visita ----------

export const NIVELES_DEFICIENCIA = [
  {
    codigo: "MEJ",
    nombre: "Mejorable",
    descripcion:
      "Se detecta un fallo de poca importancia. Las medidas existentes siguen funcionando.",
  },
  {
    codigo: "DEF",
    nombre: "Deficiente",
    descripcion:
      "Se detecta un fallo que hay que corregir. Las medidas existentes pierden eficacia de forma apreciable.",
  },
  {
    codigo: "MDEF",
    nombre: "Muy deficiente",
    descripcion:
      "Se detectan fallos importantes o varios a la vez. Las medidas existentes no protegen frente al riesgo.",
  },
];

// Nivel de deficiencia × consecuencias → prioridad de la incidencia
export const MATRIZ_PAC = {
  MEJ: { LD: "Baja", D: "Baja", ED: "Media" },
  DEF: { LD: "Baja", D: "Media", ED: "Alta" },
  MDEF: { LD: "Media", D: "Alta", ED: "Inmediata" },
};

export const PRIORIDADES_PAC = [
  { nombre: "Inmediata", plazo: "En la visita o en 24-48 horas" },
  { nombre: "Alta", plazo: "1 semana" },
  { nombre: "Media", plazo: "1 mes" },
  { nombre: "Baja", plazo: "3 meses" },
];

export const ESTADOS_ACCION = [
  { nombre: "Pendiente", descripcion: "La medida aún no se ha aplicado." },
  { nombre: "Realizada", descripcion: "La medida se ha aplicado tal como se planificó." },
  {
    nombre: "Medida alternativa",
    descripcion:
      "Se ha aplicado otra medida que reduce el riesgo en igual o mayor grado. Se describe cuál.",
  },
];

// ---------- Texto de las secciones ----------
// Tipos de bloque: p (párrafo), lista, pasos (secuencia numerada),
// tabla, matriz (P×C interactiva), matrizPac, nota.

export const SECCIONES = [
  {
    id: "objeto",
    titulo: "Objeto y alcance",
    bloques: [
      {
        tipo: "p",
        texto:
          "Esta metodología describe cómo se identifican, estiman y valoran los riesgos para la seguridad y salud de las personas trabajadoras en los centros evaluados, y cómo se decide qué medidas preventivas adoptar, con qué prioridad y en qué plazo.",
      },
      {
        tipo: "p",
        texto:
          "Se aplica a todos los puestos de trabajo, equipos, lugares e instalaciones del centro, y a todas las personas que trabajan en él, incluidas las contratadas a través de empresas de trabajo temporal.",
      },
    ],
  },
  {
    id: "normativa",
    titulo: "Marco normativo",
    bloques: [
      {
        tipo: "lista",
        items: [
          "Ley 31/1995, de Prevención de Riesgos Laborales: artículo 16 (evaluación y planificación), artículo 25 (personas especialmente sensibles) y artículo 26 (protección de la maternidad).",
          "Real Decreto 39/1997, Reglamento de los Servicios de Prevención: artículos 3 a 9 (contenido, revisión, documentación y planificación de la evaluación).",
          "Real Decreto 298/2009, sobre la protección de la trabajadora embarazada, que haya dado a luz o en periodo de lactancia.",
          "Normativa específica aplicable según los riesgos detectados (lugares de trabajo, equipos, manipulación de cargas, pantallas de visualización, agentes biológicos y químicos, entre otros).",
        ],
      },
      {
        tipo: "p",
        texto:
          "Como método general se utiliza el de evaluación de riesgos del Instituto Nacional de Seguridad y Salud en el Trabajo (INSST), basado en estimar para cada peligro la severidad del daño y la probabilidad de que ocurra.",
      },
    ],
  },
  {
    id: "proceso",
    titulo: "Cómo se desarrolla la evaluación",
    bloques: [
      {
        tipo: "pasos",
        items: [
          {
            titulo: "Recogida de información",
            texto:
              "Datos del centro (plantas, tipo de pacientes, horario, servicios como comedor o vigilancia), puestos existentes y número de personas en cada uno. Se consulta a las personas trabajadoras y a sus representantes.",
          },
          {
            titulo: "Identificación de peligros",
            texto:
              "Para cada puesto se parte del catálogo de riesgos de la matriz. Después se aplica el cuestionario de comprobación (check) para incorporar los riesgos propios de ese centro.",
          },
          {
            titulo: "Estimación del riesgo",
            texto:
              "A cada riesgo se le asigna una probabilidad y unas consecuencias, considerando las condiciones reales de exposición y las medidas ya existentes.",
          },
          {
            titulo: "Valoración",
            texto:
              "La combinación de probabilidad y consecuencias da el nivel de riesgo, que determina si hay que actuar, cómo y en qué plazo.",
          },
          {
            titulo: "Planificación preventiva (PAP)",
            texto:
              "Cada medida queda registrada con su prioridad, plazo, responsable y estado.",
          },
          {
            titulo: "Comprobación de condiciones (PAC)",
            texto:
              "En las visitas se revisan las condiciones del centro y se registran solo las incidencias detectadas, con su prioridad y plazo de corrección.",
          },
          {
            titulo: "Información a las personas trabajadoras",
            texto:
              "Con los resultados se elabora la información de riesgos por puesto (IR) y, cuando procede, la evaluación de riesgos para embarazo y lactancia (ERE).",
          },
        ],
      },
    ],
  },
  {
    id: "estimacion",
    titulo: "Estimación del riesgo",
    bloques: [
      {
        tipo: "subtitulo",
        texto: "Consecuencias (C)",
      },
      {
        tipo: "p",
        texto:
          "Se valora el daño más probable si el riesgo llega a materializarse, teniendo en cuenta la parte del cuerpo afectada y la naturaleza del daño.",
      },
      {
        tipo: "tabla",
        fuente: "CONSECUENCIAS",
        columnas: ["Nivel", "Qué significa", "Ejemplos en el centro"],
      },
      {
        tipo: "subtitulo",
        texto: "Probabilidad (P)",
      },
      {
        tipo: "tabla",
        fuente: "PROBABILIDADES",
        columnas: ["Nivel", "Criterio"],
      },
      {
        tipo: "p",
        texto: "Para fijar la probabilidad se tiene en cuenta:",
      },
      {
        tipo: "lista",
        items: [
          "Con qué frecuencia y durante cuánto tiempo se está expuesto.",
          "Si las medidas existentes son adecuadas y se aplican en la práctica.",
          "La formación e información de quien realiza la tarea.",
          "Si se dispone de equipos de protección individual y se usan.",
          "Los accidentes, incidentes y daños a la salud ya registrados en el centro o en el puesto.",
          "Las características de los pacientes atendidos, como conductas de agitación o imprevisibles.",
          "El trabajo en solitario, en turno de noche o con poco personal.",
          "La presencia de personas especialmente sensibles a ese riesgo.",
        ],
      },
      {
        tipo: "subtitulo",
        texto: "Matriz de estimación",
      },
      {
        tipo: "matriz",
      },
    ],
  },
  {
    id: "valoracion",
    titulo: "Valoración y plazos de actuación",
    bloques: [
      {
        tipo: "p",
        texto:
          "Cada nivel de riesgo lleva asociada una forma de actuar y un plazo máximo para aplicar las medidas en la planificación preventiva. Los plazos son los que se aplican por defecto; el técnico puede acortarlos de forma justificada.",
      },
      {
        tipo: "tabla",
        fuente: "NIVELES",
        columnas: ["Nivel", "Actuación", "Plazo"],
      },
      {
        tipo: "p",
        texto:
          "Cuando dos medidas tienen el mismo nivel, se aplica antes la que corresponde a consecuencias más graves. Si también coinciden en eso, se tiene en cuenta el número de personas expuestas, el coste y el tiempo necesario.",
      },
    ],
  },
  {
    id: "reglas",
    titulo: "Reglas complementarias",
    bloques: [
      {
        tipo: "lista",
        items: [
          "Un riesgo moderado con consecuencias extremadamente dañinas se marca para una valoración más precisa de su probabilidad. La aplicación lo señala de forma automática.",
          "Los riesgos que se incorporan a través del cuestionario de comprobación entran con probabilidad media y consecuencias dañinas (riesgo moderado) hasta que el técnico los ajuste.",
          "Si una persona especialmente sensible ocupa un puesto, se revisa la probabilidad de los riesgos que le afectan y, si procede, se emite un informe de adaptación del puesto.",
          "Un riesgo que no puede evaluarse con este método por falta de datos se deriva a una evaluación específica.",
        ],
      },
    ],
  },
  {
    id: "especificas",
    titulo: "Evaluaciones específicas",
    bloques: [
      {
        tipo: "p",
        texto:
          "El método general sirve para la mayoría de los riesgos. Cuando un riesgo exige mediciones, cuestionarios o un análisis más detallado, se realiza una evaluación específica con un método reconocido y sus resultados se incorporan a esta evaluación.",
      },
      {
        tipo: "tabla",
        fuente: "ESPECIFICAS",
        columnas: ["Ámbito", "Cuándo se realiza", "Referencia"],
      },
    ],
  },
  {
    id: "maternidad",
    titulo: "Embarazo, parto reciente y lactancia (ERE)",
    bloques: [
      {
        tipo: "p",
        texto:
          "Cada riesgo del catálogo indica si puede afectar al embarazo, a la lactancia o a ambos, según los agentes y condiciones de trabajo recogidos en la normativa de protección de la maternidad. Con esa información se genera para cada puesto la evaluación de riesgos para embarazo y lactancia (ERE).",
      },
      {
        tipo: "p",
        texto:
          "La ERE indica, para cada puesto, si está exento de riesgo, qué riesgos deben limitarse o adaptarse y cuáles impiden ocupar el puesto durante el embarazo o la lactancia. En ese último caso se estudia el cambio de puesto y, si no es posible, la suspensión del contrato por riesgo durante el embarazo o la lactancia.",
      },
    ],
  },
  {
    id: "pac",
    titulo: "Comprobación de condiciones (PAC)",
    bloques: [
      {
        tipo: "p",
        texto:
          "En cada visita se recorre el cuestionario de comprobación del centro. Todos los puntos se consideran correctos salvo que se registre una incidencia. Algunos bloques solo se revisan si el centro dispone de ese equipo o instalación.",
      },
      {
        tipo: "p",
        texto:
          "Cada incidencia se califica según el nivel de deficiencia observado y las consecuencias que podría tener:",
      },
      {
        tipo: "tabla",
        fuente: "NIVELES_DEFICIENCIA",
        columnas: ["Nivel de deficiencia", "Criterio"],
      },
      {
        tipo: "matrizPac",
      },
      {
        tipo: "p",
        texto:
          "En la siguiente visita se comprueba que cada incidencia está resuelta, en lugar de valorar la eficacia de la medida como en la planificación preventiva.",
      },
    ],
  },
  {
    id: "seguimiento",
    titulo: "Seguimiento de las medidas",
    bloques: [
      {
        tipo: "p",
        texto:
          "Cada medida de la planificación preventiva y cada incidencia de la comprobación de condiciones tiene uno de estos estados. El centro puede actualizarlos desde su acceso y queda registrado quién hizo el cambio y cuándo.",
      },
      {
        tipo: "tabla",
        fuente: "ESTADOS_ACCION",
        columnas: ["Estado", "Significado"],
      },
    ],
  },
  {
    id: "revision",
    titulo: "Revisión de la evaluación",
    bloques: [
      {
        tipo: "p",
        texto:
          "La evaluación se revisa al menos una vez al año para confirmar que sigue vigente. La aplicación avisa cuando una evaluación supera los doce meses sin revisar. Además, se revisa siempre que:",
      },
      {
        tipo: "lista",
        items: [
          "Se incorporen equipos, productos, tecnologías o formas de trabajo nuevas, o se modifiquen los lugares de trabajo.",
          "Se cree un puesto nuevo o cambien de forma relevante las tareas de uno existente.",
          "Se incorpore una persona especialmente sensible o una trabajadora comunique su embarazo o lactancia.",
          "Se produzcan daños a la salud o se detecte que las medidas preventivas no son eficaces.",
          "Lo indiquen los controles periódicos o lo acuerden la empresa y los representantes de los trabajadores.",
        ],
      },
    ],
  },
  {
    id: "documentacion",
    titulo: "Participación y documentación",
    bloques: [
      {
        tipo: "p",
        texto:
          "Se consulta a los delegados de prevención sobre el procedimiento de evaluación y sus resultados. Las personas trabajadoras reciben la información de los riesgos de su puesto y de las medidas que les afectan.",
      },
      {
        tipo: "p",
        texto:
          "La evaluación, la planificación, la comprobación de condiciones y los informes asociados quedan registrados en la aplicación con su versión y fecha. Cada evaluación conserva la versión de esta metodología con la que se realizó.",
      },
    ],
  },
];

export const ESPECIFICAS = [
  {
    ambito: "Psicosocial",
    cuando:
      "Si se detectan riesgos de carga mental, organización del trabajo, turnos, trato con pacientes o conflictos.",
    referencia: "Método validado, como el FPSICO del INSST.",
  },
  {
    ambito: "Violencia externa",
    cuando: "Siempre que haya atención directa a pacientes.",
    referencia:
      "Protocolo de prevención de agresiones y registro de incidentes del centro.",
  },
  {
    ambito: "Movilización de pacientes y cargas",
    cuando: "Puestos con movilización de pacientes o manejo habitual de cargas.",
    referencia:
      "Métodos específicos de movilización de pacientes y normativa de manipulación manual de cargas.",
  },
  {
    ambito: "Agentes biológicos",
    cuando:
      "Contacto con sangre, fluidos o pacientes con enfermedades transmisibles.",
    referencia: "Normativa de exposición a agentes biológicos.",
  },
  {
    ambito: "Agentes químicos",
    cuando: "Uso habitual de productos de limpieza, desinfección o lavandería.",
    referencia: "Normativa de agentes químicos y fichas de seguridad.",
  },
  {
    ambito: "Pantallas de visualización",
    cuando: "Uso de pantallas durante una parte relevante de la jornada.",
    referencia: "Normativa de pantallas de visualización.",
  },
  {
    ambito: "Condiciones ambientales",
    cuando: "Dudas sobre iluminación, temperatura, humedad o ruido.",
    referencia: "Mediciones según la normativa de lugares de trabajo.",
  },
];

// Mapa para que la vista resuelva tablas por nombre
export const FUENTES = {
  CONSECUENCIAS: CONSECUENCIAS.map((c) => [`${c.nombre} (${c.codigo})`, c.descripcion, c.ejemplos]),
  PROBABILIDADES: PROBABILIDADES.map((p) => [`${p.nombre} (${p.codigo})`, p.descripcion]),
  NIVELES: NIVELES.map((n) => [`${n.nombre} (${n.codigo})`, n.actuacion, n.plazo]),
  NIVELES_DEFICIENCIA: NIVELES_DEFICIENCIA.map((d) => [d.nombre, d.descripcion]),
  PRIORIDADES_PAC: PRIORIDADES_PAC.map((p) => [p.nombre, p.plazo]),
  ESTADOS_ACCION: ESTADOS_ACCION.map((e) => [e.nombre, e.descripcion]),
  ESPECIFICAS: ESPECIFICAS.map((e) => [e.ambito, e.cuando, e.referencia]),
};
