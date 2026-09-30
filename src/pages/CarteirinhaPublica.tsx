import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Building2,
  Phone,
} from 'lucide-react'
import { CartaoMembroVisual } from '@/components/CartaoMembroVisual'
import { ADTC_LOGO_URL } from '@/components/AdtcLogo'
import { Membro } from '@/types/adtc'
import {
  getLogoAsDataUri,
  convertImageUrlToDataUri,
  buildCartaoMembroHtml,
} from '@/lib/documentTemplates'
import { formatarDataBr } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'

interface RespostaCarteirinha {
  success: boolean
  membro: Membro & { fotoUrl?: string | null }
  lideranca: {
    pastorNome: string
    pastorCargo: string
    assinaturaPastorUrl: string | null
    assinatura1SecUrl: string | null
  }
}

export function CarteirinhaPublica() {
  const { toast } = useToast()
  const { config } = useChurchConfig()

  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<RespostaCarteirinha | null>(null)
  const [gerandoPdf, setGerandoPdf] = useState(false)

  // Máscara simples para CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2')
    }
    setCpf(v)
  }

  // Consulta no backend via rota pública segura
  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensagemErro(null)
    setResultado(null)

    if (!nome.trim() || !cpf.trim()) {
      setMensagemErro('Por favor, preencha seu nome completo e seu CPF.')
      return
    }

    setBuscando(true)
    try {
      const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
      const res = await fetch(`${baseUrl}/backend/v1/public/carteirinha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: nome.trim(),
          cpf: cpf.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setMensagemErro(
          data.error ||
            'Não encontramos sua carteirinha. Verifique os dados ou fale com a secretaria.',
        )
        return
      }

      setResultado(data)
    } catch (_) {
      setMensagemErro(
        'Não encontramos sua carteirinha. Verifique os dados ou fale com a secretaria.',
      )
    } finally {
      setBuscando(false)
    }
  }

  // Extrair pai e mãe da filiação
  const extrairPaiMae = (filiacao?: string) => {
    if (!filiacao) return { pai: '—', mae: '—' }
    const parts = filiacao.split(/\s+e\s+|\s+E\s+|;/i)
    if (parts.length >= 2) {
      return { pai: parts[0].trim(), mae: parts[1].trim() }
    }
    return { pai: filiacao.trim(), mae: '—' }
  }

  // Baixar / Imprimir Carteirinha em PDF
  const handleBaixarCarteirinha = async () => {
    if (!resultado) return
    setGerandoPdf(true)
    try {
      const m = resultado.membro
      const lid = resultado.lideranca

      const [logoDataUri, fotoDataUri, pastorSigDataUri] = await Promise.all([
        getLogoAsDataUri(ADTC_LOGO_URL),
        m.fotoUrl ? convertImageUrlToDataUri(m.fotoUrl) : Promise.resolve(null),
        lid.assinaturaPastorUrl
          ? convertImageUrlToDataUri(lid.assinaturaPastorUrl)
          : Promise.resolve(null),
      ])

      const { pai, mae } = extrairPaiMae(m.filiacao)
      const nascimento = m.data_nascimento
        ? formatarDataBr(m.data_nascimento)
        : m.data_nascimento_texto || '—'
      const batismo = m.data_batismo ? formatarDataBr(m.data_batismo) : m.data_batismo_texto || '—'

      const html = buildCartaoMembroHtml({
        nome: m.nome || '—',
        pai,
        mae,
        emissao: new Date().toLocaleDateString('pt-BR'),
        funcao: 'Membro em Comunhão',
        registro: m.numero_registro || 'ADTC-001',
        nascimento,
        nacionalidade: 'Brasileira',
        naturalidade: m.naturalidade || 'Campanário - CE',
        estadoCivil: m.estado_civil || '—',
        batismo,
        cpf: m.cpf || '—',
        fotoDataUri,
        logoDataUri,
        pastorPresidente: lid.pastorNome || 'Pr José Francisco Portela Fontenele',
        assinaturaPastorDataUri: pastorSigDataUri,
      })

      const printWindow = window.open('', '_blank', 'width=1000,height=850')
      if (!printWindow) {
        toast({
          variant: 'destructive',
          title: 'Bloqueio de pop-up',
          description: 'Permita pop-ups no seu navegador para abrir e baixar a carteirinha.',
        })
        return
      }

      printWindow.document.write(html)
      printWindow.document.close()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar carteirinha',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setGerandoPdf(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7F5F0] via-white to-[#F7F5F0] py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Topo / Voltar */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A5F] hover:text-[#C9A227] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Início
          </Link>
          <Badge className="bg-[#1E3A5F] text-[#C9A227] border-none text-[11px] font-semibold">
            {config.siglaIgreja || config.nomeIgreja || 'Igreja'}
          </Badge>
        </div>

        {/* Card Principal de Consulta */}
        <Card className="border-[#E6E2D8] bg-white shadow-lg rounded-2xl overflow-hidden">
          {/* Header com Logo Timbrada */}
          <div className="bg-gradient-to-r from-[#072348] via-[#0F325E] to-[#163B6E] p-6 text-white text-center relative border-b-4 border-[#C9A227]">
            <div className="w-16 h-16 mx-auto rounded-full p-0.5 bg-[#072348] border-2 border-[#C9A227] shadow-md flex items-center justify-center mb-3">
              <img
                src={ADTC_LOGO_URL}
                alt="Logo ADTC"
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = '/logo-oficial.png'
                }}
              />
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-wide">
              Carteirinha Digital do Dizimista
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-md mx-auto">
              Consulte e baixe seu Cartão Oficial de Membro Dizimista da{' '}
              {config.nomeIgreja || 'igreja'}.
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {!resultado ? (
              <form onSubmit={handleConsultar} className="space-y-4">
                <div className="p-3 bg-amber-50/70 border border-[#C9A227]/40 rounded-xl text-xs text-[#1E3A5F] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#C9A227] flex-shrink-0" />
                  <span>
                    Digite seus dados cadastrados na igreja para liberar sua carteirinha pronta para
                    impressão ou download no celular.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1E3A5F] block">Nome Completo</label>
                  <Input
                    placeholder="Digite seu nome completo..."
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="text-xs sm:text-sm bg-[#F7F5F0] border-[#E6E2D8] focus:bg-white"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1E3A5F] block">
                    CPF (somente números)
                  </label>
                  <Input
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={handleCpfChange}
                    className="text-xs sm:text-sm bg-[#F7F5F0] border-[#E6E2D8] focus:bg-white"
                    required
                  />
                </div>

                {mensagemErro && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    <span>{mensagemErro}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={buscando}
                  className="w-full bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs sm:text-sm font-bold py-2.5 shadow-md flex items-center justify-center gap-2"
                >
                  {buscando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Consultando cadastro...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 text-[#C9A227]" />
                      Consultar Carteirinha
                    </>
                  )}
                </Button>
              </form>
            ) : (
              /* RESULTADO LOCALIZADO COM SUCESSO */
              <div className="space-y-6 animate-fadeIn">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-emerald-950">
                        Carteirinha Localizada com Sucesso!
                      </h3>
                      <p className="text-[11px] text-emerald-700">
                        {resultado.membro.nome} • {resultado.membro.congregacao || 'Sede'}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleBaixarCarteirinha}
                    disabled={gerandoPdf}
                    className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                  >
                    {gerandoPdf ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-[#C9A227]" />
                        Baixar Carteirinha
                      </>
                    )}
                  </Button>
                </div>

                {/* Pré-visualização gráfica do Cartão Oficial */}
                <div className="p-3 sm:p-5 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] flex flex-col items-center">
                  <p className="text-[11px] font-semibold text-[#1E3A5F] mb-3 uppercase tracking-wider">
                    Prévia do Cartão Digital
                  </p>
                  <div className="scale-95 sm:scale-100 origin-center">
                    <CartaoMembroVisual
                      membro={resultado.membro}
                      funcao="Membro em Comunhão"
                      dataEmissao={new Date().toLocaleDateString('pt-BR')}
                      pastorPresidente={resultado.lideranca.pastorNome}
                      assinaturaPastorUrl={resultado.lideranca.assinaturaPastorUrl}
                    />
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setResultado(null)
                      setMensagemErro(null)
                    }}
                    className="w-full sm:w-auto text-xs border-[#E6E2D8] text-slate-600"
                  >
                    Consultar outro membro
                  </Button>

                  <Button
                    onClick={handleBaixarCarteirinha}
                    disabled={gerandoPdf}
                    className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-6 shadow-md flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Carteirinha em PDF
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rodapé institucional com canais da secretaria */}
        <div className="text-center space-y-2 text-xs text-[#5A5A5A] pt-2">
          <p className="flex items-center justify-center gap-1 font-semibold text-[#1E3A5F]">
            <Building2 className="w-3.5 h-3.5 text-[#C9A227]" />
            {config.denominacao || config.nomeIgreja || 'Igreja'}
          </p>
          <p className="text-[11px]">
            {[config.enderecoIgreja || config.enderecoSede, config.cidadeUf || config.cidadeEstado]
              .filter(Boolean)
              .join(' — ') || 'Endereço da Sede'}
          </p>
          <p className="text-[11px] flex items-center justify-center gap-1 text-slate-500">
            <Phone className="w-3 h-3 text-[#C9A227]" />
            Dúvidas ou divergência nos dados? Fale com a secretaria da igreja no próximo culto.
          </p>
        </div>
      </div>
    </div>
  )
}

export default CarteirinhaPublica
