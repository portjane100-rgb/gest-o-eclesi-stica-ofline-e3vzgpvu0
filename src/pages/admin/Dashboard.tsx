import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import type {
  Membro,
  Congregado,
  Obreiro,
  Dizimista,
  CalendarioEvento,
  EscalaItem,
} from '@/types/adtc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Clock,
  FileText,
  UserPlus,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Church,
  Cake,
  UserX,
  Cross,
} from 'lucide-react'
import useRealtime from '@/hooks/use-realtime'
import { useAuth } from '@/contexts/AuthContext'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'

export const Dashboard: React.FC = () => {
  const { podeAcessarFinanceiro } = useAuth()
  const { config } = useChurchConfig()
  const { total: totalUnidades } = useCongregacoes()
  const [stats, setStats] = useState({
    totalMembros: 0,
    totalCongregados: 0,
    totalObreiros: 0,
    totalDizimistasMes: 0,
    totalEventosFuturos: 0,
    totalAniversariantesHoje: 0,
    totalFalecidos: 0,
    totalInativos: 0,
  })
  const [obreirosPorCargo, setObreirosPorCargo] = useState<Record<string, number>>({})
  const [ultimosMembros, setUltimosMembros] = useState<Membro[]>([])
  const [proximosEventos, setProximosEventos] = useState<CalendarioEvento[]>([])
  const [proximasEscalas, setProximasEscalas] = useState<EscalaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [
          membrosRes,
          todosMembros,
          todosCongregados,
          obreirosRes,
          dizimistasRes,
          eventosRes,
          escalaRes,
        ] = await Promise.all([
          pb.collection('membros').getList<Membro>(1, 5, {
            filter: "status='Ativo'",
            sort: '-created',
          }),
          pb.collection('membros').getFullList<Membro>(),
          pb.collection('congregados').getFullList<Congregado>(),
          pb.collection('obreiros').getFullList<Obreiro>({ filter: "status='Ativo'" }),
          pb.collection('dizimistas').getList<Dizimista>(1, 1),
          pb.collection('calendario').getList<CalendarioEvento>(1, 4, { sort: 'data_inicio' }),
          pb.collection('escala').getList<EscalaItem>(1, 3, { sort: 'data' }),
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

        // In Memória (Falecidos): membros + congregados com status='Falecido'
        const membrosFalecidos = todosMembros.filter((m) =>
          (m.status || '').toLowerCase().includes('falecido'),
        ).length
        const congregadosFalecidos = todosCongregados.filter((c) =>
          ((c as any).situacao || c.status || '').toLowerCase().includes('falecido'),
        ).length
        const totalFalecidosGeral = membrosFalecidos + congregadosFalecidos

        // Inativos: membros + congregados com status='Inativo/Afastado'
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

        // Calcular aniversariantes de hoje unificados (Membros Ativos + Congregados Ativos)
        const hoje = new Date()
        const diaHoje = hoje.getDate()
        const mesHoje = hoje.getMonth() + 1

        const matchHoje = (dataIso?: string, dataTexto?: string) => {
          if (dataIso) {
            const partes = dataIso.slice(0, 10).split('-')
            if (partes.length === 3) {
              const mes = parseInt(partes[1], 10)
              const dia = parseInt(partes[2], 10)
              if (dia === diaHoje && mes === mesHoje) return true
            }
          }
          const txt = dataTexto || (dataIso && dataIso.includes('/') ? dataIso : '')
          if (txt) {
            const match = txt.match(/(\d{1,2})[/.-](\d{1,2})/)
            if (match) {
              const dia = parseInt(match[1], 10)
              const mes = parseInt(match[2], 10)
              if (dia === diaHoje && mes === mesHoje) return true
            }
          }
          return false
        }

        const anivMembrosCount = membrosAtivos.filter((m) =>
          matchHoje(m.data_nascimento, m.data_nascimento_texto),
        ).length

        const anivCongregadosCount = congregadosAtivos.filter((c) =>
          matchHoje(c.data_nascimento, (c as any).data_nascimento_texto),
        ).length

        const anivHojeCount = anivMembrosCount + anivCongregadosCount

        // Agrupamento por cargo de obreiros
        const cargosCount: Record<string, number> = {}
        obreirosRes.forEach((ob) => {
          cargosCount[ob.cargo] = (cargosCount[ob.cargo] || 0) + 1
        })

        setStats({
          totalMembros: membrosRes.totalItems,
          totalCongregados: congregadosAtivos.length,
          totalObreiros: obreirosRes.length,
          totalDizimistasMes: dizimistasRes.totalItems,
          totalEventosFuturos: eventosRes.totalItems,
          totalAniversariantesHoje: anivHojeCount,
          totalFalecidos: totalFalecidosGeral,
          totalInativos: totalInativosGeral,
        })
        setObreirosPorCargo(cargosCount)
        setUltimosMembros(membrosRes.items)
        setProximosEventos(eventosRes.items)
        setProximasEscalas(escalaRes.items)
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  // Atualização em tempo real para membros e congregados
  const refreshMembrosECongregados = async () => {
    try {
      const [todosMembros, todosCongregados] = await Promise.all([
        pb.collection('membros').getFullList<Membro>(),
        pb.collection('congregados').getFullList<Congregado>(),
      ])

      const membrosAtivos = todosMembros.filter((m) => {
        const s = (m.status || 'Ativo').toLowerCase()
        return s.includes('ativo') && !s.includes('inativo') && !s.includes('falecido')
      })
      const congregadosAtivos = todosCongregados.filter((c) => {
        const s = ((c as any).situacao || c.status || 'Ativo').toLowerCase()
        return s.includes('ativo') && !s.includes('inativo') && !s.includes('falecido')
      })

      const membrosFalecidos = todosMembros.filter((m) =>
        (m.status || '').toLowerCase().includes('falecido'),
      ).length
      const congregadosFalecidos = todosCongregados.filter((c) =>
        ((c as any).situacao || c.status || '').toLowerCase().includes('falecido'),
      ).length

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

      setStats((prev) => ({
        ...prev,
        totalMembros: membrosAtivos.length,
        totalCongregados: congregadosAtivos.length,
        totalFalecidos: membrosFalecidos + congregadosFalecidos,
        totalInativos: membrosInativos + congregadosInativos,
      }))
    } catch (err) {
      console.warn('Erro ao atualizar contadores do dashboard via realtime:', err)
    }
  }

  useRealtime<Membro>('membros', () => refreshMembrosECongregados())
  useRealtime<Congregado>('congregados', () => refreshMembrosECongregados())

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Boas-vindas e introdução */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E6E2D8] shadow-xs">
        <div>
          <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-xs uppercase tracking-wider mb-1">
            Gestão Integrada
          </Badge>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3A5F]">
            Painel Geral da {config.siglaIgreja || config.nomeIgreja || 'Igreja'}
          </h1>
          <p className="text-xs sm:text-sm text-[#5A5A5A]">
            Controle eclesiástico de membros, congregações, dizimistas, escalas e emissão de
            documentos.
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="bg-[#1E3A5F] hover:bg-[#16304F] text-white">
            <Link to="/admin/membros?novo=true">
              <UserPlus className="w-4 h-4 mr-1.5" />
              Cadastrar Membro
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-[#C9A227] text-[#C9A227] hover:bg-[#C9A227]/10"
          >
            <Link to="/admin/documentos">
              <FileText className="w-4 h-4 mr-1.5" />
              Gerar Documento
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-[#E6E2D8] text-[#1E3A5F] hover:bg-slate-50"
          >
            <Link to="/admin/escala?novo=true">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Nova Escala
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Aniversariantes de Hoje */}
        <Card className="border-[#E6E2D8] bg-white shadow-xs hover:border-pink-300 transition group">
          <Link to="/admin/membros?aba=aniversariantes" className="block">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#5A5A5A] uppercase tracking-wider">
                  Aniversariantes
                </span>
                <p className="font-serif text-2xl font-bold text-pink-700">
                  {stats.totalAniversariantesHoje}
                </p>
                <span className="text-[11px] text-pink-600 font-medium group-hover:underline">
                  Aniversariantes de hoje →
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Cake className="w-6 h-6" />
              </div>
            </CardContent>
          </Link>
        </Card>

        {/* Total Membros */}
        <Card className="border-[#E6E2D8] bg-white shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#5A5A5A] uppercase tracking-wider">
                Membros
              </span>
              <p className="font-serif text-2xl font-bold text-[#1E3A5F]">{stats.totalMembros}</p>
              <span className="text-[11px] text-emerald-600 font-medium">Em comunhão</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1E3A5F] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Congregados */}
        <Card className="border-[#E6E2D8] bg-white shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#5A5A5A] uppercase tracking-wider">
                Congregados
              </span>
              <p className="font-serif text-2xl font-bold text-[#1E3A5F]">
                {stats.totalCongregados}
              </p>
              <span className="text-[11px] text-slate-500 font-medium">
                Nas {totalUnidades} {totalUnidades === 1 ? 'unidade' : 'unidades'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#C9A227] flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Obreiros */}
        <Card className="border-[#E6E2D8] bg-white shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#5A5A5A] uppercase tracking-wider">
                Obreiros
              </span>
              <p className="font-serif text-2xl font-bold text-[#1E3A5F]">{stats.totalObreiros}</p>
              <span className="text-[11px] text-slate-500 font-medium">Corpo Ministerial</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Dizimistas do Mês - Apenas para Tesoureiro/Admin */}
        {podeAcessarFinanceiro && (
          <Card className="border-[#E6E2D8] bg-white shadow-xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#5A5A5A] uppercase tracking-wider">
                  Dizimistas
                </span>
                <p className="font-serif text-2xl font-bold text-[#1E3A5F]">
                  {stats.totalDizimistasMes}
                </p>
                <span className="text-[11px] text-purple-600 font-medium">Sessão Financeira</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Eventos Futuros */}
        <Card className="border-[#E6E2D8] bg-white shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#5A5A5A] uppercase tracking-wider">
                Eventos
              </span>
              <p className="font-serif text-2xl font-bold text-[#1E3A5F]">
                {stats.totalEventosFuturos}
              </p>
              <span className="text-[11px] text-[#C9A227] font-medium">No calendário</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center">
              <CalendarDays className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cartões / Atalhos Especiais de Situações Eclesiásticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* In Memória */}
        <Card className="border border-slate-300/80 bg-gradient-to-r from-slate-900 via-slate-800 to-[#102A45] text-white shadow-md hover:shadow-lg transition-all group overflow-hidden relative">
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-white/5 pointer-events-none transform -skew-x-12 translate-x-8" />
          <Link to="/admin/membros?aba=in_memoria" className="block">
            <CardContent className="p-5 flex items-center justify-between relative z-10">
              <div className="space-y-1.5 max-w-[75%]">
                <div className="flex items-center gap-2">
                  <Badge className="bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-[10px] uppercase tracking-wider">
                    Arquivo Solene
                  </Badge>
                  <span className="text-[11px] text-slate-300 font-medium">Em Cristo</span>
                </div>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-100 group-hover:text-amber-200 transition-colors">
                  In Memória
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Irmãos que concluíram sua carreira na fé
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <span className="font-serif text-2xl sm:text-3xl font-bold text-white">
                    {stats.totalFalecidos}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    {stats.totalFalecidos === 1 ? 'irmão registrado' : 'irmãos registrados'}
                  </span>
                  <span className="text-xs text-amber-300 font-semibold ml-2 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Acessar sessão →
                  </span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 text-slate-200 flex items-center justify-center group-hover:scale-105 group-hover:bg-white/15 transition-all shadow-inner">
                <Cross className="w-7 h-7 text-amber-200/90" />
              </div>
            </CardContent>
          </Link>
        </Card>

        {/* Inativos */}
        <Card className="border-2 border-amber-300/80 bg-gradient-to-r from-amber-50 via-white to-amber-50/70 text-slate-900 shadow-md hover:shadow-lg transition-all group overflow-hidden relative">
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-amber-200/20 pointer-events-none transform -skew-x-12 translate-x-8" />
          <Link to="/admin/membros?aba=inativos" className="block">
            <CardContent className="p-5 flex items-center justify-between relative z-10">
              <div className="space-y-1.5 max-w-[75%]">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] uppercase tracking-wider border border-amber-600">
                    Acompanhamento
                  </Badge>
                  <span className="text-[11px] text-amber-800 font-medium">Pastoral</span>
                </div>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1E3A5F] group-hover:text-amber-700 transition-colors">
                  Inativos
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cadastros pausados ou afastados temporariamente
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <span className="font-serif text-2xl sm:text-3xl font-bold text-amber-700">
                    {stats.totalInativos}
                  </span>
                  <span className="text-xs text-slate-600 font-medium">
                    {stats.totalInativos === 1 ? 'cadastro pausado' : 'cadastros pausados'}
                  </span>
                  <span className="text-xs text-amber-800 font-semibold ml-2 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Gerenciar inativos →
                  </span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center group-hover:scale-105 group-hover:bg-amber-200 transition-all shadow-inner">
                <UserX className="w-7 h-7 text-amber-700" />
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Distribuição de Obreiros por Cargo */}
      <Card className="border-[#E6E2D8] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E6E2D8]">
          <CardTitle className="font-serif text-base font-bold text-[#1E3A5F] flex items-center gap-2">
            <Award className="w-4 h-4 text-[#C9A227]" />
            Distribuição do Corpo de Obreiros
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {['Pastor Presidente', 'Evangelista', 'Presbítero', 'Diácono', 'Auxiliar'].map(
              (cargo) => (
                <div
                  key={cargo}
                  className="p-3 rounded-xl bg-[#F7F5F0] border border-[#E6E2D8] text-center space-y-1"
                >
                  <span className="text-[10px] uppercase font-bold text-[#5A5A5A] block truncate">
                    {cargo}
                  </span>
                  <span className="font-serif text-xl font-bold text-[#1E3A5F]">
                    {obreirosPorCargo[cargo] || 0}
                  </span>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grids Recentes: Últimos Membros e Próximos Eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos Membros Cadastrados */}
        <Card className="border-[#E6E2D8] bg-white shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-[#E6E2D8] flex flex-row items-center justify-between">
              <CardTitle className="font-serif text-base font-bold text-[#1E3A5F] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C9A227]" />
                Últimos Membros Cadastrados
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs text-[#1E3A5F]">
                <Link to="/admin/membros">Ver todos</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {ultimosMembros.length > 0 ? (
                ultimosMembros.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-[#F7F5F0]/60 border border-[#E6E2D8]/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <h4 className="font-serif font-bold text-[#1E3A5F]">{m.nome}</h4>
                      <p className="text-[11px] text-[#5A5A5A]">
                        {m.congregacao} • Reg: {m.numero_registro || 'N/D'}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50"
                    >
                      {m.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  Nenhum membro listado.
                </p>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Próximos Eventos do Calendário */}
        <Card className="border-[#E6E2D8] bg-white shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-[#E6E2D8] flex flex-row items-center justify-between">
              <CardTitle className="font-serif text-base font-bold text-[#1E3A5F] flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#C9A227]" />
                Próximas Festas e Congressos
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs text-[#1E3A5F]">
                <Link to="/admin/calendario">Ver agenda</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {proximosEventos.length > 0 ? (
                proximosEventos.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-[#F7F5F0]/60 border border-[#E6E2D8]/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <h4 className="font-serif font-bold text-[#1E3A5F]">{ev.titulo}</h4>
                      <p className="text-[11px] text-[#5A5A5A]">{ev.departamento || 'Geral'}</p>
                    </div>
                    <span className="text-[11px] font-bold text-[#C9A227] whitespace-nowrap">
                      {formatarDataBr(ev.data_inicio)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  Nenhum evento futuro cadastrado.
                </p>
              )}
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
