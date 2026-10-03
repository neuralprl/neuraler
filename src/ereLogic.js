// Genera la evaluación de riesgos para embarazo, parto reciente y lactancia (ERE) de un puesto
// a partir de los riesgos de su evaluación. Funciones puras, sin red ni base de datos.
import { ACCIONES, CONDICIONES_ERE } from './ereContenido.js'

// Nivel de riesgo de agresión para la embarazada.
// Nivel I si la contención forma parte de la actividad (sala de contención, psiquiatría de adultos con
// hospitalización, menores con régimen residencial u hospitalario) o si el registro de agresiones muestra
// 3 o más agresiones físicas a ese puesto en 12 meses. Si no, nivel II.
export function nivelAgresiones(centro = {}, agresionesFisicas12m = 0) {
  const motivos = []
  const reg = centro.regimen
  if (centro.sala_contencion) motivos.push('el centro dispone de sala de contención')
  if (centro.usuarios_psiquiatrico_adultos && ['hospitalizacion', 'mixto'].includes(reg)) motivos.push('atiende a adultos con patología psiquiátrica en hospitalización')
  if (centro.usuarios_infantil_juvenil && ['residencial', 'hospitalizacion', 'mixto'].includes(reg)) motivos.push('atiende a menores en régimen residencial u hospitalario')
  if (agresionesFisicas12m >= 3) motivos.push(`el registro recoge ${agresionesFisicas12m} agresiones físicas a este puesto en los últimos 12 meses`)
  return { nivel: motivos.length ? 'I' : 'II', motivos }
}

// filas: [{ riesgo_id, riesgo_nombre, condicion, p, c }] de la evaluación del puesto.
// ctx: { centro, agresionesFisicas12m, agresiones12m }
export function generarERE(filas, ctx = {}) {
  const entradas = []
  for (const c of CONDICIONES_ERE) {
    const origen = filas.filter((f) => { try { return c.si(f) } catch { return false } })
    if (!origen.length) continue
    const e = { ...c, origen: origen.map((f) => ({ riesgo_id: f.riesgo_id, riesgo_nombre: f.riesgo_nombre, condicion: f.condicion })) }
    delete e.si
    if (c.id === 'R38-agresiones') {
      const n = nivelAgresiones(ctx.centro, ctx.agresionesFisicas12m ?? 0)
      e.nivel = n.nivel
      e.motivosNivel = n.motivos
      e.agresiones12m = ctx.agresiones12m ?? 0
      e.accion = n.nivel === 'I' ? 'retirada' : 'adaptar'
      e.semana = n.nivel === 'I' ? 12 : null
    }
    entradas.push(e)
  }
  const num = (r) => parseInt(String(r).replace(/\D/g, ''), 10) || 0
  entradas.sort((a, b) => num(a.r) - num(b.r))
  const porAccion = Object.fromEntries(Object.keys(ACCIONES).map((k) => [k, entradas.filter((e) => e.accion === k).length]))
  const relevantes = entradas.filter((e) => e.accion !== 'sin_exclusion')
  const peor = relevantes.reduce((m, e) => (m == null || ACCIONES[e.accion].orden < ACCIONES[m].orden ? e.accion : m), null)
  return {
    entradas,
    porAccion,
    exento: relevantes.length === 0,
    conclusion: conclusionERE(peor, relevantes.length),
    tareas: [...new Set(relevantes.map((e) => e.grupo))],
    afecta: { EM: entradas.some((e) => e.EM), PR: entradas.some((e) => e.PR), LA: entradas.some((e) => e.LA) },
  }
}

export function conclusionERE(peor, n) {
  if (!n) return 'Puesto exento de riesgo específico para el embarazo, el parto reciente y la lactancia natural con las condiciones evaluadas. Se mantienen las medidas preventivas generales del puesto.'
  if (peor === 'retirada') return 'El puesto incluye tareas no compatibles con el embarazo o la lactancia. Hay que adaptar el puesto retirando esas tareas; si no es posible, cambiar a un puesto exento de riesgo y, en último término, tramitar la suspensión del contrato por riesgo durante el embarazo o la lactancia (art. 26 de la Ley 31/1995).'
  if (peor === 'limitar') return 'El puesto es compatible con el embarazo adaptando las condiciones de trabajo y limitando las tareas indicadas a partir de la semana de gestación que corresponda. Si la adaptación no es posible, se estudia el cambio de puesto (art. 26 de la Ley 31/1995).'
  if (peor === 'adaptar') return 'El puesto es compatible con el embarazo y la lactancia con las adaptaciones indicadas.'
  return 'El puesto es compatible con el embarazo y la lactancia, pendiente de la valoración individual indicada (serología, mediciones o fichas de datos de seguridad).'
}

// Texto de a quién aplica una condición: «Embarazo, parto reciente».
export const aQuien = (e) => [e.EM && 'Embarazo', e.PR && 'Parto reciente', e.LA && 'Lactancia'].filter(Boolean).join(', ')
