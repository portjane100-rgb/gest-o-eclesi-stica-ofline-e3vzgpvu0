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
import {
  Rocket,
  AlertTriangle,
  Building2,
  Users,
  KeyRound,
  Check,
  Loader2,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Lock,
} from 'lucide-react'

interface UnidadeForm {
  nome: string
  titulo?: string
  subtitulo?: string
  endereco?: string
  diasCulto?: string
}

interface SecretarioForm {
  name: string
  email: string
  password?: string
}

export const KitImplantacaoSection: React.FC = () => {
  const { isTesoureiro, user } = useAuth()
  const { config, reloadConfig } = useChurchConfig()
  const { toast } = useToast()

  // Etapas: 1 = Dados da Igreja, 2 = Unidades/Congregações, 3 = Logins Iniciais, 4 = Confirmação & Execução
  const [etapaAtual, setEtapaAtual] = useState<1 | 2 | 3 | 4>(1)

  // Etapa 1: Dados da Igreja Compradora
  const [igrejaNome, setIgrejaNome] = useState('')
  const [igrejaSubtitulo, setIgrejaSubtitulo] = useState('')
  const [igrejaDenominacao, setIgrejaDenominacao] = useState('')
  const [igrejaSigla, setIgrejaSigla] = useState('')
  const [igrejaEndereco, setIgrejaEndereco] = useState('')
  const [igrejaCidadeEstado, setIgrejaCidadeEstado] = useState('')
  const [igrejaTelefone, setIgrejaTelefone] = useState('')
  const [igrejaEmail, setIgrejaEmail] = useState('')
  const [igrejaCorPrimaria, setIgrejaCorPrimaria] = useState('#1E3A5F')
  const [igrejaCorDestaque, setIgrejaCorDestaque] = useState('#C9A227')

  // Etapa 2: Unidades Iniciais
  const [unidades, setUnidades] = useState<UnidadeForm[]>([
    {
      nome: 'Sede',
      titulo: 'Templo Sede',
      subtitulo: 'Sede Administrativa e Templo Central',
      endereco: '',
      diasCulto: 'Domingo e Quinta-feira',
    },
    {
      nome: 'Congregação 1',
      titulo: 'Congregação Filial 1',
      subtitulo: 'Ponto de Pregação e Oração',
      endereco: '',
      diasCulto: 'Terça e Sábado',
    },
  ])

  // Etapa 3: Logins Iniciais do Novo Cliente
  const [tesoureiroNome, setTesoureiroNome] = useState('Tesoureiro Geral')
  const [tesoureiroEmail, setTesoureiroEmail] = useState('')
  const [tesoureiroPassword, setTesoureiroPassword] = useState('')
  const [showTesoureiroPassword, setShowTesoureiroPassword] = useState(false)

  const [secretarios, setSecretarios] = useState<SecretarioForm[]>([
    { name: '1º Secretário', email: '', password: '' },
  ])
  const [showSecretarioPassword, setShowSecretarioPassword] = useState<Record<number, boolean>>({})

  // Etapa 4: Confirmação de Segurança
  const [palavraConfirmacao, setPalavraConfirmacao] = useState('')
  const [isImplantando, setIsImplantando] = useState(false)
  const [isSucessoModalOpen, setIsSucessoModalOpen] = useState(false)

  if (!isTesoureiro) {
    return (
      <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-slate-300" />
        <CardContent className="p-6 text-center space-y-2">
          <Lock className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="font-serif font-bold text-slate-800">Kit de Implantação Restrito</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            O Kit de Implantação e Zeração de Dados é de acesso exclusivo do Tesoureiro (gerente do
            sistema). Secretários não possuem privilégios de implantação.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Manipulação de unidades
  const handleAddUnidade = () => {
    const num = unidades.length + 1
    setUnidades([
      ...unidades,
      {
        nome: `Congregação ${num}`,
        titulo: `Congregação ${num}`,
        subtitulo: 'Congregação Filial',
        endereco: '',
        diasCulto: 'Terça e Sábado',
      },
    ])
  }

  const handleRemoveUnidade = (index: number) => {
    if (unidades.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'Mínimo de 1 unidade',
        description: 'A igreja compradora precisa de pelo menos uma congregação/sede.',
      })
      return
    }
    setUnidades(unidades.filter((_, i) => i !== index))
  }

  const handleUpdateUnidade = (index: number, field: keyof UnidadeForm, value: string) => {
    const updated = [...unidades]
    updated[index] = { ...updated[index], [field]: value }
    setUnidades(updated)
  }

  // Manipulação de secretários
  const handleAddSecretario = () => {
    if (secretarios.length >= 2) {
      toast({
        title: 'Limite atingido',
        description: 'O sistema suporta até 2 secretários adicionais.',
      })
      return
    }
    setSecretarios([
      ...secretarios,
      {
        name: secretarios.length === 0 ? '1º Secretário' : '2º Secretário',
        email: '',
        password: '',
      },
    ])
  }

  const handleRemoveSecretario = (index: number) => {
    setSecretarios(secretarios.filter((_, i) => i !== index))
  }

  const handleUpdateSecretario = (index: number, field: keyof SecretarioForm, value: string) => {
    const updated = [...secretarios]
    updated[index] = { ...updated[index], [field]: value }
    setSecretarios(updated)
  }

  // Validações por etapa
  const handleAvancarEtapa1 = () => {
    if (!igrejaNome.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Informe o nome da nova igreja compradora.',
      })
      return
    }
    setEtapaAtual(2)
  }

  const handleAvancarEtapa2 = () => {
    const nomesValidos = unidades.filter((u) => u.nome.trim().length > 0)
    if (nomesValidos.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Unidade obrigatória',
        description: 'Informe ao menos o nome do Templo Sede.',
      })
      return
    }
    setEtapaAtual(3)
  }

  const handleAvancarEtapa3 = () => {
    if (!tesoureiroEmail.trim() || !tesoureiroEmail.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'E-mail inválido',
        description: 'Informe um e-mail válido para o login do Tesoureiro.',
      })
      return
    }
    if (!tesoureiroPassword || tesoureiroPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Senha fraca',
        description: 'A senha do Tesoureiro deve ter no mínimo 6 caracteres.',
      })
      return
    }
    setEtapaAtual(4)
  }

  // Executar Implantação
  const handleExecutarImplantacao = async () => {
    if (palavraConfirmacao.trim().toUpperCase() !== 'IMPLANTAR') {
      toast({
        variant: 'destructive',
        title: 'Confirmação incorreta',
        description: 'Você precisa digitar exatamente a palavra IMPLANTAR em maiúsculas.',
      })
      return
    }

    setIsImplantando(true)
    try {
      const payload = {
        confirmacao: 'IMPLANTAR',
        igreja: {
          nome: igrejaNome.trim(),
          subtitulo: igrejaSubtitulo.trim(),
          denominacao: igrejaDenominacao.trim() || igrejaNome.trim(),
          sigla: igrejaSigla.trim(),
          endereco: igrejaEndereco.trim(),
          cidadeEstado: igrejaCidadeEstado.trim(),
          telefone: igrejaTelefone.trim(),
          email: igrejaEmail.trim(),
          corPrimaria: igrejaCorPrimaria.trim(),
          corDestaque: igrejaCorDestaque.trim(),
        },
        unidades: unidades.filter((u) => u.nome.trim()),
        tesoureiro: {
          name: tesoureiroNome.trim(),
          email: tesoureiroEmail.trim().toLowerCase(),
          password: tesoureiroPassword.trim(),
        },
        secretarios: secretarios.filter((s) => s.email && s.email.trim()),
      }

      await pb.send('/backend/v1/admin/implantar-sistema', {
        method: 'POST',
        body: payload,
      })

      await reloadConfig()
      setIsSucessoModalOpen(true)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na implantação',
        description: err?.message || 'Falha na comunicação com o servidor.',
      })
    } finally {
      setIsImplantando(false)
    }
  }

  return (
    <Card className="border-[#C9A227]/40 bg-white shadow-md rounded-2xl overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-amber-500 via-rose-600 to-[#1E3A5F]" />
      <CardHeader className="p-5 sm:p-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold uppercase tracking-wider mb-2">
              <Rocket className="w-3.5 h-3.5 text-amber-700" />
              Kit de Implantação • Entrega para Novo Cliente
            </div>
            <CardTitle className="font-serif text-2xl font-bold text-[#1E3A5F]">
              Assistente de Implantação e Zeração de Dados
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-[#5A5A5A] mt-1">
              Configure a nova igreja compradora em 4 etapas guiadas. Ao concluir, o sistema ZERA
              com segurança todos os dados antigos da ADTC e entrega uma cópia 100% personalizada e
              pronta para uso.
            </CardDescription>
          </div>
        </div>

        {/* Barra de Progresso das Etapas */}
        <div className="grid grid-cols-4 gap-2 pt-4">
          {[
            { n: 1, label: '1. Igreja' },
            { n: 2, label: '2. Unidades' },
            { n: 3, label: '3. Logins' },
            { n: 4, label: '4. Confirmação' },
          ].map((st) => (
            <div
              key={st.n}
              className={`p-2 rounded-lg text-center transition-all ${
                etapaAtual === st.n
                  ? 'bg-[#1E3A5F] text-white font-bold shadow-xs'
                  : etapaAtual > st.n
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span className="text-[11px] block">{st.label}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 pt-0 space-y-6">
        {/* ETAPA 1: DADOS DA IGREJA */}
        {etapaAtual === 1 && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
              <strong>Etapa 1 de 4:</strong> Preencha os dados institucionais da igreja compradora.
              Esses dados substituirão os da ADTC no cabeçalho, rodapé e documentos.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">Nome da Nova Igreja *</label>
                <Input
                  value={igrejaNome}
                  onChange={(e) => setIgrejaNome(e.target.value)}
                  placeholder="Ex: Assembleia de Deus Ministério Esperança"
                  className="bg-white border-[#E6E2D8]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">Subtítulo Litúrgico</label>
                <Input
                  value={igrejaSubtitulo}
                  onChange={(e) => setIgrejaSubtitulo(e.target.value)}
                  placeholder="Ex: Sede Regional • Templo Central"
                  className="bg-white border-[#E6E2D8]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">Denominação</label>
                <Input
                  value={igrejaDenominacao}
                  onChange={(e) => setIgrejaDenominacao(e.target.value)}
                  placeholder="Ex: Igreja Evangélica Pentecostal"
                  className="bg-white border-[#E6E2D8]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">Sigla / Acrônimo</label>
                <Input
                  value={igrejaSigla}
                  onChange={(e) => setIgrejaSigla(e.target.value)}
                  placeholder="Ex: ADME, IEAD, PIB"
                  className="bg-white border-[#E6E2D8]"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[#1E3A5F]">Endereço do Templo Sede</label>
                <Input
                  value={igrejaEndereco}
                  onChange={(e) => setIgrejaEndereco(e.target.value)}
                  placeholder="Ex: Av. Principal, nº 500, Bairro Novo"
                  className="bg-white border-[#E6E2D8]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">Cidade / UF</label>
                <Input
                  value={igrejaCidadeEstado}
                  onChange={(e) => setIgrejaCidadeEstado(e.target.value)}
                  placeholder="Ex: Fortaleza - CE"
                  className="bg-white border-[#E6E2D8]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">Telefone / WhatsApp</label>
                <Input
                  value={igrejaTelefone}
                  onChange={(e) => setIgrejaTelefone(e.target.value)}
                  placeholder="Ex: (85) 98888-7777"
                  className="bg-white border-[#E6E2D8]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">E-mail de Contato</label>
                <Input
                  value={igrejaEmail}
                  onChange={(e) => setIgrejaEmail(e.target.value)}
                  placeholder="contato@novaigreja.org"
                  className="bg-white border-[#E6E2D8]"
                />
              </div>
            </div>

            {/* Cores Iniciais */}
            <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-3">
              <span className="text-xs font-bold text-[#1E3A5F]">Cores Visuais Iniciais</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={igrejaCorPrimaria}
                    onChange={(e) => setIgrejaCorPrimaria(e.target.value)}
                    className="w-10 h-9 rounded border cursor-pointer"
                  />
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Cor Primária
                    </label>
                    <span className="text-[10px] font-mono text-slate-500">
                      {igrejaCorPrimaria}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={igrejaCorDestaque}
                    onChange={(e) => setIgrejaCorDestaque(e.target.value)}
                    className="w-10 h-9 rounded border cursor-pointer"
                  />
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Cor de Destaque
                    </label>
                    <span className="text-[10px] font-mono text-slate-500">
                      {igrejaCorDestaque}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={handleAvancarEtapa1}
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold px-6 py-2 h-auto gap-2"
              >
                Próximo: Unidades e Congregações
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 2: UNIDADES / CONGREGAÇÕES INICIAIS */}
        {etapaAtual === 2 && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
              <strong>Etapa 2 de 4:</strong> Cadastre as congregações da nova igreja que
              substituirão as congregações da ADTC (Sede, Casinhas, Alto, Vila dos Pescadores). O
              cliente poderá adicionar mais congregações depois.
            </div>

            <div className="space-y-3">
              {unidades.map((u, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1E3A5F] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#C9A227]" />
                      Unidade #{idx + 1} {idx === 0 ? '(Templo Sede)' : ''}
                    </span>
                    {unidades.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveUnidade(idx)}
                        className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Nome Curto *
                      </label>
                      <Input
                        value={u.nome}
                        onChange={(e) => handleUpdateUnidade(idx, 'nome', e.target.value)}
                        placeholder="Ex: Sede, Bairro Novo, Filial Norte"
                        className="bg-white border-[#E6E2D8] text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Título de Exibição
                      </label>
                      <Input
                        value={u.titulo || ''}
                        onChange={(e) => handleUpdateUnidade(idx, 'titulo', e.target.value)}
                        placeholder="Ex: Templo Sede, Congregação Vale da Bênção"
                        className="bg-white border-[#E6E2D8] text-xs"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Endereço da Unidade
                      </label>
                      <Input
                        value={u.endereco || ''}
                        onChange={(e) => handleUpdateUnidade(idx, 'endereco', e.target.value)}
                        placeholder="Rua, número e bairro"
                        className="bg-white border-[#E6E2D8] text-xs"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Dias de Culto
                      </label>
                      <Input
                        value={u.diasCulto || ''}
                        onChange={(e) => handleUpdateUnidade(idx, 'diasCulto', e.target.value)}
                        placeholder="Ex: Domingo às 19h e Quinta às 19h30"
                        className="bg-white border-[#E6E2D8] text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddUnidade}
                className="w-full border-dashed border-[#C9A227] text-[#1E3A5F] hover:bg-amber-50 text-xs font-semibold gap-1.5"
              >
                <Plus className="w-4 h-4 text-[#C9A227]" />
                Adicionar Outra Congregação
              </Button>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEtapaAtual(1)}
                className="text-xs"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleAvancarEtapa2}
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold px-6 py-2 h-auto gap-2"
              >
                Próximo: Logins Iniciais
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 3: LOGINS INICIAIS DO NOVO CLIENTE */}
        {etapaAtual === 3 && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
              <strong>Etapa 3 de 4:</strong> Defina o login de acesso do Tesoureiro (gerente do
              sistema) da nova igreja. Você entregará estas credenciais para a liderança da igreja
              compradora.
            </div>

            {/* Tesoureiro Gerente */}
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-700" />
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Tesoureiro Gerente (Controle Total do Sistema) *
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Nome de Exibição
                  </label>
                  <Input
                    value={tesoureiroNome}
                    onChange={(e) => setTesoureiroNome(e.target.value)}
                    placeholder="Ex: Pastor ou Tesoureiro João"
                    className="bg-white border-[#E6E2D8] text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    E-mail de Login *
                  </label>
                  <Input
                    type="email"
                    value={tesoureiroEmail}
                    onChange={(e) => setTesoureiroEmail(e.target.value)}
                    placeholder="tesoureiro@novaigreja.org"
                    className="bg-white border-[#E6E2D8] text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Senha Inicial *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowTesoureiroPassword(!showTesoureiroPassword)}
                      className="text-[10px] text-amber-800 hover:underline"
                    >
                      {showTesoureiroPassword ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                  <Input
                    type={showTesoureiroPassword ? 'text' : 'password'}
                    value={tesoureiroPassword}
                    onChange={(e) => setTesoureiroPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="bg-white border-[#E6E2D8] text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Secretários Opcionais */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1E3A5F]">
                  Logins de Secretários (Opcionais - podem ser criados depois)
                </span>
                {secretarios.length < 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSecretario}
                    className="text-xs text-[#1E3A5F] h-7"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar Secretário
                  </Button>
                )}
              </div>

              {secretarios.map((sec, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">
                      Secretário #{idx + 1} ({idx === 0 ? '1º Secretário' : '2º Secretário'})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSecretario(idx)}
                      className="text-[11px] text-rose-600 hover:text-rose-800"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      value={sec.name}
                      onChange={(e) => handleUpdateSecretario(idx, 'name', e.target.value)}
                      placeholder="Nome do Secretário"
                      className="bg-white border-[#E6E2D8] text-xs"
                    />
                    <Input
                      type="email"
                      value={sec.email}
                      onChange={(e) => handleUpdateSecretario(idx, 'email', e.target.value)}
                      placeholder="E-mail do secretário"
                      className="bg-white border-[#E6E2D8] text-xs"
                    />
                    <div className="relative">
                      <Input
                        type={showSecretarioPassword[idx] ? 'text' : 'password'}
                        value={sec.password || ''}
                        onChange={(e) => handleUpdateSecretario(idx, 'password', e.target.value)}
                        placeholder="Senha inicial (mín 6)"
                        className="bg-white border-[#E6E2D8] text-xs pr-8"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowSecretarioPassword({
                            ...showSecretarioPassword,
                            [idx]: !showSecretarioPassword[idx],
                          })
                        }
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        {showSecretarioPassword[idx] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEtapaAtual(2)}
                className="text-xs"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleAvancarEtapa3}
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold px-6 py-2 h-auto gap-2"
              >
                Próximo: Confirmação e Zeração
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 4: AVISO CRÍTICO, CONFIRMAÇÃO DIGITADA E EXECUÇÃO */}
        {etapaAtual === 4 && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-rose-800">
                <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0" />
                <h4 className="font-serif font-bold text-base">
                  ATENÇÃO CRÍTICA: ZERAÇÃO DEFINITIVA DE DADOS DA ADTC
                </h4>
              </div>

              <p className="text-xs text-rose-950 leading-relaxed">
                Ao clicar no botão de implantação, este sistema{' '}
                <strong>APAGARÁ PERMANENTEMENTE</strong> todos os dados operacionais e registros
                anteriores nesta instância:
              </p>

              <ul className="text-[11px] text-rose-900 list-disc list-inside space-y-0.5 bg-white/70 p-3 rounded-lg border border-rose-200">
                <li>Todos os Membros, Congregados e Obreiros cadastrados</li>
                <li>Todos os Dizimistas, Ofertas e Planilhas Financeiras Mensais</li>
                <li>Todos os Bens do Patrimônio e Inventário</li>
                <li>Todas as Escalas Semanais de Trabalho e Calendário de Eventos</li>
                <li>Todas as Cartas de Recomendação, Mudança e Certificados emitidos</li>
                <li>Todas as assinaturas manuscritas gravadas</li>
              </ul>

              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-300 text-[11px] text-emerald-950">
                <strong>O que será criado/preservado:</strong> A nova identidade da igreja (
                {igrejaNome}), as novas unidades cadastradas (
                {unidades.map((u) => u.nome).join(', ')}), o login do novo Tesoureiro (
                {tesoureiroEmail}) e o assistente virtual de atendimento.
              </div>
            </div>

            {/* Resumo antes de aplicar */}
            <div className="p-3.5 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] text-xs space-y-1.5">
              <span className="font-bold text-[#1E3A5F] block mb-1">Resumo da Nova Instância:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-slate-700">
                <div>
                  <strong>Igreja:</strong> {igrejaNome}
                </div>
                <div>
                  <strong>Sigla / Denominação:</strong> {igrejaSigla || '-'} •{' '}
                  {igrejaDenominacao || '-'}
                </div>
                <div>
                  <strong>Unidades:</strong> {unidades.length} unidade(s) configurada(s)
                </div>
                <div>
                  <strong>Tesoureiro:</strong> {tesoureiroNome} ({tesoureiroEmail})
                </div>
              </div>
            </div>

            {/* Confirmação Digitada */}
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
              <label className="text-xs font-bold text-amber-950 block">
                Para confirmar a limpeza total e gravação, digite a palavra{' '}
                <span className="font-mono text-rose-700 font-extrabold">IMPLANTAR</span> abaixo:
              </label>
              <Input
                value={palavraConfirmacao}
                onChange={(e) => setPalavraConfirmacao(e.target.value)}
                placeholder="Digite IMPLANTAR em letras maiúsculas"
                className="bg-white border-amber-300 font-mono font-bold tracking-wider text-center text-sm uppercase"
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isImplantando}
                onClick={() => setEtapaAtual(3)}
                className="text-xs"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Voltar
              </Button>
              <Button
                type="button"
                disabled={palavraConfirmacao.trim().toUpperCase() !== 'IMPLANTAR' || isImplantando}
                onClick={handleExecutarImplantacao}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-8 py-2.5 h-auto gap-2 shadow-sm disabled:opacity-50"
              >
                {isImplantando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Zerando Dados e Implantando Nova Igreja...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Confirmar Zeração & Implantar Sistema
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Modal de Sucesso */}
      <Dialog open={isSucessoModalOpen} onOpenChange={setIsSucessoModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto mb-2">
              <Check className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center font-serif text-xl font-bold text-slate-900">
              Sistema Implantado com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-600 pt-2 leading-relaxed">
              Os dados operacionais antigos foram completamente zerados e a nova identidade de{' '}
              <strong>{igrejaNome}</strong> já está ativa em todo o sistema. O login do novo
              Tesoureiro ({tesoureiroEmail}) foi gravado com sucesso.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-800 block">
              Próximos Passos para Entrega ao Cliente:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
              <li>Entregue o link do sistema e os dados de login ao novo Tesoureiro.</li>
              <li>
                O cliente poderá cadastrar os membros, escalas e patrimônio da sua própria igreja.
              </li>
              <li>
                Caso deseje, ele pode trocar a logo em{' '}
                <strong>Configurações &gt; Modo Revenda</strong>.
              </li>
            </ol>
          </div>

          <DialogFooter className="pt-2">
            <Button
              className="w-full bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold"
              onClick={() => {
                setIsSucessoModalOpen(false)
                window.location.reload()
              }}
            >
              Concluir e Atualizar Painel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default KitImplantacaoSection
