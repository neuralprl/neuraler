// Apartado todavía sin contenido. Explica qué va a recoger y qué hace falta para construirlo.
export default function Pendiente({ titulo, texto, necesita = [] }) {
  return (
    <div style={{ textAlign: 'left', maxWidth: 760 }}>
      <h2>{titulo}</h2>
      <p style={{ background: '#fde9c4', color: '#7a4b00', padding: '10px 14px', borderRadius: 6, fontWeight: 600 }}>Apartado en preparación</p>
      <p>{texto}</p>
      {necesita.length > 0 && (
        <>
          <h3 style={{ marginBottom: 6 }}>Qué hace falta</h3>
          <ul style={{ marginTop: 0 }}>{necesita.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </>
      )}
    </div>
  )
}
