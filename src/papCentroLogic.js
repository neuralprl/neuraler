// PAP del centro: une las medidas repetidas de todos los puestos en una sola acción.
// Cada acción toma la prioridad más restrictiva (del lado de la seguridad) y guarda en qué puestos
// aparece y con qué prioridad, para indicar dónde podría ser más baja.
// Funciones puras, sin red ni base de datos.
import { ORDEN_VR, vrDe } from './evalLogic.js'
import { limpiar } from './importLogic.js'
import { COSTE_POR_DEFECTO, RESPONSABLE_DEFECTO, plazoPorDefecto } from './planLogic.js'

const sinAcentos = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// Dos medidas son la misma si coinciden al quitar mayúsculas, acentos, signos y la coletilla
// «Dejar constancia documental de su entrega» (que no cambia la medida).
export function claveMedida(texto) {
  return sinAcentos(texto).toLowerCase()
    .replace(/dejar constancia documental de (su|la) entrega/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export const masGrave = (a, b) => (!a ? b : !b ? a : ORDEN_VR[a] <= ORDEN_VR[b] ? a : b)

// filas: filas de evaluacion_riesgos de los puestos del centro.
// puestoDe: Map evaluacion_id -> { puesto_id, nombre }.
export function consolidarPAP(filas, puestoDe) {
  const m = new Map()
  for (const f of filas) {
    const vr = vrDe(f.p, f.c)
    const pu = puestoDe.get(f.evaluacion_id)
    if (!vr || !pu) continue
    const medidas = (f.medidas ?? []).map((t) => String(t ?? '').trim()).filter(Boolean)
    const items = medidas.length
      ? medidas.map((t) => ({ clave: `m:${claveMedida(t)}`, texto: t, sin: false }))
      : [{ clave: `r:${f.riesgo_id}|${claveMedida(f.condicion)}`, texto: `Definir medidas preventivas para ${f.riesgo_id} · ${f.riesgo_nombre}: ${limpiar(f.condicion ?? '')}`, sin: true }]
    const vistas = new Set()
    for (const it of items) {
      if (vistas.has(it.clave)) continue
      vistas.add(it.clave)
      let a = m.get(it.clave)
      if (!a) {
        a = { clave: it.clave, medida: it.texto, sin_medida: it.sin, vr, riesgos: new Map(), puestos: new Map(), origen: [] }
        m.set(it.clave, a)
      }
      if (it.texto.length > a.medida.length) a.medida = it.texto       // la redacción más completa
      a.vr = masGrave(a.vr, vr)
      a.riesgos.set(f.riesgo_id, f.riesgo_nombre)
      const p = a.puestos.get(pu.puesto_id)
      a.puestos.set(pu.puesto_id, { puesto_id: pu.puesto_id, nombre: pu.nombre, vr: masGrave(p?.vr, vr) })
      a.origen.push(f)
    }
  }
  const num = (id) => parseInt(String(id).replace(/\D/g, ''), 10) || 0
  return [...m.values()].map((a) => ({
    clave: a.clave,
    medida: a.medida,
    sin_medida: a.sin_medida,
    vr: a.vr,
    riesgos: [...a.riesgos].map(([id, nombre]) => ({ id, nombre })).sort((x, y) => num(x.id) - num(y.id)),
    puestos: [...a.puestos.values()].sort((x, y) => x.nombre.localeCompare(y.nombre, 'es')),
    origen: a.origen,
  })).sort((x, y) => ORDEN_VR[x.vr] - ORDEN_VR[y.vr] || x.medida.localeCompare(y.medida, 'es'))
}

// Puestos en los que esa medida tiene una prioridad más baja que la aplicada.
export const puestosConMenorPrioridad = (a) => (a.puestos ?? []).filter((p) => p.vr && p.vr !== a.vr)

// Primera vez que se crea la acción: hereda lo que ya se hubiera anotado en el PAP por puesto.
// Solo se da por realizada si estaba realizada en todos los puestos.
export function heredarGestion(origen, vr, fechaEval) {
  const valor = (campo, defecto) => origen.map((o) => (o[campo] ?? '').trim()).find((v) => v && v !== defecto) ?? defecto
  const plazos = origen.map((o) => o.plazo).filter(Boolean).sort()
  const todas = origen.length > 0 && origen.every((o) => o.estado_accion === 'realizada')
  const eficaz = todas && origen.every((o) => o.eficacia_estado === 'realizada')
  const max = (campo) => origen.map((o) => o[campo]).filter(Boolean).sort().pop() ?? null
  return {
    responsable: valor('responsable', RESPONSABLE_DEFECTO),
    coste: valor('coste', COSTE_POR_DEFECTO),
    plazo: plazos[0] ?? plazoPorDefecto(vr, fechaEval),
    estado_accion: todas ? 'realizada' : 'pendiente',
    fecha_realizacion: todas ? max('fecha_realizacion') : null,
    eficacia_estado: eficaz ? 'realizada' : 'pendiente',
    fecha_eficacia: eficaz ? max('fecha_eficacia') : null,
  }
}

// Qué hay que cambiar en pap_acciones para que refleje la evaluación actual.
// Se conservan responsable, coste, plazo y estados de las acciones que ya existían.
export function planSincronizacion(calculadas, guardadas, evcId, fechaEval) {
  const g = new Map(guardadas.map((x) => [x.clave, x]))
  const insertar = []
  const actualizar = []
  const retirar = []
  const enCalculo = new Set()
  for (const a of calculadas) {
    enCalculo.add(a.clave)
    const base = { medida: a.medida, sin_medida: a.sin_medida, vr: a.vr, riesgos: a.riesgos, puestos: a.puestos, vigente: true }
    const old = g.get(a.clave)
    if (!old) { insertar.push({ evaluacion_centro_id: evcId, clave: a.clave, ...base, ...heredarGestion(a.origen, a.vr, fechaEval) }); continue }
    const cambios = {}
    for (const k of Object.keys(base)) {
      if (JSON.stringify(old[k] ?? null) !== JSON.stringify(base[k])) cambios[k] = base[k]
    }
    // Si cambia la prioridad y el plazo era el de la prioridad anterior, se recalcula.
    if (cambios.vr && old.estado_accion !== 'realizada' && (!old.plazo || old.plazo === plazoPorDefecto(old.vr, fechaEval))) {
      cambios.plazo = plazoPorDefecto(a.vr, fechaEval)
    }
    if (Object.keys(cambios).length) actualizar.push({ id: old.id, evaluacion_centro_id: evcId, clave: a.clave, ...cambios })
  }
  for (const old of guardadas) {
    if (enCalculo.has(old.clave)) continue
    if (old.estado_accion === 'realizada') { if (old.vigente !== false) actualizar.push({ id: old.id, evaluacion_centro_id: evcId, clave: old.clave, vigente: false }) }
    else retirar.push(old.id)
  }
  return { insertar, actualizar, retirar }
}

// Resumen para la cabecera del PAP.
export function resumenPAPCentro(acciones) {
  const vig = acciones.filter((a) => a.vigente !== false)
  const unidas = vig.filter((a) => (a.puestos ?? []).length > 1).length
  return {
    total: vig.length,
    pendientes: vig.filter((a) => a.estado_accion !== 'realizada').length,
    unidas,
    conMenor: vig.filter((a) => puestosConMenorPrioridad(a).length > 0).length,
    sinMedida: vig.filter((a) => a.sin_medida).length,
  }
}
