import { useEffect, useMemo, useState } from 'react'
import {
  agrupar, extension, fechaES, filtrarDocumentos, iconoDe, nombreSeguro, rutaDe, sePuedeVer, tamanoLegible, validarDocumento, MAX_BYTES,
} from './gestorLogic'

// Uso:
//   Técnico:  <GestorDocumental supabase={supabase} />               (sube, renombra y borra)
//   Centro:   <GestorDocumental supabase={supabase} soloLectura />   (ve y descarga los generales y los de su centro)

const campo = { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4, fontSize: 14, textAlign: 'left' }
const ancho = { width: '100%', boxSizing: 'border-box' }
const aviso = { color: '#b00020', background: '#fdecea', padding: 10, borderRadius: 6 }
const BUCKET = 'documentos'

function Icono({ doc }) {
  const { etiqueta, color } = iconoDe(doc)
  return (
    <svg width="44" height="54" viewBox="0 0 44 54" aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M4 2h26l10 10v40a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#fff" stroke={color} strokeWidth="2" />
      <path d="M30 2v10h10" fill="#eceff1" stroke={color} strokeWidth="2" />
      <rect x="2" y="30" width="38" height="16" fill={color} />
      <text x="21" y="42" textAnchor="middle" fontSize={etiqueta.length > 4 ? 8 : 10} fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">{etiqueta}</text>
    </svg>
  )
}

function Tarjeta({ doc, soloLectura, ocupado, onVer, onDescargar, onRenombrar, onBorrar }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid #d9d9d9', borderRadius: 10, padding: 12, background: '#fff', textAlign: 'left' }}>
      <Icono doc={doc} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 650, overflowWrap: 'anywhere' }}>{doc.nombre}</div>
        <div style={{ fontSize: 12, opacity: 0.65, margin: '2px 0 8px', overflowWrap: 'anywhere' }}>
          {doc.tipo === 'enlace' ? 'Enlace externo' : `${doc.nombre_archivo ?? ''}${doc.tamano ? ` · ${tamanoLegible(doc.tamano)}` : ''}`} · {fechaES(doc.creado_en)}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(sePuedeVer(doc)) && <button className="secundario" disabled={ocupado} onClick={() => onVer(doc)}>{doc.tipo === 'enlace' ? 'Abrir' : 'Ver'}</button>}
          {doc.tipo === 'archivo' && <button className="secundario" disabled={ocupado} onClick={() => onDescargar(doc)}>Descargar</button>}
          {!soloLectura && <button className="secundario" disabled={ocupado} onClick={() => onRenombrar(doc)}>Renombrar</button>}
          {!soloLectura && <button className="secundario" disabled={ocupado} onClick={() => onBorrar(doc)} style={{ color: '#b00020' }}>Borrar</button>}
        </div>
      </div>
    </div>
  )
}

function Bloque({ titulo, docs, ...resto }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h3 style={{ margin: '0 0 8px', borderLeft: '5px solid #1f3864', paddingLeft: 10 }}>{titulo} <span style={{ fontWeight: 400, opacity: 0.6, fontSize: 14 }}>({docs.length})</span></h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
        {docs.map((d) => <Tarjeta key={d.id} doc={d} {...resto} />)}
      </div>
    </section>
  )
}

const FORM0 = { tipo: 'archivo', ambito: 'general', centro_id: '', nombre: '', archivo: null, url: '' }

