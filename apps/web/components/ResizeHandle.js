import { useCallback, useEffect, useRef, useState } from 'react'
import { clampPanelSize, getResizeMetrics } from '../lib/panels'
import { useLanguage } from './LanguageProvider'
import styles from '../styles/ResizeHandle.module.css'

export default function ResizeHandle({
  label, controls, containerRef, targetRef, adjacentRef, property,
  orientation = 'vertical', reverse = false, minimum = 140, adjacentMinimum = 320,
  className = '', hidden = false, onCommit,
}) {
  const { t } = useLanguage()
  const [metrics, setMetrics] = useState({ value: minimum, min: minimum, max: minimum })
  const [dragging, setDragging] = useState(false)
  const drag = useRef(null)
  const horizontal = orientation === 'horizontal'

  const measure = useCallback(() => {
    const dimension = horizontal ? 'height' : 'width'
    return getResizeMetrics(
      targetRef.current.getBoundingClientRect()[dimension],
      adjacentRef.current.getBoundingClientRect()[dimension],
      minimum, adjacentMinimum, horizontal,
    )
  }, [horizontal, targetRef, adjacentRef, minimum, adjacentMinimum])

  useEffect(() => {
    const observer = new ResizeObserver(() => setMetrics(measure()))
    observer.observe(containerRef.current)
    observer.observe(adjacentRef.current)
    return () => observer.disconnect()
  }, [measure, containerRef, adjacentRef])

  function resize(size, persist = false) {
    const next = clampPanelSize(size, measure())
    containerRef.current.style.setProperty(property, `${next}px`)
    if (drag.current) drag.current.value = next
    if (persist) onCommit?.(property, next)
  }

  function reset() {
    containerRef.current.style.removeProperty(property)
    if (drag.current) drag.current.changed = false
    onCommit?.(property, null)
  }

  function finish(event) {
    if (drag.current?.pointerId !== event.pointerId) return
    if (drag.current.changed) {
      onCommit?.(property, drag.current.value)
    }
    drag.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function onKeyDown(event) {
    const increase = horizontal ? 'ArrowDown' : 'ArrowRight'
    const decrease = horizontal ? 'ArrowUp' : 'ArrowLeft'
    const current = measure()
    if (event.key === increase || event.key === decrease) {
      event.preventDefault()
      resize(current.value + (event.shiftKey ? 50 : 10)
        * (event.key === increase ? 1 : -1) * (reverse ? -1 : 1), true)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      resize(event.key === 'Home' ? current.min : current.max, true)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      reset()
    }
  }

  return (
    <div role="separator" tabIndex={0} hidden={hidden} aria-label={label}
      aria-controls={controls} aria-orientation={orientation}
      aria-valuenow={Math.round(metrics.value)} aria-valuemin={Math.round(metrics.min)}
      aria-valuemax={Math.round(metrics.max)} title={`${label}. ${t('panels.hint')}`}
      className={`${styles.handle} ${horizontal ? styles.horizontal : styles.vertical} ${dragging ? styles.dragging : ''} ${className}`}
      onKeyDown={onKeyDown} onDoubleClick={reset}
      onPointerDown={event => {
        if (event.button !== 0 || !event.isPrimary) return
        event.preventDefault()
        event.currentTarget.focus()
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = {
          pointerId: event.pointerId,
          coordinate: horizontal ? event.clientY : event.clientX,
          size: measure().value,
          changed: false,
        }
        setDragging(true)
      }}
      onPointerMove={event => {
        if (drag.current?.pointerId !== event.pointerId) return
        const coordinate = horizontal ? event.clientY : event.clientX
        resize(drag.current.size + (coordinate - drag.current.coordinate) * (reverse ? -1 : 1))
        drag.current.changed = true
      }}
      onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}
    />
  )
}
