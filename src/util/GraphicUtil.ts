import type { Color } from '@/components/character/types'

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      resolve(image)
    }
    image.onerror = (error) => {
      console.error('image load error', src, error)
      reject(error)
    }
    image.src = src
  })
}

export async function loadCanvas(src: string): Promise<HTMLCanvasElement> {
  const image = await loadImage(src)
  return imageToCanvas(image)
}

export async function canvasToImage(
  canvas: HTMLCanvasElement,
): Promise<HTMLImageElement> {
  const image = new Image(canvas.width, canvas.height)
  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => {
      resolve(image)
    }
    image.onerror = reject
    image.src = canvas.toDataURL()
  })
}

export function imageToCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const g2d = canvas.getContext('2d') as CanvasRenderingContext2D
  g2d.imageSmoothingEnabled = false
  g2d.drawImage(image, 0, 0)
  return canvas
}

export function copyReadFrequently(canvas: HTMLCanvasElement): {
  canvas: HTMLCanvasElement
  g2d: CanvasRenderingContext2D
} {
  const newCanvas = document.createElement('canvas')
  newCanvas.width = canvas.width
  newCanvas.height = canvas.height
  const g2d = newCanvas.getContext('2d', {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D
  g2d.imageSmoothingEnabled = false
  g2d.drawImage(canvas, 0, 0)

  return { canvas: newCanvas, g2d }
}

export function replaceCanvasColor(
  srcPalettes: Color[][],
  dstPalettes: Color[][],
  srcCanvas: HTMLCanvasElement | ImageData,
  dstCanvas?: HTMLCanvasElement,
): HTMLCanvasElement {
  let imageData: ImageData
  if (srcCanvas instanceof HTMLCanvasElement) {
    const srcG2d = srcCanvas.getContext('2d') as CanvasRenderingContext2D
    imageData = srcG2d.getImageData(0, 0, srcCanvas.width, srcCanvas.height)
  } else {
    imageData = srcCanvas
  }

  const replacedImageData = replaceColor(srcPalettes, dstPalettes, imageData)

  let output = dstCanvas
  if (!output) {
    output = document.createElement('canvas')
    output.width = srcCanvas.width
    output.height = srcCanvas.height
  }
  const dstG2d = output.getContext('2d') as CanvasRenderingContext2D
  dstG2d.putImageData(replacedImageData, 0, 0)
  return output
}

export function replaceColor(
  srcPalettes: Color[][],
  dstPalettes: Color[][],
  imageData: ImageData,
): ImageData {
  const { data } = imageData
  const newImageData = new ImageData(imageData.width, imageData.height)
  const { data: newData } = newImageData

  const srcColors = srcPalettes.flat()
  const dstColors = dstPalettes.flat()
  for (let x = 0; x < data.length; x += 4) {
    if (!data[x + 3]) continue
    let replaced = false
    for (let n = 0; n < srcColors.length && n < dstColors.length; n++) {
      const srcColor = srcColors[n]
      const dstColor = dstColors[n]
      if (
        data[x] === srcColor[0] &&
        data[x + 1] === srcColor[1] &&
        data[x + 2] === srcColor[2]
      ) {
        newData[x] = dstColor[0]
        newData[x + 1] = dstColor[1]
        newData[x + 2] = dstColor[2]
        newData[x + 3] = dstColor[3]
        replaced = true
        break
      }
    }
    if (!replaced) {
      newData[x] = data[x]
      newData[x + 1] = data[x + 1]
      newData[x + 2] = data[x + 2]
      newData[x + 3] = data[x + 3]
    }
  }

  return newImageData
}

const code = '0123456789abcdef'.split('')
function hexdec(value: number) {
  return `${code[Math.floor(value / 16)]}${code[value % 16]}`
}
export function encodeColor(color: Color) {
  return color
    .map((val, i) => {
      if (i === 3 && val === 255) {
        return ''
      } else {
        return hexdec(val)
      }
    })
    .join('')
}

export function decodeColor(hexdecStr: string): Color {
  if (!(hexdecStr.length === 6 || hexdecStr.length === 8)) {
    throw new Error('Wrong color code')
  }

  const chars = hexdecStr.split('')
  const r = code.indexOf(chars[0]) * 16 + code.indexOf(chars[1])
  const g = code.indexOf(chars[2]) * 16 + code.indexOf(chars[3])
  const b = code.indexOf(chars[4]) * 16 + code.indexOf(chars[5])
  let a = 255
  if (hexdecStr.length === 8) {
    a = code.indexOf(chars[6]) * 16 + code.indexOf(chars[7])
  }
  return [r, g, b, a]
}
