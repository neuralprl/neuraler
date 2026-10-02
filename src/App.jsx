import { useEffect, useState } from 'react'
import { supabase, configOk } from './supabaseClient'
import Login from './Login'
import Centros from './Centros'
import Evaluaciones from './Evaluaciones'
import Pac from './Pac'
import ImportarDatos from './ImportarDatos'

const SECCIONES = [
  { id: 'evaluaciones', texto: 'Evaluaciones' },
  { id: 'pac', texto: 'PAC' },
  { id: 'centros', texto: 'Centros' },
  { id: 'importar', texto: 'Importar datos' },
]

export default function App() {
  const [sesion, setSesion] = useState(null)
  const [listo, setListo] = useState(false)
  const [seccion, setSeccion] = useState('evaluaciones')

  useEffect(() => {
    if (!configOk) { setListo(true); return }
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setListo(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!configOk) {
    return (
      <main className="aviso">
        <h1>Falta la conexión con Supabase</h1>
        <p>Añade VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en las variables
          de entorno de Vercel y vuelve a desplegar.</p>
      </main>
    )
  }

  if (!listo) return null
  if (!sesion) return <Login />

  return (
    <div className="app">
      <header className="cabecera">
        <span className="franja" aria-hidden="true" />
        <strong>Evaluación de riesgos</strong>
        <span className="usuario">{sesion.user.email}</span>
        <button className="secundario" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </header>

      <nav style={{ display: 'flex', gap: 8, padding: '10px 16px', flexWrap: 'wrap' }}>
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            className="secundario"
            onClick={() => setSeccion(s.id)}
            aria-current={seccion === s.id ? 'page' : undefined}
            style={seccion === s.id ? { fontWeight: 700, textDecoration: 'underline' } : undefined}
          >
            {s.texto}
          </button>
        ))}
      </nav>

      <main className="contenido">
        {seccion === 'evaluaciones' && <Evaluaciones supabase={supabase} />}
        {seccion === 'pac' && <Pac supabase={supabase} />}
        {seccion === 'centros' && <Centros supabase={supabase} />}
        {seccion === 'importar' && <ImportarDatos supabase={supabase} />}
      </main>
    </div>
  )
}
