import { CircleDot, Grid3x3, Maximize2, Minus, Plus, type LucideIcon } from 'lucide-react'
import {
  INK_COLORS,
  MAX_WIDTH,
  MIN_WIDTH,
  colorValue,
  type Background,
  type ColorId,
  type Theme,
} from '../lib/board'

interface StyleBarProps {
  color: ColorId
  width: number
  theme: Theme
  background: Background
  scale: number
  onColor: (color: ColorId) => void
  onWidth: (width: number) => void
  onBackground: (background: Background) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onFit: () => void
}

const BACKGROUNDS: { id: Background; label: string; icon: LucideIcon }[] = [
  { id: 'plain', label: 'Plain paper', icon: Minus },
  { id: 'dots', label: 'Dotted grid', icon: CircleDot },
  { id: 'grid', label: 'Square grid', icon: Grid3x3 },
]

export function StyleBar({
  color,
  width,
  theme,
  background,
  scale,
  onColor,
  onWidth,
  onBackground,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFit,
}: StyleBarProps) {
  return (
    <div className="style-bar" role="toolbar" aria-label="Ink style and zoom">
      <div className="swatches" aria-label="Ink colour">
        {INK_COLORS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`swatch ${color === item.id ? 'is-active' : ''}`}
            style={{ background: colorValue(item.id, theme) }}
            onClick={() => onColor(item.id)}
            aria-label={item.name}
            aria-pressed={color === item.id}
            title={item.name}
          />
        ))}
      </div>

      <span className="style-divider" aria-hidden="true" />

      <label className="width-control">
        <span className="width-preview" aria-hidden="true">
          <span style={{ width: `${Math.max(3, width * 1.7)}px`, height: `${Math.max(3, width * 1.7)}px` }} />
        </span>
        <input
          type="range"
          min={MIN_WIDTH}
          max={MAX_WIDTH}
          step={0.5}
          value={width}
          onChange={(event) => onWidth(Number(event.target.value))}
          aria-label="Stroke size"
        />
      </label>

      <span className="style-divider" aria-hidden="true" />

      <div className="background-switch" aria-label="Board background">
        {BACKGROUNDS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={background === id ? 'is-active' : ''}
            onClick={() => onBackground(id)}
            aria-label={label}
            aria-pressed={background === id}
            title={label}
          >
            <Icon size={15} strokeWidth={1.8} />
          </button>
        ))}
      </div>

      <span className="style-divider" aria-hidden="true" />

      <div className="zoom-control" aria-label="Zoom">
        <button type="button" className="zoom-button" onClick={onZoomOut} aria-label="Zoom out" title="Zoom out (−)">
          <Minus size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="zoom-value"
          onClick={onZoomReset}
          aria-label={`Reset zoom, currently ${Math.round(scale * 100)} percent`}
          title="Reset to 100% (0)"
        >
          {Math.round(scale * 100)}%
        </button>
        <button type="button" className="zoom-button" onClick={onZoomIn} aria-label="Zoom in" title="Zoom in (+)">
          <Plus size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="zoom-button zoom-fit"
          onClick={onFit}
          aria-label="Fit drawing to screen"
          title="Fit drawing to screen (F)"
        >
          <Maximize2 size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
