// Generación de documentos a partir de una evaluación: PAP (Excel y PDF) e IR (Word y PDF).
// Las funciones de datos y HTML son puras; las de Excel y Word cargan su librería solo al usarlas.
import { COLOR_VR, ORDEN_VR, vrDe } from './evalLogic.js'

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

export function fechaES(iso) {
  const m = String(iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

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
  <td>${esc(fechaES(f.plazo))}</td>
  <td>${esc(ESTADOS_ACCION[f.estado_accion] ?? '')}</td>
</tr>`
  }).join('')

  const cuerpo = `${cabecera('Planificación de la actividad preventiva (PAP)', ev)}
<table>
  <thead><tr>
    <th>Prioridad</th><th>Riesgo</th><th>Situación de exposición</th><th>VR</th>
    <th>Acción requerida</th><th>Medidas preventivas</th><th>Responsable</th><th>Plazo</th><th>Estado</th>
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
    { width: 11 }, { width: 34 }, { width: 38 }, { width: 7 }, { width: 38 },
    { width: 60 }, { width: 22 }, { width: 13 }, { width: 13 },
  ]
  ws.getCell('A1').value = 'Planificación de la actividad preventiva (PAP)'
  ws.getCell('A1').font = { name: 'Arial', size: 14, bold: true }
  ws.getCell('A2').value = `Centro: ${ev.centro.codigo} · ${ev.centro.nombre}`
  ws.getCell('A3').value = `Puesto: ${ev.puesto.nombre}   ·   Fecha de la evaluación: ${fechaES(ev.fecha)}`
  ;['A2', 'A3'].forEach((c) => { ws.getCell(c).font = fuente })

  const cab = ['Prioridad', 'Riesgo', 'Situación de exposición', 'VR', 'Acción requerida',
    'Medidas preventivas', 'Responsable', 'Plazo', 'Estado']
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
      f.plazo ? new Date(`${f.plazo}T00:00:00Z`) : null,
      ESTADOS_ACCION[f.estado_accion] ?? '',
    ]
    valores.forEach((v, k) => {
      const c = fila.getCell(k + 1)
      c.value = v
      c.font = fuente
      c.border = bordes
      c.alignment = { vertical: 'top', wrapText: true, horizontal: k === 3 ? 'center' : 'left' }
    })
    fila.getCell(8).numFmt = 'dd/mm/yyyy'
    const vr = fila.getCell(4)
    vr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR_VR[f.vr].slice(1).toUpperCase() } }
    vr.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
  })

  ws.views = [{ state: 'frozen', ySplit: 5 }]
  ws.autoFilter = { from: 'A5', to: `I${Math.max(5, 5 + filasPlan.length)}` }
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }

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
