// Generación de documentos a partir de una evaluación: PAP (Excel y PDF) e IR (Word y PDF).
// Las funciones de datos y HTML son puras; las de Excel y Word cargan su librería solo al usarlas.
import { COLOR_VR, ORDEN_VR, vrDe } from './evalLogic.js'
import { fechaES, textoEficacia, textoRealizacion } from './planLogic.js'
import { ORDEN_PRIORIDAD_PAC, PRIORIDADES_PAC, nombreConsecuencia, nombreDeficiencia } from './pacLogic.js'
import { AGRESORES, CONSECUENCIAS, ESTADOS, TIPOS } from './agresionesLogic.js'
import { COLUMNAS as COLUMNAS_AGRESIONES, OBLIGATORIAS as OBLIGATORIAS_AGRESIONES } from './agresionesImport.js'

export { fechaES }

// Prioridades y acciones según la valoración del riesgo (VR).
export const PRIORIDADES = {
  T: { nombre: 'Trivial', prioridad: 'Baja', accion: 'No se requiere acción específica' },
  TO: { nombre: 'Tolerable', prioridad: 'Baja', accion: 'No se necesita mejorar la acción preventiva. Se deben considerar mejoras' },
  MO: { nombre: 'Moderado', prioridad: 'Media', accion: 'Se deben hacer esfuerzos por reducir el riesgo determinando las inversiones necesarias' },
  IM: { nombre: 'Importante', prioridad: 'Alta', accion: 'No debe comenzarse el trabajo hasta que se haya reducido el riesgo' },
  IN: { nombre: 'Intolerable', prioridad: 'Crítica', accion: 'El riesgo es inaceptable. Se debe suspender el trabajo de inmediato' },
}

export const ESTADOS_ACCION = { pendiente: 'Pendiente', en_curso: 'En curso', realizada: 'Realizada' }

const numRiesgo = (id) => parseInt(String(id).replace(/\D/g, ''), 10) || 0

