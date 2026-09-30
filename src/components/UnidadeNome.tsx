import React from 'react'
import { cn } from '@/lib/utils'

interface UnidadeBadgeProps {
  nome: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const UnidadeNome: React.FC<UnidadeBadgeProps> = ({ nome, className, size = 'md' }) => {
  const isSede = nome.toLowerCase().includes('sede')
  const isCasinhas = nome.toLowerCase().includes('casinhas')
  const isAlto = nome.toLowerCase().includes('alto')
  const isVila = nome.toLowerCase().includes('pescadores') || nome.toLowerCase().includes('vila')

  const sizeClasses = {
    sm: 'text-xs tracking-wide',
    md: 'text-sm sm:text-base font-serif',
    lg: 'text-lg sm:text-xl font-serif',
  }[size]

  return (
    <span
      className={cn(
        'italic font-bold tracking-wide transition-all inline-block',
        isSede && 'text-[#1E3A5F] drop-shadow-xs',
        isCasinhas && 'text-emerald-800 drop-shadow-xs',
        isAlto && 'text-amber-800 drop-shadow-xs',
        isVila && 'text-sky-800 drop-shadow-xs',
        !isSede && !isCasinhas && !isAlto && !isVila && 'text-[#1E3A5F]',
        sizeClasses,
        className,
      )}
    >
      {nome}
    </span>
  )
}

export default UnidadeNome
