import React from 'react'

export default function PageLoader({
  title = 'Carregando informações',
  subtitle = 'Aguarde um instante.',
  minHeight = 220,
}) {
  return (
    <div className="card" style={{ minHeight }}>
      <div className="loading-block">
        <div className="spinner" />
        <div style={{ fontWeight: 900 }}>{title}</div>
        <div className="small">{subtitle}</div>
      </div>
    </div>
  )
}
