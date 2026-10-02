import { useEffect, useState } from 'react'
import { fechaES } from './planLogic'

// Panel del final de la evaluación: crea el usuario del centro y lo vincula a esta evaluación.
// El usuario solo ve esa evaluación (IR, PAP, PAC y metodología) y solo puede cambiar el estado
// de las acciones del PAP y de las incidencias del PAC.
// Props: supabase, evaluacion {id, ...}, resaltar (true si la evaluación está cerrada)

const campo = { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4, fontSize: 14, textAlign: 'left' }
const ancho = { width: '100%', boxSizing: 'border-box' }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Contraseña aleatoria sin caracteres que se confunden (0/O, 1/l/I)
function generarClave(largo = 12) {
  const letras = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint32Array(largo)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => letras[b % letras.length]).join('')
}

export default function AccesoEvaluacion({ supabase, evaluacion, resaltar }) {
  const [accesos, setAccesos] = useState([])
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState('')
  const [creado, setCreado] = useState(null) // { email, clave, reutilizado }
  const [copiado, setCopiado] = useState(false)

  async function cargar() {
    const { data, error: err } = await supabase.from('accesos_evaluacion')
      .select('user_id,email,created_at').eq('evaluacion_id', evaluacion.id).order('created_at')
    if (err) {
      setError(/accesos_evaluacion/.test(err.message)
        ? 'Falta ampliar la base de datos: ejecuta migracion_accesos.sql en el SQL Editor de Supabase.'
        : err.message)
    } else { setAccesos(data); setError('') }
  }

  useEffect(() => { cargar() }, [evaluacion.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function darAcceso() {
    setError(''); setCreado(null); setCopiado(false)
    const email = usuario.trim().toLowerCase()
    if (!EMAIL.test(email)) { setError('El usuario debe tener formato de correo (por ejemplo, centro@ejemplo.com).'); return }
    if (clave.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    setTrabajando(true)
    try {
      const { data: s } = await supabase.auth.getSession()
      const token = s?.session?.access_token
      if (!token) throw new Error('La sesión ha caducado. Vuelve a entrar.')
      const r = await fetch('/api/crear-acceso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, password: clave, evaluacion_id: evaluacion.id }),
      })
      const texto = await r.text()
      let cuerpo = {}
      try { cuerpo = JSON.parse(texto) } catch { /* la respuesta no era JSON */ }
      if (!r.ok) {
        throw new Error(cuerpo.error || (r.status === 404
          ? 'No se encuentra la función del servidor. Comprueba que has subido api/crear-acceso.js a GitHub y que Vercel ha terminado de desplegar.'
          : `Error ${r.status}`))
      }
      setCreado({ email, clave, reutilizado: !!cuerpo.reutilizado })
      setUsuario(''); setClave('')
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setTrabajando(false)
    }
  }

  async function quitar(a) {
    if (!window.confirm(`¿Quitar el acceso de ${a.email} a esta evaluación?`)) return
    const { error: err } = await supabase.from('accesos_evaluacion').delete()
      .eq('evaluacion_id', evaluacion.id).eq('user_id', a.user_id)
    if (err) setError(err.message); else cargar()
  }

  async function copiar() {
    const texto = `Usuario: ${creado.email}\nContraseña: ${creado.clave}`
    try { await navigator.clipboard.writeText(texto); setCopiado(true) } catch { setCopiado(false) }
  }

  const destacar = resaltar && accesos.length === 0
  return (
    <section style={{ border: `2px solid ${destacar ? '#1f3864' : '#d9d9d9'}`, borderRadius: 10, padding: 14, textAlign: 'left' }}>
      <h3 style={{ margin: '0 0 6px' }}>¿Qué usuario va a tener acceso?</h3>
      <p style={{ margin: '0 0 12px', opacity: 0.8 }}>
        Ese usuario solo verá esta evaluación, con su información de riesgos, el plan de acción (PAP), las visitas
        PAC del centro y la metodología. Todo es de solo lectura, salvo el estado de las acciones del PAP y de las
        incidencias del PAC, que sí podrá cambiar.
      </p>

      {error && <p style={{ color: '#b00020', background: '#fdecea', padding: 10, borderRadius: 6 }}>{error}</p>}

      {creado && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <b>{creado.reutilizado ? 'Acceso añadido al usuario existente.' : 'Acceso creado.'}</b>
          <p style={{ margin: '6px 0' }}>
            Usuario: <b>{creado.email}</b><br />
            {creado.reutilizado
              ? 'Mantiene la contraseña que ya tenía.'
              : <>Contraseña: <b style={{ fontFamily: 'monospace' }}>{creado.clave}</b></>}
          </p>
          {!creado.reutilizado && (
            <p style={{ margin: '0 0 6px', fontSize: 13 }}>Cópiala ahora: no se vuelve a mostrar.</p>
          )}
          <button type="button" className="secundario" onClick={copiar}>{copiado ? 'Copiado' : 'Copiar usuario y contraseña'}</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <label style={campo}>
          <span>Usuario (con formato de correo)</span>
          <input style={ancho} type="email" autoComplete="off" placeholder="centro@ejemplo.com" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
          <small style={{ opacity: 0.65 }}>No se envía ningún mensaje: solo sirve para entrar.</small>
        </label>
        <label style={campo}>
          <span>Contraseña (mínimo 8 caracteres)</span>
          <input style={ancho} type={verClave ? 'text' : 'password'} autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} />
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="secundario" onClick={() => { setClave(generarClave()); setVerClave(true) }}>Generar una</button>
            <button type="button" className="secundario" onClick={() => setVerClave((v) => !v)}>{verClave ? 'Ocultar' : 'Mostrar'}</button>
          </span>
        </label>
      </div>

      <p style={{ margin: '12px 0 0' }}>
        <button type="button" onClick={darAcceso} disabled={trabajando} style={{ padding: '10px 18px', fontWeight: 600 }}>
          {trabajando ? 'Creando el acceso...' : 'Dar acceso'}
        </button>
      </p>

      <h4 style={{ margin: '18px 0 6px' }}>Usuarios con acceso a esta evaluación ({accesos.length})</h4>
      {accesos.length === 0 && <p className="vacio" style={{ margin: 0 }}>Todavía no hay ninguno.</p>}
      {accesos.map((a) => (
        <div key={a.user_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #ececec' }}>
          <span>{a.email} <small style={{ opacity: 0.6 }}>· desde el {fechaES(String(a.created_at).slice(0, 10))}</small></span>
          <button type="button" className="secundario" onClick={() => quitar(a)} style={{ color: '#b00020' }}>Quitar acceso</button>
        </div>
      ))}
    </section>
  )
}
