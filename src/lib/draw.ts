import {
  boardBackground,
  boardPatternColor,
  colorValue,
  type Background,
  type BoardElement,
  type Point,
  type ShapeElement,
  type TextElement,
  type Theme,
  type ViewTransform,
} from './board'

export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

const HIGHLIGHTER_SCALE = 5.5
const HIGHLIGHTER_ALPHA = 0.3
const TEXT_FONT = '"Manrope Variable", "Manrope", "Avenir Next", "Segoe UI", system-ui, sans-serif'
const TEXT_WEIGHT = 500

let measureContext: CanvasRenderingContext2D | null = null

function measureLine(line: string, fontSize: number): number {
  if (measureContext === null && typeof document !== 'undefined') {
    measureContext = document.createElement('canvas').getContext('2d')
  }
  if (!measureContext) return line.length * fontSize * 0.58
  measureContext.font = `${TEXT_WEIGHT} ${fontSize}px ${TEXT_FONT}`
  return measureContext.measureText(line).width
}

function normaliseRect(start: Point, end: Point): BBox {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

export function elementBBox(element: BoardElement): BBox {
  if (element.kind === 'stroke') {
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (const point of element.points) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }
  if (element.kind === 'text') {
    const lines = element.text.split('\n')
    const widest = Math.max(1, ...lines.map((line) => measureLine(line, element.fontSize)))
    return {
      x: element.at.x,
      y: element.at.y,
      width: widest,
      height: lines.length * element.fontSize * 1.3,
    }
  }
  return normaliseRect(element.start, element.end)
}

export function contentBBox(elements: BoardElement[]): BBox | null {
  if (elements.length === 0) return null
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const element of elements) {
    const box = elementBBox(element)
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function drawStrokePath(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length === 0) return
  if (points.length === 1) {
    ctx.beginPath()
    ctx.arc(points[0].x, points[0].y, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fillStyle = ctx.strokeStyle
    ctx.fill()
    return
  }
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y)
  } else {
    for (let index = 1; index < points.length - 1; index += 1) {
      const midpoint = {
        x: (points[index].x + points[index + 1].x) / 2,
        y: (points[index].y + points[index + 1].y) / 2,
      }
      ctx.quadraticCurveTo(points[index].x, points[index].y, midpoint.x, midpoint.y)
    }
    const last = points[points.length - 1]
    ctx.lineTo(last.x, last.y)
  }
  ctx.stroke()
}

function drawArrowHead(ctx: CanvasRenderingContext2D, start: Point, end: Point, width: number) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  const size = Math.max(10, width * 3.8)
  const spread = Math.PI / 7
  ctx.beginPath()
  ctx.moveTo(end.x, end.y)
  ctx.lineTo(end.x - Math.cos(angle - spread) * size, end.y - Math.sin(angle - spread) * size)
  ctx.lineTo(end.x - Math.cos(angle + spread) * size, end.y - Math.sin(angle + spread) * size)
  ctx.closePath()
  ctx.fillStyle = ctx.strokeStyle
  ctx.fill()
}

function drawShape(ctx: CanvasRenderingContext2D, element: ShapeElement) {
  const { start, end } = element
  ctx.beginPath()
  if (element.kind === 'line' || element.kind === 'arrow') {
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
    if (element.kind === 'arrow') drawArrowHead(ctx, start, end, element.width)
    return
  }
  const box = normaliseRect(start, end)
  if (element.kind === 'rectangle') {
    ctx.strokeRect(box.x, box.y, box.width, box.height)
    return
  }
  ctx.ellipse(box.x + box.width / 2, box.y + box.height / 2, box.width / 2, box.height / 2, 0, 0, Math.PI * 2)
  ctx.stroke()
}

function drawText(ctx: CanvasRenderingContext2D, element: TextElement) {
  ctx.fillStyle = ctx.strokeStyle
  ctx.font = `${TEXT_WEIGHT} ${element.fontSize}px ${TEXT_FONT}`
  ctx.textBaseline = 'top'
  const lines = element.text.split('\n')
  lines.forEach((line, index) => {
    ctx.fillText(line, element.at.x, element.at.y + index * element.fontSize * 1.3)
  })
}

