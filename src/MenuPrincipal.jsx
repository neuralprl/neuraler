// Menú del técnico en cuadrícula: el 0 a la izquierda, el 6 a la derecha y, en medio, dos filas de ocho columnas.
// Los números son la posición de cada apartado.
export const APARTADOS = {
  0: { id: 'centros', titulo: 'Datos de los centros' },
  1: { id: 'evaluaciones', sigla: 'ER', titulo: 'Evaluación de Riesgos' },
  2: { id: 'ere', sigla: 'ERE', titulo: 'Evaluación de Riesgos Embarazadas' },
  3: { id: 'pap', sigla: 'PAP', titulo: 'Planificación Actividad Preventiva' },
  4: { id: 'pac', sigla: 'PAC', titulo: 'Planificación Acción Correctiva' },
  5: { id: 'agresiones', titulo: 'Registro de Agresiones' },
  6: { id: 'actualizar', titulo: 'Actualizar', ayuda: 'Centros, importar datos y medidas' },
  7: { id: 'epis', sigla: 'EPIs', titulo: 'Equipos de Protección Individual' },
  8: { id: 'form', sigla: 'FORM', titulo: 'Formación en Prevención de Riesgos' },
  9: { id: 'ir', sigla: 'IR', titulo: 'Información de Riesgos' },
  10: { id: 'funciones', titulo: 'Funciones de cada puesto' },
  11: { id: 'metodologia', titulo: 'Metodología del Sistema' },
  12: { id: 'procedimientos', titulo: 'Procedimientos', ayuda: 'Gestor documental general' },
  13: { id: 'docs_centro', titulo: 'Documentos específicos por centro' },
  14: { id: 'cambios', titulo: 'Control de Cambios', ayuda: 'Trazabilidad' },
  15: { id: 'equipos', titulo: 'Evaluación equipos de trabajo', ayuda: 'El resultado va a la PAP' },
  16: { id: 'lugar', titulo: 'Evaluación de lugar de trabajo', ayuda: 'El resultado va a la PAC' },
  17: { id: 'actividades', titulo: 'Evaluación de actividades' },
}
// Columnas del centro: [fila de arriba, fila de abajo]
export const COLUMNAS = [[1, 2], [15, 16], [10, 5], [3, 4], [8, 9], [7, 17], [12, 13], [11, 14]]

const CSS = `
.menu-grid{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));grid-template-rows:auto auto;gap:6px;padding:10px 16px}
.menu-grid button{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:58px;padding:6px 8px;
  border:1px solid #c9d2d8;border-radius:8px;background:#fff;color:#1f2a33;font:inherit;font-size:12.5px;line-height:1.2;text-align:center;cursor:pointer;box-shadow:none}
.menu-grid button:hover{background:#eef3fb}
.menu-grid button strong{font-size:12px;letter-spacing:.4px;color:#1f3864}
.menu-grid button small{font-size:10.5px;opacity:.7}
.menu-grid button[aria-current="page"]{background:#1f3864;color:#fff;border-color:#1f3864}
.menu-grid button[aria-current="page"] strong{color:#fff}
.menu-grid button.menu-lateral{background:#f3f6fb;font-weight:700}
.menu-grid button.menu-lateral[aria-current="page"]{background:#1f3864}
@media (max-width: 980px){
  .menu-grid{display:flex;flex-wrap:wrap}
  .menu-grid button{grid-column:auto !important;grid-row:auto !important;flex:1 1 150px}
}
`

function Boton({ n, seccion, onElegir, estilo, lateral }) {
  const a = APARTADOS[n]
  return (
    <button type="button" className={lateral ? 'menu-lateral' : undefined} style={estilo} onClick={() => onElegir(a.id)} aria-current={seccion === a.id ? 'page' : undefined} title={a.ayuda ?? a.titulo}>
      {a.sigla && <strong>{a.sigla}</strong>}
      <span>{a.titulo}</span>
      {a.ayuda && <small>{a.ayuda}</small>}
    </button>
  )
}

export default function MenuPrincipal({ seccion, onElegir }) {
  return (
    <nav className="menu-grid" aria-label="Apartados">
      <style>{CSS}</style>
      <Boton n={0} lateral seccion={seccion} onElegir={onElegir} estilo={{ gridColumn: 1, gridRow: '1 / span 2' }} />
      {COLUMNAS.map(([arriba, abajo], i) => (
        <span key={arriba} style={{ display: 'contents' }}>
          <Boton n={arriba} seccion={seccion} onElegir={onElegir} estilo={{ gridColumn: i + 2, gridRow: 1 }} />
          <Boton n={abajo} seccion={seccion} onElegir={onElegir} estilo={{ gridColumn: i + 2, gridRow: 2 }} />
        </span>
      ))}
      <Boton n={6} lateral seccion={seccion} onElegir={onElegir} estilo={{ gridColumn: 10, gridRow: '1 / span 2' }} />
    </nav>
  )
}
