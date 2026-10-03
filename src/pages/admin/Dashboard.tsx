import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getItems } from '@/lib/dataClient'
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
  Calendar as CalendarIcon,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react'
import useRealtime from '@/hooks/use-realtime'
import { useAuth } from '@/contexts/AuthContext'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
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
      const [todosMembros, todosCongregados, obreirosRes, todosDizimistas, eventosRes] =
        await Promise.all([
          getItems<Membro>('membros'),
          getItems<Congregado>('congregados'),
          getItems<Obreiro>('obreiros'),
          getItems<Dizimista>('dizimistas'),
          getItems<CalendarioEvento>('calendario', { sort: 'data_inicio' }),
        ])

      const obreirosAtivos = obreirosRes.filter((ob) =>
        (ob.status || 'Ativo').toLowerCase().includes('ativo'),
      )

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
        totalMembros: membrosAtivos.length,
        totalCongregados: congregadosAtivos.length,
        totalObreiros: obreirosAtivos.length,
        totalDizimistasMes: todosDizimistas.length,
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
          <div className="flex items-start sm:items-center gap-4">
            {config.logoUrl && (
              <img
                src={config.logoUrl}
                alt={config.nomeIgreja || 'Logo da Igreja'}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-white p-1 border-2 border-[#C9A227] shadow-lg flex-shrink-0"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
            <div className="space-y-2 max-w-2xl">
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
                  {config.siglaIgreja || config.nomeIgreja || 'Gestão Eclesiástica'}
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {config.denominacao || 'Sistema de Gestão Eclesiástica Integrado'} — Rol de membros,
                congregações, dizimistas, escalas e emissão oficial de documentos.
              </p>
            </div>
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
          2. CARTÕES DE MÓDULOS (CORES VIVAS, ÍCONES PADRONIZADOS, PALETA DOURADO/AZUL)
      ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Membros Ativos */}
        <Link to="/admin/membros" className="block group">
          <Card className="border-2 border-blue-200/90 hover:border-[#1E3A5F] bg-gradient-to-b from-white to-blue-50/40 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden h-full">
            <CardContent className="p-4 space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#2B5282] text-white shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform ring-2 ring-blue-200">
                <Users className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                  Rol de Membros
                </span>
                <span className="font-serif text-2xl font-bold text-[#1E3A5F] block">
                  {stats.totalMembros}
                </span>
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Em comunhão
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Congregados */}
        <Link to="/admin/congregados" className="block group">
          <Card className="border-2 border-amber-300/80 hover:border-[#C9A227] bg-gradient-to-b from-white to-amber-50/50 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden h-full">
            <CardContent className="p-4 space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#C9A227] to-[#997610] text-white shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform ring-2 ring-amber-200">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                  Congregados
                </span>
                <span className="font-serif text-2xl font-bold text-[#1E3A5F] block">
                  {stats.totalCongregados}
                </span>
                <span className="text-[11px] text-amber-800 font-semibold">
                  {totalUnidades} {totalUnidades === 1 ? 'congregação' : 'congregações'}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Corpo de Obreiros */}
        <Link to="/admin/obreiros" className="block group">
          <Card className="border-2 border-emerald-300/80 hover:border-emerald-600 bg-gradient-to-b from-white to-emerald-50/40 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden h-full">
            <CardContent className="p-4 space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform ring-2 ring-emerald-200">
                <Award className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                  Obreiros
                </span>
                <span className="font-serif text-2xl font-bold text-[#1E3A5F] block">
                  {stats.totalObreiros}
                </span>
                <span className="text-[11px] text-emerald-700 font-bold">Corpo Ministerial</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Aniversariantes do Mês */}
        <Link to="/admin/membros?aba=aniversariantes" className="block group">
          <Card className="border-2 border-pink-300/80 hover:border-pink-500 bg-gradient-to-b from-white to-pink-50/50 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden h-full">
            <CardContent className="p-4 space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform ring-2 ring-pink-200">
                <Cake className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-900 block">
                  Aniversariantes
                </span>
                <span className="font-serif text-2xl font-bold text-pink-700 block">
                  {stats.totalAniversariantesMes}
                </span>
                <span className="text-[11px] text-pink-600 font-bold">
                  {stats.totalAniversariantesHoje > 0
                    ? `🎉 ${stats.totalAniversariantesHoje} celebrando hoje!`
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
          <Card className="border-2 border-purple-300/80 hover:border-purple-600 bg-gradient-to-b from-white to-purple-50/40 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden h-full">
            <CardContent className="p-4 space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-700 to-indigo-900 text-white shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform ring-2 ring-purple-200">
                <Wallet className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 block">
                  Dízimos & Ofertas
                </span>
                <span className="font-serif text-2xl font-bold text-[#1E3A5F] block">
                  {stats.totalDizimistasMes}
                </span>
                <span className="text-[11px] text-purple-700 font-bold">
                  {podeAcessarFinanceiro ? 'Sessão Financeira' : 'Acesso Restrito'}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Eventos / Festas */}
        <Link to="/admin/calendario" className="block group">
          <Card className="border-2 border-indigo-300/80 hover:border-[#1E3A5F] bg-gradient-to-b from-white to-indigo-50/40 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden h-full">
            <CardContent className="p-4 space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1E3A5F] via-[#102A45] to-amber-600 text-white shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform ring-2 ring-indigo-200">
                <CalendarDays className="w-5 h-5 text-[#C9A227]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block">
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
          3. SEÇÃO PRINCIPAL COMPACTA: CALENDÁRIO ENXUTO + PRÓXIMOS EVENTOS + ACOMPANHAMENTO
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Calendário Mensal Compacto e Enxuto (7 colunas lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white border border-[#E6E2D8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
          {/* Cabeçalho do Calendário Compacto */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E6E2D8]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1E3A5F] to-[#12243B] text-[#C9A227] flex items-center justify-center font-bold shadow-xs">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif text-base sm:text-lg font-bold text-[#1E3A5F] flex items-center gap-1.5 leading-tight">
                  <span>
                    {mesesNomes[mesAtual]} {anoAtual}
                  </span>
                  <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-[9px] px-1.5 py-0 h-4 uppercase">
                    Festas
                  </Badge>
                </h2>
                <span className="text-[10px] text-slate-500">
                  Pontos coloridos indicam eventos no dia
                </span>
              </div>
            </div>

            {/* Controles de Navegação de Mês */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={voltarMesAtual}
                className="text-[11px] h-7 px-2 border-[#E6E2D8] text-slate-700"
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => mudarMes(-1)}
                className="h-7 w-7 border-[#E6E2D8] text-[#1E3A5F]"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => mudarMes(1)}
                className="h-7 w-7 border-[#E6E2D8] text-[#1E3A5F]"
                title="Próximo Mês"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Grade de Dias da Semana Compacta */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-500 pb-0.5">
            <span className="text-rose-600">D</span>
            <span>S</span>
            <span>T</span>
            <span>Q</span>
            <span>Q</span>
            <span>S</span>
            <span className="text-blue-600">S</span>
          </div>

          {/* Grade de Células Compactas do Calendário com Pontinhos */}
          <div className="grid grid-cols-7 gap-1">
            {gridDias.map((dia, idx) => {
              const temEvento = dia.eventos.length > 0
              const selecionado = dia.mesAtual && diaSelecionado === dia.numero
              const titulosTooltip = temEvento
                ? dia.eventos.map((e) => `• ${e.titulo}`).join('\n')
                : ''

              return (
                <button
                  key={`${dia.numero}-${idx}`}
                  type="button"
                  disabled={!dia.mesAtual}
                  title={
                    dia.mesAtual
                      ? `${dia.numero} de ${mesesNomes[mesAtual]}${titulosTooltip ? `\n${titulosTooltip}` : ''}`
                      : ''
                  }
                  onClick={() => dia.mesAtual && setDiaSelecionado(dia.numero)}
                  className={`h-9 sm:h-10 p-1 rounded-lg text-center flex flex-col items-center justify-between transition-all duration-150 relative ${
                    !dia.mesAtual
                      ? 'bg-slate-50/40 text-slate-300 cursor-default opacity-30'
                      : selecionado
                        ? 'bg-[#1E3A5F] text-white shadow-xs font-bold ring-2 ring-[#C9A227]'
                        : dia.isHoje
                          ? 'bg-amber-100/80 border border-[#C9A227] text-slate-900 font-extrabold'
                          : temEvento
                            ? 'bg-blue-50/80 border border-blue-200/90 text-slate-900 hover:bg-blue-100/70 font-semibold'
                            : 'bg-white border border-slate-100 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`text-[11px] sm:text-xs leading-none ${
                      selecionado
                        ? 'text-white'
                        : dia.isHoje
                          ? 'text-[#8C6D15] font-extrabold'
                          : 'text-slate-800'
                    }`}
                  >
                    {dia.numero}
                  </span>

                  {/* Marcadores em pontinho/bolinhas discretas */}
                  {temEvento && (
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      {dia.eventos.slice(0, 3).map((ev, eIdx) => (
                        <span
                          key={ev.id || eIdx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            selecionado
                              ? 'bg-amber-300'
                              : eIdx === 0
                                ? 'bg-[#C9A227]'
                                : eIdx === 1
                                  ? 'bg-[#1E3A5F]'
                                  : 'bg-emerald-600'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Detalhes do Dia Selecionado Enxutos */}
          {diaSelecionado && (
            <div className="p-3 rounded-xl bg-[#F7F5F0] border border-[#E6E2D8] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E3A5F] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#C9A227]" />
                  Dia {diaSelecionado} de {mesesNomes[mesAtual]}:
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {eventosDoDiaSelecionado.length === 0
                    ? 'Nenhum evento'
                    : `${eventosDoDiaSelecionado.length} evento(s)`}
                </span>
              </div>

              {eventosDoDiaSelecionado.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {eventosDoDiaSelecionado.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2 bg-white border border-[#E6E2D8] rounded-lg flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 h-4 border-[#C9A227] text-[#8C6D15] bg-[#F1EBD8]/50"
                          >
                            {ev.departamento || 'Geral'}
                          </Badge>
                          <h4 className="font-serif font-bold text-xs text-[#1E3A5F] truncate">
                            {ev.titulo}
                          </h4>
                        </div>
                        {ev.descricao && (
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {ev.descricao}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-[#C9A227] shrink-0">
                        {formatarDataBr(ev.data_inicio)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  Dia livre de eventos institucionais no calendário oficial.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Coluna Lateral Compacta: Próximos Compromissos & Atalhos Pastorais (5 colunas lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E6E2D8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E2D8]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-[#C9A227] flex items-center justify-center font-bold">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-serif text-sm sm:text-base font-bold text-[#1E3A5F]">
                    Próximos Compromissos
                  </h3>
                  <p className="text-[10px] text-slate-500">Festas e celebrações futuras</p>
                </div>
              </div>

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs text-[#1E3A5F] h-6 px-1.5"
              >
                <Link to="/admin/calendario">Ver agenda</Link>
              </Button>
            </div>

            {proximosCompromissos.length > 0 ? (
              <div className="space-y-2">
                {proximosCompromissos.slice(0, 4).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-[#C9A227] transition-all space-y-0.5 group"
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 h-4 border-[#C9A227] text-[#8C6D15] bg-[#F1EBD8]/40"
                      >
                        {ev.departamento || 'Geral'}
                      </Badge>
                      <span className="font-bold text-[#C9A227] whitespace-nowrap">
                        {formatarDataBr(ev.data_inicio)}
                      </span>
                    </div>
                    <h4 className="font-serif font-bold text-xs text-[#1E3A5F] group-hover:text-amber-800 transition-colors truncate">
                      {ev.titulo}
                    </h4>
                    {ev.descricao && (
                      <p className="text-[10px] text-slate-500 line-clamp-1">{ev.descricao}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 space-y-1.5">
                <CalendarDays className="w-6 h-6 mx-auto text-slate-300" />
                <p className="text-xs">Nenhum evento futuro agendado.</p>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 border-[#E6E2D8]"
                >
                  <Link to="/admin/calendario">Cadastrar Festa</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Atalho Pastoral de Acompanhamento */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* In Memória */}
            <Link
              to="/admin/membros?aba=in_memoria"
              className="p-3 rounded-xl bg-gradient-to-br from-slate-900 to-[#102A45] text-white border border-slate-700/80 shadow-xs hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-0.5">
                <Cross className="w-3.5 h-3.5 text-amber-200" />
                <span className="text-[9px] text-slate-300 font-semibold uppercase">Solene</span>
              </div>
              <span className="font-serif font-bold text-base block text-white">
                {stats.totalFalecidos}
              </span>
              <span className="text-[10px] text-slate-300 group-hover:text-amber-200 block truncate">
                In Memória →
              </span>
            </Link>

            {/* Inativos */}
            <Link
              to="/admin/membros?aba=inativos"
              className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-slate-900 shadow-xs hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-0.5">
                <UserX className="w-3.5 h-3.5 text-amber-700" />
                <span className="text-[9px] text-amber-800 font-semibold uppercase">Pastoral</span>
              </div>
              <span className="font-serif font-bold text-base block text-amber-900">
                {stats.totalInativos}
              </span>
              <span className="text-[10px] text-amber-800 group-hover:underline block truncate">
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
                Membros e congregados com data de nascimento neste mês.
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
    </div>
  )
}

export default Dashboard
