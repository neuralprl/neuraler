import { useEffect, useState } from 'react'
import { supabase, configOk } from './supabaseClient'
import Login from './Login'

export default function App() {
  const [sesion, setSesion] = useState(null)
  const [listo, setListo] = useState(false)

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

      <main className="contenido">
        <h2>Centros</h2>
        <p className="vacio">
          Conexión correcta. Aquí irá la lista de centros con el alta manual y la
          importación desde Excel.
        </p>
      </main>
    </div>
  )
}
