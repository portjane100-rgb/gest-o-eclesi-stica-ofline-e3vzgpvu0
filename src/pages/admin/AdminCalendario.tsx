import React, { useState, useEffect } from 'react'
import { getItems, createItem, updateItem, deleteItem, getChurchSettings } from '@/lib/dataClient'
import type { CalendarioEvento } from '@/types/adtc'
import useRealtime from '@/hooks/use-realtime'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  CalendarDays,
  Printer,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import { extrairYmd, formatarPeriodoEvento, toUtcMiddayIso } from '@/lib/utils'
import { imprimirOuBaixarPdfCalendario } from '@/lib/calendarioPdfUtils'

export const AdminCalendario: React.FC = () => {
  const [eventos, setEventos] = useState<CalendarioEvento[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>('Todos')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CalendarioEvento | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const { config } = useChurchConfig()

  // Form State
  const [titulo, setTitulo] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataTermino, setDataTermino] = useState('')
  const [departamento, setDepartamento] = useState('Geral')
  const [descricao, setDescricao] = useState('')

  const departamentosOpcoes = [
    'Geral',
    'Mocidade',
    'Senhoras',
    'Infantil',
    'Missões & Evangelismo',
    'Família',
    'Doutrina',
    'Música',
  ]

  const loadEventos = async () => {
    try {
      const records = await getItems<CalendarioEvento>('calendario', {
        sort: 'data_inicio',
      })
      setEventos(records)
    } catch (err) {
      console.error('Erro ao buscar eventos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEventos()
  }, [])

  useRealtime<CalendarioEvento>('calendario', () => {
    loadEventos()
  })

  const resetForm = () => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    setTitulo('')
    setDataInicio(today)
    setDataTermino('')
    setDepartamento('Geral')
    setDescricao('')
    setErrors({})
    setEditingItem(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: CalendarioEvento) => {
    setEditingItem(item)
    setTitulo(item.titulo || '')
    setDataInicio(extrairYmd(item.data_inicio))
    const fimVal = item.data_termino || (item as any).data_fim
    setDataTermino(extrairYmd(fimVal))
    setDepartamento(item.departamento || 'Geral')
    setDescricao(item.descricao || '')
    setErrors({})
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!titulo.trim()) newErrors.titulo = 'O título do evento é obrigatório.'
    if (!dataInicio) newErrors.dataInicio = 'A data de início é obrigatória.'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const payload: Record<string, any> = {
        titulo: titulo.trim(),
        data_inicio: toUtcMiddayIso(dataInicio),
        departamento,
        descricao: descricao.trim(),
        data_termino: dataTermino ? toUtcMiddayIso(dataTermino) : '',
      }

      if (editingItem) {
        await updateItem('calendario', editingItem.id, payload)
        toast({ title: 'Evento atualizado com sucesso!' })
      } else {
        await createItem('calendario', payload)
        toast({ title: 'Evento cadastrado no calendário!' })
      }

      setIsModalOpen(false)
      resetForm()
      loadEventos()
    } catch (err: any) {
      if (err?.data?.data) {
        const backendErrors: Record<string, string> = {}
        for (const [key, val] of Object.entries(err.data.data)) {
          backendErrors[key] = (val as any)?.message || 'Inválido'
        }
        setErrors(backendErrors)
      } else {
        toast({ variant: 'destructive', title: 'Erro ao salvar evento', description: err?.message })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGerarPdf = async () => {
    setIsGeneratingPdf(true)
    try {
      const freshSettings = await getChurchSettings()
      const eventosFiltrados =
        filtroDepartamento === 'Todos'
          ? eventos
          : eventos.filter((e) => e.departamento === filtroDepartamento)

      const ok = await imprimirOuBaixarPdfCalendario(
        eventosFiltrados,
        {
          nomeIgreja: freshSettings.nomeIgreja || config.nomeIgreja,
          denominacao: freshSettings.denominacao || config.denominacao,
          subtituloIgreja: freshSettings.subtituloIgreja || config.subtituloIgreja,
          enderecoIgreja: freshSettings.enderecoIgreja || config.enderecoIgreja,
          cidadeUf: freshSettings.cidadeUf || config.cidadeUf,
          siglaIgreja: freshSettings.siglaIgreja || config.siglaIgreja,
          logoUrl: freshSettings.logoUrl || config.logoUrl,
        },
        {
          departamentoFiltro: filtroDepartamento,
        },
      )

      if (!ok) {
        toast({
          variant: 'destructive',
          title: 'Bloqueio de pop-up',
          description: 'Permita pop-ups no navegador para gerar e baixar a planilha em PDF.',
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar PDF',
        description: err?.message || 'Falha ao processar o calendário em PDF.',
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    try {
      await deleteItem('calendario', deletingId)
      toast({ title: 'Evento excluído do calendário.' })
      setIsDeleteModalOpen(false)
      setDeletingId(null)
      loadEventos()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir evento', description: err?.message })
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-2xl font-bold text-[#1E3A5F]">
              Gestão do Calendário de Festas
            </h2>
            <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-xs">
              {config.siglaIgreja || config.nomeIgreja || 'Igreja'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#5A5A5A] mt-1">
            Planilha de datas e festividades oficiais com geração de PDF timbrado dinâmico.
          </p>
        </div>

        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
          <Button
            onClick={handleGerarPdf}
            disabled={isGeneratingPdf || eventos.length === 0}
            className="w-full sm:w-auto bg-[#C9A227] hover:bg-[#B08E1E] text-[#1E3A5F] font-bold text-xs h-10 sm:h-9 flex items-center justify-center gap-1.5 shadow-sm"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            Gerar Planilha em PDF
          </Button>

          <Button
            onClick={handleOpenCreate}
            className="w-full sm:w-auto bg-[#1E3A5F] hover:bg-[#16304F] text-white flex items-center justify-center gap-2 text-xs h-10 sm:h-9 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Data / Festa
          </Button>
        </div>
      </div>

      {/* Caixa informativa com padrão visual timbrado */}
      <div className="bg-gradient-to-r from-blue-50 to-amber-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
            Planilha de Datas & Festas Eclesiásticas
          </span>
          <p className="text-xs text-slate-700 leading-relaxed">
            Cadastre as datas de congressos, aniversários de departamentos, campanhas e celebrações.
            Após registrar, clique em <strong>"Gerar Planilha em PDF"</strong> para emitir o
            documento timbrado com cabeçalho oficial e dados da igreja configurados.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Filtrar:</span>
          <select
            value={filtroDepartamento}
            onChange={(e) => setFiltroDepartamento(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-[#E6E2D8] bg-white text-xs text-[#1E3A5F] font-medium"
          >
            <option value="Todos">Todos os Departamentos</option>
            {departamentosOpcoes.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Planilha de Datas & Festas */}
      <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1E3A5F] text-white uppercase text-[10px] sm:text-xs tracking-wider">
              <tr>
                <th className="p-3 sm:p-4 w-12 text-center">Nº</th>
                <th className="p-3 sm:p-4">Período / Data</th>
                <th className="p-3 sm:p-4">Evento / Festividade</th>
                <th className="p-3 sm:p-4">Departamento</th>
                <th className="p-3 sm:p-4">Descrição / Programação</th>
                <th className="p-3 sm:p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2D8]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-[#5A5A5A]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
                      <span className="text-xs">Carregando datas e festividades...</span>
                    </div>
                  </td>
                </tr>
              ) : (
                (() => {
                  const lista =
                    filtroDepartamento === 'Todos'
                      ? eventos
                      : eventos.filter((e) => e.departamento === filtroDepartamento)

                  if (lista.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-[#5A5A5A]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                            <p className="font-semibold text-slate-700">
                              Nenhuma data ou festa encontrada.
                            </p>
                            <p className="text-xs text-slate-400">
                              Clique em "Nova Data / Festa" para incluir eventos na planilha.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return lista.map((ev, idx) => (
                    <tr key={ev.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 sm:p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 sm:p-4 font-semibold text-[#1E3A5F] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-[#C9A227] shrink-0" />
                          <span>
                            {formatarPeriodoEvento(
                              ev.data_inicio,
                              ev.data_termino || (ev as any).data_fim,
                              { formato: 'abrev' },
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 font-bold text-slate-900">{ev.titulo}</td>
                      <td className="p-3 sm:p-4">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold border-[#C9A227] text-[#8C6D15] bg-[#F1EBD8]/40"
                        >
                          {ev.departamento || 'Geral'}
                        </Badge>
                      </td>
                      <td className="p-3 sm:p-4 text-slate-600 max-w-md">
                        {ev.descricao ? (
                          <span className="line-clamp-2">{ev.descricao}</span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(ev)}
                            className="h-8 w-8 text-[#1E3A5F] hover:bg-blue-50"
                            title="Editar evento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingId(ev.id)
                              setIsDeleteModalOpen(true)
                            }}
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                            title="Excluir evento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                })()
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Formulário */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              {editingItem ? 'Editar Evento' : 'Novo Evento no Calendário'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Adicione festas, congressos e cruzadas ao calendário da igreja.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Título do Evento <span className="text-red-500">*</span>
              </label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Congresso de Jovens (UMADTC)"
                className={`text-xs sm:text-sm ${errors.titulo ? 'border-red-500' : ''}`}
              />
              {errors.titulo && <p className="text-[11px] text-red-600">{errors.titulo}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Data de Início <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className={`text-xs sm:text-sm ${errors.dataInicio ? 'border-red-500' : ''}`}
                />
                {errors.dataInicio && (
                  <p className="text-[11px] text-red-600">{errors.dataInicio}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Data de Término</label>
                <Input
                  type="date"
                  value={dataTermino}
                  onChange={(e) => setDataTermino(e.target.value)}
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Departamento Responsável
              </label>
              <select
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm focus:ring-2 focus:ring-[#C9A227]"
              >
                {departamentosOpcoes.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Descrição / Detalhes da Programação (Opcional)
              </label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Tema, pregadores convidados, horários, objetivos e detalhes litúrgicos..."
                className="text-xs sm:text-sm"
                rows={3}
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#1E3A5F] text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Evento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-serif text-lg text-[#1E3A5F]">
              Excluir Evento
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Deseja realmente remover este evento do calendário?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button onClick={handleDeleteConfirm} className="bg-rose-600 text-white flex-1">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminCalendario
