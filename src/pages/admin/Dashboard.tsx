import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import type { Membro, Congregado, Obreiro, Dizimista, CalendarioEvento } from '@/types/adtc'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatarDataBr } from '@/lib/utils'
import { useCongregacoes } from '@/hooks/useCongregacoes'
import {
  Users,
  UserCheck,
  Award,
  Wallet,
  CalendarDays,
  FileText,
  UserPlus,
  PlusCircle,
  TrendingUp,
  Church,
  Cake,
  UserX,
  Cross,
  Sun,
  Sunrise,
  Moon,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  Calendar as CalendarIcon,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react'
import useRealtime from '@/hooks/use-realtime'
import { useAuth } from '@/contexts/AuthContext'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import {
  ModalFelicitarAniversariante,
  type AniversarianteFelicitarData,
} from '@/components/ModalFelicitarAniversariante'

interface AniversarianteMesItem {
  id: string
  nome: string
  tipo: 'membro' | 'congregado'
  congregacao: string
  dia: number
  mes: number
  data_nascimento?: string
  data_nascimento_texto?: string
  whatsapp?: string
  telefone?: string
  numero_registro?: string
}

export const Dashboard: React.FC = () => {
  const { user, podeAcessarFinanceiro } = useAuth()
  const { config } = useChurchConfig()
  const { total: totalUnidades = 0 } = useCongregacoes()

  // Estados de estatísticas
  const [stats, setStats] = useState({
    totalMembros: 0,
    totalCongregados: 0,
    totalObreiros: 0,
    totalDizimistasMes: 0,
    totalEventosFuturos: 0,
    totalAniversariantesHoje: 0,
    totalAniversariantesMes: 0,
    totalFalecidos: 0,
    totalInativos: 0,
  })

  const [obreirosPorCargo, setObreirosPorCargo] = useState<Record<string, number>>({})
  const [todosEventos, setTodosEventos] = useState<CalendarioEvento[]>([])
  const [aniversariantesDoMes, setAniversariantesDoMes] = useState<AniversarianteMesItem[]>([])
  const [loading, setLoading] = useState(true)

  // Mês e ano selecionados para o calendário
  const hoje = new Date()
  const [currentDate, setCurrentDate] = useState<Date>(
    new Date(hoje.getFullYear(), hoje.getMonth(), 1),
  )
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(hoje.getDate())

  // Modal para felicitar aniversariante
  const [aniversarianteSelecionado, setAniversarianteSelecionado] =
    useState<AniversarianteFelicitarData | null>(null)
  const [isModalFelicitarOpen, setIsModalFelicitarOpen] = useState(false)

  // Saudação por horário
  const saudacaoHorario = useMemo(() => {
    const hora = new Date().getHours()
    if (hora >= 5 && hora < 12) {
      return { texto: 'Bom dia', icone: Sunrise, cor: 'text-amber-500' }
    }
    if (hora >= 12 && hora < 18) {
      return { texto: 'Boa tarde', icone: Sun, cor: 'text-amber-600' }
    }
    return { texto: 'Boa noite', icone: Moon, cor: 'text-indigo-400' }
  }, [])

  // Extrair primeiro nome do usuário logado
  const primeiroNome = useMemo(() => {
    if (!user?.name) return 'Irmão(ã)'
    const parts = user.name.trim().split(/\s+/)
    return parts[0] || 'Irmão(ã)'
  }, [user?.name])

  // Função auxiliar de extração de dia e mês de datas flexíveis (ISO ou DD/MM/AAAA)
  const extrairDiaMes = (
    dataIso?: string,
    dataTexto?: string,
  ): { dia: number; mes: number } | null => {
    if (dataIso) {
      const parte = dataIso.slice(0, 10).split('-')
      if (parte.length === 3) {
        const mes = parseInt(parte[1], 10)
        const dia = parseInt(parte[2], 10)
        if (!isNaN(dia) && !isNaN(mes) && dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
          return { dia, mes }
        }
      }
    }
    const txt = dataTexto || (dataIso && dataIso.includes('/') ? dataIso : '')
    if (txt) {
      const match = txt.match(/(\d{1,2})[/.-](\d{1,2})/)
      if (match) {
        const dia = parseInt(match[1], 10)
        const mes = parseInt(match[2], 10)
        if (!isNaN(dia) && !isNaN(mes) && dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
          return { dia, mes }
        }
      }
    }
    return null
  }

  // Carregamento geral do Dashboard
  const loadDashboardData = async () => {
    try {
      const [membrosRes, todosMembros, todosCongregados, obreirosRes, dizimistasRes, eventosRes] =
        await Promise.all([
          pb.collection('membros').getList<Membro>(1, 1, {
            filter: "status='Ativo'",
          }),
          pb.collection('membros').getFullList<Membro>(),
          pb.collection('congregados').getFullList<Congregado>(),
          pb.collection('obreiros').getFullList<Obreiro>({ filter: "status='Ativo'" }),
          pb.collection('dizimistas').getList<Dizimista>(1, 1),
          pb.collection('calendario').getFullList<CalendarioEvento>({ sort: 'data_inicio' }),
        ])

      // Membros ativos
      const membrosAtivos = todosMembros.filter((m) => {
        const s = (m.status || 'Ativo').toLowerCase()
        return s.includes('ativo') && !s.includes('inativo') && !s.includes('falecido')
      })

      // Congregados ativos
      const congregadosAtivos = todosCongregados.filter((c) => {
        const s = ((c as any).situacao || c.status || 'Ativo').toLowerCase()
        return s.includes('ativo') && !s.includes('inativo') && !s.includes('falecido')
      })

      // In Memória (Falecidos)
      const membrosFalecidos = todosMembros.filter((m) =>
        (m.status || '').toLowerCase().includes('falecido'),
      ).length
      const congregadosFalecidos = todosCongregados.filter((c) =>
        ((c as any).situacao || c.status || '').toLowerCase().includes('falecido'),
      ).length
      const totalFalecidosGeral = membrosFalecidos + congregadosFalecidos

      // Inativos
      const membrosInativos = todosMembros.filter((m) => {
        const s = (m.status || '').toLowerCase()
        return (
          (s.includes('inativo') ||
            s.includes('afastado') ||
            s.includes('mudança') ||
            s.includes('transferido')) &&
          !s.includes('falecido')
        )
      }).length
      const congregadosInativos = todosCongregados.filter((c) => {
        const s = ((c as any).situacao || c.status || '').toLowerCase()
        return (s.includes('inativo') || s.includes('afastado')) && !s.includes('falecido')
      }).length
      const totalInativosGeral = membrosInativos + congregadosInativos

      // Aniversariantes de Hoje e do Mês Atual
      const now = new Date()
      const diaHoje = now.getDate()
      const mesHoje = now.getMonth() + 1 // 1-12

      let anivHojeCount = 0
      const listaMes: AniversarianteMesItem[] = []

      // Processar Membros
      membrosAtivos.forEach((m) => {
        const dm = extrairDiaMes(m.data_nascimento, m.data_nascimento_texto)
        if (dm) {
          if (dm.dia === diaHoje && dm.mes === mesHoje) {
            anivHojeCount++
          }
          if (dm.mes === mesHoje) {
            listaMes.push({
              id: `m-${m.id}`,
              nome: m.nome,
              tipo: 'membro',
              congregacao: m.congregacao || 'Sede',
              dia: dm.dia,
              mes: dm.mes,
              data_nascimento: m.data_nascimento,
              data_nascimento_texto: m.data_nascimento_texto,
              whatsapp: m.whatsapp,
              telefone: m.telefone,
              numero_registro: m.numero_registro || m.numero_ficha,
            })
          }
        }
      })

      // Processar Congregados
      congregadosAtivos.forEach((c) => {
        const dm = extrairDiaMes(c.data_nascimento, (c as any).data_nascimento_texto)
        if (dm) {
          if (dm.dia === diaHoje && dm.mes === mesHoje) {
            anivHojeCount++
          }
          if (dm.mes === mesHoje) {
            listaMes.push({
              id: `c-${c.id}`,
              nome: c.nome,
              tipo: 'congregado',
              congregacao: c.congregacao || 'Sede',
              dia: dm.dia,
              mes: dm.mes,
              data_nascimento: c.data_nascimento,
              data_nascimento_texto: (c as any).data_nascimento_texto,
              whatsapp: c.whatsapp,
              telefone: c.telefone,
            })
          }
        }
      })

      // Ordenar lista de aniversariantes por dia
      listaMes.sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome))

      // Distribuição por cargo de obreiros
      const cargosCount: Record<string, number> = {}
      obreirosRes.forEach((ob) => {
        cargosCount[ob.cargo] = (cargosCount[ob.cargo] || 0) + 1
      })

      setStats({
        totalMembros: membrosRes.totalItems || membrosAtivos.length,
        totalCongregados: congregadosAtivos.length,
        totalObreiros: obreirosRes.length,
        totalDizimistasMes: dizimistasRes.totalItems,
        totalEventosFuturos: eventosRes.length,
        totalAniversariantesHoje: anivHojeCount,
        totalAniversariantesMes: listaMes.length,
        totalFalecidos: totalFalecidosGeral,
        totalInativos: totalInativosGeral,
      })

      setObreirosPorCargo(cargosCount)
      setTodosEventos(eventosRes)
      setAniversariantesDoMes(listaMes)
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  useRealtime<Membro>('membros', () => loadDashboardData())
  useRealtime<Congregado>('congregados', () => loadDashboardData())
  useRealtime<CalendarioEvento>('calendario', () => loadDashboardData())

  // Navegação de mês do calendário
  const anoAtual = currentDate.getFullYear()
  const mesAtual = currentDate.getMonth() // 0-indexed

  const mesesNomes = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  const mudarMes = (delta: number) => {
    const novaData = new Date(anoAtual, mesAtual + delta, 1)
    setCurrentDate(novaData)
    setDiaSelecionado(null)
  }

  const voltarMesAtual = () => {
    const agora = new Date()
    setCurrentDate(new Date(agora.getFullYear(), agora.getMonth(), 1))
    setDiaSelecionado(agora.getDate())
  }

  // Mapa de eventos indexados por dia do mês atual
  const eventosPorDia = useMemo(() => {
    const mapa: Record<number, CalendarioEvento[]> = {}
    todosEventos.forEach((ev) => {
      if (!ev.data_inicio) return
      // Verificar se o evento toca o ano/mês em exibição
      // Para simplificar e cobrir intervalos:
      const iniStr = ev.data_inicio.slice(0, 10).split('-')
      if (iniStr.length !== 3) return
      const evAno = parseInt(iniStr[0], 10)
      const evMes = parseInt(iniStr[1], 10) - 1
      const evDia = parseInt(iniStr[2], 10)

      if (evAno === anoAtual && evMes === mesAtual) {
        if (!mapa[evDia]) mapa[evDia] = []
        mapa[evDia].push(ev)
      }
    })
    return mapa
  }, [todosEventos, anoAtual, mesAtual])

  // Dias da grade do calendário (domingo a sábado)
  const gridDias = useMemo(() => {
    const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay() // 0 = Domingo
    const totalDiasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate()
    const totalDiasMesAnterior = new Date(anoAtual, mesAtual, 0).getDate()

    const dias: {
      numero: number
      mesAtual: boolean
      eventos: CalendarioEvento[]
      isHoje: boolean
    }[] = []

    // Preenchimento do mês anterior
    for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
      dias.push({
        numero: totalDiasMesAnterior - i,
        mesAtual: false,
        eventos: [],
        isHoje: false,
      })
    }

    // Dias do mês atual
    const now = new Date()
    const isMesAtualHoje = now.getFullYear() === anoAtual && now.getMonth() === mesAtual

    for (let d = 1; d <= totalDiasNoMes; d++) {
      dias.push({
        numero: d,
        mesAtual: true,
        eventos: eventosPorDia[d] || [],
        isHoje: isMesAtualHoje && now.getDate() === d,
      })
    }

    // Preenchimento do próximo mês até completar múltiplos de 7 (35 ou 42)
    const restante = (7 - (dias.length % 7)) % 7
    for (let j = 1; j <= restante; j++) {
      dias.push({
        numero: j,
        mesAtual: false,
        eventos: [],
        isHoje: false,
      })
    }

    return dias
  }, [anoAtual, mesAtual, eventosPorDia])

  // Próximos compromissos ordenados
  const proximosCompromissos = useMemo(() => {
    const hojeStr = new Date().toISOString().slice(0, 10)
    return todosEventos
      .filter((ev) => {
        const fim = ev.data_termino || (ev as any).data_fim || ev.data_inicio
        return (fim || '').slice(0, 10) >= hojeStr
      })
      .slice(0, 5)
  }, [todosEventos])

  // Eventos do dia selecionado
  const eventosDoDiaSelecionado = useMemo(() => {
    if (!diaSelecionado) return []
    return eventosPorDia[diaSelecionado] || []
  }, [diaSelecionado, eventosPorDia])

  // Abrir modal de felicitações
  const handleFelicitar = (aniv: AniversarianteMesItem) => {
    setAniversarianteSelecionado({
      nome: aniv.nome,
      whatsapp: aniv.whatsapp,
      telefone: aniv.telefone,
      tipo: aniv.tipo,
      congregacao: aniv.congregacao,
    })
    setIsModalFelicitarOpen(true)
  }

  const SaudacaoIcone = saudacaoHorario.icone

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* =========================================================================
          1. CABEÇALHO COM IDENTIDADE VISUAL AZUL-PROFUNDO / DOURADO & SAUDAÇÃO
      ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1F38] via-[#162D4E] to-[#1E3A5F] text-white p-6 sm:p-8 shadow-xl border border-[#C9A227]/30">
        {/* Detalhe de fundo dourado luminoso */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-gradient-to-br from-[#C9A227]/25 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            {/* Saudação com horário e nome */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-amber-200">
              <SaudacaoIcone className={`w-4 h-4 ${saudacaoHorario.cor}`} />
              <span>
                {saudacaoHorario.texto}, <strong className="text-white">{primeiroNome}</strong>!
              </span>
              <span className="text-white/40">•</span>
              <span className="text-emerald-300 flex items-center gap-1 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                100% Offline
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              Painel de Gestão da{' '}
              <span className="text-[#E7C768]">
                {config.siglaIgreja || config.nomeIgreja || 'ADTC Campanário'}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {config.denominacao || 'Igreja Evangélica Assembleia de Deus Templo Central'} —
              Sistema integrado de membros, congregações, dizimistas, escalas e emissão oficial de
              documentos.
            </p>
          </div>

          {/* Ações Rápidas em Destaque */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <Button
              asChild
              className="bg-[#C9A227] hover:bg-[#b08d20] text-[#1E3A5F] font-bold text-xs h-10 px-4 shadow-lg hover:shadow-xl transition-all"
            >
              <Link to="/admin/membros?novo=true">
                <UserPlus className="w-4 h-4 mr-1.5" />
                Novo Membro
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs h-10 px-4 backdrop-blur-xs"
            >
              <Link to="/admin/calendario">
                <CalendarDays className="w-4 h-4 mr-1.5 text-amber-300" />
                Novo Evento
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs h-10 px-4 backdrop-blur-xs"
            >
              <Link to="/admin/documentos">
                <FileText className="w-4 h-4 mr-1.5 text-[#C9A227]" />
                Documentos
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. CARTÕES COLORIDOS COM ÍCONES PARA CADA MÓDULO (PALETA DOURADO/AZUL)
      ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Membros Ativos */}
        <Link to="/admin/membros" className="block group">
          <Card className="border border-[#E6E2D8] hover:border-[#1E3A5F] bg-white shadow-xs hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden h-full">
            <CardContent className="p-4 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3A5F] border border-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5 text-[#1E3A5F]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Membros
                </span>
                <span className="font-serif text-2xl font-bold text-[#1E3A5F] block">
                  {stats.totalMembros}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">Em comunhão</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Congregados */}
        <Link to="/admin/congregados" className="block group">
          <Card className="border border-[#E6E2D8] hover:border-[#C9A227] bg-white shadow-xs hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden h-full">
            <CardContent className="p-4 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#C9A227] border border-amber-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5 text-[#C9A227]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Congregados
                </span>
                <span className="font-serif text-2xl font-bold text-[#1E3A5F] block">
                  {stats.totalCongregados}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {totalUnidades} {totalUnidades === 1 ? 'congregação' : 'congregações'}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Corpo de Obreiros */}
        <Link to="/admin/obreiros" className="block group">
          <Card className="border border-[#E6E2D8] hover:border-emerald-600 bg-white shadow-xs hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden h-full">
            <CardContent className="p-4 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Obreiros
                </span>
                <span className="font-serif text-2xl font-bold text-[#1E3A5F] block">
                  {stats.totalObreiros}
                </span>
                <span className="text-[11px] text-emerald-700 font-medium">Corpo Ministerial</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Aniversariantes do Mês */}
        <Link to="/admin/membros?aba=aniversariantes" className="block group">
          <Card className="border border-[#E6E2D8] hover:border-pink-400 bg-white shadow-xs hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden h-full">
            <CardContent className="p-4 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 border border-pink-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Cake className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Aniversariantes
                </span>
                <span className="font-serif text-2xl font-bold text-pink-700 block">
                  {stats.totalAniversariantesMes}
                </span>
                <span className="text-[11px] text-pink-600 font-medium">
                  {stats.totalAniversariantesHoje > 0
                    ? `${stats.totalAniversariantesHoje} celebrando hoje!`
                    : 'Neste mês'}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Dizimistas & Tesouraria */}
        <Link
          to={podeAcessarFinanceiro ? '/admin/dizimistas' : '#'}
          className={`block group ${!podeAcessarFinanceiro ? 'pointer-events-none opacity-80' : ''}`}
        >
          <Card className="border border-[#E6E2D8] hover:border-purple-400 bg-white shadow-xs hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden h-full">
            <CardContent className="p-4 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Wallet className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Dízimos & Ofertas
                </span>
                <span className="font-serif text-2xl font-bold text-[#1E3A5F] block">
                  {stats.totalDizimistasMes}
                </span>
                <span className="text-[11px] text-purple-700 font-medium">
                  {podeAcessarFinanceiro ? 'Sessão Financeira' : 'Acesso Restrito'}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Eventos / Festas */}
        <Link to="/admin/calendario" className="block group">
          <Card className="border border-[#E6E2D8] hover:border-[#C9A227] bg-white shadow-xs hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden h-full">
            <CardContent className="p-4 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#C9A227] border border-amber-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CalendarDays className="w-5 h-5 text-[#C9A227]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Festas & Agenda
                </span>
                <span className="font-serif text-2xl font-bold text-[#1E3A5F] block">
                  {stats.totalEventosFuturos}
                </span>
                <span className="text-[11px] text-[#C9A227] font-bold">Calendário Oficial</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* =========================================================================
          3. SEÇÃO PRINCIPAL: CALENDÁRIO DO MÊS + PRÓXIMOS COMPROMISSOS AO LADO
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendário Mensal Interativo (8 Colunas em desktop) */}
        <div className="lg:col-span-8 bg-white border border-[#E6E2D8] rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          {/* Cabeçalho do Calendário */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#E6E2D8]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#12243B] text-[#C9A227] flex items-center justify-center font-bold shadow-xs">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
                  <span>
                    {mesesNomes[mesAtual]} de {anoAtual}
                  </span>
                  <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-[10px] uppercase">
                    Festas & Eventos
                  </Badge>
                </h2>
                <p className="text-xs text-slate-500">
                  Clique em um dia marcado para visualizar as celebrações e congressos agendados.
                </p>
              </div>
            </div>

            {/* Controles de Navegação de Mês */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={voltarMesAtual}
                className="text-xs h-8 px-2.5 border-[#E6E2D8] text-slate-700"
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => mudarMes(-1)}
                className="h-8 w-8 border-[#E6E2D8] text-[#1E3A5F]"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => mudarMes(1)}
                className="h-8 w-8 border-[#E6E2D8] text-[#1E3A5F]"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Grade de Dias da Semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-slate-500 pb-1">
            <span className="text-rose-600">DOM</span>
            <span>SEG</span>
            <span>TER</span>
            <span>QUA</span>
            <span>QUI</span>
            <span>SEX</span>
            <span className="text-blue-600">SÁB</span>
          </div>

          {/* Grade de Células do Calendário */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {gridDias.map((dia, idx) => {
              const temEvento = dia.eventos.length > 0
              const selecionado = dia.mesAtual && diaSelecionado === dia.numero

              return (
                <button
                  key={`${dia.numero}-${idx}`}
                  type="button"
                  disabled={!dia.mesAtual}
                  onClick={() => dia.mesAtual && setDiaSelecionado(dia.numero)}
                  className={`min-h-[64px] sm:min-h-[76px] p-1.5 sm:p-2 rounded-xl text-left flex flex-col justify-between transition-all duration-150 relative ${
                    !dia.mesAtual
                      ? 'bg-slate-50/50 text-slate-300 cursor-default opacity-40'
                      : selecionado
                        ? 'bg-[#1E3A5F] text-white shadow-md ring-2 ring-[#C9A227]'
                        : dia.isHoje
                          ? 'bg-amber-50/80 border-2 border-[#C9A227] text-slate-900 font-bold'
                          : temEvento
                            ? 'bg-blue-50/70 border border-blue-200 text-slate-900 hover:bg-blue-100/70'
                            : 'bg-white border border-[#E6E2D8] text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-semibold ${
                        selecionado
                          ? 'text-white'
                          : dia.isHoje
                            ? 'text-amber-800 font-extrabold'
                            : 'text-slate-700'
                      }`}
                    >
                      {dia.numero}
                    </span>
                    {dia.isHoje && (
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#C9A227]">
                        Hoje
                      </span>
                    )}
                  </div>

                  {/* Marcadores de eventos no dia */}
                  {temEvento && (
                    <div className="space-y-0.5 w-full mt-1">
                      {dia.eventos.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className={`text-[9px] sm:text-[10px] font-medium truncate px-1 py-0.5 rounded ${
                            selecionado
                              ? 'bg-white/20 text-white'
                              : 'bg-[#C9A227]/25 text-[#1E3A5F] font-semibold'
                          }`}
                          title={`${ev.titulo} (${ev.departamento || 'Geral'})`}
                        >
                          {ev.titulo}
                        </div>
                      ))}
                      {dia.eventos.length > 2 && (
                        <div
                          className={`text-[9px] font-bold pl-0.5 ${
                            selecionado ? 'text-amber-200' : 'text-[#C9A227]'
                          }`}
                        >
                          +{dia.eventos.length - 2} mais
                        </div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Detalhes do Dia Selecionado */}
          {diaSelecionado && (
            <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#E6E2D8] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                  Eventos em {diaSelecionado} de {mesesNomes[mesAtual]}:
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {eventosDoDiaSelecionado.length === 0
                    ? 'Nenhum evento registrado'
                    : `${eventosDoDiaSelecionado.length} celebração(ões)`}
                </span>
              </div>

              {eventosDoDiaSelecionado.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {eventosDoDiaSelecionado.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 bg-white border border-[#E6E2D8] rounded-xl space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold border-[#C9A227] text-[#8C6D15] bg-[#F1EBD8]/50"
                        >
                          {ev.departamento || 'Geral'}
                        </Badge>
                        <span className="text-[11px] font-semibold text-[#1E3A5F]">
                          {formatarDataBr(ev.data_inicio)}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-sm text-[#1E3A5F]">{ev.titulo}</h4>
                      {ev.descricao && (
                        <p className="text-xs text-slate-600 line-clamp-2">{ev.descricao}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Dia livre de eventos institucionais no calendário oficial.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Coluna Lateral: Próximos Compromissos (4 Colunas em desktop) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#E6E2D8] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E2D8]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#C9A227] flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-[#1E3A5F]">
                    Próximos Compromissos
                  </h3>
                  <p className="text-[11px] text-slate-500">Festas e celebrações futuras</p>
                </div>
              </div>

              <Button asChild variant="ghost" size="sm" className="text-xs text-[#1E3A5F] h-7 px-2">
                <Link to="/admin/calendario">Ver agenda</Link>
              </Button>
            </div>

            {proximosCompromissos.length > 0 ? (
              <div className="space-y-2.5">
                {proximosCompromissos.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-[#C9A227] transition-all space-y-1 group"
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <Badge
                        variant="outline"
                        className="text-[9px] border-[#C9A227] text-[#8C6D15] bg-[#F1EBD8]/40"
                      >
                        {ev.departamento || 'Geral'}
                      </Badge>
                      <span className="font-bold text-[#C9A227] whitespace-nowrap">
                        {formatarDataBr(ev.data_inicio)}
                      </span>
                    </div>
                    <h4 className="font-serif font-bold text-xs sm:text-sm text-[#1E3A5F] group-hover:text-amber-800 transition-colors">
                      {ev.titulo}
                    </h4>
                    {ev.descricao && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">{ev.descricao}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <CalendarDays className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">Nenhum evento futuro agendado.</p>
                <Button asChild size="sm" variant="outline" className="text-xs border-[#E6E2D8]">
                  <Link to="/admin/calendario">Cadastrar Festa</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Atalho Pastoral de Acompanhamento */}
          <div className="grid grid-cols-2 gap-3">
            {/* In Memória */}
            <Link
              to="/admin/membros?aba=in_memoria"
              className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-[#102A45] text-white border border-slate-700/80 shadow-xs hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <Cross className="w-4 h-4 text-amber-200" />
                <span className="text-[10px] text-slate-300 font-semibold uppercase">Solene</span>
              </div>
              <span className="font-serif font-bold text-lg block text-white">
                {stats.totalFalecidos}
              </span>
              <span className="text-[11px] text-slate-300 group-hover:text-amber-200 block truncate">
                In Memória →
              </span>
            </Link>

            {/* Inativos */}
            <Link
              to="/admin/membros?aba=inativos"
              className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-slate-900 shadow-xs hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <UserX className="w-4 h-4 text-amber-700" />
                <span className="text-[10px] text-amber-800 font-semibold uppercase">Pastoral</span>
              </div>
              <span className="font-serif font-bold text-lg block text-amber-900">
                {stats.totalInativos}
              </span>
              <span className="text-[11px] text-amber-800 group-hover:underline block truncate">
                Inativos →
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. ANIVERSARIANTES DO MÊS (MEMBROS E CONGREGADOS COM CONTATOS E WHATSAPP)
      ========================================================================= */}
      <div className="bg-white border border-[#E6E2D8] rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#E6E2D8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 border border-pink-200 flex items-center justify-center font-bold shadow-xs">
              <Cake className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A5F]">
                  Aniversariantes de {mesesNomes[hoje.getMonth()]}
                </h2>
                <Badge className="bg-pink-100 text-pink-800 border-pink-200 font-bold text-xs">
                  {aniversariantesDoMes.length} celebrações
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Membros e congregados com data de nascimento neste mês. Clique para felicitar pelo
                WhatsApp ou telefone.
              </p>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-[#E6E2D8] text-[#1E3A5F] text-xs font-semibold"
          >
            <Link to="/admin/membros?aba=aniversariantes">
              Ver todos no Rol de Membros <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        {aniversariantesDoMes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {aniversariantesDoMes.map((aniv) => {
              const eHoje = aniv.dia === hoje.getDate()
              const temContato = Boolean(aniv.whatsapp || aniv.telefone)
              const contatoExibicao = aniv.whatsapp || aniv.telefone || 'Sem contato'

              return (
                <div
                  key={aniv.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-3 ${
                    eHoje
                      ? 'bg-gradient-to-br from-pink-50 via-rose-50/50 to-amber-50/60 border-pink-300 shadow-sm ring-1 ring-pink-400'
                      : 'bg-slate-50/60 hover:bg-white border-[#E6E2D8] hover:border-pink-200 shadow-2xs'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-7 h-7 rounded-lg bg-pink-100 text-pink-700 font-bold text-xs flex items-center justify-center font-mono">
                          {String(aniv.dia).padStart(2, '0')}
                        </span>
                        <span className="text-[11px] font-bold text-pink-700 uppercase">
                          {mesesNomes[hoje.getMonth()].slice(0, 3)}
                        </span>
                      </div>

                      {eHoje ? (
                        <Badge className="bg-pink-600 text-white font-extrabold text-[10px] animate-pulse">
                          🎉 Hoje!
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase tracking-wider text-slate-500 border-slate-200"
                        >
                          {aniv.tipo === 'membro' ? 'Membro' : 'Congregado'}
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-serif font-bold text-sm text-[#1E3A5F] truncate">
                      {aniv.nome}
                    </h4>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                      <MapPin className="w-3 h-3 text-[#C9A227] shrink-0" />
                      <span className="truncate">{aniv.congregacao || 'Sede'}</span>
                      {aniv.numero_registro && (
                        <span className="text-slate-400 font-mono text-[10px]">
                          • {aniv.numero_registro}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-0.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-mono truncate">{contatoExibicao}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleFelicitar(aniv)}
                      className={`w-full text-xs h-8 font-semibold gap-1.5 ${
                        temContato
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-white border border-[#E6E2D8] text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {temContato ? 'Felicitar no WhatsApp' : 'Ver Mensagem'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            Nenhum membro ou congregado faz aniversário no mês de {mesesNomes[hoje.getMonth()]}.
          </div>
        )}
      </div>

      {/* =========================================================================
          5. CORPO MINISTERIAL: DISTRIBUIÇÃO DE OBREIROS
      ========================================================================= */}
      <div className="bg-white border border-[#E6E2D8] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E2D8]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Award className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#1E3A5F]">
                Corpo Ministerial da Igreja
              </h3>
              <p className="text-[11px] text-slate-500">Distribuição hierárquica por cargo</p>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs text-[#1E3A5F] h-7 px-2">
            <Link to="/admin/obreiros">Ver obreiros</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {['Pastor Presidente', 'Evangelista', 'Presbítero', 'Diácono', 'Auxiliar'].map(
            (cargo) => (
              <div
                key={cargo}
                className="p-3.5 rounded-2xl bg-[#F7F5F0] border border-[#E6E2D8] text-center space-y-1 hover:border-[#C9A227] transition-colors"
              >
                <span className="text-[10px] uppercase font-bold text-slate-600 block truncate">
                  {cargo}
                </span>
                <span className="font-serif text-2xl font-bold text-[#1E3A5F] block">
                  {obreirosPorCargo[cargo] || 0}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Modal para Felicitar Aniversariante */}
      <ModalFelicitarAniversariante
        open={isModalFelicitarOpen}
        onOpenChange={setIsModalFelicitarOpen}
        aniversariante={aniversarianteSelecionado}
        mensagemPadrao={
          config.mensagemAniversario ||
          'A Paz do Senhor, amado(a) irmão(ã) {nome}! A liderança da Igreja louva a Deus pela sua vida e lhe parabeniza com ricas bênçãos dos céus neste aniversário!'
        }
      />
    </div>
  )
}

export default Dashboard