export default function GestorDocumental({ supabase, soloLectura = false }) {
  const [docs, setDocs] = useState(null)
  const [centros, setCentros] = useState([])
  const [q, setQ] = useState('')
  const [centroFiltro, setCentroFiltro] = useState('')
  const [form, setForm] = useState(null)
  const [errores, setErrores] = useState([])
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  async function cargar() {
    const [d, c] = await Promise.all([
      supabase.from('documentos').select('*').order('nombre'),
      supabase.from('centros').select('id,codigo,nombre').order('codigo'),
    ])
    if (d.error) {
      setError(/documentos/.test(d.error.message) ? 'Falta ampliar la base de datos: ejecuta migracion_documentos.sql en el SQL Editor de Supabase.' : d.error.message)
      setDocs([])
    } else { setError(''); setDocs(d.data) }
    if (!c.error) setCentros(c.data)
  }
  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const nombresCentros = useMemo(() => Object.fromEntries(centros.map((c) => [c.id, `${c.codigo} · ${c.nombre}`])), [centros])
  const visibles = useMemo(() => filtrarDocumentos(docs ?? [], { q, centro: centroFiltro }), [docs, q, centroFiltro])
  const grupos = useMemo(() => agrupar(visibles, nombresCentros), [visibles, nombresCentros])

  // Enlace temporal (el almacenamiento es privado). Se abre en una pestaña creada al pulsar, para que el navegador no la bloquee.
  async function firmar(doc, descargar) {
    const { data, error: err } = await supabase.storage.from(BUCKET).createSignedUrl(doc.ruta, 120, descargar ? { download: doc.nombre_archivo || doc.nombre } : undefined)
    if (err || !data?.signedUrl) throw new Error(err?.message ?? 'No se pudo generar el enlace.')
    return data.signedUrl
  }
  async function ver(doc) {
    setError('')
    if (doc.tipo === 'enlace') { window.open(doc.url, '_blank', 'noopener,noreferrer'); return }
    const w = window.open('', '_blank')
    setOcupado(true)
    try {
      const url = await firmar(doc, false)
      if (w) { w.opener = null; w.location.href = url } else window.location.href = url
    } catch (err) { if (w) w.close(); setError(err.message) }
    setOcupado(false)
  }
  async function descargar(doc) {
    setError(''); setOcupado(true)
    try { window.location.href = await firmar(doc, true) } catch (err) { setError(err.message) }
    setOcupado(false)
  }

  async function guardar() {
    const probs = validarDocumento(form)
    setErrores(probs)
    if (probs.length) return
    setOcupado(true); setError(''); setMensaje('')
    const id = crypto.randomUUID()
    const comun = { id, ambito: form.ambito, centro_id: form.ambito === 'centro' ? form.centro_id : null, nombre: form.nombre.trim() }
    try {
      if (form.tipo === 'enlace') {
        const { error: err } = await supabase.from('documentos').insert({ ...comun, tipo: 'enlace', url: form.url.trim() })
        if (err) throw err
      } else {
        const ruta = rutaDe({ ambito: comun.ambito, centro_id: comun.centro_id, id, nombreArchivo: form.archivo.name })
        const { error: e1 } = await supabase.storage.from(BUCKET).upload(ruta, form.archivo, { contentType: form.archivo.type || 'application/octet-stream', upsert: false })
        if (e1) throw e1
        const { error: e2 } = await supabase.from('documentos').insert({
          ...comun, tipo: 'archivo', ruta, nombre_archivo: nombreSeguro(form.archivo.name), mime: form.archivo.type || null, tamano: form.archivo.size,
        })
        if (e2) { await supabase.storage.from(BUCKET).remove([ruta]); throw e2 }
      }
      setForm(null); setMensaje('Documento guardado.'); cargar()
    } catch (err) {
      setErrores([/Bucket not found/i.test(err.message) ? 'Falta crear el almacenamiento: ejecuta migracion_documentos.sql en el SQL Editor de Supabase.' : err.message])
    }
    setOcupado(false)
  }

  async function renombrar(doc) {
    const nuevo = window.prompt('Nuevo nombre del documento', doc.nombre)
    if (nuevo == null || !nuevo.trim() || nuevo.trim() === doc.nombre) return
    const { error: err } = await supabase.from('documentos').update({ nombre: nuevo.trim().slice(0, 120) }).eq('id', doc.id)
    if (err) setError(err.message); else cargar()
  }
  async function borrar(doc) {
    if (!window.confirm(`¿Borrar «${doc.nombre}»? No se puede deshacer.`)) return
    setOcupado(true); setError('')
    try {
      if (doc.tipo === 'archivo' && doc.ruta) {
        const { error: e1 } = await supabase.storage.from(BUCKET).remove([doc.ruta])
        if (e1) throw e1
      }
      const { error: e2 } = await supabase.from('documentos').delete().eq('id', doc.id)
      if (e2) throw e2
      cargar()
    } catch (err) { setError(err.message) }
    setOcupado(false)
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const acc = { soloLectura, ocupado, onVer: ver, onDescargar: descargar, onRenombrar: renombrar, onBorrar: borrar }
  const hay = visibles.length > 0

  return (
    <div style={{ textAlign: 'left' }}>
      <h2>Gestor documental</h2>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        {soloLectura ? 'Documentos generales y de tu centro.' : 'Documentos generales, que ven todos los centros, y específicos de cada centro, que solo ve ese centro.'}
      </p>

      {error && <p style={aviso}>{error}</p>}
      {mensaje && <p style={{ color: '#2e7d32' }}>{mensaje}</p>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end', marginBottom: 14 }}>
        {!soloLectura && (
          <>
            <button onClick={() => { setErrores([]); setMensaje(''); setForm({ ...FORM0, tipo: 'archivo' }) }} disabled={!!form} style={{ padding: '8px 16px', fontWeight: 600 }}>Subir archivo</button>
            <button className="secundario" onClick={() => { setErrores([]); setMensaje(''); setForm({ ...FORM0, tipo: 'enlace' }) }} disabled={!!form}>Añadir enlace</button>
          </>
        )}
        <label style={campo}><span>Buscar</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre del documento" /></label>
        {!soloLectura && (
          <label style={campo}>
            <span>Mostrar</span>
            <select value={centroFiltro} onChange={(e) => setCentroFiltro(e.target.value)}>
              <option value="">Todos</option>
              <option value="general">Solo generales</option>
              {centros.map((c) => <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
            </select>
          </label>
        )}
      </div>

      {form && (
        <div style={{ border: '2px solid #1f3864', borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <h3 style={{ margin: '0 0 10px' }}>{form.tipo === 'enlace' ? 'Añadir enlace' : 'Subir archivo'}</h3>
          {errores.length > 0 && <div style={aviso}>{errores.map((e, i) => <div key={i}>{e}</div>)}</div>}
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', margin: '8px 0' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="radio" name="ambito" checked={form.ambito === 'general'} onChange={() => set('ambito', 'general')} /> General (lo ven todos los centros)</label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="radio" name="ambito" checked={form.ambito === 'centro'} onChange={() => set('ambito', 'centro')} /> Específico de un centro</label>
          </div>
          {form.ambito === 'centro' && (
            <label style={{ ...campo, maxWidth: 420, marginBottom: 10 }}>
              <span>Centro</span>
              <select style={ancho} value={form.centro_id} onChange={(e) => set('centro_id', e.target.value)}>
                <option value="">— elige —</option>
                {centros.map((c) => <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
              </select>
            </label>
          )}
          {form.tipo === 'enlace' ? (
            <label style={{ ...campo, marginBottom: 10 }}>
              <span>Enlace (SharePoint, OneDrive u otro, con https://)</span>
              <input style={ancho} value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://..." />
              <small style={{ opacity: 0.7 }}>Quien lo abra necesita tener permiso en el sitio de origen. Si no lo tiene, es mejor subir el archivo.</small>
            </label>
          ) : (
            <label style={{ ...campo, marginBottom: 10 }}>
              <span>Archivo (máximo {tamanoLegible(MAX_BYTES)})</span>
              <input type="file" onChange={(e) => {
                const archivo = e.target.files?.[0] ?? null
                setForm((f) => ({ ...f, archivo, nombre: f.nombre || (archivo ? archivo.name.replace(new RegExp(`\\.${extension(archivo.name)}$`), '') : '') }))
              }} />
            </label>
          )}
          <label style={{ ...campo, marginBottom: 12 }}>
            <span>Nombre que tendrá el documento</span>
            <input style={ancho} maxLength={120} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={guardar} disabled={ocupado} style={{ padding: '8px 16px', fontWeight: 600 }}>{ocupado ? 'Guardando...' : 'Guardar'}</button>
            <button className="secundario" onClick={() => { setForm(null); setErrores([]) }} disabled={ocupado}>Cancelar</button>
          </div>
        </div>
      )}

      {!docs && <p>Cargando...</p>}
      {docs && !hay && !error && <p className="vacio">{docs.length ? 'Ningún documento coincide.' : 'Todavía no hay documentos.'}</p>}
      {grupos.generales.length > 0 && <Bloque titulo="Documentos generales" docs={grupos.generales} {...acc} />}
      {grupos.porCentro.map((g) => <Bloque key={g.centro_id} titulo={soloLectura ? `Documentos de ${g.nombre}` : g.nombre} docs={g.docs} {...acc} />)}
    </div>
  )
}
