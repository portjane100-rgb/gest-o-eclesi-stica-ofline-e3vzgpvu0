import React, { useState } from 'react'
import { Edit2, Check, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import type { Configuracao } from '@/types/adtc'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface InlineTextProps {
  configKey: string
  defaultText: string
  isAdmin: boolean
  className?: string
  isTextarea?: boolean
  rows?: number
  label?: string
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div' | 'blockquote'
  onSave?: (newValue: string) => void
  currentValue?: string
}

export const InlineText: React.FC<InlineTextProps> = ({
  configKey,
  defaultText,
  isAdmin,
  className,
  isTextarea = false,
  rows = 2,
  label,
  tag = 'span',
  onSave,
  currentValue,
}) => {
  const { toast } = useToast()
  const displayValue = currentValue !== undefined ? currentValue : defaultText
  const [isEditing, setIsEditing] = useState(false)
  const [val, setVal] = useState(displayValue)
  const [saving, setSaving] = useState(false)

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setVal(displayValue)
    setIsEditing(true)
  }

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setVal(displayValue)
    setIsEditing(false)
  }

  const handleSave = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setSaving(true)
    try {
      const trimmed = val.trim()
      try {
        const existing = await pb
          .collection('configuracoes')
          .getFirstListItem<Configuracao>(`chave='${configKey}'`)
        await pb.collection('configuracoes').update(existing.id, { valor: trimmed })
      } catch {
        await pb.collection('configuracoes').create({ chave: configKey, valor: trimmed })
      }
      if (onSave) {
        onSave(trimmed)
      }
      setIsEditing(false)
      toast({
        title: 'Texto atualizado!',
        description: label
          ? `"${label}" foi atualizado com sucesso.`
          : 'Alteração salva com sucesso.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err?.message || 'Não foi possível persistir a alteração.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (isEditing) {
    return (
      <span
        className="inline-flex flex-col gap-1.5 p-2 rounded-lg bg-white/95 border-2 border-[#C9A227] shadow-lg text-slate-800 text-left z-30 relative my-1 min-w-[240px] max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {label && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E3A5F]">
            {label}
          </span>
        )}
        {isTextarea ? (
          <Textarea
            value={val}
            onChange={(e) => setVal(e.target.value)}
            rows={rows}
            className="text-xs sm:text-sm bg-white text-slate-900 border-[#E6E2D8] w-full"
            autoFocus
          />
        ) : (
          <Input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="text-xs sm:text-sm bg-white text-slate-900 border-[#E6E2D8] h-8 w-full"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
          />
        )}
        <span className="flex items-center justify-end gap-1.5 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={saving}
            className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-7 px-2.5 text-xs bg-[#1E3A5F] hover:bg-[#16304F] text-white font-semibold"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Check className="w-3.5 h-3.5 mr-1" />
            )}
            Salvar
          </Button>
        </span>
      </span>
    )
  }

  const Tag = tag as any

  return (
    <Tag className={cn('relative group inline-block', className)}>
      <span>{displayValue}</span>
      {isAdmin && (
        <button
          onClick={handleStartEdit}
          type="button"
          aria-label={`Editar texto ${label || ''}`}
          title={label ? `Editar "${label}"` : 'Editar texto inline'}
          className="inline-flex items-center justify-center ml-1.5 p-1 rounded-md bg-[#C9A227]/20 hover:bg-[#C9A227] text-[#1E3A5F] transition-all opacity-80 group-hover:opacity-100 align-middle shadow-2xs hover:scale-105"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      )}
    </Tag>
  )
}

export default InlineText
