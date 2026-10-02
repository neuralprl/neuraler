// Reglas del plan de acción preventiva (PAP): plazos por prioridad, coste, fechas y textos de estado.
// Funciones puras, sin red ni base de datos.

export const RESPONSABLES = ['Dirección del centro', 'Servicio de prevención']
export const RESPONSABLE_DEFECTO = RESPONSABLES[0]
export const COSTE_POR_DEFECTO = 'Medida incluida en el presupuesto del centro'

// Plazo para ejecutar la acción según la valoración del riesgo (de más a menos urgente).
export const PLAZO_POR_VR = {
  IN: { etiqueta: 'Inmediata', dias: 0 },
  IM: { etiqueta: '3 días', dias: 3 },
  MO: { etiqueta: '1 mes', meses: 1 },
  TO: { etiqueta: '3 meses', meses: 3 },
  T: { etiqueta: '1 año', meses: 12 },
}

export function fechaES(iso) {
  const m = String(iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

// Fecha de hoy en hora local (AAAA-MM-DD).
export function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Suma días o meses a una fecha AAAA-MM-DD (si el mes destino es más corto, usa su último día).
export function sumarPlazo(fechaISO, { dias = 0, meses = 0 } = {}) {
  const m = String(fechaISO ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  let y = +m[1]
  let mo = +m[2] - 1
  let d = +m[3]
  if (meses) {
    const total = mo + meses
    y += Math.floor(total / 12)
    mo = total % 12
    d = Math.min(d, new Date(Date.UTC(y, mo + 1, 0)).getUTCDate())
  }
  return new Date(Date.UTC(y, mo, d + dias)).toISOString().slice(0, 10)
}

export const plazoPorDefecto = (vr, fechaEvaluacion) =>
  PLAZO_POR_VR[vr] ? sumarPlazo(fechaEvaluacion, PLAZO_POR_VR[vr]) : null

// Fecha límite para comprobar la eficacia: 12 meses desde la evaluación.
export const limiteEficacia = (fechaEvaluacion) => sumarPlazo(fechaEvaluacion, { meses: 12 })

// Si el texto es una cifra, devuelve "1.500,50 €"; si es texto libre, lo deja igual;
// si está vacío, vuelve al texto por defecto.
export function formatearCoste(valor) {
  const t = String(valor ?? '').trim()
  if (!t) return COSTE_POR_DEFECTO
  const limpio = t.replace(/€/g, '').replace(/\s/g, '')
  if (!/^\d[\d.,]*$/.test(limpio)) return t
  let num
  if (limpio.includes(',')) num = parseFloat(limpio.replace(/\./g, '').replace(',', '.'))
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) num = parseFloat(limpio.replace(/\./g, ''))
  else num = parseFloat(limpio)
  if (Number.isNaN(num)) return t
  const [ent, dec] = num.toFixed(2).split('.')
  const agrupado = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${agrupado}${dec === '00' ? '' : ',' + dec} €`
}

export function textoRealizacion(f) {
  if (f.estado_accion !== 'realizada') return 'Pendiente'
  return f.fecha_realizacion ? `Realizada el ${fechaES(f.fecha_realizacion)}` : 'Realizada'
}

export function textoEficacia(f, fechaEvaluacion) {
  if (f.eficacia_estado === 'realizada') {
    return f.fecha_eficacia ? `Comprobada el ${fechaES(f.fecha_eficacia)}` : 'Comprobada'
  }
  const limite = fechaES(limiteEficacia(fechaEvaluacion))
  return limite ? `Pendiente (límite ${limite})` : 'Pendiente'
}
