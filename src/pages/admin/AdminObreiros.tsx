import React, { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Obreiro } from '@/types/adtc'
import { UNIDADES, CARGOS_OBREIROS } from '@/types/adtc'
import { useCongregacoes } from '@/hooks/useCongregacoes'
import useRealtime from '@/hooks/use-realtime'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  Search,
  Plus,
  Edit2,
  Trash2,
  Award,
  Loader2,
  ArrowUp,
  ArrowDown,
  Upload,
  AlertTriangle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const AdminObreiros: React.FC = () => {
  const { nomes: nomesRaw } = useCongregacoes()
  const unidadesLista = nomesRaw || []
  const [obreiros, setObreiros] = useState<Obreiro[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingObreiro, setEditingObreiro] = useState<Obreiro | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Form State
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState<Obreiro['cargo']>('Auxiliar')
  const [congregacao, setCongregacao] = useState<Obreiro['congregacao']>('Sede')
  const [status, setStatus] = useState<Obreiro['status']>('Ativo')
  const [telefone, setTelefone] = useState('')
  const [ordem, setOrdem] = useState<number>(1)
  const [mensagemPastoral, setMensagemPastoral] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)

  const loadObreiros = async () => {
    try {
      const records = await pb.collection('obreiros').getFullList<Obreiro>({
        sort: 'cargo,ordem,created',
      })
      setObreiros(records)
    } catch (err) {
      console.error('Erro ao buscar obreiros:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadObreiros()
  }, [])

  useRealtime<Obreiro>('obreiros', () => {
    loadObreiros()
  })

  const resetForm = () => {
    setNome('')
    setCargo('Auxiliar')
    setCongregacao('Sede')
    setStatus('Ativo')
    setTelefone('')
    setOrdem(1)
    setMensagemPastoral('')
    setFotoFile(null)
    setErrors({})
    setEditingObreiro(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleOpenEdit = (ob: Obreiro) => {
    setEditingObreiro(ob)
    setNome(ob.nome || '')
    setCargo(ob.cargo)
    setCongregacao(ob.congregacao)
    setStatus(ob.status)
    setTelefone(ob.telefone || '')
    setOrdem(ob.ordem || 1)
    setMensagemPastoral(ob.mensagem_pastoral || '')
    setFotoFile(null)
    setErrors({})
    setIsModalOpen(true)
  }

  const handleMoveOrder = async (ob: Obreiro, direction: 'up' | 'down') => {
    const currentOrdem = ob.ordem || 1
    const newOrdem = direction === 'up' ? Math.max(1, currentOrdem - 1) : currentOrdem + 1
    try {
      await pb.collection('obreiros').update(ob.id, { ordem: newOrdem })
      toast({ title: 'Ordem ministerial atualizada.' })
      loadObreiros()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao alterar ordem', description: err?.message })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!nome.trim()) newErrors.nome = 'O nome completo é obrigatório.'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('nome', nome.trim())
      formData.append('cargo', cargo)
      formData.append('congregacao', congregacao)
      formData.append('status', status)
      formData.append('ordem', ordem.toString())
      if (telefone.trim()) formData.append('telefone', telefone.trim())
      if (cargo === 'Pastor Presidente' && mensagemPastoral.trim()) {
        formData.append('mensagem_pastoral', mensagemPastoral.trim())
      }
      if (fotoFile) formData.append('foto', fotoFile)

      if (editingObreiro) {
        await pb.collection('obreiros').update(editingObreiro.id, formData)
        toast({ title: 'Obreiro atualizado com sucesso!' })
      } else {
        await pb.collection('obreiros').create(formData)
        toast({ title: 'Obreiro cadastrado com sucesso!' })
      }

      setIsModalOpen(false)
      resetForm()
      loadObreiros()
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
          title: 'Erro ao salvar obreiro',
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
      await pb.collection('obreiros').delete(deletingId)
      toast({ title: 'Obreiro excluído com sucesso.' })
      setIsDeleteModalOpen(false)
      setDeletingId(null)
      loadObreiros()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err?.message })
    }
  }

  const filtered = obreiros.filter(
    (o) =>
      o.nome.toLowerCase().includes(search.toLowerCase()) ||
      o.cargo.toLowerCase().includes(search.toLowerCase()) ||
      o.congregacao.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#1E3A5F]">
            Gestão do Corpo de Obreiros
          </h2>
          <p className="text-xs sm:text-sm text-[#5A5A5A]">
            Controle do corpo ministerial, ordem hierárquica e mensagem pastoral.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-[#1E3A5F] hover:bg-[#16304F] text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Obreiro
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A5A]" />
        <Input
          placeholder="Buscar por nome, cargo ou congregação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white border-[#E6E2D8] text-xs sm:text-sm"
        />
      </div>

      <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1E3A5F] text-white uppercase text-[10px] sm:text-xs tracking-wider">
              <tr>
                <th className="p-3 sm:p-4">Foto / Nome</th>
                <th className="p-3 sm:p-4">Cargo Ministerial</th>
                <th className="p-3 sm:p-4">Congregação</th>
                <th className="p-3 sm:p-4 text-center">Ordem</th>
                <th className="p-3 sm:p-4">Status</th>
                <th className="p-3 sm:p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2D8]">
              {filtered.length > 0 ? (
                filtered.map((ob) => (
                  <tr key={ob.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 sm:p-4 font-semibold text-[#1E3A5F] flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] border border-[#E6E2D8] flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden">
                        {ob.foto ? (
                          <img
                            src={pb.files.getURL(ob, ob.foto)}
                            alt={ob.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          ob.nome.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div>{ob.nome}</div>
                        {ob.telefone && (
                          <div className="text-[11px] text-[#5A5A5A]">{ob.telefone}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          ob.cargo === 'Pastor Presidente'
                            ? 'bg-[#C9A227]/20 text-[#1E3A5F] border-[#C9A227] font-bold'
                            : 'text-[#1E3A5F] border-[#1E3A5F]/30'
                        }`}
                      >
                        {ob.cargo}
                      </Badge>
                    </td>
                    <td className="p-3 sm:p-4 text-slate-700">{ob.congregacao}</td>
                    <td className="p-3 sm:p-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveOrder(ob, 'up')}
                          className="h-6 w-6 text-slate-500 hover:text-[#1E3A5F]"
                          title="Subir ordem"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <span className="font-mono font-bold text-xs">{ob.ordem || 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveOrder(ob, 'down')}
                          className="h-6 w-6 text-slate-500 hover:text-[#1E3A5F]"
                          title="Descer ordem"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-3 sm:p-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          ob.status === 'Ativo'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {ob.status}
                      </Badge>
                    </td>
                    <td className="p-3 sm:p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(ob)}
                          className="h-8 w-8 text-[#1E3A5F]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingId(ob.id)
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
                    Nenhum obreiro cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Formulário */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              {editingObreiro ? 'Editar Obreiro' : 'Novo Obreiro'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Cadastre ministros e auxiliares com a devida ordem de precedência ministerial.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Pr José Francisco Portela Fontenele"
                className={`text-xs sm:text-sm ${errors.nome ? 'border-red-500' : ''}`}
              />
              {errors.nome && <p className="text-[11px] text-red-600">{errors.nome}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Cargo Ministerial <span className="text-red-500">*</span>
                </label>
                <select
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm focus:ring-2 focus:ring-[#C9A227]"
                >
                  {CARGOS_OBREIROS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Congregação Vinculada <span className="text-red-500">*</span>
                </label>
                <select
                  value={congregacao}
                  onChange={(e) => setCongregacao(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm focus:ring-2 focus:ring-[#C9A227]"
                >
                  {(unidadesLista || []).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Telefone</label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(88) 99999-9999"
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Ordem de Exibição</label>
                <Input
                  type="number"
                  min={1}
                  value={ordem}
                  onChange={(e) => setOrdem(parseInt(e.target.value, 10) || 1)}
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Mensagem Pastoral (Exclusiva para Pastor Presidente) */}
            {cargo === 'Pastor Presidente' && (
              <div className="space-y-1 p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#C9A227]" />
                  Mensagem Pastoral (Exibida em Destaque Solene no Site)
                </label>
                <Textarea
                  value={mensagemPastoral}
                  onChange={(e) => setMensagemPastoral(e.target.value)}
                  placeholder="Escreva a mensagem pastoral do Pastor Presidente aos membros e visitantes..."
                  className="text-xs sm:text-sm bg-white"
                  rows={3}
                />
              </div>
            )}

            {/* Upload de Foto */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Foto de Perfil</label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E6E2D8] bg-slate-50 hover:bg-slate-100 text-xs text-[#1E3A5F] font-medium">
                  <Upload className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Escolher foto...</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFotoFile(e.target.files[0])
                      }
                    }}
                  />
                </label>
                {fotoFile && (
                  <span className="text-xs text-slate-600 truncate">{fotoFile.name}</span>
                )}
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#1E3A5F] text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Obreiro'}
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
              Excluir Obreiro
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Deseja realmente remover este ministro do corpo de obreiros?
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

export default AdminObreiros