export const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const quitarAcentos = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function nombreArchivo(prefijo, ev, ext) {
  const slug = (s) => quitarAcentos(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${prefijo}_${slug(ev.centro.codigo)}_${slug(ev.puesto.nombre)}_${ev.fecha}.${ext}`
}

// ---------- datos ----------

// Filas con VR calculado (las que no tienen P y C no entran), de más a menos graves.
export function filasPAP(filas) {
  return filas
    .map((f) => ({ ...f, vr: vrDe(f.p, f.c) }))
    .filter((f) => f.vr)
    .sort((a, b) =>
      ORDEN_VR[a.vr] - ORDEN_VR[b.vr] ||
      numRiesgo(a.riesgo_id) - numRiesgo(b.riesgo_id) ||
      a.condicion.localeCompare(b.condicion, 'es'))
}

// Un bloque por riesgo, con sus situaciones y medidas sin repetir (para el IR).
export function agruparPorRiesgo(filas) {
  const mapa = new Map()
  filas.forEach((f) => {
    if (!mapa.has(f.riesgo_id)) {
      mapa.set(f.riesgo_id, { riesgo_id: f.riesgo_id, riesgo_nombre: f.riesgo_nombre, condiciones: [], medidas: [] })
    }
    const g = mapa.get(f.riesgo_id)
    if (f.condicion && !g.condiciones.includes(f.condicion)) g.condiciones.push(f.condicion)
    ;(f.medidas ?? []).forEach((m) => { if (m && !g.medidas.includes(m)) g.medidas.push(m) })
  })
  return [...mapa.values()].sort((a, b) => numRiesgo(a.riesgo_id) - numRiesgo(b.riesgo_id))
}

// ---------- HTML (vista de impresión y PDF) ----------
const CSS = (apaisado) => `
@page { size: A4 ${apaisado ? 'landscape' : 'portrait'}; margin: 14mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111; }
h1 { font-size: 17pt; margin: 0 0 6px; }
h2 { font-size: 12.5pt; margin: 16px 0 6px; padding-bottom: 2px; border-bottom: 1px solid #999; page-break-after: avoid; }
.meta p { margin: 2px 0; }
table { border-collapse: collapse; width: 100%; margin-top: 8px; }
th, td { border: 1px solid #888; padding: 4px 6px; vertical-align: top; font-size: 9pt; text-align: left; }
th { background: #e8e8e8; }
tr { page-break-inside: avoid; }
ul { margin: 3px 0 6px 18px; padding: 0; }
li { margin: 2px 0; }
.vr { color: #fff; font-weight: bold; text-align: center; white-space: nowrap; }
.etq { font-weight: bold; margin-top: 6px; }
.bloque { page-break-inside: avoid; }
.firma { margin-top: 28px; page-break-inside: avoid; }
.firma td { height: 30px; font-size: 10pt; }
.nota { font-size: 9pt; color: #444; margin-top: 10px; }
`

function documentoHTML(titulo, cuerpo, apaisado = false) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${CSS(apaisado)}</style></head><body>${cuerpo}</body></html>`
}

function cabecera(titulo, ev) {
  return `<h1>${esc(titulo)}</h1>
<div class="meta">
  <p><b>Centro:</b> ${esc(ev.centro.codigo)} · ${esc(ev.centro.nombre)}</p>
  <p><b>Puesto de trabajo:</b> ${esc(ev.puesto.nombre)}</p>
  <p><b>Fecha de la evaluación:</b> ${esc(fechaES(ev.fecha))}</p>
</div>`
}

export function htmlIR(ev, filas) {
  const bloques = agruparPorRiesgo(filas).map((g) => `
<div class="bloque">
  <h2>${esc(g.riesgo_id)} · ${esc(g.riesgo_nombre)}</h2>
  ${g.condiciones.length ? `<div class="etq">Situaciones en las que se presenta</div><ul>${g.condiciones.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
  ${g.medidas.length ? `<div class="etq">Medidas preventivas</div><ul>${g.medidas.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
</div>`).join('')

  const cuerpo = `${cabecera('Información de riesgos del puesto de trabajo', ev)}
<p class="nota">Información facilitada a los trabajadores sobre los riesgos de su puesto y las medidas
preventivas que deben aplicar, conforme al artículo 18 de la Ley 31/1995 de Prevención de Riesgos Laborales.</p>
${bloques || '<p>La evaluación no contiene riesgos.</p>'}
<table class="firma">
  <tr><td style="width:50%">Nombre y apellidos:</td><td>DNI:</td></tr>
  <tr><td>Fecha:</td><td>Firma del trabajador (recibí la información):</td></tr>
</table>`
  return documentoHTML(nombreArchivo('IR', ev, 'pdf').replace(/\.pdf$/, ''), cuerpo)
}

export function htmlPAP(ev, filasPlan) {
  const filas = filasPlan.map((f) => {
    const pr = PRIORIDADES[f.vr]
    return `<tr>
  <td>${esc(pr.prioridad)}</td>
  <td>${esc(f.riesgo_id)} · ${esc(f.riesgo_nombre)}</td>
  <td>${esc(f.condicion)}</td>
  <td class="vr" style="background:${COLOR_VR[f.vr]}">${esc(f.vr)}</td>
  <td>${esc(pr.accion)}</td>
  <td>${(f.medidas ?? []).length ? `<ul>${f.medidas.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}</td>
  <td>${esc(f.responsable ?? '')}</td>
  <td>${esc(f.coste ?? '')}</td>
  <td>${esc(fechaES(f.plazo))}</td>
  <td>${esc(textoRealizacion(f))}</td>
  <td>${esc(textoEficacia(f, ev.fecha))}</td>
</tr>`
  }).join('')

  const cuerpo = `${cabecera('Planificación de la actividad preventiva (PAP)', ev)}
<table>
  <thead><tr>
    <th>Prioridad</th><th>Riesgo</th><th>Situación de exposición</th><th>VR</th>
    <th>Acción requerida</th><th>Medidas preventivas</th><th>Responsable</th><th>Coste</th>
    <th>Plazo</th><th>Ejecución</th><th>Eficacia</th>
  </tr></thead>
  <tbody>${filas}</tbody>
</table>`
  return documentoHTML(nombreArchivo('PAP', ev, 'pdf').replace(/\.pdf$/, ''), cuerpo, true)
}

// ---------- salida ----------
export function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// Abre una ventana con el documento y el diálogo de impresión (ahí se elige "Guardar como PDF").
export function imprimir(html) {
  const w = window.open('', '_blank')
  if (!w) throw new Error('El navegador ha bloqueado la ventana emergente. Permítela para generar el PDF.')
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

// ---------- Excel (PAP) ----------
export async function excelPAP(ev, filasPlan) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('PAP')
  const fuente = { name: 'Arial', size: 10 }
  const borde = { style: 'thin', color: { argb: 'FF999999' } }
  const bordes = { top: borde, left: borde, bottom: borde, right: borde }

  ws.columns = [
    { width: 11 }, { width: 32 }, { width: 36 }, { width: 7 }, { width: 36 }, { width: 56 },
    { width: 22 }, { width: 24 }, { width: 13 }, { width: 22 }, { width: 26 },
  ]
  ws.getCell('A1').value = 'Planificación de la actividad preventiva (PAP)'
  ws.getCell('A1').font = { name: 'Arial', size: 14, bold: true }
  ws.getCell('A2').value = `Centro: ${ev.centro.codigo} · ${ev.centro.nombre}`
  ws.getCell('A3').value = `Puesto: ${ev.puesto.nombre}   ·   Fecha de la evaluación: ${fechaES(ev.fecha)}`
  ;['A2', 'A3'].forEach((c) => { ws.getCell(c).font = fuente })

  const cab = ['Prioridad', 'Riesgo', 'Situación de exposición', 'VR', 'Acción requerida',
    'Medidas preventivas', 'Responsable', 'Coste', 'Plazo', 'Ejecución', 'Eficacia']
  const filaCab = ws.getRow(5)
  cab.forEach((t, i) => {
    const c = filaCab.getCell(i + 1)
    c.value = t
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    c.border = bordes
  })

  filasPlan.forEach((f, i) => {
    const pr = PRIORIDADES[f.vr]
    const fila = ws.getRow(6 + i)
    const valores = [
      pr.prioridad,
      `${f.riesgo_id} · ${f.riesgo_nombre}`,
      f.condicion,
      f.vr,
      pr.accion,
      (f.medidas ?? []).map((m) => `• ${m}`).join('\n'),
      f.responsable ?? '',
      f.coste ?? '',
      f.plazo ? new Date(`${f.plazo}T00:00:00Z`) : null,
      textoRealizacion(f),
      textoEficacia(f, ev.fecha),
    ]
    valores.forEach((v, k) => {
      const c = fila.getCell(k + 1)
      c.value = v
      c.font = fuente
      c.border = bordes
      c.alignment = { vertical: 'top', wrapText: true, horizontal: k === 3 ? 'center' : 'left' }
    })
    fila.getCell(9).numFmt = 'dd/mm/yyyy'
    const vr = fila.getCell(4)
    vr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR_VR[f.vr].slice(1).toUpperCase() } }
    vr.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
  })

  ws.views = [{ state: 'frozen', ySplit: 5 }]
  ws.autoFilter = { from: 'A5', to: `K${Math.max(5, 5 + filasPlan.length)}` }
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }

  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}


// ---------- PAC (visita al centro): incidencias ----------
export function nombreArchivoPAC(ev, ext) {
  const slug = (t) => quitarAcentos(t).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `PAC_${slug(ev.centro.codigo)}_${ev.fecha}.${ext}`
}

// items: puntos de la lista; resp: { item_id: respuesta }. Devuelve las incidencias, de más a menos urgentes.
export function filasPAC(items, resp) {
  return items
    .filter((it) => resp[it.id]?.resultado === 'no_cumple')
    .map((it) => ({ ...resp[it.id], bloque: it.bloque, seccion: it.seccion, punto: it.punto, orden: it.orden }))
    .sort((a, b) =>
      ORDEN_PRIORIDAD_PAC.indexOf(a.prioridad) - ORDEN_PRIORIDAD_PAC.indexOf(b.prioridad) || (a.orden ?? 0) - (b.orden ?? 0))
}

export function textoEstadoPAC(f) {
  const fecha = f.fecha_realizacion ? ` el ${fechaES(f.fecha_realizacion)}` : ''
  if (f.estado_accion === 'realizada') return `Realizada${fecha}`
  if (f.estado_accion === 'alternativa') {
    return `Medida alternativa${fecha}${f.medida_alternativa ? `: ${f.medida_alternativa}` : ''}`
  }
  return 'Pendiente'
}

export function textoResueltaPAC(f) {
  if (f.estado_accion === 'pendiente') return ''
  if (f.resuelta_estado === 'resuelta') return f.fecha_resuelta ? `Resuelta el ${fechaES(f.fecha_resuelta)}` : 'Resuelta'
  return 'Pendiente de comprobar'
}

const etiquetaPrioridad = (p) => {
  const x = PRIORIDADES_PAC[p]
  return x ? `${x.etiqueta} (${x.detalle})` : ''
}
const valoracionPAC = (f) =>
  f.deficiencia && f.consecuencias ? `${nombreDeficiencia(f.deficiencia)} · ${nombreConsecuencia(f.consecuencias)}` : ''

export function htmlPAC(ev, filas) {
  const trs = filas.map((f) => `<tr>
  <td style="font-weight:bold;color:${PRIORIDADES_PAC[f.prioridad]?.color ?? '#000'}">${esc(etiquetaPrioridad(f.prioridad))}<br><span style="font-weight:normal;color:#333">${esc(valoracionPAC(f))}</span></td>
  <td>${esc(f.bloque)}${f.seccion ? ` · ${esc(f.seccion)}` : ''}</td>
  <td>${esc(f.punto)}</td>
  <td>${esc(f.observaciones ?? '')}</td>
  <td>${esc(f.responsable ?? '')}</td>
  <td>${esc(f.coste ?? '')}</td>
  <td>${esc(fechaES(f.plazo))}</td>
  <td>${esc(textoEstadoPAC(f))}</td>
  <td>${esc(textoResueltaPAC(f))}</td>
</tr>`).join('')
  const cuerpo = `<h1>Planificación de la acción correctiva (PAC)</h1>
<div class="meta">
  <p><b>Centro:</b> ${esc(ev.centro.codigo)} · ${esc(ev.centro.nombre)}</p>
  <p><b>Fecha de la visita:</b> ${esc(fechaES(ev.fecha))}</p>
  <p><b>Incidencias:</b> ${filas.length}</p>
</div>
${filas.length ? `<table>
  <thead><tr><th>Prioridad</th><th>Bloque</th><th>Punto</th><th>Observaciones</th><th>Responsable</th><th>Coste</th><th>Plazo</th><th>Estado</th><th>Comprobación</th></tr></thead>
  <tbody>${trs}</tbody>
</table>` : '<p>No se han registrado incidencias en la visita.</p>'}`
  return documentoHTML(nombreArchivoPAC(ev, 'pdf').replace(/\.pdf$/, ''), cuerpo, true)
}

export async function excelPAC(ev, filas) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('PAC')
  const fuente = { name: 'Arial', size: 10 }
  const borde = { style: 'thin', color: { argb: 'FF999999' } }
  const bordes = { top: borde, left: borde, bottom: borde, right: borde }
  ws.columns = [{ width: 18 }, { width: 34 }, { width: 60 }, { width: 40 }, { width: 22 }, { width: 24 }, { width: 13 }, { width: 38 }, { width: 24 }]
  ws.getCell('A1').value = 'Planificación de la acción correctiva (PAC)'
  ws.getCell('A1').font = { name: 'Arial', size: 14, bold: true }
  ws.getCell('A2').value = `Centro: ${ev.centro.codigo} · ${ev.centro.nombre}`
  ws.getCell('A3').value = `Fecha de la visita: ${fechaES(ev.fecha)}   ·   Incidencias: ${filas.length}`
  ;['A2', 'A3'].forEach((c) => { ws.getCell(c).font = fuente })
  const cab = ['Prioridad', 'Bloque', 'Punto', 'Observaciones', 'Responsable', 'Coste', 'Plazo', 'Estado', 'Comprobación']
  cab.forEach((t, i) => {
    const c = ws.getRow(5).getCell(i + 1)
    c.value = t
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    c.border = bordes
  })
  filas.forEach((f, i) => {
    const fila = ws.getRow(6 + i)
    const valores = [
      etiquetaPrioridad(f.prioridad) + (valoracionPAC(f) ? `\n${valoracionPAC(f)}` : ''),
      f.bloque + (f.seccion ? ` · ${f.seccion}` : ''),
      f.punto,
      f.observaciones ?? '',
      f.responsable ?? '',
      f.coste ?? '',
      f.plazo ? new Date(`${f.plazo}T00:00:00Z`) : null,
      textoEstadoPAC(f),
      textoResueltaPAC(f),
    ]
    valores.forEach((v, k) => {
      const c = fila.getCell(k + 1)
      c.value = v
      c.font = fuente
      c.border = bordes
      c.alignment = { vertical: 'top', wrapText: true }
    })
    fila.getCell(7).numFmt = 'dd/mm/yyyy'
    const color = (PRIORIDADES_PAC[f.prioridad]?.color ?? '#000000').slice(1).toUpperCase()
    fila.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF' + color } }
  })
  ws.views = [{ state: 'frozen', ySplit: 5 }]
  ws.autoFilter = { from: 'A5', to: `I${Math.max(5, 5 + filas.length)}` }
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}


// ---------- Hojas de EPI y de formación (se construyen con la evaluación) ----------
const riesgosTxt = (rs) => rs.map((x) => `${x.r} · ${x.nombre}`).join('; ')

export function htmlEPI(ev, datos) {
  const filas = datos.epis.map((e) => `<tr><td>${esc(e.nombre)}</td><td>${esc(e.norma)}</td><td>${e.proporcionar ? 'La empresa lo proporciona' : 'Uso obligatorio'}</td><td>${esc(riesgosTxt(e.riesgos))}</td></tr>`).join('')
  const otros = datos.otros.length
    ? `<h2>Otras medidas que mencionan equipos de protección</h2><ul>${datos.otros.map((o) => `<li>${esc(o.texto)} <small>(${esc(riesgosTxt(o.riesgos))})</small></li>`).join('')}</ul>`
    : ''
  const registro = Array.from({ length: 6 }, () => '<tr><td style="height:26px"></td><td></td><td></td><td></td></tr>').join('')
  const cuerpo = `${cabecera('Hoja de equipos de protección individual (EPI) del puesto', ev)}
<p class="nota">EPI que se desprenden de las medidas de la evaluación de riesgos del puesto. Su elección, entrega y uso se rigen por el Real Decreto 773/1997.</p>
${filas ? `<table><thead><tr><th>EPI</th><th>Norma</th><th>Qué hay que hacer</th><th>Riesgos para los que se necesita</th></tr></thead><tbody>${filas}</tbody></table>` : '<p>La evaluación de este puesto no exige equipos de protección individual.</p>'}
${otros}
<h2>Registro de entrega de EPI</h2>
<table><thead><tr><th style="width:14%">Fecha</th><th>EPI entregado</th><th>Nombre y apellidos</th><th style="width:22%">Firma del trabajador</th></tr></thead><tbody>${registro}</tbody></table>`
  return documentoHTML(nombreArchivo('EPI', ev, 'pdf').replace(/\.pdf$/, ''), cuerpo)
}

export function htmlFOR(ev, grupos) {
  const bloques = grupos.map((g) => `<div class="bloque"><h2>${esc(g.r)} · ${esc(g.riesgo)}</h2><ul>${g.temas.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('')
  const registro = Array.from({ length: 6 }, () => '<tr><td style="height:26px"></td><td></td><td></td><td></td></tr>').join('')
  const cuerpo = `${cabecera('Contenido formativo del puesto de trabajo', ev)}
<p class="nota">Formación en prevención de riesgos laborales que se desprende de las medidas de la evaluación del puesto, conforme al artículo 19 de la Ley 31/1995.</p>
${bloques || '<p>La evaluación de este puesto no incluye medidas de formación.</p>'}
<h2>Registro de formación recibida</h2>
<table><thead><tr><th style="width:14%">Fecha</th><th>Tema</th><th style="width:12%">Duración</th><th>Nombre, apellidos y firma</th></tr></thead><tbody>${registro}</tbody></table>`
  return documentoHTML(nombreArchivo('FOR', ev, 'pdf').replace(/\.pdf$/, ''), cuerpo)
}

function construirDocHoja(docx, ev, titulo, nota, bloques, cabeceraRegistro, tituloRegistro) {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } = docx
  const p = (texto, o = {}) => new Paragraph({ spacing: { after: 80 }, ...o, children: [new TextRun({ text: texto, ...(o.run ?? {}) })] })
  const celda = (t, negrita = false) => new TableCell({ margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: negrita, size: 18 })] })] })
  const tabla = (cab, filas) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ tableHeader: true, children: cab.map((c) => celda(c, true)) }), ...filas.map((f) => new TableRow({ cantSplit: true, children: f.map((c) => celda(c)) }))],
  })
  const hijos = [
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: titulo, bold: true, size: 34 })] }),
    p(`Centro: ${ev.centro.codigo} · ${ev.centro.nombre}`), p(`Puesto de trabajo: ${ev.puesto.nombre}`), p(`Fecha de la evaluación: ${fechaES(ev.fecha)}`),
    p(nota, { run: { italics: true, size: 18 }, spacing: { before: 120, after: 160 } }),
    ...bloques(docx, p),
    new Paragraph({ spacing: { before: 280, after: 80 }, children: [new TextRun({ text: tituloRegistro, bold: true, size: 25 })] }),
    tabla(cabeceraRegistro, Array.from({ length: 6 }, () => cabeceraRegistro.map(() => ' '))),
  ]
  return new Document({ creator: 'Evaluación de riesgos', title: titulo, styles: { default: { document: { run: { font: 'Arial', size: 21 } } } }, sections: [{ children: hijos }] })
}

