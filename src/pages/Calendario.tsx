import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { CalendarioEvento } from '@/types/adtc'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Calendar as CalendarIcon,
  Sparkles,
  Tag,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
  Image as ImageIcon,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { extrairYmd, formatarPeriodoEvento, toUtcMiddayIso, isEventoFuturo } from '@/lib/utils'
import { compressImage } from '@/lib/imageCompressor'

const DEPARTAMENTOS = [
  'Geral',
  'Jovens',
  'Senhoras',
  'Varões',
  'Infantil',
  'Missões',
  'Música',
] as const

export const Calendario: React.FC = () => {
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const [eventos, setEventos] = useState<CalendarioEvento[]>([])
  const [selectedDepartamento, setSelectedDepartamento] = useState<string>('Todos')
  const [loading, setLoading] = useState(true)

  // Modais de Gestão Admin
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvento, setEditingEvento] = useState<CalendarioEvento | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form State
  const [titulo, setTitulo] = useState('')
  const [departamento, setDepartamento] = useState<CalendarioEvento['departamento']>('Geral')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [descricao, setDescricao] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [removerFoto, setRemoverFoto] = useState(false)
  const [compressingImage, setCompressingImage] = useState(false)

  const fetchEventos = async () => {
    try {
      const records = await pb.collection('calendario').getFullList<CalendarioEvento>({
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
    fetchEventos()
  }, [])

  const resetForm = () => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    setTitulo('')
    setDepartamento('Geral')
    setDataInicio(today)
    setDataFim('')
    setDescricao('')
    setFotoFile(null)
    setFotoPreview(null)
    setRemoverFoto(false)
    setErrors({})
    setEditingEvento(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setCompressingImage(true)
      const res = await compressImage(file, {
        maxDimension: 800,
        quality: 0.85,
        mimeType: 'image/jpeg',
      })
      setFotoFile(res.file)
      setFotoPreview(res.previewUrl)
      setRemoverFoto(false)
      toast({
        title: 'Foto comprimida com sucesso',
        description: `Otimizada para ${(res.compressedSize / 1024).toFixed(0)} KB.`,
      })
    } catch (err) {
      console.error('Erro ao comprimir imagem do evento:', err)
      setFotoFile(file)
      setFotoPreview(URL.createObjectURL(file))
      setRemoverFoto(false)
    } finally {
      setCompressingImage(false)
    }
  }

  const handleRemoverFoto = () => {
    setFotoFile(null)
    setFotoPreview(null)
    setRemoverFoto(true)
  }

  const handleOpenEdit = (evento: CalendarioEvento) => {
    setEditingEvento(evento)
    setTitulo(evento.titulo || '')
    setDepartamento(evento.departamento || 'Geral')
    setDataInicio(extrairYmd(evento.data_inicio))
    const fimVal = evento.data_termino || (evento as any).data_fim
    setDataFim(extrairYmd(fimVal))
    setDescricao(evento.descricao || '')
    setFotoFile(null)
    setFotoPreview(evento.foto ? pb.files.getURL(evento, evento.foto) : null)
    setRemoverFoto(false)
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
      const formData = new FormData()
      formData.append('titulo', titulo.trim())
      formData.append('departamento', departamento)
      formData.append('data_inicio', toUtcMiddayIso(dataInicio))
      formData.append('descricao', descricao.trim())
      if (dataFim) {
        formData.append('data_termino', toUtcMiddayIso(dataFim))
      } else {
        formData.append('data_termino', '')
      }

      if (fotoFile) {
        formData.append('foto', fotoFile)
      } else if (removerFoto) {
        formData.append('foto', '')
      }

      if (editingEvento) {
        await pb.collection('calendario').update(editingEvento.id, formData)
        toast({ title: 'Evento atualizado com sucesso!' })
      } else {
        await pb.collection('calendario').create(formData)
        toast({ title: 'Evento cadastrado no calendário!' })
      }
      setIsModalOpen(false)
      resetForm()
      fetchEventos()
    } catch (err: any) {
      if (err?.data?.data) {
        const backendErrors: Record<string, string> = {}
        for (const [key, val] of Object.entries(err.data.data)) {
          backendErrors[key] = (val as any)?.message || 'Inválido'
        }
        setErrors(backendErrors)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar evento',
          description: err?.message,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    try {
      await pb.collection('calendario').delete(deletingId)
      toast({ title: 'Evento excluído do calendário com sucesso.' })
      setDeletingId(null)
      fetchEventos()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir evento', description: err?.message })
    }
  }

  const eventosFiltrados =
    selectedDepartamento === 'Todos'
      ? eventos
      : eventos.filter((e) => e.departamento === selectedDepartamento)

  // Separar em próximos e passados sem deslocamento de timezone
  const getFimOuInicio = (e: CalendarioEvento) => {
    return e.data_termino || (e as any).data_fim || e.data_inicio
  }

  const eventosFuturos = eventosFiltrados.filter((e) => {
    return isEventoFuturo(getFimOuInicio(e))
  })

  const eventosPassados = eventosFiltrados.filter((e) => {
    return !isEventoFuturo(getFimOuInicio(e))
  })

  const formatPeriodo = (inicio: string, fim?: string) => {
    return formatarPeriodoEvento(inicio, fim, { formato: 'abrev' })
  }

  const getBadgeColor = (dep: string) => {
    switch (dep) {
      case 'Jovens':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Senhoras':
        return 'bg-rose-100 text-rose-800 border-rose-200'
      case 'Varões':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'Infantil':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'Missões':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Música':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      default:
        return 'bg-[#1E3A5F]/10 text-[#1E3A5F] border-[#1E3A5F]/20'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Cabeçalho */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <Badge className="bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40 uppercase tracking-widest text-xs font-semibold">
          Agenda Anual
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1E3A5F]">
          Calendário de Festas & Eventos
        </h1>
        <p className="text-sm sm:text-base text-[#5A5A5A] leading-relaxed">
          Congressos, festividades departamentais, cruzadas evangelísticas e celebrações da ADTC
          Campanário.
        </p>

        {isAdmin && (
          <div className="pt-2">
            <Button
              onClick={handleOpenCreate}
              className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold shadow-md"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Adicionar Novo Evento / Festa
            </Button>
          </div>
        )}
      </div>

      {/* Filtro por Departamento */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant={selectedDepartamento === 'Todos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedDepartamento('Todos')}
          className={
            selectedDepartamento === 'Todos'
              ? 'bg-[#1E3A5F] text-white'
              : 'border-[#E6E2D8] text-slate-700'
          }
        >
          Todos os Departamentos
        </Button>
        {DEPARTAMENTOS.map((dep) => (
          <Button
            key={dep}
            variant={selectedDepartamento === dep ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDepartamento(dep)}
            className={
              selectedDepartamento === dep
                ? 'bg-[#1E3A5F] text-white'
                : 'border-[#E6E2D8] text-slate-700'
            }
          >
            {dep}
          </Button>
        ))}
      </div>

      {/* Próximos Eventos */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#E6E2D8] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C9A227]" />
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A5F]">
              Próximas Festividades & Congressos
            </h2>
          </div>
          <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-xs">
            {eventosFuturos.length} programados
          </Badge>
        </div>

        {eventosFuturos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventosFuturos.map((ev) => (
              <Card
                key={ev.id}
                className="border border-[#E6E2D8] bg-white shadow-xs hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {ev.foto && (
                    <div className="w-full h-48 sm:h-52 overflow-hidden bg-slate-100 border-b border-[#E6E2D8]">
                      <img
                        src={pb.files.getURL(ev, ev.foto)}
                        alt={ev.titulo}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  )}

                  <div className="p-5 pb-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getBadgeColor(ev.departamento)}`}
                      >
                        {ev.departamento}
                      </Badge>
                      <div className="text-xs text-[#5A5A5A] flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5 text-[#C9A227]" />
                        <span className="font-medium">
                          {formatPeriodo(ev.data_inicio, ev.data_termino || (ev as any).data_fim)}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-serif font-bold text-base sm:text-lg text-[#1E3A5F]">
                      {ev.titulo}
                    </h3>
                  </div>

                  <CardContent className="px-5 pb-5 pt-0">
                    {ev.descricao ? (
                      <p className="text-xs sm:text-sm text-[#5A5A5A] leading-relaxed line-clamp-4">
                        {ev.descricao}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Sem descrição adicional detalhada.
                      </p>
                    )}
                  </CardContent>
                </div>

                {/* Controles Admin */}
                {isAdmin && (
                  <div className="px-5 py-3 bg-[#F7F5F0] border-t border-[#E6E2D8] flex items-center justify-end gap-2">
                    <Button
                      onClick={() => handleOpenEdit(ev)}
                      size="sm"
                      variant="outline"
                      className="text-xs border-[#1E3A5F] text-[#1E3A5F] h-8"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => setDeletingId(ev.id)}
                      size="sm"
                      variant="ghost"
                      className="text-xs text-rose-600 hover:bg-rose-50 h-8"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-[#E6E2D8] bg-white p-8 text-center text-[#5A5A5A] rounded-2xl">
            <p>Nenhuma festividade futura encontrada para o filtro selecionado.</p>
            {isAdmin && (
              <Button onClick={handleOpenCreate} className="mt-3 bg-[#1E3A5F] text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                Cadastrar Evento
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Histórico / Eventos Concluídos */}
      {eventosPassados.length > 0 && (
        <div className="space-y-6 pt-6">
          <div className="border-b border-[#E6E2D8] pb-3">
            <h2 className="font-serif text-lg font-bold text-[#5A5A5A] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Eventos Já Realizados
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-80 hover:opacity-100 transition-opacity">
            {eventosPassados.map((ev) => (
              <Card
                key={ev.id}
                className="border border-[#E6E2D8] bg-[#F7F5F0]/50 p-4 rounded-xl space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <Badge variant="outline" className="text-[10px]">
                      {ev.departamento}
                    </Badge>
                    <span>
                      {formatPeriodo(ev.data_inicio, ev.data_termino || (ev as any).data_fim)}
                    </span>
                  </div>
                  <h4 className="font-serif font-bold text-sm text-[#1E3A5F] mt-1">{ev.titulo}</h4>
                  {ev.descricao && (
                    <p className="text-xs text-[#5A5A5A] line-clamp-2">{ev.descricao}</p>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-end gap-1 pt-2 border-t border-[#E6E2D8]/60">
                    <Button
                      onClick={() => handleOpenEdit(ev)}
                      size="sm"
                      variant="ghost"
                      className="text-xs text-[#1E3A5F] h-7 px-2"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => setDeletingId(ev.id)}
                      size="sm"
                      variant="ghost"
                      className="text-xs text-rose-600 hover:bg-rose-50 h-7 px-2"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal Criar / Editar Evento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              {editingEvento ? 'Editar Evento' : 'Novo Evento no Calendário'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Cadastre datas comemorativas, congressos e cruzadas eclesiásticas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Título da Festividade <span className="text-red-500">*</span>
              </label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: 12º Congresso do Círculo de Oração"
                className={`text-xs sm:text-sm ${errors.titulo ? 'border-red-500' : ''}`}
              />
              {errors.titulo && <p className="text-[11px] text-red-600">{errors.titulo}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Departamento Responsável <span className="text-red-500">*</span>
              </label>
              <select
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm focus:ring-2 focus:ring-[#C9A227]"
              >
                {DEPARTAMENTOS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
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
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Descrição do Evento</label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Tema bíblico, pregador convidado, informações gerais para os irmãos..."
                rows={3}
                className="text-xs sm:text-sm"
              />
            </div>

            {/* Upload de Foto / Cartaz da Festividade com compressor */}
            <div className="space-y-2 pt-1 border-t border-[#E6E2D8]">
              <label className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#C9A227]" />
                Cartaz / Foto da Festividade (Opcional)
              </label>

              {fotoPreview ? (
                <div className="relative inline-block border border-[#E6E2D8] rounded-xl overflow-hidden bg-slate-50">
                  <img
                    src={fotoPreview}
                    alt="Preview do evento"
                    className="w-full max-h-48 object-contain rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleRemoverFoto}
                    className="absolute top-2 right-2 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition"
                    title="Remover foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-[#1E3A5F] bg-blue-50/50 hover:bg-blue-50 text-xs font-semibold text-[#1E3A5F] transition">
                    <ImageIcon className="w-4 h-4 text-[#C9A227]" />
                    <span>Selecionar Cartaz / Foto</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFotoChange}
                      disabled={compressingImage}
                    />
                  </label>
                  {compressingImage && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A227]" />
                      Comprimindo...
                    </span>
                  )}
                </div>
              )}
              <p className="text-[11px] text-[#5A5A5A]">
                Foto comprimida automaticamente (≤ 800px, JPEG) para carregamento ágil no site.
              </p>
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
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-serif text-lg text-[#1E3A5F]">
              Excluir Evento
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Deseja realmente remover este evento do calendário litúrgico?
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

export default Calendario
