import React, { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Patrimonio } from '@/types/adtc'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Building,
  Home,
  Box,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
  MapPin,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const AdminPatrimonio: React.FC = () => {
  const [patrimonios, setPatrimonios] = useState<Patrimonio[]>([])
  const [activeTab, setActiveTab] = useState<'Templo' | 'Casa Pastoral' | 'Bem Inventariado'>(
    'Templo',
  )
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Patrimonio | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Form State
  const [tipo, setTipo] = useState<Patrimonio['tipo']>('Templo')
  const [nome, setNome] = useState('')
  const [endereco, setEndereco] = useState('')
  const [descricao, setDescricao] = useState('')
  const [quantidade, setQuantidade] = useState<number>(1)
  const [detalhes, setDetalhes] = useState('')

  const loadPatrimonio = async () => {
    try {
      const records = await pb.collection('patrimonio').getFullList<Patrimonio>({
        sort: 'tipo,nome',
      })
      setPatrimonios(records)
    } catch (err) {
      console.error('Erro ao buscar patrimônio:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPatrimonio()
  }, [])

  const resetForm = (forTipo?: Patrimonio['tipo']) => {
    setTipo(forTipo || activeTab)
    setNome('')
    setEndereco('')
    setDescricao('')
    setQuantidade(1)
    setDetalhes('')
    setErrors({})
    setEditingItem(null)
  }

  const handleOpenCreate = () => {
    resetForm(activeTab)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: Patrimonio) => {
    setEditingItem(item)
    setTipo(item.tipo)
    setNome(item.nome || '')
    setEndereco(item.endereco || '')
    setDescricao(item.descricao || '')
    setQuantidade(item.quantidade || 1)
    setDetalhes(item.detalhes || '')
    setErrors({})
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!nome.trim()) newErrors.nome = 'O nome ou identificação é obrigatório.'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const payload: Record<string, any> = {
        tipo,
        nome: nome.trim(),
        endereco: endereco.trim(),
        descricao: descricao.trim(),
        quantidade: quantidade || 1,
        detalhes: detalhes.trim(),
      }

      if (editingItem) {
        await pb.collection('patrimonio').update(editingItem.id, payload)
        toast({ title: 'Item de patrimônio atualizado!' })
      } else {
        await pb.collection('patrimonio').create(payload)
        toast({ title: 'Item de patrimônio cadastrado com sucesso!' })
      }

      setIsModalOpen(false)
      resetForm()
      loadPatrimonio()
    } catch (err: any) {
      if (err?.data?.data) {
        const backendErrors: Record<string, string> = {}
        for (const [key, val] of Object.entries(err.data.data)) {
          backendErrors[key] = (val as any)?.message || 'Inválido'
        }
        setErrors(backendErrors)
      } else {
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: err?.message })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    try {
      await pb.collection('patrimonio').delete(deletingId)
      toast({ title: 'Patrimônio removido com sucesso.' })
      setIsDeleteModalOpen(false)
      setDeletingId(null)
      loadPatrimonio()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err?.message })
    }
  }

  const templos = patrimonios.filter((p) => p.tipo === 'Templo')
  const casas = patrimonios.filter((p) => p.tipo === 'Casa Pastoral')
  const bens = patrimonios.filter((p) => p.tipo === 'Bem Inventariado')

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#1E3A5F]">Gestão de Patrimônio</h2>
          <p className="text-xs sm:text-sm text-[#5A5A5A]">
            Controle patrimonial dos templos, residências pastorais e bens/equipamentos
            inventariados.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-[#1E3A5F] hover:bg-[#16304F] text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Cadastrar {activeTab}
        </Button>
      </div>

      {/* Tabs das 3 seções do patrimônio */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="bg-white border border-[#E6E2D8] p-1 rounded-xl">
          <TabsTrigger value="Templo" className="text-xs sm:text-sm flex items-center gap-1.5">
            <Building className="w-4 h-4" />
            Templos ({templos.length})
          </TabsTrigger>
          <TabsTrigger
            value="Casa Pastoral"
            className="text-xs sm:text-sm flex items-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            Casa Pastoral ({casas.length})
          </TabsTrigger>
          <TabsTrigger
            value="Bem Inventariado"
            className="text-xs sm:text-sm flex items-center gap-1.5"
          >
            <Box className="w-4 h-4" />
            Bens Inventariados ({bens.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. TEMPLOS */}
        <TabsContent value="Templo" className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templos.map((item) => (
              <Card
                key={item.id}
                className="border-[#E6E2D8] bg-white p-5 shadow-xs rounded-2xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className="bg-[#1E3A5F] text-white text-[10px] mb-1">
                        Templo Oficial
                      </Badge>
                      <h3 className="font-serif font-bold text-base text-[#1E3A5F]">{item.nome}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(item)}
                        className="h-8 w-8 text-[#1E3A5F]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingId(item.id)
                          setIsDeleteModalOpen(true)
                        }}
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {item.endereco && (
                    <p className="text-xs text-[#5A5A5A] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#C9A227] flex-shrink-0" />
                      {item.endereco}
                    </p>
                  )}

                  {item.descricao && (
                    <p className="text-xs text-[#1A1A1A] leading-relaxed">{item.descricao}</p>
                  )}

                  {item.detalhes && (
                    <div className="p-2.5 rounded-lg bg-[#F7F5F0] border border-[#E6E2D8] text-[11px] text-[#5A5A5A]">
                      <strong>Detalhes:</strong> {item.detalhes}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 2. CASA PASTORAL */}
        <TabsContent value="Casa Pastoral" className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {casas.map((item) => (
              <Card
                key={item.id}
                className="border-[#E6E2D8] bg-white p-5 shadow-xs rounded-2xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-[10px] mb-1">
                        Residência Ministerial
                      </Badge>
                      <h3 className="font-serif font-bold text-base text-[#1E3A5F]">{item.nome}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(item)}
                        className="h-8 w-8 text-[#1E3A5F]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingId(item.id)
                          setIsDeleteModalOpen(true)
                        }}
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {item.endereco && (
                    <p className="text-xs text-[#5A5A5A] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#C9A227] flex-shrink-0" />
                      {item.endereco}
                    </p>
                  )}

                  {item.descricao && (
                    <p className="text-xs text-[#1A1A1A] leading-relaxed">{item.descricao}</p>
                  )}

                  {item.detalhes && (
                    <div className="p-2.5 rounded-lg bg-[#F7F5F0] border border-[#E6E2D8] text-[11px] text-[#5A5A5A]">
                      <strong>Detalhes:</strong> {item.detalhes}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 3. BENS INVENTARIADOS */}
        <TabsContent value="Bem Inventariado" className="pt-4 space-y-4">
          <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#1E3A5F] text-white uppercase text-[10px] sm:text-xs tracking-wider">
                  <tr>
                    <th className="p-3 sm:p-4">Item / Nome</th>
                    <th className="p-3 sm:p-4">Localização</th>
                    <th className="p-3 sm:p-4">Descrição</th>
                    <th className="p-3 sm:p-4">Detalhes / Tombamento</th>
                    <th className="p-3 sm:p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E2D8]">
                  {bens.length > 0 ? (
                    bens.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 sm:p-4 font-semibold text-[#1E3A5F]">{b.nome}</td>
                        <td className="p-3 sm:p-4 text-slate-700">{b.endereco || '—'}</td>
                        <td className="p-3 sm:p-4 text-slate-600 max-w-xs truncate">
                          {b.descricao || '—'}
                        </td>
                        <td className="p-3 sm:p-4 text-slate-500 text-xs">{b.detalhes || '—'}</td>
                        <td className="p-3 sm:p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(b)}
                              className="h-8 w-8 text-[#1E3A5F]"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeletingId(b.id)
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
                      <td colSpan={5} className="p-8 text-center text-[#5A5A5A] italic">
                        Nenhum bem inventariado cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Form */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              {editingItem ? 'Editar Patrimônio' : `Novo ${tipo}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Preencha as informações patrimoniais do imóvel ou bem inventariado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Tipo de Patrimônio</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm focus:ring-2 focus:ring-[#C9A227]"
                >
                  <option value="Templo">Templo</option>
                  <option value="Casa Pastoral">Casa Pastoral</option>
                  <option value="Bem Inventariado">Bem Inventariado</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Nome / Identificação <span className="text-red-500">*</span>
                </label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Templo Sede ou Mesa de Som"
                  className={`text-xs sm:text-sm ${errors.nome ? 'border-red-500' : ''}`}
                />
                {errors.nome && <p className="text-[11px] text-red-600">{errors.nome}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Endereço ou Localização Física
              </label>
              <Input
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Ex: Rua Alberto Batista Fontenele, 141 ou Cabine de Áudio"
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Descrição Principal</label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Breve descrição estrutural ou características do bem..."
                className="text-xs sm:text-sm"
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Detalhes Adicionais (Capacidade, Tombamento, Observações)
              </label>
              <Textarea
                value={detalhes}
                onChange={(e) => setDetalhes(e.target.value)}
                placeholder="Ex: Capacidade 350 pessoas, Tombamento PAT-2024-001..."
                className="text-xs sm:text-sm"
                rows={2}
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#1E3A5F] text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Patrimônio'}
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
              Excluir Patrimônio
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Deseja realmente remover este registro de patrimônio?
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

export default AdminPatrimonio
