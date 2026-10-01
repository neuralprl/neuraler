import { useEffect, useMemo, useState } from 'react'
import { COLOR_VR, ORDEN_VR, vrDe } from './evalLogic'
import {
  ESTADOS_ACCION, PRIORIDADES, descargar, excelPAP, filasPAP, htmlPAP, imprimir, nombreArchivo,
} from './documentos'

// Plan de acción preventiva (PAP): los riesgos de la evaluación agrupados por prioridad,
// con responsable, plazo y estado de cada acción. Se guarda en la propia evaluación.
// Props: supabase, evaluacion {id, fecha, estado, centro, puesto}, onVolver

const campo = { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4, fontSize: 14, textAlign: 'left' }
const COLUMNAS = 'id,evaluacion_id,riesgo_id,riesgo_nombre,condicion,p,c,medidas,origen,responsable,plazo,estado_accion'

export default function PlanPreventivo({ supabase, evaluacion, onVolver }) {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [cambiados, setCambiados] = useState(() => new Set())
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('evaluacion_riesgos').select(COLUMNAS).eq('evaluacion_id', evaluacion.id)
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message.includes('responsable') || err.message.includes('estado_accion')
            ? 'Falta ampliar la base de datos: ejecuta migracion_pap.sql en el SQL Editor de Supabase.'
            : err.message)
        } else {
          setFilas(data.map((r) => ({ ...r, medidas: r.medidas ?? [], estado_accion: r.estado_accion ?? 'pendiente' })))
        }
        setCargando(false)
      })
  }, [supabase, evaluacion.id])

  const plan = useMemo(() => filasPAP(filas), [filas])
  const sinVR = useMemo(() => filas.filter((f) => !vrDe(f.p, f.c)).length, [filas])
  const porVR = useMemo(() => {
    const m = {}
    plan.forEach((f) => { (m[f.vr] = m[f.vr] || []).push(f) })
    return m
  }, [plan])

  function cambiar(id, parche) {
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, ...parche } : f)))
    setCambiados((s) => new Set(s).add(id))
    setMensaje('')
  }

  async function guardar() {
    setError(''); setMensaje('')
    const payload = filas.filter((f) => cambiados.has(f.id)).map((f) => ({
      id: f.id, evaluacion_id: f.evaluacion_id, riesgo_nombre: f.riesgo_nombre, condicion: f.condicion, origen: f.origen,
      responsable: (f.responsable ?? '').trim() || null,
      plazo: f.plazo || null,
      estado_accion: f.estado_accion,
    }))
    if (!payload.length) return
    setGuardando(true)
    try {
      for (let i = 0; i < payload.length; i += 200) {
        const { error: err } = await supabase.from('evaluacion_riesgos').upsert(payload.slice(i, i + 200), { onConflict: 'id' })
        if (err) throw err
      }
      setCambiados(new Set())
      setMensaje('Plan guardado.')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function bajarExcel() {
    setError('')
    try {
      const blob = await excelPAP(evaluacion, plan)
      descargar(blob, nombreArchivo('PAP', evaluacion, 'xlsx'))
    } catch (err) {
      setError('No se pudo generar el Excel: ' + err.message)
    }
  }

  function verPDF() {
    setError('')
    try { imprimir(htmlPAP(evaluacion, plan)) } catch (err) { setError(err.message) }
  }

  function volver() {
    if (cambiados.size > 0 && !window.confirm('Hay cambios sin guardar en el plan. ¿Salir igualmente?')) return
    onVolver()
  }

  return (
    <div style={{ textAlign: 'left' }}>
      <h2>Plan de acción preventiva (PAP)</h2>
      <p>
        <b>{evaluacion.centro.codigo} · {evaluacion.centro.nombre}</b><br />
        Puesto: <b>{evaluacion.puesto.nombre}</b> · {evaluacion.fecha}
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={guardar} disabled={guardando || cambiados.size === 0} style={{ padding: '8px 16px', fontWeight: 600 }}>
          {guardando ? 'Guardando...' : 'Guardar plan'}
        </button>
        <button className="secundario" onClick={bajarExcel} disabled={cargando || plan.length === 0}>Descargar Excel</button>
        <button className="secundario" onClick={verPDF} disabled={cargando || plan.length === 0}>Generar PDF</button>
        <button className="secundario" onClick={volver} disabled={guardando}>Volver a la evaluación</button>
      </div>

      {cambiados.size > 0 && <p style={{ color: '#8a6d00' }}>Hay cambios sin guardar.</p>}
      {mensaje && <p style={{ color: '#2e7d32' }}>{mensaje}</p>}
      {error && <p style={{ color: '#b00020', background: '#fdecea', padding: 10, borderRadius: 6 }}>{error}</p>}
      {cargando && <p>Cargando...</p>}
      {!cargando && sinVR > 0 && (
        <p style={{ color: '#b00020' }}>
          {sinVR} riesgo/s sin P o C no aparecen en el plan. Complétalos en la evaluación.
        </p>
      )}
      {!cargando && plan.length === 0 && !error && <p className="vacio">No hay riesgos valorados para planificar.</p>}

      {Object.keys(ORDEN_VR).filter((k) => porVR[k]).map((vr) => {
        const pr = PRIORIDADES[vr]
        return (
          <section key={vr} style={{ marginBottom: 24 }}>
            <h3 style={{ borderLeft: `6px solid ${COLOR_VR[vr]}`, paddingLeft: 10, margin: '16px 0 4px' }}>
              Prioridad {pr.prioridad} · {vr} {pr.nombre} ({porVR[vr].length})
            </h3>
            <p style={{ margin: '0 0 10px', opacity: 0.8 }}>{pr.accion}</p>

            {porVR[vr].map((f) => (
              <div key={f.id} style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <strong>{f.riesgo_id} · {f.riesgo_nombre}</strong>
                <p style={{ margin: '4px 0' }}>{f.condicion}</p>
                {f.medidas.length > 0 && (
                  <ul style={{ margin: '4px 0 8px 18px', padding: 0 }}>
                    {f.medidas.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <label style={campo}>
                    <span>Responsable</span>
                    <input value={f.responsable ?? ''} onChange={(e) => cambiar(f.id, { responsable: e.target.value })} />
                  </label>
                  <label style={campo}>
                    <span>Plazo</span>
                    <input type="date" value={f.plazo ?? ''} onChange={(e) => cambiar(f.id, { plazo: e.target.value })} />
                  </label>
                  <label style={campo}>
                    <span>Estado</span>
                    <select value={f.estado_accion} onChange={(e) => cambiar(f.id, { estado_accion: e.target.value })}>
                      {Object.entries(ESTADOS_ACCION).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
