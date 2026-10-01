import React, { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Obreiro } from '@/types/adtc'
import { UNIDADES, CARGOS_OBREIROS } from '@/types/adtc'
import { useCongregacoes } from '@/hooks/useCongregacoes'
import useRealtime from '@/hooks/use-realtime'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  Search,
  Plus,
  Edit2,
  Trash2,
  Award,
  Loader2,
  ArrowUp,
  ArrowDown,
  Upload,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import { formatarDataBr } from '@/lib/utils'

export const AdminObreiros: React.FC = () => {
  const { config } = useChurchConfig()
  const { nomes: nomesRaw } = useCongregacoes()
  const unidadesLista = nomesRaw || []
  const [obreiros, setObreiros] = useState<Obreiro[]>([])
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [loading, setLoading] = useState(true)
  const [congregacaoFiltro, setCongregacaoFiltro] = useState<string>('todas')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingObreiro, setEditingObreiro] = useState<Obreiro | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Form State
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState<Obreiro['cargo']>('Auxiliar')
  const [congregacao, setCongregacao] = useState<Obreiro['congregacao']>('Sede')
  const [status, setStatus] = useState<Obreiro['status']>('Ativo')
  const [telefone, setTelefone] = useState('')
  const [ordem, setOrdem] = useState<number>(1)
  const [mensagemPastoral, setMensagemPastoral] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)

  const loadObreiros = async () => {
    try {
      const records = await pb.collection('obreiros').getFullList<Obreiro>({
        sort: 'cargo,ordem,created',
      })
      setObreiros(records)
    } catch (err) {
      console.error('Erro ao buscar obreiros:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadObreiros()
  }, [])

  useRealtime<Obreiro>('obreiros', () => {
    loadObreiros()
  })

  const resetForm = () => {
    setNome('')
    setCargo('Auxiliar')
    setCongregacao('Sede')
    setStatus('Ativo')
    setTelefone('')
    setOrdem(1)
    setMensagemPastoral('')
    setFotoFile(null)
    setErrors({})
    setEditingObreiro(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    if (congregacaoFiltro !== 'todas') {
      setCongregacao(congregacaoFiltro)
    }
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
      toast({ title: 'Ordem ministerial atualizada.' })
      loadObreiros()
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
        toast({ title: 'Obreiro cadastrado com sucesso!' })
      }

      setIsModalOpen(false)
      resetForm()
      loadObreiros()
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
      setIsDeleteModalOpen(false)
      setDeletingId(null)
      loadObreiros()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err?.message })
    }
  }

  const filtered = obreiros.filter((o) => {
    // Filtro de Congregação
    if (congregacaoFiltro !== 'todas') {
      const congO = (o.congregacao || '').trim().toLowerCase()
      const congF = congregacaoFiltro.trim().toLowerCase()
      if (congF === 'sede') {
        if (congO !== 'sede' && congO !== '') return false
      } else {
        if (congO !== congF) return false
      }
    }

    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      (o.nome || '').toLowerCase().includes(term) ||
      (o.cargo || '').toLowerCase().includes(term) ||
      (o.congregacao || '').toLowerCase().includes(term)
    )
  })

  const handleBaixarRelacaoPdf = () => {
    setGerandoPdf(true)
    try {
      // Ordem hierárquica de agrupamento
      const gruposOrdem = [
        'Pastor Presidente',
        'Pastor',
        'Evangelista',
        'Presbítero',
        'Diácono',
        'Cooperador',
      ]

      const normalizarGrupo = (cargo: string) => {
        const c = cargo.toLowerCase()
        if (c.includes('presidente')) return 'Pastor Presidente'
        if (c.includes('pastor')) return 'Pastores'
        if (c.includes('evangelista')) return 'Evangelistas'
        if (c.includes('presb') || c.includes('pb')) return 'Presbíteros'
        if (c.includes('diác') || c.includes('diac')) return 'Diáconos'
        if (c.includes('coop')) return 'Cooperadores'
        return 'Outros Ministros'
      }

      // Agrupar
      const mapaGrupos: Record<string, Obreiro[]> = {}
      filtered.forEach((ob) => {
        const g = normalizarGrupo(ob.cargo)
        if (!mapaGrupos[g]) mapaGrupos[g] = []
        mapaGrupos[g].push(ob)
      })

      const ordemChaves = [
        'Pastor Presidente',
        'Pastores',
        'Evangelistas',
        'Presbíteros',
        'Diáconos',
        'Cooperadores',
        'Outros Ministros',
      ]

      let secoesHtml = ''
      ordemChaves.forEach((grupoNome) => {
        const itens = mapaGrupos[grupoNome]
        if (!itens || itens.length === 0) return

        const rows = itens
          .map(
            (ob, i) => `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
              <td style="padding: 5px 8px; width: 30px; text-align: center; color: #64748b;">${i + 1}</td>
              <td style="padding: 5px 8px; font-weight: bold; color: #1e293b;">${ob.nome}</td>
              <td style="padding: 5px 8px; color: #334155;">${ob.cargo}</td>
              <td style="padding: 5px 8px; color: #334155;">${ob.congregacao || '—'}</td>
              <td style="padding: 5px 8px; color: #334155;">${(ob as any).data_consagracao ? formatarDataBr((ob as any).data_consagracao) : '—'}</td>
              <td style="padding: 5px 8px; color: #334155;">${ob.telefone || '—'}</td>
              <td style="padding: 5px 8px; text-align: center; color: #334155;">${ob.status || 'Ativo'}</td>
            </tr>`,
          )
          .join('')

        secoesHtml += `
          <div style="margin-top: 14px; page-break-inside: avoid;">
            <div style="background: #1E3A5F; color: #fff; padding: 4px 10px; font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 4px 4px 0 0;">
              ${grupoNome} (${itens.length})
            </div>
            <table style="width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0;">
              <thead>
                <tr style="background: #f1f5f9; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 1px solid #cbd5e1;">
                  <th style="padding: 4px 8px; text-align: center;">#</th>
                  <th style="padding: 4px 8px; text-align: left;">Nome</th>
                  <th style="padding: 4px 8px; text-align: left;">Cargo</th>
                  <th style="padding: 4px 8px; text-align: left;">Congregação</th>
                  <th style="padding: 4px 8px; text-align: left;">Consagração</th>
                  <th style="padding: 4px 8px; text-align: left;">Contato</th>
                  <th style="padding: 4px 8px; text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>`
      })

      const logoHtml = config.logoUrl
        ? `<img src="${config.logoUrl}" alt="Logo" style="height: 50px; max-width: 140px; object-fit: contain;" />`
        : ''

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relação do Corpo de Obreiros — ${config.nomeIgreja || 'Igreja'}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 10mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 11px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #C9A227; padding-bottom: 8px; margin-bottom: 10px; }
    .church-info h1 { margin: 0; font-size: 15px; color: #1E3A5F; text-transform: uppercase; }
    .church-info p { margin: 2px 0 0; font-size: 10px; color: #64748b; }
    .title-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
    .title-box h2 { margin: 0; font-size: 12px; color: #1E3A5F; text-transform: uppercase; }
    .title-box span { font-size: 11px; color: #64748b; font-weight: bold; }
    .footer { margin-top: 18px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="church-info">
      <h1>${config.nomeIgreja || 'Gestão Eclesiástica'}</h1>
      <p>${config.denominacao || 'Igreja Evangélica'} ${config.cidadeUf ? `• ${config.cidadeUf}` : ''}</p>
      ${config.enderecoIgreja ? `<p>${config.enderecoIgreja}</p>` : ''}
    </div>
    ${logoHtml}
  </div>

  <div class="title-box">
    <h2>Relação Oficial do Corpo de Obreiros</h2>
    <span>Total: ${filtered.length} ministro(s)</span>
  </div>

  ${secoesHtml || '<p style="text-align: center; color: #94a3b8; padding: 20px;">Nenhum obreiro cadastrado.</p>'}

  <div class="footer">
    Relação ministerial oficial emitida em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} • ${config.nomeIgreja || 'Igreja'}
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
        title: 'Erro ao gerar PDF de obreiros',
        description: e?.message,
      })
    } finally {
      setGerandoPdf(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#1E3A5F]">
            Gestão do Corpo de Obreiros
          </h2>
          <p className="text-xs sm:text-sm text-[#5A5A5A]">
            Controle do corpo ministerial, ordem hierárquica e mensagem pastoral.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Baixar Relação de Obreiros (PDF) */}
          <Button
            onClick={handleBaixarRelacaoPdf}
            disabled={gerandoPdf}
            variant="outline"
            className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/10 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            title="Baixar Relação de Obreiros em PDF timbrado por cargo"
          >
            {gerandoPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-[#1E3A5F]" />
            )}
            Baixar Relação de Obreiros (PDF)
          </Button>

          <Button
            onClick={handleOpenCreate}
            className="bg-[#1E3A5F] hover:bg-[#16304F] text-white flex items-center gap-2 text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            Novo Obreiro
          </Button>
        </div>
      </div>

      {/* Filtros: Congregação e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="w-full sm:w-64">
          <select
            value={congregacaoFiltro}
            onChange={(e) => setCongregacaoFiltro(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-[#E6E2D8] bg-white text-xs sm:text-sm font-medium text-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#C9A227] shadow-2xs"
            title="Filtrar corpo de obreiros por congregação ou Sede"
          >
            <option value="todas">Todas as Unidades (Geral)</option>
            {unidadesLista.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A5A]" />
          <Input
            placeholder="Buscar por nome ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-[#E6E2D8] text-xs sm:text-sm h-10 rounded-xl"
          />
        </div>
      </div>

      {/* Banner de Contexto de Congregação Ativa */}
      {congregacaoFiltro !== 'todas' && (
        <div className="bg-gradient-to-r from-[#1E3A5F]/10 via-[#C9A227]/10 to-transparent p-3 sm:p-4 rounded-xl border border-[#C9A227]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C9A227] animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold text-[#1E3A5F]">
              Gerenciando obreiros da unidade: <strong>{congregacaoFiltro}</strong>
            </span>
            <Badge className="bg-[#1E3A5F] text-white text-[10px] font-bold">
              {filtered.length} obreiro(s) exibido(s)
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCongregacaoFiltro('todas')}
            className="text-xs text-[#1E3A5F] hover:bg-white/60 h-7 self-start sm:self-auto font-medium"
          >
            Limpar filtro (Ver todas)
          </Button>
        </div>
      )}

      <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1E3A5F] text-white uppercase text-[10px] sm:text-xs tracking-wider">
              <tr>
                <th className="p-3 sm:p-4">Foto / Nome</th>
                <th className="p-3 sm:p-4">Cargo Ministerial</th>
                <th className="p-3 sm:p-4">Congregação</th>
                <th className="p-3 sm:p-4 text-center">Ordem</th>
                <th className="p-3 sm:p-4">Status</th>
                <th className="p-3 sm:p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2D8]">
              {filtered.length > 0 ? (
                filtered.map((ob) => (
                  <tr key={ob.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 sm:p-4 font-semibold text-[#1E3A5F] flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] border border-[#E6E2D8] flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden">
                        {ob.foto ? (
                          <img
                            src={pb.files.getURL(ob, ob.foto)}
                            alt={ob.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          ob.nome.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div>{ob.nome}</div>
                        {ob.telefone && (
                          <div className="text-[11px] text-[#5A5A5A]">{ob.telefone}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          ob.cargo === 'Pastor Presidente'
                            ? 'bg-[#C9A227]/20 text-[#1E3A5F] border-[#C9A227] font-bold'
                            : 'text-[#1E3A5F] border-[#1E3A5F]/30'
                        }`}
                      >
                        {ob.cargo}
                      </Badge>
                    </td>
                    <td className="p-3 sm:p-4 text-slate-700">{ob.congregacao}</td>
                    <td className="p-3 sm:p-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveOrder(ob, 'up')}
                          className="h-6 w-6 text-slate-500 hover:text-[#1E3A5F]"
                          title="Subir ordem"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <span className="font-mono font-bold text-xs">{ob.ordem || 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveOrder(ob, 'down')}
                          className="h-6 w-6 text-slate-500 hover:text-[#1E3A5F]"
                          title="Descer ordem"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-3 sm:p-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          ob.status === 'Ativo'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {ob.status}
                      </Badge>
                    </td>
                    <td className="p-3 sm:p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(ob)}
                          className="h-8 w-8 text-[#1E3A5F]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingId(ob.id)
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
                  <td colSpan={6} className="p-8 text-center text-[#5A5A5A] italic">
                    Nenhum obreiro cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Formulário */}
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
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-serif text-lg text-[#1E3A5F]">
              Excluir Obreiro
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Deseja realmente remover este ministro do corpo de obreiros?
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

export default AdminObreiros
