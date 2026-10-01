import React, { useState, useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Membro, CartaRecebida, Configuracao, Obreiro } from '@/types/adtc'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  FileText,
  CreditCard,
  Send,
  MoveRight,
  Baby,
  Printer,
  Download,
  Eye,
  ShieldCheck,
  Upload,
  Trash2,
  FolderArchive,
  Search,
  ExternalLink,
  Users,
  Award,
  Save,
  Loader2,
  Building2,
  PenTool,
  Check,
  UserPlus,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatarDataBr } from '@/lib/utils'
import { CartaoMembroVisual } from '@/components/CartaoMembroVisual'
import { CertificadoApresentacaoVisual } from '@/components/CertificadoApresentacaoVisual'
import { ADTC_LOGO_URL, ADTC_TOCHA_WATERMARK_DATA_URI } from '@/components/AdtcLogo'

import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import { useCongregacoes } from '@/hooks/useCongregacoes'
import {
  getLogoAsDataUri,
  convertImageUrlToDataUri,
  buildCartaRecomendacaoHtml,
  buildCartaMudancaHtml,
  buildCartaoMembroHtml,
  buildCertificadoApresentacaoHtml,
} from '@/lib/documentTemplates'

type DocumentType = 'carteira' | 'recomendacao' | 'mudanca' | 'apresentacao'

