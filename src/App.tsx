import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Check, Download, HelpCircle, Moon, Redo2, Sun, Trash2, Undo2 } from 'lucide-react'
import { HelpDialog } from './components/HelpDialog'
import { StyleBar } from './components/StyleBar'
import { ToolDock } from './components/ToolDock'
import { Whiteboard } from './components/Whiteboard'
import {
  DEFAULT_COLOR,
  DEFAULT_WIDTH,
  MAX_WIDTH,
  MIN_WIDTH,
  ZOOM_STEP,
  clampZoom,
  zoomAround,
  type Background,
  type BoardElement,
  type ColorId,
  type Theme,
  type Tool,
  type ViewTransform,
  type ViewportSize,
} from './lib/board'
import { contentBBox, downloadDataUrl, renderToDataUrl } from './lib/draw'

const BOARD_KEY = 'mathematiz.board.v2'
const DEFAULT_VIEW: ViewTransform = { scale: 1, x: 0, y: 0 }

interface PersistedBoard {
  elements: BoardElement[]
  theme: Theme
  boardName: string
  background: Background
  color: ColorId
  width: number
  tool: Tool
  view: ViewTransform
}

interface BoardState {
  present: BoardElement[]
  past: BoardElement[][]
  future: BoardElement[][]
}

type BoardAction =
  | { type: 'add'; element: BoardElement }
  | { type: 'commit'; next: BoardElement[] }
  | { type: 'eraseLive'; ids: string[] }
  | { type: 'eraseCommit'; snapshot: BoardElement[] }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' }

const VALID_TOOLS: Tool[] = ['pen', 'highlighter', 'eraser', 'line', 'arrow', 'rectangle', 'ellipse', 'text', 'pan']
const VALID_COLORS: ColorId[] = ['ink', 'slate', 'red', 'orange', 'green', 'blue', 'purple']
const VALID_BACKGROUNDS: Background[] = ['dots', 'grid', 'plain']

function isElement(value: unknown): value is BoardElement {
  if (!value || typeof value !== 'object') return false
  const element = value as { id?: unknown; kind?: unknown; color?: unknown; width?: unknown }
  return (
    typeof element.id === 'string' &&
    typeof element.kind === 'string' &&
    typeof element.color === 'string' &&
    typeof element.width === 'number'
  )
}

function loadView(value: unknown): ViewTransform {
  if (!value || typeof value !== 'object') return DEFAULT_VIEW
  const view = value as Partial<ViewTransform>
  if (
    typeof view.scale === 'number' &&
    typeof view.x === 'number' &&
    typeof view.y === 'number' &&
    Number.isFinite(view.scale) &&
    Number.isFinite(view.x) &&
    Number.isFinite(view.y)
  ) {
    return { scale: clampZoom(view.scale), x: view.x, y: view.y }
  }
  return DEFAULT_VIEW
}

function loadBoard(): PersistedBoard | null {
  try {
    const raw = localStorage.getItem(BOARD_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedBoard>
    if (!Array.isArray(parsed.elements)) return null
    return {
      elements: parsed.elements.filter(isElement),
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      boardName: typeof parsed.boardName === 'string' ? parsed.boardName : 'Untitled board',
      background: VALID_BACKGROUNDS.includes(parsed.background as Background)
        ? (parsed.background as Background)
        : 'dots',
      color: VALID_COLORS.includes(parsed.color as ColorId) ? (parsed.color as ColorId) : DEFAULT_COLOR,
      width:
        typeof parsed.width === 'number' ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed.width)) : DEFAULT_WIDTH,
      tool: VALID_TOOLS.includes(parsed.tool as Tool) ? (parsed.tool as Tool) : 'pen',
      view: loadView(parsed.view),
    }
  } catch {
    return null
  }
}

