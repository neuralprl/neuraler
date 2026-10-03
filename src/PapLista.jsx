import { useEffect, useMemo, useState } from 'react'
import PlanPreventivo from './PlanPreventivo'
import { accionesPAP, hoyISO, resumen } from './panelLogic'
import { fechaES } from './planLogic'
import { leerTodo } from './supabaseUtil'

// Plan de acción (PAP) fuera de la evaluación: lista de evaluaciones con sus acciones pendientes y plazos.
// Técnico: <PapLista supabase={supabase} />    Centro: <PapLista supabase={supabase} soloEstado inicial={idEvaluacion} />
const aviso = { color: '#b00020', background: '#fdecea', padding: 10, borderRadius: 6 }
const quitar = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function PapLista({ supabase, soloEstado = false, inicial = null }) {
  const [evals, setEvals] = useState(null)
  const [filas, setFilas] = useState([])
  const [abierta, setAbierta] = useState(null)
  const [busca, setBusca] = useState('')
  const [error, setError] = useState('')

  async function cargar() {
    try {
      const e = (await leerTodo(() => supabase.from('evaluaciones').select('id,fecha,estado,centros(id,codigo,nombre),puestos(id,nombre)').in('estado', ['borrador', 'cerrada']).order('fecha', { ascending: false })))
        .map((x) => ({ id: x.id, fecha: x.fecha, estado: x.estado, centro: x.centros, puesto: x.puestos }))
      const f = await leerTodo(() => supabase.from('evaluacion_riesgos').select('id,evaluacion_id,riesgo_id,riesgo_nombre,p,c,plazo,estado_accion').order('id'))
      setEvals(e); setFilas(f)
      if (inicial) setAbierta(e.find((x) => x.id === inicial) ?? null)
    } catch (err) { setError(err.message); setEvals([]) }
  }
  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hoy = hoyISO()
  const cuentas = useMemo(() => {
    const acc = accionesPAP(filas, evals ?? [], hoy)
    const m = {}
    ;(evals ?? []).forEach((e) => { m[e.id] = resumen(acc.filter((a) => a.evaluacion_id === e.id)) })
    return m
  }, [filas, evals, hoy])

  const lista = useMemo(() => {
    const q = quitar(busca.trim())
    return (evals ?? []).filter((e) => !q || quitar(`${e.centro?.codigo} ${e.centro?.nombre} ${e.puesto?.nombre}`).includes(q))
  }, [evals, busca])

  if (abierta) return <PlanPreventivo supabase={supabase} evaluacion={abierta} soloEstado={soloEstado} onVolver={() => { setAbierta(null); cargar() }} />

  return (
    <div style={{ textAlign: 'left' }}>
      <h2>Planificación Actividad Preventiva (PAP)</h2>
      <p style={{ opacity: 0.8, marginTop: 0 }}>Acciones pendientes de cada evaluación y sus plazos.</p>
      {error && <p style={aviso}>{error}</p>}
      <input type="search" placeholder="Buscar por centro o puesto" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ padding: '7px 10px', margin: '0 0 12px', width: '100%', maxWidth: 360, boxSizing: 'border-box' }} />
      {!evals && <p>Cargando...</p>}
      {evals && lista.length === 0 && !error && <p className="vacio">No hay evaluaciones.</p>}
      {lista.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: 8 }}>Fecha</th><th style={{ padding: 8 }}>Centro</th><th style={{ padding: 8 }}>Puesto</th>
                <th style={{ padding: 8 }}>Pendientes</th><th style={{ padding: 8 }}>Vencidas</th><th style={{ padding: 8 }}>Próximos 7 días</th><th style={{ padding: 8 }} />
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => {
                const r = cuentas[e.id] ?? { total: 0, vencidas: 0, hoy: 0, manana: 0, semana: 0 }
                const prox = r.hoy + r.manana + r.semana
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid #e5e5e5' }}>
                    <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{fechaES(e.fecha)}</td>
                    <td style={{ padding: 8 }}>{e.centro?.codigo} · {e.centro?.nombre}</td>
                    <td style={{ padding: 8 }}>{e.puesto?.nombre}</td>
                    <td style={{ padding: 8 }}>{r.total}</td>
                    <td style={{ padding: 8, color: r.vencidas ? '#c62828' : undefined, fontWeight: r.vencidas ? 700 : 400 }}>{r.vencidas}</td>
                    <td style={{ padding: 8, color: prox ? '#b8860b' : undefined, fontWeight: prox ? 700 : 400 }}>{prox}</td>
                    <td style={{ padding: 8 }}><button className="secundario" onClick={() => setAbierta(e)}>Abrir</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
