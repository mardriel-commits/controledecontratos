import React from 'react'

export default function EmptyState({
  title = 'Nenhum registro encontrado',
  description = 'Não há informações para exibir neste momento.',
  compact = false,
}) {
  return (
    <div className="empty-state" style={compact ? { padding: 12 } : undefined}>
      <div className="empty-illustration">i</div>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>{title}</div>
      <div className="small">{description}</div>
    </div>
  )
}
