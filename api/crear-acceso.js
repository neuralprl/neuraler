// Función de servidor (Vercel): crea el usuario de acceso de un centro y le asigna una evaluación.
// Necesita la variable de entorno SUPABASE_SERVICE_ROLE_KEY (secreta, SIN prefijo VITE_).
// Solo la pueden usar los usuarios normales (no los de centro).
import { createClient } from '@supabase/supabase-js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const responder = (res, estado, cuerpo) => res.status(estado).json(cuerpo)

export default async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método no permitido' })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !clave) {
    return responder(res, 500, { error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.' })
  }
  const admin = createClient(url, clave, { auth: { autoRefreshToken: false, persistSession: false } })

  // 1) Quién llama: debe tener sesión y no ser un usuario de centro
  const cabecera = req.headers.authorization || ''
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : ''
  if (!token) return responder(res, 401, { error: 'Sin sesión' })
  const { data: quien, error: errSesion } = await admin.auth.getUser(token)
  if (errSesion || !quien?.user) return responder(res, 401, { error: 'Sesión no válida' })
  if (quien.user.app_metadata?.rol === 'centro') return responder(res, 403, { error: 'No autorizado' })

  // 2) Datos recibidos
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {}
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const evaluacionId = String(body.evaluacion_id ?? '')
  if (!EMAIL.test(email)) return responder(res, 400, { error: 'El usuario debe tener formato de correo (por ejemplo, centro@ejemplo.com).' })
  if (password.length < 8) return responder(res, 400, { error: 'La contraseña debe tener al menos 8 caracteres.' })
  if (!UUID.test(evaluacionId)) return responder(res, 400, { error: 'Evaluación no válida' })

  const { data: ev, error: errEv } = await admin.from('evaluaciones').select('id').eq('id', evaluacionId).maybeSingle()
  if (errEv) return responder(res, 500, { error: errEv.message })
  if (!ev) return responder(res, 404, { error: 'La evaluación no existe' })

  // 3) Crear el usuario (o reutilizar uno de centro que ya exista)
  let userId = null
  let reutilizado = false
  const { data: creado, error: errCrear } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, app_metadata: { rol: 'centro' },
  })
  if (!errCrear) {
    userId = creado.user.id
  } else if (errCrear.code === 'email_exists' || /already|registered|exists/i.test(errCrear.message || '')) {
    const existente = await buscarPorEmail(admin, email)
    if (!existente) return responder(res, 409, { error: 'Ese usuario ya existe y no se ha podido localizar.' })
    if (existente.app_metadata?.rol !== 'centro') {
      return responder(res, 409, { error: 'Ese correo ya pertenece a un usuario que no es de centro. Usa otro.' })
    }
    userId = existente.id
    reutilizado = true
  } else {
    return responder(res, 400, { error: errCrear.message })
  }

  // 4) Asignar la evaluación
  const { error: errAcceso } = await admin.from('accesos_evaluacion')
    .upsert({ user_id: userId, evaluacion_id: evaluacionId, email }, { onConflict: 'user_id,evaluacion_id' })
  if (errAcceso) return responder(res, 500, { error: errAcceso.message })

  return responder(res, 200, { ok: true, email, reutilizado })
}

function safeJson(texto) {
  try { return JSON.parse(texto) } catch { return {} }
}

async function buscarPorEmail(admin, email) {
  for (let pagina = 1; pagina <= 50; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 })
    if (error) return null
    const hallado = data.users.find((u) => (u.email || '').toLowerCase() === email)
    if (hallado) return hallado
    if (data.users.length < 200) return null
  }
  return null
}
