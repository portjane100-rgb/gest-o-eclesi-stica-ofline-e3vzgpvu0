import React, { useState, useEffect, useMemo, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileSpreadsheet,
  Printer,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Calendar,
  Building2,
  TrendingUp,
  Landmark,
  Coins,
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Eye,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import useCongregacoes from '@/hooks/useCongregacoes'
import type {
  Dizimista,
  Membro,
  PlanilhaMensalRecord,
  LinhaDizimoPlanilha,
  LinhaOfertaPlanilha,
  LinhaContabilidadePlanilha,
  Configuracao,
} from '@/types/adtc'
import {
  buscarPlanilhaPorPeriodo,
  buscarSaldoMesAnterior,
  salvarPlanilhaMensal,
  listarHistoricoPlanilhas,
  excluirPlanilhaMensal,
} from '@/services/planilhasMensais'
import { buildPlanilhaMensalHtml, formatarMoeda } from '@/lib/planilhaMensalPdf'
import { useAuth } from '@/contexts/AuthContext'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'

const MESES = [
  { valor: 1, nome: 'Janeiro' },
  { valor: 2, nome: 'Fevereiro' },
  { valor: 3, nome: 'Março' },
  { valor: 4, nome: 'Abril' },
  { valor: 5, nome: 'Maio' },
  { valor: 6, nome: 'Junho' },
  { valor: 7, nome: 'Julho' },
  { valor: 8, nome: 'Agosto' },
  { valor: 9, nome: 'Setembro' },
  { valor: 10, nome: 'Outubro' },
  { valor: 11, nome: 'Novembro' },
  { valor: 12, nome: 'Dezembro' },
]

// Utilitário para parsear número a partir de input livre de moeda brasileira
function parseMoedaInput(texto: string | number): number {
  if (typeof texto === 'number') {
    return isNaN(texto) ? 0 : texto
  }
  if (!texto) return 0
  const limpo = texto
    .toString()
    .replace(/[^\d.,-]/g, '')
    .replace(',', '.')
  const num = parseFloat(limpo)
  return isNaN(num) ? 0 : Math.round(num * 100) / 100
}

export const PlanilhaMensalView: React.FC = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { config } = useChurchConfig()
  const { congregacoes: listaCongregacoesDb = [], nomes: nomesCongregacoesOriginais = [] } =
    useCongregacoes()

  // Garante que todas as congregações cadastradas apareçam, com 'Sede' sempre disponível e sem duplicidades
  const nomesCongregacoes = useMemo(() => {
    const lista = (nomesCongregacoesOriginais || []).map((n) => n.trim()).filter(Boolean)
    if (!lista.includes('Sede')) {
      lista.unshift('Sede')
    }
    return Array.from(new Set(lista))
  }, [nomesCongregacoesOriginais])

  // Seleção de período e congregação
  const dataAtual = new Date()
  const [ano, setAno] = useState<number>(dataAtual.getFullYear())
  const [mes, setMes] = useState<number>(dataAtual.getMonth() + 1)
  const [congregacao, setCongregacao] = useState<string>('Sede')

  // Aba ativa da planilha: Frente (Dízimos & Ofertas) ou Verso (Contabilidade Geral) ou Histórico
  const [abaAtiva, setAbaAtiva] = useState<'frente' | 'verso' | 'historico'>('frente')

  // Dados carregados do banco
  const [recordId, setRecordId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [ultimoSalvo, setUltimoSalvo] = useState<Date | null>(null)

  // Linhas da Frente: Dízimos (Nome | R$ | R$ | R$ | Total)
  const [linhasDizimos, setLinhasDizimos] = useState<LinhaDizimoPlanilha[]>([])

  // Linhas da Frente: Ofertas (Data | R$)
  const [linhasOfertas, setLinhasOfertas] = useState<LinhaOfertaPlanilha[]>([])

  // Linhas do Verso: Contabilidade (Descrição | Tipo | Valor)
  const [linhasContabilidade, setLinhasContabilidade] = useState<LinhaContabilidadePlanilha[]>([])

  // Campos de cálculo e controle
  // Percentual para a SEDE: default 20% apenas como sugestão inicial, editável para 20%, 30%, 40% etc.
  const [percentualSede, setPercentualSede] = useState<number>(20)

  // Sobrescritas manuais fluidas para qualquer total calculado
  const [totalOfertasManual, setTotalOfertasManual] = useState<number | null>(null)
  const [totalDizimosManual, setTotalDizimosManual] = useState<number | null>(null)
  const [totalEntradasManual, setTotalEntradasManual] = useState<number | null>(null)
  const [totalSaidasManual, setTotalSaidasManual] = useState<number | null>(null)
  const [saldoSedeManual, setSaldoSedeManual] = useState<number | null>(null)
  const [saldoCongregacaoManual, setSaldoCongregacaoManual] = useState<number | null>(null)

  const [saldoMesAnteriorManual, setSaldoMesAnteriorManual] = useState<number | null>(null)
  const [saldoMesAnteriorCalculado, setSaldoMesAnteriorCalculado] = useState<number>(0)
  const [ofertaEspecial, setOfertaEspecial] = useState<number>(0)
  const [observacoes, setObservacoes] = useState<string>('')

  // Assinaturas configuradas
  const [nomePastor, setNomePastor] = useState('Pr. José Francisco Portela Fontenele')
  const [assinaturaPastorUrl, setAssinaturaPastorUrl] = useState<string | null>(null)
  const [nomeTesoureiro, setNomeTesoureiro] = useState('')
  const [nomeFiscal, setNomeFiscal] = useState('')
  const [nomeSupervisor, setNomeSupervisor] = useState('')

  // Histórico de planilhas já criadas
  const [historicoPlanilhas, setHistoricoPlanilhas] = useState<PlanilhaMensalRecord[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // Carrega configurações de assinaturas de AdminConfig
  useEffect(() => {
    const carregarConfigAssinaturas = async () => {
      try {
        const records = await pb.collection('configuracoes').getFullList<Configuracao>()
        records.forEach((c) => {
          if (c.chave === 'lideranca_nome_pastor' && c.valor) {
            setNomePastor(c.valor)
          }
          if (c.chave === 'assinatura_pastor') {
            if (c.arquivo) {
              setAssinaturaPastorUrl(pb.files.getURL(c, c.arquivo))
            } else if (c.valor && c.valor.startsWith('data:image')) {
              setAssinaturaPastorUrl(c.valor)
            }
          }
        })
      } catch {
        /* ignore */
      }
    }
    carregarConfigAssinaturas()
  }, [])

  // Carrega histórico para a aba de histórico e navegação
  const carregarHistorico = useCallback(async () => {
    setCarregandoHistorico(true)
    try {
      const records = await listarHistoricoPlanilhas()
      setHistoricoPlanilhas(records)
    } finally {
      setCarregandoHistorico(false)
    }
  }, [])

  useEffect(() => {
    carregarHistorico()
  }, [carregarHistorico])

  // Carrega a planilha do mês ou inicia nova pré-preenchendo dizimistas ativos da congregação
  const carregarDadosPlanilha = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Busca saldo do mês anterior para a congregação
      const saldoAnterior = await buscarSaldoMesAnterior(ano, mes, congregacao)
      setSaldoMesAnteriorCalculado(saldoAnterior)

      // 2. Tenta carregar a planilha já existente
      const existente = await buscarPlanilhaPorPeriodo(ano, mes, congregacao)

      if (existente) {
        setRecordId(existente.id)
        setLinhasDizimos(existente.linhas_dizimos || [])
        setLinhasOfertas(existente.linhas_ofertas || [])
        setLinhasContabilidade(existente.linhas_contabilidade || [])
        setSaldoMesAnteriorManual(existente.saldo_mes_anterior ?? null)
        setOfertaEspecial(existente.oferta_especial || 0)
        setPercentualSede(
          typeof existente.percentual_sede === 'number' ? existente.percentual_sede : 20,
        )

        // Carrega valores manuais se existirem
        const man = existente.valores_manuais || {}
        setTotalOfertasManual(man.total_ofertas ?? null)
        setTotalDizimosManual(man.total_dizimos ?? null)
        setTotalEntradasManual(man.total_entradas ?? null)
        setTotalSaidasManual(man.total_saidas ?? null)
        setSaldoSedeManual(man.saldo_sede ?? null)
        setSaldoCongregacaoManual(man.saldo_congregacao ?? null)

        setObservacoes(existente.observacoes || '')
        if (existente.assinaturas) {
          setNomeTesoureiro(existente.assinaturas.tesoureiro || '')
          setNomeFiscal(existente.assinaturas.fiscal || '')
          setNomeSupervisor(existente.assinaturas.supervisor || '')
        }
        setUltimoSalvo(new Date(existente.updated || existente.created))
      } else {
        // Nova planilha: Pré-preenche os dizimistas ativos da congregação a partir do banco
        setRecordId(null)
        setSaldoMesAnteriorManual(null)
        setPercentualSede(20)
        setTotalOfertasManual(null)
        setTotalDizimosManual(null)
        setTotalEntradasManual(null)
        setTotalSaidasManual(null)
        setSaldoSedeManual(null)
        setSaldoCongregacaoManual(null)
        setOfertaEspecial(0)
        setObservacoes('')
        setUltimoSalvo(null)

        // Busca dizimistas ativos da congregação
        let dizimistasAtivos: Dizimista[] = []
        try {
          const filterCong =
            congregacao && congregacao !== 'Sede'
              ? `congregacao = "${congregacao}" && ativo != false`
              : `(congregacao = "Sede" || congregacao = "") && ativo != false`

          dizimistasAtivos = await pb.collection('dizimistas').getFullList<Dizimista>({
            filter: filterCong,
            sort: 'nome',
            expand: 'membro',
          })
        } catch (err) {
          console.warn('Erro ao carregar dizimistas ativos da congregação:', err)
        }

        // Monta as linhas iniciais com os dizimistas cadastrados
        const linhasIniciaisDizimos: LinhaDizimoPlanilha[] = []
        dizimistasAtivos.forEach((d, idx) => {
          const nomeDizimista = d.expand?.membro?.nome || d.nome || ''
          const origemDizimista = d.congregacao || congregacao || 'Sede'
          linhasIniciaisDizimos.push({
            id: `diz_${Date.now()}_${idx}`,
            numero: idx + 1,
            nome: nomeDizimista,
            membroId: d.membro || undefined,
            origem: origemDizimista,
            valor1: 0,
            valor2: 0,
            valor3: 0,
            total: 0,
          })
        })

        // Garante no mínimo 10 linhas para começar, com linhas em branco para preenchimento livre
        const totalMinimo = Math.max(10, linhasIniciaisDizimos.length)
        for (let i = linhasIniciaisDizimos.length; i < totalMinimo; i++) {
          linhasIniciaisDizimos.push({
            id: `diz_extra_${i}_${Date.now()}`,
            numero: i + 1,
            nome: '',
            origem: congregacao || 'Sede',
            valor1: 0,
            valor2: 0,
            valor3: 0,
            total: 0,
          })
        }

        setLinhasDizimos(linhasIniciaisDizimos)

        // Linhas iniciais de ofertas vazias (ex: 8 linhas)
        const linhasIniciaisOfertas: LinhaOfertaPlanilha[] = Array.from(
          { length: 8 },
          (_, idx) => ({
            id: `ofr_${Date.now()}_${idx}`,
            numero: idx + 1,
            data: '',
            valor: 0,
          }),
        )
        setLinhasOfertas(linhasIniciaisOfertas)

        // Linhas iniciais de contabilidade vazias (ex: 6 linhas)
        const linhasIniciaisVerso: LinhaContabilidadePlanilha[] = Array.from(
          { length: 6 },
          (_, idx) => ({
            id: `cont_${Date.now()}_${idx}`,
            numero: idx + 1,
            descricao: '',
            tipo: 'Despesa',
            valor: 0,
          }),
        )
        setLinhasContabilidade(linhasIniciaisVerso)
      }
    } catch (err: any) {
      console.error('Erro ao carregar planilha mensal:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar',
        description: err?.message || 'Não foi possível carregar a planilha deste período.',
      })
    } finally {
      setLoading(false)
    }
  }, [ano, mes, congregacao, toast])

  useEffect(() => {
    carregarDadosPlanilha()
  }, [carregarDadosPlanilha])

  // ========================================================
  // CÁLCULOS EM TEMPO REAL CONFORME AS REGRAS DA ADTC
  // ========================================================

  // 1. Total de Dízimos calculado automaticamente a partir das linhas
  const totalDizimosAuto = useMemo(() => {
    return (
      Math.round(
        linhasDizimos.reduce((acc, l) => {
          const totLinha = (l.valor1 || 0) + (l.valor2 || 0) + (l.valor3 || 0)
          return acc + totLinha
        }, 0) * 100,
      ) / 100
    )
  }, [linhasDizimos])

  // Total de Dízimos efetivo (manual se editado ou automático)
  const totalDizimos = totalDizimosManual !== null ? totalDizimosManual : totalDizimosAuto

  // 2. Total de Ofertas calculado automaticamente a partir das linhas
  const totalOfertasAuto = useMemo(() => {
    return (
      Math.round(
        linhasOfertas.reduce((acc, l) => {
          return acc + (l.valor || 0)
        }, 0) * 100,
      ) / 100
    )
  }, [linhasOfertas])

  // Total de Ofertas efetivo (manual se editado ou automático)
  const totalOfertas = totalOfertasManual !== null ? totalOfertasManual : totalOfertasAuto

  // 3. Outras Entradas e Despesas do Verso
  const { totalOutrasEntradas, totalDespesas } = useMemo(() => {
    let entradas = 0
    let despesas = 0
    linhasContabilidade.forEach((l) => {
      const val = l.valor || 0
      if (l.tipo === 'Entrada') {
        entradas += val
      } else {
        despesas += val
      }
    })
    return {
      totalOutrasEntradas: Math.round(entradas * 100) / 100,
      totalDespesas: Math.round(despesas * 100) / 100,
    }
  }, [linhasContabilidade])

  // 4. Saldo do mês anterior efetivo (manual se editado ou automático do banco)
  const saldoMesAnteriorEfetivo =
    saldoMesAnteriorManual !== null ? saldoMesAnteriorManual : saldoMesAnteriorCalculado

  // 5. Total das Entradas calculado automaticamente: dízimos + ofertas + oferta especial + outras entradas
  const totalEntradasAuto = useMemo(() => {
    return (
      Math.round(
        (totalDizimos + totalOfertas + (ofertaEspecial || 0) + totalOutrasEntradas) * 100,
      ) / 100
    )
  }, [totalDizimos, totalOfertas, ofertaEspecial, totalOutrasEntradas])

  const totalEntradas = totalEntradasManual !== null ? totalEntradasManual : totalEntradasAuto

  // 6. Base de cálculo do repasse: bruto que sobrou APÓS retirar as despesas (energia, água, etc.)
  // Regra definida pelo usuário: (Total de Dízimos − despesas lançadas), sem deixar negativo
  const baseCalculoRepasse = useMemo(() => {
    const sobra = totalDizimos - totalDespesas
    return sobra > 0 ? Math.round(sobra * 100) / 100 : 0
  }, [totalDizimos, totalDespesas])

  // Total das Saídas (Repasse para SEDE) calculado automaticamente:
  // percentual × sobra após despesas (ex.: 20%, 30%, 40%)
  const totalSaidasAuto = useMemo(() => {
    const pct = Math.max(0, percentualSede || 0) / 100
    return Math.round(baseCalculoRepasse * pct * 100) / 100
  }, [baseCalculoRepasse, percentualSede])

  const totalSaidas = totalSaidasManual !== null ? totalSaidasManual : totalSaidasAuto
  // Compatibilidade com o campo total_saidas_20 legado
  const totalSaidas20 = totalSaidas

  // 7. Saldo para a SEDE: Total de Dízimos − Saídas/Repasse SEDE + Oferta Especial ou Voto
  const saldoSedeAuto = useMemo(() => {
    const valor = totalDizimos - totalSaidas + (ofertaEspecial || 0)
    return Math.round(valor * 100) / 100
  }, [totalDizimos, totalSaidas, ofertaEspecial])

  const saldoSede = saldoSedeManual !== null ? saldoSedeManual : saldoSedeAuto

  // 8. Saldo para a Congregação: Saldo Anterior + Ofertas − Despesas
  const saldoCongregacaoAuto = useMemo(() => {
    return Math.round((saldoMesAnteriorEfetivo + totalOfertas - totalDespesas) * 100) / 100
  }, [saldoMesAnteriorEfetivo, totalOfertas, totalDespesas])

  const saldoCongregacao =
    saldoCongregacaoManual !== null ? saldoCongregacaoManual : saldoCongregacaoAuto

  // ========================================================
  // MANIPULAÇÃO DE LINHAS (DÍZIMOS)
  // ========================================================
  const atualizarLinhaDizimo = (
    id: string,
    campo: 'nome' | 'origem' | 'valor1' | 'valor2' | 'valor3',
    valorRaw: string,
  ) => {
    setLinhasDizimos((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l

        if (campo === 'nome') {
          return { ...l, nome: valorRaw }
        }

        if (campo === 'origem') {
          return { ...l, origem: valorRaw }
        }

        const numVal = parseMoedaInput(valorRaw)
        const v1 = campo === 'valor1' ? numVal : l.valor1 || 0
        const v2 = campo === 'valor2' ? numVal : l.valor2 || 0
        const v3 = campo === 'valor3' ? numVal : l.valor3 || 0
        const tot = Math.round((v1 + v2 + v3) * 100) / 100

        return {
          ...l,
          [campo]: numVal,
          total: tot,
        }
      }),
    )
  }

  const adicionarLinhaDizimo = () => {
    setLinhasDizimos((prev) => [
      ...prev,
      {
        id: `diz_manual_${Date.now()}_${prev.length}`,
        numero: prev.length + 1,
        nome: '',
        origem: congregacao || 'Sede',
        valor1: 0,
        valor2: 0,
        valor3: 0,
        total: 0,
      },
    ])
  }

  const removerLinhaDizimo = (id: string) => {
    setLinhasDizimos((prev) => {
      const filtradas = prev.filter((l) => l.id !== id)
      return filtradas.map((l, idx) => ({ ...l, numero: idx + 1 }))
    })
  }

  // ========================================================
  // MANIPULAÇÃO DE LINHAS (OFERTAS)
  // ========================================================
  const atualizarLinhaOferta = (id: string, campo: 'data' | 'valor', valorRaw: string) => {
    setLinhasOfertas((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l
        if (campo === 'data') {
          return { ...l, data: valorRaw }
        }
        return { ...l, valor: parseMoedaInput(valorRaw) }
      }),
    )
  }

  const adicionarLinhaOferta = () => {
    setLinhasOfertas((prev) => [
      ...prev,
      {
        id: `ofr_manual_${Date.now()}_${prev.length}`,
        numero: prev.length + 1,
        data: '',
        valor: 0,
      },
    ])
  }

  const removerLinhaOferta = (id: string) => {
    setLinhasOfertas((prev) => {
      const filtradas = prev.filter((l) => l.id !== id)
      return filtradas.map((l, idx) => ({ ...l, numero: idx + 1 }))
    })
  }

  // ========================================================
  // MANIPULAÇÃO DE LINHAS (VERSO / CONTABILIDADE)
  // ========================================================
  const atualizarLinhaContabilidade = (
    id: string,
    campo: 'descricao' | 'tipo' | 'valor',
    valorRaw: string,
  ) => {
    setLinhasContabilidade((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l
        if (campo === 'descricao') {
          return { ...l, descricao: valorRaw }
        }
        if (campo === 'tipo') {
          return { ...l, tipo: valorRaw as 'Entrada' | 'Despesa' }
        }
        return { ...l, valor: parseMoedaInput(valorRaw) }
      }),
    )
  }

  const adicionarLinhaContabilidade = () => {
    setLinhasContabilidade((prev) => [
      ...prev,
      {
        id: `cont_manual_${Date.now()}_${prev.length}`,
        numero: prev.length + 1,
        descricao: '',
        tipo: 'Despesa',
        valor: 0,
      },
    ])
  }

  const removerLinhaContabilidade = (id: string) => {
    setLinhasContabilidade((prev) => {
      const filtradas = prev.filter((l) => l.id !== id)
      return filtradas.map((l, idx) => ({ ...l, numero: idx + 1 }))
    })
  }

  // Helper para resetar uma edição manual de volta ao automático
  const resetarManual = (
    campo:
      | 'totalOfertas'
      | 'totalDizimos'
      | 'totalEntradas'
      | 'totalSaidas'
      | 'saldoSede'
      | 'saldoCongregacao'
      | 'saldoMesAnterior',
  ) => {
    switch (campo) {
      case 'totalOfertas':
        setTotalOfertasManual(null)
        break
      case 'totalDizimos':
        setTotalDizimosManual(null)
        break
      case 'totalEntradas':
        setTotalEntradasManual(null)
        break
      case 'totalSaidas':
        setTotalSaidasManual(null)
        break
      case 'saldoSede':
        setSaldoSedeManual(null)
        break
      case 'saldoCongregacao':
        setSaldoCongregacaoManual(null)
        break
      case 'saldoMesAnterior':
        setSaldoMesAnteriorManual(null)
        break
    }
  }

  // ========================================================
  // SALVAR PLANILHA NO BANCO DE DADOS
  // ========================================================
  const handleSalvarPlanilha = async () => {
    setSalvando(true)
    try {
      // Limpa linhas em branco desnecessárias no final antes de gravar
      const dizimosParaSalvar = linhasDizimos.map((l, idx) => ({
        ...l,
        numero: idx + 1,
        total: Math.round(((l.valor1 || 0) + (l.valor2 || 0) + (l.valor3 || 0)) * 100) / 100,
      }))

      const valoresManuaisObj = {
        total_ofertas: totalOfertasManual,
        total_dizimos: totalDizimosManual,
        total_entradas: totalEntradasManual,
        total_saidas: totalSaidasManual,
        saldo_sede: saldoSedeManual,
        saldo_congregacao: saldoCongregacaoManual,
        saldo_mes_anterior: saldoMesAnteriorManual,
      }

      const payload = {
        id: recordId || undefined,
        mes,
        ano,
        congregacao,
        linhas_dizimos: dizimosParaSalvar,
        linhas_ofertas: linhasOfertas,
        linhas_contabilidade: linhasContabilidade,
        saldo_mes_anterior: saldoMesAnteriorEfetivo,
        total_ofertas: totalOfertas,
        total_dizimos: totalDizimos,
        oferta_especial: ofertaEspecial || 0,
        total_entradas: totalEntradas,
        total_saidas_20: totalSaidas20,
        total_saidas: totalSaidas,
        percentual_sede: percentualSede,
        valores_manuais: valoresManuaisObj,
        saldo_sede: saldoSede,
        saldo_congregacao: saldoCongregacao,
        assinaturas: {
          tesoureiro: nomeTesoureiro.trim(),
          fiscal: nomeFiscal.trim(),
          supervisor: nomeSupervisor.trim(),
          pastorPresidente: nomePastor.trim(),
        },
        observacoes: observacoes.trim(),
        metadata: {
          salvo_por: user?.name || user?.email || 'Tesoureiro',
          salvo_por_id: user?.id || '',
          salvo_por_perfil: user?.perfil || 'tesoureiro',
          data_hora_salvo: new Date().toISOString(),
        },
      }

      const salva = await salvarPlanilhaMensal(payload)
      setRecordId(salva.id)
      setUltimoSalvo(new Date())

      toast({
        title: 'Planilha Salva com Sucesso!',
        description: `Planilha de ${MESES.find((m) => m.valor === mes)?.nome}/${ano} da ${congregacao} gravada no histórico.`,
      })

      carregarHistorico()
    } catch (err: any) {
      console.error('Erro ao salvar planilha:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err?.message || 'Verifique sua conexão e tente novamente.',
      })
    } finally {
      setSalvando(false)
    }
  }

  // ========================================================
  // GERAR PDF FRENTE E VERSO FIEL AO MODELO EM PAPEL
  // ========================================================
  const handleGerarPdf = async () => {
    setGerandoPdf(true)
    try {
      const mesObj = MESES.find((m) => m.valor === mes)
      const mesNome = mesObj ? mesObj.nome : String(mes)

      const htmlCompleto = await buildPlanilhaMensalHtml({
        mes,
        mesNome,
        ano,
        congregacao,
        linhasDizimos,
        linhasOfertas,
        linhasContabilidade,
        saldoMesAnterior: saldoMesAnteriorEfetivo,
        totalOfertas,
        totalDizimos,
        ofertaEspecial,
        totalEntradas,
        totalSaidas20,
        totalSaidas,
        percentualSede,
        totalDespesas,
        baseCalculoRepasse,
        saldoSede,
        saldoCongregacao,
        assinaturaPastorUrl,
        nomePastor,
        nomeTesoureiro,
        nomeFiscal,
        nomeSupervisor,
        observacoes,
        church: {
          nomeIgreja: config.nomeIgreja,
          subtituloIgreja: config.subtituloIgreja,
          denominacao: config.denominacao,
          siglaIgreja: config.siglaIgreja,
          enderecoIgreja: config.enderecoIgreja || config.enderecoSede,
          cidadeUf: config.cidadeUf || config.cidadeEstado,
          logoUrl: config.logoUrl,
        },
      })

      const printWindow = window.open('', '_blank', 'width=1100,height=900')
      if (!printWindow) {
        toast({
          variant: 'destructive',
          title: 'Bloqueio de pop-up',
          description: 'Permita pop-ups no seu navegador para imprimir ou salvar em PDF.',
        })
        return
      }

      printWindow.document.write(htmlCompleto)
      printWindow.document.close()

      toast({
        title: 'Janela de Impressão Aberta',
        description: 'Selecione "Salvar como PDF" ou imprima em frente e verso.',
      })
    } catch (err: any) {
      console.error('Erro ao gerar PDF da planilha:', err)
      toast({
        variant: 'destructive',
        title: 'Erro na geração do PDF',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setGerandoPdf(false)
    }
  }

  // Abre uma planilha direto do histórico
  const handleAbrirDoHistorico = (item: PlanilhaMensalRecord) => {
    setAno(item.ano)
    setMes(item.mes)
    setCongregacao(item.congregacao)
    setAbaAtiva('frente')
  }

  // Exclui uma planilha do histórico
  const handleExcluirDoHistorico = async (item: PlanilhaMensalRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    const mesNome = MESES.find((m) => m.valor === item.mes)?.nome || item.mes
    if (
      !confirm(
        `Deseja realmente excluir a planilha de ${mesNome}/${item.ano} da ${item.congregacao}? Esta ação não pode ser desfeita.`,
      )
    ) {
      return
    }

    const ok = await excluirPlanilhaMensal(item.id)
    if (ok) {
      toast({
        title: 'Planilha Excluída',
        description: `O registro de ${mesNome}/${item.ano} foi removido do histórico.`,
      })
      if (item.id === recordId) {
        setRecordId(null)
      }
      carregarHistorico()
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a planilha.',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* BARRA DE CONTROLE: SELEÇÃO DE PERÍODO E CONGREGAÇÃO */}
      <Card className="border-[#E6E2D8] bg-white shadow-2xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Seletores: Mês, Ano e Congregação */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              {/* Mês */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#C9A227]" />
                  Mês de Referência
                </label>
                <Select value={String(mes)} onValueChange={(v) => setMes(parseInt(v, 10))}>
                  <SelectTrigger className="h-9 text-xs sm:text-sm bg-white border-[#E6E2D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m) => (
                      <SelectItem key={m.valor} value={String(m.valor)}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ano */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">Ano</label>
                <Input
                  type="number"
                  value={ano}
                  onChange={(e) => setAno(parseInt(e.target.value, 10) || dataAtual.getFullYear())}
                  className="h-9 text-xs sm:text-sm bg-white border-[#E6E2D8]"
                  min={2020}
                  max={2035}
                />
              </div>

              {/* Congregação Dinâmica */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#C9A227]" />
                  Congregação
                </label>
                <Select value={congregacao} onValueChange={setCongregacao}>
                  <SelectTrigger className="h-9 text-xs sm:text-sm bg-white border-[#E6E2D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(nomesCongregacoes || []).map((cong) => (
                      <SelectItem key={cong} value={cong}>
                        {cong}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ações: Salvar e Gerar PDF Frente/Verso */}
            <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E6E2D8]">
              <Button
                onClick={handleSalvarPlanilha}
                disabled={salvando || loading}
                size="sm"
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold shadow-sm h-9 px-4"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5 text-[#C9A227]" />
                    Salvar Planilha
                  </>
                )}
              </Button>

              <Button
                onClick={handleGerarPdf}
                disabled={gerandoPdf || loading}
                variant="outline"
                size="sm"
                className="border-[#C9A227] text-[#1E3A5F] hover:bg-[#C9A227]/10 text-xs font-bold h-9 px-3.5"
                title="Gera PDF frente e verso fiel ao modelo em papel oficial da igreja"
              >
                {gerandoPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Printer className="w-3.5 h-3.5 mr-1.5 text-[#C9A227]" />
                    Imprimir / PDF Frente e Verso
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Status do Registro */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              {recordId ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Planilha Gravada no Histórico
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Nova Planilha (ainda não salva para este mês)
                </span>
              )}
              {ultimoSalvo && (
                <span>
                  • Gravado em: {ultimoSalvo.toLocaleDateString('pt-BR')} às{' '}
                  {ultimoSalvo.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {user?.name && <span className="text-[#1E3A5F] font-medium"> ({user.name})</span>}
                </span>
              )}
            </div>

            <span className="text-[11px] text-slate-400">
              Modelo oficial timbrado da {config.siglaIgreja || config.nomeIgreja || 'Igreja'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ABAS: FRENTE (DÍZIMOS E OFERTAS) | VERSO (CONTABILIDADE GERAL) | HISTÓRICO */}
      <div className="flex items-center justify-between border-b border-[#E6E2D8] pb-1 gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setAbaAtiva('frente')}
            className={`px-3 sm:px-4 py-2 rounded-t-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 border-b-2 ${
              abaAtiva === 'frente'
                ? 'border-[#C9A227] text-[#1E3A5F] bg-white shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Coins className="w-4 h-4 text-[#C9A227]" />
            <span>Frente: Dízimos & Ofertas</span>
            <Badge variant="outline" className="text-[10px] ml-1 bg-slate-50 font-mono">
              R$ {formatarMoeda(totalDizimos + totalOfertas)}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('verso')}
            className={`px-3 sm:px-4 py-2 rounded-t-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 border-b-2 ${
              abaAtiva === 'verso'
                ? 'border-[#C9A227] text-[#1E3A5F] bg-white shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Landmark className="w-4 h-4 text-[#1E3A5F]" />
            <span>Verso: Contabilidade Geral</span>
            <Badge
              variant="outline"
              className="text-[10px] ml-1 bg-emerald-50 text-emerald-800 border-emerald-200 font-mono"
            >
              SEDE: R$ {formatarMoeda(saldoSede)}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => {
              setAbaAtiva('historico')
              carregarHistorico()
            }}
            className={`px-3 sm:px-4 py-2 rounded-t-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 border-b-2 ${
              abaAtiva === 'historico'
                ? 'border-[#C9A227] text-[#1E3A5F] bg-white shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4 text-slate-600" />
            <span>Histórico ({historicoPlanilhas.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ABA 1: FRENTE — DÍZIMOS E OFERTAS */}
      {/* ========================================================= */}
      {abaAtiva === 'frente' && (
        <div className="space-y-6">
          {/* Card com resumo dos totais da frente */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-[#E6E2D8] bg-white shadow-2xs">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase">
                      Total por Dízimos
                    </p>
                    {totalDizimosManual !== null && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        manual
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold font-mono text-[#1E3A5F]">
                    R$ {formatarMoeda(totalDizimos)}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E3A5F] flex items-center justify-center font-bold text-xs">
                  {linhasDizimos.filter((l) => (l.total || 0) > 0).length}
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#E6E2D8] bg-white shadow-2xs">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase">
                      Total por Ofertas
                    </p>
                    {totalOfertasManual !== null && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        manual
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold font-mono text-emerald-700">
                    R$ {formatarMoeda(totalOfertas)}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  {linhasOfertas.filter((l) => (l.valor || 0) > 0).length}
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#E6E2D8] bg-[#1E3A5F] text-white shadow-2xs">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-300 uppercase">
                    Total Entradas Frente
                  </p>
                  <p className="text-xl font-bold font-mono text-[#C9A227]">
                    R$ {formatarMoeda(totalDizimos + totalOfertas)}
                  </p>
                </div>
                <Coins className="w-8 h-8 text-[#C9A227] opacity-80" />
              </CardContent>
            </Card>
          </div>

          {/* GRID COM AS DUAS TABELAS LADO A LADO (OU EMPILHADAS NO MOBILE) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* TABELA ESQUERDA: ENTRADA POR DÍZIMOS */}
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center justify-between bg-[#F7F5F0] p-3 rounded-xl border border-[#E6E2D8]">
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#1E3A5F] flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#C9A227]" />
                    Entrada por Dízimos (Frente)
                  </h3>
                  <p className="text-[11px] text-[#5A5A5A]">
                    {linhasDizimos.length} linha(s). O Total soma as 3 colunas em R$
                    automaticamente.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={adicionarLinhaDizimo}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold border-[#C9A227] text-[#1E3A5F] bg-white hover:bg-slate-50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-[#C9A227]" />
                  Adicionar Linha
                </Button>
              </div>

              {/* Tabela de dízimos com rolagem horizontal no mobile */}
              <Card className="border-[#E6E2D8] bg-white shadow-2xs overflow-hidden">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#F7F5F0] z-10 border-b border-[#E6E2D8]">
                      <tr className="text-[#1E3A5F] font-bold text-[11px]">
                        <th className="py-2 px-2 text-center w-10">Nº</th>
                        <th className="py-2 px-3 min-w-[170px]">Nome do Dizimista</th>
                        <th className="py-2 px-2 w-32">Origem</th>
                        <th className="py-2 px-2 text-right w-24">R$ (1)</th>
                        <th className="py-2 px-2 text-right w-24">R$ (2)</th>
                        <th className="py-2 px-2 text-right w-24">R$ (3)</th>
                        <th className="py-2 px-2 text-right w-28 bg-[#E6E2D8]/40">Total R$</th>
                        <th className="py-2 px-1 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linhasDizimos.map((linha, idx) => (
                        <tr key={linha.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-1.5 px-2 text-center font-bold text-slate-400 bg-slate-50/50">
                            {idx + 1}
                          </td>

                          {/* Nome do Dizimista */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={linha.nome}
                              onChange={(e) =>
                                atualizarLinhaDizimo(linha.id, 'nome', e.target.value)
                              }
                              placeholder="Nome do dizimista..."
                              className="h-8 text-xs border-slate-200 focus:border-[#C9A227] bg-white"
                            />
                          </td>

                          {/* Origem (Sede ou Congregação) */}
                          <td className="py-1.5 px-2">
                            <select
                              value={linha.origem || congregacao || 'Sede'}
                              onChange={(e) =>
                                atualizarLinhaDizimo(linha.id, 'origem', e.target.value)
                              }
                              className={`h-8 w-full px-2 rounded-md border text-[11px] font-semibold ${
                                (linha.origem || '').toLowerCase() === 'sede' || !linha.origem
                                  ? 'bg-slate-50 text-slate-700 border-slate-200'
                                  : 'bg-amber-50 text-amber-900 border-amber-300'
                              }`}
                              title="Origem do lançamento (Sede ou Congregação)"
                            >
                              {(nomesCongregacoes || ['Sede']).map((c) => (
                                <option key={c} value={c}>
                                  {c === 'Sede' ? 'Sede' : `Congregação ${c}`}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Valor 1 */}
                          <td className="py-1.5 px-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={linha.valor1 ? String(linha.valor1) : ''}
                              onChange={(e) =>
                                atualizarLinhaDizimo(linha.id, 'valor1', e.target.value)
                              }
                              placeholder="0,00"
                              className="h-8 text-xs text-right font-mono border-slate-200 focus:border-[#C9A227] bg-white"
                            />
                          </td>

                          {/* Valor 2 */}
                          <td className="py-1.5 px-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={linha.valor2 ? String(linha.valor2) : ''}
                              onChange={(e) =>
                                atualizarLinhaDizimo(linha.id, 'valor2', e.target.value)
                              }
                              placeholder="0,00"
                              className="h-8 text-xs text-right font-mono border-slate-200 focus:border-[#C9A227] bg-white"
                            />
                          </td>

                          {/* Valor 3 */}
                          <td className="py-1.5 px-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={linha.valor3 ? String(linha.valor3) : ''}
                              onChange={(e) =>
                                atualizarLinhaDizimo(linha.id, 'valor3', e.target.value)
                              }
                              placeholder="0,00"
                              className="h-8 text-xs text-right font-mono border-slate-200 focus:border-[#C9A227] bg-white"
                            />
                          </td>

                          {/* Total Calculado Automático */}
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-[#1E3A5F] bg-[#F7F5F0]/60">
                            R$ {formatarMoeda(linha.total)}
                          </td>

                          {/* Excluir linha */}
                          <td className="py-1.5 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => removerLinhaDizimo(linha.id)}
                              className="text-slate-300 hover:text-rose-600 transition p-1"
                              title="Remover linha"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-[#1E3A5F] bg-[#F7F5F0] font-bold">
                      <tr>
                        <td colSpan={6} className="py-2.5 px-3 text-right text-xs text-[#1E3A5F]">
                          <div className="flex items-center justify-end gap-2">
                            {totalDizimosManual !== null && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                editado manual
                              </span>
                            )}
                            <span>Total Geral dos Dízimos:</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-slate-500">R$</span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={
                                totalDizimosManual !== null
                                  ? String(totalDizimosManual)
                                  : String(totalDizimosAuto)
                              }
                              onChange={(e) =>
                                setTotalDizimosManual(parseMoedaInput(e.target.value))
                              }
                              title="Clique para editar manualmente se desejar"
                              className="h-7 w-28 text-right font-mono font-bold text-xs bg-white border-[#E6E2D8] focus:border-[#C9A227]"
                            />
                            {totalDizimosManual !== null && (
                              <button
                                type="button"
                                onClick={() => resetarManual('totalDizimos')}
                                className="text-[10px] text-blue-600 hover:underline px-1"
                                title="Voltar ao cálculo automático da soma das linhas"
                              >
                                auto
                              </button>
                            )}
                          </div>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            </div>

            {/* TABELA DIREITA: ENTRADA POR OFERTAS */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between bg-[#F7F5F0] p-3 rounded-xl border border-[#E6E2D8]">
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#1E3A5F] flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Entrada por Ofertas
                  </h3>
                  <p className="text-[11px] text-[#5A5A5A]">Lançamentos com data e valor</p>
                </div>

                <Button
                  type="button"
                  onClick={adicionarLinhaOferta}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold border-emerald-600 text-emerald-800 bg-white hover:bg-emerald-50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Oferta
                </Button>
              </div>

              {/* Tabela de Ofertas */}
              <Card className="border-[#E6E2D8] bg-white shadow-2xs overflow-hidden">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#F7F5F0] z-10 border-b border-[#E6E2D8]">
                      <tr className="text-[#1E3A5F] font-bold text-[11px]">
                        <th className="py-2 px-2 text-center w-9">Nº</th>
                        <th className="py-2 px-2 w-28">Data</th>
                        <th className="py-2 px-2 text-right">Valor R$</th>
                        <th className="py-2 px-1 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linhasOfertas.map((linha, idx) => (
                        <tr key={linha.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-1.5 px-2 text-center font-bold text-slate-400 bg-slate-50/50">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-2">
                            <Input
                              type="text"
                              value={linha.data}
                              onChange={(e) =>
                                atualizarLinhaOferta(linha.id, 'data', e.target.value)
                              }
                              placeholder="DD/MM"
                              className="h-8 text-xs font-mono border-slate-200 bg-white"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={linha.valor ? String(linha.valor) : ''}
                              onChange={(e) =>
                                atualizarLinhaOferta(linha.id, 'valor', e.target.value)
                              }
                              placeholder="0,00"
                              className="h-8 text-xs text-right font-mono border-slate-200 focus:border-emerald-600 bg-white"
                            />
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => removerLinhaOferta(linha.id)}
                              className="text-slate-300 hover:text-rose-600 transition p-1"
                              title="Remover linha"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-emerald-600 bg-emerald-50/40 font-bold">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 text-right text-xs text-emerald-900">
                          <div className="flex items-center justify-end gap-2">
                            {totalOfertasManual !== null && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                manual
                              </span>
                            )}
                            <span>Total das Ofertas:</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-slate-500">R$</span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={
                                totalOfertasManual !== null
                                  ? String(totalOfertasManual)
                                  : String(totalOfertasAuto)
                              }
                              onChange={(e) =>
                                setTotalOfertasManual(parseMoedaInput(e.target.value))
                              }
                              title="Clique para editar manualmente se desejar"
                              className="h-7 w-24 text-right font-mono font-bold text-xs bg-white border-emerald-300 focus:border-emerald-600"
                            />
                            {totalOfertasManual !== null && (
                              <button
                                type="button"
                                onClick={() => resetarManual('totalOfertas')}
                                className="text-[10px] text-blue-600 hover:underline px-1"
                                title="Voltar ao cálculo automático da soma das ofertas"
                              >
                                auto
                              </button>
                            )}
                          </div>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 2: VERSO — CONTABILIDADE GERAL */}
      {/* ========================================================= */}
      {abaAtiva === 'verso' && (
        <div className="space-y-6">
          {/* BLOCO SUPERIOR DO VERSO: OUTRAS ENTRADAS E DESPESAS */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#F7F5F0] p-3 rounded-xl border border-[#E6E2D8] gap-2">
              <div>
                <h3 className="font-serif font-bold text-sm text-[#1E3A5F] flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-[#C9A227]" />
                  Outras Entradas & Despesas da Congregação (Verso)
                </h3>
                <p className="text-[11px] text-[#5A5A5A]">
                  Lançamentos de doações extras, compras, manutenções etc. As despesas abatem o
                  saldo da congregação.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={adicionarLinhaContabilidade}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold border-[#1E3A5F] text-[#1E3A5F] bg-white hover:bg-slate-50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-[#1E3A5F]" />
                  Adicionar Lançamento
                </Button>
              </div>
            </div>

            <Card className="border-[#E6E2D8] bg-white shadow-2xs overflow-hidden">
              <div className="overflow-x-auto max-h-[350px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#F7F5F0] z-10 border-b border-[#E6E2D8]">
                    <tr className="text-[#1E3A5F] font-bold text-[11px]">
                      <th className="py-2 px-2 text-center w-10">Nº</th>
                      <th className="py-2 px-3">Descrição (Nome / Motivo da Despesa ou Entrada)</th>
                      <th className="py-2 px-2 w-32 text-center">Tipo</th>
                      <th className="py-2 px-3 text-right w-36">Valor R$</th>
                      <th className="py-2 px-1 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {linhasContabilidade.map((linha, idx) => (
                      <tr key={linha.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-1.5 px-2 text-center font-bold text-slate-400 bg-slate-50/50">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3">
                          <Input
                            value={linha.descricao}
                            onChange={(e) =>
                              atualizarLinhaContabilidade(linha.id, 'descricao', e.target.value)
                            }
                            placeholder="Ex: João Gustavo, material de limpeza, conserto do som..."
                            className="h-8 text-xs border-slate-200 bg-white"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <select
                            value={linha.tipo || 'Despesa'}
                            onChange={(e) =>
                              atualizarLinhaContabilidade(linha.id, 'tipo', e.target.value)
                            }
                            className={`h-8 px-2 rounded-md border text-xs font-bold text-center ${
                              linha.tipo === 'Entrada'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            <option value="Despesa">Despesa (−)</option>
                            <option value="Entrada">Entrada (+)</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-3">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={linha.valor ? String(linha.valor) : ''}
                            onChange={(e) =>
                              atualizarLinhaContabilidade(linha.id, 'valor', e.target.value)
                            }
                            placeholder="0,00"
                            className="h-8 text-xs text-right font-mono border-slate-200 bg-white"
                          />
                        </td>
                        <td className="py-1.5 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => removerLinhaContabilidade(linha.id)}
                            className="text-slate-300 hover:text-rose-600 transition p-1"
                            title="Remover linha"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-[#E6E2D8] bg-slate-50 text-xs font-semibold">
                    <tr>
                      <td colSpan={2} className="py-2 px-3 text-slate-600">
                        Total Outras Entradas:{' '}
                        <strong>R$ {formatarMoeda(totalOutrasEntradas)}</strong>
                      </td>
                      <td colSpan={2} className="py-2 px-3 text-right text-rose-700">
                        Total Despesas: <strong>R$ {formatarMoeda(totalDespesas)}</strong>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </div>

          {/* BLOCO CENTRAL DO VERSO: CAIXAS DE CÁLCULO CONTÁBIL DINÂMICAS E TOTALMENTE EDITÁVEIS */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-serif font-bold text-sm text-[#1E3A5F] flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-[#C9A227]" />
                  Quadro de Fechamento Contábil (Fluído &amp; 100% Editável)
                </h3>
                <p className="text-[11px] text-[#5A5A5A]">
                  Todos os campos sugerem o cálculo automático e podem ser sobrescritos manualmente
                  quando necessário.
                </p>
              </div>

              {/* Controle da Porcentagem da SEDE */}
              <div className="flex items-center gap-2 bg-[#F7F5F0] border border-[#E6E2D8] px-3 py-1.5 rounded-xl">
                <span className="text-xs font-bold text-[#1E3A5F] whitespace-nowrap">
                  Porcentagem para a SEDE:
                </span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={percentualSede}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setPercentualSede(isNaN(v) ? 0 : v)
                    }}
                    className="h-8 w-16 text-center font-bold text-xs bg-white border-[#C9A227]"
                  />
                  <span className="text-xs font-bold text-slate-600">%</span>
                </div>
                {/* Atalhos rápidos pedidos: 20%, 30%, 40% */}
                <div className="hidden sm:flex items-center gap-1 border-l border-slate-300 pl-2">
                  {[20, 30, 40].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPercentualSede(p)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition ${
                        percentualSede === p
                          ? 'bg-[#1E3A5F] text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Coluna 1: Entradas e Base de Cálculo */}
              <Card className="border-[#E6E2D8] bg-white shadow-2xs divide-y divide-slate-100">
                {/* 1. Saldo do Mês Anterior */}
                <div className="p-3.5 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#1E3A5F]">
                        Saldo do Mês Anterior
                      </span>
                      {saldoMesAnteriorManual !== null && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          manual
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Puxado automaticamente do histórico gravado da congregação
                    </p>
                  </div>
                  <div className="w-36 flex items-center gap-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={
                        saldoMesAnteriorManual !== null
                          ? String(saldoMesAnteriorManual)
                          : String(saldoMesAnteriorCalculado)
                      }
                      onChange={(e) => setSaldoMesAnteriorManual(parseMoedaInput(e.target.value))}
                      className="h-8 text-xs text-right font-mono font-bold bg-white"
                    />
                    {saldoMesAnteriorManual !== null && (
                      <button
                        type="button"
                        onClick={() => resetarManual('saldoMesAnterior')}
                        className="text-[10px] text-blue-600 hover:underline px-1"
                        title="Restaurar saldo automático do mês anterior"
                      >
                        auto
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Total de Ofertas */}
                <div className="p-3.5 flex items-center justify-between gap-2 bg-slate-50/50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-700">
                        Total de Ofertas (Frente)
                      </span>
                      {totalOfertasManual !== null && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          manual
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">Soma da frente (editável)</p>
                  </div>
                  <div className="w-36 flex items-center gap-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={
                        totalOfertasManual !== null
                          ? String(totalOfertasManual)
                          : String(totalOfertasAuto)
                      }
                      onChange={(e) => setTotalOfertasManual(parseMoedaInput(e.target.value))}
                      className="h-8 text-xs text-right font-mono font-bold text-emerald-800 bg-white"
                    />
                    {totalOfertasManual !== null && (
                      <button
                        type="button"
                        onClick={() => resetarManual('totalOfertas')}
                        className="text-[10px] text-blue-600 hover:underline px-1"
                        title="Restaurar cálculo automático da frente"
                      >
                        auto
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Total de Dízimos */}
                <div className="p-3.5 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-700">
                        Total de Dízimos (Frente)
                      </span>
                      {totalDizimosManual !== null && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          manual
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">Soma da frente (editável)</p>
                  </div>
                  <div className="w-36 flex items-center gap-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={
                        totalDizimosManual !== null
                          ? String(totalDizimosManual)
                          : String(totalDizimosAuto)
                      }
                      onChange={(e) => setTotalDizimosManual(parseMoedaInput(e.target.value))}
                      className="h-8 text-xs text-right font-mono font-bold text-[#1E3A5F] bg-white"
                    />
                    {totalDizimosManual !== null && (
                      <button
                        type="button"
                        onClick={() => resetarManual('totalDizimos')}
                        className="text-[10px] text-blue-600 hover:underline px-1"
                        title="Restaurar cálculo automático da frente"
                      >
                        auto
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Oferta Especial */}
                <div className="p-3.5 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#1E3A5F]">Oferta Especial (Voto)</span>
                    <p className="text-[10px] text-slate-500">
                      Campo de campanha / voto (vai p/ SEDE)
                    </p>
                  </div>
                  <div className="w-36">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={ofertaEspecial ? String(ofertaEspecial) : ''}
                      onChange={(e) => setOfertaEspecial(parseMoedaInput(e.target.value))}
                      placeholder="0,00"
                      className="h-8 text-xs text-right font-mono font-bold bg-white"
                    />
                  </div>
                </div>

                {/* 5. Total das Entradas */}
                <div className="p-3.5 flex items-center justify-between gap-2 bg-blue-50/60 text-[#1E3A5F]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold uppercase">Total das Entradas</span>
                      {totalEntradasManual !== null && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          manual
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Dízimos + Ofertas + Oferta Especial + Entradas Verso
                    </p>
                  </div>
                  <div className="w-36 flex items-center gap-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={
                        totalEntradasManual !== null
                          ? String(totalEntradasManual)
                          : String(totalEntradasAuto)
                      }
                      onChange={(e) => setTotalEntradasManual(parseMoedaInput(e.target.value))}
                      className="h-8 text-xs text-right font-mono font-black text-[#1E3A5F] bg-white border-blue-300"
                    />
                    {totalEntradasManual !== null && (
                      <button
                        type="button"
                        onClick={() => resetarManual('totalEntradas')}
                        className="text-[10px] text-blue-600 hover:underline px-1"
                        title="Restaurar soma automática"
                      >
                        auto
                      </button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Coluna 2: Saídas, Saldo SEDE e Saldo Congregação */}
              <Card className="border-[#E6E2D8] bg-white shadow-2xs divide-y divide-slate-100">
                {/* 6. Total das Saídas / Repasse SEDE com Percentual Editável */}
                <div className="p-3.5 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-rose-800">
                        Total das Saídas ({percentualSede}% do Bruto após Despesas)
                      </span>
                      {totalSaidasManual !== null && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          manual
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Fórmula: {percentualSede}% × (Dízimos R$ {formatarMoeda(totalDizimos)} −
                      Despesas R$ {formatarMoeda(totalDespesas)}) = Sobra R${' '}
                      {formatarMoeda(baseCalculoRepasse)}
                    </p>
                  </div>
                  <div className="w-36 flex items-center gap-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={
                        totalSaidasManual !== null
                          ? String(totalSaidasManual)
                          : String(totalSaidasAuto)
                      }
                      onChange={(e) => setTotalSaidasManual(parseMoedaInput(e.target.value))}
                      className="h-8 text-xs text-right font-mono font-bold text-rose-700 bg-white border-rose-200"
                    />
                    {totalSaidasManual !== null && (
                      <button
                        type="button"
                        onClick={() => resetarManual('totalSaidas')}
                        className="text-[10px] text-blue-600 hover:underline px-1"
                        title="Restaurar cálculo automático com base na fórmula"
                      >
                        auto
                      </button>
                    )}
                  </div>
                </div>

                {/* 7. Saldo para a SEDE */}
                <div className="p-4 bg-amber-50/70 border-l-4 border-[#C9A227] flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-amber-950 block">
                        Saldo para a SEDE
                      </span>
                      {saldoSedeManual !== null && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 border border-amber-400">
                          manual
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-amber-800">
                      Dízimos − Repasse SEDE ({percentualSede}%) + Oferta Especial
                    </p>
                  </div>
                  <div className="w-36 flex items-center gap-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={
                        saldoSedeManual !== null ? String(saldoSedeManual) : String(saldoSedeAuto)
                      }
                      onChange={(e) => setSaldoSedeManual(parseMoedaInput(e.target.value))}
                      className="h-8 text-xs text-right font-mono font-black text-amber-950 bg-white border-amber-300"
                    />
                    {saldoSedeManual !== null && (
                      <button
                        type="button"
                        onClick={() => resetarManual('saldoSede')}
                        className="text-[10px] text-amber-900 hover:underline px-1 font-bold"
                        title="Restaurar cálculo automático do saldo da SEDE"
                      >
                        auto
                      </button>
                    )}
                  </div>
                </div>

                {/* 8. Saldo para a Congregação */}
                <div className="p-4 bg-emerald-50/70 border-l-4 border-emerald-600 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-emerald-950 block">
                        Saldo para Congregação
                      </span>
                      {saldoCongregacaoManual !== null && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-950 border border-emerald-400">
                          manual
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-emerald-800">
                      Saldo Anterior + Ofertas − Despesas
                    </p>
                  </div>
                  <div className="w-36 flex items-center gap-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={
                        saldoCongregacaoManual !== null
                          ? String(saldoCongregacaoManual)
                          : String(saldoCongregacaoAuto)
                      }
                      onChange={(e) => setSaldoCongregacaoManual(parseMoedaInput(e.target.value))}
                      className="h-8 text-xs text-right font-mono font-black text-emerald-900 bg-white border-emerald-300"
                    />
                    {saldoCongregacaoManual !== null && (
                      <button
                        type="button"
                        onClick={() => resetarManual('saldoCongregacao')}
                        className="text-[10px] text-emerald-900 hover:underline px-1 font-bold"
                        title="Restaurar cálculo automático do saldo da congregação"
                      >
                        auto
                      </button>
                    )}
                  </div>
                </div>

                {/* Observações da contabilidade */}
                <div className="p-3.5 space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">
                    Observações Adicionais (Opcional)
                  </label>
                  <Input
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Anotações do fechamento contábil..."
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </Card>
            </div>
          </div>

          {/* BLOCO INFERIOR DO VERSO: ÁREA DE ASSINATURAS */}
          <Card className="border-[#E6E2D8] bg-white shadow-2xs">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div>
                <h3 className="font-serif font-bold text-sm text-[#1E3A5F]">
                  Área de Assinaturas Oficiais do Verso
                </h3>
                <p className="text-xs text-slate-500">
                  Nomes que saem impressos abaixo do traço. A assinatura do Pastor utiliza a imagem
                  gravada em Configurações.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Tesoureiro */}
                <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-1.5">
                  <span className="text-xs font-bold text-[#1E3A5F] block">1. Tesoureiro</span>
                  <Input
                    value={nomeTesoureiro}
                    onChange={(e) => setNomeTesoureiro(e.target.value)}
                    placeholder="Nome do tesoureiro..."
                    className="h-8 text-xs bg-white"
                  />
                </div>

                {/* 2. Fiscal */}
                <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-1.5">
                  <span className="text-xs font-bold text-[#1E3A5F] block">2. Fiscal</span>
                  <Input
                    value={nomeFiscal}
                    onChange={(e) => setNomeFiscal(e.target.value)}
                    placeholder="Conselho fiscal..."
                    className="h-8 text-xs bg-white"
                  />
                </div>

                {/* 3. Supervisor */}
                <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-1.5">
                  <span className="text-xs font-bold text-[#1E3A5F] block">3. Supervisor</span>
                  <Input
                    value={nomeSupervisor}
                    onChange={(e) => setNomeSupervisor(e.target.value)}
                    placeholder="Supervisor da congregação..."
                    className="h-8 text-xs bg-white"
                  />
                </div>

                {/* 4. Pastor Presidente */}
                <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1E3A5F]">4. Pastor Presidente</span>
                    {assinaturaPastorUrl && (
                      <span className="text-[10px] text-emerald-700 font-bold">
                        ✓ Rubrica ativa
                      </span>
                    )}
                  </div>
                  <Input
                    value={nomePastor}
                    onChange={(e) => setNomePastor(e.target.value)}
                    placeholder="Pr. Presidente..."
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 3: HISTÓRICO DE TODAS AS PLANILHAS GRAVADAS */}
      {/* ========================================================= */}
      {abaAtiva === 'historico' && (
        <Card className="border-[#E6E2D8] bg-white shadow-2xs overflow-hidden">
          <CardContent className="p-0">
            {carregandoHistorico ? (
              <div className="p-12 text-center text-xs text-slate-500">
                Carregando histórico de planilhas mensais...
              </div>
            ) : historicoPlanilhas.length === 0 ? (
              <div className="p-12 text-center">
                <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  Nenhuma planilha gravada ainda
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ao salvar a primeira planilha mensal, ela aparecerá aqui com acesso rápido para
                  reabertura, conferência e impressão.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-[#E6E2D8] bg-[#F7F5F0] text-[#1E3A5F] font-serif font-bold text-xs uppercase tracking-wider">
                      <th className="py-3 px-4">Período / Mês</th>
                      <th className="py-3 px-4">Congregação</th>
                      <th className="py-3 px-4 text-right">Total Dízimos</th>
                      <th className="py-3 px-4 text-right">Total Ofertas</th>
                      <th className="py-3 px-4 text-right">Saldo p/ SEDE</th>
                      <th className="py-3 px-4 text-right">Saldo Congregação</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E2D8]">
                    {historicoPlanilhas.map((item) => {
                      const mesObj = MESES.find((m) => m.valor === item.mes)
                      const mesNome = mesObj ? mesObj.nome : String(item.mes)
                      const isAtualSelecionado =
                        item.ano === ano && item.mes === mes && item.congregacao === congregacao

                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleAbrirDoHistorico(item)}
                          className={`cursor-pointer hover:bg-slate-50 transition ${
                            isAtualSelecionado ? 'bg-amber-50/50 font-medium' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-[#1E3A5F]">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#C9A227]" />
                              <span>
                                {mesNome} de {item.ano}
                              </span>
                              {isAtualSelecionado && (
                                <Badge className="bg-[#1E3A5F] text-white text-[9px] h-4">
                                  Em Aberto
                                </Badge>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-700">
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {item.congregacao}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-slate-800">
                            R$ {formatarMoeda(item.total_dizimos)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-emerald-700">
                            R$ {formatarMoeda(item.total_ofertas)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-950">
                            R$ {formatarMoeda(item.saldo_sede)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                            R$ {formatarMoeda(item.saldo_congregacao)}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAbrirDoHistorico(item)}
                                className="h-7 px-2.5 text-xs text-[#1E3A5F] hover:bg-slate-100 font-semibold"
                              >
                                Abrir
                                <ChevronRight className="w-3.5 h-3.5 ml-1" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleExcluirDoHistorico(item, e)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Excluir planilha do histórico"
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
      )}
    </div>
  )
}

export default PlanilhaMensalView
