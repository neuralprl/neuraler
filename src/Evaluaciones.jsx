import { useEffect, useMemo, useState } from 'react'
import EvaluacionER from './EvaluacionER'
import BarraAlta from './BarraAlta'
import {
  armarFilasER, filaDesdeMatriz, filasDeCheck, fusionarFilas, nuevoId, ordenarFilas,
} from './evalLogic'

// Uso: <Evaluaciones supabase={supabase} />
// Flujo: lista -> centro y puesto -> (creador de puesto si hace falta) -> check -> evaluación (ER)

const EMBED = 'id,riesgo_id,condicion,p,c,riesgos(nombre),matriz_medidas(medida_id,medidas(texto))'
const campo = { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4, fontSize: 14, textAlign: 'left' }
const ancho = { width: '100%', boxSizing: 'border-box' }
const filaCheck = {
  display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  gap: 12, width: '100%', textAlign: 'left', fontSize: 14, cursor: 'pointer',
}
const casilla = { width: 'auto', flex: 'none', margin: 0 }
const aviso = { color: '#b00020', background: '#fdecea', padding: 10, borderRadius: 6 }

async function cargarFilasPuesto(supabase, puestoId, origen, usarIds = false) {
  const { data, error } = await supabase.from('matriz_puestos').select(EMBED).eq('puesto_id', puestoId)
  if (error) throw error
  return data.map((r) => filaDesdeMatriz(r, origen, usarIds))
}

async function cargarCatalogos(supabase) {
  const [m, r] = await Promise.all([
    supabase.from('medidas').select('id,riesgo_id,texto').order('id'),
    supabase.from('riesgos').select('id,nombre').order('id'),
  ])
  if (m.error || r.error) throw (m.error || r.error)
  return { catalogo: m.data, riesgos: r.data }
}

const filaBD = (f, evaluacionId) => ({
  id: f.id, evaluacion_id: evaluacionId, riesgo_id: f.riesgo_id, riesgo_nombre: f.riesgo_nombre,
  condicion: f.condicion, p: f.p, c: f.c, medidas: f.medidas, origen: f.origen,
})

