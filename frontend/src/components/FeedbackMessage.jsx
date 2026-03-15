import React from 'react'

export default function FeedbackMessage({ type = 'info', children, style }) {
  if (!children) return null

  const cls =
    type === 'success'
      ? 'notice notice-success'
      : type === 'error'
      ? 'notice notice-error'
      : 'notice notice-info'

  return (
    <div className={cls} style={style}>
      {children}
    </div>
  )
}
