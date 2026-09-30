import React, { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Membro, SolicitacaoCadastro, SituacaoEclesiastica, Congregado } from '@/types/adtc'
import { UNIDADES } from '@/types/adtc'
import { useCongregacoes } from '@/hooks/useCongregacoes'
import useRealtime from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
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
  Loader2,
  Upload,
  AlertTriangle,
  Link as LinkIcon,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  Share2,
  Check,
  RotateCcw,
  Cake,
  MessageCircle,
  Settings,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import { exportarMembrosParaCsv } from '@/lib/exportUtils'
import { ADTC_LOGO_URL, ADTC_TOCHA_WATERMARK_DATA_URI } from '@/components/AdtcLogo'
import { getLogoAsDataUri, buildFichaMembroBrancoHtml } from '@/lib/documentTemplates'
import { FileText } from 'lucide-react'
import { compressImage } from '@/lib/imageCompressor'
import {
  ModalFelicitarAniversariante,
  type AniversarianteFelicitarData,
} from '@/components/ModalFelicitarAniversariante'

type AbaMembros = 'ativos' | 'inativos' | 'in_memoria' | 'pendentes' | 'aniversariantes'

export const AdminMembros: React.FC = () => {
  const { nomes: unidadesLista } = useCongregacoes()
  const { config } = useChurchConfig()
  const [membros, setMembros] = useState<Membro[]>([])
  const [congregados, setCongregados] = useState<Congregado[]>([])
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCadastro[]>([])
  const [abaAtiva, setAbaAtiva] = useState<AbaMembros>(() => {
    const params = new URLSearchParams(window.location.search)
    const abaParam = params.get('aba')
    if (
      abaParam === 'aniversariantes' ||
      abaParam === 'pendentes' ||
      abaParam === 'inativos' ||
      abaParam === 'falecidos'
    ) {
      return abaParam as AbaMembros
    }
    return 'ativos'
  })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingMembro, setEditingMembro] = useState<Membro | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Modal de Links de Cadastro Compartilháveis
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [copiadoMembro, setCopiadoMembro] = useState(false)
  const [copiadoCongregado, setCopiadoCongregado] = useState(false)
  const [gerandoFichaPdf, setGerandoFichaPdf] = useState(false)

  // Modal de Revisão & Aprovação de Solicitação
  const [revisandoSolicitacao, setRevisandoSolicitacao] = useState<SolicitacaoCadastro | null>(null)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejeitandoId, setRejeitandoId] = useState<string | null>(null)

  // Form State
  const [nome, setNome] = useState('')
  const [numeroFicha, setNumeroFicha] = useState('')
  const [numeroRegistro, setNumeroRegistro] = useState('')
  const [filiacao, setFiliacao] = useState('')
  const [naturalidade, setNaturalidade] = useState('')
  const [estadoCivil, setEstadoCivil] = useState('')
  const [rg, setRg] = useState('')
  const [cpf, setCpf] = useState('')
  const [endereco, setEndereco] = useState('')
  const [observacao, setObservacao] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [dataNascimentoTexto, setDataNascimentoTexto] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [dataConversao, setDataConversao] = useState('')
  const [dataConversaoTexto, setDataConversaoTexto] = useState('')
  const [dataBatismo, setDataBatismo] = useState('')
  const [dataBatismoTexto, setDataBatismoTexto] = useState('')
  const [congregacao, setCongregacao] = useState<Membro['congregacao']>('Sede')
  const [status, setStatus] = useState<SituacaoEclesiastica>('Ativo')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [isCompressingFoto, setIsCompressingFoto] = useState(false)

  // FRENTE 1: Mensagem de aniversário editável persistida na coleção de configurações
  const MENSAGEM_PADRAO_ANIVERSARIO = `A paz do Senhor, {nome}! A ${config.nomeIgreja || 'nossa igreja'} deseja a você muitas felicidades e que Deus abençoe seu novo ano de vida! 🎉`
  const [mensagemAniversario, setMensagemAniversario] = useState(MENSAGEM_PADRAO_ANIVERSARIO)
  const [isModalMsgAnivOpen, setIsModalMsgAnivOpen] = useState(false)
  const [tempMensagemAniv, setTempMensagemAniv] = useState(MENSAGEM_PADRAO_ANIVERSARIO)
  const [salvandoMsgAniv, setSalvandoMsgAniv] = useState(false)
  const [felicitarModalOpen, setFelicitarModalOpen] = useState(false)
  const [aniversarianteSelecionado, setAniversarianteSelecionado] =
    useState<AniversarianteFelicitarData | null>(null)

  const loadData = async () => {
    try {
      const [recordsMembros, recordsCongregados, recordsSolicitacoes] = await Promise.all([
        pb.collection('membros').getFullList<Membro>({
          sort: 'nome',
        }),
        pb.collection('congregados').getFullList<Congregado>({
          sort: 'nome',
        }),
        pb.collection('solicitacoes_cadastro').getFullList<SolicitacaoCadastro>({
          filter: "tipo='membro' && status_solicitacao='pendente'",
          sort: '-created',
        }),
      ])
      setMembros(recordsMembros)
      setCongregados(recordsCongregados)
      setSolicitacoes(recordsSolicitacoes)

      // Carregar mensagem de aniversário persistida
      try {
        const configAniv = await pb
          .collection('configuracoes')
          .getFirstListItem('chave="mensagem_aniversario"')
        if (configAniv && configAniv.valor) {
          setMensagemAniversario(configAniv.valor)
          setTempMensagemAniv(configAniv.valor)
        }
      } catch {
        /* intentionally ignored */
      }
    } catch (err) {
      console.error('Erro ao carregar membros/solicitações:', err)
    } finally {
      setLoading(false)
    }
  }

  // Interface unificada para a lista de aniversariantes de hoje (Membros e Congregados)
  interface AniversarianteItem {
    id: string
    nome: string
    tipo: 'membro' | 'congregado'
    congregacao: string
    data_nascimento?: string
    data_nascimento_texto?: string
    whatsapp?: string
    telefone?: string
    numero_ficha?: string
    foto?: string
  }

  // Verificar se a data (data_nascimento ou data_nascimento_texto) coincide com hoje (tolerante a ISO ou DD/MM/AAAA)
  const ehAniversarianteDeHoje = (
    dataNascimento?: string,
    dataNascimentoTexto?: string,
  ): boolean => {
    const hoje = new Date()
    const diaHoje = hoje.getDate()
    const mesHoje = hoje.getMonth() + 1 // 1-12

    // 1. Tenta data_nascimento (geralmente YYYY-MM-DD ou ISO)
    if (dataNascimento) {
      const parteData = dataNascimento.slice(0, 10)
      const partes = parteData.split('-')
      if (partes.length === 3) {
        const mes = parseInt(partes[1], 10)
        const dia = parseInt(partes[2], 10)
        if (dia === diaHoje && mes === mesHoje) return true
      }
    }

    // 2. Tenta data_nascimento_texto ou tolerância textual (ex: DD/MM/AAAA ou DD/MM)
    const texto =
      dataNascimentoTexto || (dataNascimento && dataNascimento.includes('/') ? dataNascimento : '')
    if (texto) {
      const match = texto.match(/(\d{1,2})[/.-](\d{1,2})/)
      if (match) {
        const dia = parseInt(match[1], 10)
        const mes = parseInt(match[2], 10)
        if (dia === diaHoje && mes === mesHoje) return true
      }
    }

    return false
  }

  // Lista unificada de aniversariantes de hoje: Membros Ativos + Congregados Ativos
  // Inativos / Falecidos / Afastados nunca entram
  const aniversariantesHoje: AniversarianteItem[] = [
    ...membros
      .filter((m) => {
        const s = (m.status || 'Ativo').toLowerCase()
        const isAtivo = s.includes('ativo') && !s.includes('inativo')
        return isAtivo && ehAniversarianteDeHoje(m.data_nascimento, m.data_nascimento_texto)
      })
      .map((m) => ({
        id: `membro-${m.id}`,
        nome: m.nome,
        tipo: 'membro' as const,
        congregacao: m.congregacao,
        data_nascimento: m.data_nascimento,
        data_nascimento_texto: m.data_nascimento_texto,
        whatsapp: m.whatsapp,
        telefone: m.telefone,
        numero_ficha: m.numero_ficha,
        foto: m.foto ? pb.files.getURL(m, m.foto) : undefined,
      })),
    ...congregados
      .filter((c) => {
        // Congregados: situacao/status ativa (padrão Ativo, não inativo/falecido)
        const s = ((c as any).situacao || c.status || 'Ativo').toLowerCase()
        const isAtivo = s.includes('ativo') && !s.includes('inativo') && !s.includes('falecido')
        return (
          isAtivo && ehAniversarianteDeHoje(c.data_nascimento, (c as any).data_nascimento_texto)
        )
      })
      .map((c) => ({
        id: `congregado-${c.id}`,
        nome: c.nome,
        tipo: 'congregado' as const,
        congregacao: c.congregacao,
        data_nascimento: c.data_nascimento,
        data_nascimento_texto: (c as any).data_nascimento_texto,
        whatsapp: c.whatsapp,
        telefone: c.telefone,
      })),
  ].sort((a, b) => a.nome.localeCompare(b.nome))

  // Formatador do link do WhatsApp (wa.me priorizando whatsapp, telefone como reserva, higienizando não-numéricos e prefixando 55)
  const formatarLinkWhatsAppAniversario = (item: AniversarianteItem): string => {
    const rawNumero = (item.whatsapp || item.telefone || '').replace(/\D/g, '')
    if (!rawNumero) return ''
    let numeroFinal = rawNumero
    if (numeroFinal.length === 10 || numeroFinal.length === 11) {
      numeroFinal = `55${numeroFinal}`
    } else if (numeroFinal.length < 10) {
      numeroFinal = `5588${numeroFinal}` // fallback DDD 88 Uruoca/Campanário
    }
    const textoMsg = (mensagemAniversario || MENSAGEM_PADRAO_ANIVERSARIO).replace(
      /\{nome\}/g,
      item.nome,
    )
    return `https://wa.me/${numeroFinal}?text=${encodeURIComponent(textoMsg)}`
  }

  const handleSalvarMensagemAniversario = async () => {
    setSalvandoMsgAniv(true)
    try {
      let recordId = ''
      try {
        const existing = await pb
          .collection('configuracoes')
          .getFirstListItem('chave="mensagem_aniversario"')
        recordId = existing.id
      } catch {
        /* intentionally ignored */
      }

      if (recordId) {
        await pb.collection('configuracoes').update(recordId, { valor: tempMensagemAniv })
      } else {
        await pb.collection('configuracoes').create({
          chave: 'mensagem_aniversario',
          valor: tempMensagemAniv,
        })
      }

      setMensagemAniversario(tempMensagemAniv)
      setIsModalMsgAnivOpen(false)
      toast({
        title: 'Mensagem atualizada!',
        description: 'A nova mensagem padrão será usada nas felicitações pelo WhatsApp.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar mensagem',
        description: err?.message,
      })
    } finally {
      setSalvandoMsgAniv(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Inscrições Realtime
  useRealtime<Membro>('membros', () => loadData())
  useRealtime<Congregado>('congregados', () => loadData())
  useRealtime<SolicitacaoCadastro>('solicitacoes_cadastro', () => loadData())

  const resetForm = () => {
    setNome('')
    setNumeroFicha('')
    setNumeroRegistro('')
    setFiliacao('')
    setNaturalidade('')
    setEstadoCivil('')
    setRg('')
    setCpf('')
    setEndereco('')
    setObservacao('')
    setDataNascimento('')
    setDataNascimentoTexto('')
    setTelefone('')
    setWhatsapp('')
    setDataConversao('')
    setDataConversaoTexto('')
    setDataBatismo('')
    setDataBatismoTexto('')
    setCongregacao('Sede')
    setStatus('Ativo')
    setFotoFile(null)
    setErrors({})
    setEditingMembro(null)
  }

  // Próximo número de ficha calculado com segurança
  const calcularProximaFicha = (): string => {
    let max = 0
    membros.forEach((m) => {
      if (m.numero_ficha) {
        const n = parseInt(m.numero_ficha, 10)
        if (!isNaN(n) && n > max) max = n
      }
    })
    return (max + 1).toString()
  }

  const handleOpenCreate = () => {
    resetForm()
    setNumeroFicha(calcularProximaFicha())
    setIsModalOpen(true)
  }

  const handleOpenEdit = (membro: Membro) => {
    setEditingMembro(membro)
    setNome(membro.nome || '')
    setNumeroFicha(membro.numero_ficha || '')
    setNumeroRegistro(membro.numero_registro || '')
    setFiliacao(membro.filiacao || '')
    setNaturalidade(membro.naturalidade || '')
    setEstadoCivil(membro.estado_civil || '')
    setRg(membro.rg || '')
    setCpf(membro.cpf || '')
    setEndereco(membro.endereco || '')
    setObservacao(membro.observacao || '')
    setDataNascimento(membro.data_nascimento ? membro.data_nascimento.slice(0, 10) : '')
    setDataNascimentoTexto(membro.data_nascimento_texto || '')
    setTelefone(membro.telefone || '')
    setWhatsapp(membro.whatsapp || '')
    setDataConversao(membro.data_conversao ? membro.data_conversao.slice(0, 10) : '')
    setDataConversaoTexto(membro.data_conversao_texto || '')
    setDataBatismo(membro.data_batismo ? membro.data_batismo.slice(0, 10) : '')
    setDataBatismoTexto(membro.data_batismo_texto || '')
    setCongregacao(membro.congregacao)
    setStatus((membro.status as SituacaoEclesiastica) || 'Ativo')
    setFotoFile(null)
    setErrors({})
    setIsModalOpen(true)
  }

  // Abrir modal com dados da solicitação para revisão antes de aprovar
  const handleRevisarSolicitacao = (sol: SolicitacaoCadastro) => {
    setRevisandoSolicitacao(sol)
    resetForm()
    setNome(sol.nome || '')
    setFiliacao(sol.filiacao || '')
    setNaturalidade(sol.naturalidade || '')
    setEstadoCivil(sol.estado_civil || '')
    setRg(sol.rg || '')
    setCpf(sol.cpf || '')
    setEndereco(sol.endereco || '')
    setObservacao(sol.observacao || '')
    setTelefone(sol.telefone || '')
    setWhatsapp(sol.whatsapp || '')
    setCongregacao(sol.congregacao || 'Sede')
    setDataNascimento(sol.data_nascimento ? sol.data_nascimento.slice(0, 10) : '')
    setDataNascimentoTexto(sol.data_nascimento_texto || '')
    setDataConversao(sol.data_conversao ? sol.data_conversao.slice(0, 10) : '')
    setDataConversaoTexto(sol.data_conversao_texto || '')
    setDataBatismo(sol.data_batismo ? sol.data_batismo.slice(0, 10) : '')
    setDataBatismoTexto(sol.data_batismo_texto || '')
    setStatus('Ativo')

    // Atribui automaticamente o próximo número de ficha oficial
    setNumeroFicha(calcularProximaFicha())
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
      const formData = new FormData()
      formData.append('nome', nome.trim())
      formData.append('congregacao', congregacao)
      formData.append('status', status)
      formData.append('numero_ficha', numeroFicha.trim())
      formData.append('numero_registro', numeroRegistro.trim())
      formData.append('filiacao', filiacao.trim())
      formData.append('naturalidade', naturalidade.trim())
      formData.append('estado_civil', estadoCivil.trim())
      formData.append('rg', rg.trim())
      formData.append('cpf', cpf.trim())
      formData.append('endereco', endereco.trim())
      formData.append('observacao', observacao.trim())
      formData.append('data_nascimento_texto', dataNascimentoTexto.trim())
      formData.append('data_conversao_texto', dataConversaoTexto.trim())
      formData.append('data_batismo_texto', dataBatismoTexto.trim())

      if (telefone.trim()) formData.append('telefone', telefone.trim())
      if (whatsapp.trim()) formData.append('whatsapp', whatsapp.trim())
      if (dataNascimento) formData.append('data_nascimento', `${dataNascimento} 12:00:00.000Z`)
      if (dataConversao) formData.append('data_conversao', `${dataConversao} 12:00:00.000Z`)
      if (dataBatismo) formData.append('data_batismo', `${dataBatismo} 12:00:00.000Z`)
      if (fotoFile) formData.append('foto', fotoFile)

      if (editingMembro) {
        await pb.collection('membros').update(editingMembro.id, formData)
        toast({ title: 'Membro atualizado com sucesso!' })
      } else {
        if (!numeroRegistro.trim() && !numeroFicha.trim()) {
          const nextNum = (membros.length + 1).toString().padStart(3, '0')
          formData.append('numero_registro', `${config.siglaIgreja || 'MBR'}-${nextNum}`)
        }
        await pb.collection('membros').create(formData)

        // Se veio de uma solicitação, marca como aprovada
        if (revisandoSolicitacao) {
          try {
            await pb
              .collection('solicitacoes_cadastro')
              .update(revisandoSolicitacao.id, { status_solicitacao: 'aprovada' })
          } catch (err) {
            console.error('Erro ao marcar solicitação aprovada:', err)
          }
          setRevisandoSolicitacao(null)
        }
        toast({ title: 'Membro cadastrado com sucesso no rol oficial!' })
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
          title: 'Erro ao salvar membro',
          description: err?.message || 'Tente novamente.',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Mudança rápida de situação (Ativo <-> Inativo/Afastado <-> Falecido)
  const handleChangeStatus = async (membro: Membro, novoStatus: SituacaoEclesiastica) => {
    try {
      await pb.collection('membros').update(membro.id, { status: novoStatus })
      toast({
        title: `Situação de ${membro.nome} alterada para ${novoStatus}.`,
        description:
          novoStatus === 'Ativo'
            ? 'Membro reativado e visível nas listas públicas.'
            : 'Membro preservado no arquivo eclesiástico.',
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
      await pb.collection('membros').delete(deletingId)
      toast({ title: 'Membro excluído com sucesso.' })
      setIsDeleteModalOpen(false)
      setDeletingId(null)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir membro',
        description: err?.message,
      })
    }
  }

  // Rejeitar solicitação pendente
  const handleRejeitarSolicitacao = async () => {
    if (!rejeitandoId) return
    try {
      await pb
        .collection('solicitacoes_cadastro')
        .update(rejeitandoId, { status_solicitacao: 'rejeitada' })
      toast({ title: 'Solicitação de cadastro rejeitada/removida da fila.' })
      setIsRejectModalOpen(false)
      setRejeitandoId(null)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao rejeitar solicitação',
        description: err?.message,
      })
    }
  }

  // Filtragem por aba e busca
  const membrosFiltrados = membros.filter((m) => {
    const s = (m.status || 'Ativo').toLowerCase()
    if (abaAtiva === 'ativos') {
      return s.includes('ativo') && !s.includes('inativo') && !s.includes('falecido')
    }
    if (abaAtiva === 'inativos') {
      return (
        (s.includes('inativo') ||
          s.includes('afastado') ||
          s.includes('mudança') ||
          s.includes('transferido')) &&
        !s.includes('falecido')
      )
    }
    if (abaAtiva === 'in_memoria') {
      return s.includes('falecido')
    }

    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      m.nome.toLowerCase().includes(term) ||
      (m.numero_ficha && m.numero_ficha.includes(term)) ||
      (m.cpf && m.cpf.includes(term)) ||
      (m.rg && m.rg.toLowerCase().includes(term)) ||
      m.congregacao.toLowerCase().includes(term) ||
      (m.numero_registro && m.numero_registro.toLowerCase().includes(term))
    )
  })

  const solicitacoesFiltradas = solicitacoes.filter((s) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      s.nome.toLowerCase().includes(term) ||
      s.congregacao.toLowerCase().includes(term) ||
      (s.telefone && s.telefone.includes(term))
    )
  })

  // Contadores por aba
  const totalAtivos = membros.filter((m) => {
    const s = (m.status || 'Ativo').toLowerCase()
    return s.includes('ativo') && !s.includes('inativo') && !s.includes('falecido')
  }).length
  const totalInativos = membros.filter((m) => {
    const s = (m.status || '').toLowerCase()
    return (
      (s.includes('inativo') ||
        s.includes('afastado') ||
        s.includes('mudança') ||
        s.includes('transferido')) &&
      !s.includes('falecido')
    )
  }).length
  const totalFalecidos = membros.filter((m) =>
    (m.status || '').toLowerCase().includes('falecido'),
  ).length
  const totalPendentes = solicitacoes.length
  const totalAniversariantesHoje = aniversariantesHoje.length

  const linkCadastroMembro = `${window.location.origin}/cadastro/membro`
  const linkCadastroCongregado = `${window.location.origin}/cadastro/congregado`

  const handleCopiarLinkMembro = () => {
    navigator.clipboard.writeText(linkCadastroMembro)
    setCopiadoMembro(true)
    toast({
      title: 'Link de Membro copiado!',
      description: 'Envie para novos membros preencherem a ficha completa pelo celular.',
    })
    setTimeout(() => setCopiadoMembro(false), 3000)
  }

  const handleCopiarLinkCongregado = () => {
    navigator.clipboard.writeText(linkCadastroCongregado)
    setCopiadoCongregado(true)
    toast({
      title: 'Link de Congregado copiado!',
      description: 'Envie para congregados preencherem o cadastro rápido pelo celular.',
    })
    setTimeout(() => setCopiadoCongregado(false), 3000)
  }

  const handleBaixarFichaEmBranco = async () => {
    try {
      setGerandoFichaPdf(true)
      const logoDataUri = await getLogoAsDataUri(ADTC_LOGO_URL)
      const htmlCompleto = buildFichaMembroBrancoHtml({
        logoDataUri,
        watermarkDataUri: ADTC_TOCHA_WATERMARK_DATA_URI,
        unidades: [...unidadesLista],
      })

      const printWindow = window.open('', '_blank', 'width=1050,height=850')
      if (!printWindow) {
        toast({
          variant: 'destructive',
          title: 'Bloqueio de pop-up',
          description: 'Permita pop-ups no seu navegador para imprimir ou salvar a ficha em PDF.',
        })
        return
      }

      printWindow.document.write(htmlCompleto)
      printWindow.document.close()
    } catch (err) {
      console.error('Erro ao gerar ficha em PDF:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar ficha',
        description: 'Não foi possível preparar o documento PDF para impressão.',
      })
    } finally {
      setGerandoFichaPdf(false)
    }
  }

  const handleExportarCsv = () => {
    exportarMembrosParaCsv(membros, `membros_adtc_${abaAtiva}.csv`)
    toast({
      title: 'Planilha exportada com sucesso!',
      description: 'Arquivo CSV com codificação UTF-8 compatível com Excel.',
    })
  }
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header com Ações */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E6E2D8] shadow-xs">
        <div>
          <Badge className="bg-[#1E3A5F] text-white text-[10px] uppercase font-bold tracking-wider mb-1">
            Secretaria Eclesiástica
          </Badge>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3A5F]">
            Gestão do Rol de Membros
          </h2>
          <p className="text-xs sm:text-sm text-[#5A5A5A] mt-1">
            Fichas eclesiásticas, situações (Ativos, Inativos, Falecidos) e solicitações pendentes
            de cadastro.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Gerar Links */}
          <Button
            onClick={() => setIsLinkModalOpen(true)}
            variant="outline"
            className="border-[#C9A227] text-[#1E3A5F] hover:bg-amber-50 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            title="Abrir modal com links de cadastro de Membro e de Congregado"
          >
            <LinkIcon className="w-3.5 h-3.5 text-[#C9A227]" />
            Gerar Link de Cadastro
          </Button>

          {/* Botão Ficha em Branco (PDF) */}
          <Button
            onClick={handleBaixarFichaEmBranco}
            disabled={gerandoFichaPdf}
            variant="outline"
            className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/10 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            title="Baixar Ficha de Cadastro de Membro em branco (PDF) para preenchimento manual"
          >
            {gerandoFichaPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1E3A5F]" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-[#1E3A5F]" />
            )}
            Baixar Ficha em Branco (PDF)
          </Button>

          {/* Botão Exportar CSV */}
          <Button
            onClick={handleExportarCsv}
            variant="outline"
            className="border-[#E6E2D8] text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
            title="Baixar lista completa em planilha Excel/CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Baixar Planilha (CSV)
          </Button>

          {/* Botão Novo Membro */}
          <Button
            onClick={handleOpenCreate}
            className="bg-[#1E3A5F] hover:bg-[#16304F] text-white flex items-center gap-2 text-xs font-semibold shadow-md"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Membro
          </Button>
        </div>
      </div>

      {/* Abas: Ativos / Inativos e Afastados / Falecidos / Solicitações Pendentes */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Tabs
          value={abaAtiva}
          onValueChange={(val) => setAbaAtiva(val as AbaMembros)}
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

            <TabsTrigger
              value="pendentes"
              className="text-xs font-semibold px-3 py-2 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white rounded-lg flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Solicitações Pendentes</span>
              {totalPendentes > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white font-bold rounded-full text-[10px] animate-pulse">
                  {totalPendentes}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="aniversariantes"
              className="text-xs font-semibold px-3 py-2 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white rounded-lg flex items-center gap-1.5"
            >
              <Cake className="w-3.5 h-3.5 text-pink-500" />
              <span>Aniversariantes de hoje</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  totalAniversariantesHoje > 0
                    ? 'bg-pink-100 text-pink-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {totalAniversariantesHoje}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Barra de Busca */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A5A]" />
          <Input
            placeholder={
              abaAtiva === 'pendentes'
                ? 'Buscar solicitação...'
                : 'Buscar membro por nome, ficha ou doc...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-[#E6E2D8] text-xs sm:text-sm rounded-xl"
          />
        </div>
      </div>

      {/* Conteúdo da Aba Selecionada */}
      {abaAtiva === 'aniversariantes' ? (
        /* ABA: ANIVERSARIANTES DE HOJE */
        <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
          <div className="p-4 bg-pink-50/70 border-b border-[#E6E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-pink-950">
              <Cake className="w-5 h-5 text-pink-600 flex-shrink-0" />
              <div>
                <strong className="font-semibold">
                  Membros e Congregados Ativos aniversariando hoje
                </strong>
                <p className="text-slate-600 text-[11px]">
                  Felicite com uma mensagem personalizada no WhatsApp com apenas 1 clique.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTempMensagemAniv(mensagemAniversario)
                  setIsModalMsgAnivOpen(true)
                }}
                className="text-xs border-[#E6E2D8] text-[#1E3A5F] hover:bg-white"
              >
                <Settings className="w-3.5 h-3.5 mr-1.5 text-[#C9A227]" />
                Personalizar Mensagem
              </Button>
              <Badge className="bg-pink-600 text-white font-bold text-xs">
                {aniversariantesHoje.length} aniversariante(s) hoje
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#1E3A5F] text-white uppercase text-[10px] sm:text-xs tracking-wider">
                <tr>
                  <th className="p-3 sm:p-4">Pessoa</th>
                  <th className="p-3 sm:p-4">Tipo</th>
                  <th className="p-3 sm:p-4">Congregação</th>
                  <th className="p-3 sm:p-4">Data Nascimento</th>
                  <th className="p-3 sm:p-4">Contato (WhatsApp / Tel)</th>
                  <th className="p-3 sm:p-4 text-right">Felicitações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E2D8]">
                {aniversariantesHoje.length > 0 ? (
                  aniversariantesHoje.map((item) => {
                    const contatoExibicao = item.whatsapp || item.telefone

                    return (
                      <tr key={item.id} className="hover:bg-pink-50/20 transition">
                        <td className="p-3 sm:p-4 font-semibold text-[#1E3A5F]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 border border-pink-200 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden shadow-2xs">
                              {item.foto ? (
                                <img
                                  src={item.foto}
                                  alt={item.nome}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{item.nome.slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-[#1E3A5F]">{item.nome}</div>
                              {item.numero_ficha && (
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                                  Ficha nº {item.numero_ficha}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          {item.tipo === 'membro' ? (
                            <Badge className="bg-[#1E3A5F] hover:bg-[#16304F] text-white font-semibold text-[10px] px-2 py-0.5">
                              Membro
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] px-2 py-0.5 border border-amber-600">
                              Congregado
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 text-slate-700 font-medium">
                          {item.congregacao}
                        </td>
                        <td className="p-3 sm:p-4 text-slate-600">
                          <span className="font-semibold text-pink-700 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
                            {item.data_nascimento
                              ? formatarDataBr(item.data_nascimento)
                              : item.data_nascimento_texto || 'Hoje'}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4 text-slate-700">
                          {contatoExibicao ? (
                            <div className="flex flex-col">
                              <span className="font-mono text-xs">{contatoExibicao}</span>
                              {item.whatsapp && (
                                <span className="text-[10px] text-emerald-600 font-medium">
                                  WhatsApp cadastrado
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Sem número registrado</span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 text-right">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setAniversarianteSelecionado({
                                nome: item.nome,
                                whatsapp: item.whatsapp,
                                telefone: item.telefone,
                                tipo: item.tipo,
                                congregacao: item.congregacao,
                              })
                              setFelicitarModalOpen(true)
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                            title={`Felicitar ${item.nome}`}
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                            Felicitar
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Cake className="w-10 h-10 text-pink-300 mx-auto" />
                        <p className="font-medium text-slate-700">Nenhum aniversariante hoje</p>
                        <p className="text-xs text-slate-500">
                          Nenhum membro ou congregado ativo possui aniversário registrado para o dia
                          de hoje.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : abaAtiva === 'pendentes' ? (
        /* ABA: SOLICITAÇÕES PENDENTES DE MEMBROS */
        <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
          <div className="p-4 bg-amber-50/60 border-b border-[#E6E2D8] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-900">
              <Clock className="w-4 h-4 text-[#C9A227]" />
              <span>
                Fichas preenchidas pelo link público aguardando revisão e aprovação da secretaria.
              </span>
            </div>
            <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-xs">
              {solicitacoesFiltradas.length} pendentes
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#1E3A5F] text-white uppercase text-[10px] sm:text-xs tracking-wider">
                <tr>
                  <th className="p-3 sm:p-4">Nome Solicitante</th>
                  <th className="p-3 sm:p-4">Congregação</th>
                  <th className="p-3 sm:p-4">Contato / Docs</th>
                  <th className="p-3 sm:p-4">Endereço & Filiação</th>
                  <th className="p-3 sm:p-4">Data Envio</th>
                  <th className="p-3 sm:p-4 text-right">Ação Administrativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E2D8]">
                {solicitacoesFiltradas.length > 0 ? (
                  solicitacoesFiltradas.map((sol) => (
                    <tr key={sol.id} className="hover:bg-amber-50/30 transition">
                      <td className="p-3 sm:p-4 font-semibold text-[#1E3A5F]">
                        <div>{sol.nome}</div>
                        {sol.observacao && (
                          <div className="text-[10px] text-amber-700 italic">{sol.observacao}</div>
                        )}
                        {sol.estado_civil && (
                          <div className="text-[11px] text-slate-500">
                            {sol.estado_civil} {sol.naturalidade ? `• ${sol.naturalidade}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="p-3 sm:p-4 text-slate-700">{sol.congregacao}</td>
                      <td className="p-3 sm:p-4 text-xs text-slate-600">
                        {sol.whatsapp ? (
                          <div className="text-emerald-700 font-semibold flex items-center gap-1">
                            <span>WhatsApp:</span> {sol.whatsapp}
                          </div>
                        ) : null}
                        <div>Tel: {sol.telefone || '—'}</div>
                        {sol.cpf && <div>CPF: {sol.cpf}</div>}
                        {sol.rg && <div>RG: {sol.rg}</div>}
                      </td>
                      <td className="p-3 sm:p-4 text-xs text-slate-600 max-w-xs">
                        {sol.filiacao && (
                          <div className="truncate text-[11px]" title={sol.filiacao}>
                            <strong>Pais:</strong> {sol.filiacao}
                          </div>
                        )}
                        {sol.endereco && (
                          <div className="truncate text-[11px] text-slate-500" title={sol.endereco}>
                            <strong>End:</strong> {sol.endereco}
                          </div>
                        )}
                      </td>
                      <td className="p-3 sm:p-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatarDataBr(sol.created)}
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => handleRevisarSolicitacao(sol)}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 flex items-center gap-1.5 shadow-sm"
                            title="Revisar e Aprovar como Membro Oficial"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Revisar & Aprovar
                          </Button>
                          <Button
                            onClick={() => {
                              setRejeitandoId(sol.id)
                              setIsRejectModalOpen(true)
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:bg-rose-50 h-8 px-2"
                            title="Rejeitar Solicitação"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#5A5A5A] italic">
                      Nenhuma solicitação de membro pendente no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* TABELAS DE ATIVOS / INATIVOS / IN MEMÓRIA */
        <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
          {abaAtiva === 'in_memoria' && (
            <div className="p-4 bg-slate-100/80 border-b border-[#E6E2D8] flex items-center justify-between">
              <div className="text-xs text-slate-700">
                <strong className="text-[#1E3A5F]">Sessão In Memória:</strong> Irmãos e irmãs que
                concluíram sua carreira na fé terrena e estão com o Senhor. Seus cadastros e números
                de ficha oficiais são preservados integralmente.
              </div>
              <Badge className="bg-slate-700 text-white font-bold text-xs">
                {totalFalecidos} registro(s)
              </Badge>
            </div>
          )}
          {abaAtiva === 'inativos' && (
            <div className="p-4 bg-amber-50/70 border-b border-[#E6E2D8] flex items-center justify-between">
              <div className="text-xs text-amber-900">
                <strong className="text-[#1E3A5F]">Sessão Inativos / Afastados:</strong> Membros
                inativados temporariamente. Use o botão <strong>"Reativar"</strong> a qualquer
                momento para que voltem à sessão Ativos e às listas públicas.
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
                  <th className="p-3 sm:p-4">Ficha / Nome</th>
                  <th className="p-3 sm:p-4">Registro / Doc</th>
                  <th className="p-3 sm:p-4">Congregação</th>
                  <th className="p-3 sm:p-4">Filiação & Endereço</th>
                  <th className="p-3 sm:p-4">Datas</th>
                  <th className="p-3 sm:p-4">Situação</th>
                  <th className="p-3 sm:p-4 text-right">Ações Eclesiásticas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E2D8]">
                {membrosFiltrados.length > 0 ? (
                  membrosFiltrados.map((m) => {
                    const statusStr = (m.status || 'Ativo').toLowerCase()
                    const isFalecido = statusStr.includes('falecido')
                    const isInativo =
                      !isFalecido &&
                      (statusStr.includes('inativo') ||
                        statusStr.includes('afastado') ||
                        statusStr.includes('mudança') ||
                        statusStr.includes('transferido'))
                    const isAtivo = !isFalecido && !isInativo

                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 sm:p-4 font-medium flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] border border-[#E6E2D8] flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden">
                            {m.foto ? (
                              <img
                                src={pb.files.getURL(m, m.foto)}
                                alt={m.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              m.nome.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              {m.numero_ficha && (
                                <span className="bg-[#1E3A5F]/10 text-[#1E3A5F] font-bold text-[10px] px-1.5 py-0.5 rounded">
                                  Ficha {m.numero_ficha}
                                </span>
                              )}
                              <span className="font-semibold text-[#1E3A5F]">{m.nome}</span>
                            </div>
                            {m.observacao && (
                              <div className="text-[10px] text-amber-700 italic">
                                {m.observacao}
                              </div>
                            )}
                            {m.estado_civil && (
                              <div className="text-[11px] text-[#5A5A5A]">
                                {m.estado_civil} {m.naturalidade ? `• ${m.naturalidade}` : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4 text-slate-600 text-xs">
                          <div className="font-mono font-semibold text-[#1E3A5F]">
                            {m.numero_registro ? `Reg: ${m.numero_registro}` : '—'}
                          </div>
                          {m.cpf && <div className="text-[11px] text-slate-500">CPF: {m.cpf}</div>}
                          {m.rg && <div className="text-[10px] text-slate-400">RG: {m.rg}</div>}
                        </td>
                        <td className="p-3 sm:p-4 text-slate-700">{m.congregacao}</td>
                        <td className="p-3 sm:p-4 text-xs text-slate-600 max-w-xs">
                          {m.filiacao && (
                            <div className="truncate text-[11px]" title={m.filiacao}>
                              <strong>Pais:</strong> {m.filiacao}
                            </div>
                          )}
                          {m.endereco && (
                            <div className="truncate text-[11px] text-slate-500" title={m.endereco}>
                              <strong>End:</strong> {m.endereco}
                            </div>
                          )}
                          {m.whatsapp && (
                            <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                              <span>WA: {m.whatsapp}</span>
                            </div>
                          )}
                          {m.telefone && (
                            <div className="text-[11px] text-slate-500">Tel: {m.telefone}</div>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 text-xs text-slate-600 whitespace-nowrap">
                          <div>
                            <strong>Nasc:</strong>{' '}
                            {m.data_nascimento
                              ? formatarDataBr(m.data_nascimento)
                              : m.data_nascimento_texto || '—'}
                          </div>
                          <div>
                            <strong>Batismo:</strong>{' '}
                            {m.data_batismo
                              ? formatarDataBr(m.data_batismo)
                              : m.data_batismo_texto || '—'}
                          </div>
                          <div>
                            <strong>Conv:</strong>{' '}
                            {m.data_conversao
                              ? formatarDataBr(m.data_conversao)
                              : m.data_conversao_texto || '—'}
                          </div>
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
                            {isFalecido ? 'In Memória (Falecido)' : m.status || 'Ativo'}
                          </Badge>
                        </td>
                        <td className="p-3 sm:p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Ações de Situação */}
                            {isAtivo ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleChangeStatus(m, 'Inativo/Afastado')}
                                className="h-8 text-amber-700 hover:bg-amber-50 text-xs px-2"
                                title="Mover para a sessão Inativos"
                              >
                                Inativar
                              </Button>
                            ) : isInativo ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleChangeStatus(m, 'Ativo')}
                                className="h-8 text-emerald-700 hover:bg-emerald-50 text-xs px-2 font-medium"
                                title="Reativar para Membros Ativos"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Reativar
                              </Button>
                            ) : isFalecido ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleChangeStatus(m, 'Ativo')}
                                className="h-8 text-emerald-700 hover:bg-emerald-50 text-xs px-2 font-medium"
                                title="Restaurar para Ativos caso tenha sido marcado por engano"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Reativar
                              </Button>
                            ) : null}

                            {!isFalecido && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleChangeStatus(m, 'Falecido')}
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
                              onClick={() => handleOpenEdit(m)}
                              className="h-8 w-8 text-[#1E3A5F] hover:bg-slate-100"
                              title="Editar Membro"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            {/* Excluir */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeletingId(m.id)
                                setIsDeleteModalOpen(true)
                              }}
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              title="Excluir Registro"
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
                    <td colSpan={7} className="p-8 text-center text-[#5A5A5A] italic">
                      Nenhum membro encontrado nesta sessão (
                      {abaAtiva === 'in_memoria' ? 'In Memória' : abaAtiva}).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal de Links de Cadastro Compartilháveis (Membro e Congregado) */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="max-w-lg bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-[#C9A227]/40 text-[#1E3A5F] flex items-center justify-center mx-auto mb-2">
              <Share2 className="w-6 h-6 text-[#C9A227]" />
            </div>
            <DialogTitle className="text-center font-serif text-xl font-bold text-[#1E3A5F]">
              Links de Cadastro Compartilháveis
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Copie o link desejado para enviar pelo WhatsApp. Ao preencher, os registros chegam na
              aba <strong>"Solicitações Pendentes"</strong> para você revisar e aprovar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* 1. LINK DE MEMBRO */}
            <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-[#1E3A5F] flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  1. Cadastro de Membro (Ficha Completa)
                </span>
                <span className="text-[10px] text-slate-500 font-medium">/cadastro/membro</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Coleta filiação, datas de conversão e batismo, documentos e congregação vinculada.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Input
                  readOnly
                  value={linkCadastroMembro}
                  className="text-xs bg-white font-mono select-all"
                />
                <Button
                  onClick={handleCopiarLinkMembro}
                  className={`text-xs ${
                    copiadoMembro
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-[#1E3A5F] hover:bg-[#16304F] text-white'
                  }`}
                >
                  {copiadoMembro ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Copiado!
                    </>
                  ) : (
                    'Copiar'
                  )}
                </Button>
              </div>
            </div>

            {/* 2. LINK DE CONGREGADO */}
            <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-[#1E3A5F] flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-[#C9A227]" />
                  2. Cadastro de Congregado (Rápido)
                </span>
                <span className="text-[10px] text-slate-500 font-medium">/cadastro/congregado</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Pede apenas nome completo, congregação, data de nascimento e telefone / WhatsApp.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Input
                  readOnly
                  value={linkCadastroCongregado}
                  className="text-xs bg-white font-mono select-all"
                />
                <Button
                  onClick={handleCopiarLinkCongregado}
                  className={`text-xs ${
                    copiadoCongregado
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-[#1E3A5F] hover:bg-[#16304F] text-white'
                  }`}
                >
                  {copiadoCongregado ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Copiado!
                    </>
                  ) : (
                    'Copiar'
                  )}
                </Button>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p>
                <strong>Regra Vigente:</strong> Nenhum cadastro entra de imediato nas listas
                públicas — a secretaria revisa cada um na aba "Solicitações Pendentes" antes de
                oficializar.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setIsLinkModalOpen(false)}
              className="w-full text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Rejeição de Solicitação */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-serif text-lg text-[#1E3A5F]">
              Rejeitar Solicitação
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Deseja remover esta solicitação de cadastro pendente da fila de aprovação?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsRejectModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button onClick={handleRejeitarSolicitacao} className="bg-rose-600 text-white flex-1">
              Rejeitar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Formulário (Criar / Editar / Aprovar) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              {revisandoSolicitacao
                ? 'Revisar & Aprovar Solicitação de Membro'
                : editingMembro
                  ? 'Editar Membro'
                  : 'Novo Membro'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              {revisandoSolicitacao
                ? 'Confira os dados enviados pelo candidato a membro. Ao salvar, a solicitação é aprovada e inserida no rol oficial com o número de ficha.'
                : `Preencha os dados do membro da ${config.siglaIgreja || config.nomeIgreja || 'igreja'}. Todos os campos são salvos de forma segura.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Identificação Básica: Nome e Número da Ficha */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Luíza Filomena de Almeida"
                  className={`text-xs sm:text-sm ${errors.nome ? 'border-red-500' : ''}`}
                />
                {errors.nome && (
                  <p className="text-[11px] text-red-600 font-medium">{errors.nome}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Nº da Ficha Oficial</label>
                <Input
                  value={numeroFicha}
                  onChange={(e) => setNumeroFicha(e.target.value)}
                  placeholder="Ex: 192"
                  className="text-xs sm:text-sm font-bold text-[#1E3A5F]"
                />
              </div>
            </div>

            {/* Registro, RG e CPF */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Nº Registro</label>
                <Input
                  value={numeroRegistro}
                  onChange={(e) => setNumeroRegistro(e.target.value)}
                  placeholder="Ex: 198503"
                  className="text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">RG</label>
                <Input
                  value={rg}
                  onChange={(e) => setRg(e.target.value)}
                  placeholder="Ex: 507194-82"
                  className="text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">CPF</label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="Ex: 000.000.000-00"
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Filiação */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Filiação (Pai e Mãe)</label>
              <Input
                value={filiacao}
                onChange={(e) => setFiliacao(e.target.value)}
                placeholder="Ex: José Fernandes de Almeida e Maria Zifirina de Almeida"
                className="text-xs sm:text-sm"
              />
            </div>

            {/* Naturalidade, Estado Civil, Telefone e WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Naturalidade</label>
                <Input
                  value={naturalidade}
                  onChange={(e) => setNaturalidade(e.target.value)}
                  placeholder="Ex: Uruoca–Ce"
                  className="text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Estado Civil</label>
                <Input
                  value={estadoCivil}
                  onChange={(e) => setEstadoCivil(e.target.value)}
                  placeholder="Ex: Casada, Solteiro(a)"
                  className="text-xs sm:text-sm"
                />
              </div>
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
                <label className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1">
                  <span>WhatsApp</span>
                </label>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(88) 99999-9999"
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Endereço e Observação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Endereço</label>
                <Input
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex: Av. Nova/Maria Ripa"
                  className="text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Observação / Apelido</label>
                <Input
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex: (Sansão), (filha da ir. Dunga)"
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Congregação e Situação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Congregação Vinculada <span className="text-red-500">*</span>
                </label>
                <select
                  value={congregacao}
                  onChange={(e) => setCongregacao(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                >
                  {unidadesLista.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Situação Eclesiástica <span className="text-red-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                >
                  <option value="Ativo">Ativo (Em comunhão)</option>
                  <option value="Inativo/Afastado">Inativo / Afastado</option>
                  <option value="Transferido por Mudança">Transferido por Mudança</option>
                  <option value="Falecido">Falecido</option>
                </select>
              </div>
            </div>

            {/* Datas: Nascimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-[#E6E2D8]">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Nascimento (Data)</label>
                <Input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="text-xs sm:text-sm bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Nascimento (Texto / Aprox)
                </label>
                <Input
                  value={dataNascimentoTexto}
                  onChange={(e) => setDataNascimentoTexto(e.target.value)}
                  placeholder="Ex: Não lembra, Aprox."
                  className="text-xs sm:text-sm bg-white"
                />
              </div>
            </div>

            {/* Conversão e Batismo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-[#E6E2D8]">
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1A1A]">Data Conversão</label>
                  <Input
                    type="date"
                    value={dataConversao}
                    onChange={(e) => setDataConversao(e.target.value)}
                    className="text-xs sm:text-sm bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#5A5A5A]">Conversão (Texto literal)</label>
                  <Input
                    value={dataConversaoTexto}
                    onChange={(e) => setDataConversaoTexto(e.target.value)}
                    placeholder="Ex: Na fé, Não lembra"
                    className="text-xs sm:text-sm bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1A1A]">Data Batismo</label>
                  <Input
                    type="date"
                    value={dataBatismo}
                    onChange={(e) => setDataBatismo(e.target.value)}
                    className="text-xs sm:text-sm bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#5A5A5A]">Batismo (Texto literal)</label>
                  <Input
                    value={dataBatismoTexto}
                    onChange={(e) => setDataBatismoTexto(e.target.value)}
                    placeholder="Ex: Não recebeu ainda, Aprox."
                    className="text-xs sm:text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Foto de Perfil */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Foto de Perfil</label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E6E2D8] bg-slate-50 hover:bg-slate-100 text-xs text-[#1E3A5F] font-medium">
                  <Upload className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Escolher arquivo...</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isCompressingFoto}
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const original = e.target.files[0]
                        setIsCompressingFoto(true)
                        try {
                          const res = await compressImage(original, {
                            maxDimension: 800,
                            quality: 0.82,
                          })
                          setFotoFile(res.file)
                        } catch (err) {
                          console.warn('Erro ao comprimir foto:', err)
                          setFotoFile(original)
                        } finally {
                          setIsCompressingFoto(false)
                          e.target.value = ''
                        }
                      }
                    }}
                  />
                </label>
                {isCompressingFoto && (
                  <span className="text-xs text-amber-700 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Otimizando foto...
                  </span>
                )}
                {!isCompressingFoto && fotoFile && (
                  <span className="text-xs text-slate-600 truncate">
                    {fotoFile.name} ({(fotoFile.size / 1024).toFixed(0)} KB)
                  </span>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-[#E6E2D8]">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false)
                  setRevisandoSolicitacao(null)
                }}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isCompressingFoto}
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : revisandoSolicitacao ? (
                  'Aprovar & Inserir Membro Oficial'
                ) : (
                  'Salvar Membro'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Personalização da Mensagem de Aniversário */}
      <Dialog open={isModalMsgAnivOpen} onOpenChange={setIsModalMsgAnivOpen}>
        <DialogContent className="max-w-lg bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-pink-50 border border-pink-200 text-pink-600 flex items-center justify-center mx-auto mb-2">
              <Cake className="w-6 h-6 text-pink-600" />
            </div>
            <DialogTitle className="text-center font-serif text-xl font-bold text-[#1E3A5F]">
              Mensagem de Felicitações (WhatsApp)
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Personalize o texto enviado aos aniversariantes. A tag <code>{'{nome}'}</code> será
              substituída automaticamente pelo nome do aniversariante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Texto da Mensagem</label>
              <textarea
                value={tempMensagemAniv}
                onChange={(e) => setTempMensagemAniv(e.target.value)}
                rows={4}
                className="w-full p-3 rounded-lg border border-[#E6E2D8] bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTempMensagemAniv(MENSAGEM_PADRAO_ANIVERSARIO)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Restaurar Padrão
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-[#E6E2D8]">
            <Button
              variant="outline"
              onClick={() => setIsModalMsgAnivOpen(false)}
              className="text-xs flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarMensagemAniversario}
              disabled={salvandoMsgAniv}
              className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs flex-1 font-semibold"
            >
              {salvandoMsgAniv ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Mensagem'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-serif text-lg text-[#1E3A5F]">
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Tem certeza que deseja excluir este membro do registro eclesiástico? Esta ação não
              pode ser desfeita. (Para arquivar, prefira mudar a situação para Inativo ou Falecido).
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-xs flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs flex-1"
            >
              Excluir Definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Felicitações Editável no WhatsApp */}
      <ModalFelicitarAniversariante
        open={felicitarModalOpen}
        onOpenChange={setFelicitarModalOpen}
        aniversariante={aniversarianteSelecionado}
        mensagemPadrao={mensagemAniversario || MENSAGEM_PADRAO_ANIVERSARIO}
      />
    </div>
  )
}

export default AdminMembros
