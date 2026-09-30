import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  HeartHandshake,
  Search,
  UserPlus,
  Trash2,
  Calendar,
  Building2,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { Dizimista, Membro } from '@/types/adtc'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import useRealtime from '@/hooks/use-realtime'
import { useCongregacoes } from '@/hooks/useCongregacoes'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import { PlanilhaMensalView } from '@/components/PlanilhaMensalView'
import { Link, useSearchParams } from 'react-router-dom'

export function AdminDizimistas() {
  const { toast } = useToast()
  const { config } = useChurchConfig()
  const [searchParams, setSearchParams] = useSearchParams()
  const { congregacoes: listaCongregacoesDb } = useCongregacoes()

  const CONGREGACOES_DINAMICAS = useMemo(() => {
    const nomes = (listaCongregacoesDb || []).map((c) => c.nome.trim()).filter(Boolean)
    if (!nomes.includes('Sede')) {
      nomes.unshift('Sede')
    }
    return Array.from(new Set(nomes))
  }, [listaCongregacoesDb])

  // Aba principal da sessão Dizimistas: 'dizimistas' (lista) ou 'planilha' (Planilha Mensal de Entradas)
  const tabParam = searchParams.get('aba')
  const [abaSessao, setAbaSessao] = useState<'dizimistas' | 'planilha'>(
    tabParam === 'planilha' ? 'planilha' : 'dizimistas',
  )

  const mudarAbaSessao = (novaAba: 'dizimistas' | 'planilha') => {
    setAbaSessao(novaAba)
    if (novaAba === 'planilha') {
      setSearchParams({ aba: 'planilha' })
    } else {
      setSearchParams({})
    }
  }

  const [dizimistas, setDizimistas] = useState<Dizimista[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [membrosCadastrados, setMembrosCadastrados] = useState<Membro[]>([])

  const carregarDizimistas = useCallback(async () => {
    try {
      const records = await pb.collection('dizimistas').getFullList<Dizimista>({
        sort: '-created',
        expand: 'membro',
      })
      setDizimistas(records)
      setError(null)
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar dizimistas')
    } finally {
      setLoading(false)
    }
  }, [])

  const carregarMembros = useCallback(async () => {
    try {
      const records = await pb.collection('membros').getFullList<Membro>({
        sort: 'nome',
      })
      setMembrosCadastrados(records)
    } catch {
      /* intentionally ignored */
    }
  }, [])

  useEffect(() => {
    carregarDizimistas()
    carregarMembros()
  }, [carregarDizimistas, carregarMembros])

  useRealtime<Dizimista>('dizimistas', () => {
    carregarDizimistas()
  })

  useRealtime<Membro>('membros', () => {
    carregarMembros()
  })

  // Estados de filtro da listagem
  const [busca, setBusca] = useState('')
  const [filtroCongregacao, setFiltroCongregacao] = useState<string>('todas')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos') // 'todos', 'ativos', 'inativos'

  // Modal para Adicionar Dizimista
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Estado do formulário de inclusão
  const [membroBuscaTexto, setMembroBuscaTexto] = useState('')
  const [membroSelecionado, setMembroSelecionado] = useState<Membro | null>(null)
  const [congregacaoManual, setCongregacaoManual] = useState<string>('Sede')
  const [mesReferencia, setMesReferencia] = useState('')

  // Alternativa de cadastro livre se não encontrar o membro
  const [modoCadastroLivre, setModoCadastroLivre] = useState(false)
  const [nomeLivre, setNomeLivre] = useState('')

  // Modal de confirmação de exclusão / inativação
  const [dizimistaParaRemover, setDizimistaParaRemover] = useState<Dizimista | null>(null)

  // Lista completa de membros ativos para o seletor (com ou sem filtro de busca digitado)
  const membrosFiltradosParaSelecao = useMemo(() => {
    const lista = (membrosCadastrados || []).filter((m) => {
      const s = (m.status || 'Ativo').toLowerCase()
      return s.includes('ativo') && !s.includes('inativo') && !s.includes('falecido')
    })

    if (!membroBuscaTexto.trim()) {
      return lista
    }

    const termo = membroBuscaTexto.toLowerCase().trim()
    const termoNumeros = termo.replace(/\D/g, '')

    return lista.filter((m) => {
      const nomeOk = m.nome?.toLowerCase().includes(termo)
      const fichaOk =
        m.numero_ficha?.toLowerCase().includes(termo) ||
        m.numero_registro?.toLowerCase().includes(termo)
      const congOk = m.congregacao?.toLowerCase().includes(termo)
      const cpfOk = termoNumeros && m.cpf ? m.cpf.replace(/\D/g, '').includes(termoNumeros) : false
      return nomeOk || fichaOk || congOk || cpfOk
    })
  }, [membrosCadastrados, membroBuscaTexto])

  // Filtragem dos dizimistas exibidos na tabela
  const dizimistasFiltrados = useMemo(() => {
    return (dizimistas || []).filter((d) => {
      const nomeExibicao = d.expand?.membro?.nome || d.nome || ''
      const bateBusca =
        !busca.trim() ||
        nomeExibicao.toLowerCase().includes(busca.toLowerCase().trim()) ||
        (d.congregacao && d.congregacao.toLowerCase().includes(busca.toLowerCase().trim()))

      const bateCongregacao = filtroCongregacao === 'todas' || d.congregacao === filtroCongregacao

      const isAtivo = d.ativo !== false
      const bateStatus =
        filtroStatus === 'todos' ||
        (filtroStatus === 'ativos' && isAtivo) ||
        (filtroStatus === 'inativos' && !isAtivo)

      return bateBusca && bateCongregacao && bateStatus
    })
  }, [dizimistas, busca, filtroCongregacao, filtroStatus])

  // Métricas
  const totalDizimistas = dizimistas?.length || 0
  const totalAtivos = dizimistas?.filter((d) => d.ativo !== false).length || 0
  const totalInativos = totalDizimistas - totalAtivos

  // Abrir modal de inclusão
  const abrirModalInclusao = () => {
    setMembroBuscaTexto('')
    setMembroSelecionado(null)
    setModoCadastroLivre(false)
    setNomeLivre('')
    setCongregacaoManual('Sede')
    setMesReferencia('')
    setModalAberto(true)
  }

  // Selecionar membro da lista de sugestões
  const selecionarMembro = (m: Membro) => {
    setMembroSelecionado(m)
    setMembroBuscaTexto(m.nome)
    if (m.congregacao) {
      setCongregacaoManual(m.congregacao)
    }
  }

  // Salvar novo dizimista
  const handleSalvarDizimista = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    try {
      let nomeFinal = ''
      let membroIdFinal: string | null = null
      let congregacaoFinal: string = congregacaoManual

      if (modoCadastroLivre) {
        if (!nomeLivre.trim()) {
          throw new Error('Informe o nome do dizimista.')
        }
        nomeFinal = nomeLivre.trim()
      } else {
        if (!membroSelecionado) {
          throw new Error('Selecione um membro ativo da lista ou ative a opção de cadastro avulso.')
        }
        nomeFinal = membroSelecionado.nome
        membroIdFinal = membroSelecionado.id
        if (membroSelecionado.congregacao) {
          congregacaoFinal = membroSelecionado.congregacao
        }
      }

      // Verifica se o membro já está cadastrado como dizimista
      if (membroIdFinal) {
        const jaExiste = dizimistas?.find((d) => d.membro === membroIdFinal)
        if (jaExiste) {
          // Se já existe e estava inativo, apenas reativa
          if (jaExiste.ativo === false) {
            await pb.collection('dizimistas').update(jaExiste.id, {
              ativo: true,
              congregacao: congregacaoFinal,
              mes_referencia: mesReferencia.trim() || 'Permanente',
            })
            toast({
              title: 'Dizimista reativado!',
              description: `${nomeFinal} foi reativado na lista de dizimistas. O cadastro do membro foi preservado intacto.`,
            })
            setModalAberto(false)
            return
          }
          throw new Error('Este membro já consta como dizimista ativo.')
        }
      }

      await pb.collection('dizimistas').create({
        nome: nomeFinal,
        membro: membroIdFinal || null,
        congregacao: congregacaoFinal,
        mes_referencia: mesReferencia.trim() || 'Permanente',
        ativo: true,
      })

      toast({
        title: 'Dizimista adicionado!',
        description: `${nomeFinal} agora faz parte da lista de dizimistas ativos da ${config.siglaIgreja || config.nomeIgreja || 'igreja'}.`,
      })

      setModalAberto(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar',
        description: err?.message || 'Verifique os dados e tente novamente.',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Alternar status ativo/inativo (remover da sessão Dizimistas sem alterar o membro)
  const handleToggleAtivo = async (dizimista: Dizimista) => {
    const novoStatus = dizimista.ativo === false ? true : false
    const nome = dizimista.expand?.membro?.nome || dizimista.nome
    try {
      await pb.collection('dizimistas').update(dizimista.id, {
        ativo: novoStatus,
      })
      toast({
        title: novoStatus ? 'Dizimista reativado' : 'Membro removido dos Dizimistas',
        description: novoStatus
          ? `${nome} agora está ativo como dizimista.`
          : `${nome} foi marcado como inativo na lista de dizimistas. O cadastro do membro continua 100% preservado.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar situação',
        description: err?.message || 'Tente novamente.',
      })
    }
  }

  // Excluir registro do dizimista em definitivo (NUNCA afeta a tabela de membros)
  const handleExcluirDizimista = async () => {
    if (!dizimistaParaRemover) return
    const nome = dizimistaParaRemover.expand?.membro?.nome || dizimistaParaRemover.nome

    try {
      await pb.collection('dizimistas').delete(dizimistaParaRemover.id)
      toast({
        title: 'Registro removido',
        description: `${nome} foi retirado da lista de dizimistas. O cadastro do membro permanece inalterado.`,
      })
      setDizimistaParaRemover(null)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: err?.message || 'Tente novamente.',
      })
    }
  }

  // Exportar lista para CSV
  const handleExportarCsv = () => {
    if (!dizimistasFiltrados.length) {
      toast({
        variant: 'destructive',
        title: 'Lista vazia',
        description: 'Não há registros para exportar com os filtros atuais.',
      })
      return
    }

    const cabecalho = 'Nome;Congregação;Status Dizimista;Vinculado a Membro;Mês/Período\n'
    const linhas = dizimistasFiltrados
      .map((d) => {
        const nome = (d.expand?.membro?.nome || d.nome || '').replace(/;/g, ',')
        const cong = (d.congregacao || '').replace(/;/g, ',')
        const status = d.ativo !== false ? 'Ativo' : 'Inativo'
        const vinculado = d.membro ? 'Sim' : 'Registro Avulso'
        const mes = (d.mes_referencia || 'Permanente').replace(/;/g, ',')
        return `"${nome}";"${cong}";"${status}";"${vinculado}";"${mes}"`
      })
      .join('\n')

    const blob = new Blob(['\uFEFF' + cabecalho + linhas], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dizimistas_adtc_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: 'Relatório exportado!',
      description: `${dizimistasFiltrados.length} dizimista(s) exportado(s) em CSV.`,
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E2D8] pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1E3A5F] flex items-center gap-2.5">
            <HeartHandshake className="w-7 h-7 text-[#C9A227]" />
            Sessão Dizimistas & Tesouraria
          </h1>
          <p className="text-xs sm:text-sm text-[#5A5A5A] mt-1">
            Gestão de dizimistas ativos da igreja e Planilha Mensal Oficial de Entradas e Saídas
            frente e verso.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {abaSessao === 'dizimistas' && (
            <>
              <Button
                onClick={handleExportarCsv}
                variant="outline"
                size="sm"
                className="border-[#E6E2D8] text-xs font-semibold hover:bg-slate-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Exportar CSV
              </Button>

              <Button
                onClick={abrirModalInclusao}
                size="sm"
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold shadow-sm"
              >
                <UserPlus className="w-4 h-4 mr-1.5 text-[#C9A227]" />
                Adicionar Dizimista
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ABAS SUPERIORES DA SESSÃO */}
      <div className="flex items-center gap-2 border-b border-[#E6E2D8] pb-1">
        <button
          type="button"
          onClick={() => mudarAbaSessao('dizimistas')}
          className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 border-b-2 ${
            abaSessao === 'dizimistas'
              ? 'border-[#C9A227] text-[#1E3A5F] bg-white shadow-2xs font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-[#C9A227]" />
          <span>Dizimistas Ativos ({totalAtivos})</span>
        </button>

        <button
          type="button"
          onClick={() => mudarAbaSessao('planilha')}
          className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 border-b-2 ${
            abaSessao === 'planilha'
              ? 'border-[#C9A227] text-[#1E3A5F] bg-white shadow-2xs font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Planilha Mensal de Entradas</span>
          <Badge className="bg-[#1E3A5F] text-white text-[9px] px-1.5 py-0">Modelo Oficial</Badge>
        </button>
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL CONFORME A ABA SELECIONADA */}
      {abaSessao === 'planilha' ? (
        <PlanilhaMensalView />
      ) : (
        <>
          {/* Cartões de Indicadores */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-[#E6E2D8] bg-white shadow-2xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center text-[#1E3A5F]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-[#5A5A5A] uppercase tracking-wider font-semibold">
                    Total na Sessão
                  </p>
                  <p className="text-xl font-bold font-serif text-[#1E3A5F]">
                    {loading ? '—' : totalDizimistas}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#E6E2D8] bg-white shadow-2xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-emerald-700 uppercase tracking-wider font-semibold">
                    Dizimistas Ativos
                  </p>
                  <p className="text-xl font-bold font-serif text-emerald-700">
                    {loading ? '—' : totalAtivos}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#E6E2D8] bg-white shadow-2xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-600 uppercase tracking-wider font-semibold">
                    Inativos / Removidos
                  </p>
                  <p className="text-xl font-bold font-serif text-slate-700">
                    {loading ? '—' : totalInativos}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barra de Filtros e Busca */}
          <Card className="border-[#E6E2D8] bg-white shadow-2xs">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Campo de Busca */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome ou congregação..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-9 text-xs sm:text-sm bg-white border-[#E6E2D8]"
                  />
                </div>

                {/* Filtro de Congregação */}
                <Select value={filtroCongregacao} onValueChange={setFiltroCongregacao}>
                  <SelectTrigger className="text-xs sm:text-sm bg-white border-[#E6E2D8]">
                    <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    <SelectValue placeholder="Todas as Congregações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Congregações</SelectItem>
                    {CONGREGACOES_DINAMICAS.map((cong) => (
                      <SelectItem key={cong} value={cong}>
                        {cong}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filtro de Situação */}
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="text-xs sm:text-sm bg-white border-[#E6E2D8]">
                    <HeartHandshake className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    <SelectValue placeholder="Situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos (Ativos e Inativos)</SelectItem>
                    <SelectItem value="ativos">Somente Ativos</SelectItem>
                    <SelectItem value="inativos">Somente Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Aviso informativo de preservação do membro */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-[#1E3A5F] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#1E3A5F] flex-shrink-0" />
            <span>
              <strong>Como funciona:</strong> Ao inativar ou remover um dizimista desta lista, o
              cadastro do membro em <em>Membros</em> <strong>não</strong> é afetado nem excluído. Os
              dados servem para controle e prestação de contas da tesouraria local.
            </span>
          </div>

          {/* Lista / Tabela de Dizimistas */}
          <Card className="border-[#E6E2D8] bg-white shadow-2xs overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  Carregando dizimistas...
                </div>
              ) : error ? (
                <div className="p-12 text-center text-xs text-rose-500">
                  Erro ao carregar dados dos dizimistas.
                </div>
              ) : dizimistasFiltrados.length === 0 ? (
                <div className="p-12 text-center">
                  <HeartHandshake className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    Nenhum dizimista encontrado
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {busca || filtroCongregacao !== 'todas' || filtroStatus !== 'todos'
                      ? 'Tente ajustar os filtros de busca acima.'
                      : 'Clique no botão acima para adicionar o primeiro membro dizimista.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E2D8] bg-[#F7F5F0] text-[#1E3A5F] font-serif font-bold text-xs uppercase tracking-wider">
                        <th className="py-3 px-4">Dizimista</th>
                        <th className="py-3 px-4">Congregação</th>
                        <th className="py-3 px-4">Referência / Vínculo</th>
                        <th className="py-3 px-4 text-center">Situação Dizimista</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2D8]">
                      {dizimistasFiltrados.map((d) => {
                        const membroRel = d.expand?.membro
                        const nomeFinal = membroRel?.nome || d.nome || 'Sem nome'
                        const isAtivo = d.ativo !== false

                        const fotoUrl = membroRel?.foto
                          ? pb.files.getURL(membroRel, membroRel.foto)
                          : null

                        return (
                          <tr
                            key={d.id}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              !isAtivo ? 'opacity-65 bg-slate-50/40' : ''
                            }`}
                          >
                            {/* Dizimista (com foto do membro se houver) */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-9 h-9 border border-[#E6E2D8] bg-[#1E3A5F]/5">
                                  {fotoUrl ? (
                                    <AvatarImage
                                      src={fotoUrl}
                                      alt={nomeFinal}
                                      className="object-cover"
                                    />
                                  ) : null}
                                  <AvatarFallback className="text-xs font-bold text-[#1E3A5F] bg-[#1E3A5F]/10">
                                    {nomeFinal.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>

                                <div>
                                  <span className="font-semibold text-[#1E3A5F] block">
                                    {nomeFinal}
                                  </span>
                                  {membroRel ? (
                                    <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                                      <CheckCircle2 className="w-3 h-3" /> Membro cadastrado
                                      {membroRel.cpf
                                        ? ` • CPF: ${membroRel.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`
                                        : ''}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">
                                      Registro manual avulso
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Congregação */}
                            <td className="py-3 px-4 text-slate-700">
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {d.congregacao || 'Sede'}
                              </span>
                            </td>

                            {/* Mês / Período */}
                            <td className="py-3 px-4 text-slate-600">
                              <span className="inline-flex items-center gap-1 text-xs">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {d.mes_referencia || 'Permanente'}
                              </span>
                            </td>

                            {/* Situação Dizimista */}
                            <td className="py-3 px-4 text-center">
                              {isAtivo ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px] font-semibold">
                                  Ativo
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[11px] font-semibold">
                                  Inativo
                                </Badge>
                              )}
                            </td>

                            {/* Ações */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Botão de Toggle: Ativar / Inativar sem tocar no Membro */}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleAtivo(d)}
                                  className={`h-7 px-2.5 text-xs font-semibold ${
                                    isAtivo
                                      ? 'text-amber-700 hover:text-amber-800 hover:bg-amber-50'
                                      : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'
                                  }`}
                                  title={
                                    isAtivo
                                      ? 'Remover dizimista da lista ativa (não afeta o cadastro de membro)'
                                      : 'Reativar dizimista'
                                  }
                                >
                                  {isAtivo ? 'Desativar' : 'Reativar'}
                                </Button>

                                {/* Botão de Excluir o registro de dizimista */}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDizimistaParaRemover(d)}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  title="Excluir este registro de dizimista"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ======================================================== */}
          {/* MODAL: ADICIONAR NOVO DIZIMISTA COM BUSCA DE MEMBROS */}
          {/* ======================================================== */}
          <Dialog open={modalAberto} onOpenChange={setModalAberto}>
            <DialogContent className="w-[95vw] sm:max-w-lg bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader className="border-b border-[#E6E2D8] pb-3">
                <DialogTitle className="font-serif text-lg font-bold text-[#1E3A5F] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#C9A227]" />
                  Adicionar Membro Dizimista
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5A5A5A]">
                  Selecione o membro ativo na lista oficial da{' '}
                  {config.siglaIgreja || config.nomeIgreja || 'igreja'} para vincular ao registro de
                  dizimista.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSalvarDizimista} className="space-y-4 py-2">
                {!modoCadastroLivre ? (
                  /* MODO PADRÃO: SELETOR DE MEMBRO ATIVO IDÊNTICO AO DE EXPEDIÇÃO DE CARTAS */
                  <div className="space-y-3">
                    {/* Seletor dropdown completo (estilo expedição de cartas /admin/documentos) */}
                    <div className="p-3.5 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#1E3A5F] flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-[#C9A227]" />
                          Selecione o Membro Cadastrado no Banco *
                        </label>
                        <span className="text-[10px] text-slate-500">
                          {membrosCadastrados?.length || 0} membros ativos
                        </span>
                      </div>

                      <select
                        value={membroSelecionado?.id || ''}
                        onChange={(e) => {
                          const selectedId = e.target.value
                          const m = (membrosCadastrados || []).find(
                            (item) => item.id === selectedId,
                          )
                          if (m) {
                            selecionarMembro(m)
                          } else {
                            setMembroSelecionado(null)
                          }
                        }}
                        className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm focus:ring-2 focus:ring-[#C9A227] text-slate-800 font-medium"
                      >
                        <option value="">Clique aqui para escolher da lista completa...</option>
                        {(membrosCadastrados || []).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome} ({m.congregacao || config.siglaIgreja || 'Sede'}) — Nº Ficha:{' '}
                            {m.numero_ficha || m.numero_registro || 'S/N'}
                          </option>
                        ))}
                      </select>

                      {/* Campo de busca rápida para filtrar a lista e clicar no nome */}
                      <div className="pt-1 space-y-1.5">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                          <Input
                            placeholder="Ou busque digitando o nome para filtrar e clicar..."
                            value={membroBuscaTexto}
                            onChange={(e) => setMembroBuscaTexto(e.target.value)}
                            className="pl-8 h-8 text-xs bg-white border-[#E6E2D8]"
                          />
                        </div>

                        {/* Lista com scroll para busca rápida */}
                        {membroBuscaTexto.trim() && (
                          <div className="max-h-44 overflow-y-auto border border-[#E6E2D8] rounded-lg bg-white shadow-xs divide-y divide-slate-100">
                            {membrosFiltradosParaSelecao.length > 0 ? (
                              membrosFiltradosParaSelecao.map((m) => {
                                const isSelected = membroSelecionado?.id === m.id
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => selecionarMembro(m)}
                                    className={`w-full p-2 text-left transition flex items-center justify-between ${
                                      isSelected ? 'bg-emerald-50' : 'hover:bg-[#F7F5F0]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Avatar className="w-6 h-6 border border-[#E6E2D8]">
                                        {m.foto ? (
                                          <AvatarImage
                                            src={pb.files.getURL(m, m.foto)}
                                            alt={m.nome}
                                          />
                                        ) : null}
                                        <AvatarFallback className="text-[9px] font-bold text-[#1E3A5F]">
                                          {m.nome.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-[#1E3A5F] truncate">
                                          {m.nome}
                                        </p>
                                        <p className="text-[10px] text-slate-500 truncate">
                                          {m.congregacao || 'Sede'} • Ficha:{' '}
                                          {m.numero_ficha || m.numero_registro || 'S/N'}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] ${
                                        isSelected
                                          ? 'bg-emerald-600 text-white border-emerald-600'
                                          : 'text-[#1E3A5F] border-[#1E3A5F]/20'
                                      }`}
                                    >
                                      {isSelected ? 'Selecionado' : 'Selecionar'}
                                    </Badge>
                                  </button>
                                )
                              })
                            ) : (
                              <div className="p-3 text-center text-xs text-slate-400">
                                Nenhum membro ativo encontrado com este nome.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card de confirmação do membro selecionado */}
                    {membroSelecionado && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border-2 border-emerald-300">
                            {membroSelecionado.foto ? (
                              <AvatarImage
                                src={pb.files.getURL(membroSelecionado, membroSelecionado.foto)}
                                alt={membroSelecionado.nome}
                              />
                            ) : null}
                            <AvatarFallback className="text-xs font-bold text-emerald-800 bg-emerald-100">
                              {membroSelecionado.nome.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <strong className="text-xs text-emerald-950">
                                {membroSelecionado.nome}
                              </strong>
                            </div>
                            <p className="text-[11px] text-emerald-700">
                              {membroSelecionado.congregacao || 'Sede'} • Ficha:{' '}
                              {membroSelecionado.numero_ficha ||
                                membroSelecionado.numero_registro ||
                                'S/N'}
                              {membroSelecionado.cpf ? ` • CPF: ${membroSelecionado.cpf}` : ''}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMembroSelecionado(null)
                            setMembroBuscaTexto('')
                          }}
                          className="text-xs text-slate-500 hover:text-slate-800 h-7"
                        >
                          Trocar
                        </Button>
                      </div>
                    )}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setModoCadastroLivre(true)
                          setNomeLivre(membroBuscaTexto)
                        }}
                        className="text-[11px] text-[#1E3A5F] hover:underline flex items-center gap-1 font-semibold"
                      >
                        Não encontrou o membro? Clique aqui para cadastrar dizimista de forma
                        avulsa.
                      </button>
                    </div>
                  </div>
                ) : (
                  /* MODO AVULSO: CADASTRO LIVRE POR NOME */
                  <div className="space-y-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900">
                        Cadastro Avulso (Sem vínculo a membro)
                      </span>
                      <button
                        type="button"
                        onClick={() => setModoCadastroLivre(false)}
                        className="text-[11px] text-[#1E3A5F] hover:underline font-semibold"
                      >
                        Voltar para seleção de membro
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Nome Completo do Dizimista *
                      </label>
                      <Input
                        placeholder="Ex: Maria das Graças Portela"
                        value={nomeLivre}
                        onChange={(e) => setNomeLivre(e.target.value)}
                        className="text-xs sm:text-sm bg-white"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Congregação */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1E3A5F]">Congregação</label>
                  <Select
                    value={congregacaoManual}
                    onValueChange={(val) => setCongregacaoManual(val)}
                  >
                    <SelectTrigger className="text-xs sm:text-sm bg-white border-[#E6E2D8]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONGREGACOES_DINAMICAS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>{' '}
                </div>

                {/* Mês / Período de Referência */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#1E3A5F]">
                      Período ou Mês de Referência (Opcional)
                    </label>
                    <span className="text-[10px] text-slate-400">Padrão: Permanente</span>
                  </div>
                  <Input
                    placeholder="Em branco = Permanente (ou ex: Março de 2025)"
                    value={mesReferencia}
                    onChange={(e) => setMesReferencia(e.target.value)}
                    className="text-xs sm:text-sm bg-white border-[#E6E2D8]"
                  />
                  <p className="text-[11px] text-slate-500">
                    Se deixar em branco no celular, o sistema grava automaticamente como Dizimista
                    Permanente.
                  </p>
                </div>

                <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalAberto(false)}
                    disabled={salvando}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={salvando || (!modoCadastroLivre && !membroSelecionado)}
                    className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold"
                  >
                    {salvando ? 'Salvando...' : 'Adicionar Dizimista'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* ======================================================== */}
          {/* MODAL: CONFIRMAR EXCLUSÃO DO REGISTRO DE DIZIMISTA */}
          {/* ======================================================== */}
          <Dialog
            open={Boolean(dizimistaParaRemover)}
            onOpenChange={(aberto) => !aberto && setDizimistaParaRemover(null)}
          >
            <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
              <DialogHeader className="border-b border-[#E6E2D8] pb-3">
                <DialogTitle className="font-serif text-lg font-bold text-rose-700 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Remover da Lista de Dizimistas
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5A5A5A]">
                  Confirma a exclusão de{' '}
                  <strong>
                    {dizimistaParaRemover?.expand?.membro?.nome || dizimistaParaRemover?.nome}
                  </strong>{' '}
                  desta sessão?
                </DialogDescription>
              </DialogHeader>

              <div className="py-2 text-xs text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                <strong>Atenção:</strong> Esta ação remove apenas a vinculação deste membro como
                dizimista. A ficha e o cadastro do membro em <em>Membros</em> continuam 100%
                preservados no banco de dados.
              </div>

              <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDizimistaParaRemover(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleExcluirDizimista}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  Confirmar Remoção
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

export default AdminDizimistas
