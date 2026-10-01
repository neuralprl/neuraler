import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setError('')
    setCargando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setCargando(false)
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos. Revísalos y vuelve a intentarlo.'
          : error.message
      )
    }
  }

  return (
    <main className="login">
      <div className="login-marca">
        <span className="franja" aria-hidden="true" />
        <h1>Evaluación de riesgos</h1>
        <p>Matrices, evaluaciones y planificación preventiva de los centros.</p>
      </div>

      <form className="login-form" onSubmit={entrar}>
        <label>
          Email
          <input type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={cargando}>
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
