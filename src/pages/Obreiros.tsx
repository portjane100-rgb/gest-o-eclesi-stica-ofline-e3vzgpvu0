import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Obreiro } from '@/types/adtc'
import { UNIDADES, CARGOS_OBREIROS } from '@/types/adtc'
import { useCongregacoes } from '@/hooks/useCongregacoes'
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
  Users,
  Phone,
  MapPin,
  Award,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Loader2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export const Obreiros: React.FC = () => {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { nomes: nomesRaw } = useCongregacoes()
  const unidadesLista = nomesRaw || []

  const [obreiros, setObreiros] = useState<Obreiro[]>([])
  const [loading, setLoading] = useState(true)

  // Modais de Gestão Admin
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingObreiro, setEditingObreiro] = useState<Obreiro | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form State
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState<Obreiro['cargo']>('Auxiliar')
  const [congregacao, setCongregacao] = useState<Obreiro['congregacao']>('Sede')
  const [status, setStatus] = useState<Obreiro['status']>('Ativo')
  const [telefone, setTelefone] = useState('')
  const [ordem, setOrdem] = useState<number>(1)
  const [mensagemPastoral, setMensagemPastoral] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)

  const fetchObreiros = async () => {
    try {
      const records = await pb.collection('obreiros').getFullList<Obreiro>({
        // Admins podem ver todos inclusive Inativos, mas na ordem hierárquica
        filter: isAdmin ? '' : "status='Ativo'",
        sort: 'ordem,created',
      })
      setObreiros(records)
    } catch (err) {
      console.error('Erro ao buscar obreiros:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchObreiros()
  }, [isAdmin])

  // Agrupamento por hierarquia ministerial
  const pastorPresidente = obreiros.find((o) => o.cargo === 'Pastor Presidente')
  const evangelistas = obreiros.filter((o) => o.cargo === 'Evangelista')
  const presbiteros = obreiros.filter((o) => o.cargo === 'Presbítero')
  const diaconos = obreiros.filter((o) => o.cargo === 'Diácono')
  const auxiliares = obreiros.filter((o) => o.cargo === 'Auxiliar')

  const resetForm = () => {
    setNome('')
    setCargo('Auxiliar')
    setCongregacao('Sede')
    setStatus('Ativo')
    setTelefone('')
    setOrdem(obreiros.length + 1)
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
      toast({ title: 'Ordem hierárquica atualizada.' })
      fetchObreiros()
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
        toast({ title: 'Novo obreiro cadastrado com sucesso!' })
      }

      setIsModalOpen(false)
      resetForm()
      fetchObreiros()
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
      setDeletingId(null)
      fetchObreiros()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir obreiro', description: err?.message })
    }
  }

  const renderMonogram = (nome: string, extraClasses = 'w-20 h-20 text-xl') => {
    const parts = nome
      .split(' ')
      .filter((p) => !['Pr.', 'Pr', 'Ev.', 'Pb.', 'Dc.', 'Aux.', 'de', 'da', 'do'].includes(p))
    const initials = parts
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
    return (
      <div
        className={`rounded-full bg-[#1E3A5F] text-[#C9A227] flex items-center justify-center font-serif font-bold shadow-inner ${extraClasses}`}
      >
        {initials || 'OB'}
      </div>
    )
  }

  // Ações de Admin nos cards
  const renderAdminControls = (ob: Obreiro) => {
    if (!isAdmin) return null
    return (
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[#E6E2D8]/60 justify-end w-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleMoveOrder(ob, 'up')}
          className="h-7 w-7 text-slate-500 hover:text-[#1E3A5F]"
          title="Subir ordem"
        >
          <ArrowUp className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleMoveOrder(ob, 'down')}
          className="h-7 w-7 text-slate-500 hover:text-[#1E3A5F]"
          title="Descer ordem"
        >
          <ArrowDown className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleOpenEdit(ob)}
          className="h-7 w-7 text-[#1E3A5F] hover:bg-slate-100"
          title="Editar Obreiro"
        >
          <Edit2 className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDeletingId(ob.id)}
          className="h-7 w-7 text-rose-600 hover:bg-rose-50"
          title="Excluir Obreiro"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Cabeçalho da página */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <Badge className="bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40 uppercase tracking-widest text-xs font-semibold">
          Liderança Ministerial
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1E3A5F]">
          Corpo de Obreiros
        </h1>
        <p className="text-sm sm:text-base text-[#5A5A5A] leading-relaxed">
          Homens separados e consagrados por Deus para apascentar o rebanho, administrar os
          sacramentos e servir com dedicação no campo eclesiástico.
        </p>

        {/* Botão Admin Adicionar */}
        {isAdmin && (
          <div className="pt-2">
            <Button
              onClick={handleOpenCreate}
              className="bg-[#1E3A5F] hover:bg-[#16304F] text-white shadow-md text-xs font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Adicionar Novo Obreiro
            </Button>
          </div>
        )}
      </div>

      {/* 1. PASTOR PRESIDENTE - Destaque Solene */}
      {pastorPresidente && (
        <section className="space-y-4">
          <div className="text-center">
            <span className="text-xs uppercase font-bold tracking-widest text-[#C9A227]">
              Liderança Geral do Ministério
            </span>
          </div>

          <Card className="max-w-4xl mx-auto border-2 border-[#C9A227] bg-white shadow-xl overflow-hidden rounded-2xl relative">
            <div className="h-3 bg-gradient-to-r from-[#1E3A5F] via-[#C9A227] to-[#1E3A5F]" />
            <CardContent className="p-6 sm:p-10">
              <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                {/* Foto / Monograma Solene */}
                <div className="relative flex-shrink-0">
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-[#C9A227] p-1.5 bg-white shadow-lg flex items-center justify-center overflow-hidden">
                    {pastorPresidente.foto ? (
                      <img
                        src={pb.files.getURL(pastorPresidente, pastorPresidente.foto)}
                        alt={pastorPresidente.nome}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      renderMonogram(pastorPresidente.nome, 'w-full h-full text-3xl sm:text-4xl')
                    )}
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#C9A227] text-[#1E3A5F] font-bold text-xs uppercase px-3 py-0.5 rounded-full shadow-md whitespace-nowrap">
                    Pastor Presidente
                  </div>
                </div>

                {/* Dados e Mensagem Pastoral */}
                <div className="space-y-4 flex-1">
                  <div>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3A5F]">
                      {pastorPresidente.nome}
                    </h2>
                    <p className="text-xs sm:text-sm font-semibold text-[#C9A227] tracking-wider uppercase mt-1">
                      Pastor Presidente
                    </p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-[#5A5A5A] mt-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#C9A227]" />
                        Sede da ADTC
                      </span>
                      {pastorPresidente.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-[#C9A227]" />
                          {pastorPresidente.telefone}
                        </span>
                      )}
                    </div>
                  </div>

                  {pastorPresidente.mensagem_pastoral && (
                    <div className="bg-[#F7F5F0] p-4 sm:p-5 rounded-xl border border-[#E6E2D8] text-xs sm:text-sm text-[#1A1A1A] italic leading-relaxed text-left">
                      <span className="font-serif font-bold text-[#C9A227] not-italic block text-xs uppercase mb-1">
                        Mensagem Pastoral
                      </span>
                      "{pastorPresidente.mensagem_pastoral}"
                    </div>
                  )}

                  {/* Controles Admin para Pastor Presidente */}
                  {isAdmin && (
                    <div className="flex items-center gap-2 justify-center md:justify-start pt-2">
                      <Button
                        onClick={() => handleOpenEdit(pastorPresidente)}
                        size="sm"
                        variant="outline"
                        className="text-xs border-[#1E3A5F] text-[#1E3A5F]"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Editar Dados & Mensagem Pastoral
                      </Button>
                      <Button
                        onClick={() => setDeletingId(pastorPresidente.id)}
                        size="sm"
                        variant="ghost"
                        className="text-xs text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 2. EVANGELISTAS */}
      {evangelistas.length > 0 && (
        <section className="space-y-4">
          <div className="border-b border-[#E6E2D8] pb-2 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
                <Award className="w-5 h-5 text-[#C9A227]" />
                Evangelistas
              </h2>
              <p className="text-xs text-[#5A5A5A]">
                Consagrados para a expansão do Evangelho e liderança das frentes missionárias
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {evangelistas.map((ob) => (
              <Card
                key={ob.id}
                className="border-[#E6E2D8] bg-white shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full border-2 border-[#C9A227]/40 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {ob.foto ? (
                      <img
                        src={pb.files.getURL(ob, ob.foto)}
                        alt={ob.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      renderMonogram(ob.nome, 'w-full h-full text-lg')
                    )}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-[10px] text-[#C9A227] border-[#C9A227]"
                      >
                        Evangelista
                      </Badge>
                      {ob.status === 'Inativo' && (
                        <Badge variant="secondary" className="text-[9px] bg-slate-200">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-serif font-bold text-sm sm:text-base text-[#1E3A5F] truncate">
                      {ob.nome}
                    </h3>
                    <p className="text-xs text-[#5A5A5A] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#C9A227]" />
                      {ob.congregacao}
                    </p>
                    {ob.telefone && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {ob.telefone}
                      </p>
                    )}
                  </div>
                </CardContent>
                {renderAdminControls(ob)}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 3. PRESBÍTEROS */}
      {presbiteros.length > 0 && (
        <section className="space-y-4">
          <div className="border-b border-[#E6E2D8] pb-2">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#C9A227]" />
              Presbíteros
            </h2>
            <p className="text-xs text-[#5A5A5A]">
              Cooperadores doutrinários, conselheiros e dirigentes de cultos
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {presbiteros.map((ob) => (
              <Card
                key={ob.id}
                className="border-[#E6E2D8] bg-white shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full border-2 border-[#1E3A5F]/20 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {ob.foto ? (
                      <img
                        src={pb.files.getURL(ob, ob.foto)}
                        alt={ob.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      renderMonogram(ob.nome, 'w-full h-full text-lg')
                    )}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-[10px] text-[#1E3A5F] border-[#1E3A5F]/40"
                      >
                        Presbítero
                      </Badge>
                      {ob.status === 'Inativo' && (
                        <Badge variant="secondary" className="text-[9px] bg-slate-200">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-serif font-bold text-sm sm:text-base text-[#1E3A5F] truncate">
                      {ob.nome}
                    </h3>
                    <p className="text-xs text-[#5A5A5A] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#C9A227]" />
                      {ob.congregacao}
                    </p>
                    {ob.telefone && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {ob.telefone}
                      </p>
                    )}
                  </div>
                </CardContent>
                {renderAdminControls(ob)}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 4. DIÁCONOS */}
      {diaconos.length > 0 && (
        <section className="space-y-4">
          <div className="border-b border-[#E6E2D8] pb-2">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#C9A227]" />
              Diáconos
            </h2>
            <p className="text-xs text-[#5A5A5A]">
              Serviço cristão zeloso na assistência social, na Santa Ceia e na ordem do templo
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {diaconos.map((ob) => (
              <Card
                key={ob.id}
                className="border-[#E6E2D8] bg-white shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full border-2 border-[#1E3A5F]/20 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {ob.foto ? (
                      <img
                        src={pb.files.getURL(ob, ob.foto)}
                        alt={ob.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      renderMonogram(ob.nome, 'w-full h-full text-lg')
                    )}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] text-slate-600 border-slate-300"
                    >
                      Diácono
                    </Badge>
                    <h3 className="font-serif font-bold text-sm sm:text-base text-[#1E3A5F] truncate">
                      {ob.nome}
                    </h3>
                    <p className="text-xs text-[#5A5A5A] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#C9A227]" />
                      {ob.congregacao}
                    </p>
                  </div>
                </CardContent>
                {renderAdminControls(ob)}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 5. AUXILIARES DE TRABALHO */}
      {auxiliares.length > 0 && (
        <section className="space-y-4">
          <div className="border-b border-[#E6E2D8] pb-2">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#C9A227]" />
              Auxiliares de Trabalho
            </h2>
            <p className="text-xs text-[#5A5A5A]">
              Irmãos devotados que auxiliam no cotidiano litúrgico e congregacional
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {auxiliares.map((ob) => (
              <Card
                key={ob.id}
                className="border-[#E6E2D8] bg-white p-4 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] flex items-center justify-center font-serif font-bold text-xs flex-shrink-0">
                    {ob.foto ? (
                      <img
                        src={pb.files.getURL(ob, ob.foto)}
                        alt={ob.nome}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      renderMonogram(ob.nome, 'w-full h-full text-xs')
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Badge variant="outline" className="text-[9px] text-slate-500 mb-0.5">
                      Auxiliar
                    </Badge>
                    <h3 className="font-serif font-semibold text-xs sm:text-sm text-[#1E3A5F] truncate">
                      {ob.nome}
                    </h3>
                    <p className="text-[11px] text-[#5A5A5A] truncate">{ob.congregacao}</p>
                  </div>
                </div>
                {renderAdminControls(ob)}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Modal Formulário Obreiro */}
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
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-serif text-lg text-[#1E3A5F]">
              Excluir Obreiro
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Deseja realmente remover este ministro do corpo de obreiros? Esta ação não pode ser
              desfeita.
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

export default Obreiros
