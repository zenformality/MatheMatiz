import { useEffect } from 'react'
import { X } from 'lucide-react'

interface HelpDialogProps {
  open: boolean
  onClose: () => void
}

const SHORTCUTS = [
  ['Pen', 'P'],
  ['Highlighter', 'H'],
  ['Eraser', 'E'],
  ['Line', 'L'],
  ['Arrow', 'A'],
  ['Rectangle', 'R'],
  ['Ellipse', 'O'],
  ['Text', 'T'],
  ['Hand', 'V'],
]

export function HelpDialog({ open, onClose }: HelpDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-head">
          <div>
            <p className="panel-kicker">Field guide</p>
            <h2 id="help-title">A board with a few good tools</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close help">
            <X size={18} />
          </button>
        </div>

        <div className="help-columns">
          <section>
            <h3>Draw</h3>
            <ul className="help-list">
              <li>Use pen, highlighter, eraser, line, arrow, rectangle, ellipse, or text.</li>
              <li>Pick a colour and size in the bar along the bottom.</li>
              <li>Switch the paper between plain, dotted, and grid.</li>
              <li>Undo, redo, clear, and export the board as a PNG.</li>
              <li>Everything stays on this device, and the board saves automatically.</li>
            </ul>
          </section>
          <section>
            <h3>Move around</h3>
            <ul className="help-list">
              <li>Scroll with the wheel or trackpad to pan the board.</li>
              <li>Hold Ctrl / ⌘ while scrolling to zoom around the pointer.</li>
              <li>Use the Hand tool, or drag with the middle mouse button, to pan.</li>
              <li>Use − / + in the bottom bar, or the Fit button to frame the drawing.</li>
              <li>Press 0 to return to 100%.</li>
            </ul>
          </section>
        </div>

        <section className="shortcut-section">
          <div className="shortcut-title">
            <h3>Keyboard</h3>
            <span>single keys switch tools when you are not typing</span>
          </div>
          <div className="shortcut-grid">
            {SHORTCUTS.map(([label, key]) => (
              <div key={label}>
                <span>{label}</span>
                <kbd>{key}</kbd>
              </div>
            ))}
            <div>
              <span>Zoom in / out</span>
              <kbd>+ / −</kbd>
            </div>
            <div>
              <span>Reset zoom</span>
              <kbd>0</kbd>
            </div>
            <div>
              <span>Fit drawing</span>
              <kbd>F</kbd>
            </div>
            <div>
              <span>Undo</span>
              <kbd>Ctrl / ⌘ Z</kbd>
            </div>
            <div>
              <span>Redo</span>
              <kbd>Ctrl / ⌘ ⇧ Z</kbd>
            </div>
            <div>
              <span>Close dialog</span>
              <kbd>Esc</kbd>
            </div>
          </div>
        </section>

        <div className="help-foot">
          <p>
            Tip: zoom in for fine handwriting, then fit the drawing back to the screen when you want the whole page in
            view.
          </p>
          <button type="button" className="primary-button" onClick={onClose}>
            Back to the board
          </button>
        </div>
      </div>
    </div>
  )
}
