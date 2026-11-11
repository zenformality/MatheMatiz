import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard } from 'lucide-react'
import {
  colorValue,
  createShape,
  createStroke,
  createText,
  zoomAround,
  type Background,
  type BoardElement,
  type ColorId,
  type Point,
  type Theme,
  type Tool,
  type ViewTransform,
  type ViewportSize,
} from '../lib/board'
import { drawScene, eraseHits, paintViewBoard } from '../lib/draw'

interface WhiteboardProps {
  elements: BoardElement[]
  tool: Tool
  color: ColorId
  width: number
  theme: Theme
  background: Background
  view: ViewTransform
  onView: (view: ViewTransform) => void
  onViewport: (size: ViewportSize) => void
  onAddElement: (element: BoardElement) => void
  onEraseLive: (ids: string[]) => void
  onEraseCommit: (snapshot: BoardElement[]) => void
}

interface TextEditorState {
  at: Point
  value: string
}

interface EraseState {
  snapshot: BoardElement[]
  ids: Set<string>
}

interface PanState {
  startX: number
  startY: number
  view: ViewTransform
}

function screenPoint(
  event: PointerEvent | React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
): Point {
  const rect = canvas.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function worldPoint(
  event: PointerEvent | React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
  view: ViewTransform,
): Point {
  const point = screenPoint(event, canvas)
  return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale }
}

