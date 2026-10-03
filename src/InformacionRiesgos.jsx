import { useEffect, useMemo, useState } from 'react'
import { ordenarFilas } from './evalLogic'
import { descargar, htmlIR, imprimir, nombreArchivo, wordIR } from './documentos'
import { fechaES } from './planLogic'

// Información de riesgos (IR) de todas las evaluaciones, para descargarla en Word o PDF sin entrar en cada evaluación.
const aviso = { color: '#b00020', background: '#fdecea', padding: 10, borderRadius: 6 }
const quitar = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function InformacionRiesgos({ supabase }) {
  const [evals, setEvals] = useState(null)
  const [busca, setBusca] = useState('')
  const [trabajando, setTrabajando] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('evaluaciones').select('id,fecha,estado,centros(id,codigo,nombre),puestos(id,nombre)').in('estado', ['borrador', 'cerrada']).order('fecha', { ascending: false }).limit(1000)
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setEvals([]) }
        else setEvals(data.map((e) => ({ id: e.id, fecha: e.fecha, estado: e.estado, centro: e.centros, puesto: e.puestos })))
      })
  }, [supabase])

  const lista = useMemo(() => {
    const q = quitar(busca.trim())
    return (evals ?? []).filter((e) => !q || quitar(`${e.centro?.codigo} ${e.centro?.nombre} ${e.puesto?.nombre}`).includes(q))
  }, [evals, busca])

  async function filasDe(ev) {
    const { data, error: err } = await supabase.from('evaluacion_riesgos')
      .select('id,riesgo_id,riesgo_nombre,condicion,p,c,medidas,origen').eq('evaluacion_id', ev.id)
    if (err) throw err
    return ordenarFilas(data.map((r) => ({ ...r, medidas: r.medidas ?? [] })))
  }
  async function generar(ev, formato) {
    setError(''); setTrabajando(`${ev.id}-${formato}`)
    try {
      const filas = await filasDe(ev)
      if (formato === 'word') descargar(await wordIR(ev, filas), nombreArchivo('IR', ev, 'docx'))
      else imprimir(htmlIR(ev, filas))
    } catch (err) { setError('No se pudo generar el documento: ' + err.message) }
    setTrabajando('')
  }

  return (
    <div style={{ textAlign: 'left' }}>
      <h2>Información de Riesgos (IR)</h2>
      <p style={{ opacity: 0.8, marginTop: 0 }}>Documento de información de riesgos de cada evaluación, en Word o PDF.</p>
      {error && <p style={aviso}>{error}</p>}
      <input type="search" placeholder="Buscar por centro o puesto" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ padding: '7px 10px', margin: '0 0 12px', width: '100%', maxWidth: 360, boxSizing: 'border-box' }} />
      {!evals && <p>Cargando...</p>}
      {evals && lista.length === 0 && !error && <p className="vacio">No hay evaluaciones.</p>}
      {lista.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: 8 }}>Fecha</th><th style={{ padding: 8 }}>Centro</th><th style={{ padding: 8 }}>Puesto</th><th style={{ padding: 8 }}>Estado</th><th style={{ padding: 8 }} />
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #e5e5e5' }}>
                  <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{fechaES(e.fecha)}</td>
                  <td style={{ padding: 8 }}>{e.centro?.codigo} · {e.centro?.nombre}</td>
                  <td style={{ padding: 8 }}>{e.puesto?.nombre}</td>
                  <td style={{ padding: 8 }}>{e.estado === 'cerrada' ? 'Cerrada' : 'Borrador'}</td>
                  <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                    <button className="secundario" disabled={!!trabajando} onClick={() => generar(e, 'word')}>{trabajando === `${e.id}-word` ? 'Generando...' : 'Word'}</button>{' '}
                    <button className="secundario" disabled={!!trabajando} onClick={() => generar(e, 'pdf')}>{trabajando === `${e.id}-pdf` ? 'Generando...' : 'PDF'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
