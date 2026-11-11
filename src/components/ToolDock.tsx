import {
  ArrowUpRight,
  Circle,
  Eraser,
  Hand,
  Highlighter,
  Minus,
  Pencil,
  Square,
  Type,
  type LucideIcon,
} from 'lucide-react'
import type { Tool } from '../lib/board'

interface ToolDockProps {
  tool: Tool
  onTool: (tool: Tool) => void
}

interface ToolDefinition {
  id: Tool
  label: string
  shortcut: string
  icon: LucideIcon
}

const TOOLS: ToolDefinition[] = [
  { id: 'pen', label: 'Pen', shortcut: 'P', icon: Pencil },
  { id: 'highlighter', label: 'Highlighter', shortcut: 'H', icon: Highlighter },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser },
  { id: 'line', label: 'Line', shortcut: 'L', icon: Minus },
  { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: ArrowUpRight },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: Circle },
  { id: 'text', label: 'Text', shortcut: 'T', icon: Type },
  { id: 'pan', label: 'Hand', shortcut: 'V', icon: Hand },
]

export function ToolDock({ tool, onTool }: ToolDockProps) {
  return (
    <div className="tool-dock" role="toolbar" aria-label="Whiteboard tools">
      {TOOLS.map(({ id, label, shortcut, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`tool-button ${tool === id ? 'is-active' : ''}`}
          onClick={() => onTool(id)}
          aria-pressed={tool === id}
          aria-label={`${label} tool (${shortcut})`}
          title={`${label} (${shortcut})`}
        >
          <Icon size={19} strokeWidth={1.8} />
          <span className="tool-shortcut" aria-hidden="true">
            {shortcut}
          </span>
        </button>
      ))}
    </div>
  )
}