export function Whiteboard({
  elements,
  tool,
  color,
  width,
  theme,
  background,
  view,
  onView,
  onViewport,
  onAddElement,
  onEraseLive,
  onEraseCommit,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef<BoardElement | null>(null)
  const eraseRef = useRef<EraseState | null>(null)
  const panRef = useRef<PanState | null>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const textEditorRef = useRef<TextEditorState | null>(null)
  const viewRef = useRef(view)
  const onViewRef = useRef(onView)
  const onViewportRef = useRef(onViewport)
  viewRef.current = view
  onViewRef.current = onView
  onViewportRef.current = onViewport

  const [draftTick, setDraftTick] = useState(0)
  const [textEditor, setTextEditor] = useState<TextEditorState | null>(null)
  const [panning, setPanning] = useState(false)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const dpr = Math.min(3, window.devicePixelRatio || 1)
    const targetWidth = Math.round(rect.width * dpr)
    const targetHeight = Math.round(rect.height * dpr)
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth
      canvas.height = targetHeight
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    paintViewBoard(ctx, rect.width, rect.height, theme, background, view)
    ctx.save()
    ctx.translate(view.x, view.y)
    ctx.scale(view.scale, view.scale)
    drawScene(ctx, elements, theme, draftRef.current)
    ctx.restore()
  }, [elements, theme, background, view])

  useEffect(() => {
    redraw()
  }, [redraw, draftTick])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const report = () => {
      const rect = wrap.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        onViewportRef.current({ width: rect.width, height: rect.height })
      }
      redraw()
    }
    const observer = new ResizeObserver(report)
    observer.observe(wrap)
    report()
    window.addEventListener('resize', report)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', report)
    }
  }, [redraw])

  // Wheel is attached natively so ctrl/cmd + wheel can zoom without the
  // browser turning it into page zoom.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      const current = viewRef.current
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1
      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-event.deltaY * unit * 0.0015)
        onViewRef.current(zoomAround(current, current.scale * factor, point.x, point.y))
      } else {
        onViewRef.current({
          scale: current.scale,
          x: current.x - event.deltaX * unit,
          y: current.y - event.deltaY * unit,
        })
      }
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    textEditorRef.current = textEditor
    if (!textEditor) return
    const frame = window.requestAnimationFrame(() => {
      textAreaRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [textEditor])

  const commitText = (editor: TextEditorState | null) => {
    if (!editor) return
    if (textEditorRef.current === editor) {
      textEditorRef.current = null
      setTextEditor(null)
    }
    const value = editor.value.trim()
    if (value) onAddElement(createText(color, width, editor.at, value))
  }

  const eraseAt = (point: Point) => {
    const erase = eraseRef.current
    if (!erase) return
    const radius = Math.max(10, width * 2.4) / view.scale
    const hits = eraseHits(elements, point, radius)
    const fresh = hits.filter((id) => !erase.ids.has(id))
    if (fresh.length === 0) return
    for (const id of fresh) erase.ids.add(id)
    onEraseLive(fresh)
  }

  const finishErase = () => {
    const erase = eraseRef.current
    if (!erase) return
    eraseRef.current = null
    if (erase.ids.size > 0) onEraseCommit(erase.snapshot)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 1) return
    event.preventDefault()
    const canvas = event.currentTarget

    if (tool === 'pan' || event.button === 1) {
      canvas.setPointerCapture(event.pointerId)
      panRef.current = { startX: event.clientX, startY: event.clientY, view }
      setPanning(true)
      return
    }

    if (event.button !== 0) return
    const point = worldPoint(event, canvas, view)

    if (tool === 'text') {
      commitText(textEditorRef.current)
      setTextEditor({ at: point, value: '' })
      return
    }

    canvas.setPointerCapture(event.pointerId)

    if (tool === 'eraser') {
      eraseRef.current = { snapshot: elements, ids: new Set() }
      eraseAt(point)
      return
    }

    if (tool === 'line' || tool === 'arrow' || tool === 'rectangle' || tool === 'ellipse') {
      draftRef.current = createShape(tool, color, width, point, point)
    } else {
      draftRef.current = createStroke(tool === 'highlighter' ? 'highlighter' : 'pen', color, width, [point])
    }
    setDraftTick((tick) => tick + 1)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pan = panRef.current
    if (pan) {
      onView({
        scale: pan.view.scale,
        x: pan.view.x + (event.clientX - pan.startX),
        y: pan.view.y + (event.clientY - pan.startY),
      })
      return
    }
    if (eraseRef.current) {
      eraseAt(worldPoint(event, event.currentTarget, view))
      return
    }
    const draft = draftRef.current
    if (!draft) return
    event.preventDefault()
    const point = worldPoint(event, event.currentTarget, view)
    if (draft.kind === 'stroke') {
      const native = event.nativeEvent
      const samples = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [native]
      for (const sample of samples) {
        const next = worldPoint(sample, event.currentTarget, view)
        const previous = draft.points[draft.points.length - 1]
        if (!previous || Math.hypot(next.x - previous.x, next.y - previous.y) >= 0.9 / view.scale) {
          draft.points.push(next)
        }
      }
    } else if (draft.kind !== 'text') {
      draft.end = point
    }
    setDraftTick((tick) => tick + 1)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (panRef.current) {
      panRef.current = null
      setPanning(false)
      return
    }
    if (eraseRef.current) {
      finishErase()
      return
    }
    const draft = draftRef.current
    if (!draft) return
    draftRef.current = null
    if (draft.kind === 'stroke') {
      if (draft.points.length === 1) {
        const point = draft.points[0]
        draft.points.push({ x: point.x + 0.1, y: point.y + 0.1 })
      }
      onAddElement(draft)
    } else if (draft.kind !== 'text') {
      const distance = Math.hypot(draft.end.x - draft.start.x, draft.end.y - draft.start.y)
      if (distance * view.scale > 3) onAddElement(draft)
    }
    setDraftTick((tick) => tick + 1)
  }

  const handlePointerCancel = () => {
    finishErase()
    draftRef.current = null
    panRef.current = null
    setPanning(false)
    setDraftTick((tick) => tick + 1)
  }

  const cancelText = () => {
    textEditorRef.current = null
    setTextEditor(null)
  }

  const cursorClass =
    panning
      ? 'is-grabbing'
      : tool === 'pan'
        ? 'is-grab'
        : tool === 'eraser'
          ? 'is-eraser'
          : tool === 'text'
            ? 'is-text'
            : tool === 'pen' || tool === 'highlighter'
              ? 'is-pen'
              : 'is-shape'

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className={`ink-canvas ${cursorClass}`}
        aria-label="Whiteboard canvas. Draw with a mouse, pen, or finger."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />

      {textEditor && (
        <textarea
          ref={textAreaRef}
          className="text-editor"
          style={{
            left: textEditor.at.x * view.scale + view.x,
            top: textEditor.at.y * view.scale + view.y,
            color: colorValue(color, theme),
            fontSize: Math.max(10, Math.round((18 + width * 2.2) * view.scale)),
          }}
          value={textEditor.value}
          onChange={(event) => {
            const next = { ...textEditor, value: event.target.value }
            textEditorRef.current = next
            setTextEditor(next)
          }}
          onBlur={() => {
            if (textEditorRef.current === textEditor) commitText(textEditor)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.blur()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              cancelText()
            }
          }}
          placeholder="Type here…"
          rows={2}
          spellCheck={false}
        />
      )}

      {elements.length === 0 && !textEditor && (
        <div className="canvas-empty" aria-hidden="true">
          <div className="canvas-empty-mark">
            <span className="mark-pen">f(x)</span>
            <span className="mark-eq">=</span>
            <span className="mark-arrow">→</span>
            <span className="mark-clean">board</span>
          </div>
          <p className="canvas-empty-title">Start anywhere.</p>
          <p className="canvas-empty-copy">
            Pick a tool on the left, then write, sketch, or type. Scroll or use the hand tool to move around, and zoom when
            the board gets crowded.
          </p>
          <div className="canvas-empty-hints">
            <span>
              <Keyboard size={13} /> P pen
            </span>
            <span>
              <Keyboard size={13} /> V hand
            </span>
            <span>
              <Keyboard size={13} /> Ctrl + wheel zoom
            </span>
            <span>
              <Keyboard size={13} /> Ctrl Z undo
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
