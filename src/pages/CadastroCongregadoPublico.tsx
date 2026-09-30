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
  ArrowLeft,
  Sparkles,
  Heart,
} from 'lucide-react'

export const CadastroCongregadoPublico: React.FC = () => {
  const { nomes: unidadesLista } = useCongregacoes()
  const { config } = useChurchConfig()
  const [submetido, setSubmetido] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // APENAS os 3 campos exigidos pelo usuário: nome, data de nascimento e telefone (mais a congregação)
  const [nome, setNome] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [congregacao, setCongregacao] = useState<string>('Sede')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!nome.trim()) {
      setErrorMessage('Por favor, informe o seu nome completo.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: Record<string, any> = {
        tipo: 'congregado',
        status_solicitacao: 'pendente',
        nome: nome.trim(),
        congregacao,
      }

      if (telefone.trim()) payload.telefone = telefone.trim()
      if (whatsapp.trim()) payload.whatsapp = whatsapp.trim()
      if (dataNascimento) payload.data_nascimento = `${dataNascimento} 12:00:00.000Z`

      await pb.collection('solicitacoes_cadastro').create(payload)
      setSubmetido(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      console.error('Erro ao enviar cadastro de congregado:', err)
      setErrorMessage(
        err?.message ||
          'Ocorreu um erro ao enviar seu cadastro. Por favor, verifique as informações e tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submetido) {
    return (
      <div className="min-h-screen bg-[#07172C] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <Card className="max-w-md w-full bg-white border border-[#E6E2D8] shadow-2xl rounded-3xl overflow-hidden text-center">
          <div className="h-3 bg-gradient-to-r from-[#1E3A5F] via-[#C9A227] to-[#1E3A5F]" />
          <CardContent className="p-8 sm:p-10 space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <Badge className="bg-[#C9A227]/20 text-[#1E3A5F] border border-[#C9A227]/40 uppercase tracking-widest text-[11px] font-bold">
                Cadastro Enviado
              </Badge>
              <h2 className="font-serif text-2xl font-bold text-[#1E3A5F]">
                Seja bem-vindo(a) à família ADTC!
              </h2>
              <p className="text-sm text-[#5A5A5A] leading-relaxed">
                Seu cadastro de <strong>congregado</strong> foi recebido com alegria pela nossa
                igreja.
              </p>
            </div>

            <div className="p-4 bg-[#F7F5F0] rounded-2xl border border-[#E6E2D8] text-xs text-slate-700 space-y-2 text-left">
              <div className="flex items-center gap-2 font-semibold text-[#1E3A5F]">
                <Heart className="w-4 h-4 text-[#C9A227]" />
                <span>Comunhão e Acolhimento:</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                A secretaria registrará seus dados e nossa liderança estará à disposição para orar
                por sua vida e acompanhar sua caminhada de fé com o Senhor Jesus.
              </p>
            </div>

            <div className="pt-2">
              <Button
                asChild
                className="w-full bg-[#1E3A5F] hover:bg-[#16304F] text-white font-semibold text-xs py-5 rounded-xl shadow-md"
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
      <div className="max-w-xl mx-auto space-y-6">
        {/* Cabeçalho */}
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
              Cadastro Rápido e Simples
            </Badge>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white drop-shadow-md">
              Cadastro de Congregado
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
              Preencha apenas seu <strong>nome</strong>, <strong>data de nascimento</strong> e{' '}
              <strong>telefone</strong> para fazer parte da nossa comunhão na{' '}
              {config.siglaIgreja || config.nomeIgreja || 'nossa igreja'}.
            </p>{' '}
          </div>
        </div>

        {/* Card do Formulário */}
        <Card className="border border-[#C9A227]/30 bg-white shadow-2xl rounded-3xl overflow-hidden">
          <div className="h-2.5 bg-gradient-to-r from-[#1E3A5F] via-[#C9A227] to-[#1E3A5F]" />

          <CardContent className="p-6 sm:p-8 space-y-6">
            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm">
                <strong>Atenção:</strong> {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Nome Completo</span> <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="text-xs sm:text-sm bg-slate-50 focus:bg-white h-11"
                />
              </div>

              {/* Data de Nascimento */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Data de Nascimento</span>
                </label>
                <Input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="text-xs sm:text-sm bg-slate-50 focus:bg-white h-11"
                />
              </div>

              {/* Telefone e WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span>Telefone</span>
                  </label>
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(88) 99999-9999"
                    className="text-xs sm:text-sm bg-slate-50 focus:bg-white h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </label>
                  <Input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(88) 99999-9999"
                    className="text-xs sm:text-sm bg-slate-50 focus:bg-white h-11"
                  />
                </div>
              </div>

              {/* Congregação */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Church className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Em qual congregação você congrega?</span>
                </label>
                <select
                  value={congregacao}
                  onChange={(e) => setCongregacao(e.target.value)}
                  className="w-full h-11 px-3 rounded-md border border-[#E6E2D8] bg-slate-50 focus:bg-white text-xs sm:text-sm font-medium text-[#1E3A5F] focus:ring-2 focus:ring-[#C9A227] focus:outline-none"
                >
                  {unidadesLista.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Envio */}
              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1E3A5F] hover:bg-[#16304F] text-white py-6 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando seu cadastro...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 text-[#C9A227]" />
                      Confirmar Cadastro
                    </>
                  )}
                </Button>
                <p className="text-[11px] text-center text-slate-500 mt-2.5">
                  Pronto! "Somente isso" para começar a caminhar em comunhão conosco.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CadastroCongregadoPublico