function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'add':
      return {
        present: [...state.present, action.element],
        past: [...state.past.slice(-79), state.present],
        future: [],
      }
    case 'commit':
      if (action.next === state.present) return state
      return {
        present: action.next,
        past: [...state.past.slice(-79), state.present],
        future: [],
      }
    case 'eraseLive': {
      const ids = new Set(action.ids)
      const next = state.present.filter((element) => !ids.has(element.id))
      if (next.length === state.present.length) return state
      return { ...state, present: next }
    }
    case 'eraseCommit':
      return {
        ...state,
        past: [...state.past.slice(-79), action.snapshot],
        future: [],
      }
    case 'undo': {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return {
        present: previous,
        past: state.past.slice(0, -1),
        future: [state.present, ...state.future].slice(0, 80),
      }
    }
    case 'redo': {
      if (state.future.length === 0) return state
      const next = state.future[0]
      return {
        present: next,
        past: [...state.past.slice(-79), state.present],
        future: state.future.slice(1),
      }
    }
    case 'clear':
      if (state.present.length === 0) return state
      return {
        present: [],
        past: [...state.past.slice(-79), state.present],
        future: [],
      }
    default:
      return state
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'mathematiz-board'
}

const TOOL_KEYS: Record<string, Tool> = {
  p: 'pen',
  h: 'highlighter',
  e: 'eraser',
  l: 'line',
  a: 'arrow',
  r: 'rectangle',
  o: 'ellipse',
  t: 'text',
  v: 'pan',
}