// ---------------------------------------------------------------------
function NuevaEvaluacion({ supabase, onContinuar, onVolver, trabajando }) {
  const [centros, setCentros] = useState([])
  const [puestos, setPuestos] = useState([])
  const [asignados, setAsignados] = useState([])
  const [filtro, setFiltro] = useState('')
  const [centroId, setCentroId] = useState('')
  const [puestoId, setPuestoId] = useState('')
  const [verTodos, setVerTodos] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('centros').select('id,codigo,nombre').order('codigo'),
      supabase.from('puestos').select('id,nombre').neq('nombre', 'TODOS').order('nombre'),
    ]).then(([c, p]) => {
      if (c.error || p.error) { setError((c.error || p.error).message); return }
      setCentros(c.data); setPuestos(p.data)
    })
  }, [supabase])

  useEffect(() => {
    setPuestoId(''); setAsignados([])
    if (!centroId) return
    supabase.from('centro_puestos').select('puesto_id').eq('centro_id', centroId)
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setAsignados(data.map((r) => r.puesto_id))
      })
  }, [supabase, centroId])

  const centrosVisibles = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    return q ? centros.filter((c) => `${c.codigo} ${c.nombre}`.toLowerCase().includes(q)) : centros
  }, [centros, filtro])

  const hayAsignados = asignados.length > 0
  const puestosVisibles = verTodos || !hayAsignados ? puestos : puestos.filter((p) => asignados.includes(p.id))

  const continuar = () => {
    const centro = centros.find((c) => c.id === centroId)
    const puesto = puestos.find((p) => p.id === puestoId)
    if (centro && puesto) onContinuar(centro, puesto)
  }

  return (
    <div style={{ maxWidth: 560, textAlign: 'left' }}>
      <h2>Nueva evaluación</h2>
      <p style={{ opacity: 0.7 }}>Paso 1 de 3 · Centro y puesto</p>
      {error && <p style={aviso}>{error}</p>}
      {centros.length === 0 && !error && <p className="vacio">Primero hay que crear algún centro.</p>}

      <label style={campo}>
        <span>Centro</span>
        <input style={ancho} placeholder="Buscar por código o nombre" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </label>
      <div
        role="listbox" aria-label="Centros"
        style={{ ...ancho, marginTop: 6, maxHeight: 220, overflowY: 'auto', border: '1px solid #bbb', borderRadius: 6, background: '#fff' }}
      >
        {centrosVisibles.length === 0 && <div style={{ padding: 8, opacity: 0.7 }}>Ningún centro coincide.</div>}
        {centrosVisibles.map((c) => {
          const activo = c.id === centroId
          return (
            <div
              key={c.id} role="option" aria-selected={activo} tabIndex={0}
              onClick={() => setCentroId(c.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCentroId(c.id) } }}
              style={{
                padding: '7px 10px', cursor: 'pointer', textAlign: 'left',
                background: activo ? '#cfe0e0' : 'transparent', fontWeight: activo ? 700 : 400,
              }}
            >
              {c.codigo} · {c.nombre}
            </div>
          )
        })}
      </div>

      {centroId && (
        <>
          <label style={{ ...campo, marginTop: 14 }}>
            <span>Puesto a evaluar</span>
            <select style={ancho} value={puestoId} onChange={(e) => setPuestoId(e.target.value)}>
              <option value="">— elige —</option>
              {puestosVisibles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          {hayAsignados && (
            <label style={{ ...filaCheck, marginTop: 8 }}>
              <span>Ver todos los puestos, no solo los de este centro</span>
              <input type="checkbox" style={casilla} checked={verTodos} onChange={(e) => setVerTodos(e.target.checked)} />
            </label>
          )}
          {!hayAsignados && <p style={{ opacity: 0.7, fontSize: 13 }}>Este centro aún no tiene puestos asignados; se muestran todos.</p>}
        </>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={continuar} disabled={!centroId || !puestoId || trabajando} style={{ padding: '10px 18px', fontWeight: 600 }}>
          {trabajando ? 'Cargando...' : 'Continuar'}
        </button>
        <button className="secundario" onClick={onVolver} disabled={trabajando}>Cancelar</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
function CreadorPuesto({ supabase, puesto, onCreado, onCancelar }) {
  const [candidatos, setCandidatos] = useState([])
  const [sel, setSel] = useState({})
  const [error, setError] = useState('')
  const [trabajando, setTrabajando] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('matriz_puestos').select('puesto_id'),
      supabase.from('puestos').select('id,nombre').neq('nombre', 'TODOS').neq('id', puesto.id).order('nombre'),
    ]).then(([m, p]) => {
      if (m.error || p.error) { setError((m.error || p.error).message); return }
      const cuenta = new Map()
      m.data.forEach((r) => cuenta.set(r.puesto_id, (cuenta.get(r.puesto_id) ?? 0) + 1))
      setCandidatos(p.data.filter((x) => cuenta.has(x.id)).map((x) => ({ ...x, riesgos: cuenta.get(x.id) })))
    })
  }, [supabase, puesto])

  async function crear() {
    setError('')
    const ids = Object.keys(sel).filter((k) => sel[k])
    if (!ids.length) { setError('Elige al menos un puesto similar.'); return }
    setTrabajando(true)
    try {
      const todas = []
      for (const id of ids) todas.push(...await cargarFilasPuesto(supabase, id, 'puesto', true))
      const fusion = ordenarFilas(fusionarFilas(todas))
      if (!fusion.length) throw new Error('Los puestos elegidos no tienen riesgos en la matriz.')

      const filasMatriz = fusion.map((f) => ({
        id: nuevoId(), puesto_id: puesto.id, riesgo_id: f.riesgo_id, condicion: f.condicion, p: f.p, c: f.c,
      }))
      for (let i = 0; i < filasMatriz.length; i += 200) {
        const { error: err } = await supabase.from('matriz_puestos').insert(filasMatriz.slice(i, i + 200))
        if (err) throw err
      }
      const vinculos = []
      fusion.forEach((f, i) => f.medidas.forEach((medida_id) => vinculos.push({ matriz_id: filasMatriz[i].id, medida_id })))
      for (let i = 0; i < vinculos.length; i += 400) {
        const { error: err } = await supabase.from('matriz_medidas').insert(vinculos.slice(i, i + 400))
        if (err) throw err
      }
      onCreado()
    } catch (err) {
      setError(err.message)
      setTrabajando(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, textAlign: 'left' }}>
      <h2>Creador de puesto</h2>
      <p style={{ opacity: 0.7 }}>Paso 1 de 3 · El puesto no está en la matriz</p>
      <p>
        <b>{puesto.nombre}</b> todavía no tiene riesgos en la matriz. Elige los puestos que se le parecen:
        se juntarán sus riesgos (sin duplicados, con la P y C más altas) y quedarán guardados como
        matriz del puesto.
      </p>
      {error && <p style={aviso}>{error}</p>}
      <div>
        {candidatos.map((c) => (
          <div key={c.id} style={{ borderBottom: '1px solid #e5e5e5', padding: '6px 0' }}>
            <label style={filaCheck}>
              <span>{c.nombre} <span style={{ opacity: 0.6 }}>({c.riesgos} riesgos)</span></span>
              <input type="checkbox" style={casilla} checked={!!sel[c.id]} onChange={(e) => setSel({ ...sel, [c.id]: e.target.checked })} />
            </label>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={crear} disabled={trabajando} style={{ padding: '10px 18px', fontWeight: 600 }}>
          {trabajando ? 'Creando...' : 'Crear puesto y continuar'}
        </button>
        <button className="secundario" onClick={onCancelar} disabled={trabajando}>Cancelar</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
function PasoCheck({ ctx, onContinuar, onVolver, trabajando }) {
  const [resp, setResp] = useState({})
  const codigosBase = useMemo(
    () => new Set([...ctx.filasPuesto, ...ctx.filasTodos].map((f) => f.riesgo_id)), [ctx])
  const nombres = useMemo(() => new Map(ctx.riesgos.map((r) => [r.id, r.nombre])), [ctx])
  const medidasPor = useMemo(() => {
    const m = new Map()
    ctx.catalogo.forEach((x) => {
      if (!m.has(x.riesgo_id)) m.set(x.riesgo_id, [])
      m.get(x.riesgo_id).push(x)
    })
    return m
  }, [ctx])

  const poner = (id, parche) => setResp((r) => ({ ...r, [id]: { si: false, medidas: [], ...r[id], ...parche } }))
  const alternar = (id, texto) => {
    const actual = resp[id]?.medidas ?? []
    poner(id, { medidas: actual.includes(texto) ? actual.filter((t) => t !== texto) : [...actual, texto] })
  }
  const siCount = Object.values(resp).filter((r) => r.si).length

  return (
    <div style={{ maxWidth: 720, textAlign: 'left' }}>
      <h2>Check de riesgos</h2>
      <p style={{ opacity: 0.7 }}>
        Paso 2 de 3 · {ctx.centro.codigo} · {ctx.puesto.nombre}
      </p>
      <p>
        Estos riesgos no se dan en todos los puestos. Contesta <b>Sí</b> a los que apliquen y marca las
        medidas que ya están presentes. La P y la C las indicarás en la evaluación.
      </p>

      {ctx.preguntas.length === 0 && <p className="vacio">No hay preguntas de check cargadas.</p>}

      {ctx.preguntas.map((q) => {
        const r = resp[q.id]
        const si = !!r?.si
        const medidas = medidasPor.get(q.riesgo_id) ?? []
        return (
          <div key={q.id} style={{ borderBottom: '1px solid #e5e5e5', padding: '12px 0' }}>
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              {q.riesgo_id} · {nombres.get(q.riesgo_id)}{q.subtipo ? ` · ${q.subtipo}` : ''}
            </div>
            <div style={{ margin: '4px 0 8px' }}>{q.pregunta}</div>
            {codigosBase.has(q.riesgo_id) && (
              <div style={{ fontSize: 13, color: '#8a6d00', marginBottom: 6 }}>
                Este riesgo ya viene de la matriz del puesto; marca Sí solo si quieres añadir esta situación.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="secundario" aria-pressed={si}
                style={si ? { fontWeight: 700, outline: '2px solid #1f3864' } : undefined}
                onClick={() => poner(q.id, { si: true })}>Sí</button>
              <button type="button" className="secundario" aria-pressed={!si}
                style={!si ? { fontWeight: 700, outline: '2px solid #1f3864' } : undefined}
                onClick={() => poner(q.id, { si: false })}>No</button>
            </div>
            {si && medidas.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer' }}>
                  Medidas presentes ({r.medidas.length} marcadas de {medidas.length})
                </summary>
                <div style={{ marginTop: 6 }}>
                  {medidas.map((m) => (
                    <div key={m.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '4px 0' }}>
                      <label style={filaCheck}>
                        <span>{m.texto}</span>
                        <input type="checkbox" style={casilla} checked={r.medidas.includes(m.texto)} onChange={() => alternar(q.id, m.texto)} />
                      </label>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )
      })}

      <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => onContinuar(filasDeCheck(ctx.preguntas, resp, nombres))} disabled={trabajando}
          style={{ padding: '10px 18px', fontWeight: 600 }}>
          {trabajando ? 'Creando la evaluación...' : 'Continuar a la evaluación'}
        </button>
        <button className="secundario" onClick={onVolver} disabled={trabajando}>Cancelar</button>
        <span style={{ opacity: 0.7 }}>{siCount} riesgo/s añadidos con el check</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
export default function Evaluaciones({ supabase, onActualizar }) {
  const [vista, setVista] = useState('lista') // lista | nueva | creador | check | er | pap
  const [lista, setLista] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [ctx, setCtx] = useState(null)
  const [er, setEr] = useState(null)
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState('')

  async function cargarLista() {
    setCargandoLista(true)
    const { data, error: err } = await supabase.from('evaluaciones')
      .select('id,fecha,estado,created_at,centros(id,codigo,nombre),puestos(id,nombre)')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else { setLista(data); setError('') }
    setCargandoLista(false)
  }

  useEffect(() => { cargarLista() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const aLista = () => { setVista('lista'); setCtx(null); setEr(null); setError(''); cargarLista() }

  async function prepararCheck(centro, puesto) {
    const { data: todosP, error: e0 } = await supabase.from('puestos').select('id').eq('nombre', 'TODOS').maybeSingle()
    if (e0) throw e0
    const [filasPuesto, filasTodos, q, cats] = await Promise.all([
      cargarFilasPuesto(supabase, puesto.id, 'puesto'),
      todosP ? cargarFilasPuesto(supabase, todosP.id, 'todos') : Promise.resolve([]),
      supabase.from('check_preguntas').select('id,riesgo_id,subtipo,pregunta,orden').order('orden'),
      cargarCatalogos(supabase),
    ])
    if (q.error) throw q.error
    setCtx({ centro, puesto, filasPuesto, filasTodos, preguntas: q.data, ...cats })
    setVista('check')
  }

  async function iniciar(centro, puesto) {
    setError(''); setTrabajando(true)
    try {
      const { count, error: err } = await supabase.from('matriz_puestos')
        .select('id', { count: 'exact', head: true }).eq('puesto_id', puesto.id)
      if (err) throw err
      if (!count) { setCtx({ centro, puesto }); setVista('creador') }
      else await prepararCheck(centro, puesto)
    } catch (e) {
      setError(e.message)
    } finally {
      setTrabajando(false)
    }
  }

  async function crearEvaluacion(filasCheck) {
    setError(''); setTrabajando(true)
    let evId = null
    try {
      const filas = armarFilasER({ puesto: ctx.filasPuesto, todos: ctx.filasTodos, check: filasCheck })
      const { data: ev, error: err } = await supabase.from('evaluaciones')
        .insert({ centro_id: ctx.centro.id, puesto_id: ctx.puesto.id }).select('id,fecha,estado').single()
      if (err) throw err
      evId = ev.id
      const filasDB = filas.map((f) => filaBD(f, ev.id))
      for (let i = 0; i < filasDB.length; i += 200) {
        const { error: e2 } = await supabase.from('evaluacion_riesgos').insert(filasDB.slice(i, i + 200))
        if (e2) throw e2
      }
      setEr({
        evaluacion: { id: ev.id, fecha: ev.fecha, estado: ev.estado, centro: ctx.centro, puesto: ctx.puesto },
        filas, catalogo: ctx.catalogo, riesgos: ctx.riesgos,
      })
      setVista('er')
    } catch (e) {
      if (evId) await supabase.from('evaluaciones').delete().eq('id', evId)
      setError(e.message)
    } finally {
      setTrabajando(false)
    }
  }

  async function abrir(ev) {
    setError(''); setTrabajando(true)
    try {
      const [rows, cats] = await Promise.all([
        supabase.from('evaluacion_riesgos').select('*').eq('evaluacion_id', ev.id),
        cargarCatalogos(supabase),
      ])
      if (rows.error) throw rows.error
      const filas = ordenarFilas(rows.data.map((r) => ({
        id: r.id, riesgo_id: r.riesgo_id, riesgo_nombre: r.riesgo_nombre, condicion: r.condicion,
        p: r.p, c: r.c, medidas: r.medidas ?? [], origen: r.origen,
      })))
      setEr({
        evaluacion: { id: ev.id, fecha: ev.fecha, estado: ev.estado, centro: ev.centros, puesto: ev.puestos },
        filas, ...cats,
      })
      setVista('er')
    } catch (e) {
      setError(e.message)
    } finally {
      setTrabajando(false)
    }
  }

  async function borrar(ev) {
    if (!window.confirm(`¿Borrar la evaluación de ${ev.puestos?.nombre} en ${ev.centros?.nombre}? No se puede deshacer.`)) return
    const { error: err } = await supabase.from('evaluaciones').delete().eq('id', ev.id)
    if (err) setError(err.message)
    else cargarLista()
  }

  if (vista === 'nueva') {
    return (
      <>
        {error && <p style={aviso}>{error}</p>}
        <NuevaEvaluacion supabase={supabase} onContinuar={iniciar} onVolver={aLista} trabajando={trabajando} />
      </>
    )
  }
  if (vista === 'creador') {
    return (
      <CreadorPuesto
        supabase={supabase} puesto={ctx.puesto} onCancelar={aLista}
        onCreado={async () => {
          setError(''); setTrabajando(true)
          try { await prepararCheck(ctx.centro, ctx.puesto) } catch (e) { setError(e.message) } finally { setTrabajando(false) }
        }}
      />
    )
  }
  if (vista === 'check') {
    return (
      <>
        {error && <p style={aviso}>{error}</p>}
        <PasoCheck ctx={ctx} onContinuar={crearEvaluacion} onVolver={aLista} trabajando={trabajando} />
      </>
    )
  }
  if (vista === 'er') {
    return (
      <EvaluacionER
        supabase={supabase} evaluacion={er.evaluacion} filasIniciales={er.filas}
        catalogo={er.catalogo} riesgos={er.riesgos} onVolver={aLista}
      />
    )
  }

  return (
    <div style={{ textAlign: 'left' }}>
      <h2>Evaluación de Riesgos</h2>
      <BarraAlta
        resumen={<span><b>{lista.length}</b> {lista.length === 1 ? 'evaluación' : 'evaluaciones'} · <b>{lista.filter((e) => e.estado === 'cerrada').length}</b> cerradas</span>}
        onManual={() => { setError(''); setVista('nueva') }} textoManual="Nueva evaluación"
        onMasivo={onActualizar} textoMasivo="Importar medidas, matriz y check"
      />
      {error && <p style={aviso}>{error}</p>}
      {cargandoLista && <p>Cargando...</p>}
      {!cargandoLista && lista.length === 0 && <p className="vacio">Todavía no hay evaluaciones.</p>}
      {!cargandoLista && lista.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: 8 }}>Fecha</th>
                <th style={{ padding: 8 }}>Centro</th>
                <th style={{ padding: 8 }}>Puesto</th>
                <th style={{ padding: 8 }}>Estado</th>
                <th style={{ padding: 8 }} />
              </tr>
            </thead>
            <tbody>
              {lista.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: '1px solid #e5e5e5' }}>
                  <td style={{ padding: 8 }}>{ev.fecha}</td>
                  <td style={{ padding: 8 }}>{ev.centros?.codigo} · {ev.centros?.nombre}</td>
                  <td style={{ padding: 8 }}>{ev.puestos?.nombre}</td>
                  <td style={{ padding: 8 }}>{ev.estado === 'cerrada' ? 'Cerrada' : 'Borrador'}</td>
                  <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                    <button className="secundario" onClick={() => abrir(ev)} disabled={trabajando}>Abrir</button>{' '}
                    <button className="secundario" onClick={() => borrar(ev)} disabled={trabajando} style={{ color: '#b00020' }}>Borrar</button>
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
