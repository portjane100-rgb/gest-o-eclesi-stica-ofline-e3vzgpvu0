import React, { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Congregado, SituacaoEclesiastica } from '@/types/adtc'
import { UNIDADES } from '@/types/adtc'
import { useCongregacoes } from '@/hooks/useCongregacoes'
import useRealtime from '@/hooks/use-realtime'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatarDataBr } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  UserCheck,
  UserX,
  Loader2,
  AlertTriangle,
  Download,
  RotateCcw,
  Droplets,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import { FileText } from 'lucide-react'

type AbaCongregados = 'ativos' | 'inativos' | 'in_memoria'

export const AdminCongregados: React.FC = () => {
  const { config } = useChurchConfig()
  const { nomes: nomesRaw } = useCongregacoes()
  const unidadesLista = nomesRaw || []
  const [congregados, setCongregados] = useState<Congregado[]>([])
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<AbaCongregados>('ativos')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingCongregado, setEditingCongregado] = useState<Congregado | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Form State (Cadastro/Edição de Congregado)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [congregacao, setCongregacao] = useState<Congregado['congregacao']>('Sede')
  const [status, setStatus] = useState<SituacaoEclesiastica>('Ativo')

  // FRENTE 3: Fluxo de Batismo do Congregado (Conversão em Membro)
  const [isBatismoModalOpen, setIsBatismoModalOpen] = useState(false)
  const [congregadoBatismo, setCongregadoBatismo] = useState<Congregado | null>(null)
  const [isSubmittingBatismo, setIsSubmittingBatismo] = useState(false)
  const [batismoForm, setBatismoForm] = useState({
    nome: '',
    numero_ficha: '',
    numero_registro: '',
    filiacao: '',
    naturalidade: '',
    estado_civil: '',
    rg: '',
    cpf: '',
    endereco: '',
    observacao: '',
    telefone: '',
    congregacao: 'Sede' as Congregado['congregacao'],
    data_nascimento: '',
    data_nascimento_texto: '',
    data_conversao: '',
    data_conversao_texto: '',
    data_batismo: '',
    data_batismo_texto: '',
  })

  const loadData = async () => {
    try {
      const recordsCongregados = await pb.collection('congregados').getFullList<Congregado>({
        sort: 'nome',
      })
      setCongregados(recordsCongregados)
    } catch (err) {
      console.error('Erro ao buscar congregados:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime<Congregado>('congregados', () => loadData())

  const resetForm = () => {
    setNome('')
    setTelefone('')
    setWhatsapp('')
    setDataNascimento('')
    setCongregacao('Sede')
    setStatus('Ativo')
    setErrors({})
    setEditingCongregado(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleOpenEdit = (c: Congregado) => {
    setEditingCongregado(c)
    setNome(c.nome || '')
    setTelefone(c.telefone || '')
    setWhatsapp(c.whatsapp || '')
    setDataNascimento(c.data_nascimento ? c.data_nascimento.slice(0, 10) : '')
    setCongregacao(c.congregacao)
    setStatus((c.status as SituacaoEclesiastica) || 'Ativo')
    setErrors({})
    setIsModalOpen(true)
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
      const payload: Record<string, any> = {
        nome: nome.trim(),
        congregacao,
        status,
      }
      if (telefone.trim()) payload.telefone = telefone.trim()
      if (whatsapp.trim()) payload.whatsapp = whatsapp.trim()
      if (dataNascimento) payload.data_nascimento = `${dataNascimento} 12:00:00.000Z`

      if (editingCongregado) {
        await pb.collection('congregados').update(editingCongregado.id, payload)
        toast({ title: 'Congregado atualizado com sucesso!' })
      } else {
        await pb.collection('congregados').create(payload)
        toast({ title: 'Congregado cadastrado com sucesso!' })
      }

      setIsModalOpen(false)
      resetForm()
      loadData()
    } catch (err: any) {
      if (err?.data?.data) {
        const backendErrors: Record<string, string> = {}
        for (const [key, val] of Object.entries(err.data.data)) {
          backendErrors[key] = (val as any)?.message || 'Valor inválido'
        }
        setErrors(backendErrors)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar congregado',
          description: err?.message,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Mudança de Situação (Ativo <-> Inativo <-> Falecido)
  const handleChangeStatus = async (congregado: Congregado, novoStatus: SituacaoEclesiastica) => {
    try {
      await pb.collection('congregados').update(congregado.id, { status: novoStatus })
      toast({
        title: `Situação de ${congregado.nome} alterada para ${novoStatus}.`,
        description:
          novoStatus === 'Ativo'
            ? 'Congregado reativado e visível nas listas ativas.'
            : 'Registro preservado no histórico da igreja.',
      })
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar situação',
        description: err?.message,
      })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    try {
      await pb.collection('congregados').delete(deletingId)
      toast({ title: 'Congregado removido com sucesso.' })
      setIsDeleteModalOpen(false)
      setDeletingId(null)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir congregado',
        description: err?.message,
      })
    }
  }

  // ==========================================
  // FRENTE 3: FLUXO DE BATISMO DO CONGREGADO
  // ==========================================
  const handleOpenBatismo = async (c: Congregado) => {
    setCongregadoBatismo(c)

    // Buscar membros para sugerir o próximo número de ficha oficial
    let proximaFicha = '1'
    try {
      const membrosRes = await pb.collection('membros').getFullList({ sort: '-created' })
      let max = 0
      membrosRes.forEach((m: any) => {
        if (m.numero_ficha) {
          const n = parseInt(m.numero_ficha, 10)
          if (!isNaN(n) && n > max) max = n
        }
      })
      proximaFicha = (max + 1).toString()
    } catch (e) {
      console.warn('Erro ao obter próximo número de ficha:', e)
    }

    const hojeYmd = new Date().toISOString().slice(0, 10)

    setBatismoForm({
      nome: c.nome || '',
      numero_ficha: proximaFicha,
      numero_registro: '',
      filiacao: '',
      naturalidade: '',
      estado_civil: 'Solteiro(a)',
      rg: '',
      cpf: '',
      endereco: '',
      observacao: 'Batizado(a) — ex-congregado',
      telefone: c.telefone || '',
      congregacao: c.congregacao,
      data_nascimento: c.data_nascimento ? c.data_nascimento.slice(0, 10) : '',
      data_nascimento_texto: '',
      data_conversao: '',
      data_conversao_texto: '',
      data_batismo: hojeYmd,
      data_batismo_texto: '',
    })

    setIsBatismoModalOpen(true)
  }

  const handleSubmitBatismo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!congregadoBatismo) return
    if (!batismoForm.nome.trim()) {
      toast({ variant: 'destructive', title: 'O nome completo é obrigatório.' })
      return
    }

    setIsSubmittingBatismo(true)
    try {
      // 1. Criar membro com cadastro COMPLETO e número de ficha oficial
      const payloadMembro: Record<string, any> = {
        nome: batismoForm.nome.trim(),
        numero_ficha: batismoForm.numero_ficha.trim(),
        numero_registro: batismoForm.numero_registro.trim(),
        filiacao: batismoForm.filiacao.trim(),
        naturalidade: batismoForm.naturalidade.trim(),
        estado_civil: batismoForm.estado_civil.trim(),
        rg: batismoForm.rg.trim(),
        cpf: batismoForm.cpf.trim(),
        endereco: batismoForm.endereco.trim(),
        observacao: batismoForm.observacao.trim(),
        congregacao: batismoForm.congregacao,
        status: 'Ativo',
        data_nascimento_texto: batismoForm.data_nascimento_texto.trim(),
        data_conversao_texto: batismoForm.data_conversao_texto.trim(),
        data_batismo_texto: batismoForm.data_batismo_texto.trim(),
      }

      if (batismoForm.telefone.trim()) payloadMembro.telefone = batismoForm.telefone.trim()
      if (batismoForm.data_nascimento)
        payloadMembro.data_nascimento = `${batismoForm.data_nascimento} 12:00:00.000Z`
      if (batismoForm.data_conversao)
        payloadMembro.data_conversao = `${batismoForm.data_conversao} 12:00:00.000Z`
      if (batismoForm.data_batismo)
        payloadMembro.data_batismo = `${batismoForm.data_batismo} 12:00:00.000Z`

      await pb.collection('membros').create(payloadMembro)

      // 2. APAGAR o registro de congregado conforme especificação exata
      await pb.collection('congregados').delete(congregadoBatismo.id)

      toast({
        title: 'Batismo registrado com sucesso!',
        description: `${batismoForm.nome} agora é membro oficial (Ficha nº ${batismoForm.numero_ficha || 'N/D'}). O cadastro de congregado foi removido.`,
      })

      setIsBatismoModalOpen(false)
      setCongregadoBatismo(null)
      loadData()
    } catch (err: any) {
      console.error('Erro no fluxo de batismo:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao processar batismo',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setIsSubmittingBatismo(false)
    }
  }

  // Filtragem
  const congregadosFiltrados = congregados.filter((c) => {
    const s = (c.status || 'Ativo').toLowerCase()
    if (abaAtiva === 'ativos') {
      return s.includes('ativo') && !s.includes('inativo') && !s.includes('falecido')
    }
    if (abaAtiva === 'inativos') {
      return (s.includes('inativo') || s.includes('afastado')) && !s.includes('falecido')
    }
    if (abaAtiva === 'in_memoria') {
      return s.includes('falecido')
    }

    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      c.nome.toLowerCase().includes(term) ||
      c.congregacao.toLowerCase().includes(term) ||
      (c.telefone && c.telefone.includes(term))
    )
  })

  // Contadores
  const totalAtivos = congregados.filter((c) => {
    const s = (c.status || 'Ativo').toLowerCase()
    return s.includes('ativo') && !s.includes('inativo') && !s.includes('falecido')
  }).length
  const totalInativos = congregados.filter((c) => {
    const s = (c.status || '').toLowerCase()
    return (s.includes('inativo') || s.includes('afastado')) && !s.includes('falecido')
  }).length
  const totalFalecidos = congregados.filter((c) =>
    (c.status || '').toLowerCase().includes('falecido'),
  ).length

  const handleBaixarPdf = () => {
    setGerandoPdf(true)
    try {
      const lista = congregadosFiltrados
      const logoHtml = config.logoUrl
        ? `<img src="${config.logoUrl}" alt="Logo" style="height: 50px; max-width: 140px; object-fit: contain;" />`
        : ''
      const tituloSessao =
        abaAtiva === 'ativos'
          ? 'Congregados Ativos'
          : abaAtiva === 'inativos'
            ? 'Congregados Inativos / Afastados'
            : 'Congregados In Memória'

      const rowsHtml = lista
        .map(
          (c, idx) => `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 6px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
            <td style="padding: 6px 8px; font-weight: bold; color: #1e293b;">${c.nome || '—'}</td>
            <td style="padding: 6px 8px; color: #334155;">${c.data_nascimento ? formatarDataBr(c.data_nascimento) : '—'}</td>
            <td style="padding: 6px 8px; color: #334155;">${c.whatsapp || c.telefone || '—'}</td>
            <td style="padding: 6px 8px; color: #334155;">${(c as any).data_conversao ? formatarDataBr((c as any).data_conversao) : (c as any).data_conversao_texto || '—'}</td>
            <td style="padding: 6px 8px; color: #334155;">${c.congregacao || '—'}</td>
            <td style="padding: 6px 8px; color: #334155;">${c.status || 'Ativo'}</td>
          </tr>`,
        )
        .join('')

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relação de Congregados — ${config.nomeIgreja || 'Igreja'}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 10mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 12px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #C9A227; padding-bottom: 10px; margin-bottom: 14px; }
    .church-info h1 { margin: 0; font-size: 16px; color: #1E3A5F; text-transform: uppercase; }
    .church-info p { margin: 2px 0 0; font-size: 10px; color: #64748b; }
    .title-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
    .title-box h2 { margin: 0; font-size: 13px; color: #1E3A5F; text-transform: uppercase; }
    .title-box span { font-size: 11px; color: #64748b; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1E3A5F; color: #fff; padding: 7px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer { margin-top: 16px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="church-info">
      <h1>${config.nomeIgreja || 'Gestão Eclesiástica'}</h1>
      <p>${config.denominacao || 'Igreja Evangélica'} ${config.cidadeIgreja ? `• ${config.cidadeIgreja}` : ''}</p>
      ${config.enderecoIgreja ? `<p>${config.enderecoIgreja}</p>` : ''}
    </div>
    ${logoHtml}
  </div>

  <div class="title-box">
    <h2>Relação de ${tituloSessao}</h2>
    <span>Total: ${lista.length} congregado(s)</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th>Nome Completo</th>
        <th>Data Nasc.</th>
        <th>Contato</th>
        <th>Aceitou Jesus</th>
        <th>Congregação</th>
        <th>Situação</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" style="padding: 16px; text-align: center; color: #94a3b8;">Nenhum congregado encontrado.</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    Documento oficial emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} • ${config.nomeIgreja || 'Igreja'}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    }
  </script>
</body>
</html>`

      const printWindow = window.open('', '_blank', 'width=950,height=750')
      if (!printWindow) {
        toast({
          variant: 'destructive',
          title: 'Bloqueio de pop-up',
          description: 'Habilite pop-ups para gerar e imprimir o PDF.',
        })
        return
      }
      printWindow.document.write(html)
      printWindow.document.close()
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar PDF',
        description: e?.message,
      })
    } finally {
      setGerandoPdf(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E6E2D8] shadow-xs">
        <div>
          <Badge className="bg-[#C9A227] text-[#1E3A5F] text-[10px] uppercase font-bold tracking-wider mb-1">
            Comunhão & Discipulado
          </Badge>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3A5F]">
            Gestão de Congregados
          </h2>
          <p className="text-xs sm:text-sm text-[#5A5A5A] mt-1">
            Controle de fiéis das congregações e fluxo de batismo para membro oficial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Baixar Planilha (PDF) */}
          <Button
            onClick={handleBaixarPdf}
            disabled={gerandoPdf}
            variant="outline"
            className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/10 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            title="Baixar relatório timbrado de congregados em PDF"
          >
            {gerandoPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-[#1E3A5F]" />
            )}
            Baixar Planilha (PDF)
          </Button>

          {/* Novo Congregado */}
          <Button
            onClick={handleOpenCreate}
            className="bg-[#1E3A5F] hover:bg-[#16304F] text-white flex items-center gap-2 text-xs font-semibold shadow-md"
          >
            <Plus className="w-4 h-4" />
            Novo Congregado
          </Button>
        </div>
      </div>

      {/* Abas e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Tabs
          value={abaAtiva}
          onValueChange={(val) => setAbaAtiva(val as AbaCongregados)}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-white border border-[#E6E2D8] p-1 rounded-xl shadow-xs grid grid-cols-2 sm:flex sm:flex-row h-auto gap-1">
            <TabsTrigger
              value="ativos"
              className="text-xs font-semibold px-3 py-2 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white rounded-lg flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ativos</span>
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">
                {totalAtivos}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="inativos"
              className="text-xs font-semibold px-3 py-2 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white rounded-lg flex items-center gap-1.5"
            >
              <UserX className="w-3.5 h-3.5 text-amber-500" />
              <span>Inativos</span>
              <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px]">
                {totalInativos}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="in_memoria"
              className="text-xs font-semibold px-3 py-2 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white rounded-lg flex items-center gap-1.5"
            >
              <span>In Memória</span>
              <span className="ml-1 px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px]">
                {totalFalecidos}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Busca */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A5A]" />
          <Input
            placeholder="Buscar congregado por nome ou congregação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-[#E6E2D8] text-xs sm:text-sm rounded-xl"
          />
        </div>
      </div>

      {/* Conteúdo */}
      {/* LISTAGEM DE CONGREGADOS (ATIVOS / INATIVOS / IN MEMÓRIA) */}
      <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
        {abaAtiva === 'in_memoria' && (
          <div className="p-4 bg-slate-100/80 border-b border-[#E6E2D8] flex items-center justify-between">
            <div className="text-xs text-slate-700">
              <strong className="text-[#1E3A5F]">Sessão In Memória:</strong> Congregados falecidos
              preservados no histórico eclesiástico da igreja.
            </div>
            <Badge className="bg-slate-700 text-white font-bold text-xs">
              {totalFalecidos} registro(s)
            </Badge>
          </div>
        )}
        {abaAtiva === 'inativos' && (
          <div className="p-4 bg-amber-50/70 border-b border-[#E6E2D8] flex items-center justify-between">
            <div className="text-xs text-amber-900">
              <strong className="text-[#1E3A5F]">Sessão Inativos:</strong> Congregados inativados
              temporariamente. Use o botão <strong>"Reativar"</strong> para movê-los de volta à
              sessão Ativos.
            </div>
            <Badge className="bg-amber-600 text-white font-bold text-xs">
              {totalInativos} inativo(s)
            </Badge>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1E3A5F] text-white uppercase text-[10px] sm:text-xs tracking-wider">
              <tr>
                <th className="p-3 sm:p-4">Nome Completo</th>
                <th className="p-3 sm:p-4">Congregação Vinculada</th>
                <th className="p-3 sm:p-4">Telefone</th>
                <th className="p-3 sm:p-4">Data Nasc.</th>
                <th className="p-3 sm:p-4">Situação</th>
                <th className="p-3 sm:p-4 text-right">Ações & Batismo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2D8]">
              {congregadosFiltrados.length > 0 ? (
                congregadosFiltrados.map((c) => {
                  const statusStr = (c.status || 'Ativo').toLowerCase()
                  const isFalecido = statusStr.includes('falecido')
                  const isInativo =
                    !isFalecido && (statusStr.includes('inativo') || statusStr.includes('afastado'))
                  const isAtivo = !isFalecido && !isInativo

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 sm:p-4 font-semibold text-[#1E3A5F]">{c.nome}</td>
                      <td className="p-3 sm:p-4 text-slate-700">{c.congregacao}</td>
                      <td className="p-3 sm:p-4 text-slate-600">{c.telefone || '—'}</td>
                      <td className="p-3 sm:p-4 text-slate-600">
                        {c.data_nascimento ? formatarDataBr(c.data_nascimento) : '—'}
                      </td>
                      <td className="p-3 sm:p-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            isAtivo
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : isInativo
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {isFalecido ? 'In Memória (Falecido)' : c.status || 'Ativo'}
                        </Badge>
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* FRENTE 3: Botão de Batismo */}
                          {isAtivo && (
                            <Button
                              onClick={() => handleOpenBatismo(c)}
                              size="sm"
                              className="bg-gradient-to-r from-[#1E3A5F] to-[#0A2E5C] hover:from-[#16304F] hover:to-[#082244] text-[#C9A227] text-xs h-8 px-2.5 font-bold shadow-xs flex items-center gap-1 border border-[#C9A227]/40"
                              title="Registrar Batismo: preenche ficha oficial de membro e remove o registro de congregado"
                            >
                              <Droplets className="w-3.5 h-3.5 text-[#C9A227]" />
                              Batizar (Virar Membro)
                            </Button>
                          )}

                          {/* Situação */}
                          {isAtivo ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleChangeStatus(c, 'Inativo/Afastado')}
                              className="h-8 text-amber-700 hover:bg-amber-50 text-xs px-2"
                              title="Mover para a sessão Inativos"
                            >
                              Inativar
                            </Button>
                          ) : isInativo ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleChangeStatus(c, 'Ativo')}
                              className="h-8 text-emerald-700 hover:bg-emerald-50 text-xs px-2 font-medium"
                              title="Reativar para Congregados Ativos"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Reativar
                            </Button>
                          ) : isFalecido ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleChangeStatus(c, 'Ativo')}
                              className="h-8 text-emerald-700 hover:bg-emerald-50 text-xs px-2 font-medium"
                              title="Restaurar para Ativos caso marcado por engano"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Reativar
                            </Button>
                          ) : null}

                          {!isFalecido && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleChangeStatus(c, 'Falecido')}
                              className="h-8 text-slate-500 hover:bg-slate-100 text-[11px] px-1.5"
                              title="Marcar como Falecido (vai para a sessão In Memória)"
                            >
                              Falecido
                            </Button>
                          )}

                          {/* Editar */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(c)}
                            className="h-8 w-8 text-[#1E3A5F]"
                            title="Editar Dados"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          {/* Excluir */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingId(c.id)
                              setIsDeleteModalOpen(true)
                            }}
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#5A5A5A] italic">
                    Nenhum congregado cadastrado nesta sessão (
                    {abaAtiva === 'in_memoria' ? 'In Memória' : abaAtiva}).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Form de Congregado */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              {editingCongregado ? 'Editar Congregado' : 'Novo Congregado'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Informe os dados do congregado para registro no rol da igreja.
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
                placeholder="Ex: João Ferreira"
                className={`text-xs sm:text-sm ${errors.nome ? 'border-red-500' : ''}`}
              />
              {errors.nome && <p className="text-[11px] text-red-600">{errors.nome}</p>}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <label className="text-xs font-semibold text-[#1A1A1A]">WhatsApp</label>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(88) 99999-9999"
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Data de Nascimento</label>
              <Input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Situação</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm focus:ring-2 focus:ring-[#C9A227]"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo/Afastado">Inativo / Afastado</option>
                <option value="Falecido">Falecido</option>
              </select>
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#1E3A5F] text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* FRENTE 3: MODAL DE BATISMO (CONVERTER EM MEMBRO COMPLETO) */}
      {/* ========================================================= */}
      <Dialog open={isBatismoModalOpen} onOpenChange={setIsBatismoModalOpen}>
        <DialogContent className="max-w-2xl bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-[#1E3A5F] flex items-center justify-center mx-auto mb-1">
              <Droplets className="w-6 h-6 text-[#1E3A5F]" />
            </div>
            <DialogTitle className="text-center font-serif text-2xl font-bold text-[#1E3A5F]">
              Fluxo de Batismo nas Águas
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              "No dia que ele se batizar, preenchemos o cadastro COMPLETO de membro e apagamos o
              cadastro de congregado."
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitBatismo} className="space-y-4 pt-2">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <strong>Atenção:</strong> Ao confirmar, o congregado{' '}
              <strong>{congregadoBatismo?.nome}</strong> será inserido com ficha oficial no Rol de
              Membros e seu registro na lista de congregados será removido.
            </div>

            {/* Nome e Ficha Oficial */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Nome Completo do Novo Membro <span className="text-red-500">*</span>
                </label>
                <Input
                  value={batismoForm.nome}
                  onChange={(e) => setBatismoForm({ ...batismoForm, nome: e.target.value })}
                  className="text-xs sm:text-sm font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Nº da Ficha Oficial <span className="text-red-500">*</span>
                </label>
                <Input
                  value={batismoForm.numero_ficha}
                  onChange={(e) => setBatismoForm({ ...batismoForm, numero_ficha: e.target.value })}
                  placeholder="Ex: 192"
                  className="text-xs sm:text-sm font-bold text-[#1E3A5F]"
                  required
                />
              </div>
            </div>

            {/* Registro, RG e CPF */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Nº Registro</label>
                <Input
                  value={batismoForm.numero_registro}
                  onChange={(e) =>
                    setBatismoForm({ ...batismoForm, numero_registro: e.target.value })
                  }
                  placeholder="Ex: ADTC-192"
                  className="text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">RG</label>
                <Input
                  value={batismoForm.rg}
                  onChange={(e) => setBatismoForm({ ...batismoForm, rg: e.target.value })}
                  className="text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">CPF</label>
                <Input
                  value={batismoForm.cpf}
                  onChange={(e) => setBatismoForm({ ...batismoForm, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Filiação */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Filiação (Pais)</label>
              <Input
                value={batismoForm.filiacao}
                onChange={(e) => setBatismoForm({ ...batismoForm, filiacao: e.target.value })}
                placeholder="Ex: Pai e Mãe"
                className="text-xs sm:text-sm"
              />
            </div>

            {/* Naturalidade, Estado Civil, Telefone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Naturalidade</label>
                <Input
                  value={batismoForm.naturalidade}
                  onChange={(e) => setBatismoForm({ ...batismoForm, naturalidade: e.target.value })}
                  placeholder="Ex: Uruoca – CE"
                  className="text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Estado Civil</label>
                <Input
                  value={batismoForm.estado_civil}
                  onChange={(e) => setBatismoForm({ ...batismoForm, estado_civil: e.target.value })}
                  placeholder="Solteiro(a), Casado(a)"
                  className="text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Telefone</label>
                <Input
                  value={batismoForm.telefone}
                  onChange={(e) => setBatismoForm({ ...batismoForm, telefone: e.target.value })}
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Congregação e Endereço */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Congregação</label>
                <select
                  value={batismoForm.congregacao}
                  onChange={(e) =>
                    setBatismoForm({ ...batismoForm, congregacao: e.target.value as any })
                  }
                  className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm"
                >
                  {(unidadesLista || []).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Endereço</label>
                <Input
                  value={batismoForm.endereco}
                  onChange={(e) => setBatismoForm({ ...batismoForm, endereco: e.target.value })}
                  placeholder="Rua, número, bairro"
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Datas do Membro: Nascimento e Batismo nas Águas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-[#E6E2D8]">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Data de Nascimento</label>
                <Input
                  type="date"
                  value={batismoForm.data_nascimento}
                  onChange={(e) =>
                    setBatismoForm({ ...batismoForm, data_nascimento: e.target.value })
                  }
                  className="text-xs sm:text-sm bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Data do Batismo nas Águas <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={batismoForm.data_batismo}
                  onChange={(e) => setBatismoForm({ ...batismoForm, data_batismo: e.target.value })}
                  className="text-xs sm:text-sm bg-white font-bold"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBatismoModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingBatismo}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
              >
                {isSubmittingBatismo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Registrando Batismo...
                  </>
                ) : (
                  'Concluir Batismo & Gerar Ficha de Membro'
                )}
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
              Excluir Congregado
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Deseja realmente remover este congregado? Se ele apenas se afastou, prefira marcar
              como Inativo.
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

export default AdminCongregados
