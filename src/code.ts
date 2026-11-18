import { c } from './helpers/misc'
import { comparison, comparableTypes } from './config'

type Bounds = { x: number, y: number, width: number, height: number }

type DiffResult = {
  first: Uint8Array
  second: Uint8Array
  overlay: Uint8Array
  changed: number
  total: number
}

// Hidden UI is used only as a canvas worker for decoding, diffing and encoding PNGs
figma.showUI(__html__, { visible: false })

const uiReady = new Promise<void>((resolve) => {
  figma.ui.on('message', function onReady(msg) {
    if (msg?.type !== 'ready') return
    figma.ui.off('message', onReady)
    resolve()
  })
})

run().catch((error) => {
  c(error, 'error')
  figma.closePlugin(`Comparison failed: ${error?.message ?? error}`)
})

async function run() {
  const selection = figma.currentPage.selection

  if (selection.length !== 2 || !selection.every((node) => comparableTypes.includes(node.type))) {
    figma.closePlugin('Select exactly two frames')
    return
  }

  const [first, second] = sortByPosition(selection)
  const a = getBounds(first)
  const b = getBounds(second)

  const width = Math.max(a.width, b.width)
  const height = Math.max(a.height, b.height)
  const scale = Math.min(comparison.scale, comparison.maxImageSize / Math.max(width, height))

  const [firstBytes, secondBytes] = await Promise.all([
    snapshot(first, scale),
    snapshot(second, scale),
  ])

  await uiReady
  const diff = await compareInUI(firstBytes, secondBytes)

  // Horizontally centered around the average center of both frames,
  // placed below the lowest of them
  const centerX = (a.x + a.width / 2 + b.x + b.width / 2) / 2
  const bottom = Math.max(a.y + a.height, b.y + b.height)

  const frame = figma.createFrame()
  frame.name = comparison.name
  frame.resize(width, height)
  frame.x = Math.round(centerX - width / 2)
  frame.y = Math.round(bottom + comparison.gap)

  // Fills are listed bottom to top
  frame.fills = [
    imageFill(diff.first, comparison.firstOpacity),
    imageFill(diff.second, comparison.secondOpacity),
    imageFill(diff.overlay, 1, comparison.overlayBlendMode),
  ]

  figma.currentPage.appendChild(frame)
  figma.currentPage.selection = [frame]
  figma.viewport.scrollAndZoomIntoView([frame])

  figma.closePlugin(summary(diff, scale))
}

// First frame is the left one (top one if they share X)
function sortByPosition(nodes: readonly SceneNode[]) {
  return [...nodes].sort((n1, n2) => {
    const b1 = getBounds(n1)
    const b2 = getBounds(n2)
    return b1.x - b2.x || b1.y - b2.y
  })
}

function getBounds(node: SceneNode): Bounds {
  if ('absoluteBoundingBox' in node && node.absoluteBoundingBox)
    return node.absoluteBoundingBox
  const [[, , x], [, , y]] = node.absoluteTransform
  return { x, y, width: node.width, height: node.height }
}

function snapshot(node: SceneNode, scale: number) {
  return node.exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: scale },
    useAbsoluteBounds: true,
  })
}

function compareInUI(first: Uint8Array, second: Uint8Array): Promise<DiffResult> {
  return new Promise((resolve, reject) => {
    figma.ui.on('message', function onResult(msg) {
      if (msg?.type === 'result') resolve(msg.data)
      else if (msg?.type === 'error') reject(new Error(msg.data))
      else return
      figma.ui.off('message', onResult)
    })
    figma.ui.postMessage({ type: 'compare', data: { first, second } })
  })
}

function imageFill(bytes: Uint8Array, opacity: number, blendMode: BlendMode = 'NORMAL'): ImagePaint {
  return {
    type: 'IMAGE',
    imageHash: figma.createImage(bytes).hash,
    scaleMode: 'FILL',
    opacity,
    blendMode,
  }
}

function summary({ changed, total }: DiffResult, scale: number) {
  const scaleNote = scale < comparison.scale ? ` · Snapshots downscaled to ${+scale.toFixed(2)}x` : ''
  if (changed === 0)
    return `Frames are identical${scaleNote}`
  const percent = (changed / total) * 100
  const percentText = percent < 0.01 ? '<0.01' : +percent.toFixed(2)
  return `${changed.toLocaleString('en-US')} px differ (${percentText}%)${scaleNote}`
}