// Função auxiliar para formatar data por extenso no padrão brasileiro
// Exemplo: 06 de Fevereiro de 2026 ou 15 de Agosto de 2023
export function formatarDataExtensoBr(dataString?: string): string {
  if (!dataString) return ''
  try {
    let ano = 0
    let mes = 0
    let dia = 0

    if (dataString.includes('-')) {
      const parts = dataString.slice(0, 10).split('-')
      ano = parseInt(parts[0], 10)
      mes = parseInt(parts[1], 10) - 1
      dia = parseInt(parts[2], 10)
    } else if (dataString.includes('/')) {
      const parts = dataString.split('/')
      dia = parseInt(parts[0], 10)
      mes = parseInt(parts[1], 10) - 1
      ano = parseInt(parts[2], 10)
    } else {
      const d = new Date(dataString)
      if (isNaN(d.getTime())) return dataString
      ano = d.getFullYear()
      mes = d.getMonth()
      dia = d.getDate()
    }

    const meses = [
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

    const diaFmt = String(dia).padStart(2, '0')
    const mesFmt = meses[mes] || ''
    return `${diaFmt} de ${mesFmt} de ${ano}`
  } catch {
    return dataString
  }
}

// Extrai data formatada DD/MM/AAAA a partir de campo date ISO ou texto
function formatarDataSimples(dataIso?: string, dataTexto?: string): string {
  if (dataIso) {
    return formatarDataBr(dataIso)
  }
  if (dataTexto && dataTexto.trim()) {
    return dataTexto.trim()
  }
  return ''
}

// Extrai filiação pai e mãe a partir de string "Pai e Mãe"
function extrairPaiMae(filiacao?: string): { pai: string; mae: string } {
  if (!filiacao) return { pai: '', mae: '' }
  if (filiacao.toLowerCase().includes(' e ')) {
    const parts = filiacao.split(/\s+e\s+/i)
    return {
      pai: parts[0]?.trim() || '',
      mae: parts.slice(1).join(' e ').trim() || '',
    }
  }
  return { pai: '', mae: filiacao.trim() }
}

export const AdminDocumentos: React.FC = () => {
  const { toast } = useToast()
  const { config } = useChurchConfig()
  const { congregacoes } = useCongregacoes()
  const [activeTab, setActiveTab] = useState<'gerador' | 'arquivo'>('gerador')

  // Membros cadastrados para emissão
  const [membros, setMembros] = useState<Membro[]>([])
  const [obreiros, setObreiros] = useState<Obreiro[]>([])
  const [loadingMembros, setLoadingMembros] = useState(true)

  // Tipo de documento sendo emitido
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('recomendacao')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const printAreaRef = useRef<HTMLDivElement>(null)

  // ==========================================
  // CONFIGURAÇÕES PERSISTENTES DE ASSINATURA / LIDERANÇA
  // ==========================================
  const [nomePastor, setNomePastor] = useState(() => config.nomePastor || 'Pastor Presidente')
  const [cargoPastor, setCargoPastor] = useState('Pastor')
  const [nome1Secretario, setNome1Secretario] = useState('1º Secretário')
  const [cargo1Secretario, setCargo1Secretario] = useState('1ºSecretário')
  const [nome2Secretario, setNome2Secretario] = useState('2º Secretário')
  const [cargo2Secretario, setCargo2Secretario] = useState('2ºSecretário')
  const [isSalvandoLiderancaRapida, setIsSalvandoLiderancaRapida] = useState(false)

  // ==========================================
  // 1. ESTADO: CARTÃO DE MEMBRO
  // ==========================================
  const [carteiraMembroId, setCarteiraMembroId] = useState('')
  const [carteiraCargo, setCarteiraCargo] = useState('Membro em Comunhão')
  const [carteiraEmissao, setCarteiraEmissao] = useState(new Date().toLocaleDateString('pt-BR'))
  const [carteiraPastor, setCarteiraPastor] = useState(
    () => config.nomePastor || 'Pastor Presidente',
  )

  // ==========================================
  // 2. ESTADO: CARTA DE RECOMENDAÇÃO (NOVO MODELO OFICIAL)
  // ==========================================
  const [recMembroId, setRecMembroId] = useState('')
  const [recIsCasal, setRecIsCasal] = useState(false)
  // Dados do membro titular
  const [recNome, setRecNome] = useState('')
  const [recFuncao, setRecFuncao] = useState('') // Ex: "auxiliar", "diácono", vazio se membro comum
  const [recEstadoCivil, setRecEstadoCivil] = useState('Casado')
  const [recDataNascimento, setRecDataNascimento] = useState('')
  const [recNaturalidade, setRecNaturalidade] = useState('')
  const [recPai, setRecPai] = useState('')
  const [recMae, setRecMae] = useState('')
  const [recNacionalidade, setRecNacionalidade] = useState('brasileiro')
  const [recDataConversao, setRecDataConversao] = useState('')
  const [recDataBatismo, setRecDataBatismo] = useState('')
  // Dados do cônjuge (quando recIsCasal for true)
  const [recConjugeMembroId, setRecConjugeMembroId] = useState('')
  const [recConjugeNome, setRecConjugeNome] = useState('')
  const [recConjugeDataNascimento, setRecConjugeDataNascimento] = useState('')
  const [recConjugeNaturalidade, setRecConjugeNaturalidade] = useState('')
  const [recConjugePai, setRecConjugePai] = useState('')
  const [recConjugeMae, setRecConjugeMae] = useState('')
  const [recConjugeDataBatismo, setRecConjugeDataBatismo] = useState('')
  // Expedição e Assinaturas específicas da Carta de Recomendação
  const [recDataExpedicao, setRecDataExpedicao] = useState(new Date().toISOString().slice(0, 10))
  const [recPastorAssinatura, setRecPastorAssinatura] = useState('')
  const [recCargoPastor, setRecCargoPastor] = useState('Pastor')
  const [rec1SecAssinatura, setRec1SecAssinatura] = useState('')
  const [recCargo1Sec, setRecCargo1Sec] = useState('1ºSecretário')
  const [rec2SecAssinatura, setRec2SecAssinatura] = useState('')
  const [recCargo2Sec, setRecCargo2Sec] = useState('2ºSecretário')

  // ==========================================
  // 3. ESTADO: CARTA DE MUDANÇA (NOVO MODELO OFICIAL)
  // ==========================================
  const [mudMembroId, setMudMembroId] = useState('')
  const [mudNome, setMudNome] = useState('')
  const [mudFuncao, setMudFuncao] = useState('') // se houver, ex: "diácono"
  const [mudDataNascimento, setMudDataNascimento] = useState('')
  const [mudNaturalidade, setMudNaturalidade] = useState('')
  const [mudPai, setMudPai] = useState('')
  const [mudMae, setMudMae] = useState('')
  const [mudNacionalidade, setMudNacionalidade] = useState('brasileiro')
  const [mudDataBatismo, setMudDataBatismo] = useState('')
  const [mudNumeroRegistro, setMudNumeroRegistro] = useState('')
  const [mudDataExpedicao, setMudDataExpedicao] = useState(new Date().toISOString().slice(0, 10))
  const [mudPastorAssinatura, setMudPastorAssinatura] = useState('')
  const [mudCargoPastor, setMudCargoPastor] = useState('Pastor')
  const [mud1SecAssinatura, setMud1SecAssinatura] = useState('')
  const [mudCargo1Sec, setMudCargo1Sec] = useState('1ºSecretário')
  const [mud2SecAssinatura, setMud2SecAssinatura] = useState('')
  const [mudCargo2Sec, setMudCargo2Sec] = useState('2ºSecretário')

  // Modo de edição de texto das cartas (Recomendação, Mudança, Apresentação)
  const [isEditingTextoRec, setIsEditingTextoRec] = useState(false)
  const [textoEditadoRec, setTextoEditadoRec] = useState<string | null>(null)

  const [isEditingTextoMud, setIsEditingTextoMud] = useState(false)
  const [textoEditadoMud, setTextoEditadoMud] = useState<string | null>(null)

  const [isEditingTextoApr, setIsEditingTextoApr] = useState(false)
  const [textoEditadoApr, setTextoEditadoApr] = useState<string | null>(null)

  // ==========================================
  // 4. ESTADO: APRESENTAÇÃO DE CRIANÇA
  // ==========================================
  const [aprNomeCrianca, setAprNomeCrianca] = useState('')
  const [aprDataNascimento, setAprDataNascimento] = useState('')
  const [aprNomePai, setAprNomePai] = useState('')
  const [aprNomeMae, setAprNomeMae] = useState('')
  const [aprDataApresentacao, setAprDataApresentacao] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [aprPastorOficiante, setAprPastorOficiante] = useState(
    () => config.nomePastor || 'Pastor Presidente',
  )

  // ==========================================
  // ESTADOS DO ARQUIVO DE CARTAS RECEBIDAS (ENTRADA)
  // ==========================================
  const [cartasRecebidas, setCartasRecebidas] = useState<CartaRecebida[]>([])
  const [loadingCartas, setLoadingCartas] = useState(false)
  const [searchCarta, setSearchCarta] = useState('')
  const [arquivoTipoFiltro, setArquivoTipoFiltro] = useState<'Todos' | 'Obreiro' | 'Membro'>(
    'Todos',
  )
  const [isNovoArquivoOpen, setIsNovoArquivoOpen] = useState(false)
  const [isSalvandoCarta, setIsSalvandoCarta] = useState(false)

  // Form de nova carta recebida
  const [novoNome, setNovoNome] = useState('')
  const [novoTipoPessoa, setNovoTipoPessoa] = useState<'Membro' | 'Obreiro'>('Membro')
  const [novaFuncaoObreiro, setNovaFuncaoObreiro] = useState('Diácono')
  const [novaIgrejaOrigem, setNovaIgrejaOrigem] = useState('')
  const [novaCidadeOrigem, setNovaCidadeOrigem] = useState('')
  const [novaDataRecebimento, setNovaDataRecebimento] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [novaCongregacaoDestino, setNovaCongregacaoDestino] = useState<string>('')
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null)
  const [novasObservacoes, setNovasObservacoes] = useState('')

  // Modal para editar liderança e cargos diretamente
  const [isConfigLiderancaModalOpen, setIsConfigLiderancaModalOpen] = useState(false)

  useEffect(() => {
    loadLiderancaConfig()
    loadMembrosEObreiros()
    loadCartasRecebidas()
  }, [])

  // Carrega nomes e cargos oficiais e imagens de assinaturas persistidos no banco
  const loadLiderancaConfig = async () => {
    try {
      const records = await pb.collection('configuracoes').getFullList<Configuracao>()
      let pNome = ''
      let pCargo = ''
      let s1Nome = ''
      let s1Cargo = ''
      let s2Nome = ''
      let s2Cargo = ''

      records.forEach((c) => {
        const val = c.valor?.trim() || ''
        if (val && !val.startsWith('[') && !val.endsWith(']')) {
          if (c.chave === 'lideranca_nome_pastor') pNome = val
          if (c.chave === 'lideranca_cargo_pastor') pCargo = val
          if (c.chave === 'lideranca_nome_1_secretario') s1Nome = val
          if (c.chave === 'lideranca_cargo_1_secretario') s1Cargo = val
          if (c.chave === 'lideranca_nome_2_secretario') s2Nome = val
          if (c.chave === 'lideranca_cargo_2_secretario') s2Cargo = val
        }
      })

      // Fallbacks lidos do config da igreja ou neutros
      const finalPastorNome = pNome || config.nomePastor || 'Pastor Presidente'
      const finalPastorCargo = pCargo || 'Pastor'
      const final1SecNome = s1Nome || '1º Secretário'
      const final1SecCargo = s1Cargo || '1ºSecretário'
      const final2SecNome = s2Nome || '2º Secretário'
      const final2SecCargo = s2Cargo || '2ºSecretário'

      setNomePastor(finalPastorNome)
      setCargoPastor(finalPastorCargo)
      setNome1Secretario(final1SecNome)
      setCargo1Secretario(final1SecCargo)
      setNome2Secretario(final2SecNome)
      setCargo2Secretario(final2SecCargo)

      // Propaga direto aos estados dos formulários e cartas
      setCarteiraPastor(finalPastorNome)
      setAprPastorOficiante(finalPastorNome)
      setRecPastorAssinatura(finalPastorNome)
      setRecCargoPastor(finalPastorCargo)
      setRec1SecAssinatura(final1SecNome)
      setRecCargo1Sec(final1SecCargo)
      setRec2SecAssinatura(final2SecNome)
      setRecCargo2Sec(final2SecCargo)
      setMudPastorAssinatura(finalPastorNome)
      setMudCargoPastor(finalPastorCargo)
      setMud1SecAssinatura(final1SecNome)
      setMudCargo1Sec(final1SecCargo)
      setMud2SecAssinatura(final2SecNome)
      setMudCargo2Sec(final2SecCargo)
    } catch (err) {
      console.error('Erro ao carregar configurações de liderança:', err)
    }
  }

  const loadMembrosEObreiros = async () => {
    try {
      setLoadingMembros(true)
      const [membrosRes, obreirosRes] = await Promise.all([
        pb.collection('membros').getFullList<Membro>({
          filter: "status='Ativo'",
          sort: 'nome',
        }),
        pb.collection('obreiros').getFullList<Obreiro>({
          filter: "status='Ativo'",
          sort: 'ordem,nome',
        }),
      ])

      setMembros(membrosRes)
      setObreiros(obreirosRes)

      if (membrosRes.length > 0) {
        setCarteiraMembroId(membrosRes[0].id)
        preencherDadosRecomendacao(membrosRes[0], obreirosRes)
        preencherDadosMudanca(membrosRes[0], obreirosRes)
      }
    } catch (err) {
      console.error('Erro ao buscar membros para documentos:', err)
    } finally {
      setLoadingMembros(false)
    }
  }

  // Descobre função do membro (se tiver no cadastro de obreiros ou na observação)
  const descobrirFuncaoMembro = (m: Membro, listaObreiros: Obreiro[]): string => {
    // 1. Procurar na tabela de obreiros pelo nome aproximado
    const matchObreiro = listaObreiros.find(
      (o) =>
        o.nome.toLowerCase().trim() === m.nome.toLowerCase().trim() ||
        o.nome.toLowerCase().includes(m.nome.toLowerCase()) ||
        m.nome.toLowerCase().includes(o.nome.toLowerCase()),
    )
    if (matchObreiro && matchObreiro.cargo && matchObreiro.cargo !== 'Pastor Presidente') {
      return matchObreiro.cargo.toLowerCase()
    }

    // 2. Procurar na observação (ex: "Função: Auxiliar", "Função: Diácono")
    if (m.observacao) {
      const match = m.observacao.match(/fun[çc][ãa]o\s*:\s*([^;,\n]+)/i)
      if (match && match[1]) {
        const f = match[1].trim().toLowerCase()
        if (f !== 'membro' && f !== 'membro em comunhão' && f !== 'nenhuma') {
          return f
        }
      }
    }

    return ''
  }

  // Preenche automaticamente o form de recomendação a partir do membro selecionado
  const preencherDadosRecomendacao = (m: Membro, listaObreiros = obreiros) => {
    setRecMembroId(m.id)
    setRecNome(m.nome || '')
    const func = descobrirFuncaoMembro(m, listaObreiros)
    setRecFuncao(func)
    setRecEstadoCivil(m.estado_civil || 'Casado')
    setRecDataNascimento(formatarDataSimples(m.data_nascimento, m.data_nascimento_texto))
    setRecNaturalidade(m.naturalidade || '')
    const { pai, mae } = extrairPaiMae(m.filiacao)
    setRecPai(pai)
    setRecMae(mae)
    setRecNacionalidade('brasileiro')
    setRecDataConversao(formatarDataSimples(m.data_conversao, m.data_conversao_texto))
    setRecDataBatismo(formatarDataSimples(m.data_batismo, m.data_batismo_texto))

    // Se tiver cônjuge com sobrenome parecido ou casado, deixa pronto para edição
    if (m.estado_civil === 'Casado' || m.estado_civil === 'Casada') {
      setRecIsCasal(true)
    }
    // Ao trocar de membro, reseta qualquer texto editado manualmente para recompor automaticamente
    setTextoEditadoRec(null)
    setIsEditingTextoRec(false)
  }

  // Preenche dados do cônjuge ao selecionar membro
  const preencherDadosConjuge = (c: Membro) => {
    setRecConjugeMembroId(c.id)
    setRecConjugeNome(c.nome || '')
    setRecConjugeDataNascimento(formatarDataSimples(c.data_nascimento, c.data_nascimento_texto))
    setRecConjugeNaturalidade(c.naturalidade || '')
    const { pai, mae } = extrairPaiMae(c.filiacao)
    setRecConjugePai(pai)
    setRecConjugeMae(mae)
    setRecConjugeDataBatismo(formatarDataSimples(c.data_batismo, c.data_batismo_texto))
  }

  // Preenche form de mudança a partir do membro selecionado
  const preencherDadosMudanca = (m: Membro, listaObreiros = obreiros) => {
    setMudMembroId(m.id)
    setMudNome(m.nome || '')
    const func = descobrirFuncaoMembro(m, listaObreiros)
    setMudFuncao(func)
    setMudDataNascimento(formatarDataSimples(m.data_nascimento, m.data_nascimento_texto))
    setMudNaturalidade(m.naturalidade || '')
    const { pai, mae } = extrairPaiMae(m.filiacao)
    setMudPai(pai)
    setMudMae(mae)
    setMudNacionalidade('brasileiro')
    setMudDataBatismo(formatarDataSimples(m.data_batismo, m.data_batismo_texto))
    setMudNumeroRegistro(m.numero_ficha || m.numero_registro || '')
    // Ao trocar de membro, reseta qualquer texto editado manualmente para recompor automaticamente
    setTextoEditadoMud(null)
    setIsEditingTextoMud(false)
  }

  // Preenche dados da apresentação de criança
  const preencherDadosApresentacao = (m: Membro) => {
    setAprNomeCrianca(m.nome || '')
    setAprDataNascimento(m.data_nascimento?.slice(0, 10) || '')
    const { pai, mae } = extrairPaiMae(m.filiacao)
    setAprNomePai(pai)
    setAprNomeMae(mae)
    setTextoEditadoApr(null)
    setIsEditingTextoApr(false)
  }

  const loadCartasRecebidas = async () => {
    try {
      setLoadingCartas(true)
      const records = await pb.collection('cartas_recebidas').getFullList<CartaRecebida>({
        sort: '-data_recebimento,-created',
      })
      setCartasRecebidas(records)
    } catch (err) {
      console.error('Erro ao carregar cartas recebidas:', err)
    } finally {
      setLoadingCartas(false)
    }
  }

  const saveConfigChave = async (chave: string, valor: string) => {
    try {
      const existing = await pb
        .collection('configuracoes')
        .getFirstListItem<Configuracao>(`chave='${chave}'`)
      await pb.collection('configuracoes').update(existing.id, { valor })
    } catch {
      await pb.collection('configuracoes').create({ chave, valor })
    }
  }

  const handleSalvarLiderancaPersistente = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSalvandoLiderancaRapida(true)
    try {
      await Promise.all([
        saveConfigChave('lideranca_nome_pastor', nomePastor.trim()),
        saveConfigChave('lideranca_cargo_pastor', cargoPastor.trim()),
        saveConfigChave('lideranca_nome_1_secretario', nome1Secretario.trim()),
        saveConfigChave('lideranca_cargo_1_secretario', cargo1Secretario.trim()),
        saveConfigChave('lideranca_nome_2_secretario', nome2Secretario.trim()),
        saveConfigChave('lideranca_cargo_2_secretario', cargo2Secretario.trim()),
      ])

      // Sincroniza estados correntes
      setCarteiraPastor(nomePastor.trim())
      setAprPastorOficiante(nomePastor.trim())
      setRecPastorAssinatura(nomePastor.trim())
      setRecCargoPastor(cargoPastor.trim())
      setRec1SecAssinatura(nome1Secretario.trim())
      setRecCargo1Sec(cargo1Secretario.trim())
      setRec2SecAssinatura(nome2Secretario.trim())
      setRecCargo2Sec(cargo2Secretario.trim())
      setMudPastorAssinatura(nomePastor.trim())
      setMudCargoPastor(cargoPastor.trim())
      setMud1SecAssinatura(nome1Secretario.trim())
      setMudCargo1Sec(cargo1Secretario.trim())
      setMud2SecAssinatura(nome2Secretario.trim())
      setMudCargo2Sec(cargo2Secretario.trim())

      toast({
        title: 'Assinaturas salvas com sucesso!',
        description: 'Os novos nomes e cargos foram atualizados em todos os documentos oficiais.',
      })
      setIsConfigLiderancaModalOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar'
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar',
        description: msg,
      })
    } finally {
      setIsSalvandoLiderancaRapida(false)
    }
  }

  const handleSalvarCartaRecebida = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome.trim() || !novaIgrejaOrigem.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe ao menos o nome da pessoa e a igreja de origem.',
      })
      return
    }

    try {
      setIsSalvandoCarta(true)
      const formData = new FormData()
      formData.append('nome', novoNome.trim())
      formData.append('tipo_pessoa', novoTipoPessoa)
      if (novoTipoPessoa === 'Obreiro') {
        formData.append('funcao_obreiro', novaFuncaoObreiro)
      }
      formData.append('igreja_origem', novaIgrejaOrigem.trim())
      formData.append('cidade_origem', novaCidadeOrigem.trim())
      formData.append('data_recebimento', novaDataRecebimento)
      formData.append('congregacao_destino', novaCongregacaoDestino)
      formData.append('observacoes', novasObservacoes.trim())

      if (novoArquivo) {
        formData.append('arquivo_pdf', novoArquivo)
      }

      await pb.collection('cartas_recebidas').create(formData)

      toast({
        title: 'Carta Arquivada com Sucesso!',
        description: `Documento de ${novoNome} foi armazenado no espaço de ${
          novoTipoPessoa === 'Obreiro' ? 'Obreiros' : 'Membros'
        }.`,
      })

      setNovoNome('')
      setNovaIgrejaOrigem('')
      setNovaCidadeOrigem('')
      setNovasObservacoes('')
      setNovoArquivo(null)
      setIsNovoArquivoOpen(false)
      loadCartasRecebidas()
    } catch (err: unknown) {
      console.error('Erro ao salvar carta recebida:', err)
      const message = err instanceof Error ? err.message : 'Falha ao salvar carta recebida.'
      toast({
        variant: 'destructive',
        title: 'Erro ao arquivar',
        description: message,
      })
    } finally {
      setIsSalvandoCarta(false)
    }
  }

  const handleExcluirCarta = async (id: string, nome: string) => {
    if (!window.confirm(`Deseja realmente remover o arquivo da carta de ${nome}?`)) {
      return
    }
    try {
      await pb.collection('cartas_recebidas').delete(id)
      toast({
        title: 'Arquivo removido',
        description: `O registro de ${nome} foi excluído do arquivo.`,
      })
      loadCartasRecebidas()
    } catch (err) {
      console.error('Erro ao excluir carta recebida:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o arquivo.',
      })
    }
  }

  const selectedCarteiraMembro = membros.find((m) => m.id === carteiraMembroId)

  // Impressão / Exportação PDF usando modelos dedicados A4 com logo do comprador (Data URI)
  const handlePrintOrDownload = async () => {
    try {
      const currentLogoUrl = config.logoUrl || ADTC_LOGO_URL
      const logoDataUri = await getLogoAsDataUri(currentLogoUrl)

      let htmlCompleto = ''

      const churchIdentity = {
        nomeIgreja: config.nomeIgreja,
        subtituloIgreja: config.subtituloIgreja,
        denominacao: config.denominacao,
        enderecoIgreja: config.enderecoIgreja,
        cidadeUf: config.cidadeUf,
        siglaIgreja: config.siglaIgreja,
      }

      if (selectedDocType === 'recomendacao') {
        const corpoHtml = renderTextoCartaRecomendacaoString()
        htmlCompleto = buildCartaRecomendacaoHtml({
          corpoHtml,
          dataExpedicaoExtenso: formatarDataExtensoBr(recDataExpedicao),
          nomePastor: (recPastorAssinatura || nomePastor || 'Pastor Presidente').trim(),
          cargoPastor: (recCargoPastor || cargoPastor || 'Pastor').trim(),
          nome1Sec: (rec1SecAssinatura || nome1Secretario || '1º Secretário').trim(),
          cargo1Sec: (recCargo1Sec || cargo1Secretario || '1ºSecretário').trim(),
          nome2Sec: (rec2SecAssinatura || nome2Secretario || '2º Secretário').trim(),
          cargo2Sec: (recCargo2Sec || cargo2Secretario || '2ºSecretário').trim(),
          logoDataUri,
          watermarkDataUri: ADTC_TOCHA_WATERMARK_DATA_URI,
          churchIdentity,
        })
      } else if (selectedDocType === 'mudanca') {
        const corpoHtml = renderTextoCartaMudancaString()
        htmlCompleto = buildCartaMudancaHtml({
          corpoHtml,
          dataExpedicaoExtenso: formatarDataExtensoBr(mudDataExpedicao),
          nomePastor: (mudPastorAssinatura || nomePastor || 'Pastor Presidente').trim(),
          cargoPastor: (mudCargoPastor || cargoPastor || 'Pastor').trim(),
          nome1Sec: (mud1SecAssinatura || nome1Secretario || '1º Secretário').trim(),
          cargo1Sec: (mudCargo1Sec || cargo1Secretario || '1ºSecretário').trim(),
          nome2Sec: (mud2SecAssinatura || nome2Secretario || '2º Secretário').trim(),
          cargo2Sec: (mudCargo2Sec || cargo2Secretario || '2ºSecretário').trim(),
          logoDataUri,
          watermarkDataUri: ADTC_TOCHA_WATERMARK_DATA_URI,
          churchIdentity,
        })
      } else if (selectedDocType === 'carteira' && selectedCarteiraMembro) {
        let fotoDataUri: string | null = null
        if (selectedCarteiraMembro.foto) {
          const originalFotoUrl = pb.files.getURL(
            selectedCarteiraMembro,
            selectedCarteiraMembro.foto,
          )
          fotoDataUri = await convertImageUrlToDataUri(originalFotoUrl)
        }
        const { pai, mae } = extrairPaiMae(selectedCarteiraMembro.filiacao)
        const nascimento = selectedCarteiraMembro.data_nascimento
          ? formatarDataBr(selectedCarteiraMembro.data_nascimento)
          : selectedCarteiraMembro.data_nascimento_texto || '—'
        const batismo = selectedCarteiraMembro.data_batismo
          ? formatarDataBr(selectedCarteiraMembro.data_batismo)
          : selectedCarteiraMembro.data_batismo_texto || '—'

        htmlCompleto = buildCartaoMembroHtml({
          nome: selectedCarteiraMembro.nome || '—',
          pai,
          mae,
          emissao: carteiraEmissao,
          funcao: carteiraCargo || 'Membro em Comunhão',
          registro:
            selectedCarteiraMembro.numero_registro || selectedCarteiraMembro.numero_ficha || '001',
          nascimento,
          nacionalidade: 'Brasileira',
          naturalidade: selectedCarteiraMembro.naturalidade || '—',
          estadoCivil: selectedCarteiraMembro.estado_civil || '—',
          batismo,
          cpf: selectedCarteiraMembro.cpf || '—',
          fotoDataUri,
          logoDataUri,
          pastorPresidente: (carteiraPastor || nomePastor || 'Pastor Presidente').trim(),
          churchIdentity,
        })
      } else if (selectedDocType === 'apresentacao') {
        htmlCompleto = buildCertificadoApresentacaoHtml({
          nomeCrianca: aprNomeCrianca || 'Nome da Criança',
          dataNascimentoExtenso: aprDataNascimento
            ? formatarDataBr(aprDataNascimento)
            : 'Data não informada',
          nomePai: aprNomePai || '',
          nomeMae: aprNomeMae || '',
          dataApresentacaoExtenso: aprDataApresentacao
            ? formatarDataBr(aprDataApresentacao)
            : formatarDataBr(new Date().toISOString().slice(0, 10)),
          pastorOficiante: (aprPastorOficiante || nomePastor || 'Pastor Oficiante').trim(),
          logoDataUri,
          watermarkDataUri: ADTC_TOCHA_WATERMARK_DATA_URI,
          churchIdentity,
        })
      }
      const printWindow = window.open('', '_blank', 'width=1050,height=850')
      if (!printWindow) {
        toast({
          variant: 'destructive',
          title: 'Bloqueio de pop-up',
          description: 'Permita pop-ups no seu navegador para imprimir ou salvar o PDF.',
        })
        return
      }

      printWindow.document.write(htmlCompleto)
      printWindow.document.close()
    } catch (err) {
      console.error('Erro ao gerar documento para impressão:', err)
      toast({
        variant: 'destructive',
        title: 'Erro na geração',
        description: 'Não foi possível gerar a página de impressão.',
      })
    }
  }

  // Filtragem de cartas recebidas
  const cartasFiltradas = cartasRecebidas.filter((carta) => {
    const matchesSearch =
      carta.nome.toLowerCase().includes(searchCarta.toLowerCase()) ||
      carta.igreja_origem.toLowerCase().includes(searchCarta.toLowerCase()) ||
      (carta.funcao_obreiro &&
        carta.funcao_obreiro.toLowerCase().includes(searchCarta.toLowerCase()))

    if (!matchesSearch) return false
    if (arquivoTipoFiltro === 'Obreiro') return carta.tipo_pessoa === 'Obreiro'
    if (arquivoTipoFiltro === 'Membro') return carta.tipo_pessoa === 'Membro'
    return true
  })

  const contagemObreiros = cartasRecebidas.filter((c) => c.tipo_pessoa === 'Obreiro').length
  const contagemMembros = cartasRecebidas.filter((c) => c.tipo_pessoa === 'Membro').length

  const denomDisplay = config.denominacao?.trim() || 'A Igreja Evangélica'
  const cidadeDisplay = config.cidadeUf?.trim() || 'esta localidade'

  // Texto gerado da Carta de Recomendação como HTML puro para o template de impressão
  const renderTextoCartaRecomendacaoString = () => {
    if (textoEditadoRec && textoEditadoRec.trim()) {
      return textoEditadoRec
    }
    if (recIsCasal) {
      const prefixoEsposo = recFuncao.trim() ? recFuncao.trim() : 'o irmão'
      const prefixoFormatado = prefixoEsposo.startsWith('o ') ? prefixoEsposo : prefixoEsposo
      const conversaoPart = recDataConversao ? `, convertido em ${recDataConversao}` : ''
      const conjugeBatismoPart = recConjugeDataBatismo
        ? `, batizada nas águas em ${recConjugeDataBatismo}`
        : ''
      return `${denomDisplay}, em ${cidadeDisplay}, apresenta a Igreja Evangélica coirmã, a qual visita ${prefixoFormatado}, <strong>${recNome || 'Nome do Irmão'}</strong> e sua esposa. Ele, nascido no dia ${recDataNascimento || '—'}, em ${recNaturalidade || '—'}, filho de ${recPai || '—'} e ${recMae || '—'}, ${recNacionalidade || 'brasileiro'}${conversaoPart}, batizado nas águas em ${recDataBatismo || '—'}, esposa, <strong>${recConjugeNome || 'Nome da Esposa'}</strong>, nascida no dia ${recConjugeDataNascimento || '—'} em ${recConjugeNaturalidade || '—'}, filha de ${recConjugePai || '—'} e ${recConjugeMae || '—'}${conjugeBatismoPart}, os quais se encontram em perfeita comunhão com esta Igreja da qual são membros. &ldquo;Nós recomendamo-vos para que a recebais no Senhor, como usam fazer aos santos&rdquo;. Romanos 16.2`
    }

    const prefixo = recFuncao.trim() ? recFuncao.trim() : 'o irmão'
    const prefixoFormatado = prefixo.startsWith('o ') ? prefixo : prefixo
    const conversaoPart = recDataConversao ? `, convertido em ${recDataConversao}` : ''
    return `${denomDisplay}, em ${cidadeDisplay}, apresenta a Igreja Evangélica coirmã, a qual visita ${prefixoFormatado}, <strong>${recNome || 'Nome do Irmão'}</strong>, ${recEstadoCivil || 'Solteiro(a)'}, nascido no dia ${recDataNascimento || '—'}, em ${recNaturalidade || '—'}, filho de ${recPai || '—'} e ${recMae || '—'}, ${recNacionalidade || 'brasileiro'}${conversaoPart}, batizado nas águas em ${recDataBatismo || '—'}, o qual se encontra em perfeita comunhão com esta Igreja da qual é membro. &ldquo;Nós recomendamo-vos para que a recebais no Senhor, como usam fazer aos santos&rdquo;. Romanos 16.2`
  }

  // Texto gerado da Carta de Recomendação para o preview em tela (React Node)
  const renderTextoCartaRecomendacao = () => {
    if (textoEditadoRec && textoEditadoRec.trim()) {
      return <span dangerouslySetInnerHTML={{ __html: textoEditadoRec }} />
    }
    if (recIsCasal) {
      // Variante Casal
      const prefixoEsposo = recFuncao.trim() ? recFuncao.trim() : 'o irmão'
      return (
        <>
          {denomDisplay}, em {cidadeDisplay}, apresenta a Igreja Evangélica coirmã, a qual visita{' '}
          {prefixoEsposo.startsWith('o ') ? prefixoEsposo : `${prefixoEsposo}`},{' '}
          <strong>{recNome || 'Nome do Irmão'}</strong> e sua esposa. Ele, nascido no dia{' '}
          {recDataNascimento || '—'}, em {recNaturalidade || '—'}, filho de {recPai || '—'} e{' '}
          {recMae || '—'}, {recNacionalidade || 'brasileiro'}
          {recDataConversao ? `, convertido em ${recDataConversao}` : ''}, batizado nas águas em{' '}
          {recDataBatismo || '—'}, esposa, <strong>{recConjugeNome || 'Nome da Esposa'}</strong>,
          nascida no dia {recConjugeDataNascimento || '—'} em {recConjugeNaturalidade || '—'}, filha
          de {recConjugePai || '—'} e {recConjugeMae || '—'}
          {recConjugeDataBatismo ? `, batizada nas águas em ${recConjugeDataBatismo}` : ''}, os
          quais se encontram em perfeita comunhão com esta Igreja da qual são membros. &ldquo;Nós
          recomendamo-vos para que a recebais no Senhor, como usam fazer aos santos&rdquo;. Romanos
          16.2
        </>
      )
    }

    // Variante Individual
    const prefixo = recFuncao.trim() ? recFuncao.trim() : 'o irmão'
    return (
      <>
        {denomDisplay}, em {cidadeDisplay}, apresenta a Igreja Evangélica coirmã, a qual visita{' '}
        {prefixo.startsWith('o ') ? prefixo : `${prefixo}`},{' '}
        <strong>{recNome || 'Nome do Irmão'}</strong>, {recEstadoCivil || 'Solteiro(a)'}, nascido no
        dia {recDataNascimento || '—'}, em {recNaturalidade || '—'}, filho de {recPai || '—'} e{' '}
        {recMae || '—'}, {recNacionalidade || 'brasileiro'}
        {recDataConversao ? `, convertido em ${recDataConversao}` : ''}, batizado nas águas em{' '}
        {recDataBatismo || '—'}, o qual se encontra em perfeita comunhão com esta Igreja da qual é
        membro. &ldquo;Nós recomendamo-vos para que a recebais no Senhor, como usam fazer aos
        santos&rdquo;. Romanos 16.2
      </>
    )
  }

  // Texto gerado da Carta de Mudança como HTML puro para o template de impressão
  const renderTextoCartaMudancaString = () => {
    if (textoEditadoMud && textoEditadoMud.trim()) {
      return textoEditadoMud
    }
    const parteFuncao = mudFuncao.trim() ? `, ${mudFuncao.trim()}` : ''
    return `${denomDisplay} em ${cidadeDisplay}, apresenta a Igreja Evangélica, onde for congregar o irmão <strong>${mudNome || 'Nome do Membro'}</strong>${parteFuncao}, nascido no dia ${mudDataNascimento || '—'} em ${mudNaturalidade || '—'}, filho de ${mudPai || '—'} e ${mudMae || '—'}, ${mudNacionalidade || 'brasileiro'}, batizado nas águas em ${mudDataBatismo || '—'}, cujo registro de membro tem o Nº <strong>${mudNumeroRegistro || 'S/N'}</strong>, o qual se encontra em perfeita comunhão com esta Igreja, da qual foi membro. &ldquo;Nós recomendamo-vos para que a recebais no Senhor, como usam fazer aos santos&rdquo;. Romanos 16.2`
  }

  // Texto gerado da Carta de Mudança para o preview em tela (React Node)
  const renderTextoCartaMudanca = () => {
    if (textoEditadoMud && textoEditadoMud.trim()) {
      return <span dangerouslySetInnerHTML={{ __html: textoEditadoMud }} />
    }
    const parteFuncao = mudFuncao.trim() ? `, ${mudFuncao.trim()}` : ''
    return (
      <>
        {denomDisplay} em {cidadeDisplay}, apresenta a Igreja Evangélica, onde for congregar o irmão{' '}
        <strong>{mudNome || 'Nome do Membro'}</strong>
        {parteFuncao}, nascido no dia {mudDataNascimento || '—'} em {mudNaturalidade || '—'}, filho
        de {mudPai || '—'} e {mudMae || '—'}, {mudNacionalidade || 'brasileiro'}, batizado nas águas
        em {mudDataBatismo || '—'}, cujo registro de membro tem o Nº{' '}
        <strong>{mudNumeroRegistro || 'S/N'}</strong>, o qual se encontra em perfeita comunhão com
        esta Igreja, da qual foi membro. &ldquo;Nós recomendamo-vos para que a recebais no Senhor,
        como usam fazer aos santos&rdquo;. Romanos 16.2
      </>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header com Identidade e Nova Logo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E6E2D8] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full p-0.5 bg-[#072348] border-2 border-[#C9A227] shadow-sm flex-shrink-0 flex items-center justify-center">
            <img
              src={config.logoUrl || ADTC_LOGO_URL}
              alt={config.nomeIgreja || 'Logo Oficial'}
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                ;(e.target as HTMLImageElement).src = ADTC_LOGO_URL
              }}
            />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
              Documentos Oficiais — {config.siglaIgreja || config.nomeIgreja || 'Igreja'}
              <ShieldCheck className="w-5 h-5 text-[#C9A227]" />
            </h2>
            <p className="text-xs sm:text-sm text-[#5A5A5A]">
              Emissão timbrada oficial (Recomendação, Mudança, Cartão e Certificados) & arquivo de
              cartas recebidas.
            </p>
          </div>
        </div>

        {/* Botão para Configurar Assinaturas / Liderança + Abas Superiores */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsConfigLiderancaModalOpen(true)}
            variant="outline"
            size="sm"
            className="border-[#C9A227] text-[#1E3A5F] hover:bg-[#C9A227]/15 text-xs font-bold flex items-center gap-1.5"
          >
            <PenTool className="w-3.5 h-3.5 text-[#C9A227]" />
            Editar Assinaturas (Pastor & Secretários)
          </Button>

          <div className="flex items-center gap-1 bg-[#1E3A5F]/10 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('gerador')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'gerador'
                  ? 'bg-[#1E3A5F] text-white shadow-sm'
                  : 'text-[#1E3A5F] hover:bg-white/60'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              Emissão
            </button>
            <button
              onClick={() => setActiveTab('arquivo')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'arquivo'
                  ? 'bg-[#1E3A5F] text-white shadow-sm'
                  : 'text-[#1E3A5F] hover:bg-white/60'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              Cartas Recebidas ({cartasRecebidas.length})
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: GERADOR DE DOCUMENTOS (RECOMENDAÇÃO, MUDANÇA, CARTEIRA, APRESENTAÇÃO) */}
      {/* ======================================================== */}
      {activeTab === 'gerador' && (
        <div className="space-y-6">
          {/* Seletor de Tipo de Documento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Carta de Recomendação */}
            <button
              onClick={() => setSelectedDocType('recomendacao')}
              className={`p-5 rounded-2xl border text-left transition-all ${
                selectedDocType === 'recomendacao'
                  ? 'border-2 border-[#C9A227] bg-white shadow-md ring-2 ring-[#C9A227]/20'
                  : 'border-[#E6E2D8] bg-white/70 hover:bg-white shadow-2xs'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <Send className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#1E3A5F]">
                Carta de Recomendação
              </h3>
              <p className="text-xs text-[#5A5A5A] mt-1">
                Novo modelo solene Rm 16.2. Pastor + 1º e 2º Secretários. Suporta membro ou casal.
              </p>
            </button>

            {/* 2. Carta de Mudança (Saída) */}
            <button
              onClick={() => setSelectedDocType('mudanca')}
              className={`p-5 rounded-2xl border text-left transition-all ${
                selectedDocType === 'mudanca'
                  ? 'border-2 border-[#C9A227] bg-white shadow-md ring-2 ring-[#C9A227]/20'
                  : 'border-[#E6E2D8] bg-white/70 hover:bg-white shadow-2xs'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                <MoveRight className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#1E3A5F]">
                Carta de Mudança (Saída)
              </h3>
              <p className="text-xs text-[#5A5A5A] mt-1">
                Novo modelo oficial com nº da ficha de registro e assinatura exclusiva do Pastor.
              </p>
            </button>

            {/* 3. Carteira de Membro */}
            <button
              onClick={() => setSelectedDocType('carteira')}
              className={`p-5 rounded-2xl border text-left transition-all ${
                selectedDocType === 'carteira'
                  ? 'border-2 border-[#C9A227] bg-white shadow-md ring-2 ring-[#C9A227]/20'
                  : 'border-[#E6E2D8] bg-white/70 hover:bg-white shadow-2xs'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3A5F] flex items-center justify-center mb-3">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#1E3A5F]">
                Cartão de Membro
              </h3>
              <p className="text-xs text-[#5A5A5A] mt-1">
                Modelo fiel azul frente e verso, versículo Cl. 2.6, foto e dados da ficha.
              </p>
            </button>

            {/* 4. Apresentação de Criança */}
            <button
              onClick={() => setSelectedDocType('apresentacao')}
              className={`p-5 rounded-2xl border text-left transition-all ${
                selectedDocType === 'apresentacao'
                  ? 'border-2 border-[#C9A227] bg-white shadow-md ring-2 ring-[#C9A227]/20'
                  : 'border-[#E6E2D8] bg-white/70 hover:bg-white shadow-2xs'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                <Baby className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#1E3A5F]">
                Apresentação de Criança
              </h3>
              <p className="text-xs text-[#5A5A5A] mt-1">
                Certificado solene timbrado oficial com nomes dos pais e pastor oficiante.
              </p>
            </button>
          </div>

          {/* Banner Informativo sobre Autopreenchimento e Edição */}
          <div className="p-3.5 bg-amber-50 border border-[#C9A227]/50 rounded-xl text-xs text-[#1E3A5F] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">ℹ️</span>
              <span>
                <strong>Preenchimento inteligente:</strong> Os dados do membro são carregados
                automaticamente da ficha. Havendo dados faltantes ou necessidade de ajuste, todos os
                campos permanecem totalmente editáveis antes de gerar o PDF.
              </span>
            </div>
            <Button
              onClick={() => setIsConfigLiderancaModalOpen(true)}
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-[#C9A227] hover:bg-amber-100/60 h-7"
            >
              Assinantes atuais: {nomePastor} • {nome1Secretario} • {nome2Secretario}
            </Button>
          </div>

          {/* Formulário do Documento Selecionado */}
          <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl">
            <CardHeader className="border-b border-[#E6E2D8] pb-4">
              <CardTitle className="font-serif text-lg font-bold text-[#1E3A5F]">
                {selectedDocType === 'recomendacao' &&
                  'Emissão: Carta de Recomendação Eclesiástica'}
                {selectedDocType === 'mudanca' && 'Emissão: Carta de Mudança (Saída de Membro)'}
                {selectedDocType === 'carteira' && 'Emissão: Cartão de Membro Oficial'}
                {selectedDocType === 'apresentacao' &&
                  'Emissão: Certidão de Apresentação de Criança'}
              </CardTitle>
              <CardDescription className="text-xs text-[#5A5A5A]">
                Confira os campos abaixo ou edite-os livremente. O texto do documento será
                atualizado em tempo real.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* ========================================================= */}
              {/* FORMULÁRIO: CARTA DE RECOMENDAÇÃO (NOVO MODELO) */}
              {/* ========================================================= */}
              {selectedDocType === 'recomendacao' && (
                <div className="space-y-5">
                  {/* Seleção do Membro */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8]">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-[#1E3A5F] flex items-center justify-between">
                        <span>Buscar Membro Cadastrado no Banco</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          (Preenche os dados automaticamente)
                        </span>
                      </label>
                      <select
                        value={recMembroId}
                        onChange={(e) => {
                          const m = membros.find((item) => item.id === e.target.value)
                          if (m) preencherDadosRecomendacao(m)
                        }}
                        className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm focus:ring-2 focus:ring-[#C9A227]"
                      >
                        {membros.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome} ({m.congregacao || 'Sede'}) — Ficha:{' '}
                            {m.numero_ficha || m.numero_registro || 'S/N'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#1E3A5F]">
                        Modalidade da Carta
                      </label>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setRecIsCasal(false)}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition border ${
                            !recIsCasal
                              ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Individual
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecIsCasal(true)}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition border ${
                            recIsCasal
                              ? 'bg-[#C9A227] text-[#1E3A5F] border-[#C9A227]'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Casal (com Esposa)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dados do Irmão / Obreiro Titular */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F] flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#C9A227]" />
                      Dados Pessoais do Irmão / Obreiro
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Nome Completo *
                        </label>
                        <Input
                          value={recNome}
                          onChange={(e) => setRecNome(e.target.value)}
                          placeholder="Ex: Nadilkson Fagney da Rocha Monteiro"
                          className="text-xs sm:text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Função Ministerial (se houver)
                        </label>
                        <Input
                          value={recFuncao}
                          onChange={(e) => setRecFuncao(e.target.value)}
                          placeholder="Ex: auxiliar, diácono, o irmão..."
                          className="text-xs sm:text-sm"
                        />
                        <span className="text-[10px] text-slate-400 block">
                          Se vazio, usa "o irmão"
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">Estado Civil</label>
                        <Input
                          value={recEstadoCivil}
                          onChange={(e) => setRecEstadoCivil(e.target.value)}
                          placeholder="Ex: Casado, Solteiro"
                          className="text-xs sm:text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Data de Nascimento
                        </label>
                        <Input
                          value={recDataNascimento}
                          onChange={(e) => setRecDataNascimento(e.target.value)}
                          placeholder="DD/MM/AAAA"
                          className="text-xs sm:text-sm"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-[#1A1A1A]">Naturalidade</label>
                        <Input
                          value={recNaturalidade}
                          onChange={(e) => setRecNaturalidade(e.target.value)}
                          placeholder="Ex: STA Isabel-Pará, Uruoca - CE"
                          className="text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">Nome do Pai</label>
                        <Input
                          value={recPai}
                          onChange={(e) => setRecPai(e.target.value)}
                          placeholder="Ex: Nadir Ferreira Monteiro"
                          className="text-xs sm:text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">Nome da Mãe</label>
                        <Input
                          value={recMae}
                          onChange={(e) => setRecMae(e.target.value)}
                          placeholder="Ex: Maria de Fatima da Rocha Monteiro"
                          className="text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Nacionalidade
                        </label>
                        <Input
                          value={recNacionalidade}
                          onChange={(e) => setRecNacionalidade(e.target.value)}
                          placeholder="Ex: brasileiro"
                          className="text-xs sm:text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Data de Conversão (opcional)
                        </label>
                        <Input
                          value={recDataConversao}
                          onChange={(e) => setRecDataConversao(e.target.value)}
                          placeholder="Ex: 12/05/2010 ou DD/MM/AAAA"
                          className="text-xs sm:text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Data do Batismo nas Águas *
                        </label>
                        <Input
                          value={recDataBatismo}
                          onChange={(e) => setRecDataBatismo(e.target.value)}
                          placeholder="Ex: 21/04/2002"
                          className="text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção Cônjuge (quando recIsCasal for verdadeiro) */}
                  {recIsCasal && (
                    <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F] flex items-center gap-1.5">
                          <UserPlus className="w-4 h-4 text-[#C9A227]" />
                          Dados da Esposa / Cônjuge
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-600">Buscar do banco:</span>
                          <select
                            value={recConjugeMembroId}
                            onChange={(e) => {
                              const c = membros.find((item) => item.id === e.target.value)
                              if (c) preencherDadosConjuge(c)
                            }}
                            className="h-8 px-2 rounded-md border border-amber-300 bg-white text-xs"
                          >
                            <option value="">Selecione para autopreencher...</option>
                            {membros.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-xs font-semibold text-[#1A1A1A]">
                            Nome Completo da Esposa *
                          </label>
                          <Input
                            value={recConjugeNome}
                            onChange={(e) => setRecConjugeNome(e.target.value)}
                            placeholder="Ex: Maiara Rodrigues de Vasconcelos"
                            className="text-xs sm:text-sm bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[#1A1A1A]">
                            Data de Nascimento
                          </label>
                          <Input
                            value={recConjugeDataNascimento}
                            onChange={(e) => setRecConjugeDataNascimento(e.target.value)}
                            placeholder="Ex: 12/10/2009"
                            className="text-xs sm:text-sm bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[#1A1A1A]">
                            Naturalidade da Esposa
                          </label>
                          <Input
                            value={recConjugeNaturalidade}
                            onChange={(e) => setRecConjugeNaturalidade(e.target.value)}
                            placeholder="Ex: sobral Ceará"
                            className="text-xs sm:text-sm bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[#1A1A1A]">
                            Nome do Pai da Esposa
                          </label>
                          <Input
                            value={recConjugePai}
                            onChange={(e) => setRecConjugePai(e.target.value)}
                            placeholder="Ex: Evandro Rodrigues de Souza"
                            className="text-xs sm:text-sm bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[#1A1A1A]">
                            Nome da Mãe da Esposa
                          </label>
                          <Input
                            value={recConjugeMae}
                            onChange={(e) => setRecConjugeMae(e.target.value)}
                            placeholder="Ex: Maria José Martins de Vasconcelos Souza"
                            className="text-xs sm:text-sm bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[#1A1A1A]">
                            Data Batismo da Esposa (opcional)
                          </label>
                          <Input
                            value={recConjugeDataBatismo}
                            onChange={(e) => setRecConjugeDataBatismo(e.target.value)}
                            placeholder="Ex: 09/12/2023"
                            className="text-xs sm:text-sm bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Editor opcional de texto do corpo da carta */}
                  <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#C9A227]" />
                        <span className="text-xs font-bold text-[#1E3A5F]">
                          Texto do Corpo da Carta de Recomendação
                        </span>
                        {textoEditadoRec !== null && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-100 text-amber-800 border-amber-300"
                          >
                            Personalizado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditingTextoRec ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setIsEditingTextoRec(false)}
                            className="h-7 text-xs bg-[#1E3A5F] text-white hover:bg-[#16304F]"
                          >
                            Concluir edição
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (textoEditadoRec === null) {
                                setTextoEditadoRec(renderTextoCartaRecomendacaoString())
                              }
                              setIsEditingTextoRec(true)
                            }}
                            className="h-7 text-xs border-[#C9A227] text-[#1E3A5F] hover:bg-[#C9A227]/15"
                          >
                            <PenTool className="w-3 h-3 mr-1 text-[#C9A227]" />
                            Editar texto
                          </Button>
                        )}
                        {textoEditadoRec !== null && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTextoEditadoRec(null)
                              setIsEditingTextoRec(false)
                            }}
                            className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            Restaurar automático
                          </Button>
                        )}
                      </div>
                    </div>

                    {isEditingTextoRec ? (
                      <div className="space-y-1.5">
                        <Textarea
                          value={textoEditadoRec ?? renderTextoCartaRecomendacaoString()}
                          onChange={(e) => setTextoEditadoRec(e.target.value)}
                          rows={6}
                          className="text-xs sm:text-sm font-serif bg-white"
                          placeholder="Digite ou ajuste o texto da carta..."
                        />
                        <p className="text-[11px] text-slate-500">
                          Suporta tags HTML como &lt;strong&gt; para negrito. As alterações refletem
                          no preview e no PDF.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded border border-slate-200 line-clamp-2">
                        {textoEditadoRec ||
                          'Texto composto automaticamente a partir dos dados acima.'}
                      </p>
                    )}
                  </div>

                  {/* Expedição e Assinaturas (Pastor + 1º e 2º Secretários) */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F] flex items-center justify-between">
                      <span>Expedição e Assinaturas Oficiais da Recomendação</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Validade de 30 dias após expedição
                      </span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Data de Expedição
                        </label>
                        <Input
                          type="date"
                          value={recDataExpedicao}
                          onChange={(e) => setRecDataExpedicao(e.target.value)}
                          className="text-xs sm:text-sm bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Data por Extenso Gerada
                        </label>
                        <Input
                          value={formatarDataExtensoBr(recDataExpedicao)}
                          readOnly
                          className="text-xs sm:text-sm bg-slate-100 font-serif"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Pastor (Assinatura 1)
                        </label>
                        <Input
                          value={recPastorAssinatura}
                          onChange={(e) => setRecPastorAssinatura(e.target.value)}
                          placeholder="Nome do Pastor"
                          className="text-xs sm:text-sm bg-white"
                        />
                        <Input
                          value={recCargoPastor}
                          onChange={(e) => setRecCargoPastor(e.target.value)}
                          placeholder="Cargo (ex: Pastor)"
                          className="text-xs sm:text-sm bg-white mt-1"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          1º Secretário (Assinatura 2)
                        </label>
                        <Input
                          value={rec1SecAssinatura}
                          onChange={(e) => setRec1SecAssinatura(e.target.value)}
                          placeholder="Nome do 1º Secretário"
                          className="text-xs sm:text-sm bg-white"
                        />
                        <Input
                          value={recCargo1Sec}
                          onChange={(e) => setRecCargo1Sec(e.target.value)}
                          placeholder="Cargo (ex: 1ºSecretário)"
                          className="text-xs sm:text-sm bg-white mt-1"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          2º Secretário (Assinatura 3)
                        </label>
                        <Input
                          value={rec2SecAssinatura}
                          onChange={(e) => setRec2SecAssinatura(e.target.value)}
                          placeholder="Nome do 2º Secretário"
                          className="text-xs sm:text-sm bg-white"
                        />
                        <Input
                          value={recCargo2Sec}
                          onChange={(e) => setRecCargo2Sec(e.target.value)}
                          placeholder="Cargo (ex: 2ºSecretário)"
                          className="text-xs sm:text-sm bg-white mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* FORMULÁRIO: CARTA DE MUDANÇA (NOVO MODELO) */}
              {/* ========================================================= */}
              {selectedDocType === 'mudanca' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8]">
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-xs font-bold text-[#1E3A5F] flex items-center justify-between">
                        <span>Selecione o Membro para Mudança / Saída</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          (Preenche os dados da ficha e nº de registro)
                        </span>
                      </label>
                      <select
                        value={mudMembroId}
                        onChange={(e) => {
                          const m = membros.find((item) => item.id === e.target.value)
                          if (m) preencherDadosMudanca(m)
                        }}
                        className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm focus:ring-2 focus:ring-[#C9A227]"
                      >
                        {membros.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome} ({m.congregacao || 'Sede'}) — Nº Ficha:{' '}
                            {m.numero_ficha || m.numero_registro || 'S/N'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F] flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#C9A227]" />
                      Dados Pessoais e Eclesiásticos do Membro
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Nome Completo *
                        </label>
                        <Input
                          value={mudNome}
                          onChange={(e) => setMudNome(e.target.value)}
                          placeholder="Ex: José da Silva Fontenele"
                          className="text-xs sm:text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Função / Cargo (se houver)
                        </label>
                        <Input
                          value={mudFuncao}
                          onChange={(e) => setMudFuncao(e.target.value)}
                          placeholder="Ex: diácono, presbítero, etc."
                          className="text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Nº do Registro / Ficha de Membro *
                        </label>
                        <Input
                          value={mudNumeroRegistro}
                          onChange={(e) => setMudNumeroRegistro(e.target.value)}
                          placeholder="Ex: 81 ou ADTC-042"
                          className="text-xs sm:text-sm font-mono font-bold text-[#1E3A5F]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Data de Nascimento
                        </label>
                        <Input
                          value={mudDataNascimento}
                          onChange={(e) => setMudDataNascimento(e.target.value)}
                          placeholder="DD/MM/AAAA"
                          className="text-xs sm:text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">Naturalidade</label>
                        <Input
                          value={mudNaturalidade}
                          onChange={(e) => setMudNaturalidade(e.target.value)}
                          placeholder="Ex: Cidade - UF"
                          className="text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">Nome do Pai</label>
                        <Input
                          value={mudPai}
                          onChange={(e) => setMudPai(e.target.value)}
                          placeholder="Nome do Pai"
                          className="text-xs sm:text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">Nome da Mãe</label>
                        <Input
                          value={mudMae}
                          onChange={(e) => setMudMae(e.target.value)}
                          placeholder="Nome da Mãe"
                          className="text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Nacionalidade
                        </label>
                        <Input
                          value={mudNacionalidade}
                          onChange={(e) => setMudNacionalidade(e.target.value)}
                          placeholder="Ex: brasileiro"
                          className="text-xs sm:text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Data do Batismo nas Águas *
                        </label>
                        <Input
                          value={mudDataBatismo}
                          onChange={(e) => setMudDataBatismo(e.target.value)}
                          placeholder="Ex: 03/08/2018 ou DD/MM/AAAA"
                          className="text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Editor opcional de texto do corpo da carta de mudança */}
                  <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#C9A227]" />
                        <span className="text-xs font-bold text-[#1E3A5F]">
                          Texto do Corpo da Carta de Mudança
                        </span>
                        {textoEditadoMud !== null && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-100 text-amber-800 border-amber-300"
                          >
                            Personalizado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditingTextoMud ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setIsEditingTextoMud(false)}
                            className="h-7 text-xs bg-[#1E3A5F] text-white hover:bg-[#16304F]"
                          >
                            Concluir edição
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (textoEditadoMud === null) {
                                setTextoEditadoMud(renderTextoCartaMudancaString())
                              }
                              setIsEditingTextoMud(true)
                            }}
                            className="h-7 text-xs border-[#C9A227] text-[#1E3A5F] hover:bg-[#C9A227]/15"
                          >
                            <PenTool className="w-3 h-3 mr-1 text-[#C9A227]" />
                            Editar texto
                          </Button>
                        )}
                        {textoEditadoMud !== null && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTextoEditadoMud(null)
                              setIsEditingTextoMud(false)
                            }}
                            className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            Restaurar automático
                          </Button>
                        )}
                      </div>
                    </div>

                    {isEditingTextoMud ? (
                      <div className="space-y-1.5">
                        <Textarea
                          value={textoEditadoMud ?? renderTextoCartaMudancaString()}
                          onChange={(e) => setTextoEditadoMud(e.target.value)}
                          rows={6}
                          className="text-xs sm:text-sm font-serif bg-white"
                          placeholder="Digite ou ajuste o texto da carta de mudança..."
                        />
                        <p className="text-[11px] text-slate-500">
                          Suporta tags HTML como &lt;strong&gt; para negrito. As alterações refletem
                          no preview e no PDF.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded border border-slate-200 line-clamp-2">
                        {textoEditadoMud ||
                          'Texto composto automaticamente a partir dos dados do membro selecionado.'}
                      </p>
                    )}
                  </div>

                  {/* Expedição e Assinaturas da Carta de Mudança (Pastor + 1º e 2º Secretários) */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F]">
                        Expedição e Assinaturas Oficiais da Mudança
                      </h4>
                      <Button
                        type="button"
                        onClick={async () => {
                          try {
                            await Promise.all([
                              saveConfigChave('lideranca_nome_pastor', mudPastorAssinatura.trim()),
                              saveConfigChave('lideranca_cargo_pastor', mudCargoPastor.trim()),
                              saveConfigChave(
                                'lideranca_nome_1_secretario',
                                mud1SecAssinatura.trim(),
                              ),
                              saveConfigChave('lideranca_cargo_1_secretario', mudCargo1Sec.trim()),
                              saveConfigChave(
                                'lideranca_nome_2_secretario',
                                mud2SecAssinatura.trim(),
                              ),
                              saveConfigChave('lideranca_cargo_2_secretario', mudCargo2Sec.trim()),
                            ])
                            setNomePastor(mudPastorAssinatura.trim())
                            setCargoPastor(mudCargoPastor.trim())
                            setNome1Secretario(mud1SecAssinatura.trim())
                            setCargo1Secretario(mudCargo1Sec.trim())
                            setNome2Secretario(mud2SecAssinatura.trim())
                            setCargo2Secretario(mudCargo2Sec.trim())
                            setRecPastorAssinatura(mudPastorAssinatura.trim())
                            setRecCargoPastor(mudCargoPastor.trim())
                            setRec1SecAssinatura(mud1SecAssinatura.trim())
                            setRecCargo1Sec(mudCargo1Sec.trim())
                            setRec2SecAssinatura(mud2SecAssinatura.trim())
                            setRecCargo2Sec(mudCargo2Sec.trim())
                            toast({
                              title: 'Assinaturas salvas no banco!',
                              description:
                                'Os nomes e cargos foram gravados na coleção configuracoes e serão usados em todas as cartas.',
                            })
                          } catch (err: unknown) {
                            const msg = err instanceof Error ? err.message : 'Erro ao salvar'
                            toast({
                              variant: 'destructive',
                              title: 'Falha ao salvar',
                              description: msg,
                            })
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-[#C9A227] text-[#1E3A5F] hover:bg-[#C9A227]/15 font-semibold self-start sm:self-auto"
                      >
                        <Save className="w-3.5 h-3.5 mr-1 text-[#C9A227]" />
                        Salvar Assinaturas no Banco
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Data de Expedição
                        </label>
                        <Input
                          type="date"
                          value={mudDataExpedicao}
                          onChange={(e) => setMudDataExpedicao(e.target.value)}
                          className="text-xs sm:text-sm bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Data por Extenso Gerada
                        </label>
                        <Input
                          value={formatarDataExtensoBr(mudDataExpedicao)}
                          readOnly
                          className="text-xs sm:text-sm bg-slate-100 font-serif"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          Pastor (Assinatura 1)
                        </label>
                        <Input
                          value={mudPastorAssinatura}
                          onChange={(e) => setMudPastorAssinatura(e.target.value)}
                          placeholder="Nome do Pastor"
                          className="text-xs sm:text-sm bg-white"
                        />
                        <Input
                          value={mudCargoPastor}
                          onChange={(e) => setMudCargoPastor(e.target.value)}
                          placeholder="Cargo (ex: Pastor)"
                          className="text-xs sm:text-sm bg-white mt-1"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          1º Secretário (Assinatura 2)
                        </label>
                        <Input
                          value={mud1SecAssinatura}
                          onChange={(e) => setMud1SecAssinatura(e.target.value)}
                          placeholder="Nome do 1º Secretário"
                          className="text-xs sm:text-sm bg-white"
                        />
                        <Input
                          value={mudCargo1Sec}
                          onChange={(e) => setMudCargo1Sec(e.target.value)}
                          placeholder="Cargo (ex: 1ºSecretário)"
                          className="text-xs sm:text-sm bg-white mt-1"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1A1A1A]">
                          2º Secretário (Assinatura 3)
                        </label>
                        <Input
                          value={mud2SecAssinatura}
                          onChange={(e) => setMud2SecAssinatura(e.target.value)}
                          placeholder="Nome do 2º Secretário"
                          className="text-xs sm:text-sm bg-white"
                        />
                        <Input
                          value={mudCargo2Sec}
                          onChange={(e) => setMudCargo2Sec(e.target.value)}
                          placeholder="Cargo (ex: 2ºSecretário)"
                          className="text-xs sm:text-sm bg-white mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* FORMULÁRIO 3: CARTEIRA DE MEMBRO */}
              {/* ========================================================= */}
              {selectedDocType === 'carteira' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1 sm:col-span-2 md:col-span-1">
                      <label className="text-xs font-semibold text-[#1A1A1A]">
                        Selecione o Membro
                      </label>
                      <select
                        value={carteiraMembroId}
                        onChange={(e) => setCarteiraMembroId(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm focus:ring-2 focus:ring-[#C9A227]"
                      >
                        {membros.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome} (Ficha: {m.numero_ficha || m.numero_registro || 'S/N'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#1A1A1A]">
                        Função no Cartão
                      </label>
                      <Input
                        value={carteiraCargo}
                        onChange={(e) => setCarteiraCargo(e.target.value)}
                        placeholder="Ex: Membro em Comunhão, Cooperador, Diácono"
                        className="text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#1A1A1A]">
                        Data de Emissão
                      </label>
                      <Input
                        value={carteiraEmissao}
                        onChange={(e) => setCarteiraEmissao(e.target.value)}
                        placeholder="DD/MM/AAAA"
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#1A1A1A]">
                        Pastor Presidente
                      </label>
                      <Input
                        value={carteiraPastor}
                        onChange={(e) => setCarteiraPastor(e.target.value)}
                        placeholder="Nome do Pastor Presidente"
                        className="text-xs sm:text-sm"
                      />
                    </div>

                    {selectedCarteiraMembro && (
                      <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#E6E2D8] text-xs space-y-1 text-slate-700">
                        <p>
                          <strong>Registro / Ficha:</strong>{' '}
                          <span className="font-mono font-bold text-[#C9A227]">
                            {selectedCarteiraMembro.numero_registro ||
                              selectedCarteiraMembro.numero_ficha ||
                              'ADTC-001'}
                          </span>
                          {' • '}
                          <strong>Nascimento:</strong>{' '}
                          {selectedCarteiraMembro.data_nascimento
                            ? formatarDataBr(selectedCarteiraMembro.data_nascimento)
                            : selectedCarteiraMembro.data_nascimento_texto || '—'}
                        </p>
                        <p>
                          <strong>Batismo:</strong>{' '}
                          {selectedCarteiraMembro.data_batismo
                            ? formatarDataBr(selectedCarteiraMembro.data_batismo)
                            : selectedCarteiraMembro.data_batismo_texto || '—'}
                          {' • '}
                          <strong>CPF:</strong> {selectedCarteiraMembro.cpf || 'Não cadastrado'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* FORMULÁRIO 4: APRESENTAÇÃO DE CRIANÇA */}
              {/* ========================================================= */}
              {selectedDocType === 'apresentacao' && (
                <div className="space-y-4">
                  {/* Atalho opcional para selecionar membro/criança cadastrada */}
                  <div className="grid grid-cols-1 gap-4 p-4 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8]">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#1E3A5F] flex items-center justify-between">
                        <span>Carregar Dados a partir de Membro/Criança Cadastrada (Opcional)</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          (Preenche nome, data de nascimento e filiação)
                        </span>
                      </label>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const m = membros.find((item) => item.id === e.target.value)
                          if (m) preencherDadosApresentacao(m)
                        }}
                        className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm focus:ring-2 focus:ring-[#C9A227]"
                      >
                        <option value="">-- Selecione ou digite manualmente abaixo --</option>
                        {membros.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome} ({m.congregacao || 'Sede'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Editor opcional de texto do certificado de apresentação */}
                  <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#C9A227]" />
                        <span className="text-xs font-bold text-[#1E3A5F]">
                          Texto de Consagração / Observações
                        </span>
                        {textoEditadoApr !== null && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-100 text-amber-800 border-amber-300"
                          >
                            Personalizado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditingTextoApr ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setIsEditingTextoApr(false)}
                            className="h-7 text-xs bg-[#1E3A5F] text-white hover:bg-[#16304F]"
                          >
                            Concluir edição
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (textoEditadoApr === null) {
                                setTextoEditadoApr(
                                  'Tendo sido impetrada sobre a sua vida a oração pastoral de consagração e bênção para que cresça em graça, estatura e sabedoria diante de Deus e dos homens (Lucas 2:52).',
                                )
                              }
                              setIsEditingTextoApr(true)
                            }}
                            className="h-7 text-xs border-[#C9A227] text-[#1E3A5F] hover:bg-[#C9A227]/15"
                          >
                            <PenTool className="w-3 h-3 mr-1 text-[#C9A227]" />
                            Editar texto
                          </Button>
                        )}
                        {textoEditadoApr !== null && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTextoEditadoApr(null)
                              setIsEditingTextoApr(false)
                            }}
                            className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            Restaurar padrão
                          </Button>
                        )}
                      </div>
                    </div>

                    {isEditingTextoApr ? (
                      <div className="space-y-1.5">
                        <Textarea
                          value={
                            textoEditadoApr ??
                            'Tendo sido impetrada sobre a sua vida a oração pastoral de consagração e bênção para que cresça em graça, estatura e sabedoria diante de Deus e dos homens (Lucas 2:52).'
                          }
                          onChange={(e) => setTextoEditadoApr(e.target.value)}
                          rows={3}
                          className="text-xs sm:text-sm font-serif bg-white"
                          placeholder="Ajuste o texto pastoral da consagração..."
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded border border-slate-200">
                        {textoEditadoApr ||
                          'Texto padrão: oração pastoral de consagração e bênção (Lucas 2:52).'}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#1A1A1A]">
                        Nome da Criança
                      </label>
                      <Input
                        value={aprNomeCrianca}
                        onChange={(e) => {
                          setAprNomeCrianca(e.target.value)
                          setTextoEditadoApr(null)
                        }}
                        placeholder="Ex: Samuel Silva Fontenele"
                        className="text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#1A1A1A]">
                        Data de Nascimento da Criança
                      </label>
                      <Input
                        type="date"
                        value={aprDataNascimento}
                        onChange={(e) => setAprDataNascimento(e.target.value)}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#1A1A1A]">Nome do Pai</label>
                      <Input
                        value={aprNomePai}
                        onChange={(e) => setAprNomePai(e.target.value)}
                        placeholder="Ex: José Wilson de Albuquerque"
                        className="text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#1A1A1A]">Nome da Mãe</label>
                      <Input
                        value={aprNomeMae}
                        onChange={(e) => setAprNomeMae(e.target.value)}
                        placeholder="Ex: Maria das Graças Silva"
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#1A1A1A]">
                        Data da Apresentação
                      </label>
                      <Input
                        type="date"
                        value={aprDataApresentacao}
                        onChange={(e) => setAprDataApresentacao(e.target.value)}
                        className="text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#1A1A1A]">
                        Pastor Oficiante
                      </label>
                      <Input
                        value={aprPastorOficiante}
                        onChange={(e) => setAprPastorOficiante(e.target.value)}
                        placeholder="Ex: Pr. Nome do Pastor"
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="pt-4 border-t border-[#E6E2D8] flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => setIsPreviewOpen(true)}
                  className="bg-[#1E3A5F] hover:bg-[#16304F] text-white flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Visualizar Documento Timbrado
                </Button>

                <Button
                  onClick={() => {
                    setIsPreviewOpen(true)
                    setTimeout(() => handlePrintOrDownload(), 350)
                  }}
                  variant="outline"
                  className="border-[#C9A227] text-[#1E3A5F] hover:bg-[#C9A227]/10 flex items-center gap-2 font-semibold"
                >
                  <Download className="w-4 h-4 text-[#C9A227]" />
                  Baixar / Imprimir PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: ARQUIVO DE RECEBIMENTO DE CARTAS DE MUDANÇA */}
      {/* ======================================================== */}
      {activeTab === 'arquivo' && (
        <div className="space-y-6">
          <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#1E3A5F] text-[#C9A227] font-bold">
                      Arquivo Eclesiástico
                    </Badge>
                    <span className="text-xs text-[#5A5A5A]">
                      Entrada de novos irmãos por carta
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#1E3A5F]">
                    Arquivo de Recebimento de Cartas de Mudança
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5A5A5A] max-w-2xl">
                    Armazenamento organizado de cartas digitalizadas/PDF de membros e obreiros
                    transferidos de outras igrejas para a nossa congregação.
                  </p>
                </div>

                <Button
                  onClick={() => setIsNovoArquivoOpen(true)}
                  className="bg-[#C9A227] hover:bg-[#B08E1E] text-[#1E3A5F] font-bold flex items-center gap-2 shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  Arquivar Nova Carta Recebida
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-[#E6E2D8]">
                <button
                  onClick={() => setArquivoTipoFiltro('Todos')}
                  className={`p-3.5 rounded-xl border text-left transition ${
                    arquivoTipoFiltro === 'Todos'
                      ? 'border-[#1E3A5F] bg-[#1E3A5F]/5 font-bold'
                      : 'border-[#E6E2D8] hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs text-slate-500 block">Total de Arquivamentos</span>
                  <span className="text-xl font-serif font-bold text-[#1E3A5F]">
                    {cartasRecebidas.length}
                  </span>
                </button>

                <button
                  onClick={() => setArquivoTipoFiltro('Obreiro')}
                  className={`p-3.5 rounded-xl border text-left transition ${
                    arquivoTipoFiltro === 'Obreiro'
                      ? 'border-[#C9A227] bg-[#C9A227]/10 font-bold'
                      : 'border-[#E6E2D8] hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Espaço Obreiros</span>
                    <Award className="w-4 h-4 text-[#C9A227]" />
                  </div>
                  <span className="text-xl font-serif font-bold text-[#1E3A5F]">
                    {contagemObreiros}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Presbíteros, Diáconos, etc.
                  </span>
                </button>

                <button
                  onClick={() => setArquivoTipoFiltro('Membro')}
                  className={`p-3.5 rounded-xl border text-left transition ${
                    arquivoTipoFiltro === 'Membro'
                      ? 'border-blue-500 bg-blue-50/60 font-bold'
                      : 'border-[#E6E2D8] hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Espaço Membros</span>
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xl font-serif font-bold text-[#1E3A5F]">
                    {contagemMembros}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Membros em comunhão</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Barra de Pesquisa */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E6E2D8]">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar por nome, igreja de origem ou função..."
                value={searchCarta}
                onChange={(e) => setSearchCarta(e.target.value)}
                className="pl-9 text-xs sm:text-sm border-[#E6E2D8]"
              />
            </div>
            <div className="text-xs text-[#5A5A5A] self-end sm:self-center">
              Mostrando <strong>{cartasFiltradas.length}</strong> de {cartasRecebidas.length}{' '}
              documentos
            </div>
          </div>

          {/* Listagem em Cards dos Documentos Arquivados */}
          {loadingCartas ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#C9A227]" />
              <span className="text-xs">Carregando arquivo de cartas recebidas...</span>
            </div>
          ) : cartasFiltradas.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#E6E2D8] space-y-3">
              <FolderArchive className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-serif font-bold text-base text-[#1E3A5F]">
                Nenhuma carta encontrada
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchCarta || arquivoTipoFiltro !== 'Todos'
                  ? 'Nenhum registro corresponde aos filtros selecionados.'
                  : 'Nenhuma carta de mudança recebida foi arquivada ainda. Clique em "Arquivar Nova Carta Recebida" para cadastrar a primeira.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cartasFiltradas.map((carta) => {
                const isObreiro = carta.tipo_pessoa === 'Obreiro'
                const fileUrl = carta.arquivo_pdf ? pb.files.getURL(carta, carta.arquivo_pdf) : null

                return (
                  <Card
                    key={carta.id}
                    className={`border transition-all hover:shadow-md rounded-2xl ${
                      isObreiro ? 'border-amber-200 bg-amber-50/20' : 'border-[#E6E2D8] bg-white'
                    }`}
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                              isObreiro
                                ? 'bg-[#C9A227] text-[#1E3A5F] shadow-xs'
                                : 'bg-[#1E3A5F] text-white'
                            }`}
                          >
                            {isObreiro ? (
                              <Award className="w-5 h-5" />
                            ) : (
                              <Users className="w-5 h-5" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={isObreiro ? 'default' : 'secondary'}
                                className={
                                  isObreiro
                                    ? 'bg-[#1E3A5F] text-amber-300 font-bold text-[10px]'
                                    : 'text-[10px]'
                                }
                              >
                                {isObreiro
                                  ? `Obreiro (${carta.funcao_obreiro || 'Obreiro'})`
                                  : 'Membro'}
                              </Badge>
                              <span className="text-[10px] text-slate-400">
                                Recebido em: {formatarDataBr(carta.data_recebimento)}
                              </span>
                            </div>
                            <h4 className="font-serif font-bold text-base text-[#1E3A5F] mt-1">
                              {carta.nome}
                            </h4>
                          </div>
                        </div>

                        <button
                          onClick={() => handleExcluirCarta(carta.id, carta.nome)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Excluir arquivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-100 text-xs space-y-1.5 text-slate-700">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-[#C9A227] flex-shrink-0" />
                          <span className="truncate">
                            <strong>Igreja de Origem:</strong> {carta.igreja_origem}
                            {carta.cidade_origem ? ` (${carta.cidade_origem})` : ''}
                          </span>
                        </div>

                        {carta.congregacao_destino && (
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A5F] ml-1 flex-shrink-0" />
                            <span>
                              <strong>Destino:</strong> {carta.congregacao_destino}
                            </span>
                          </div>
                        )}

                        {carta.observacoes && (
                          <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                            "{carta.observacoes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {fileUrl ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold shadow-xs transition"
                            >
                              <Download className="w-3.5 h-3.5 text-[#C9A227]" />
                              Baixar Carta em PDF
                            </a>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-500 hover:text-[#1E3A5F] rounded-lg border border-slate-200"
                              title="Abrir em nova aba"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Sem anexo digital (registro em texto)
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {carta.id.slice(0, 8)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIGURAÇÃO DE LIDERANÇA / ASSINATURAS */}
      {/* ======================================================== */}
      <Dialog open={isConfigLiderancaModalOpen} onOpenChange={setIsConfigLiderancaModalOpen}>
        <DialogContent className="max-w-xl bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-[#E6E2D8] pb-3">
            <DialogTitle className="font-serif text-lg font-bold text-[#1E3A5F] flex items-center gap-2">
              <PenTool className="w-5 h-5 text-[#C9A227]" />
              Configurar Assinaturas dos Documentos
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Os nomes e cargos salvos aqui ficam gravados no banco de dados e serão usados por
              padrão em todas as Cartas de Recomendação, Mudança e Cartões de Membro.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarLiderancaPersistente} className="space-y-4 py-2">
            <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#1E3A5F] text-[#C9A227] text-[10px]">Pastor Presidente</Badge>
                <span className="text-[11px] text-slate-500">
                  Assina Recomendação, Mudança e Carteiras
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1A1A]">Nome do Pastor</label>
                  <Input
                    value={nomePastor}
                    onChange={(e) => setNomePastor(e.target.value)}
                    placeholder="Ex: Pr. Nome do Pastor"
                    className="text-xs sm:text-sm bg-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1A1A]">Cargo</label>
                  <Input
                    value={cargoPastor}
                    onChange={(e) => setCargoPastor(e.target.value)}
                    placeholder="Ex: Pastor"
                    className="text-xs sm:text-sm bg-white"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#1E3A5F] text-slate-200 text-[10px]">1º Secretário</Badge>
                <span className="text-[11px] text-slate-500">Assina Carta de Recomendação</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1A1A]">
                    Nome do 1º Secretário
                  </label>
                  <Input
                    value={nome1Secretario}
                    onChange={(e) => setNome1Secretario(e.target.value)}
                    placeholder="Ex: 1º Secretário Oficial"
                    className="text-xs sm:text-sm bg-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1A1A]">Cargo</label>
                  <Input
                    value={cargo1Secretario}
                    onChange={(e) => setCargo1Secretario(e.target.value)}
                    placeholder="Ex: 1ºSecretário"
                    className="text-xs sm:text-sm bg-white"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#1E3A5F] text-slate-200 text-[10px]">2º Secretário</Badge>
                <span className="text-[11px] text-slate-500">Assina Carta de Recomendação</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1A1A]">
                    Nome do 2º Secretário
                  </label>
                  <Input
                    value={nome2Secretario}
                    onChange={(e) => setNome2Secretario(e.target.value)}
                    placeholder="Ex: 2º Secretário Oficial"
                    className="text-xs sm:text-sm bg-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1A1A]">Cargo</label>
                  <Input
                    value={cargo2Secretario}
                    onChange={(e) => setCargo2Secretario(e.target.value)}
                    placeholder="Ex: 2ºSecretário"
                    className="text-xs sm:text-sm bg-white"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-[11px] text-[#1E3A5F]">
              Os documentos gerados contam com linha padronizada para assinatura manual dos líderes
              acima de seus respectivos nomes e cargos.
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfigLiderancaModalOpen(false)}
                disabled={isSalvandoLiderancaRapida}
              >
                Fechar
              </Button>
              <Button
                type="submit"
                disabled={isSalvandoLiderancaRapida}
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white flex items-center gap-1.5"
              >
                {isSalvandoLiderancaRapida ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-[#C9A227]" />
                    Gravar Nomes no Banco
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: ARQUIVAR NOVA CARTA RECEBIDA COM UPLOAD DE PDF */}
      {/* ======================================================== */}
      <Dialog open={isNovoArquivoOpen} onOpenChange={setIsNovoArquivoOpen}>
        <DialogContent className="max-w-xl bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-[#E6E2D8] pb-3">
            <DialogTitle className="font-serif text-lg font-bold text-[#1E3A5F] flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#C9A227]" />
              Arquivar Carta de Mudança Recebida
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Cadastre a pessoa que está chegando de outra congregação e envie o arquivo
              digitalizado (PDF).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarCartaRecebida} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F]">
                Espaço de Arquivamento (Obrigatório)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNovoTipoPessoa('Membro')}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                    novoTipoPessoa === 'Membro'
                      ? 'border-2 border-[#1E3A5F] bg-blue-50/50 shadow-xs'
                      : 'border-[#E6E2D8] hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-5 h-5 text-[#1E3A5F]" />
                  <div>
                    <strong className="block text-xs text-[#1E3A5F]">Membro</strong>
                    <span className="text-[10px] text-slate-500">Membro em Comunhão</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNovoTipoPessoa('Obreiro')}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                    novoTipoPessoa === 'Obreiro'
                      ? 'border-2 border-[#C9A227] bg-amber-50/50 shadow-xs'
                      : 'border-[#E6E2D8] hover:bg-slate-50'
                  }`}
                >
                  <Award className="w-5 h-5 text-[#C9A227]" />
                  <div>
                    <strong className="block text-xs text-[#1E3A5F]">Obreiro</strong>
                    <span className="text-[10px] text-slate-500">Presbítero, Diácono, etc.</span>
                  </div>
                </button>
              </div>
            </div>

            {novoTipoPessoa === 'Obreiro' && (
              <div className="space-y-1 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Função Ministerial do Obreiro
                </label>
                <Input
                  value={novaFuncaoObreiro}
                  onChange={(e) => setNovaFuncaoObreiro(e.target.value)}
                  placeholder="Ex: Presbítero, Diácono, Evangelista, Auxiliar"
                  className="text-xs sm:text-sm bg-white"
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Nome Completo *</label>
              <Input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex: Manoel Francisco de Castro"
                className="text-xs sm:text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Igreja de Origem *</label>
                <Input
                  value={novaIgrejaOrigem}
                  onChange={(e) => setNovaIgrejaOrigem(e.target.value)}
                  placeholder="Ex: Assembleia de Deus de Fortaleza"
                  className="text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Cidade / Estado de Origem
                </label>
                <Input
                  value={novaCidadeOrigem}
                  onChange={(e) => setNovaCidadeOrigem(e.target.value)}
                  placeholder="Ex: Fortaleza - CE"
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Data de Recebimento *
                </label>
                <Input
                  type="date"
                  value={novaDataRecebimento}
                  onChange={(e) => setNovaDataRecebimento(e.target.value)}
                  className="text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Unidade / Congregação Destino
                </label>
                <select
                  value={novaCongregacaoDestino}
                  onChange={(e) => setNovaCongregacaoDestino(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-white text-xs sm:text-sm focus:ring-2 focus:ring-[#C9A227]"
                >
                  <option value="">Selecione a congregação destino...</option>
                  {congregacoes.map((c) => (
                    <option key={c.id || c.nome} value={c.nome}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl border-2 border-dashed border-[#C9A227] bg-[#F7F5F0]/60">
              <label className="text-xs font-bold text-[#1E3A5F] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#C9A227]" />
                Arquivo PDF da Carta Digitalizada
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf,image/jpeg,image/png"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setNovoArquivo(e.target.files[0])
                  }
                }}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1E3A5F] file:text-white hover:file:bg-[#16304F] cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Formatos aceitos: PDF ou foto da carta física (até 20 MB).
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Observações Pastorais / Secretaria
              </label>
              <Input
                value={novasObservacoes}
                onChange={(e) => setNovasObservacoes(e.target.value)}
                placeholder="Ex: Entregou carta em mãos no culto de domingo."
                className="text-xs sm:text-sm"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNovoArquivoOpen(false)}
                disabled={isSalvandoCarta}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSalvandoCarta}
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white flex items-center gap-1.5"
              >
                {isSalvandoCarta ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Arquivando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-[#C9A227]" />
                    Salvar no Arquivo
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL DE PRÉ-VISUALIZAÇÃO / TIMBRADO COM A NOVA LOGO */}
      {/* ======================================================== */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="border-b border-[#E6E2D8] pb-3 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="font-serif text-lg font-bold text-[#1E3A5F]">
                Pré-visualização do Documento Oficial
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5A5A5A]">
                Formatado em papel A4 pronto para impressão ou download com a nova logo 3D e
                assinaturas.
              </DialogDescription>
            </div>
            <Button
              onClick={handlePrintOrDownload}
              size="sm"
              className="bg-[#1E3A5F] hover:bg-[#16304F] text-white flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </Button>
          </DialogHeader>

          {/* Área do Documento com Timbrado Oficial */}
          <div
            ref={printAreaRef}
            className="p-6 sm:p-10 bg-white border border-[#E6E2D8] rounded-xl my-4 text-[#1A1A1A] font-serif shadow-xs overflow-x-auto"
          >
            {/* CONTEÚDO 1: CARTA DE RECOMENDAÇÃO (NOVO MODELO OFICIAL EXATO) */}
            {selectedDocType === 'recomendacao' && (
              <div className="py-4 space-y-6 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-serif">
                {/* Timbrado Padrão ADTC com Faixa Azul-Marinho e Nova Logo 3D */}
                <div className="rounded-xl bg-gradient-to-r from-[#072348] via-[#0F325E] to-[#163B6E] p-4 border-b-3 border-[#C9A227] shadow-md flex items-center justify-center gap-3.5 text-white">
                  <img
                    src={config.logoUrl || ADTC_LOGO_URL}
                    alt={config.nomeIgreja || 'Logo'}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#C9A227] shadow-md bg-[#072348] flex-shrink-0"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = ADTC_LOGO_URL
                    }}
                  />
                  <div className="text-left">
                    <h1 className="text-base sm:text-lg font-bold uppercase tracking-wide text-white leading-tight font-serif">
                      {config.denominacao || 'Igreja Evangélica'}
                    </h1>
                    <p className="text-xs uppercase tracking-widest text-[#F3CA52] font-bold">
                      {config.subtituloIgreja || config.nomeIgreja || 'Comunidade'}
                    </p>
                    <p className="text-[10px] text-slate-200 font-sans mt-0.5">
                      {config.enderecoIgreja || 'Endereço da Igreja'}
                    </p>
                  </div>
                </div>

                {/* Título Oficial com Filetes Dourados */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
                  <h2 className="text-lg sm:text-xl font-bold uppercase text-[#0F325E] tracking-wider font-serif">
                    Carta de Recomendação
                  </h2>
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
                </div>

                {/* Versículo em relevo */}
                <div className="bg-[#F3EEDB] border-l-4 border-[#C9A227] p-2.5 rounded-r text-xs italic text-slate-700">
                  &ldquo;Recomendo-vos a nossa irmã... para que a recebais no Senhor, como é digno
                  dos santos, e a ajudeis em qualquer coisa que de vós necessitar...&rdquo; (Romanos
                  16:1-2)
                </div>

                {/* Saudação */}
                <p className="text-base font-semibold text-[#1E3A5F]">
                  Saudações no Senhor Jesus Cristo.
                </p>

                {/* Corpo do Documento Fiel ao Modelo */}
                <p className="text-justify text-base leading-relaxed indent-8">
                  {renderTextoCartaRecomendacao()}
                </p>

                {/* Local e Data por extenso */}
                <p className="pt-4 text-right text-sm">
                  {config.cidadeUf || 'Localidade'}, {formatarDataExtensoBr(recDataExpedicao)}.
                </p>

                {/* Bloco de Assinaturas: Pastor + 1º Secretário + 2º Secretário */}
                <div className="pt-10 pb-4">
                  <div className="grid grid-cols-2 gap-8 items-start text-center">
                    {/* Assinatura do Pastor */}
                    <div className="flex flex-col items-center">
                      <div className="w-56 border-t border-slate-800 mb-1.5 pt-6" />
                      <p className="font-bold text-sm text-[#1E3A5F]">
                        {recPastorAssinatura || nomePastor}
                      </p>
                      <p className="text-xs text-[#5A5A5A]">
                        {recCargoPastor || cargoPastor || 'Pastor'}
                      </p>
                    </div>

                    {/* Assinaturas dos Secretários */}
                    <div className="flex flex-col items-center space-y-4">
                      <div className="flex flex-col items-center">
                        <div className="w-56 border-t border-slate-800 mb-1.5 pt-6" />
                        <p className="font-bold text-sm text-[#1E3A5F]">
                          {rec1SecAssinatura || nome1Secretario}
                        </p>
                        <p className="text-xs text-[#5A5A5A]">
                          {recCargo1Sec || cargo1Secretario || '1ºSecretário'}
                        </p>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-56 border-t border-slate-800 mb-1.5 pt-6" />
                        <p className="font-bold text-sm text-[#1E3A5F]">
                          {rec2SecAssinatura || nome2Secretario}
                        </p>
                        <p className="text-xs text-[#5A5A5A]">
                          {recCargo2Sec || cargo2Secretario || '2ºSecretário'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Frase Obrigatória de Validade */}
                <div className="pt-4 border-t border-slate-200 text-center">
                  <p className="text-xs italic text-[#444]">
                    Esta carta terá validade de 30 dias após a data de expedição.
                  </p>
                </div>
              </div>
            )}

            {/* CONTEÚDO 2: CARTA DE MUDANÇA (MODELO OFICIAL COM PASTOR + 1º E 2º SECRETÁRIOS) */}
            {selectedDocType === 'mudanca' && (
              <div className="py-4 space-y-6 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-serif">
                {/* Timbrado Padrão ADTC com Faixa Azul-Marinho e Nova Logo 3D */}
                <div className="rounded-xl bg-gradient-to-r from-[#072348] via-[#0F325E] to-[#163B6E] p-4 border-b-3 border-[#C9A227] shadow-md flex items-center justify-center gap-3.5 text-white">
                  <img
                    src={config.logoUrl || ADTC_LOGO_URL}
                    alt={config.nomeIgreja || 'Logo'}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#C9A227] shadow-md bg-[#072348] flex-shrink-0"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = ADTC_LOGO_URL
                    }}
                  />
                  <div className="text-left">
                    <h1 className="text-base sm:text-lg font-bold uppercase tracking-wide text-white leading-tight font-serif">
                      {config.denominacao || 'Igreja Evangélica'}
                    </h1>
                    <p className="text-xs uppercase tracking-widest text-[#F3CA52] font-bold">
                      {config.subtituloIgreja || config.nomeIgreja || 'Comunidade'}
                    </p>
                    <p className="text-[10px] text-slate-200 font-sans mt-0.5">
                      {config.enderecoIgreja || 'Endereço da Igreja'}
                    </p>
                  </div>
                </div>

                {/* Título Oficial com Filetes Dourados */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
                  <h2 className="text-lg sm:text-xl font-bold uppercase text-[#0F325E] tracking-wider font-serif">
                    Carta de Mudança
                  </h2>
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
                </div>

                {/* Versículo em relevo */}
                <div className="bg-[#F3EEDB] border-l-4 border-[#C9A227] p-2.5 rounded-r text-xs italic text-slate-700">
                  &ldquo;Nós recomendamo-vos para que a recebais no Senhor, como usam fazer aos
                  santos.&rdquo; (Romanos 16:2)
                </div>

                {/* Saudação */}
                <p className="text-base font-semibold text-[#1E3A5F]">
                  Saudações no Senhor Jesus Cristo.
                </p>

                {/* Corpo do Documento Fiel ao Modelo */}
                <p className="text-justify text-base leading-relaxed indent-8">
                  {renderTextoCartaMudanca()}
                </p>

                {/* Local e Data por extenso */}
                <p className="pt-4 text-right text-sm">
                  {config.cidadeUf || 'Localidade'}, {formatarDataExtensoBr(mudDataExpedicao)}.
                </p>

                {/* Bloco de Assinaturas: Pastor + 1º Secretário + 2º Secretário */}
                <div className="pt-10 pb-4">
                  <div className="grid grid-cols-2 gap-8 items-start text-center">
                    {/* Assinatura do Pastor */}
                    <div className="flex flex-col items-center">
                      <div className="w-56 border-t border-slate-800 mb-1.5 pt-6" />
                      <p className="font-bold text-sm text-[#1E3A5F]">
                        {mudPastorAssinatura || nomePastor}
                      </p>
                      <p className="text-xs text-[#5A5A5A]">
                        {mudCargoPastor || cargoPastor || 'Pastor'}
                      </p>
                    </div>

                    {/* Assinaturas dos Secretários */}
                    <div className="flex flex-col items-center space-y-4">
                      <div className="flex flex-col items-center">
                        <div className="w-56 border-t border-slate-800 mb-1.5 pt-6" />
                        <p className="font-bold text-sm text-[#1E3A5F]">
                          {mud1SecAssinatura || nome1Secretario}
                        </p>
                        <p className="text-xs text-[#5A5A5A]">
                          {mudCargo1Sec || cargo1Secretario || '1ºSecretário'}
                        </p>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-56 border-t border-slate-800 mb-1.5 pt-6" />
                        <p className="font-bold text-sm text-[#1E3A5F]">
                          {mud2SecAssinatura || nome2Secretario}
                        </p>
                        <p className="text-xs text-[#5A5A5A]">
                          {mudCargo2Sec || cargo2Secretario || '2ºSecretário'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Frase Obrigatória de Validade */}
                <div className="pt-4 border-t border-slate-200 text-center">
                  <p className="text-xs italic text-[#444]">
                    Esta carta terá validade de 30 dias após a data de expedição.
                  </p>
                </div>
              </div>
            )}

            {/* CONTEÚDO 3: CARTÃO DE MEMBRO (FRENTE E VERSO) */}
            {selectedDocType === 'carteira' && selectedCarteiraMembro && (
              <CartaoMembroVisual
                membro={selectedCarteiraMembro}
                funcao={carteiraCargo}
                dataEmissao={carteiraEmissao}
                pastorPresidente={carteiraPastor || nomePastor}
              />
            )}

            {/* CONTEÚDO 4: APRESENTAÇÃO DE CRIANÇA */}
            {selectedDocType === 'apresentacao' && (
              <CertificadoApresentacaoVisual
                nomeCrianca={aprNomeCrianca}
                dataNascimento={aprDataNascimento}
                nomePai={aprNomePai}
                nomeMae={aprNomeMae}
                dataApresentacao={aprDataApresentacao}
                pastorOficiante={aprPastorOficiante || nomePastor}
              />
            )}
          </div>

          <DialogFooter className="border-t border-[#E6E2D8] pt-3">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={handlePrintOrDownload}
              className="bg-[#1E3A5F] hover:bg-[#16304F] text-white flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar em PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminDocumentos
