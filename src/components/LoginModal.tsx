import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  User,
  ShieldAlert,
  Coins,
  FileText,
  Info,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import { useToast } from '@/hooks/use-toast'
import { AdtcLogo } from '@/components/AdtcLogo'

// Lista dos perfis individuais para acesso rápido em 1 clique
const PERFIS_RAPIDOS = [
  {
    id: 'tesoureiro',
    nome: 'Tesoureiro',
    login: 'tesoureiro',
    descricao: 'Gerente do sistema: Acesso total (inclusive financeiro e logins)',
    icone: Coins,
    corBadge: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  {
    id: 'secretario1',
    nome: '1º Secretário',
    login: 'secretario1',
    descricao: 'Membros, congregados, obreiros, atas, documentos e escalas',
    icone: FileText,
    corBadge: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  {
    id: 'secretario2',
    nome: '2º Secretário',
    login: 'secretario2',
    descricao: 'Membros, congregações, documentos, patrimônio e fotos',
    icone: FileText,
    corBadge: 'bg-indigo-100 text-indigo-900 border-indigo-300',
  },
]

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, closeLoginModal, login } = useAuth()
  const { config } = useChurchConfig()

  // Campos do formulário de login individual
  const [loginInput, setLoginInput] = useState('tesoureiro')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showSecretarioNotice, setShowSecretarioNotice] = useState(false)

  // Estados do fluxo "Esqueci a senha"
  // view: 'login' | 'forgot_email' | 'reset_code' | 'success'
  const [view, setView] = useState<'login' | 'forgot_email' | 'reset_code' | 'success'>('login')
  const [recoveryEmail, setRecoveryEmail] = useState('portelajane@outlook.com')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetNotice, setResetNotice] = useState<string | null>(null)

  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSelectPerfilRapido = (loginPadrao: string) => {
    setLoginInput(loginPadrao)
    setErrorMessage(null)
    setShowSecretarioNotice(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return

    setIsLoading(true)
    setErrorMessage(null)
    setShowSecretarioNotice(false)

    // Login individual obrigatório
    const res = await login(loginInput, password)
    setIsLoading(false)

    if (res.success) {
      toast({
        title: 'Login realizado com sucesso',
        description: `Bem-vindo ao Painel Administrativo da ${config.siglaIgreja || config.nomeIgreja || 'Igreja'}.`,
      })
      setPassword('')
      navigate('/admin')
    } else {
      setErrorMessage(res.error || 'Credenciais inválidas.')
      if (res.noEmailNotice) {
        setShowSecretarioNotice(true)
      }
      toast({
        variant: 'destructive',
        title: 'Falha no login',
        description: res.error || 'Verifique o usuário e a senha informados.',
      })
    }
  }

  // Enviar pedido de redefinição de senha
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recoveryEmail) return

    setIsSendingReset(true)
    setResetNotice(null)

    try {
      const baseUrl = import.meta.env.VITE_POCKETBASE_URL
      const res = await fetch(`${baseUrl}/backend/v1/admin/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar solicitação de recuperação.')
      }

      toast({
        title: 'Solicitação processada',
        description:
          data.message || 'Instruções de recuperação foram enviadas para o e-mail cadastrado.',
      })

      if (data.recoveryCode) {
        setResetNotice(
          `Código de segurança gerado para ${recoveryEmail}: ${data.recoveryCode} (válido por 30 minutos).`,
        )
        setResetCode(data.recoveryCode)
      } else {
        setResetNotice(
          `Link de redefinição enviado com sucesso para ${recoveryEmail}. Caso precise redefinir com código instantâneo, você pode inseri-lo na próxima etapa.`,
        )
      }

      setView('reset_code')
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na recuperação',
        description: err?.message || 'Verifique o e-mail informado.',
      })
    } finally {
      setIsSendingReset(false)
    }
  }

  // Confirmar redefinição com o código e nova senha
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetCode.trim() || !newPassword || !confirmPassword) return

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Senhas diferentes',
        description: 'A confirmação de senha não confere.',
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Senha muito curta',
        description: 'A nova senha deve ter no mínimo 6 caracteres.',
      })
      return
    }

    setIsSendingReset(true)
    try {
      const baseUrl = import.meta.env.VITE_POCKETBASE_URL
      const res = await fetch(`${baseUrl}/backend/v1/admin/confirm-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: resetCode.trim(),
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao redefinir senha.')
      }

      toast({
        title: 'Senha redefinida com sucesso!',
        description: 'A nova chave foi configurada. Faça login com a nova senha.',
      })

      setView('success')
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na redefinição',
        description: err?.message || 'Código inválido ou expirado.',
      })
    } finally {
      setIsSendingReset(false)
    }
  }

  const handleClose = () => {
    setView('login')
    setPassword('')
    setResetCode('')
    setNewPassword('')
    setConfirmPassword('')
    setResetNotice(null)
    setErrorMessage(null)
    setShowSecretarioNotice(false)
    closeLoginModal()
  }

  return (
    <Dialog open={isLoginModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl p-5 sm:p-6">
        {/* VIEW 1: LOGIN INDIVIDUAL EXCLUSIVO */}
        {view === 'login' && (
          <>
            <DialogHeader className="text-center sm:text-center space-y-2">
              <div className="mx-auto flex justify-center">
                <AdtcLogo className="w-14 h-14 shadow-md border-2 border-[#C9A227]" />
              </div>
              <DialogTitle className="text-xl font-serif text-[#1E3A5F]">
                Painel Administrativo {config.siglaIgreja || config.nomeIgreja || 'Igreja'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-[#5A5A5A]">
                Acesso individual por perfil: Tesoureiro, 1º Secretário e 2º Secretário.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
              {/* Seleção rápida de perfil */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#5A5A5A] flex items-center justify-between">
                  <span>Selecione seu Perfil de Acesso:</span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {PERFIS_RAPIDOS.map((p) => {
                    const Icon = p.icone
                    const isSelected =
                      loginInput.toLowerCase() === p.login.toLowerCase() ||
                      loginInput.toLowerCase() === `${p.login}@adtc.local`
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPerfilRapido(p.login)}
                        className={`p-2 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#C9A227] bg-[#C9A227]/10 ring-1 ring-[#C9A227]'
                            : 'border-[#E6E2D8] bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[11px] font-bold text-[#1E3A5F]">{p.nome}</span>
                          <Icon className="w-3.5 h-3.5 text-[#C9A227]" />
                        </div>
                        <span className="text-[9px] text-[#5A5A5A] font-mono leading-tight">
                          @{p.login}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Input de Usuário ou E-mail */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Usuário ou E-mail Cadastrado
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Ex: tesoureiro, secretario1 ou seu email..."
                    value={loginInput}
                    onChange={(e) => {
                      setLoginInput(e.target.value)
                      if (errorMessage) setErrorMessage(null)
                      if (showSecretarioNotice) setShowSecretarioNotice(false)
                    }}
                    className="pr-9 border-[#E6E2D8] focus-visible:ring-[#C9A227] h-9 text-xs sm:text-sm font-medium"
                    required
                    autoFocus
                  />
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Input da Senha */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1A1A1A]">Sua Senha Pessoal</label>
                  <button
                    type="button"
                    onClick={() => setView('forgot_email')}
                    className="text-xs text-[#C9A227] hover:text-[#b08d20] hover:underline font-medium"
                  >
                    Esqueci a senha
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha..."
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errorMessage) setErrorMessage(null)
                    }}
                    className={`pr-10 border-[#E6E2D8] focus-visible:ring-[#C9A227] focus-visible:border-[#C9A227] h-9 text-xs sm:text-sm ${
                      errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {errorMessage && (
                  <p className="text-xs text-red-600 font-medium pt-0.5">{errorMessage}</p>
                )}
              </div>

              {/* Aviso para secretários sem e-mail cadastrado */}
              {showSecretarioNotice && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs leading-relaxed space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span>Primeiro acesso do Secretário?</span>
                  </div>
                  <p className="text-[11px] text-amber-900">
                    O <strong>Tesoureiro é o gerente do sistema</strong>. Caso ainda não tenha
                    acesso, informe seu e-mail pessoal ao Tesoureiro. Ele salvará seu e-mail nas
                    configurações e fornecerá sua senha de entrada.
                  </p>
                </div>
              )}

              {/* Informação sobre os perfis */}
              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                <div className="flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#1E3A5F] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-700">Controle de Perfis: </span>O{' '}
                    <strong>Tesoureiro</strong> gerencia logins e o módulo financeiro. Os{' '}
                    <strong>Secretários 1 e 2</strong> operam membros, cartas, obreiros,
                    congregações e escalas.
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-[#E6E2D8] text-[#5A5A5A] hover:bg-neutral-50 h-9 text-xs"
                  onClick={handleClose}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !password || !loginInput}
                  className="flex-1 bg-[#1E3A5F] hover:bg-[#16304F] text-white font-medium h-9 text-xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar no Painel'
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* VIEW 2: SOLICITAR RECUPERAÇÃO DE SENHA */}
        {view === 'forgot_email' && (
          <>
            <DialogHeader className="text-center sm:text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#C9A227]/10 flex items-center justify-center text-[#C9A227]">
                <Mail className="w-6 h-6 text-[#C9A227]" />
              </div>
              <DialogTitle className="text-xl font-serif text-[#1E3A5F]">
                Recuperação de Senha
              </DialogTitle>
              <DialogDescription className="text-sm text-[#5A5A5A]">
                Informe o e-mail oficial cadastrado para receber o código de recuperação.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleRequestReset} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  E-mail do Administrador
                </label>
                <Input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="portelajane@outlook.com"
                  className="border-[#E6E2D8] focus-visible:ring-[#C9A227]"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-[#5A5A5A]">
                  Caso você seja Secretário, solicite a redefinição diretamente ao{' '}
                  <strong className="text-[#1E3A5F]">Tesoureiro</strong> pelo painel.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-[#E6E2D8] text-[#5A5A5A]"
                  onClick={() => setView('login')}
                  disabled={isSendingReset}
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={isSendingReset || !recoveryEmail.trim()}
                  className="flex-1 bg-[#1E3A5F] hover:bg-[#16304F] text-white font-medium"
                >
                  {isSendingReset ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Instruções'
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* VIEW 3: DIGITAR CÓDIGO E DEFINIR NOVA SENHA */}
        {view === 'reset_code' && (
          <>
            <DialogHeader className="text-center sm:text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center text-[#1E3A5F]">
                <KeyRound className="w-6 h-6 text-[#1E3A5F]" />
              </div>
              <DialogTitle className="text-xl font-serif text-[#1E3A5F]">
                Criar Nova Senha
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5A5A5A]">
                Insira o código de validação e digite a nova senha de acesso do painel.
              </DialogDescription>
            </DialogHeader>

            {resetNotice && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
                {resetNotice}
              </div>
            )}

            <form onSubmit={handleConfirmReset} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Código de Recuperação (6 dígitos)
                </label>
                <Input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                  placeholder="Ex: AB12CD"
                  className="border-[#E6E2D8] font-mono tracking-widest text-center text-sm font-bold uppercase"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1A1A1A]">Nova Senha</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-[#C9A227] hover:underline flex items-center gap-1 font-medium"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="w-3 h-3" /> Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" /> Ver
                      </>
                    )}
                  </button>
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres..."
                  className="border-[#E6E2D8]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Confirmar Nova Senha</label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha..."
                  className="border-[#E6E2D8]"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-[#E6E2D8] text-[#5A5A5A]"
                  onClick={() => setView('login')}
                  disabled={isSendingReset}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSendingReset ||
                    !resetCode.trim() ||
                    !newPassword ||
                    newPassword !== confirmPassword
                  }
                  className="flex-1 bg-[#1E3A5F] hover:bg-[#16304F] text-white font-medium"
                >
                  {isSendingReset ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Nova Senha'
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* VIEW 4: SUCESSO */}
        {view === 'success' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1E3A5F]">
                Senha Atualizada com Sucesso!
              </h3>
              <p className="text-xs text-[#5A5A5A] mt-1 max-w-xs mx-auto">
                A nova chave de acesso já está em vigor para o seu login no painel administrativo.
              </p>
            </div>
            <Button
              onClick={() => {
                setView('login')
                setPassword('')
              }}
              className="w-full bg-[#1E3A5F] text-white"
            >
              Fazer Login Agora
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
