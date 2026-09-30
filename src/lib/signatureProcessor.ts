/**
 * Utilitário para pré-processamento de assinaturas manuscritas no navegador (Canvas API).
 *
 * Etapas de processamento:
 * 1. Carrega a imagem enviada (PNG, JPEG, WebP) em um HTMLImageElement.
 * 2. Analisa os pixels para identificar os traços escuros (luminância ITU-R BT.601: 0.299R + 0.587G + 0.114B < threshold).
 * 3. Se nenhum traço escuro for detectado, retorna o arquivo original sem alterações.
 * 4. Detecta o bounding box mínimo em volta da rubrica/assinatura e adiciona ~12px de respiro (padding).
 * 5. Torna transparente o fundo claro (papel branco/iluminação do ambiente) com transição suave.
 * 6. Escurece e eleva o contraste da tinta (reforçando preto/grafite/azul escuro profundo).
 * 7. Normaliza a largura máxima para ~400px (proporcional) para tamanho ideal de impressão e armazenamento.
 * 8. Exporta como PNG transparente otimizado.
 */

export interface ProcessSignatureResult {
  file: File
  previewUrl: string
  width: number
  height: number
  processed: boolean
}

/**
 * Processa o arquivo de assinatura via Canvas API.
 * @param file Arquivo selecionado no input
 * @param luminanceThreshold Limite para classificar traço escuro (padrão 195)
 * @param padding Margem ao redor do traço em pixels (padrão 12)
 * @param maxTargetWidth Largura máxima normalizada (padrão 400)
 */
