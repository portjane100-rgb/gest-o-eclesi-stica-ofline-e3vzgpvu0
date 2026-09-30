import React, { useState } from 'react'
import type { EscalaSemanaItem, EscalaSemanaDia } from '@/types/adtc'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatarDataBr } from '@/lib/utils'
import {
  Calendar,
  Clock,
  User,
  Baby,
  Users,
  Download,
  Copy,
  Check,
  Printer,
  ChevronDown,
  ChevronUp,
  Camera,
  X,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  imprimirOuBaixarPdfEscalaSemana,
  formatarTextoParaCompartilhar,
} from '@/lib/escalaSemanaUtils'
import { useToast } from '@/hooks/use-toast'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'

interface VisualizadorEscalaSemanaProps {
  semana: EscalaSemanaItem
  showActions?: boolean
  initialExpanded?: boolean
}

export const VisualizadorEscalaSemana: React.FC<VisualizadorEscalaSemanaProps> = ({
  semana,
  showActions = true,
  initialExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(initialExpanded)
  const [fotoModalAberta, setFotoModalAberta] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const { toast } = useToast()
  const { config } = useChurchConfig()

  const churchIdentity = {
    nomeIgreja: config.nomeIgreja,
    subtituloIgreja: config.subtituloIgreja,
    denominacao: config.denominacao,
    enderecoIgreja: config.enderecoIgreja,
    cidadeUf: config.cidadeUf,
    nomePastor: config.nomePastor,
    siglaIgreja: config.siglaIgreja,
    logoUrl: config.logoUrl,
  }

  const handleDownloadPdf = async () => {
    const ok = await imprimirOuBaixarPdfEscalaSemana(semana, churchIdentity)
    if (!ok) {
      toast({
        variant: 'destructive',
        title: 'Bloqueio de pop-up',
        description: 'Por favor, permita pop-ups para gerar o documento PDF.',
      })
    }
  }

  const handleCopyText = async () => {
    try {
      const texto = formatarTextoParaCompartilhar(semana, churchIdentity)
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
      toast({
        title: 'Texto da escala copiado!',
        description: 'Texto formatado copiado com sucesso para a área de transferência.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o texto automaticamente.',
      })
    }
  }

  return (
    <Card className="border-2 border-[#1E3A5F]/20 bg-white shadow-md rounded-2xl overflow-hidden transition-all duration-300">
      {/* Header do Card */}
      <div className="bg-[#1E3A5F] text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-[#C9A227]">
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold uppercase text-[10px] tracking-wider px-2.5 py-0.5">
              Escala Oficial da Semana
            </Badge>
            {semana.ativa && (
              <Badge className="bg-emerald-600 text-white font-medium text-[10px] px-2 py-0.5">
                Em Vigor
              </Badge>
            )}
          </div>
          <h2 className="font-serif text-lg sm:text-2xl font-bold text-white tracking-wide">
            {semana.titulo}
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C9A227]" />
            Período: {formatarDataBr(semana.data_inicio)} a {formatarDataBr(semana.data_fim)}
          </p>
        </div>

        {showActions && (
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <Button
              onClick={handleDownloadPdf}
              className="bg-[#C9A227] hover:bg-[#B08E1E] text-[#1E3A5F] font-bold text-xs sm:text-sm shadow-sm transition hover:scale-105 active:scale-95"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Baixar em PDF
            </Button>
            <Button
              onClick={handleCopyText}
              variant="outline"
              className={`text-xs sm:text-sm border-white/40 text-white hover:bg-white/10 transition ${
                copiado ? 'bg-emerald-600/30 border-emerald-400 text-emerald-100' : ''
              }`}
            >
              {copiado ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-emerald-300" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1.5" />
                  Copiar Texto
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
              className="text-white hover:bg-white/10"
              title={expanded ? 'Recolher detalhes' : 'Expandir detalhes'}
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </div>
        )}
      </div>

      {/* Conteúdo Expandido dos 7 Dias */}
      {expanded && (
        <CardContent className="p-5 sm:p-6 space-y-5 bg-[#FAF9F6]">
          {semana.observacoes && (
            <div className="p-3 sm:p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
              <strong className="text-amber-950 font-bold">Observações Gerais:</strong>{' '}
              {semana.observacoes}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 sm:gap-4">
            {(semana.dias || []).map((diaItem: EscalaSemanaDia, idx: number) => {
              const atividadesValidas = (diaItem.atividades || []).filter(
                (a) => a && a.trim().length > 0,
              )
              const hasObreiros = diaItem.obreiros_escalados?.trim()
              const hasSalinhas = diaItem.professoras_salinhas?.trim()
              const hasRecepcao = diaItem.recepcao?.trim()

              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-[#E6E2D8] shadow-xs overflow-hidden flex flex-col justify-between hover:border-[#1E3A5F]/40 transition"
                >
                  <div>
                    {/* Header do Dia */}
                    <div className="bg-[#1E3A5F] text-white px-3 py-2 flex items-center justify-between">
                      <span className="font-serif font-bold text-xs uppercase tracking-wider">
                        {diaItem.dia.split('-')[0]}
                      </span>
                      {diaItem.data && (
                        <span className="text-[10px] bg-[#C9A227] text-[#1E3A5F] font-bold px-1.5 py-0.5 rounded">
                          {diaItem.data.slice(0, 5)}
                        </span>
                      )}
                    </div>

                    {/* Atividades */}
                    <div className="p-3 space-y-2 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C6D15] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Atividades
                      </span>
                      {atividadesValidas.length > 0 ? (
                        <ul className="space-y-1.5">
                          {atividadesValidas.map((ativ, aIdx) => (
                            <li
                              key={aIdx}
                              className="text-slate-800 font-medium leading-snug pl-2 border-l-2 border-[#C9A227]"
                            >
                              {ativ}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">Nenhuma atividade.</p>
                      )}
                    </div>
                  </div>

                  {/* Designações do Dia */}
                  {(hasObreiros || hasSalinhas || hasRecepcao) && (
                    <div className="p-2.5 bg-[#F7F5F0] border-t border-[#E6E2D8] space-y-1.5 text-[11px]">
                      {hasObreiros && (
                        <div>
                          <span className="font-bold text-[#1E3A5F] flex items-center gap-1">
                            <User className="w-3 h-3 text-[#C9A227]" />
                            Obreiros:
                          </span>
                          <p className="text-slate-700 pl-4 font-medium">
                            {diaItem.obreiros_escalados}
                          </p>
                        </div>
                      )}

                      {hasSalinhas && (
                        <div>
                          <span className="font-bold text-[#1E3A5F] flex items-center gap-1">
                            <Baby className="w-3 h-3 text-[#C9A227]" />
                            Salinhas:
                          </span>
                          <p className="text-slate-700 pl-4 font-medium">
                            {diaItem.professoras_salinhas}
                          </p>
                        </div>
                      )}

                      {hasRecepcao && (
                        <div>
                          <span className="font-bold text-[#1E3A5F] flex items-center gap-1">
                            <Users className="w-3 h-3 text-[#C9A227]" />
                            Recepção:
                          </span>
                          <p className="text-slate-700 pl-4 font-medium">{diaItem.recepcao}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* GALERIA DE FOTOS DO CULTO DESTA SEMANA */}
          {semana.fotos && semana.fotos.length > 0 && (
            <div className="pt-4 border-t border-[#E6E2D8] space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#C9A227]" />
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#1E3A5F]">
                  Registros Fotográficos dos Cultos da Semana
                </h3>
                <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-[10px]">
                  {semana.fotos.length} foto(s)
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {semana.fotos.map((foto, idx) => {
                  const url = pb.files.getURL(semana, foto)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFotoModalAberta(url)}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-[#E6E2D8] bg-slate-100 hover:shadow-md transition text-left focus:outline-hidden"
                    >
                      <img
                        src={url}
                        alt={`Culto da semana - foto ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}

      {/* Modal para Visualização em Tamanho Maior da Foto */}
      <Dialog open={!!fotoModalAberta} onOpenChange={(open) => !open && setFotoModalAberta(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/95 border-0 shadow-2xl rounded-2xl flex items-center justify-center">
          {fotoModalAberta && (
            <div className="relative w-full flex items-center justify-center max-h-[85vh]">
              <img
                src={fotoModalAberta}
                alt="Foto do culto ampliada"
                className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
              />
              <button
                type="button"
                onClick={() => setFotoModalAberta(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default VisualizadorEscalaSemana
