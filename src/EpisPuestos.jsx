import { useMemo, useState } from 'react'
import { ACTIVIDADES_EVALUADAS, PUESTOS_FUNCIONES } from './funcionesContenido'

// EPI de cada puesto, tal como los recogen los documentos de evaluación (del puesto y de sus actividades).
// No se calcula nada: los puestos sin documento aparecen como pendientes hasta tener la hoja de EPI.
const ACT = Object.fromEntries(ACTIVIDADES_EVALUADAS.map((a) => [a.id, a]))
const quitar = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function epiDe(p) {
  const out = []
  const vistos = new Set()
  const add = (origen, texto) => {
    const k = quitar(texto)
    if (!texto || vistos.has(k)) return
    vistos.add(k); out.push({ origen, texto })
  }
  add('Documento del puesto', p.epi)
  p.actividades.forEach((id) => add(ACT[id].nombre, ACT[id].epi))
  return out
}

export default function EpisPuestos() {
  const [busca, setBusca] = useState('')
  const datos = useMemo(() => PUESTOS_FUNCIONES.map((p) => ({ nombre: p.nombre, epi: epiDe(p) })), [])
  const q = quitar(busca.trim())
  const lista = datos.filter((d) => !q || quitar(d.nombre).includes(q))
  const conEpi = datos.filter((d) => d.epi.length > 0).length
  return (
    <div style={{ textAlign: 'left', maxWidth: 1000 }}>
      <h2>EPIs</h2>
      <p style={{ background: '#fde9c4', color: '#7a4b00', padding: '10px 14px', borderRadius: 6 }}>
        Solo figuran los EPI que recogen los documentos de evaluación: {conEpi} de {datos.length} puestos. El resto está pendiente de la hoja de EPI por puesto.
      </p>
      <input type="search" placeholder="Buscar un puesto" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ padding: '7px 10px', margin: '0 0 12px', width: '100%', maxWidth: 340, boxSizing: 'border-box' }} />
      {lista.map((d) => (
        <details key={d.nombre} style={{ border: '1px solid #d9dfe3', borderRadius: 8, marginBottom: 8, background: '#fff' }}>
          <summary style={{ cursor: 'pointer', padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ flex: '1 1 220px' }}>{d.nombre}</strong>
            <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 12, padding: '2px 10px', background: d.epi.length ? '#e8f5e9' : '#fde9c4', color: d.epi.length ? '#1b5e20' : '#7a4b00' }}>
              {d.epi.length ? 'Según los documentos' : 'Pendiente'}
            </span>
          </summary>
          <div style={{ padding: '4px 16px 12px', borderTop: '1px solid #d9dfe3' }}>
            {d.epi.length === 0 && <p style={{ opacity: 0.75 }}>Ningún documento de este puesto ni de sus actividades recoge EPI.</p>}
            {d.epi.map((e, i) => (
              <p key={i} style={{ margin: '10px 0' }}>
                <strong>{e.origen}.</strong> {e.texto}
              </p>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}