export async function wordEPI(ev, datos) {
  const docx = await import('docx')
  const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType } = docx
  const celda = (t, negrita = false) => new TableCell({ margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: negrita, size: 18 })] })] })
  const bloques = (_d, p) => {
    const out = []
    if (datos.epis.length) {
      out.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ tableHeader: true, children: ['EPI', 'Norma', 'Qué hay que hacer', 'Riesgos para los que se necesita'].map((c) => celda(c, true)) }),
          ...datos.epis.map((e) => new TableRow({ cantSplit: true, children: [e.nombre, e.norma, e.proporcionar ? 'La empresa lo proporciona' : 'Uso obligatorio', riesgosTxt(e.riesgos)].map((c) => celda(c)) })),
        ],
      }))
    } else out.push(p('La evaluación de este puesto no exige equipos de protección individual.'))
    if (datos.otros.length) {
      out.push(p('Otras medidas que mencionan equipos de protección', { run: { bold: true }, spacing: { before: 200, after: 80 } }))
      datos.otros.forEach((o) => out.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun(`${o.texto} (${riesgosTxt(o.riesgos)})`)] })))
    }
    return out
  }
  const doc = construirDocHoja(docx, ev, 'Hoja de equipos de protección individual (EPI) del puesto',
    'EPI que se desprenden de las medidas de la evaluación de riesgos del puesto. Su elección, entrega y uso se rigen por el Real Decreto 773/1997.',
    bloques, ['Fecha', 'EPI entregado', 'Nombre y apellidos', 'Firma del trabajador'], 'Registro de entrega de EPI')
  return docx.Packer.toBlob(doc)
}