export default function App() {
  const loadedRef = useRef<PersistedBoard | null>(loadBoard())
  const loaded = loadedRef.current

  const [board, dispatch] = useReducer(boardReducer, {
    present: loaded?.elements ?? [],
    past: [],
    future: [],
  })
  const [theme, setTheme] = useState<Theme>(() => {
    if (loaded?.theme) return loaded.theme
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [boardName, setBoardName] = useState(loaded?.boardName ?? 'Untitled board')
  const [background, setBackground] = useState<Background>(loaded?.background ?? 'dots')
  const [color, setColor] = useState<ColorId>(loaded?.color ?? DEFAULT_COLOR)
  const [width, setWidth] = useState(loaded?.width ?? DEFAULT_WIDTH)
  const [tool, setTool] = useState<Tool>(loaded?.tool ?? 'pen')
  const [view, setView] = useState<ViewTransform>(loaded?.view ?? DEFAULT_VIEW)
  const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: 0 })
  const [helpOpen, setHelpOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#10130f' : '#eee7da')
  }, [theme])

  useEffect(() => {
    document.title = boardName.trim() ? `${boardName.trim()} - MatheMatiz` : 'MatheMatiz'
  }, [boardName])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const payload: PersistedBoard = {
        elements: board.present,
        theme,
        boardName,
        background,
        color,
        width,
        tool,
        view,
      }
      try {
        localStorage.setItem(BOARD_KEY, JSON.stringify(payload))
      } catch {
        // The board still works when storage is unavailable.
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [board.present, theme, boardName, background, color, width, tool, view])

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const handleAddElement = useCallback((element: BoardElement) => {
    dispatch({ type: 'add', element })
  }, [])

  const handleEraseLive = useCallback((ids: string[]) => {
    dispatch({ type: 'eraseLive', ids })
  }, [])

  const handleEraseCommit = useCallback((snapshot: BoardElement[]) => {
    dispatch({ type: 'eraseCommit', snapshot })
  }, [])

  const handleUndo = useCallback(() => {
    dispatch({ type: 'undo' })
  }, [])

  const handleRedo = useCallback(() => {
    dispatch({ type: 'redo' })
  }, [])

  const handleClear = useCallback(() => {
    dispatch({ type: 'clear' })
    showToast('Board cleared')
  }, [showToast])

  const handleExport = useCallback(() => {
    if (board.present.length === 0) {
      showToast('Nothing to export yet')
      return
    }
    const dataUrl = renderToDataUrl(board.present, {
      theme,
      background,
      padding: 56,
      maxDimension: 3000,
    })
    if (!dataUrl) {
      showToast('Could not export this board')
      return
    }
    downloadDataUrl(dataUrl, `${slugify(boardName)}.png`)
    showToast('PNG exported')
  }, [board.present, theme, background, boardName, showToast])

  const handleViewChange = useCallback((next: ViewTransform) => {
    setView(next)
  }, [])

  const handleViewport = useCallback((size: ViewportSize) => {
    setViewport(size)
  }, [])

  const zoomBy = useCallback(
    (factor: number) => {
      setView((current) =>
        zoomAround(current, current.scale * factor, viewport.width / 2, viewport.height / 2),
      )
    },
    [viewport.width, viewport.height],
  )

  const handleZoomIn = useCallback(() => zoomBy(ZOOM_STEP), [zoomBy])
  const handleZoomOut = useCallback(() => zoomBy(1 / ZOOM_STEP), [zoomBy])

  const handleZoomReset = useCallback(() => {
    setView(DEFAULT_VIEW)
  }, [])

  const handleFit = useCallback(() => {
    const bounds = contentBBox(board.present)
    if (!bounds || viewport.width === 0 || viewport.height === 0) {
      setView(DEFAULT_VIEW)
      return
    }
    const padding = 80
    const availableWidth = Math.max(80, viewport.width - padding * 2)
    const availableHeight = Math.max(80, viewport.height - padding * 2)
    const scale = clampZoom(
      Math.min(availableWidth / Math.max(bounds.width, 40), availableHeight / Math.max(bounds.height, 40)),
    )
    setView({
      scale,
      x: viewport.width / 2 - (bounds.x + bounds.width / 2) * scale,
      y: viewport.height / 2 - (bounds.y + bounds.height / 2) * scale,
    })
  }, [board.present, viewport.width, viewport.height])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const typing = isTypingTarget(event.target)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        if (typing) return
        event.preventDefault()
        if (event.shiftKey) handleRedo()
        else handleUndo()
        return
      }
      if (event.key === 'Escape') {
        if (helpOpen) {
          setHelpOpen(false)
          return
        }
      }
      if (typing || helpOpen || event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        handleZoomIn()
        return
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        handleZoomOut()
        return
      }
      if (event.key === '0') {
        event.preventDefault()
        handleZoomReset()
        return
      }
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        handleFit()
        return
      }

      const nextTool = TOOL_KEYS[event.key.toLowerCase()]
      if (nextTool) {
        event.preventDefault()
        setTool(nextTool)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleFit, handleRedo, handleUndo, handleZoomIn, handleZoomOut, handleZoomReset, helpOpen])

  return (
    <div className="app">
      <header className="appbar">
        <div className="brand" aria-label="MatheMatiz">
          <span className="brand-word">
            Mathe<span>Matiz</span>
          </span>
        </div>

        <div className="board-title-wrap">
          <input
            className="board-name"
            value={boardName}
            onChange={(event) => setBoardName(event.target.value)}
            onBlur={() => setBoardName((current) => current.trim() || 'Untitled board')}
            aria-label="Board name"
            maxLength={60}
            spellCheck={false}
          />
          <span className="board-saved-dot" aria-hidden="true" />
        </div>

        <div className="appbar-spacer" />

        <div className="top-actions">
          <div className="action-group">
            <button
              type="button"
              className="icon-button"
              onClick={handleUndo}
              disabled={board.past.length === 0}
              title="Undo (Ctrl/⌘ Z)"
              aria-label="Undo"
            >
              <Undo2 size={18} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={handleRedo}
              disabled={board.future.length === 0}
              title="Redo (Ctrl/⌘ Shift Z)"
              aria-label="Redo"
            >
              <Redo2 size={18} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={handleClear}
              disabled={board.present.length === 0}
              title="Clear the board"
              aria-label="Clear the board"
            >
              <Trash2 size={18} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={handleExport}
              disabled={board.present.length === 0}
              title="Export as PNG"
              aria-label="Export as PNG"
            >
              <Download size={18} strokeWidth={1.8} />
            </button>
          </div>

          <span className="top-divider" aria-hidden="true" />

          <div className="action-group">
            <button
              type="button"
              className="icon-button"
              onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => setHelpOpen(true)}
              aria-label="Help"
              title="Help"
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="workspace">
        <Whiteboard
          elements={board.present}
          tool={tool}
          color={color}
          width={width}
          theme={theme}
          background={background}
          view={view}
          onView={handleViewChange}
          onViewport={handleViewport}
          onAddElement={handleAddElement}
          onEraseLive={handleEraseLive}
          onEraseCommit={handleEraseCommit}
        />

        <ToolDock tool={tool} onTool={setTool} />
        <StyleBar
          color={color}
          width={width}
          theme={theme}
          background={background}
          scale={view.scale}
          onColor={setColor}
          onWidth={setWidth}
          onBackground={setBackground}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onFit={handleFit}
        />
      </main>

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Check size={15} />
          {toast}
        </div>
      )}
    </div>
  )
}
