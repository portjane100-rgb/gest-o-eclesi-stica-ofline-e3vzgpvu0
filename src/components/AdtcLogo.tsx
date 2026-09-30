import React from 'react'

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string
  alt?: string
}

/**
 * Componente oficial de exibição da Logo da ADTC
 * Círculo com símbolo estilizado da Assembleia de Deus (vela/chama amarela/laranja e fita peixe azul)
 */
import logoOficial from '@/assets/design-sem-nome-3-82164.png'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'

export const ADTC_LOGO_URL = logoOficial

// Tocha/Chama dourada recortada para marca d'água oficial (sem fundo quadrado)
export const ADTC_TOCHA_WATERMARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width="100%" height="100%">
  <defs>
    <linearGradient id="adtcGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F5D061" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#D4AF37" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#AA7C11" stop-opacity="0.85" />
    </linearGradient>
    <linearGradient id="adtcFlameInner" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#FF9E1B" stop-opacity="0.9" />
      <stop offset="60%" stop-color="#FFD700" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#FFF5B8" stop-opacity="0.85" />
    </linearGradient>
  </defs>
  <path d="M 85 220 L 115 220 L 108 270 L 92 270 Z" fill="url(#adtcGoldGrad)" />
  <ellipse cx="100" cy="220" rx="20" ry="6" fill="#D4AF37" />
  <path d="M 76 215 C 76 205, 84 195, 100 195 C 116 195, 124 205, 124 215 C 124 222, 114 228, 100 228 C 86 228, 76 222, 76 215 Z" fill="url(#adtcGoldGrad)" />
  <path d="M 98 198 C 65 190, 48 160, 52 125 C 55 98, 72 75, 78 50 C 82 72, 88 88, 86 102 C 84 114, 76 128, 82 145 C 87 130, 94 116, 92 95 C 96 112, 100 135, 96 158 C 98 140, 104 122, 108 106 C 105 132, 108 165, 98 198 Z" fill="url(#adtcGoldGrad)" />
  <path d="M 102 198 C 135 190, 152 160, 148 125 C 145 98, 128 75, 122 50 C 118 72, 112 88, 114 102 C 116 114, 124 128, 118 145 C 113 130, 106 116, 108 95 C 104 112, 100 135, 104 158 C 102 140, 96 122, 92 106 C 95 132, 92 165, 102 198 Z" fill="url(#adtcGoldGrad)" />
  <path d="M 100 195 C 88 175, 82 145, 88 118 C 92 100, 98 72, 100 18 C 102 72, 108 100, 112 118 C 118 145, 112 175, 100 195 Z" fill="url(#adtcFlameInner)" />
  <path d="M 100 180 C 93 162, 90 140, 94 120 C 97 106, 100 85, 100 50 C 100 85, 103 106, 106 120 C 110 140, 107 162, 100 180 Z" fill="#FFF9E0" opacity="0.9" />
</svg>`

export const ADTC_TOCHA_WATERMARK_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(ADTC_TOCHA_WATERMARK_SVG)}`

export const AdtcLogo: React.FC<LogoProps> = ({ className = 'w-10 h-10', alt, src, ...props }) => {
  const { config } = useChurchConfig()
  const displaySrc = src || config.logoUrl || logoOficial
  const displayAlt = alt || `Logo ${config.nomeIgreja || 'da Igreja'}`

  return (
    <img
      src={displaySrc}
      alt={displayAlt}
      onError={(e) => {
        // Fallback gracioso se a URL customizada falhar
        if ((e.target as HTMLImageElement).src !== logoOficial) {
          ;(e.target as HTMLImageElement).src = logoOficial
        }
      }}
      className={`rounded-full object-cover shadow-xs border border-white/20 ${className}`}
      {...props}
    />
  )
}

export default AdtcLogo
