import { useEffect, useMemo, useState } from 'react'
import { ACCIONES } from './ereContenido'
import { aQuien } from './ereLogic'
import { calcularERE, descargarERE } from './ereDatos'
import { fechaES } from './planLogic'

// Evaluación de riesgos para embarazo, parto reciente y lactancia (ERE) de cada puesto evaluado.
// Se genera sola con los riesgos de la evaluación del puesto en cuanto el puesto se marca como evaluado.
// Uso: técnico <EvaluacionEmbarazo supabase={supabase} />   centro: igual (solo ve sus puestos).
const aviso = { color: '#b00020', background: '#fdecea', padding: 10, borderRadius: 6 }
const quitar = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function Vista({ ere }) {
  return (
    <div>
      <p style={{ margin: '6px 0' }}><b>Conclusión:</b> {ere.conclusion}</p>
      {ere.tareas.length > 0 && <p style={{ margin: '6px 0' }}><b>Tareas afectadas:</b> {ere.tareas.join(', ')}</p>}
      {ere.entradas.map((e) => (
        <div key={e.id} style={{ borderLeft: `5px solid ${ACCIONES[e.accion].color}`, padding: '4px 10px', margin: '8px 0' }}>
          <strong>{e.r} · {e.condicion}</strong>
          <div style={{ fontSize: 13, color: ACCIONES[e.accion].color, fontWeight: 600 }}>
            {ACCIONES[e.accion].nombre}{e.semana ? ` · desde la semana ${e.semana}` : ''}{e.nivel ? ` · nivel ${e.nivel}` : ''} · {aQuien(e)}
          </div>
          <ul style={{ margin: '4px 0 0', fontSize: 14 }}>{e.medidas.map((m, i) => <li key={i}>{m}</li>)}</ul>
          {e.nivel && <div style={{ fontSize: 13, opacity: 0.8 }}>{e.motivosNivel.length ? `Nivel I porque ${e.motivosNivel.join('; ')}.` : 'Nivel II.'} Registro de agresiones: {e.agresiones12m} a este puesto en 12 meses.</div>}
        </div>
      ))}
    </div>
  )
}

export default function EvaluacionEmbarazo({ supabase }) {
  const [evals, setEvals] = useState(null)
  const [busca, setBusca] = useState('')
  const [abierta, setAbierta] = useState(null)
  const [trabajando, setTrabajando] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('evaluaciones').select('id,fecha,estado,centros(id,codigo,nombre),puestos(id,nombre)').eq('estado', 'cerrada').order('fecha', { ascending: false }).limit(2000)
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setEvals([]) }
        else setEvals(data.map((e) => ({ id: e.id, fecha: e.fecha, centro: e.centros, puesto: e.puestos })))
      })
  }, [supabase])

  const lista = useMemo(() => {
    const q = quitar(busca.trim())
    return (evals ?? []).filter((e) => !q || quitar(`${e.centro?.codigo} ${e.centro?.nombre} ${e.puesto?.nombre}`).includes(q))
      .sort((a, b) => `${a.centro?.codigo} ${a.puesto?.nombre}`.localeCompare(`${b.centro?.codigo} ${b.puesto?.nombre}`, 'es'))
  }, [evals, busca])

  async function ver(ev) {
    if (abierta?.id === ev.id) { setAbierta(null); return }
    setError(''); setTrabajando(`${ev.id}-ver`)
    try { setAbierta({ id: ev.id, ere: await calcularERE(supabase, ev) }) } catch (e) { setError(e.message) }
    setTrabajando('')
  }
  async function bajar(ev, formato) {
    setError(''); setTrabajando(`${ev.id}-${formato}`)
    try { await descargarERE(supabase, ev, formato) } catch (e) { setError('No se pudo generar la evaluación: ' + e.message) }
    setTrabajando('')
  }

  return (
    <div style={{ textAlign: 'left' }}>
      <h2>Evaluación de Riesgos Embarazadas (ERE)</h2>
      <p style={{ opacity: 0.8, marginTop: 0, maxWidth: 820 }}>
        Evaluación para trabajadoras embarazadas, que han dado a luz o en periodo de lactancia. Se genera sola con los riesgos
        de la evaluación de cada puesto en cuanto el puesto está evaluado. Solo aparecen los puestos marcados como evaluados.
      </p>
      {error && <p style={aviso}>{error}</p>}
      <input type="search" placeholder="Buscar por centro o puesto" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ padding: '7px 10px', margin: '0 0 12px', width: '100%', maxWidth: 360, boxSizing: 'border-box' }} />
      {!evals && <p>Cargando...</p>}
      {evals && lista.length === 0 && !error && <p className="vacio">Todavía no hay puestos evaluados.</p>}
      {lista.map((e) => (
        <div key={e.id} style={{ border: '1px solid #d9dfe3', borderRadius: 8, marginBottom: 8, background: '#fff' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '10px 14px' }}>
            <span style={{ flex: '1 1 260px' }}><strong>{e.puesto?.nombre}</strong><br /><small style={{ opacity: 0.7 }}>{e.centro?.codigo} · {e.centro?.nombre} · evaluado el {fechaES(e.fecha)}</small></span>
            <button className="secundario" disabled={!!trabajando} onClick={() => ver(e)}>{abierta?.id === e.id ? 'Ocultar' : trabajando === `${e.id}-ver` ? 'Calculando...' : 'Ver'}</button>
            <button disabled={!!trabajando} onClick={() => bajar(e, 'word')}>{trabajando === `${e.id}-word` ? 'Generando...' : 'Descargar evaluación para embarazada (Word)'}</button>
            <button className="secundario" disabled={!!trabajando} onClick={() => bajar(e, 'pdf')}>{trabajando === `${e.id}-pdf` ? 'Generando...' : 'PDF'}</button>
          </div>
          {abierta?.id === e.id && <div style={{ padding: '4px 16px 14px', borderTop: '1px solid #d9dfe3' }}><Vista ere={abierta.ere} /></div>}
        </div>
      ))}
    </div>
  )
}
