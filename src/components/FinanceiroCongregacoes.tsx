import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { localDb } from '@/lib/localDb'
import { useCongregacoes } from '@/hooks/useCongregacoes'
import { useToast } from '@/hooks/use-toast'
import type { MovimentacaoFinanceiroCongregacao, TipoMovimentacaoCongregacao } from '@/types/adtc'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Plus,
  Trash2,
  Edit2,
  Search,
  Calendar,
  Send,
  Loader2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react'
import { formatarMoeda } from '@/lib/planilhaMensalPdf'
import { formatarDataBr } from '@/lib/utils'

export const FinanceiroCongregacoes: React.FC = () => {
  const { toast } = useToast()
  const { congregacoes, nomes: nomesCongregacoesRaw, loading: loadingCongs } = useCongregacoes()

  // Lista dinâmica de unidades, com fallback 'Sede' se ainda não constar
  const unidades = useMemo(() => {
    const lista = (nomesCongregacoesRaw || []).map((n) => n.trim()).filter(Boolean)
    if (!lista.includes('Sede')) {
      lista.unshift('Sede')
    }
    return Array.from(new Set(lista))
  }, [nomesCongregacoesRaw])

  // Unidade atualmente selecionada
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>('Sede')

  // Movimentações
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoFinanceiroCongregacao[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoMovimentacaoCongregacao>('todos')
  const [busca, setBusca] = useState('')
  const [filtroMes, setFiltroMes] = useState<string>('todos')

  // Modal Novo / Edição
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [itemEdicao, setItemEdicao] = useState<MovimentacaoFinanceiroCongregacao | null>(null)

  // Formulário
  const [tipo, setTipo] = useState<TipoMovimentacaoCongregacao>('entrada')
  const [valorTexto, setValorTexto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataMovimentacao, setDataMovimentacao] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [categoria, setCategoria] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // Modal Exclusão
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [itemExclusao, setItemExclusao] = useState<MovimentacaoFinanceiroCongregacao | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  // Carrega movimentações da unidade selecionada do localDb
  const carregarMovimentacoes = useCallback(async () => {
    setLoading(true)
    try {
      const records = await localDb.getFullList<MovimentacaoFinanceiroCongregacao>(
        'financeiro_congregacoes',
        {
          sort: '-data,-created',
        },
      )
      setMovimentacoes(records)
    } catch (err) {
      console.error('Erro ao carregar movimentações:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as movimentações financeiras.',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    carregarMovimentacoes()
  }, [carregarMovimentacoes])

  // Garante que se a lista carregar e a unidade selecionada não existir, use a primeira
  useEffect(() => {
    if (unidades.length > 0 && !unidades.includes(unidadeSelecionada)) {
      setUnidadeSelecionada(unidades[0])
    }
  }, [unidades, unidadeSelecionada])

  // Filtragem das movimentações para a unidade selecionada
  const movimentacoesDaUnidade = useMemo(() => {
    return movimentacoes.filter((m) => {
      const mCong = (m.congregacao || '').trim().toLowerCase()
      const uSel = unidadeSelecionada.trim().toLowerCase()
      if (uSel === 'sede') {
        return mCong === 'sede' || mCong === ''
      }
      return mCong === uSel
    })
  }, [movimentacoes, unidadeSelecionada])

  // Filtragem visual (tipo, busca, mês)
  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoesDaUnidade.filter((m) => {
      if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) {
        return false
      }

      if (filtroMes !== 'todos') {
        const mMes = (m.data || '').slice(0, 7) // YYYY-MM
        if (mMes !== filtroMes) return false
      }

      if (busca.trim()) {
        const t = busca.toLowerCase().trim()
        const matchDesc = (m.descricao || '').toLowerCase().includes(t)
        const matchCat = (m.categoria || '').toLowerCase().includes(t)
        const matchResp = (m.responsavel || '').toLowerCase().includes(t)
        if (!matchDesc && !matchCat && !matchResp) return false
      }

      return true
    })
  }, [movimentacoesDaUnidade, filtroTipo, filtroMes, busca])

  // Resumo financeiro consolidado da unidade selecionada
  const resumo = useMemo(() => {
    let totalEntradas = 0
    let totalSaidas = 0
    let totalEnviadoSede = 0

    movimentacoesDaUnidade.forEach((m) => {
      const val = typeof m.valor === 'number' && !isNaN(m.valor) ? m.valor : 0
      if (m.tipo === 'entrada') {
        totalEntradas += val
      } else if (m.tipo === 'saida') {
        totalSaidas += val
      } else if (m.tipo === 'repasse_sede') {
        totalEnviadoSede += val
      }
    })

    // Saldo da congregação = Entradas - Saídas - Repasse enviado à Sede
    const saldoLiquido = Math.round((totalEntradas - totalSaidas - totalEnviadoSede) * 100) / 100

    return {
      totalEntradas: Math.round(totalEntradas * 100) / 100,
      totalSaidas: Math.round(totalSaidas * 100) / 100,
      totalEnviadoSede: Math.round(totalEnviadoSede * 100) / 100,
      saldoLiquido,
    }
  }, [movimentacoesDaUnidade])

  // Lista de meses disponíveis para filtro a partir dos dados existentes
  const mesesDisponiveis = useMemo(() => {
    const setMeses = new Set<string>()
    movimentacoesDaUnidade.forEach((m) => {
      if (m.data && m.data.length >= 7) {
        setMeses.add(m.data.slice(0, 7))
      }
    })
    return Array.from(setMeses).sort().reverse()
  }, [movimentacoesDaUnidade])

  const abrirModalNovo = (tipoInicial: TipoMovimentacaoCongregacao = 'entrada') => {
    setItemEdicao(null)
    setTipo(tipoInicial)
    setValorTexto('')
    setDescricao('')
    setDataMovimentacao(new Date().toISOString().slice(0, 10))
    setCategoria('')
    setResponsavel('')
    setObservacoes('')
    setModalAberto(true)
  }

  const abrirModalEditar = (item: MovimentacaoFinanceiroCongregacao) => {
    setItemEdicao(item)
    setTipo(item.tipo)
    setValorTexto(item.valor ? item.valor.toString().replace('.', ',') : '')
    setDescricao(item.descricao || '')
    setDataMovimentacao(item.data || new Date().toISOString().slice(0, 10))
    setCategoria(item.categoria || '')
    setResponsavel(item.responsavel || '')
    setObservacoes(item.observacoes || '')
    setModalAberto(true)
  }

  const abrirModalExcluir = (item: MovimentacaoFinanceiroCongregacao) => {
    setItemExclusao(item)
    setModalExcluirAberto(true)
  }

  const parseValor = (txt: string): number => {
    if (!txt) return 0
    const str = txt.trim()
    // Se possui vírgula como decimal (ex: "1.250,50" ou "50,00")
    if (str.includes(',')) {
      const limpo = str.replace(/\./g, '').replace(',', '.')
      const n = parseFloat(limpo)
      return isNaN(n) ? 0 : Math.max(0, Math.round(n * 100) / 100)
    }
    // Caso contrário (ex: "50" ou "50.50")
    const n = parseFloat(str)
    return isNaN(n) ? 0 : Math.max(0, Math.round(n * 100) / 100)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()

    const valorNum = parseValor(valorTexto)
    if (valorNum <= 0) {
      toast({
        variant: 'destructive',
        title: 'Valor inválido',
        description: 'Informe um valor maior que zero.',
      })
      return
    }

    if (!descricao.trim()) {
      toast({
        variant: 'destructive',
        title: 'Descrição obrigatória',
        description: 'Informe a descrição do lançamento.',
      })
      return
    }

    setSalvando(true)
    try {
      const payload: MovimentacaoFinanceiroCongregacao = {
        id: itemEdicao?.id || localDb.generateId(),
        congregacao: unidadeSelecionada,
        tipo,
        valor: valorNum,
        descricao: descricao.trim(),
        data: dataMovimentacao || new Date().toISOString().slice(0, 10),
        categoria: categoria.trim() || undefined,
        responsavel: responsavel.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      }

      if (itemEdicao?.id) {
        await localDb.update('financeiro_congregacoes', itemEdicao.id, payload)
        toast({
          title: 'Lançamento atualizado!',
          description: `Movimentação salva para ${unidadeSelecionada}.`,
        })
      } else {
        await localDb.create('financeiro_congregacoes', payload)
        toast({
          title: 'Lançamento registrado!',
          description: `Novo lançamento adicionado para ${unidadeSelecionada}.`,
        })
      }

      setModalAberto(false)
      await carregarMovimentacoes()
    } catch (err: any) {
      console.error('Erro ao salvar movimentação:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    if (!itemExclusao?.id) return
    setExcluindo(true)
    try {
      await localDb.delete('financeiro_congregacoes', itemExclusao.id)
      toast({
        title: 'Lançamento excluído',
        description: 'O registro foi removido com sucesso.',
      })
      setModalExcluirAberto(false)
      setItemExclusao(null)
      await carregarMovimentacoes()
    } catch (err: any) {
      console.error('Erro ao excluir lançamento:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setExcluindo(false)
    }
  }

  // Exportar histórico da congregação em CSV
  const handleExportarCsv = () => {
    if (movimentacoesFiltradas.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nada para exportar',
        description: 'Não há movimentações para exportar com os filtros atuais.',
      })
      return
    }

    const cabecalho = 'Data;Unidade;Tipo;Descrição;Categoria;Responsável;Valor (R$);Observações\n'
    const linhas = movimentacoesFiltradas
      .map((m) => {
        const d = m.data ? formatarDataBr(m.data) : ''
        const tipoLabel =
          m.tipo === 'entrada'
            ? 'Entrada'
            : m.tipo === 'saida'
              ? 'Saída / Despesa'
              : 'Enviado à Sede'
        const desc = (m.descricao || '').replace(/;/g, ',')
        const cat = (m.categoria || '').replace(/;/g, ',')
        const resp = (m.responsavel || '').replace(/;/g, ',')
        const val = m.valor.toFixed(2).replace('.', ',')
        const obs = (m.observacoes || '').replace(/;/g, ',')
        return `"${d}";"${m.congregacao}";"${tipoLabel}";"${desc}";"${cat}";"${resp}";"${val}";"${obs}"`
      })
      .join('\n')

    const blob = new Blob(['\uFEFF' + cabecalho + linhas], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `financeiro_${unidadeSelecionada.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: 'Relatório CSV exportado',
      description: `${movimentacoesFiltradas.length} movimentação(ões) exportada(s).`,
    })
  }

  return (
    <div className="space-y-6">
      {/* SELETOR DE UNIDADE / CONGREGAÇÃO */}
      <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1E3A5F]/5 via-[#C9A227]/10 to-transparent border-b border-[#E6E2D8] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A5F] text-[#C9A227] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#C9A227] block">
                Controle Financeiro por Unidade
              </span>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1E3A5F] flex items-center gap-2">
                Unidade Atual: <span className="text-[#C9A227]">{unidadeSelecionada}</span>
              </h2>
            </div>
          </div>

          {/* Dropdown de Unidades */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#1E3A5F] whitespace-nowrap">
              Selecionar Unidade:
            </label>
            <select
              value={unidadeSelecionada}
              onChange={(e) => setUnidadeSelecionada(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#C9A227] bg-white text-xs sm:text-sm font-bold text-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#C9A227] shadow-2xs min-w-[180px]"
            >
              {unidades.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botoes de acoes rapidas da congregação */}
        <div className="p-3 sm:p-4 bg-white flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => abrirModalNovo('entrada')}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-2xs"
            >
              <TrendingUp className="w-3.5 h-3.5" />+ Nova Entrada
            </Button>
            <Button
              onClick={() => abrirModalNovo('saida')}
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5 shadow-2xs"
            >
              <TrendingDown className="w-3.5 h-3.5" />+ Nova Saída / Despesa
            </Button>
            <Button
              onClick={() => abrirModalNovo('repasse_sede')}
              size="sm"
              className="bg-[#1E3A5F] hover:bg-[#16304F] text-[#C9A227] text-xs font-bold gap-1.5 shadow-2xs border border-[#C9A227]/40"
            >
              <Send className="w-3.5 h-3.5 text-[#C9A227]" />+ Registrar Valor Enviado à Sede
            </Button>
          </div>

          <Button
            onClick={handleExportarCsv}
            variant="outline"
            size="sm"
            className="border-[#E6E2D8] text-xs font-semibold text-slate-700 hover:bg-slate-50 gap-1.5"
            title="Exportar dados da congregação para CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Exportar CSV
          </Button>
        </div>
      </Card>

      {/* CARDS DE RESUMO DA CONGREGAÇÃO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Entradas */}
        <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden border-l-4 border-l-emerald-500">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500">
                Total de Entradas
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-serif font-bold text-emerald-700 block">
                R$ {formatarMoeda(resumo.totalEntradas)}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Dízimos, ofertas e receitas da unidade
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Saídas */}
        <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden border-l-4 border-l-rose-500">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500">
                Total de Saídas / Despesas
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-serif font-bold text-rose-700 block">
                R$ {formatarMoeda(resumo.totalSaidas)}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Contas, manutenção e despesas locais
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Enviado à Sede */}
        <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden border-l-4 border-l-[#C9A227]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500">
                Enviado à Sede
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#C9A227] flex items-center justify-center">
                <Send className="w-4 h-4 text-[#C9A227]" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-serif font-bold text-[#1E3A5F] block">
                R$ {formatarMoeda(resumo.totalEnviadoSede)}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Repasses oficiais enviados ao templo sede
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Saldo Líquido Local */}
        <Card className="border-[#E6E2D8] bg-gradient-to-br from-[#1E3A5F] to-[#122842] text-white shadow-xs rounded-2xl overflow-hidden border-l-4 border-l-[#C9A227]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-300">
                Saldo da Unidade
              </span>
              <div className="w-8 h-8 rounded-lg bg-white/10 text-[#C9A227] flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-[#C9A227]" />
              </div>
            </div>
            <div className="mt-2">
              <span
                className={`text-2xl font-serif font-bold block ${
                  resumo.saldoLiquido >= 0 ? 'text-[#C9A227]' : 'text-rose-300'
                }`}
              >
                R$ {formatarMoeda(resumo.saldoLiquido)}
              </span>
              <span className="text-[11px] text-slate-300 mt-0.5 block">
                (Entradas − Saídas − Enviado à Sede)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filtro por tipo de lançamento */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E6E2D8]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFiltroTipo('todos')}
            className={`text-xs h-8 rounded-lg font-semibold ${
              filtroTipo === 'todos'
                ? 'bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]'
                : 'text-slate-600'
            }`}
          >
            Todas ({movimentacoesDaUnidade.length})
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFiltroTipo('entrada')}
            className={`text-xs h-8 rounded-lg font-semibold ${
              filtroTipo === 'entrada'
                ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Entradas
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFiltroTipo('saida')}
            className={`text-xs h-8 rounded-lg font-semibold ${
              filtroTipo === 'saida'
                ? 'bg-rose-600 text-white hover:bg-rose-600'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            Saídas
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFiltroTipo('repasse_sede')}
            className={`text-xs h-8 rounded-lg font-semibold ${
              filtroTipo === 'repasse_sede'
                ? 'bg-[#1E3A5F] text-[#C9A227] hover:bg-[#1E3A5F]'
                : 'text-[#1E3A5F] hover:bg-slate-100'
            }`}
          >
            Enviado à Sede
          </Button>
        </div>

        {/* Filtro por Mês e Busca */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-md justify-end">
          {mesesDisponiveis.length > 0 && (
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="h-10 px-2.5 rounded-xl border border-[#E6E2D8] bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
            >
              <option value="todos">Todos os meses</option>
              {mesesDisponiveis.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por descrição, responsável..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-10 bg-white border-[#E6E2D8] text-xs sm:text-sm rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* TABELA DE HISTÓRICO DAS MOVIMENTAÇÕES */}
      <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
        <div className="p-4 bg-[#F7F5F0]/60 border-b border-[#E6E2D8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C9A227]" />
            <h3 className="font-serif font-bold text-sm text-[#1E3A5F]">
              Histórico Financeiro — {unidadeSelecionada}
            </h3>
          </div>
          <Badge className="bg-[#1E3A5F] text-white text-[10px] font-bold">
            {movimentacoesFiltradas.length} registro(s)
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1E3A5F] text-white uppercase text-[10px] sm:text-xs tracking-wider">
              <tr>
                <th className="p-3 sm:p-4">Data</th>
                <th className="p-3 sm:p-4">Tipo</th>
                <th className="p-3 sm:p-4">Descrição & Categoria</th>
                <th className="p-3 sm:p-4">Responsável</th>
                <th className="p-3 sm:p-4 text-right">Valor (R$)</th>
                <th className="p-3 sm:p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2D8]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#C9A227] mb-2" />
                    Carregando movimentações do banco local...
                  </td>
                </tr>
              ) : movimentacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-1">
                      <p className="font-semibold text-slate-700">Nenhum lançamento encontrado</p>
                      <p className="text-xs text-slate-400">
                        Não há movimentações para {unidadeSelecionada} com os filtros atuais. Use os
                        botões acima para registrar entradas, saídas ou repasses à Sede.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                movimentacoesFiltradas.map((item) => {
                  const isEntrada = item.tipo === 'entrada'
                  const isSaida = item.tipo === 'saida'
                  const isRepasse = item.tipo === 'repasse_sede'

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 sm:p-4 font-mono text-slate-600 whitespace-nowrap">
                        {item.data ? formatarDataBr(item.data) : '—'}
                      </td>
                      <td className="p-3 sm:p-4 whitespace-nowrap">
                        {isEntrada && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                            Entrada
                          </Badge>
                        )}
                        {isSaida && (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]">
                            Saída / Despesa
                          </Badge>
                        )}
                        {isRepasse && (
                          <Badge className="bg-[#1E3A5F] text-[#C9A227] border-[#C9A227]/40 font-bold text-[10px]">
                            Enviado à Sede
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="font-semibold text-[#1E3A5F]">{item.descricao}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          {item.categoria && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              {item.categoria}
                            </span>
                          )}
                          {item.observacoes && (
                            <span className="italic text-slate-400 truncate max-w-xs">
                              {item.observacoes}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-slate-600">
                        {item.responsavel ? (
                          <span className="text-xs font-medium text-slate-700">
                            {item.responsavel}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 sm:p-4 text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            isEntrada
                              ? 'text-emerald-700'
                              : isSaida
                                ? 'text-rose-700'
                                : 'text-[#1E3A5F]'
                          }
                        >
                          {isEntrada ? '+' : '-'} R$ {formatarMoeda(item.valor)}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirModalEditar(item)}
                            className="h-8 w-8 text-[#1E3A5F] hover:bg-slate-100"
                            title="Editar lançamento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirModalExcluir(item)}
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL NOVO / EDITAR MOVIMENTAÇÃO */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              {itemEdicao ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Unidade: <strong className="text-[#1E3A5F] font-bold">{unidadeSelecionada}</strong>.
              Registro salvo localmente de forma segura.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-4 pt-2">
            {/* Tipo de movimentação */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Tipo de Lançamento <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTipo('entrada')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    tipo === 'entrada'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white border-[#E6E2D8] text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('saida')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    tipo === 'saida'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white border-[#E6E2D8] text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Saída / Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('repasse_sede')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    tipo === 'repasse_sede'
                      ? 'bg-[#1E3A5F] text-[#C9A227] border-[#1E3A5F] shadow-xs'
                      : 'bg-white border-[#E6E2D8] text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Enviado à Sede
                </button>
              </div>
            </div>

            {/* Valor e Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Valor (R$) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valorTexto}
                  onChange={(e) => setValorTexto(e.target.value)}
                  className="font-mono text-base font-bold text-[#1E3A5F]"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Data do Lançamento <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={dataMovimentacao}
                  onChange={(e) => setDataMovimentacao(e.target.value)}
                  className="text-xs sm:text-sm font-semibold"
                  required
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Descrição <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder={
                  tipo === 'entrada'
                    ? 'Ex: Ofertas de culto de domingo, Dízimos recolhidos...'
                    : tipo === 'saida'
                      ? 'Ex: Conta de energia elétrica, material de limpeza...'
                      : 'Ex: Repasse mensal da unidade enviado à Tesouraria Sede'
                }
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="text-xs sm:text-sm"
                required
              />
            </div>

            {/* Categoria e Responsável */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Categoria</label>
                <Input
                  type="text"
                  placeholder="Ex: Dízimo, Oferta, Energia, Água, Repasse..."
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Responsável / Dirigente
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Dirigente ou Tesoureiro local"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Observações adicionais</label>
              <Input
                type="text"
                placeholder="Ex: Comprovante arquivado, recibo nº 123..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalAberto(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Lançamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EXCLUSÃO */}
      <Dialog open={modalExcluirAberto} onOpenChange={setModalExcluirAberto}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-serif text-lg text-[#1E3A5F]">
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Deseja realmente excluir este lançamento de{' '}
              <strong>R$ {itemExclusao ? formatarMoeda(itemExclusao.valor) : '0,00'}</strong> (
              {itemExclusao?.descricao})? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setModalExcluirAberto(false)}
              className="text-xs flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExcluir}
              disabled={excluindo}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs flex-1"
            >
              {excluindo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Lançamento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FinanceiroCongregacoes
