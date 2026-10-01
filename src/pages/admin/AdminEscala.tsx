import React, { useState, useEffect } from 'react'
import {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  fileToDataUrl,
  getChurchSettings,
} from '@/lib/dataClient'
import { isOfflineOnly } from '@/lib/offlineMode'
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
  Copy,
  Printer,
  Sparkles,
  CheckCircle2,
  FileText,
  Check,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import { FormEscalaSemana } from '@/components/FormEscalaSemana'
import { VisualizadorEscalaSemana } from '@/components/VisualizadorEscalaSemana'
import {
  imprimirOuBaixarPdfEscalaSemana,
  formatarTextoParaCompartilhar,
} from '@/lib/escalaSemanaUtils'
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
  const [copiedSemanaId, setCopiedSemanaId] = useState<string | null>(null)

  const handleCopyText = async (semanaItem: EscalaSemanaItem) => {
    try {
      const texto = formatarTextoParaCompartilhar(semanaItem, {
        nomeIgreja: config.nomeIgreja,
        subtituloIgreja: config.subtituloIgreja,
        denominacao: config.denominacao,
        enderecoIgreja: config.enderecoIgreja,
        cidadeUf: config.cidadeUf,
        nomePastor: config.nomePastor,
        siglaIgreja: config.siglaIgreja,
      })
      await navigator.clipboard.writeText(texto)
      setCopiedSemanaId(semanaItem.id)
      setTimeout(() => setCopiedSemanaId(null), 2500)
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

  // --------------------------------------------------------------------------
  // Carregamento de Dados
  // --------------------------------------------------------------------------
  const loadSemanas = async () => {
    try {
      const records = await getItems<EscalaSemanaItem>('escala_semana', {
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

  // Suporte a ?novo=true vindo do Dashboard
  useEffect(() => {
    if (typeof window === 'undefined') return
    const fullHref = window.location.href
    const searchIdx = fullHref.indexOf('?')
    const queryString = searchIdx !== -1 ? fullHref.substring(searchIdx) : window.location.search
    const params = new URLSearchParams(queryString)
    if (params.get('novo') === 'true') {
      handleOpenCreateSemana()
    }
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

      if (isOfflineOnly()) {
        const novasBase64: string[] = []
        for (const file of novasFotos) {
          try {
            novasBase64.push(await fileToDataUrl(file))
          } catch (e) {
            console.warn('Falha ao converter foto da escala:', e)
          }
        }
        const fotosFinais = [...fotosMantidas, ...novasBase64]
        const payload: Record<string, any> = {
          titulo: formData.titulo.trim(),
          data_inicio: toUtcMiddayIso(formData.data_inicio),
          data_fim: toUtcMiddayIso(formData.data_fim),
          dias: formData.dias,
          observacoes: formData.observacoes?.trim() || '',
          ativa: formData.ativa ?? true,
          fotos: fotosFinais,
        }

        if (editingSemana) {
          await updateItem('escala_semana', editingSemana.id, payload)
          toast({
            title: 'Escala da semana atualizada!',
            description: 'As alterações foram salvas com sucesso no banco local.',
          })
        } else {
          await createItem('escala_semana', payload)
          toast({
            title: 'Nova escala da semana criada!',
            description: 'A semana foi salva com sucesso no banco local.',
          })
        }
      } else {
        if (editingSemana) {
          for (const file of novasFotos) {
            data.append('fotos', file)
          }
          const fotosOriginais = editingSemana.fotos || []
          const fotosParaRemover = fotosOriginais.filter((f) => !fotosMantidas.includes(f))
          for (const f of fotosParaRemover) {
            data.append('fotos-', f)
          }

          await updateItem('escala_semana', editingSemana.id, data)
          toast({
            title: 'Escala da semana atualizada!',
            description: 'As alterações e fotos foram salvas com sucesso no banco de dados.',
          })
        } else {
          for (const file of novasFotos) {
            data.append('fotos', file)
          }

          await createItem('escala_semana', data)
          toast({
            title: 'Nova escala da semana criada!',
            description:
              'A semana foi salva com sucesso e está disponível para download e compartilhamento.',
          })
        }
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
      await deleteItem('escala_semana', deletingSemanaId)
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
              horário e as designações (Obreiros, Salinhas, Recepção). Após salvar, você pode{' '}
              <strong>"Baixar em PDF"</strong> timbrado oficial com os dados da igreja ou usar{' '}
              <strong>"Copiar Texto"</strong> para enviar onde preferir.
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
                        const freshSettings = await getChurchSettings()
                        await imprimirOuBaixarPdfEscalaSemana(semanaItem, {
                          nomeIgreja: freshSettings.nomeIgreja || config.nomeIgreja,
                          subtituloIgreja: freshSettings.subtituloIgreja || config.subtituloIgreja,
                          denominacao: freshSettings.denominacao || config.denominacao,
                          enderecoIgreja: freshSettings.enderecoIgreja || config.enderecoIgreja,
                          cidadeUf: freshSettings.cidadeUf || config.cidadeUf,
                          nomePastor: freshSettings.nomePastor || config.nomePastor,
                          siglaIgreja: freshSettings.siglaIgreja || config.siglaIgreja,
                          logoUrl: freshSettings.logoUrl || config.logoUrl,
                        })
                      }}
                      className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs h-9 justify-center"
                      title="Gerar e Baixar em PDF timbrado oficial"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" />
                      Baixar em PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyText(semanaItem)}
                      className={`text-xs h-9 justify-center font-medium ${
                        copiedSemanaId === semanaItem.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-[#C9A227] text-[#8C6D15] hover:bg-[#C9A227]/10'
                      }`}
                      title="Copiar texto formatado da escala para a área de transferência"
                    >
                      {copiedSemanaId === semanaItem.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copiar Texto
                        </>
                      )}
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
