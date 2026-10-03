import { useEffect, useState } from 'react'
import { TituloApp } from './Marca'
import { supabase, configOk } from './supabaseClient'
import Login from './Login'
import Centros from './Centros'
import Evaluaciones from './Evaluaciones'
import Pac from './Pac'
import PacLista from './PacLista'
import MetodologiaTab from './MetodologiaTab'
import FuncionesPuestos from './FuncionesPuestos'
import Agresiones from './Agresiones'
import HojasEvaluacion from './HojasEvaluacion'
import PapLista from './PapLista'
import InformacionRiesgos from './InformacionRiesgos'
import GestorDocumental from './GestorDocumental'
import Actualizar from './Actualizar'
import MenuPrincipal from './MenuPrincipal'
import Pendiente from './Pendiente'
import EvaluacionEmbarazo from './EvaluacionEmbarazo'
import AppCentro from './AppCentro'

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
        <TituloApp />
        <span className="usuario">{sesion.user.email}</span>
        <button className="secundario" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </header>

      <MenuPrincipal seccion={seccion} onElegir={setSeccion} />

      <main className="contenido">
        {seccion === 'centros' && <Centros supabase={supabase} />}
        {seccion === 'evaluaciones' && <Evaluaciones supabase={supabase} onActualizar={() => setSeccion('actualizar')} />}
        {seccion === 'ere' && <EvaluacionEmbarazo supabase={supabase} />}
        {seccion === 'pap' && <PapLista supabase={supabase} />}
        {seccion === 'pac' && <PacLista supabase={supabase} />}
        {seccion === 'agresiones' && <Agresiones supabase={supabase} />}
        {seccion === 'actualizar' && <Actualizar supabase={supabase} onIr={setSeccion} />}
        {seccion === 'epis' && <HojasEvaluacion supabase={supabase} modo="epis" />}
        {seccion === 'form' && <HojasEvaluacion supabase={supabase} modo="formacion" />}
        {seccion === 'ir' && <InformacionRiesgos supabase={supabase} />}
        {seccion === 'funciones' && <FuncionesPuestos key="puestos" vistaInicial="puestos" />}
        {seccion === 'metodologia' && <MetodologiaTab />}
        {seccion === 'procedimientos' && <GestorDocumental supabase={supabase} ambito="general" onIrOtra={() => setSeccion('docs_centro')} />}
        {seccion === 'docs_centro' && <GestorDocumental supabase={supabase} ambito="centro" onIrOtra={() => setSeccion('procedimientos')} />}
        {seccion === 'cambios' && (
          <Pendiente
            titulo="Control de Cambios"
            texto="Registrará la trazabilidad del sistema: qué se ha cambiado, cuándo y quién lo ha hecho, en las evaluaciones, las medidas, el catálogo de riesgos y la metodología, con su versión."
            necesita={['Decidir qué cambios se registran y cuánto tiempo se conservan.']}
          />
        )}
        {seccion === 'equipos' && (
          <Pendiente
            titulo="Evaluación de equipos de trabajo"
            texto="Recogerá la evaluación de los equipos de trabajo de cada centro (Real Decreto 1215/1997). Las deficiencias que se detecten pasarán a la Planificación Actividad Preventiva (PAP)."
            necesita={['La lista de equipos de trabajo y el modelo de comprobación que quieres usar.']}
          />
        )}
        {seccion === 'lugar' && <Pac supabase={supabase} />}
        {seccion === 'actividades' && <FuncionesPuestos key="actividades" vistaInicial="actividades" />}
      </main>
    </div>
  )
}