export async function wordFOR(ev, grupos) {
  const docx = await import('docx')
  const { Paragraph, TextRun } = docx
  const bloques = (_d, p) => {
    if (!grupos.length) return [p('La evaluación de este puesto no incluye medidas de formación.')]
    const out = []
    grupos.forEach((g) => {
      out.push(new Paragraph({ spacing: { before: 240, after: 80 }, keepNext: true, border: { bottom: { style: 'single', size: 6, color: '999999', space: 2 } }, children: [new TextRun({ text: `${g.r} · ${g.riesgo}`, bold: true, size: 25 })] }))
      g.temas.forEach((t) => out.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun(t)] })))
    })
    return out
  }
  const doc = construirDocHoja(docx, ev, 'Contenido formativo del puesto de trabajo',
    'Formación en prevención de riesgos laborales que se desprende de las medidas de la evaluación del puesto, conforme al artículo 19 de la Ley 31/1995.',
    bloques, ['Fecha', 'Tema', 'Duración', 'Nombre, apellidos y firma'], 'Registro de formación recibida')
  return docx.Packer.toBlob(doc)
}

// ---------- Registro de agresiones ----------
export async function excelAgresiones(nombreCentro, filas, nombresCentros = {}, todos = false) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Agresiones')
  const fuente = { name: 'Arial', size: 10 }
  const borde = { style: 'thin', color: { argb: 'FF999999' } }
  const bordes = { top: borde, left: borde, bottom: borde, right: borde }
  const cab = ['Fecha', 'Hora', ...(todos ? ['Centro'] : []), 'Puesto', 'Lugar', 'Tipo', 'Quién agrede', 'Ref. agresor', 'Consecuencias', 'Parte de accidente', 'Comunicada a prevención', 'Estado', 'Qué ocurrió', 'Actuación', 'Medidas']
  const anchos = [12, 8, ...(todos ? [34] : []), 24, 22, 26, 20, 12, 18, 12, 14, 10, 60, 45, 45]
  ws.columns = anchos.map((width) => ({ width }))
  ws.getCell('A1').value = 'Registro de agresiones'
  ws.getCell('A1').font = { name: 'Arial', size: 14, bold: true }
  ws.getCell('A2').value = `${nombreCentro} · ${filas.length} registros`
  ws.getCell('A2').font = fuente
  cab.forEach((t, i) => {
    const c = ws.getRow(4).getCell(i + 1)
    c.value = t
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    c.border = bordes
  })
  filas.forEach((a, i) => {
    const v = [
      a.fecha ? new Date(`${a.fecha}T00:00:00Z`) : null,
      a.hora ? a.hora.slice(0, 5) : '',
      ...(todos ? [nombresCentros[a.centro_id] ?? ''] : []),
      a.puesto ?? '', a.lugar ?? '', TIPOS[a.tipo] ?? '', AGRESORES[a.agresor] ?? '', a.agresor_ref ?? '',
      CONSECUENCIAS[a.consecuencias] ?? '', a.parte_accidente ? 'Sí' : 'No', a.comunicada_prevencion ? 'Sí' : 'No', ESTADOS[a.estado] ?? '',
      a.descripcion ?? '', a.actuacion ?? '', a.medidas ?? '',
    ]
    v.forEach((x, k) => {
      const c = ws.getRow(5 + i).getCell(k + 1)
      c.value = x; c.font = fuente; c.border = bordes; c.alignment = { vertical: 'top', wrapText: true }
    })
    ws.getRow(5 + i).getCell(1).numFmt = 'dd/mm/yyyy'
  })
  ws.views = [{ state: 'frozen', ySplit: 4 }]
  ws.autoFilter = { from: 'A4', to: `${String.fromCharCode(64 + cab.length)}${Math.max(4, 4 + filas.length)}` }
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// Plantilla para la subida masiva de agresiones: hoja «agresiones» con listas desplegables,
// hoja «instrucciones» y hoja «listas» (centros, puestos y valores admitidos).
// centros: [{codigo, nombre}]; puestos: nombres de los puestos.
export const FILAS_PLANTILLA_AGRESIONES = 500
export async function plantillaAgresiones(centros, puestos = []) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const fuente = { name: 'Arial', size: 10 }
  const negrita = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
  const relleno = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
  const N = FILAS_PLANTILLA_AGRESIONES
  const ultima = N + 1

  const ws = wb.addWorksheet('agresiones', { views: [{ state: 'frozen', ySplit: 1 }] })
  const wi = wb.addWorksheet('instrucciones')
  const wl = wb.addWorksheet('listas')

  // ---- listas ----
  const listas = [
    ['Código del centro', centros.map((c) => c.codigo)],
    ['Nombre del centro', centros.map((c) => c.nombre ?? '')],
    ['Puesto', puestos],
    ['Tipo', Object.values(TIPOS)],
    ['Quién agrede', Object.values(AGRESORES)],
    ['Consecuencias', Object.values(CONSECUENCIAS)],
    ['Sí / No', ['Sí', 'No']],
    ['Estado', Object.values(ESTADOS)],
  ]
  const rango = {}
  listas.forEach(([titulo, valores], k) => {
    const col = wl.getColumn(k + 1)
    col.width = k === 1 ? 45 : 28
    const c = wl.getCell(1, k + 1)
    c.value = titulo; c.font = negrita; c.fill = relleno('FF1F3864')
    valores.forEach((v, i) => { wl.getCell(i + 2, k + 1).value = v; wl.getCell(i + 2, k + 1).font = fuente })
    const letra = col.letter
    rango[titulo] = `'listas'!$${letra}$2:$${letra}$${Math.max(2, valores.length + 1)}`
  })
  wl.views = [{ state: 'frozen', ySplit: 1 }]

  // ---- hoja de datos ----
  const anchos = {
    'Código del centro': 16, Fecha: 12, Hora: 8, Lugar: 20, Puesto: 26, Tipo: 30, 'Quién agrede': 22, 'Ref. agresor': 12,
    Consecuencias: 18, 'Parte de accidente': 12, 'Comunicada a prevención': 14, Estado: 10, 'Qué ocurrió': 50, 'Actuación': 40, Medidas: 40,
  }
  ws.columns = COLUMNAS_AGRESIONES.map((h) => ({ header: h, key: h, width: anchos[h] ?? 16 }))
  ws.getRow(1).height = 32
  ws.getRow(1).eachCell((c) => {
    const obligatoria = OBLIGATORIAS_AGRESIONES.includes(c.value)
    c.font = negrita
    c.fill = relleno(obligatoria ? 'FFC00000' : 'FF1F3864')
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  })
  const lista = (titulo, estricta = true) => ({
    type: 'list', allowBlank: true, formulae: [rango[titulo]],
    showErrorMessage: true, errorStyle: estricta ? 'stop' : 'information',
    errorTitle: 'Valor no válido', error: estricta ? 'Elige un valor de la lista.' : 'No está en la lista de puestos. Se guardará tal como lo escribas.',
  })
  const validacion = {
    'Código del centro': lista('Código del centro'),
    Fecha: { type: 'date', operator: 'lessThanOrEqual', allowBlank: true, formulae: ['TODAY()'], showErrorMessage: true, errorTitle: 'Fecha no válida', error: 'Escribe la fecha como dd/mm/aaaa. No puede ser futura.' },
    Puesto: lista('Puesto', false),
    Tipo: lista('Tipo'),
    'Quién agrede': lista('Quién agrede'),
    'Ref. agresor': { type: 'textLength', operator: 'lessThanOrEqual', allowBlank: true, formulae: [12], showErrorMessage: true, errorTitle: 'Demasiado largo', error: 'Solo un código o unas iniciales (12 caracteres como máximo), nunca el nombre.' },
    Consecuencias: lista('Consecuencias'),
    'Parte de accidente': lista('Sí / No'),
    'Comunicada a prevención': lista('Sí / No'),
    Estado: lista('Estado'),
  }
  const formato = { Fecha: 'dd/mm/yyyy', Hora: 'hh:mm' }
  COLUMNAS_AGRESIONES.forEach((h, k) => {
    for (let r = 2; r <= ultima; r++) {
      const c = ws.getCell(r, k + 1)
      c.font = fuente
      if (formato[h]) c.numFmt = formato[h]
      if (validacion[h]) c.dataValidation = validacion[h]
      if (['Qué ocurrió', 'Actuación', 'Medidas'].includes(h)) c.alignment = { vertical: 'top', wrapText: true }
    }
  })

  // ---- instrucciones ----
  wi.columns = [{ width: 26 }, { width: 14 }, { width: 70 }]
  wi.getCell('A1').value = 'Subida masiva de agresiones: instrucciones'
  wi.getCell('A1').font = { name: 'Arial', size: 14, bold: true }
  const notas = [
    'Rellena una fila por agresión en la hoja «agresiones», desde la fila 2. No cambies los títulos de las columnas.',
    `Caben ${N} filas. Si necesitas más, sube el archivo en varias veces.`,
    'Las columnas con título rojo son obligatorias. Las que tienen lista desplegable solo admiten los valores de la lista.',
    'No escribas nombres ni datos de salud identificables: usa el puesto y un código o unas iniciales para el agresor.',
    'Antes de cargar verás una vista previa. Las filas con errores no se cargan, y las agresiones que ya están registradas (mismo centro, fecha, hora, tipo, puesto, agresor y descripción) se saltan.',
  ]
  notas.forEach((t, i) => {
    const c = wi.getCell(3 + i, 1)
    c.value = t; c.font = fuente
    wi.mergeCells(3 + i, 1, 3 + i, 3)
    c.alignment = { wrapText: true, vertical: 'top' }
    wi.getRow(3 + i).height = 28
  })
  const filaCab = 4 + notas.length
  ;['Columna', 'Obligatoria', 'Qué poner'].forEach((t, k) => {
    const c = wi.getCell(filaCab, k + 1)
    c.value = t; c.font = negrita; c.fill = relleno('FF1F3864')
  })
  const explica = {
    'Código del centro': 'Código del centro tal como aparece en la aplicación (lista desplegable; en la hoja «listas» está el nombre de cada uno).',
    Fecha: 'Fecha de la agresión, dd/mm/aaaa. No puede ser futura.',
    Hora: 'Opcional, hh:mm (por ejemplo, 14:30).',
    Lugar: 'Sala, pasillo, comedor, habitación...',
    Puesto: 'Puesto de la persona agredida. Mejor de la lista; si no está, escríbelo.',
    Tipo: `Uno de estos: ${Object.values(TIPOS).join('; ')}.`,
    'Quién agrede': `Uno de estos: ${Object.values(AGRESORES).join('; ')}. Si se deja vacío: Usuario.`,
    'Ref. agresor': 'Código o iniciales (máximo 12 caracteres). Sirve para detectar agresiones repetidas.',
    Consecuencias: `Uno de estos: ${Object.values(CONSECUENCIAS).join('; ')}. Si se deja vacío: Sin lesión.`,
    'Parte de accidente': 'Sí o No (vacío = No). Una lesión con baja exige Sí.',
    'Comunicada a prevención': 'Sí o No (vacío = No).',
    Estado: `${Object.values(ESTADOS).join(' o ')}. Si se deja vacío: Abierta.`,
    'Qué ocurrió': 'Descripción breve de los hechos.',
    'Actuación': 'Cómo se actuó en el momento.',
    Medidas: 'Medidas adoptadas o propuestas.',
  }
  COLUMNAS_AGRESIONES.forEach((h, i) => {
    const r = wi.getRow(filaCab + 1 + i)
    r.getCell(1).value = h
    r.getCell(2).value = OBLIGATORIAS_AGRESIONES.includes(h) ? 'Sí' : 'No'
    r.getCell(3).value = explica[h] ?? ''
    r.eachCell((c) => { c.font = fuente; c.alignment = { wrapText: true, vertical: 'top' } })
  })
  const filaEj = filaCab + COLUMNAS_AGRESIONES.length + 2
  wi.getCell(filaEj, 1).value = 'Ejemplo de fila'
  wi.getCell(filaEj, 1).font = { name: 'Arial', size: 10, bold: true }
  const ejemplo = [
    centros[0]?.codigo ?? 'C001', '15/09/2026', '14:30', 'Comedor', puestos.find((x) => /auxiliar de enfermer/i.test(x)) ?? puestos[0] ?? 'Enfermero/a', TIPOS.fisica, AGRESORES.usuario, 'U-07',
    CONSECUENCIAS.lesion_sin_baja, 'No', 'Sí', ESTADOS.abierta, 'Empujón al separar a dos usuarios.', 'Contención verbal y aviso al médico de guardia.', 'Revisar la ratio en el comedor.',
  ]
  COLUMNAS_AGRESIONES.forEach((h, i) => {
    const r = wi.getRow(filaEj + 1 + i)
    r.getCell(1).value = h; r.getCell(3).value = ejemplo[i]
    r.eachCell((c) => { c.font = fuente })
  })

  wb.views = [{ activeTab: 0 }]
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// ---------- Word (IR) ----------
// docx se recibe como parámetro para poder probarlo fuera del navegador.
export function construirDocIR(docx, ev, filas) {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } = docx
  const p = (texto, opciones = {}) =>
    new Paragraph({ spacing: { after: 80 }, ...opciones, children: [new TextRun({ text: texto, ...(opciones.run ?? {}) })] })

  const hijos = [
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'Información de riesgos del puesto de trabajo', bold: true, size: 34 })] }),
    p(`Centro: ${ev.centro.codigo} · ${ev.centro.nombre}`),
    p(`Puesto de trabajo: ${ev.puesto.nombre}`),
    p(`Fecha de la evaluación: ${fechaES(ev.fecha)}`),
    p('Información facilitada a los trabajadores sobre los riesgos de su puesto y las medidas preventivas que deben aplicar, conforme al artículo 18 de la Ley 31/1995 de Prevención de Riesgos Laborales.',
      { run: { italics: true, size: 18 }, spacing: { before: 120, after: 160 } }),
  ]

  agruparPorRiesgo(filas).forEach((g) => {
    hijos.push(new Paragraph({
      spacing: { before: 240, after: 80 }, keepNext: true,
      border: { bottom: { style: 'single', size: 6, color: '999999', space: 2 } },
      children: [new TextRun({ text: `${g.riesgo_id} · ${g.riesgo_nombre}`, bold: true, size: 25 })],
    }))
    if (g.condiciones.length) {
      hijos.push(p('Situaciones en las que se presenta', { run: { bold: true }, keepNext: true }))
      g.condiciones.forEach((c) => hijos.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun(c)] })))
    }
    if (g.medidas.length) {
      hijos.push(p('Medidas preventivas', { run: { bold: true }, keepNext: true, spacing: { before: 100, after: 80 } }))
      g.medidas.forEach((m) => hijos.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun(m)] })))
    }
  })

  const celda = (t) => new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    margins: { top: 120, bottom: 120, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: t, size: 20 })] })],
  })
  hijos.push(new Paragraph({ spacing: { before: 360 }, children: [] }))
  hijos.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ cantSplit: true, children: [celda('Nombre y apellidos:'), celda('DNI:')] }),
      new TableRow({ cantSplit: true, children: [celda('Fecha:'), celda('Firma del trabajador (recibí la información):')] }),
    ],
  }))

  return new Document({
    creator: 'Evaluación de riesgos',
    title: 'Información de riesgos del puesto',
    styles: { default: { document: { run: { font: 'Arial', size: 21 } } } },
    sections: [{ children: hijos }],
  })
}

export async function wordIR(ev, filas) {
  const docx = await import('docx')
  return docx.Packer.toBlob(construirDocIR(docx, ev, filas))
}
