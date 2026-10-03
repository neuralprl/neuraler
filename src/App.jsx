import { useEffect, useState } from 'react'
import { supabase, configOk } from './supabaseClient'
import Login from './Login'
import Centros from './Centros'
import Evaluaciones from './Evaluaciones'
import Pac from './Pac'
import MetodologiaTab from './MetodologiaTab'
import FuncionesPuestos from './FuncionesPuestos'
import Agresiones from './Agresiones'
import EpisPuestos from './EpisPuestos'
import InformacionRiesgos from './InformacionRiesgos'
import GestorDocumental from './GestorDocumental'
import Pendiente from './Pendiente'
import AppCentro from './AppCentro'
import ImportarDatos from './ImportarDatos'

const SECCIONES = [
  { id: 'evaluaciones', texto: 'Evaluaciones' },
  { id: 'pac', texto: 'PAC' },
  { id: 'agresiones', texto: 'Agresiones' },
  { id: 'centros', texto: 'Centros' },
  { id: 'metodologia', texto: 'Metodología' },
  { id: 'funciones', texto: 'Funciones de cada puesto' },
  { id: 'importar', texto: 'Importar datos' },
  { id: 'epis', texto: 'EPIs' },
  { id: 'ir', texto: 'IR' },
  { id: 'for', texto: 'FOR' },
  { id: 'ere', texto: 'ERE' },
  { id: 'gestor', texto: 'Gestor documental' },
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
  if (sesion.user?.app_metadata?.rol === 'centro') return <AppCentro supabase={supabase} sesion={sesion} />

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
        {seccion === 'agresiones' && <Agresiones supabase={supabase} />}
        {seccion === 'centros' && <Centros supabase={supabase} />}
        {seccion === 'metodologia' && <MetodologiaTab />}
        {seccion === 'funciones' && <FuncionesPuestos />}
        {seccion === 'importar' && <ImportarDatos supabase={supabase} />}
        {seccion === 'epis' && <EpisPuestos />}
        {seccion === 'ir' && <InformacionRiesgos supabase={supabase} />}
        {seccion === 'for' && (
          <Pendiente
            titulo="Formación (FOR)"
            texto="Recogerá el contenido formativo de cada puesto: los temas que hay que impartir según sus actividades y riesgos, para dejar constancia de la formación recibida."
            necesita={['La hoja de formación por puesto del programa de Excel (%FORM), o confirmar que el contenido salga de las medidas de formación de cada actividad.']}
          />
        )}
        {seccion === 'ere' && (
          <Pendiente
            titulo="Embarazo y lactancia (ERE)"
            texto="Recogerá la evaluación de los riesgos para la trabajadora embarazada, que ha dado a luz recientemente o en periodo de lactancia, y el informe de adaptación del puesto."
            necesita={['Marcar en cada riesgo del catálogo si puede afectar al embarazo o a la lactancia.', 'El modelo de informe que quieres emitir.']}
          />
        )}
        {seccion === 'gestor' && <GestorDocumental supabase={supabase} />}
      </main>
    </div>
  )
}
