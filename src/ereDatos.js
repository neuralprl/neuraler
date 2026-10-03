// Datos de la evaluación de embarazo (ERE): se calcula al momento con los riesgos de la evaluación del puesto.
import { generarERE } from './ereLogic'
import { descargar, htmlERE, imprimir, nombreArchivo, wordERE } from './documentos'

const sin = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const haceUnAnio = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10) }

// ev: { id, fecha, centro: {id, codigo, nombre}, puesto: {id, nombre} }
export async function calcularERE(supabase, ev) {
  const { data: filas, error } = await supabase.from('evaluacion_riesgos').select('riesgo_id,riesgo_nombre,condicion,p,c').eq('evaluacion_id', ev.id)
  if (error) throw error
  let centro = ev.centro ?? {}
  const c = await supabase.from('centros').select('*').eq('id', ev.centro?.id).maybeSingle()
  if (!c.error && c.data) centro = c.data
  let agresiones12m = 0
  let agresionesFisicas12m = 0
  const a = await supabase.from('agresiones').select('tipo,puesto,fecha').eq('centro_id', ev.centro?.id).gte('fecha', haceUnAnio())
  if (!a.error && a.data) {                       // si la tabla aún no existe, se ignora
    const delPuesto = a.data.filter((x) => sin(x.puesto) === sin(ev.puesto?.nombre))
    agresiones12m = delPuesto.length
    agresionesFisicas12m = delPuesto.filter((x) => x.tipo === 'fisica').length
  }
  return generarERE(filas, { centro, agresiones12m, agresionesFisicas12m })
}

export async function descargarERE(supabase, ev, formato = 'word') {
  const ere = await calcularERE(supabase, ev)
  if (formato === 'word') descargar(await wordERE(ev, ere), nombreArchivo('ERE', ev, 'docx'))
  else imprimir(htmlERE(ev, ere))
  return ere
}
