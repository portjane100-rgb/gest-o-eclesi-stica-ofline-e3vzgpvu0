export interface CompressImageOptions {
  maxDimension?: number
  quality?: number
  mimeType?: 'image/jpeg' | 'image/webp'
}

export interface CompressImageResult {
  file: File
  previewUrl: string
  width: number
  height: number
  originalSize: number
  compressedSize: number
  compressed: boolean
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

export async function compressImage(
  file: File,
  options: CompressImageOptions = {},
): Promise<CompressImageResult> {
  const { maxDimension = 800, quality = 0.82, mimeType = 'image/jpeg' } = options

  if (!file.type.startsWith('image/')) {
    return {
      file,
      previewUrl: URL.createObjectURL(file),
      width: 0,
      height: 0,
      originalSize: file.size,
      compressedSize: file.size,
      compressed: false,
    }
  }

  if (file.type === 'image/svg+xml') {
    return {
      file,
      previewUrl: URL.createObjectURL(file),
      width: 0,
      height: 0,
      originalSize: file.size,
      compressedSize: file.size,
      compressed: false,
    }
  }

  try {
    const img = await loadImageFromFile(file)
    const origW = img.naturalWidth || img.width
    const origH = img.naturalHeight || img.height

    if (!origW || !origH) {
      return {
        file,
        previewUrl: URL.createObjectURL(file),
        width: origW,
        height: origH,
        originalSize: file.size,
        compressedSize: file.size,
        compressed: false,
      }
    }

    let targetW = origW
    let targetH = origH

    if (origW > maxDimension || origH > maxDimension) {
      if (origW >= origH) {
        targetW = maxDimension
        targetH = Math.round((origH / origW) * maxDimension)
      } else {
        targetH = maxDimension
        targetW = Math.round((origW / origH) * maxDimension)
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return {
        file,
        previewUrl: URL.createObjectURL(file),
        width: origW,
        height: origH,
        originalSize: file.size,
        compressedSize: file.size,
        compressed: false,
      }
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, targetW, targetH)
    }

    ctx.drawImage(img, 0, 0, targetW, targetH)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), mimeType, quality)
    })

    if (!blob) {
      return {
        file,
        previewUrl: URL.createObjectURL(file),
        width: origW,
        height: origH,
        originalSize: file.size,
        compressedSize: file.size,
        compressed: false,
      }
    }

    if (blob.size >= file.size && origW <= maxDimension && origH <= maxDimension) {
      return {
        file,
        previewUrl: URL.createObjectURL(file),
        width: origW,
        height: origH,
        originalSize: file.size,
        compressedSize: file.size,
        compressed: false,
      }
    }

    const extension = mimeType === 'image/webp' ? '.webp' : '.jpg'
    const baseName = file.name.replace(/\.[^/.]+$/, '')
    const newFileName = `${baseName}${extension}`

    const compressedFile = new File([blob], newFileName, {
      type: mimeType,
      lastModified: Date.now(),
    })

    const previewUrl = URL.createObjectURL(compressedFile)

    return {
      file: compressedFile,
      previewUrl,
      width: targetW,
      height: targetH,
      originalSize: file.size,
      compressedSize: compressedFile.size,
      compressed: true,
    }
  } catch (err) {
    console.warn('Falha ao comprimir imagem via canvas, utilizando arquivo original:', err)
    return {
      file,
      previewUrl: URL.createObjectURL(file),
      width: 0,
      height: 0,
      originalSize: file.size,
      compressedSize: file.size,
      compressed: false,
    }
  }
}
