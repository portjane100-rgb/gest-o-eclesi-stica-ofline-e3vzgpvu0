import React, { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
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
  CalendarDays,
  Loader2,
  AlertTriangle,
  Calendar,
  Image as ImageIcon,
  X,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { extrairYmd, formatarDataBr, formatarPeriodoEvento, toUtcMiddayIso } from '@/lib/utils'
import { compressImage } from '@/lib/imageCompressor'

export const AdminCalendario: React.FC = () => {
  const [eventos, setEventos] = useState<CalendarioEvento[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CalendarioEvento | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Form State
  const [titulo, setTitulo] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataTermino, setDataTermino] = useState('')
  const [departamento, setDepartamento] = useState('Geral')
  const [descricao, setDescricao] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [removerFoto, setRemoverFoto] = useState(false)
  const [compressingImage, setCompressingImage] = useState(false)

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
    setFotoFile(null)
    setFotoPreview(null)
    setRemoverFoto(false)
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
    setFotoFile(null)
    setFotoPreview(item.foto ? pb.files.getURL(item, item.foto) : null)
    setRemoverFoto(false)
    setErrors({})
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
      formData.append('data_inicio', toUtcMiddayIso(dataInicio))
      formData.append('departamento', departamento)
      formData.append('descricao', descricao.trim())
      if (dataTermino) {
        formData.append('data_termino', toUtcMiddayIso(dataTermino))
      } else {
        formData.append('data_termino', '')
      }

      if (fotoFile) {
        formData.append('foto', fotoFile)
      } else if (removerFoto) {
        formData.append('foto', '')
      }

      if (editingItem) {
        await pb.collection('calendario').update(editingItem.id, formData)
        toast({ title: 'Evento atualizado com sucesso!' })
      } else {
        await pb.collection('calendario').create(formData)
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

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    try {
      await pb.collection('calendario').delete(deletingId)
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
          <h2 className="font-serif text-2xl font-bold text-[#1E3A5F]">
            Gestão do Calendário de Festas
          </h2>
          <p className="text-xs sm:text-sm text-[#5A5A5A]">
            Congressos, aniversários de departamentos, campanhas e festividades oficiais.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-[#1E3A5F] hover:bg-[#16304F] text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Evento
        </Button>
      </div>

      <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1E3A5F] text-white uppercase text-[10px] sm:text-xs tracking-wider">
              <tr>
                <th className="p-3 sm:p-4">Foto / Cartaz</th>
                <th className="p-3 sm:p-4">Título do Evento</th>
                <th className="p-3 sm:p-4">Período</th>
                <th className="p-3 sm:p-4">Departamento</th>
                <th className="p-3 sm:p-4">Descrição</th>
                <th className="p-3 sm:p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2D8]">
              {eventos.length > 0 ? (
                eventos.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 sm:p-4">
                      {ev.foto ? (
                        <img
                          src={pb.files.getURL(ev, ev.foto)}
                          alt={ev.titulo}
                          className="w-12 h-12 object-cover rounded-lg border border-[#E6E2D8] shadow-2xs"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </td>
                    <td className="p-3 sm:p-4 font-semibold text-[#1E3A5F]">{ev.titulo}</td>
                    <td className="p-3 sm:p-4 text-slate-700 whitespace-nowrap">
                      {formatarPeriodoEvento(
                        ev.data_inicio,
                        ev.data_termino || (ev as any).data_fim,
                        { formato: 'abrev' },
                      )}
                    </td>
                    <td className="p-3 sm:p-4">
                      <Badge variant="outline" className="text-[10px] text-[#1E3A5F]">
                        {ev.departamento || 'Geral'}
                      </Badge>
                    </td>
                    <td className="p-3 sm:p-4 text-slate-600 max-w-sm truncate">
                      {ev.descricao || '—'}
                    </td>
                    <td className="p-3 sm:p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(ev)}
                          className="h-8 w-8 text-[#1E3A5F]"
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
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#5A5A5A] italic">
                    Nenhum evento cadastrado no calendário.
                  </td>
                </tr>
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
              <label className="text-xs font-semibold text-[#1A1A1A]">Descrição do Evento</label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Detalhes, pregadores convidados, tema e objetivos..."
                className="text-xs sm:text-sm"
                rows={3}
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
                A imagem é comprimida automaticamente (≤ 800px, JPEG) para carregar rápido em
                conexões móveis.
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
