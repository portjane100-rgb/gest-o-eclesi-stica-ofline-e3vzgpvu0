import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useCongregacoes } from '@/hooks/useCongregacoes'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Send,
  Loader2,
  Church,
  User,
  Calendar,
  Phone,
  MapPin,
  FileText,
  Heart,
  ArrowLeft,
  Sparkles,
} from 'lucide-react'

export const CadastroMembroPublico: React.FC = () => {
  const { nomes: unidadesLista } = useCongregacoes()
  const { config } = useChurchConfig()
  const [submetido, setSubmetido] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Campos da ficha oficial completa
  const [nome, setNome] = useState('')
  const [filiacao, setFiliacao] = useState('')
  const [naturalidade, setNaturalidade] = useState('')
  const [estadoCivil, setEstadoCivil] = useState('')
  const [rg, setRg] = useState('')
  const [cpf, setCpf] = useState('')
  const [endereco, setEndereco] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [congregacao, setCongregacao] = useState<string>('Sede')
  const [observacao, setObservacao] = useState('')

  // Datas com suporte a texto quando não lembra exato
  const [dataNascimento, setDataNascimento] = useState('')
  const [dataNascimentoTexto, setDataNascimentoTexto] = useState('')
  const [dataConversao, setDataConversao] = useState('')
  const [dataConversaoTexto, setDataConversaoTexto] = useState('')
  const [dataBatismo, setDataBatismo] = useState('')
  const [dataBatismoTexto, setDataBatismoTexto] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!nome.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: Record<string, any> = {
        tipo: 'membro',
        status_solicitacao: 'pendente',
        nome: nome.trim(),
        congregacao,
        filiacao: filiacao.trim(),
        naturalidade: naturalidade.trim(),
        estado_civil: estadoCivil.trim(),
        rg: rg.trim(),
        cpf: cpf.trim(),
        endereco: endereco.trim(),
        observacao: observacao.trim(),
        data_nascimento_texto: dataNascimentoTexto.trim(),
        data_conversao_texto: dataConversaoTexto.trim(),
        data_batismo_texto: dataBatismoTexto.trim(),
      }

      if (telefone.trim()) payload.telefone = telefone.trim()
      if (whatsapp.trim()) payload.whatsapp = whatsapp.trim()
      if (dataNascimento) payload.data_nascimento = `${dataNascimento} 12:00:00.000Z`
      if (dataConversao) payload.data_conversao = `${dataConversao} 12:00:00.000Z`
      if (dataBatismo) payload.data_batismo = `${dataBatismo} 12:00:00.000Z`

      await pb.collection('solicitacoes_cadastro').create(payload)
      setSubmetido(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      console.error('Erro ao enviar cadastro de membro:', err)
      setErrorMessage(
        err?.message ||
          'Ocorreu um erro ao enviar sua ficha de cadastro. Verifique os dados e tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submetido) {
    return (
      <div className="min-h-screen bg-[#07172C] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <Card className="max-w-lg w-full bg-white border border-[#E6E2D8] shadow-2xl rounded-3xl overflow-hidden text-center">
          <div className="h-3 bg-gradient-to-r from-[#1E3A5F] via-[#C9A227] to-[#1E3A5F]" />
          <CardContent className="p-8 sm:p-10 space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <Badge className="bg-[#C9A227]/20 text-[#1E3A5F] border border-[#C9A227]/40 uppercase tracking-widest text-[11px] font-bold">
                Ficha Enviada com Sucesso
              </Badge>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3A5F]">
                A Paz do Senhor, irmão(ã)!
              </h2>
              <p className="text-sm text-[#5A5A5A] leading-relaxed">
                Sua ficha de cadastro de{' '}
                <strong>membro da {config.siglaIgreja || config.nomeIgreja || 'igreja'}</strong> foi
                enviada à Secretaria da Igreja com sucesso.
              </p>
            </div>

            <div className="p-4 bg-[#F7F5F0] rounded-2xl border border-[#E6E2D8] text-xs text-slate-700 space-y-2 text-left">
              <div className="flex items-center gap-2 font-semibold text-[#1E3A5F]">
                <Sparkles className="w-4 h-4 text-[#C9A227]" />
                <span>Próximos passos:</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Nossa liderança e secretaria irão revisar as informações e aprovar sua inclusão
                oficial no rol de membros. Você receberá seu número de ficha eclesiástica
                diretamente na igreja.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white font-semibold text-xs py-5 rounded-xl shadow-md"
              >
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Portal ADTC
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#07172C] py-8 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Cabeçalho Flutuante com Estilo ADTC */}
        <div className="text-center space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#C9A227] hover:text-[#E6BA30] font-medium transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para o Portal Principal
          </Link>

          <div className="space-y-1">
            <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-[10px] sm:text-xs uppercase tracking-widest">
              Formulário Oficial de Membro
            </Badge>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white drop-shadow-md">
              Ficha de Cadastro de Membro
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
              {config.denominacao || config.nomeIgreja || 'Igreja'}. Preencha seus dados para
              emissão e atualização da ficha eclesiástica.
            </p>{' '}
          </div>
        </div>

        {/* Card do Formulário */}
        <Card className="border border-[#C9A227]/30 bg-white shadow-2xl rounded-3xl overflow-hidden">
          <div className="h-2.5 bg-gradient-to-r from-[#1E3A5F] via-[#C9A227] to-[#1E3A5F]" />

          <CardContent className="p-6 sm:p-10">
            {errorMessage && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm">
                <strong>Atenção:</strong> {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Identificação Básica */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-[#E6E2D8] pb-2">
                  <User className="w-4 h-4 text-[#C9A227]" />
                  <h3 className="font-serif font-bold text-sm text-[#1E3A5F] uppercase tracking-wide">
                    1. Identificação Pessoal
                  </h3>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Maria das Graças Fernandes"
                    required
                    className="text-xs sm:text-sm bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800">
                    Filiação (Nome do Pai e da Mãe)
                  </label>
                  <Input
                    value={filiacao}
                    onChange={(e) => setFiliacao(e.target.value)}
                    placeholder="Ex: José Fernandes e Francisca das Chagas Fernandes"
                    className="text-xs sm:text-sm bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">Naturalidade</label>
                    <Input
                      value={naturalidade}
                      onChange={(e) => setNaturalidade(e.target.value)}
                      placeholder="Ex: Uruoca – CE"
                      className="text-xs sm:text-sm bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">Estado Civil</label>
                    <Input
                      value={estadoCivil}
                      onChange={(e) => setEstadoCivil(e.target.value)}
                      placeholder="Ex: Casado(a), Solteiro(a), Viúvo(a)"
                      className="text-xs sm:text-sm bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">RG</label>
                    <Input
                      value={rg}
                      onChange={(e) => setRg(e.target.value)}
                      placeholder="Ex: 2004015093984"
                      className="text-xs sm:text-sm bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">CPF</label>
                    <Input
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="Ex: 000.000.000-00"
                      className="text-xs sm:text-sm bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Contato e Congregação */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 border-b border-[#E6E2D8] pb-2">
                  <Church className="w-4 h-4 text-[#C9A227]" />
                  <h3 className="font-serif font-bold text-sm text-[#1E3A5F] uppercase tracking-wide">
                    2. Congregação & Localização
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Sua Congregação na ADTC <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={congregacao}
                      onChange={(e) => setCongregacao(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-[#E6E2D8] bg-slate-50 focus:bg-white text-xs sm:text-sm font-medium text-[#1E3A5F] focus:ring-2 focus:ring-[#C9A227] focus:outline-none"
                    >
                      {unidadesLista.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Telefone (Fixo / Chamada)
                    </label>
                    <Input
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(88) 99999-9999"
                      className="text-xs sm:text-sm bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      WhatsApp (Mensagens e Felicitações)
                    </label>
                    <Input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(88) 99999-9999"
                      className="text-xs sm:text-sm bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Endereço Residencial
                    </label>
                    <Input
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Ex: Av. Alberto Batista Fontenele, Campanário"
                      className="text-xs sm:text-sm bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Observação / Apelido / Conhecido por
                    </label>
                    <Input
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      placeholder="Ex: (Sansão), (filha da ir. Dunga)"
                      className="text-xs sm:text-sm bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Datas Eclesiásticas */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 border-b border-[#E6E2D8] pb-2">
                  <Calendar className="w-4 h-4 text-[#C9A227]" />
                  <h3 className="font-serif font-bold text-sm text-[#1E3A5F] uppercase tracking-wide">
                    3. Datas Históricas (Preencha o que souber)
                  </h3>
                </div>

                {/* Data Nascimento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-[#E6E2D8]">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Data de Nascimento (Exata)
                    </label>
                    <Input
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="text-xs sm:text-sm bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Ou caso não lembre o dia exato
                    </label>
                    <Input
                      value={dataNascimentoTexto}
                      onChange={(e) => setDataNascimentoTexto(e.target.value)}
                      placeholder="Ex: Aprox. 1950, Não lembra"
                      className="text-xs sm:text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Data Conversão */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-[#E6E2D8]">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Data de Conversão (Decisão)
                    </label>
                    <Input
                      type="date"
                      value={dataConversao}
                      onChange={(e) => setDataConversao(e.target.value)}
                      className="text-xs sm:text-sm bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Conversão em texto
                    </label>
                    <Input
                      value={dataConversaoTexto}
                      onChange={(e) => setDataConversaoTexto(e.target.value)}
                      placeholder="Ex: Na fé desde a infância, Não lembra"
                      className="text-xs sm:text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Data Batismo nas Águas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-[#E6E2D8]">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Data do Batismo nas Águas
                    </label>
                    <Input
                      type="date"
                      value={dataBatismo}
                      onChange={(e) => setDataBatismo(e.target.value)}
                      className="text-xs sm:text-sm bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">Batismo em texto</label>
                    <Input
                      value={dataBatismoTexto}
                      onChange={(e) => setDataBatismoTexto(e.target.value)}
                      placeholder="Ex: Batizado em 1995 pelo Pastor"
                      className="text-xs sm:text-sm bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Botão de Envio */}
              <div className="pt-4 border-t border-[#E6E2D8]">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1E3A5F] hover:bg-[#16304F] text-white py-6 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando sua Ficha...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 text-[#C9A227]" />
                      Enviar Ficha de Cadastro à Secretaria
                    </>
                  )}
                </Button>
                <p className="text-[11px] text-center text-slate-500 mt-2">
                  🔒 Seus dados são salvos de forma confidencial e revisados pela Secretaria da
                  Igreja.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CadastroMembroPublico
