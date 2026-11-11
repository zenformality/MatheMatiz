export type Theme = 'light' | 'dark'
export type Background = 'dots' | 'grid' | 'plain'
export type Tool =
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'pan'

export type ColorId = 'ink' | 'slate' | 'red' | 'orange' | 'green' | 'blue' | 'purple'

export interface Point {
  x: number
  y: number
}

export interface ViewTransform {
  scale: number
  x: number
  y: number
}

export interface ViewportSize {
  width: number
  height: number
}

export const MIN_ZOOM = 0.2
export const MAX_ZOOM = 4
export const ZOOM_STEP = 1.2

export function clampZoom(scale: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale))
}

export function zoomAround(view: ViewTransform, nextScale: number, screenX: number, screenY: number): ViewTransform {
  const scale = clampZoom(nextScale)
  if (scale === view.scale) return view
  const ratio = scale / view.scale
  return {
    scale,
    x: screenX - (screenX - view.x) * ratio,
    y: screenY - (screenY - view.y) * ratio,
  }
}

interface ElementBase {
  id: string
  color: ColorId
  width: number
  createdAt: number
}

export interface StrokeElement extends ElementBase {
  kind: 'stroke'
  tool: 'pen' | 'highlighter'
  points: Point[]
}

export interface ShapeElement extends ElementBase {
  kind: 'line' | 'arrow' | 'rectangle' | 'ellipse'
  start: Point
  end: Point
}

export interface TextElement extends ElementBase {
  kind: 'text'
  at: Point
  text: string
  fontSize: number
}

export type BoardElement = StrokeElement | ShapeElement | TextElement

export interface InkColor {
  id: ColorId
  name: string
  light: string
  dark: string
}

export const INK_COLORS: InkColor[] = [
  { id: 'ink', name: 'Ink', light: '#24221e', dark: '#f1ebdf' },
  { id: 'slate', name: 'Slate', light: '#59646d', dark: '#b8c4cc' },
  { id: 'red', name: 'Red', light: '#c8452c', dark: '#ff8066' },
  { id: 'orange', name: 'Orange', light: '#b96f1d', dark: '#f5b45b' },
  { id: 'green', name: 'Green', light: '#2f756a', dark: '#78c9b7' },
  { id: 'blue', name: 'Blue', light: '#2f5f9e', dark: '#82b2f2' },
  { id: 'purple', name: 'Purple', light: '#7a4b8c', dark: '#c79adb' },
]

export const DEFAULT_COLOR: ColorId = 'ink'
export const DEFAULT_WIDTH = 3.5
export const MIN_WIDTH = 1
export const MAX_WIDTH = 12

export function colorValue(id: ColorId, theme: Theme): string {
  const color = INK_COLORS.find((item) => item.id === id) ?? INK_COLORS[0]
  return theme === 'dark' ? color.dark : color.light
}

export function boardBackground(theme: Theme): string {
  return theme === 'dark' ? '#181c17' : '#fffdf8'
}

export function boardPatternColor(theme: Theme): string {
  return theme === 'dark' ? 'rgba(239, 232, 218, 0.17)' : 'rgba(36, 34, 30, 0.14)'
}

let idCounter = 0

export function makeId(): string {
  idCounter += 1
  return `${Date.now().toString(36)}-${idCounter.toString(36)}`
}

export function createStroke(tool: 'pen' | 'highlighter', color: ColorId, width: number, points: Point[]): StrokeElement {
  return { id: makeId(), kind: 'stroke', tool, color, width, points, createdAt: Date.now() }
}

export function createShape(kind: ShapeElement['kind'], color: ColorId, width: number, start: Point, end: Point): ShapeElement {
  return { id: makeId(), kind, color, width, start, end, createdAt: Date.now() }
}

export function createText(color: ColorId, width: number, at: Point, text: string): TextElement {
  return {
    id: makeId(),
    kind: 'text',
    color,
    width,
    at,
    text,
    fontSize: Math.round(18 + width * 2.2),
    createdAt: Date.now(),
  }
}