export async function processSignatureImage(
  file: File,
  luminanceThreshold: number = 195,
  padding: number = 12,
  maxTargetWidth: number = 400,
): Promise<ProcessSignatureResult> {
  // Se não for arquivo de imagem legível, retorna o original
  if (!file.type.startsWith('image/')) {
    const previewUrl = URL.createObjectURL(file)
    return {
      file,
      previewUrl,
      width: 0,
      height: 0,
      processed: false,
    }
  }

  // Carrega a imagem a partir do File
  const img = await loadImageFromFile(file)
  const origW = img.naturalWidth || img.width
  const origH = img.naturalHeight || img.height

  if (!origW || !origH) {
    const previewUrl = URL.createObjectURL(file)
    return {
      file,
      previewUrl,
      width: origW,
      height: origH,
      processed: false,
    }
  }

  // Canvas inicial para leitura dos pixels brutos
  const scanCanvas = document.createElement('canvas')
  scanCanvas.width = origW
  scanCanvas.height = origH
  const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true })

  if (!scanCtx) {
    const previewUrl = URL.createObjectURL(file)
    return {
      file,
      previewUrl,
      width: origW,
      height: origH,
      processed: false,
    }
  }

  scanCtx.drawImage(img, 0, 0)
  const imgData = scanCtx.getImageData(0, 0, origW, origH)
  const data = imgData.data

  let minX = origW
  let minY = origH
  let maxX = -1
  let maxY = -1
  let darkPixelCount = 0

  // Varredura para encontrar bounding box dos pixels escuros
  for (let y = 0; y < origH; y++) {
    for (let x = 0; x < origW; x++) {
      const idx = (y * origW + x) * 4
      const a = data[idx + 3]
      if (a < 30) continue // Ignora pixels já muito transparentes

      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      // Luminância padrão ITU-R BT.601
      const lum = 0.299 * r + 0.587 * g + 0.114 * b

      if (lum < luminanceThreshold) {
        darkPixelCount++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  // Se nenhum traço escuro for encontrado (ou menos de 10 pixels), retorna o arquivo original
  if (darkPixelCount < 10 || minX > maxX || minY > maxY) {
    const previewUrl = URL.createObjectURL(file)
    return {
      file,
      previewUrl,
      width: origW,
      height: origH,
      processed: false,
    }
  }

  // Adiciona padding ao bounding box preservando limites da imagem
  const cropX = Math.max(0, minX - padding)
  const cropY = Math.max(0, minY - padding)
  const cropW = Math.min(origW - cropX, maxX - minX + 1 + padding * 2)
  const cropH = Math.min(origH - cropY, maxY - minY + 1 + padding * 2)

  // Recorta a região do traço
  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = cropW
  cropCanvas.height = cropH
  const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true })

  if (!cropCtx) {
    const previewUrl = URL.createObjectURL(file)
    return {
      file,
      previewUrl,
      width: origW,
      height: origH,
      processed: false,
    }
  }

  cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
  const croppedData = cropCtx.getImageData(0, 0, cropW, cropH)
  const cData = croppedData.data

  // Processa transparência e realce de contraste
  // Fundo claro -> transparente
  // Traço escuro -> preto profundo / escurecido
  const softThresholdLow = Math.max(40, luminanceThreshold - 55) // abaixo é tinta pura
  const softThresholdHigh = Math.min(250, luminanceThreshold + 25) // acima é papel limpo

  for (let i = 0; i < cData.length; i += 4) {
    const r = cData[i]
    const g = cData[i + 1]
    const b = cData[i + 2]
    const a = cData[i + 3]

    if (a === 0) continue

    const lum = 0.299 * r + 0.587 * g + 0.114 * b

    if (lum >= softThresholdHigh) {
      // Papel branco / fundo claro -> totalmente transparente
      cData[i + 3] = 0
    } else if (lum <= softThresholdLow) {
      // Traço escuro puro -> reforça para preto/escuro com alpha total
      // Manter um leve tom azul marinho muito escuro ou preto sólido (#111827)
      cData[i] = Math.round(r * 0.3)
      cData[i + 1] = Math.round(g * 0.3)
      cData[i + 2] = Math.round(b * 0.3)
      cData[i + 3] = 255
    } else {
      // Zona de transição antialiasing do traço
      const ratio = (lum - softThresholdLow) / (softThresholdHigh - softThresholdLow)
      // quanto maior a luminância, mais transparente (1 - ratio)
      const newAlpha = Math.round((1 - ratio) * 255)
      cData[i] = Math.round(r * 0.35)
      cData[i + 1] = Math.round(g * 0.35)
      cData[i + 2] = Math.round(b * 0.35)
      cData[i + 3] = Math.min(a, newAlpha)
    }
  }

  cropCtx.putImageData(croppedData, 0, 0)

  // Normalização de largura máxima para ~400px
  let finalW = cropW
  let finalH = cropH

  if (cropW > maxTargetWidth) {
    const scale = maxTargetWidth / cropW
    finalW = Math.round(cropW * scale)
    finalH = Math.round(cropH * scale)
  }

  const finalCanvas = document.createElement('canvas')
  finalCanvas.width = finalW
  finalCanvas.height = finalH
  const finalCtx = finalCanvas.getContext('2d')

  if (!finalCtx) {
    const previewUrl = URL.createObjectURL(file)
    return {
      file,
      previewUrl,
      width: cropW,
      height: cropH,
      processed: false,
    }
  }

  // Desenho com interpolação de alta qualidade
  finalCtx.imageSmoothingEnabled = true
  finalCtx.imageSmoothingQuality = 'high'
  finalCtx.drawImage(cropCanvas, 0, 0, cropW, cropH, 0, 0, finalW, finalH)

  // Exportar como PNG Blob e converter em File
  const blob = await new Promise<Blob | null>((resolve) => {
    finalCanvas.toBlob((b) => resolve(b), 'image/png')
  })

  if (!blob) {
    const previewUrl = URL.createObjectURL(file)
    return {
      file,
      previewUrl,
      width: origW,
      height: origH,
      processed: false,
    }
  }

  const baseName = file.name.replace(/\.[^/.]+$/, '')
  const processedFileName = `${baseName}-assinatura.png`
  const processedFile = new File([blob], processedFileName, {
    type: 'image/png',
    lastModified: Date.now(),
  })

  const previewUrl = URL.createObjectURL(processedFile)

  return {
    file: processedFile,
    previewUrl,
    width: finalW,
    height: finalH,
    processed: true,
  }
}

/**
 * Auxiliar para carregar um File em HTMLImageElement
 */
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
