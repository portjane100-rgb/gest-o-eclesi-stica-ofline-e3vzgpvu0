import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { AgendaSemanalItem } from '@/types/adtc'
import { DIAS_SEMANA } from '@/types/adtc'
import { useCongregacoes } from '@/hooks/useCongregacoes'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Clock,
  Calendar,
  MapPin,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { InlineText } from '@/components/InlineText'

export const AgendaSemanal: React.FC = () => {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { congregacoes, nomes: nomesRaw } = useCongregacoes()
  const unidadesLista = nomesRaw || []

  const [itens, setItens] = useState<AgendaSemanalItem[]>([])
  const [selectedUnidade, setSelectedUnidade] = useState<string>('Sede')
  const [loading, setLoading] = useState(true)

  // Modais de Gestão Admin
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AgendaSemanalItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [formUnidade, setFormUnidade] = useState<string>('Sede')
  const [formDia, setFormDia] = useState<string>('Domingo')
  const [formHorario, setFormHorario] = useState('19h00')
  const [formEvento, setFormEvento] = useState('')
  const [formObservacao, setFormObservacao] = useState('')

  const diasSemanaMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const hojeNome = diasSemanaMap[new Date().getDay()]

  const fetchAgenda = async () => {
    try {
      const records = await pb.collection('agenda_semanal').getFullList<AgendaSemanalItem>({
        sort: 'dia_semana,horario',
      })
      setItens(records)
    } catch (err) {
      console.error('Erro ao buscar agenda semanal:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgenda()
  }, [])

  // Ordem litúrgica padrão: Segunda a Domingo
  const diasOrdenados: (typeof DIAS_SEMANA)[number][] = [
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
    'Domingo',
  ]

  const getEventosPorDia = (unidade: string, dia: string) => {
    return itens
      .filter((i) => i.unidade === unidade && i.dia_semana === dia)
      .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
  }

  const resetForm = () => {
    setFormUnidade(selectedUnidade)
    setFormDia('Domingo')
    setFormHorario('19h00')
    setFormEvento('')
    setFormObservacao('')
    setEditingItem(null)
  }

  const handleOpenCreate = (diaPredefinido?: string) => {
    resetForm()
    if (diaPredefinido) setFormDia(diaPredefinido)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: AgendaSemanalItem) => {
    setEditingItem(item)
    setFormUnidade(item.unidade)
    setFormDia(item.dia_semana)
    setFormHorario(item.horario || '19h00')
    setFormEvento(item.evento || '')
    setFormObservacao(item.observacao || '')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formEvento.trim()) {
      toast({ variant: 'destructive', title: 'O nome da atividade é obrigatório.' })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        unidade: formUnidade,
        dia_semana: formDia,
        horario: formHorario.trim(),
        evento: formEvento.trim(),
        observacao: formObservacao.trim(),
      }

      if (editingItem) {
        await pb.collection('agenda_semanal').update(editingItem.id, payload)
        toast({ title: 'Atividade atualizada com sucesso!' })
      } else {
        await pb.collection('agenda_semanal').create(payload)
        toast({ title: 'Atividade cadastrada na agenda semanal!' })
      }

      setIsModalOpen(false)
      resetForm()
      fetchAgenda()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar atividade',
        description: err?.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    try {
      await pb.collection('agenda_semanal').delete(deletingId)
      toast({ title: 'Atividade removida da agenda.' })
      setDeletingId(null)
      fetchAgenda()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir atividade',
        description: err?.message,
      })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Cabeçalho */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center justify-center">
          <Badge className="bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40 uppercase tracking-widest text-xs font-semibold">
            <InlineText
              configKey="agenda_semanal_badge"
              defaultText="Liturgia Semanal"
              isAdmin={isAdmin}
              tag="span"
              label="Badge Agenda"
            />
          </Badge>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1E3A5F]">
          <InlineText
            configKey="agenda_semanal_titulo"
            defaultText="Agenda Semanal de Cultos"
            isAdmin={isAdmin}
            tag="span"
            label="Título Agenda"
          />
        </h1>
        <div className="text-sm sm:text-base text-[#5A5A5A] leading-relaxed">
          <InlineText
            configKey="agenda_semanal_subtitulo"
            defaultText="Confira os horários de consagrações, estudos de doutrina, ensaios e cultos solenes em nossa Sede e congregações."
            isAdmin={isAdmin}
            isTextarea
            tag="p"
            label="Subtítulo Agenda"
          />
        </div>

        {isAdmin && (
          <div className="pt-2">
            <Button
              onClick={() => handleOpenCreate()}
              className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold shadow-md"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Adicionar Novo Culto / Ensaio
            </Button>
          </div>
        )}
      </div>

      {/* Tabs por Unidade */}
      <Tabs value={selectedUnidade} onValueChange={setSelectedUnidade} className="w-full space-y-8">
        <div className="flex justify-center">
          <TabsList className="bg-white border border-[#E6E2D8] p-1.5 rounded-xl shadow-xs flex-wrap h-auto gap-1">
            {(unidadesLista || []).map((unidade) => {
              const isVila = unidade.includes('Pescadores')
              const label = isVila ? 'Vila dos Pescadores' : unidade
              return (
                <TabsTrigger
                  key={unidade}
                  value={unidade}
                  className="px-4 py-2.5 rounded-lg text-xs sm:text-sm italic font-bold tracking-wide data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  {label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {(unidadesLista || []).map((unidade) => {
          const congregacaoInfo = (congregacoes || []).find((c) => c.nome === unidade)
          return (
            <TabsContent key={unidade} value={unidade} className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6E2D8] p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C9A227]">
                    Unidade Selecionada
                  </span>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold italic tracking-wide text-[#1E3A5F] drop-shadow-xs">
                    {unidade === 'Congregação da Vila dos Pescadores'
                      ? 'Vila dos Pescadores'
                      : unidade}
                  </h2>
                  <p className="text-xs text-[#5A5A5A] flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#C9A227]" />
                    {congregacaoInfo?.endereco ||
                      (unidade === 'Sede'
                        ? 'Templo Sede'
                        : `Campo congregacional da igreja`)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-[#1E3A5F] text-white text-xs px-3 py-1">
                    Hoje é {hojeNome}
                  </Badge>
                  {isAdmin && (
                    <Button
                      onClick={() => {
                        setFormUnidade(unidade)
                        handleOpenCreate()
                      }}
                      size="sm"
                      className="bg-[#C9A227] hover:bg-[#B08E1E] text-[#1E3A5F] font-bold text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Novo nesta Unidade
                    </Button>
                  )}
                </div>
              </div>

              {/* Grade dos 7 Dias da Semana */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {diasOrdenados.map((dia) => {
                  const eventos = getEventosPorDia(unidade, dia)
                  const isHoje = dia === hojeNome

                  return (
                    <Card
                      key={dia}
                      className={`border transition-all duration-300 flex flex-col justify-between ${
                        isHoje
                          ? 'border-2 border-[#C9A227] bg-white shadow-md ring-2 ring-[#C9A227]/20'
                          : 'border-[#E6E2D8] bg-white shadow-xs'
                      }`}
                    >
                      <div>
                        <div
                          className={`px-5 py-3 border-b flex items-center justify-between ${
                            isHoje ? 'bg-[#1E3A5F] text-white' : 'bg-[#F7F5F0] text-[#1E3A5F]'
                          }`}
                        >
                          <h3 className="font-serif font-bold text-sm sm:text-base">{dia}</h3>
                          <div className="flex items-center gap-1.5">
                            {isHoje && (
                              <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-[10px] tracking-wider uppercase px-2 py-0.5">
                                Hoje
                              </Badge>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setFormUnidade(unidade)
                                  handleOpenCreate(dia)
                                }}
                                className={`p-1 rounded text-xs transition ${
                                  isHoje
                                    ? 'hover:bg-white/20 text-white'
                                    : 'hover:bg-slate-200 text-[#1E3A5F]'
                                }`}
                                title={`Adicionar culto na ${dia}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <CardContent className="p-5 space-y-4">
                          {eventos.length > 0 ? (
                            eventos.map((ev) => (
                              <div
                                key={ev.id}
                                className="space-y-1 pb-3 border-b border-[#E6E2D8]/60 last:border-b-0 last:pb-0 relative group"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-[#C9A227] flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {ev.horario || 'Horário regular'}
                                  </span>

                                  {isAdmin && (
                                    <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                                      <button
                                        onClick={() => handleOpenEdit(ev)}
                                        className="p-1.5 sm:p-1 rounded-md text-[#1E3A5F] hover:bg-slate-100 transition touch-manipulation"
                                        title="Editar atividade"
                                        aria-label="Editar atividade"
                                      >
                                        <Edit2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                      </button>
                                      <button
                                        onClick={() => setDeletingId(ev.id)}
                                        className="p-1.5 sm:p-1 rounded-md text-rose-600 hover:bg-rose-50 transition touch-manipulation"
                                        title="Excluir atividade"
                                        aria-label="Excluir atividade"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <h4 className="font-serif font-semibold text-sm text-[#1A1A1A]">
                                  {ev.evento}
                                </h4>
                                {ev.observacao && (
                                  <p className="text-xs text-[#5A5A5A] italic">{ev.observacao}</p>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="py-4 text-center">
                              <p className="text-xs text-slate-400 italic">
                                Sem atividades oficiais cadastradas para este dia.
                              </p>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setFormUnidade(unidade)
                                    handleOpenCreate(dia)
                                  }}
                                  className="mt-2 text-xs text-[#C9A227] hover:bg-amber-50 h-7"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Adicionar atividade
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Modal Criar/Editar Atividade */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              {editingItem ? 'Editar Culto / Atividade' : 'Nova Atividade Semanal'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Cadastre cultos de doutrina, consagrações, reuniões de mocidade ou ensaios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Unidade / Congregação</label>
              <select
                value={formUnidade}
                onChange={(e) => setFormUnidade(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm"
              >
                {(unidadesLista || []).map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Dia da Semana</label>
                <select
                  value={formDia}
                  onChange={(e) => setFormDia(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm"
                >
                  {DIAS_SEMANA.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Horário</label>
                <Input
                  value={formHorario}
                  onChange={(e) => setFormHorario(e.target.value)}
                  placeholder="Ex: 19h00"
                  className="text-xs sm:text-sm h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Nome do Culto / Atividade <span className="text-red-500">*</span>
              </label>
              <Input
                value={formEvento}
                onChange={(e) => setFormEvento(e.target.value)}
                placeholder="Ex: Culto de Doutrina e Ensino"
                className="text-xs sm:text-sm h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Observação</label>
              <Input
                value={formObservacao}
                onChange={(e) => setFormObservacao(e.target.value)}
                placeholder="Ex: Estudo com Santa Ceia em datas especiais"
                className="text-xs sm:text-sm h-9"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#1E3A5F] text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-serif text-lg text-[#1E3A5F]">
              Excluir Atividade
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Deseja realmente remover esta atividade da agenda semanal?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)} className="flex-1">
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

export default AgendaSemanal
