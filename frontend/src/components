import React, { useEffect } from 'react'

export default function ConfirmModal({
  open,
  title = 'Confirmar ação',
  description = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
  children,
}) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && !loading) onClose?.()
    }

    if (open) {
      window.addEventListener('keydown', onKeyDown)
    }

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, loading, onClose])

  if (!open) return null

  return (
    <div className="overlay" onClick={() => !loading && onClose?.()}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
        </div>

        <div className="modal-body">
          {description && (
            <div className="small" style={{ marginBottom: children ? 14 : 0 }}>
              {description}
            </div>
          )}
          {children}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : ''}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
