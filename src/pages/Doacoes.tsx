import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Configuracao } from '@/types/adtc'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  QrCode,
  Copy,
  Check,
  Heart,
  Church,
  ShieldCheck,
  Building,
  Edit2,
  Loader2,
  RefreshCw,
  ExternalLink,
  Upload,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'

export const Doacoes: React.FC = () => {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { config } = useChurchConfig()

  const [copied, setCopied] = useState(false)
  const [chavePix, setChavePix] = useState('')
  const [titular, setTitular] = useState(
    config.nomeIgreja || 'Igreja Evangélica Assembleia de Deus Templo Central',
  )
  const [banco, setBanco] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [mensagemApoio, setMensagemApoio] = useState(
    'Cada um dê conforme determinou em seu coração, não com tristeza ou por obrigação, pois Deus ama quem dá com alegria.',
  )
  const [versiculoReferencia, setVersiculoReferencia] = useState('2 Coríntios 9:7')
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null)
  const [qrRecordId, setQrRecordId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Modais de Edição Admin
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [qrFileToUpload, setQrFileToUpload] = useState<File | null>(null)
  const [qrFilePreview, setQrFilePreview] = useState<string | null>(null)
  const [removeCustomQr, setRemoveCustomQr] = useState(false)

  // Form State
  const [formKey, setFormKey] = useState('')
  const [formTitular, setFormTitular] = useState('')
  const [formBanco, setFormBanco] = useState('')
  const [formCnpj, setFormCnpj] = useState('')
  const [formMensagem, setFormMensagem] = useState('')
  const [formVersiculo, setFormVersiculo] = useState('')

  const fetchConfigs = async () => {
    try {
      const records = await pb.collection('configuracoes').getFullList<Configuracao>()
      let foundKey = ''
      let foundTitular = ''
      let foundBanco = ''
      let foundCnpj = ''
      let foundMensagem = ''
      let foundVersiculo = ''
      let foundQrUrl: string | null = null
      let foundQrId: string | null = null

      records.forEach((c) => {
        if (c.chave === 'pix_chave_copia_e_cola' && c.valor) foundKey = c.valor
        if (c.chave === 'pix_titular' && c.valor) foundTitular = c.valor
        if (c.chave === 'pix_banco' && c.valor) foundBanco = c.valor
        if (c.chave === 'pix_cnpj' && c.valor) foundCnpj = c.valor
        if (c.chave === 'pix_mensagem' && c.valor) foundMensagem = c.valor
        if (c.chave === 'pix_versiculo' && c.valor) foundVersiculo = c.valor
        if (c.chave === 'pix_qr_code_imagem') {
          foundQrId = c.id
          if (c.arquivo) {
            foundQrUrl = pb.files.getURL(c, c.arquivo)
          }
        }
      })

      if (foundKey) setChavePix(foundKey)
      if (foundTitular) setTitular(foundTitular)
      if (foundBanco) setBanco(foundBanco)
      if (foundCnpj) setCnpj(foundCnpj)
      if (foundMensagem) setMensagemApoio(foundMensagem)
      if (foundVersiculo) setVersiculoReferencia(foundVersiculo)
      setQrCodeImageUrl(foundQrUrl)
      setQrRecordId(foundQrId)
    } catch (err) {
      console.error('Erro ao buscar configurações do PIX:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(chavePix)
    setCopied(true)
    toast({
      title: 'Chave PIX copiada!',
      description: 'Código copia e cola disponível na sua área de transferência.',
    })
    setTimeout(() => setCopied(false), 3000)
  }

  const handleOpenEdit = () => {
    setFormKey(chavePix)
    setFormTitular(titular)
    setFormBanco(banco)
    setFormCnpj(cnpj)
    setFormMensagem(mensagemApoio)
    setFormVersiculo(versiculoReferencia)
    setQrFileToUpload(null)
    setQrFilePreview(null)
    setRemoveCustomQr(false)
    setIsEditModalOpen(true)
  }

  const saveConfig = async (chave: string, valor: string) => {
    try {
      const existing = await pb
        .collection('configuracoes')
        .getFirstListItem<Configuracao>(`chave='${chave}'`)
      await pb.collection('configuracoes').update(existing.id, { valor })
    } catch {
      await pb.collection('configuracoes').create({ chave, valor })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await Promise.all([
        saveConfig('pix_chave_copia_e_cola', formKey.trim()),
        saveConfig('pix_titular', formTitular.trim()),
        saveConfig('pix_banco', formBanco.trim()),
        saveConfig('pix_cnpj', formCnpj.trim()),
        saveConfig('pix_mensagem', formMensagem.trim()),
        saveConfig('pix_versiculo', formVersiculo.trim()),
      ])

      // Trata upload ou remoção da imagem do QR Code
      if (qrFileToUpload) {
        const formData = new FormData()
        formData.append('arquivo', qrFileToUpload)
        if (qrRecordId) {
          const updated = await pb
            .collection('configuracoes')
            .update<Configuracao>(qrRecordId, formData)
          if (updated.arquivo) {
            setQrCodeImageUrl(pb.files.getURL(updated, updated.arquivo))
          }
        } else {
          formData.append('chave', 'pix_qr_code_imagem')
          formData.append('valor', 'Imagem personalizada do QR Code')
          const created = await pb.collection('configuracoes').create<Configuracao>(formData)
          setQrRecordId(created.id)
          if (created.arquivo) {
            setQrCodeImageUrl(pb.files.getURL(created, created.arquivo))
          }
        }
      } else if (removeCustomQr && qrRecordId) {
        await pb.collection('configuracoes').update(qrRecordId, { arquivo: null })
        setQrCodeImageUrl(null)
      }

      setChavePix(formKey.trim())
      setTitular(formTitular.trim())
      setBanco(formBanco.trim())
      setCnpj(formCnpj.trim())
      setMensagemApoio(formMensagem.trim())
      setVersiculoReferencia(formVersiculo.trim())

      toast({
        title: 'Dados do PIX atualizados com sucesso!',
        description: 'As alterações na chave e QR Code já estão ativas na página pública.',
      })
      setIsEditModalOpen(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar dados do PIX',
        description: err?.message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Gera o QR Code dinâmico via URL encode seguro se não houver imagem personalizada
  const dynamicQrCodeUrl = chavePix
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
        chavePix,
      )}&margin=10`
    : ''
  const displayQrCodeUrl = qrCodeImageUrl || dynamicQrCodeUrl

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Cabeçalho */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <Badge className="bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40 uppercase tracking-widest text-xs font-semibold">
          Contribuição Voluntária
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1E3A5F]">
          Dízimos e Ofertas via PIX
        </h1>
        <p className="text-sm sm:text-base text-[#5A5A5A] leading-relaxed">
          Sua generosidade sustenta a proclamação do Evangelho, a manutenção do Templo Sede e
          congregações, e as ações de assistência social aos necessitados de{' '}
          {config.cidadeUf || config.cidadeEstado || 'nossa comunidade'}.
        </p>

        {isAdmin && (
          <div className="pt-2">
            <Button
              onClick={handleOpenEdit}
              className="bg-[#C9A227] hover:bg-[#B08E1E] text-[#1E3A5F] font-bold text-xs shadow-md"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Editar Chave PIX, QR Code & Textos
            </Button>
          </div>
        )}
      </div>

      {/* Card Principal do PIX */}
      <div className="max-w-4xl mx-auto">
        <Card className="border-2 border-[#C9A227] bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="h-3 bg-gradient-to-r from-[#1E3A5F] via-[#C9A227] to-[#1E3A5F]" />
          <CardContent className="p-6 sm:p-10 space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              {/* QR Code (Personalizado pelo Usuário ou Gerado Dinâmico) */}
              <div className="flex flex-col items-center text-center space-y-3 flex-shrink-0">
                <div className="w-60 h-60 sm:w-64 sm:h-64 aspect-square p-3 bg-white border-2 border-[#C9A227] rounded-2xl shadow-md flex items-center justify-center relative group overflow-hidden">
                  {displayQrCodeUrl ? (
                    <>
                      <img
                        src={displayQrCodeUrl}
                        alt={`QR Code PIX ${config.siglaIgreja || config.nomeIgreja || 'Igreja'}`}
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="text-white text-xs font-semibold bg-[#1E3A5F] px-3 py-1 rounded-full shadow">
                          Aponte a câmera do banco
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4 text-[#5A5A5A]">
                      <QrCode className="w-12 h-12 mx-auto mb-2 text-[#C9A227] opacity-60" />
                      <p className="text-xs font-semibold text-[#1E3A5F]">
                        QR Code aguardando chave
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Cadastre a chave PIX ou envie a foto do QR Code no painel
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#1E3A5F] flex items-center justify-center gap-1">
                    <QrCode className="w-4 h-4 text-[#C9A227]" />
                    {qrCodeImageUrl ? 'QR Code Oficial (Imagem)' : 'QR Code Dinâmico'}
                  </span>
                  <p className="text-[11px] text-[#5A5A5A]">
                    Abra o aplicativo do seu banco e escaneie
                  </p>
                </div>
              </div>

              {/* Informações da Chave e Instruções */}
              <div className="space-y-6 flex-1 w-full text-center md:text-left">
                <div className="space-y-2">
                  <span className="text-xs uppercase font-bold tracking-widest text-[#C9A227]">
                    Chave PIX Oficial (Copia e Cola)
                  </span>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <div className="flex-1 bg-[#F7F5F0] border border-[#E6E2D8] rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-[#1A1A1A] break-all select-all flex items-center">
                      {chavePix ? (
                        chavePix
                      ) : (
                        <span className="text-amber-700 italic font-sans text-xs">
                          Chave PIX não configurada — configure no painel.
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={copyToClipboard}
                      disabled={!chavePix}
                      className="bg-[#1E3A5F] hover:bg-[#16304F] text-white flex items-center justify-center gap-2 px-5 py-3 h-auto text-xs sm:text-sm rounded-xl font-medium disabled:opacity-50"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-[#C9A227]" />
                          <span>Copiar Chave</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Dados da Conta Eclesiástica */}
                <div className="bg-[#F7F5F0] p-4 sm:p-5 rounded-xl border border-[#E6E2D8] space-y-2 text-xs sm:text-sm text-left">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#C9A227] flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#1E3A5F]">Favorecido:</strong> {titular}
                    </div>
                  </div>
                  {cnpj && (
                    <div className="flex items-start gap-2">
                      <Building className="w-4 h-4 text-[#C9A227] flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#1E3A5F]">CNPJ / Identificação:</strong> {cnpj}
                      </div>
                    </div>
                  )}
                  {banco && (
                    <div className="flex items-start gap-2">
                      <Church className="w-4 h-4 text-[#C9A227] flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#1E3A5F]">Instituição / Banco:</strong> {banco}
                      </div>
                    </div>
                  )}
                </div>

                {/* Versículo Bíblico Inspirador */}
                <blockquote className="border-l-4 border-[#C9A227] pl-4 italic text-xs sm:text-sm text-[#5A5A5A] text-left leading-relaxed bg-[#F7F5F0]/60 p-3 rounded-r-lg">
                  "{mensagemApoio}"
                  <span className="block font-semibold text-[#1E3A5F] not-italic text-xs mt-1">
                    — {versiculoReferencia}
                  </span>
                </blockquote>
              </div>
            </div>

            {/* Canal de Atendimento e Instagram */}
            <div className="border-t border-[#E6E2D8] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5A5A5A]">
              <div className="flex items-center gap-2 text-center sm:text-left">
                <Heart className="w-4 h-4 text-[#C9A227] flex-shrink-0" />
                <span>
                  Para envio de comprovantes aos tesoureiros ou dúvidas, fale com a secretaria
                  pastoral.
                </span>
              </div>

              {/* Instagram Oficial da Igreja */}
              <a
                href="https://www.instagram.com/adtccampanario?stkn=ODNndm02a25xN25r"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 text-white font-semibold hover:opacity-90 transition text-xs shadow-xs"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span>Instagram @adtccampanario</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Como Contribuir - Passo a Passo */}
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A5F] text-center">
          Passo a Passo Simples para Doar
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-[#E6E2D8] bg-white p-5 space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#1E3A5F] text-[#C9A227] flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="font-serif font-bold text-sm text-[#1E3A5F]">Copie ou Escaneie</h3>
            <p className="text-xs text-[#5A5A5A] leading-relaxed">
              Use a câmera do seu aplicativo de banco para ler o QR Code ou copie a chave PIX acima.
            </p>
          </Card>

          <Card className="border-[#E6E2D8] bg-white p-5 space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#1E3A5F] text-[#C9A227] flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="font-serif font-bold text-sm text-[#1E3A5F]">Confira o Titular</h3>
            <p className="text-xs text-[#5A5A5A] leading-relaxed">
              Confirme se o destinatário corresponde à {config.nomeIgreja || 'igreja'}.
            </p>
          </Card>

          <Card className="border-[#E6E2D8] bg-white p-5 space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#1E3A5F] text-[#C9A227] flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="font-serif font-bold text-sm text-[#1E3A5F]">Conclua com Fé</h3>
            <p className="text-xs text-[#5A5A5A] leading-relaxed">
              Defina o valor voluntário do dízimo ou oferta e finalize com a sua senha bancária.
            </p>
          </Card>
        </div>
      </div>

      {/* Modal Admin Editar PIX */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-xl bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              Gerenciar Chave PIX, Imagem do QR Code e Informações
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Atualize a chave PIX, envie a imagem oficial do QR Code do seu banco ou modifique as
              informações bancárias.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Chave PIX (CNPJ, CPF, E-mail, Telefone ou Copia e Cola){' '}
                <span className="text-red-500">*</span>
              </label>
              <Input
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder="Ex: 14.037.658/0001-82"
                className="text-xs sm:text-sm font-mono"
                required
              />
              <p className="text-[11px] text-slate-500">
                Insira o CNPJ ou chave oficial da igreja. Ela será exibida para cópia e usada como
                fallback do QR Code.
              </p>
            </div>

            {/* Upload e Substituição da Imagem do QR Code */}
            <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#1E3A5F] flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#C9A227]" />
                  Substituir Imagem do QR Code
                </label>
                {(qrCodeImageUrl || qrFilePreview) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQrFileToUpload(null)
                      setQrFilePreview(null)
                      setRemoveCustomQr(true)
                    }}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-6 px-2 text-[11px]"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Usar QR dinâmico
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-16 h-16 aspect-square rounded-lg bg-white border border-[#E6E2D8] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {qrFilePreview ? (
                    <img
                      src={qrFilePreview}
                      alt="Novo QR"
                      className="w-full h-full object-contain"
                    />
                  ) : qrCodeImageUrl && !removeCustomQr ? (
                    <img
                      src={qrCodeImageUrl}
                      alt="QR atual"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setQrFileToUpload(file)
                        setQrFilePreview(URL.createObjectURL(file))
                        setRemoveCustomQr(false)
                      }
                    }}
                    className="text-xs border-[#E6E2D8] file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[#1E3A5F] file:text-white"
                  />
                  <p className="text-[10px] text-[#5A5A5A]">
                    {removeCustomQr
                      ? 'A imagem personalizada será removida ao salvar.'
                      : qrCodeImageUrl
                        ? 'Imagem personalizada ativa. Selecione um arquivo para substituir.'
                        : 'Envie a foto ou imagem oficial do QR Code do banco.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Nome do Titular / Favorecido
              </label>
              <Input
                value={formTitular}
                onChange={(e) => setFormTitular(e.target.value)}
                placeholder="Ex: Igreja Evangélica Assembleia de Deus Templo Central Campanário"
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">CNPJ / Identificação</label>
                <Input
                  value={formCnpj}
                  onChange={(e) => setFormCnpj(e.target.value)}
                  placeholder="Ex: 00.000.000/0001-00 (Sede Campanário)"
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Instituição / Banco</label>
                <Input
                  value={formBanco}
                  onChange={(e) => setFormBanco(e.target.value)}
                  placeholder="Ex: Bradesco / Caixa / Itaú"
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Mensagem / Versículo Bíblico
              </label>
              <Textarea
                value={formMensagem}
                onChange={(e) => setFormMensagem(e.target.value)}
                placeholder="Ex: Cada um dê conforme determinou em seu coração..."
                rows={3}
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Referência Bíblica</label>
              <Input
                value={formVersiculo}
                onChange={(e) => setFormVersiculo(e.target.value)}
                placeholder="Ex: 2 Coríntios 9:7"
                className="text-xs sm:text-sm"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-[#1E3A5F] text-white">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Doacoes
