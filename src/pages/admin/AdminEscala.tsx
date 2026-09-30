import React, { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import type { EscalaSemanaItem, EscalaSemanaDia } from '@/types/adtc'
import useRealtime from '@/hooks/use-realtime'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
  Share2,
  Printer,
  Sparkles,
  CheckCircle2,
  FileText,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import { FormEscalaSemana } from '@/components/FormEscalaSemana'
import { VisualizadorEscalaSemana } from '@/components/VisualizadorEscalaSemana'
import { imprimirOuBaixarPdfEscalaSemana, compartilharEscalaSemana } from '@/lib/escalaSemanaUtils'
import { toUtcMiddayIso } from '@/lib/utils'

export const AdminEscala: React.FC = () => {
  const { toast } = useToast()
  const { config } = useChurchConfig()

  // Estado da Escala da Semana (Formato unificado)
  const [semanas, setSemanas] = useState<EscalaSemanaItem[]>([])
  const [loadingSemanas, setLoadingSemanas] = useState(true)
  const [isSemanaModalOpen, setIsSemanaModalOpen] = useState(false)
  const [editingSemana, setEditingSemana] = useState<EscalaSemanaItem | null>(null)
  const [deletingSemanaId, setDeletingSemanaId] = useState<string | null>(null)
  const [isSubmittingSemana, setIsSubmittingSemana] = useState(false)

  // --------------------------------------------------------------------------
  // Carregamento de Dados
  // --------------------------------------------------------------------------
  const loadSemanas = async () => {
    try {
      const records = await pb.collection('escala_semana').getFullList<EscalaSemanaItem>({
        sort: '-data_inicio',
      })
      setSemanas(records)
    } catch (err) {
      console.error('Erro ao buscar escalas semanais:', err)
    } finally {
      setLoadingSemanas(false)
    }
  }

  useEffect(() => {
    loadSemanas()
  }, [])

  useRealtime<EscalaSemanaItem>('escala_semana', () => {
    loadSemanas()
  })

  // --------------------------------------------------------------------------
  // CRUD Escala da Semana
  // --------------------------------------------------------------------------
  const handleOpenCreateSemana = () => {
    setEditingSemana(null)
    setIsSemanaModalOpen(true)
  }

  const handleOpenEditSemana = (item: EscalaSemanaItem) => {
    setEditingSemana(item)
    setIsSemanaModalOpen(true)
  }

  const handleSaveSemana = async (
    formData: {
      titulo: string
      data_inicio: string
      data_fim: string
      dias: EscalaSemanaDia[]
      observacoes?: string
      ativa?: boolean
    },
    novasFotos: File[] = [],
    fotosMantidas: string[] = [],
  ) => {
    setIsSubmittingSemana(true)
    try {
      const data = new FormData()
      data.append('titulo', formData.titulo.trim())
      data.append('data_inicio', toUtcMiddayIso(formData.data_inicio))
      data.append('data_fim', toUtcMiddayIso(formData.data_fim))
      data.append('dias', JSON.stringify(formData.dias))
      data.append('observacoes', formData.observacoes?.trim() || '')
      data.append('ativa', String(formData.ativa ?? true))

      if (editingSemana) {
        // No PocketBase para campos file múltiplos, fotos existentes não incluídas em 'fotos' ou via fotos- são removidas.
        // Adicionamos os arquivos novos:
        for (const file of novasFotos) {
          data.append('fotos', file)
        }

        // Se fotos foram removidas em relação ao editingSemana.fotos:
        const fotosOriginais = editingSemana.fotos || []
        const fotosParaRemover = fotosOriginais.filter((f) => !fotosMantidas.includes(f))
        for (const f of fotosParaRemover) {
          data.append('fotos-', f)
        }

        await pb.collection('escala_semana').update(editingSemana.id, data)
        toast({
          title: 'Escala da semana atualizada!',
          description: 'As alterações e fotos foram salvas com sucesso no banco de dados.',
        })
      } else {
        for (const file of novasFotos) {
          data.append('fotos', file)
        }

        await pb.collection('escala_semana').create(data)
        toast({
          title: 'Nova escala da semana criada!',
          description:
            'A semana foi salva com sucesso e está disponível para download e compartilhamento.',
        })
      }

      setIsSemanaModalOpen(false)
      setEditingSemana(null)
      await loadSemanas()
    } catch (err: any) {
      console.error('Erro ao salvar escala da semana:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar escala da semana',
        description: err?.message || 'Falha na comunicação com o servidor.',
      })
    } finally {
      setIsSubmittingSemana(false)
    }
  }

  const handleDeleteSemanaConfirm = async () => {
    if (!deletingSemanaId) return
    try {
      await pb.collection('escala_semana').delete(deletingSemanaId)
      toast({ title: 'Escala da semana excluída com sucesso.' })
      setDeletingSemanaId(null)
      await loadSemanas()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir semana',
        description: err?.message,
      })
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Topo / Header Administrativo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-2xl font-bold text-[#1E3A5F]">
              Gestão da Escala da Semana
            </h2>
            <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-xs">
              {config.siglaIgreja || config.nomeIgreja || 'Igreja'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#5A5A5A] mt-1">
            Geração da Escala da Semana oficial com 7 dias, atividades, obreiros e designações
            ministeriais.
          </p>
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <Button
            onClick={handleOpenCreateSemana}
            className="w-full sm:w-auto bg-[#1E3A5F] hover:bg-[#16304F] text-white flex items-center justify-center gap-2 shadow-sm h-10 sm:h-9"
          >
            <Plus className="w-4 h-4" />
            Nova Escala da Semana
          </Button>
        </div>
      </div>

      {/* Conteúdo: Escala da Semana */}
      <div className="space-y-6">
        {/* Instruções Rápidas */}
        <div className="bg-gradient-to-r from-blue-50 to-amber-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
              Como funciona a Escala da Semana
            </span>
            <p className="text-xs text-slate-700 leading-relaxed">
              Preencha os 7 dias da semana (Segunda a Domingo) com a lista livre de atividades com
              horário e as designações (Obreiros, Salinhas, Recepção). Após salvar, clique em{' '}
              <strong>"Gerar Documento"</strong> para baixar o PDF timbrado oficial com a logo da
              igreja ou compartilhar diretamente no WhatsApp da igreja.
            </p>
          </div>
          <Button
            onClick={handleOpenCreateSemana}
            className="w-full sm:w-auto bg-[#C9A227] hover:bg-[#B08E1E] text-[#1E3A5F] font-bold text-xs whitespace-nowrap h-10 sm:h-9"
          >
            <Plus className="w-4 h-4 mr-1" />
            Criar Nova Semana
          </Button>
        </div>
        {loadingSemanas ? (
          <div className="p-12 text-center text-[#5A5A5A] flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
            <p className="text-xs">Carregando escalas da semana...</p>
          </div>
        ) : semanas.length > 0 ? (
          <div className="space-y-6">
            {semanas.map((semanaItem) => (
              <div key={semanaItem.id} className="space-y-3">
                {/* Barra de Ações Administrativas da Semana */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                  <span className="text-xs font-bold text-[#1E3A5F] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Cadastrada em {new Date(semanaItem.created).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      onClick={async () => {
                        await imprimirOuBaixarPdfEscalaSemana(semanaItem, {
                          nomeIgreja: config.nomeIgreja,
                          subtituloIgreja: config.subtituloIgreja,
                          denominacao: config.denominacao,
                          enderecoIgreja: config.enderecoIgreja,
                          cidadeUf: config.cidadeUf,
                          nomePastor: config.nomePastor,
                          siglaIgreja: config.siglaIgreja,
                        })
                      }}
                      className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs h-9 justify-center"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const res = await compartilharEscalaSemana(semanaItem, () => {
                          toast({
                            title: 'Texto copiado!',
                            description: 'Pronto para enviar no WhatsApp.',
                          })
                        })
                        if (res === 'shared') toast({ title: 'Compartilhado com sucesso!' })
                      }}
                      className="text-xs border-[#C9A227] text-[#8C6D15] hover:bg-[#C9A227]/10 h-9 justify-center"
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditSemana(semanaItem)}
                      className="text-xs border-[#1E3A5F] text-[#1E3A5F] hover:bg-blue-50 h-9 justify-center font-bold"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingSemanaId(semanaItem.id)}
                      className="text-xs text-rose-600 hover:bg-rose-50 h-9 justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>

                {/* Componente Visualizador com os 7 Dias */}
                <VisualizadorEscalaSemana
                  semana={semanaItem}
                  showActions={false}
                  initialExpanded={true}
                />
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-[#E6E2D8] bg-white p-12 text-center text-[#5A5A5A] rounded-2xl space-y-4">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <div>
              <p className="font-semibold text-slate-800">
                Nenhuma escala semanal cadastrada ainda.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Crie a primeira escala da semana para gerar o documento oficial com os 7 dias.
              </p>
            </div>
            <Button
              onClick={handleOpenCreateSemana}
              className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Criar Primeira Escala da Semana
            </Button>
          </Card>
        )}
      </div>

      {/* =========================================================================
          MODAL: FORMULÁRIO ESCALA DA SEMANA
      ========================================================================= */}
      <FormEscalaSemana
        isOpen={isSemanaModalOpen}
        onClose={() => {
          setIsSemanaModalOpen(false)
          setEditingSemana(null)
        }}
        onSave={handleSaveSemana}
        editingItem={editingSemana}
        isSubmitting={isSubmittingSemana}
      />

      {/* =========================================================================
          MODAL: EXCLUIR ESCALA DA SEMANA
      ========================================================================= */}
      <Dialog open={!!deletingSemanaId} onOpenChange={(open) => !open && setDeletingSemanaId(null)}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-serif text-lg text-[#1E3A5F]">
              Excluir Escala da Semana
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Deseja realmente remover esta escala semanal? As informações dos 7 dias serão
              excluídas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingSemanaId(null)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleDeleteSemanaConfirm} className="bg-rose-600 text-white flex-1">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminEscala
