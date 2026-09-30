import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MessageCircle, Cake, Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export interface AniversarianteFelicitarData {
  nome: string
  whatsapp?: string
  telefone?: string
  tipo?: 'membro' | 'congregado'
  congregacao?: string
}

interface ModalFelicitarAniversarianteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aniversariante: AniversarianteFelicitarData | null
  mensagemPadrao: string
}

export function normalizarNumeroWhatsApp(raw?: string): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }
  if (digits.length < 10) {
    return `5588${digits}`
  }
  return digits
}

export const ModalFelicitarAniversariante: React.FC<ModalFelicitarAniversarianteProps> = ({
  open,
  onOpenChange,
  aniversariante,
  mensagemPadrao,
}) => {
  const { toast } = useToast()
  const [textoEditado, setTextoEditado] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (aniversariante && open) {
      const template = mensagemPadrao || ''
      const textoFinal = template.replace(/\{nome\}/g, aniversariante.nome)
      setTextoEditado(textoFinal)
      setCopiado(false)
    }
  }, [aniversariante, mensagemPadrao, open])

  if (!aniversariante) return null

  const contatoRaw = aniversariante.whatsapp || aniversariante.telefone || ''
  const numeroNormalizado = normalizarNumeroWhatsApp(contatoRaw)
  const temContato = Boolean(numeroNormalizado)

  const handleEnviarWhatsApp = () => {
    if (!temContato) {
      toast({
        variant: 'destructive',
        title: 'Contato não cadastrado',
        description: 'Esta pessoa não possui telefone ou WhatsApp cadastrado no sistema.',
      })
      return
    }

    const link = `https://wa.me/${numeroNormalizado}?text=${encodeURIComponent(textoEditado)}`
    window.open(link, '_blank', 'noopener,noreferrer')
    onOpenChange(false)
  }

  const handleCopiarTexto = () => {
    navigator.clipboard.writeText(textoEditado)
    setCopiado(true)
    toast({
      title: 'Mensagem copiada!',
      description: 'Você pode colar diretamente no WhatsApp ou em outro aplicativo.',
    })
    setTimeout(() => setCopiado(false), 2500)
  }

  const handleRestaurarPadrao = () => {
    const template = mensagemPadrao || ''
    setTextoEditado(template.replace(/\{nome\}/g, aniversariante.nome))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl p-5 sm:p-6">
        <DialogHeader className="text-left space-y-1.5 pb-2 border-b border-[#E6E2D8]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-700 border border-pink-200 flex items-center justify-center font-bold text-xs shrink-0">
              <Cake className="w-4 h-4 text-pink-600" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-serif text-lg sm:text-xl font-bold text-[#1E3A5F] truncate">
                Felicitar {aniversariante.nome}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 truncate">
                {aniversariante.congregacao || 'ADTC Campanário'}
                {contatoRaw ? ` • Contato: ${contatoRaw}` : ' • Sem número cadastrado'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                Personalize a mensagem antes de enviar:
              </label>
              <button
                type="button"
                onClick={handleRestaurarPadrao}
                className="text-[11px] text-[#C9A227] hover:underline font-medium"
              >
                Restaurar texto padrão
              </button>
            </div>
            <Textarea
              value={textoEditado}
              onChange={(e) => setTextoEditado(e.target.value)}
              rows={5}
              placeholder="Digite sua mensagem de parabéns..."
              className="w-full text-xs sm:text-sm bg-slate-50 focus:bg-white border-[#E6E2D8] leading-relaxed resize-y"
            />
            <p className="text-[11px] text-slate-500">
              Você pode editar à vontade, adicionar uma oração ou versículo específico antes de
              abrir o WhatsApp.
            </p>
          </div>

          {!temContato && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <strong>Atenção:</strong> Esta pessoa não possui número de WhatsApp ou telefone
              cadastrado. Você pode copiar a mensagem abaixo para enviar por outro meio.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 pt-3 border-t border-[#E6E2D8] flex-col sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs sm:order-1"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleCopiarTexto}
            className="text-xs sm:order-2 border-[#1E3A5F]/30 text-[#1E3A5F]"
          >
            {copiado ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copiar Mensagem
              </>
            )}
          </Button>

          {temContato && (
            <Button
              type="button"
              onClick={handleEnviarWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold sm:order-3 shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              Enviar pelo WhatsApp
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default ModalFelicitarAniversariante
