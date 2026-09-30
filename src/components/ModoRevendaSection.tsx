import React, { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import { useToast } from '@/hooks/use-toast'
import { compressImage } from '@/lib/imageCompressor'
import {
  Store,
  Palette,
  Image as ImageIcon,
  Check,
  Loader2,
  Upload,
  RefreshCw,
  Building2,
  FileText,
  AlertTriangle,
  Lock,
} from 'lucide-react'

export const ModoRevendaSection: React.FC = () => {
  const { isTesoureiro } = useAuth()
  const { config, reloadConfig, updateConfigKeys } = useChurchConfig()
  const { toast } = useToast()

  // Estado do formulário
  const [nomeIgreja, setNomeIgreja] = useState(config.nomeIgreja || '')
  const [subtituloIgreja, setSubtituloIgreja] = useState(config.subtituloIgreja || '')
  const [denominacao, setDenominacao] = useState(config.denominacao || '')
  const [siglaIgreja, setSiglaIgreja] = useState(config.siglaIgreja || '')
  const [enderecoSede, setEnderecoSede] = useState(config.enderecoSede || '')
  const [cidadeEstado, setCidadeEstado] = useState(config.cidadeEstado || '')
  const [telefoneContato, setTelefoneContato] = useState(config.telefoneContato || '')
  const [emailContato, setEmailContato] = useState(config.emailContato || '')

  // Cores
  const [corPrimaria, setCorPrimaria] = useState(config.corPrimaria || '#1E3A5F')
  const [corDestaque, setCorDestaque] = useState(config.corDestaque || '#C9A227')

  // Textos
  const [homeHeroSubtitle, setHomeHeroSubtitle] = useState(config.homeHeroSubtitle || '')
  const [textoRodape, setTextoRodape] = useState(config.textoRodape || '')
  const [mensagemAniversario, setMensagemAniversario] = useState(config.mensagemAniversario || '')

  // Rótulos
  const [labelMembros, setLabelMembros] = useState(config.labelMembros || 'Membros')
  const [labelCongregados, setLabelCongregados] = useState(config.labelCongregados || 'Congregados')
  const [labelObreiros, setLabelObreiros] = useState(config.labelObreiros || 'Corpo de Obreiros')
  const [labelDizimistas, setLabelDizimistas] = useState(
    config.labelDizimistas || 'Dizimistas & Ofertas',
  )
  const [labelUnidades, setLabelUnidades] = useState(config.labelUnidades || 'Congregações')
  const [labelEscala, setLabelEscala] = useState(config.labelEscala || 'Escala de Trabalho')
  const [labelCalendario, setLabelCalendario] = useState(
    config.labelCalendario || 'Calendário de Festas',
  )

  // Logo upload
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sincronizar com config quando carrega
  React.useEffect(() => {
    setNomeIgreja(config.nomeIgreja || '')
    setSubtituloIgreja(config.subtituloIgreja || '')
    setDenominacao(config.denominacao || '')
    setSiglaIgreja(config.siglaIgreja || '')
    setEnderecoSede(config.enderecoSede || '')
    setCidadeEstado(config.cidadeEstado || '')
    setTelefoneContato(config.telefoneContato || '')
    setEmailContato(config.emailContato || '')
    setCorPrimaria(config.corPrimaria || '#1E3A5F')
    setCorDestaque(config.corDestaque || '#C9A227')
    setHomeHeroSubtitle(config.homeHeroSubtitle || '')
    setTextoRodape(config.textoRodape || '')
    setMensagemAniversario(config.mensagemAniversario || '')
    setLabelMembros(config.labelMembros || 'Membros')
    setLabelCongregados(config.labelCongregados || 'Congregados')
    setLabelObreiros(config.labelObreiros || 'Corpo de Obreiros')
    setLabelDizimistas(config.labelDizimistas || 'Dizimistas & Ofertas')
    setLabelUnidades(config.labelUnidades || 'Congregações')
    setLabelEscala(config.labelEscala || 'Escala de Trabalho')
    setLabelCalendario(config.labelCalendario || 'Calendário de Festas')
  }, [config])

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'O logotipo deve ter no máximo 5MB.',
      })
      return
    }

    try {
      const compressed = await compressImage(file, {
        maxDimension: 512,
        quality: 0.9,
        mimeType: 'image/jpeg',
      })
      setSelectedLogoFile(compressed.file)
      setLogoPreview(compressed.previewUrl)
    } catch {
      setSelectedLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleUploadLogo = async () => {
    if (!selectedLogoFile) return
    if (!isTesoureiro) {
      toast({
        variant: 'destructive',
        title: 'Acesso negado',
        description: 'Somente o Tesoureiro pode alterar a logomarca do sistema.',
      })
      return
    }

    setIsUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('arquivo', selectedLogoFile)
      formData.append('valor', 'Logomarca oficial da igreja')

      let recId = config.logoRecordId
      if (!recId) {
        try {
          const existing = await pb
            .collection('configuracoes')
            .getFirstListItem("chave='igreja_logo'")
          recId = existing.id
        } catch {
          /* ignore */
        }
      }

      if (recId) {
        await pb.collection('configuracoes').update(recId, formData)
      } else {
        formData.append('chave', 'igreja_logo')
        await pb.collection('configuracoes').create(formData)
      }

      await reloadConfig()
      setSelectedLogoFile(null)
      setLogoPreview(null)
      toast({
        title: 'Logomarca atualizada!',
        description: 'A nova logo já está sendo aplicada em todo o sistema e documentos.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar logo',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isTesoureiro) {
      toast({
        variant: 'destructive',
        title: 'Acesso negado',
        description: 'Somente o Tesoureiro pode salvar alterações de identidade e tema.',
      })
      return
    }

    setIsSaving(true)
    try {
      await updateConfigKeys({
        igreja_nome: nomeIgreja.trim(),
        home_hero_title: nomeIgreja.trim(),
        igreja_subtitulo: subtituloIgreja.trim(),
        igreja_denominacao: denominacao.trim(),
        home_hero_badge: denominacao.trim(),
        igreja_sigla: siglaIgreja.trim(),
        igreja_endereco: enderecoSede.trim(),
        home_hero_endereco: enderecoSede ? `Sede: ${enderecoSede.trim()}` : '',
        igreja_cidade_estado: cidadeEstado.trim(),
        igreja_telefone: telefoneContato.trim(),
        igreja_email: emailContato.trim(),

        tema_cor_primaria: corPrimaria.trim(),
        tema_cor_destaque: corDestaque.trim(),

        home_hero_subtitle: homeHeroSubtitle.trim(),
        igreja_rodape: textoRodape.trim(),
        mensagem_aniversario: mensagemAniversario.trim(),

        rotulo_membros: labelMembros.trim(),
        rotulo_congregados: labelCongregados.trim(),
        rotulo_obreiros: labelObreiros.trim(),
        rotulo_dizimistas: labelDizimistas.trim(),
        rotulo_unidades: labelUnidades.trim(),
        rotulo_escala: labelEscala.trim(),
        rotulo_calendario: labelCalendario.trim(),
      })

      toast({
        title: 'Identidade e Tema atualizados!',
        description: 'As alterações foram salvas e aplicadas em tempo real em todas as páginas.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar configurações',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const paletasPredefinidas = [
    { nome: 'ADTC Oficial (Azul Noturno & Dourado)', primaria: '#1E3A5F', destaque: '#C9A227' },
    { nome: 'Vinho Litúrgico & Ouro Real', primaria: '#581825', destaque: '#D4AF37' },
    { nome: 'Verde Oliva Eclesiástico & Champanhe', primaria: '#1E3B2C', destaque: '#CBB26B' },
    { nome: 'Azul Real & Âmbar Solene', primaria: '#0F2C59', destaque: '#E39A26' },
    { nome: 'Grafite Nobre & Ouro Queimado', primaria: '#2C3333', destaque: '#C5A880' },
  ]

  return (
    <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-blue-600 via-amber-500 to-emerald-600" />
      <CardHeader className="p-5 sm:p-6 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="font-serif text-xl font-bold text-[#1E3A5F] flex items-center gap-2">
              <Store className="w-5 h-5 text-[#C9A227]" />
              Modo Revenda • Identidade Visual & Tema
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-[#5A5A5A] mt-1">
              Personalize o nome da igreja, logomarca oficial, cores do tema, textos institucionais
              e rótulos do painel. O app inteiro reflete essas mudanças em tempo real.
            </CardDescription>
          </div>
          {!isTesoureiro && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />
              Somente leitura (Tesoureiro pode editar)
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 pt-2 space-y-6">
        <form onSubmit={handleSaveAll} className="space-y-6">
          {/* SEÇÃO 1: DADOS INSTITUCIONAIS DA IGREJA */}
          <div className="p-4 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-4">
            <h3 className="font-serif text-sm font-bold text-[#1E3A5F] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#C9A227]" />
              Identidade e Nome da Igreja
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">
                  Nome Principal da Igreja *
                </label>
                <Input
                  value={nomeIgreja}
                  disabled={!isTesoureiro}
                  onChange={(e) => setNomeIgreja(e.target.value)}
                  placeholder="Ex: ADTC Campanário ou Primeira Igreja Batista"
                  className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">
                  Subtítulo Litúrgico / Sede
                </label>
                <Input
                  value={subtituloIgreja}
                  disabled={!isTesoureiro}
                  onChange={(e) => setSubtituloIgreja(e.target.value)}
                  placeholder="Ex: Assembleia de Deus • Templo Central"
                  className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">Denominação Completa</label>
                <Input
                  value={denominacao}
                  disabled={!isTesoureiro}
                  onChange={(e) => setDenominacao(e.target.value)}
                  placeholder="Ex: Igreja Evangélica Assembleia de Deus"
                  className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">Sigla / Nome Curto</label>
                <Input
                  value={siglaIgreja}
                  disabled={!isTesoureiro}
                  onChange={(e) => setSiglaIgreja(e.target.value)}
                  placeholder="Ex: ADTC, PIB, IEAD"
                  className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[#1E3A5F]">
                  Endereço Completo do Templo Sede
                </label>
                <Input
                  value={enderecoSede}
                  disabled={!isTesoureiro}
                  onChange={(e) => setEnderecoSede(e.target.value)}
                  placeholder="Ex: Rua Alberto Batista Fontenele, nº 141, Centro"
                  className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">Cidade / UF</label>
                <Input
                  value={cidadeEstado}
                  disabled={!isTesoureiro}
                  onChange={(e) => setCidadeEstado(e.target.value)}
                  placeholder="Ex: Campanário - CE"
                  className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">
                  Telefone / WhatsApp Geral
                </label>
                <Input
                  value={telefoneContato}
                  disabled={!isTesoureiro}
                  onChange={(e) => setTelefoneContato(e.target.value)}
                  placeholder="Ex: (88) 99368-2458"
                  className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">E-mail Institucional</label>
                <Input
                  value={emailContato}
                  disabled={!isTesoureiro}
                  onChange={(e) => setEmailContato(e.target.value)}
                  placeholder="Ex: contato@igreja.org"
                  className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: LOGOMARCA OFICIAL */}
          <div className="p-4 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-4">
            <h3 className="font-serif text-sm font-bold text-[#1E3A5F] flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#C9A227]" />
              Logomarca Oficial da Igreja
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-24 h-24 rounded-full border-2 border-[#C9A227] bg-white flex items-center justify-center overflow-hidden shadow-xs flex-shrink-0">
                <img
                  src={logoPreview || config.logoUrl}
                  alt="Logo da Igreja"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 space-y-2 text-xs text-[#5A5A5A]">
                <p className="font-semibold text-[#1E3A5F]">
                  Upload de Logotipo (Circular ou Quadrado)
                </p>
                <p className="text-[11px] leading-relaxed">
                  Envie a logo da igreja compradora em PNG, JPG ou WEBP. Ela será exibida no
                  cabeçalho do site, rodapé, painel administrativo, carteirinhas de membros e
                  cabeçalhos de cartas oficiais.
                </p>

                {isTesoureiro && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <label className="cursor-pointer">
                      <span className="sr-only">Escolher logo</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLogoFileChange}
                        className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1E3A5F] file:text-white hover:file:bg-[#16304F]"
                      />
                    </label>

                    {selectedLogoFile && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isUploadingLogo}
                        onClick={handleUploadLogo}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8"
                      >
                        {isUploadingLogo ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                            Confirmar Upload da Logo
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: CORES DO TEMA (CSS VARIABLES) */}
          <div className="p-4 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-serif text-sm font-bold text-[#1E3A5F] flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#C9A227]" />
                Cores do Tema Eclesiástico
              </h3>
              <span className="text-[11px] text-slate-500">
                Aplica instantaneamente nas variáveis CSS de topo, botões e painel
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-lg border border-[#E6E2D8] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1E3A5F]">
                    Cor Primária (Header / Sidebar)
                  </label>
                  <span className="font-mono text-xs text-slate-600">{corPrimaria}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={corPrimaria}
                    disabled={!isTesoureiro}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                  />
                  <Input
                    value={corPrimaria}
                    disabled={!isTesoureiro}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    placeholder="#1E3A5F"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-[#E6E2D8] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1E3A5F]">
                    Cor de Destaque (Dourado / Realce)
                  </label>
                  <span className="font-mono text-xs text-slate-600">{corDestaque}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={corDestaque}
                    disabled={!isTesoureiro}
                    onChange={(e) => setCorDestaque(e.target.value)}
                    className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                  />
                  <Input
                    value={corDestaque}
                    disabled={!isTesoureiro}
                    onChange={(e) => setCorDestaque(e.target.value)}
                    placeholder="#C9A227"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Paletas prontas */}
            {isTesoureiro && (
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Paletas Prontas Recomendadas:
                </span>
                <div className="flex flex-wrap gap-2">
                  {paletasPredefinidas.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCorPrimaria(p.primaria)
                        setCorDestaque(p.destaque)
                      }}
                      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#E6E2D8] bg-white text-xs hover:border-[#C9A227] transition"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/20"
                        style={{ backgroundColor: p.primaria }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/20"
                        style={{ backgroundColor: p.destaque }}
                      />
                      <span className="text-[11px] text-slate-700 font-medium">{p.nome}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 4: TEXTOS INSTITUCIONAIS */}
          <div className="p-4 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-4">
            <h3 className="font-serif text-sm font-bold text-[#1E3A5F] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#C9A227]" />
              Textos Institucionais e Mensagens
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">
                  Subtítulo / Mensagem de Boas-vindas da Home
                </label>
                <textarea
                  value={homeHeroSubtitle}
                  disabled={!isTesoureiro}
                  onChange={(e) => setHomeHeroSubtitle(e.target.value)}
                  rows={2}
                  className="w-full text-xs sm:text-sm bg-white border border-[#E6E2D8] rounded-md p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
                  placeholder="Um lugar de adoração, comunhão fraternal e proclamação..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">
                  Texto de Apresentação no Rodapé
                </label>
                <textarea
                  value={textoRodape}
                  disabled={!isTesoureiro}
                  onChange={(e) => setTextoRodape(e.target.value)}
                  rows={2}
                  className="w-full text-xs sm:text-sm bg-white border border-[#E6E2D8] rounded-md p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
                  placeholder="Igreja acolhedora, comprometida com a pregação bíblica..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">
                  Mensagem Automática de Felicitação aos Aniversariantes
                </label>
                <textarea
                  value={mensagemAniversario}
                  disabled={!isTesoureiro}
                  onChange={(e) => setMensagemAniversario(e.target.value)}
                  rows={2}
                  className="w-full text-xs sm:text-sm bg-white border border-[#E6E2D8] rounded-md p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
                  placeholder="A paz do Senhor, {nome}! A nossa igreja deseja muitas felicidades..."
                />
                <span className="text-[10px] text-slate-500">
                  Use {'{nome}'} onde o nome da pessoa aniversariante deve ser preenchido.
                </span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: RÓTULOS PERSONALIZÁVEIS DO SISTEMA */}
          <div className="p-4 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-4">
            <div>
              <h3 className="font-serif text-sm font-bold text-[#1E3A5F] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C9A227]" />
                Rótulos dos Módulos (Menu e Títulos)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Adapte a nomenclatura litúrgica usada pela denominação (Ex: &quot;Obreiros&quot; vs
                &quot;Liderança&quot;, &quot;Congregações&quot; vs &quot;Filiais/Pontos de
                Pregação&quot;).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Membros</label>
                <Input
                  value={labelMembros}
                  disabled={!isTesoureiro}
                  onChange={(e) => setLabelMembros(e.target.value)}
                  className="bg-white border-[#E6E2D8] text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Congregados</label>
                <Input
                  value={labelCongregados}
                  disabled={!isTesoureiro}
                  onChange={(e) => setLabelCongregados(e.target.value)}
                  className="bg-white border-[#E6E2D8] text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Obreiros / Liderança</label>
                <Input
                  value={labelObreiros}
                  disabled={!isTesoureiro}
                  onChange={(e) => setLabelObreiros(e.target.value)}
                  className="bg-white border-[#E6E2D8] text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Dízimos / Financeiro</label>
                <Input
                  value={labelDizimistas}
                  disabled={!isTesoureiro}
                  onChange={(e) => setLabelDizimistas(e.target.value)}
                  className="bg-white border-[#E6E2D8] text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Congregações / Filiais
                </label>
                <Input
                  value={labelUnidades}
                  disabled={!isTesoureiro}
                  onChange={(e) => setLabelUnidades(e.target.value)}
                  className="bg-white border-[#E6E2D8] text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Escala de Trabalho</label>
                <Input
                  value={labelEscala}
                  disabled={!isTesoureiro}
                  onChange={(e) => setLabelEscala(e.target.value)}
                  className="bg-white border-[#E6E2D8] text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Calendário de Eventos
                </label>
                <Input
                  value={labelCalendario}
                  disabled={!isTesoureiro}
                  onChange={(e) => setLabelCalendario(e.target.value)}
                  className="bg-white border-[#E6E2D8] text-xs"
                />
              </div>
            </div>
          </div>

          {/* BOTÃO SALVAR */}
          {isTesoureiro ? (
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold px-8 py-2.5 h-auto shadow-sm flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando Todas as Configurações...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-[#C9A227]" />
                    Salvar Identidade & Cores do Modo Revenda
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>
                Você está conectado como secretário. Os campos acima estão em modo somente leitura.
                O Tesoureiro (gerente do sistema) é quem possui autorização para salvar alterações
                de identidade.
              </span>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

export default ModoRevendaSection