export function drawElement(ctx: CanvasRenderingContext2D, element: BoardElement, theme: Theme) {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = colorValue(element.color, theme)
  ctx.lineWidth = element.kind === 'stroke' && element.tool === 'highlighter' ? element.width * HIGHLIGHTER_SCALE : element.width
  if (element.kind === 'stroke' && element.tool === 'highlighter') ctx.globalAlpha *= HIGHLIGHTER_ALPHA
  if (element.kind === 'stroke') drawStrokePath(ctx, element.points)
  else if (element.kind === 'text') drawText(ctx, element)
  else drawShape(ctx, element)
  ctx.restore()
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  elements: BoardElement[],
  theme: Theme,
  draft?: BoardElement | null,
) {
  for (const element of elements) drawElement(ctx, element, theme)
  if (draft) drawElement(ctx, draft, theme)
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y)
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy))
}

function pointNearElement(element: BoardElement, point: Point, radius: number): boolean {
  const box = elementBBox(element)
  const slack = radius + element.width / 2
  if (
    point.x < box.x - slack ||
    point.x > box.x + box.width + slack ||
    point.y < box.y - slack ||
    point.y > box.y + box.height + slack
  ) {
    return false
  }
  if (element.kind === 'text') return true
  if (element.kind === 'stroke') {
    if (element.points.length === 1) return Math.hypot(point.x - element.points[0].x, point.y - element.points[0].y) <= slack
    for (let index = 1; index < element.points.length; index += 1) {
      if (distanceToSegment(point, element.points[index - 1], element.points[index]) <= slack) return true
    }
    return false
  }
  if (element.kind === 'line' || element.kind === 'arrow') {
    return distanceToSegment(point, element.start, element.end) <= slack
  }
  return true
}

export function eraseHits(elements: BoardElement[], point: Point, radius: number): string[] {
  const hits: string[] = []
  for (const element of elements) {
    if (pointNearElement(element, point, radius)) hits.push(element.id)
  }
  return hits
}

interface ImageOptions {
  theme: Theme
  background: Background
  padding?: number
  maxDimension?: number
}

/**
 * Paint the paper and its pattern in screen space. Keeping this separate from
 * element drawing lets the camera zoom and pan without rebuilding the pattern
 * as elements.
 */
export function paintBoard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: Theme,
  background: Background,
  scale: number,
  offsetX = 0,
  offsetY = 0,
) {
  ctx.fillStyle = boardBackground(theme)
  ctx.fillRect(0, 0, width, height)
  if (background === 'plain') return
  ctx.fillStyle = boardPatternColor(theme)
  ctx.strokeStyle = boardPatternColor(theme)
  if (background === 'dots') {
    const gap = 24 * scale
    if (gap < 5) return
    const dotRadius = Math.max(0.7, Math.min(2.6, 1.1 * scale))
    const modulo = (value: number) => ((value % gap) + gap) % gap
    for (let x = modulo(offsetX); x < width; x += gap) {
      for (let y = modulo(offsetY); y < height; y += gap) {
        ctx.beginPath()
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    return
  }
  const gap = 32 * scale
  if (gap < 6) return
  const modulo = (value: number) => ((value % gap) + gap) % gap
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = modulo(offsetX); x < width; x += gap) {
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, height)
  }
  for (let y = modulo(offsetY); y < height; y += gap) {
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(width, y + 0.5)
  }
  ctx.stroke()
}

export function paintViewBoard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: Theme,
  background: Background,
  view: ViewTransform,
) {
  paintBoard(ctx, width, height, theme, background, view.scale, view.x, view.y)
}

export function renderToDataUrl(elements: BoardElement[], options: ImageOptions): string | null {
  const bounds = contentBBox(elements)
  if (!bounds) return null
  const padding = options.padding ?? 56
  const maxDimension = options.maxDimension ?? 3000
  const rawWidth = Math.max(220, bounds.width + padding * 2)
  const rawHeight = Math.max(160, bounds.height + padding * 2)
  const scale = Math.min(3, Math.max(1, maxDimension / Math.max(rawWidth, rawHeight)))
  const width = Math.round(rawWidth * scale)
  const height = Math.round(rawHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  paintBoard(ctx, width, height, options.theme, options.background, scale)
  ctx.save()
  ctx.scale(scale, scale)
  ctx.translate(padding - bounds.x, padding - bounds.y)
  for (const element of elements) drawElement(ctx, element, options.theme)
  ctx.restore()
  return canvas.toDataURL('image/png')
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
