import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Membro, Congregado } from '@/types/adtc'
import { UNIDADES } from '@/types/adtc'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  Church,
  Users,
  Search,
  MapPin,
  Heart,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
  Phone,
  Clock,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface CongregacaoInfo {
  id?: string
  nome: string
  titulo: string
  subtitulo: string
  endereco: string
  diasCulto: string
  dirigenteGeral: string
}

export const Congregacoes: React.FC = () => {
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const [membros, setMembros] = useState<Membro[]>([])
  const [congregados, setCongregados] = useState<Congregado[]>([])
  const [listaCongregacoes, setListaCongregacoes] = useState<CongregacaoInfo[]>([])
  const [selectedUnidade, setSelectedUnidade] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Modal Adicionar Nova Congregação
  const [isNovaCongregacaoModalOpen, setIsNovaCongregacaoModalOpen] = useState(false)
  const [novaNome, setNovaNome] = useState('')
  const [novaTitulo, setNovaTitulo] = useState('')
  const [novaSubtitulo, setNovaSubtitulo] = useState('')
  const [novaEndereco, setNovaEndereco] = useState('')
  const [novaDiasCulto, setNovaDiasCulto] = useState('')
  const [novaDirigente, setNovaDirigente] = useState('')
  const [isSubmittingCongregacao, setIsSubmittingCongregacao] = useState(false)

  // Modais de Criação / Edição de Pessoa (Membro ou Congregado)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [personType, setPersonType] = useState<'membro' | 'congregado'>('membro')
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [unidade, setUnidade] = useState<string>('Sede')
  const [telefone, setTelefone] = useState('')
  const [status, setStatus] = useState<string>('Ativo')
  const [dataNascimento, setDataNascimento] = useState('')
  const [cargo, setCargo] = useState('Membro')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal de Exclusão de Membro ou Congregado
  const [deletingInfo, setDeletingInfo] = useState<{
    id: string
    nome: string
    type: 'membro' | 'congregado'
  } | null>(null)

  // Modal de Exclusão de Congregação
  const [deletingCongregacao, setDeletingCongregacao] = useState<{
    congregacao: CongregacaoInfo
    totalMembros: number
    totalCongregados: number
  } | null>(null)
  const [isDeletingCongregacao, setIsDeletingCongregacao] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setFetchError(null)

      // Carrega membros e congregados (IndexedDB com fallback PB)
      let membrosRes: Membro[] = []
      let congregadosRes: Congregado[] = []
      let congsRes: any[] = []

      try {
        const localMembros = await localDb.getFullList<Membro>('membros')
        membrosRes = isAdmin
          ? localMembros
          : localMembros.filter((m) => (m.status || 'Ativo') === 'Ativo')
      } catch {
        membrosRes = await pb.collection('membros').getFullList<Membro>({
          filter: isAdmin ? '' : "status='Ativo'",
          sort: 'nome',
        }).catch(() => [])
      }

      try {
        const localCongregados = await localDb.getFullList<Congregado>('congregados')
        congregadosRes = isAdmin
          ? localCongregados
          : localCongregados.filter((c) => !c.status || c.status === 'Ativo')
      } catch {
        congregadosRes = await pb.collection('congregados').getFullList<Congregado>({
          filter: isAdmin ? '' : "status='Ativo' || status='' || status=null",
          sort: 'nome',
        }).catch(() => [])
      }

      try {
        const localCongs = await localDb.getFullList<any>('congregacoes')
        if (localCongs && localCongs.length > 0) {
          congsRes = localCongs
        } else {
          congsRes = await pb
            .collection('congregacoes')
            .getFullList({ sort: 'ordem,created' })
            .catch(() => [])
        }
      } catch {
        congsRes = await pb
          .collection('congregacoes')
          .getFullList({ sort: 'ordem,created' })
          .catch(() => [])
      }

      const mapeadas: CongregacaoInfo[] = (congsRes || []).map((c: any) => ({
        id: c.id,
        nome: c.nome || '',
        titulo: c.titulo || c.nome || '',
        subtitulo: c.subtitulo || c.bairro || 'Unidade Congregacional',
        endereco: c.endereco || [c.bairro, c.cidade].filter(Boolean).join(', ') || 'Endereço a definir',
        diasCulto: c.diasCulto || c.dias_culto || 'Dias de culto a definir',
        dirigenteGeral: c.dirigenteGeral || c.dirigente_geral || 'Liderança responsável',
      })).filter((c) => Boolean(c.nome))

      setListaCongregacoes(mapeadas)

      setSelectedUnidade((prev) => {
        if (prev && mapeadas.some((m) => m.nome === prev)) {
          return prev
        }
        return mapeadas.length > 0 ? mapeadas[0].nome : ''
      })

      setMembros(membrosRes)
      setCongregados(congregadosRes)
    } catch (err: any) {
      console.error('Erro ao buscar dados:', err)
      const msg = err?.message || 'Falha ao sincronizar dados locais.'
      setFetchError(msg)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: msg,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [isAdmin])

  // Filtragem: Visitantes vêem APENAS membros e congregados Ativos
  const membrosFiltrados = membros.filter((m) => {
    if (!isAdmin && (m.status || 'Ativo') !== 'Ativo') return false
    return (
      m.congregacao === selectedUnidade &&
      m.nome.toLowerCase().includes(searchTerm.toLowerCase().trim())
    )
  })

  const congregadosFiltrados = congregados.filter((c) => {
    const s = c.status || 'Ativo'
    if (!isAdmin && s !== 'Ativo') return false
    return (
      c.congregacao === selectedUnidade &&
      c.nome.toLowerCase().includes(searchTerm.toLowerCase().trim())
    )
  })

  const currentInfo =
    listaCongregacoes.find((c) => c.nome === selectedUnidade) ||
    listaCongregacoes[0] ||
    null

  // Contadores (apenas Ativos na visão pública)
  const totalMembrosUnidade = membros.filter(
    (m) => m.congregacao === selectedUnidade && (isAdmin || (m.status || 'Ativo') === 'Ativo'),
  ).length
  const totalCongregadosUnidade = congregados.filter(
    (c) => c.congregacao === selectedUnidade && (isAdmin || (c.status || 'Ativo') === 'Ativo'),
  ).length

  const resetForm = () => {
    setNome('')
    setUnidade(selectedUnidade)
    setTelefone('')
    setStatus('Ativo')
    setDataNascimento('')
    setCargo('Membro')
    setEditingPersonId(null)
  }

  const handleOpenNovaCongregacao = () => {
    setNovaNome('')
    setNovaTitulo('')
    setNovaSubtitulo('')
    setNovaEndereco('')
    setNovaDiasCulto('')
    setNovaDirigente('')
    setIsNovaCongregacaoModalOpen(true)
  }

  const handleCriarCongregacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaNome.trim()) {
      toast({ variant: 'destructive', title: 'O nome da congregação é obrigatório.' })
      return
    }

    setIsSubmittingCongregacao(true)
    try {
      const payload = {
        id: localDb.generateId(),
        nome: novaNome.trim(),
        titulo: novaTitulo.trim() || novaNome.trim(),
        subtitulo: novaSubtitulo.trim() || 'Unidade Congregacional',
        endereco: novaEndereco.trim(),
        dias_culto: novaDiasCulto.trim(),
        diasCulto: novaDiasCulto.trim(),
        dirigente_geral: novaDirigente.trim(),
        dirigenteGeral: novaDirigente.trim(),
        ordem: listaCongregacoes.length + 1,
        ativo: true,
      }

      await localDb.create('congregacoes', payload)
      try {
        await pb.collection('congregacoes').create({
          id: payload.id,
          nome: payload.nome,
          endereco: payload.endereco,
          dias_culto: payload.dias_culto,
          dirigente_geral: payload.dirigente_geral,
          ordem: payload.ordem,
          ativo: true,
        })
      } catch {
        // Modo offline
      }

      toast({
        title: 'Congregação cadastrada com sucesso!',
        description: `A nova congregação "${novaNome}" já está disponível para todo o sistema.`,
      })

      setIsNovaCongregacaoModalOpen(false)
      await reloadCongregacoesHook()
      await fetchData()
      setSelectedUnidade(payload.nome)
    } catch (err: any) {
      console.error('Erro ao cadastrar congregação:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar congregação',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setIsSubmittingCongregacao(false)
    }
  }

  const handleOpenCreate = (type: 'membro' | 'congregado') => {
    resetForm()
    setPersonType(type)
    setUnidade(selectedUnidade)
    setIsModalOpen(true)
  }

  const handleOpenEditMembro = (m: Membro) => {
    setPersonType('membro')
    setEditingPersonId(m.id)
    setNome(m.nome)
    setUnidade(m.congregacao)
    setTelefone(m.telefone || '')
    setStatus(m.status)
    setDataNascimento(m.data_nascimento ? m.data_nascimento.slice(0, 10) : '')
    setCargo(m.cargo || 'Membro')
    setIsModalOpen(true)
  }
  const handleOpenEditCongregado = (c: Congregado) => {
    setPersonType('congregado')
    setEditingPersonId(c.id)
    setNome(c.nome)
    setUnidade(c.congregacao)
    setTelefone(c.telefone || '')
    setStatus(c.status)
    setDataNascimento(c.data_nascimento ? c.data_nascimento.slice(0, 10) : '')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({ variant: 'destructive', title: 'O nome completo é obrigatório.' })
      return
    }

    setIsSubmitting(true)
    try {
      const collectionName = personType === 'membro' ? 'membros' : 'congregados'
      const payload: Record<string, any> = {
        nome: nome.trim(),
        congregacao: unidade,
        telefone: telefone.trim(),
        status,
      }
      if (dataNascimento) {
        payload.data_nascimento = `${dataNascimento} 12:00:00.000Z`
      }
      if (personType === 'membro') {
        payload.cargo = cargo
      }

      if (editingPersonId) {
        await pb.collection(collectionName).update(editingPersonId, payload)
        toast({
          title: `${personType === 'membro' ? 'Membro' : 'Congregado'} atualizado com sucesso!`,
        })
      } else {
        await pb.collection(collectionName).create(payload)
        toast({
          title: `Novo ${personType === 'membro' ? 'membro' : 'congregado'} cadastrado com sucesso!`,
        })
      }

      setIsModalOpen(false)
      resetForm()
      fetchData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar registro',
        description: err?.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingInfo) return
    try {
      const collectionName = deletingInfo.type === 'membro' ? 'membros' : 'congregados'
      await pb.collection(collectionName).delete(deletingInfo.id)
      toast({
        title: `${deletingInfo.type === 'membro' ? 'Membro' : 'Congregado'} removido com sucesso.`,
      })
      setDeletingInfo(null)
      fetchData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir registro',
        description: err?.message,
      })
    }
  }

  const handleSolicitarRemoverCongregacao = (cong: CongregacaoInfo) => {
    const totalM = membros.filter((m) => m.congregacao === cong.nome).length
    const totalC = congregados.filter((c) => c.congregacao === cong.nome).length

    setDeletingCongregacao({
      congregacao: cong,
      totalMembros: totalM,
      totalCongregados: totalC,
    })
  }

  const handleConfirmarExclusaoCongregacao = async () => {
    if (!deletingCongregacao) return

    const { congregacao: cong } = deletingCongregacao

    setIsDeletingCongregacao(true)
    try {
      if (cong.id) {
        await localDb.delete('congregacoes', cong.id)
        try {
          await pb.collection('congregacoes').delete(cong.id)
        } catch {
          // offline
        }
      } else {
        const localList = await localDb.getFullList<any>('congregacoes')
        const found = localList.find((c) => c.nome === cong.nome)
        if (found?.id) {
          await localDb.delete('congregacoes', found.id)
          try {
            await pb.collection('congregacoes').delete(found.id)
          } catch {
            // offline
          }
        }
      }

      toast({
        title: 'Congregação removida com sucesso',
        description: `A congregação "${cong.nome}" foi excluída do cadastro local.`,
      })

      setDeletingCongregacao(null)

      if (selectedUnidade === cong.nome) {
        setSelectedUnidade('')
      }

      await reloadCongregacoesHook()
      await fetchData()
    } catch (err: any) {
      console.error('Erro ao excluir congregação:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir congregação',
        description: err?.message || 'Não foi possível remover a congregação. Tente novamente.',
      })
    } finally {
      setIsDeletingCongregacao(false)
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 sm:space-y-10 overflow-hidden">
      {/* Cabeçalho */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <Badge className="bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40 uppercase tracking-widest text-xs font-semibold">
          Campos Eclesiásticos
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1E3A5F]">
          Congregações & Membresia
        </h1>
        <p className="text-sm sm:text-base text-[#5A5A5A] leading-relaxed">
          Relação de congregações, unidades e membros cadastrados no sistema local da igreja.
        </p>

        {isAdmin && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button
              asChild
              className="bg-gradient-to-r from-[#C9A227] to-[#B38E1B] hover:from-[#B38E1B] hover:to-[#9E7C17] text-[#1E3A5F] font-bold text-xs shadow-md border border-[#C9A227]"
            >
              <Link to="/admin/congregacoes">
                <Church className="w-4 h-4 mr-1.5 text-[#1E3A5F]" />
                Gerenciar Congregações
              </Link>
            </Button>
            <Button
              onClick={handleOpenNovaCongregacao}
              variant="outline"
              className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-slate-50 font-bold text-xs shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5 text-[#C9A227]" />
              Nova Congregação
            </Button>
            {listaCongregacoes.length > 0 && (
              <>
                <Button
                  onClick={() => handleOpenCreate('membro')}
                  className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold shadow-md"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Adicionar Membro nesta Unidade
                </Button>
                <Button
                  onClick={() => handleOpenCreate('congregado')}
                  variant="outline"
                  className="border-[#C9A227] text-[#1E3A5F] hover:bg-amber-50 text-xs font-semibold shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5 text-[#C9A227]" />
                  Adicionar Congregado
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E6E2D8] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#C9A227]" />
          <span className="text-xs text-slate-500">Carregando congregações do banco local...</span>
        </div>
      ) : listaCongregacoes.length === 0 ? (
        <Card className="border border-[#E6E2D8] bg-white shadow-xs rounded-2xl">
          <CardContent className="p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-[#C9A227] flex items-center justify-center mx-auto">
              <Church className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-base text-[#1E3A5F]">
                Nenhuma congregação ou unidade cadastrada
              </h3>
              <p className="text-xs text-[#5A5A5A] max-w-md mx-auto">
                Para começar a registrar membros e organizar as frentes da igreja, cadastre a Sede
                ou suas filiais no painel de congregações.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button
                asChild
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold gap-2"
              >
                <Link to="/admin/congregacoes">
                  <Church className="w-4 h-4 text-[#C9A227]" />
                  Cadastrar Congregações no Painel
                </Link>
              </Button>
              <Button
                onClick={handleOpenNovaCongregacao}
                variant="outline"
                className="border-[#C9A227] text-[#1E3A5F] text-xs font-bold gap-2"
              >
                <Plus className="w-4 h-4 text-[#C9A227]" />
                Adicionar Rápido
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Tabs por Congregação */
        <Tabs
          value={selectedUnidade}
          onValueChange={setSelectedUnidade}
          className="w-full max-w-full space-y-8 overflow-hidden"
        >
          <div className="flex justify-center w-full max-w-full overflow-x-auto pb-1">
            <TabsList className="bg-white border border-[#E6E2D8] p-1.5 rounded-xl shadow-xs flex flex-wrap sm:flex-nowrap justify-center max-w-full h-auto gap-1">
              {listaCongregacoes.map((item) => {
                const u = item.nome
                return (
                  <TabsTrigger
                    key={item.id || u}
                    value={u}
                    className="px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-sm italic font-bold tracking-wide data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white data-[state=active]:shadow-md transition-all text-center"
                  >
                    {u}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {/* Card de Detalhes da Unidade */}
          {currentInfo && (
            <Card className="border border-[#E6E2D8] bg-white shadow-sm overflow-hidden rounded-2xl">
              <div className="h-2 bg-gradient-to-r from-[#1E3A5F] via-[#C9A227] to-[#1E3A5F]" />
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E6E2D8] pb-6">
                  <div>
                    <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-[10px] uppercase tracking-wider mb-1.5">
                      Unidade Eclesiástica
                    </Badge>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold italic text-[#1E3A5F] tracking-wide drop-shadow-xs">
                      {currentInfo.titulo}
                    </h2>
                    {currentInfo.subtitulo && (
                      <p className="text-xs sm:text-sm text-[#5A5A5A] mt-1">{currentInfo.subtitulo}</p>
                    )}
                    {currentInfo.endereco && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                        <MapPin className="w-4 h-4 text-[#C9A227] flex-shrink-0" />
                        {currentInfo.endereco}
                      </p>
                    )}
                  </div>

                  {/* Estatísticas Rápidas & Ações de Administração da Unidade */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 self-stretch sm:self-auto justify-end">
                    <div className="flex items-center gap-3">
                      <div className="px-4 py-2.5 rounded-xl bg-[#F7F5F0] border border-[#E6E2D8] text-center">
                        <div className="font-serif font-bold text-lg text-[#1E3A5F]">
                          {totalMembrosUnidade}
                        </div>
                        <div className="text-[10px] uppercase font-semibold text-[#5A5A5A]">
                          Membros
                        </div>
                      </div>
                      <div className="px-4 py-2.5 rounded-xl bg-[#F7F5F0] border border-[#E6E2D8] text-center">
                        <div className="font-serif font-bold text-lg text-[#C9A227]">
                          {totalCongregadosUnidade}
                        </div>
                        <div className="text-[10px] uppercase font-semibold text-[#5A5A5A]">
                          Congregados
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <Button
                        onClick={() => handleSolicitarRemoverCongregacao(currentInfo)}
                        variant="outline"
                        size="sm"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-xs font-semibold shadow-2xs h-9 px-3"
                        title={`Remover congregação ${currentInfo.nome}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                        Remover
                      </Button>
                    )}
                  </div>
                </div>

                {/* Informações Litúrgicas */}
                {(currentInfo.diasCulto || currentInfo.dirigenteGeral) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm bg-[#F7F5F0]/60 p-4 rounded-xl border border-[#E6E2D8]/80">
                    <div>
                      <strong className="text-[#1E3A5F] block font-serif mb-1">Dias de Culto:</strong>
                      <span className="text-[#5A5A5A]">{currentInfo.diasCulto || 'Não informado'}</span>
                    </div>
                    <div>
                      <strong className="text-[#1E3A5F] block font-serif mb-1">
                        Responsável Ministerial:
                      </strong>
                      <span className="text-[#5A5A5A]">{currentInfo.dirigenteGeral || 'Não informado'}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        {/* Mensagem de Erro com Botão Tentar Novamente */}
        {fetchError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-800 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                <strong>Erro ao sincronizar congregações:</strong> {fetchError}
              </span>
            </div>
            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
              className="border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-semibold"
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Barra de Pesquisa de Nomes */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar pelo nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-white border-[#E6E2D8] text-xs sm:text-sm rounded-xl"
            />
          </div>

          <div className="text-xs text-[#5A5A5A] self-end sm:self-center">
            {isAdmin ? (
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Modo Administrador Ativo — Adicione ou edite membros
              </span>
            ) : (
              <span>Exibição nominal para comunhão do corpo da igreja</span>
            )}
          </div>
        </div>

        {/* Listagens Nominais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-full overflow-hidden">
          {/* Coluna 1: Membros em Comunhão */}
          <Card className="border border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 sm:p-5 bg-[#1E3A5F] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#C9A227]" />
                  <h3 className="font-serif font-bold text-base">Membros em Comunhão</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-xs">
                    {membrosFiltrados.length}
                  </Badge>
                  {isAdmin && (
                    <Button
                      onClick={() => handleOpenCreate('membro')}
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white text-[11px] h-7 px-2"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </div>
              </div>

              <CardContent className="p-5">
                {loading ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-xs text-[#5A5A5A]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                    <span>Carregando membros...</span>
                  </div>
                ) : fetchError ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs text-rose-600">
                      Não foi possível carregar a lista de membros.
                    </p>
                    <Button
                      onClick={fetchData}
                      variant="outline"
                      size="sm"
                      className="text-xs border-[#C9A227] text-[#1E3A5F]"
                    >
                      Tentar novamente
                    </Button>
                  </div>
                ) : membrosFiltrados.length > 0 ? (
                  <div className="divide-y divide-[#E6E2D8]">
                    {membrosFiltrados.map((m, idx) => (
                      <div
                        key={m.id}
                        className="py-3 flex items-center justify-between gap-2 hover:bg-[#F7F5F0]/50 px-2 rounded-lg transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[11px] font-mono text-slate-400 w-6">
                            {(idx + 1).toString().padStart(2, '0')}.
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-medium text-[#1A1A1A] truncate">
                              {m.nome}
                            </h4>
                            {m.cargo && m.cargo !== 'Membro' && (
                              <Badge
                                variant="outline"
                                className="text-[9px] uppercase tracking-wider text-[#C9A227] border-[#C9A227]/40"
                              >
                                {m.cargo}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleOpenEditMembro(m)}
                              className="p-1.5 rounded text-[#1E3A5F] hover:bg-slate-100 transition"
                              title="Editar Membro"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeletingInfo({ id: m.id, nome: m.nome, type: 'membro' })
                              }
                              className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition"
                              title="Excluir Membro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-[#5A5A5A] italic">
                    Nenhum membro em comunhão encontrado para esta congregação.
                  </div>
                )}
              </CardContent>
            </div>
          </Card>

          {/* Coluna 2: Congregados & Visitantes Regulares */}
          <Card className="border border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#C9A227]" />
                  <h3 className="font-serif font-bold text-base">Congregados e Famílias</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-xs">
                    {congregadosFiltrados.length}
                  </Badge>
                  {isAdmin && (
                    <Button
                      onClick={() => handleOpenCreate('congregado')}
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white text-[11px] h-7 px-2"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </div>
              </div>

              <CardContent className="p-5">
                {loading ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-xs text-[#5A5A5A]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                    <span>Carregando congregados...</span>
                  </div>
                ) : fetchError ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs text-rose-600">
                      Não foi possível carregar os congregados.
                    </p>
                    <Button
                      onClick={fetchData}
                      variant="outline"
                      size="sm"
                      className="text-xs border-[#C9A227] text-[#1E3A5F]"
                    >
                      Tentar novamente
                    </Button>
                  </div>
                ) : congregadosFiltrados.length > 0 ? (
                  <div className="divide-y divide-[#E6E2D8]">
                    {congregadosFiltrados.map((c, idx) => (
                      <div
                        key={c.id}
                        className="py-3 flex items-center justify-between gap-2 hover:bg-[#F7F5F0]/50 px-2 rounded-lg transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[11px] font-mono text-slate-400 w-6">
                            {(idx + 1).toString().padStart(2, '0')}.
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-medium text-[#1A1A1A] truncate">
                              {c.nome}
                            </h4>
                            <span className="text-[10px] text-slate-400">Congregado</span>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleOpenEditCongregado(c)}
                              className="p-1.5 rounded text-[#1E3A5F] hover:bg-slate-100 transition"
                              title="Editar Congregado"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeletingInfo({ id: c.id, nome: c.nome, type: 'congregado' })
                              }
                              className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition"
                              title="Excluir Congregado"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-[#5A5A5A] italic">
                    Nenhum congregado cadastrado para esta unidade.
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        </div>
      </Tabs>

      {/* Modal Adicionar / Editar Membro ou Congregado */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              {editingPersonId
                ? `Editar ${personType === 'membro' ? 'Membro' : 'Congregado'}`
                : `Novo ${personType === 'membro' ? 'Membro' : 'Congregado'}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Preencha os dados e vincule à unidade congregacional correspondente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Tipo de Cadastro</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={personType === 'membro' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPersonType('membro')}
                  className={
                    personType === 'membro'
                      ? 'bg-[#1E3A5F] text-white'
                      : 'border-[#E6E2D8] text-slate-700'
                  }
                >
                  Membro em Comunhão
                </Button>
                <Button
                  type="button"
                  variant={personType === 'congregado' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPersonType('congregado')}
                  className={
                    personType === 'congregado'
                      ? 'bg-[#1E3A5F] text-white'
                      : 'border-[#E6E2D8] text-slate-700'
                  }
                >
                  Congregado
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Maria das Graças Silva"
                className="text-xs sm:text-sm h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Congregação</label>
                <select
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm"
                >
                  {listaCongregacoes.map((item) => (
                    <option key={item.id || item.nome} value={item.nome}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Telefone (opcional)</label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(88) 99999-9999"
                  className="text-xs sm:text-sm h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Nascimento</label>
                <Input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="text-xs sm:text-sm h-9"
                />
              </div>
            </div>

            {personType === 'membro' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Cargo / Função</label>
                <Input
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ex: Membro, Professora EBD, Líder"
                  className="text-xs sm:text-sm h-9"
                />
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#1E3A5F] text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Registro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Nova Congregação */}
      <Dialog open={isNovaCongregacaoModalOpen} onOpenChange={setIsNovaCongregacaoModalOpen}>
        <DialogContent className="max-w-lg bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-[#C9A227]/40 text-[#1E3A5F] flex items-center justify-center mx-auto mb-2">
              <Church className="w-6 h-6 text-[#C9A227]" />
            </div>
            <DialogTitle className="text-center font-serif text-xl font-bold text-[#1E3A5F]">
              Cadastrar Nova Congregação
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Adicione uma nova congregação/filial da sua igreja. Ela ficará imediatamente
              integrada ao sistema local para membros, obreiros e escalas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCriarCongregacao} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Nome da Congregação <span className="text-red-500">*</span>
              </label>
              <Input
                value={novaNome}
                onChange={(e) => setNovaNome(e.target.value)}
                placeholder="Ex: Congregação Lagoa Nova"
                required
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Título Litúrgico</label>
                <Input
                  value={novaTitulo}
                  onChange={(e) => setNovaTitulo(e.target.value)}
                  placeholder="Ex: Congregação ADTC Lagoa Nova"
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Subtítulo / Descritivo
                </label>
                <Input
                  value={novaSubtitulo}
                  onChange={(e) => setNovaSubtitulo(e.target.value)}
                  placeholder="Ex: Filial 4 • Comunidade Lagoa Nova"
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#C9A227]" />
                Endereço / Localização
              </label>
              <Input
                value={novaEndereco}
                onChange={(e) => setNovaEndereco(e.target.value)}
                placeholder="Ex: Estrada Principal, s/n, Centro"
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#C9A227]" />
                  Dias e Horários de Culto
                </label>
                <Input
                  value={novaDiasCulto}
                  onChange={(e) => setNovaDiasCulto(e.target.value)}
                  placeholder="Ex: Terça (19h00) e Domingo (19h00)"
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-[#C9A227]" />
                  Dirigente / Liderança Responsável
                </label>
                <Input
                  value={novaDirigente}
                  onChange={(e) => setNovaDirigente(e.target.value)}
                  placeholder="Ex: Diácono ou Presbítero Responsável"
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNovaCongregacaoModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingCongregacao}
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold"
              >
                {isSubmittingCongregacao ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </span>
                ) : (
                  'Salvar Nova Congregação'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Exclusão de Membro/Congregado */}
      <Dialog open={!!deletingInfo} onOpenChange={(open) => !open && setDeletingInfo(null)}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-serif text-lg text-[#1E3A5F]">
              Excluir {deletingInfo?.type === 'membro' ? 'Membro' : 'Congregado'}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Deseja realmente remover{' '}
              <strong className="text-slate-800">{deletingInfo?.nome}</strong> do registro
              eclesiástico?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingInfo(null)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleDeleteConfirm} className="bg-rose-600 text-white flex-1">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Exclusão de Congregação */}
      <Dialog
        open={!!deletingCongregacao}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingCongregacao(null)
          }
        }}
      >
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center font-serif text-xl font-bold text-rose-700">
              Remover Congregação
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A] pt-1">
              Deseja remover a congregação{' '}
              <strong className="text-slate-900 font-semibold">
                "{deletingCongregacao?.congregacao.nome}"
              </strong>{' '}
              do sistema local?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs text-slate-700">
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5 text-amber-900">
              <p className="text-[11px] leading-relaxed text-slate-600">
                🛡️ <strong>Segurança do cadastro:</strong> Membros e congregados vinculados a esta unidade não serão apagados; seus cadastros permanecerão intactos no banco local.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-[#E6E2D8]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingCongregacao(null)}
              disabled={isDeletingCongregacao}
              className="flex-1 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarExclusaoCongregacao}
              disabled={isDeletingCongregacao}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold flex-1 text-xs shadow-md"
            >
              {isDeletingCongregacao ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Removendo...
                </span>
              ) : (
                'Confirmar Remoção'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Congregacoes