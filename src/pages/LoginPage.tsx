import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Lock,
  UserCheck,
  ShieldAlert,
  Loader2,
  HardDrive,
  DownloadCloud,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import {
  runPocketBaseMigration,
  isMigrationAlreadyDone,
  type MigrationProgress,
} from '@/lib/migrationService'
import { toast } from '@/hooks/use-toast'
import AdtcLogo from '@/components/AdtcLogo'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, login, createInitialAdmin, hasAnyUser, checkUsersExist, loadingAuth } = useAuth()
  const { config } = useChurchConfig()

  // Estados de formulário
  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Estados para Primeiro Acesso (Setup do Administrador)
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [setupNome, setSetupNome] = useState('')
  const [setupEmail, setSetupEmail] = useState('')
  const [setupSenha, setSetupSenha] = useState('')
  const [setupConfirmarSenha, setSetupConfirmarSenha] = useState('')

  // Estados de Migração de Dados
  const [migrando, setMigrando] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<MigrationProgress | null>(null)
  const [migracaoJaFeita, setMigracaoJaFeita] = useState(true)

  // Redireciona se já estiver logado
  useEffect(() => {
    if (user && !loadingAuth) {
      if (user.perfil === 'tesoureiro') {
        navigate('/admin/dizimistas', { replace: true })
      } else {
        navigate('/admin/dashboard', { replace: true })
      }
    }
  }, [user, loadingAuth, navigate])

  // Verifica se existem usuários no banco local e se migração foi feita
  useEffect(() => {
    async function initCheck() {
      const exists = await checkUsersExist()
      setIsSetupMode(!exists)

      const done = await isMigrationAlreadyDone()
      setMigracaoJaFeita(done)
    }
    initCheck()
  }, [checkUsersExist])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    if (!identificador.trim()) {
      setErro('Informe o seu usuário.')
      return
    }
    if (!senha) {
      setErro('Informe a sua senha.')
      return
    }

    setLoading(true)
    const res = await login(identificador, senha)
    setLoading(false)

    if (!res.success) {
      setErro(res.error || 'Credenciais inválidas.')
    } else {
      toast({
        title: 'Bem-vindo(a)!',
        description: 'Acesso local autorizado com sucesso.',
      })
    }
  }

  const handleCreateInitialAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    if (!setupNome.trim()) {
      setErro('Informe o nome do Administrador Geral.')
      return
    }
    if (!setupEmail.trim()) {
      setErro('Informe o e-mail do Administrador Geral.')
      return
    }
    if (setupSenha.length < 6) {
      setErro('A senha deve conter no mínimo 6 caracteres.')
      return
    }
    if (setupSenha !== setupConfirmarSenha) {
      setErro('As senhas digitadas não coincidem.')
      return
    }

    setLoading(true)
    const res = await createInitialAdmin(setupNome, setupEmail, setupSenha)
    setLoading(false)

    if (!res.success) {
      setErro(res.error || 'Erro ao inicializar o administrador.')
    } else {
      toast({
        title: 'Administrador configurado com sucesso!',
        description: 'Você já está conectado como Administrador Geral do sistema local.',
      })
      navigate('/admin/dashboard', { replace: true })
    }
  }

  const handleExecutarMigracao = async () => {
    if (migrando) return
    setMigrando(true)
    setErro(null)

    toast({
      title: 'Iniciando importação de dados...',
      description: 'Conectando ao banco online para migrar dados para este computador.',
    })

    const res = await runPocketBaseMigration((progress) => {
      setMigrationStatus(progress)
    })

    setMigrando(false)

    if (res.success) {
      setMigracaoJaFeita(true)
      await checkUsersExist()
      toast({
        title: 'Migração concluída com sucesso!',
        description: `${res.totalRecords} registros migrados para o banco local deste computador.`,
      })
    } else {
      setErro(
        `Aviso na importação: ${res.error || 'Não foi possível buscar alguns registros online.'} Você pode prosseguir criando o administrador local normalmente.`,
      )
    }
  }

  const preencherAtalho = (perfilKey: string) => {
    setIdentificador(perfilKey)
    setSenha('')
    setErro(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#1E3A5F] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Banner de Sistema Local Offline */}
        <div className="flex items-center justify-between bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-white text-xs">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold tracking-wide">Versão Local (Desktop)</span>
          </div>
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
            100% Offline
          </span>
        </div>

        {/* Card Principal */}
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-lg">
          <CardHeader className="text-center pb-3 pt-6">
            <div className="flex justify-center mb-3">
              <AdtcLogo className="h-16 w-auto drop-shadow-md" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
              {config.nomeIgreja || 'ADTC Campanário'}
            </CardTitle>
            <CardDescription className="text-slate-600 text-xs">
              {isSetupMode
                ? 'Primeiro Acesso — Configuração do Administrador Geral'
                : 'Painel Administrativo da Igreja'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Mensagem de Erro */}
            {erro && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <div className="flex-1">{erro}</div>
              </div>
            )}

            {/* SE FOR PRIMEIRO ACESSO: Formulário de Criação do Admin */}
            {isSetupMode ? (
              <form onSubmit={handleCreateInitialAdmin} className="space-y-3.5">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800 leading-relaxed">
                  <div className="font-semibold flex items-center gap-1.5 mb-1 text-amber-900">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    Bem-vindo à Versão Desktop Local!
                  </div>
                  Nenhum usuário foi encontrado neste computador. Cadastre o{' '}
                  <strong>Administrador Geral</strong> para ter controle total do sistema.
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="setupNome" className="text-xs text-slate-700">
                    Nome Completo do Pastor / Administrador
                  </Label>
                  <Input
                    id="setupNome"
                    type="text"
                    required
                    placeholder="Ex.: Pr. José Francisco"
                    value={setupNome}
                    onChange={(e) => setSetupNome(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="setupEmail" className="text-xs text-slate-700">
                    Usuário de Acesso
                  </Label>
                  <Input
                    id="setupEmail"
                    type="text"
                    required
                    placeholder="admin ou seu usuário"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="setupSenha" className="text-xs text-slate-700">
                    Senha Mestra (mínimo 6 caracteres)
                  </Label>
                  <Input
                    id="setupSenha"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={setupSenha}
                    onChange={(e) => setSetupSenha(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="setupConfirmarSenha" className="text-xs text-slate-700">
                    Confirmar Senha
                  </Label>
                  <Input
                    id="setupConfirmarSenha"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={setupConfirmarSenha}
                    onChange={(e) => setSetupConfirmarSenha(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 font-medium bg-[#1E3A5F] hover:bg-[#152a45] text-white"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserCheck className="h-4 w-4 mr-2" />
                  )}
                  Criar Administrador e Iniciar
                </Button>
              </form>
            ) : (
              /* MODO NORMAL DE LOGIN LOCAL */
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="identificador" className="text-xs text-slate-700">
                    Usuário
                  </Label>
                  <Input
                    id="identificador"
                    type="text"
                    required
                    placeholder="Ex.: admin, tesoureiro ou seu usuário"
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="senha" className="text-xs text-slate-700">
                      Senha
                    </Label>
                    <span className="text-[11px] text-slate-400">Armazenada localmente</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={verSenha ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="h-10 text-sm pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setVerSenha(!verSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {verSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 font-medium bg-[#1E3A5F] hover:bg-[#152a45] text-white"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Entrar no Sistema
                </Button>

                {/* Atalhos rápidos para perfis */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block mb-1.5">
                    Preenchimento Rápido de Acesso:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => preencherAtalho('admin')}
                      className="text-left px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-[11px] text-slate-700 font-medium transition-colors"
                    >
                      🛡️ Administrador
                    </button>
                    <button
                      type="button"
                      onClick={() => preencherAtalho('tesoureiro')}
                      className="text-left px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-[11px] text-slate-700 font-medium transition-colors"
                    >
                      💰 Tesoureiro
                    </button>
                    <button
                      type="button"
                      onClick={() => preencherAtalho('secretario1')}
                      className="text-left px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-[11px] text-slate-700 font-medium transition-colors"
                    >
                      📋 1º Secretário
                    </button>
                    <button
                      type="button"
                      onClick={() => preencherAtalho('secretario2')}
                      className="text-left px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-[11px] text-slate-700 font-medium transition-colors"
                    >
                      📝 2º Secretário
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Seção Opcional: Importar / Migrar dados atuais da nuvem */}
            <div className="pt-3 border-t border-slate-100">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-700 font-medium">
                  <span className="flex items-center gap-1.5">
                    <DownloadCloud className="h-4 w-4 text-[#1E3A5F]" />
                    Migrar Dados da Nuvem
                  </span>
                  {migracaoJaFeita && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Sincronizado
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Transfere todos os membros, dízimos, obreiros, patrimônio e configurações para o
                  banco local deste computador.
                </p>

                {migrando && migrationStatus && (
                  <div className="space-y-1 py-1">
                    <div className="flex justify-between text-[11px] text-slate-600 font-mono">
                      <span>Importando: {migrationStatus.collection}</span>
                      <span>{migrationStatus.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#1E3A5F] h-full transition-all duration-300"
                        style={{ width: `${migrationStatus.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExecutarMigracao}
                  disabled={migrando}
                  className="w-full text-xs h-8 text-slate-700 border-slate-300 hover:bg-white"
                >
                  {migrando ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <DownloadCloud className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                  )}
                  {migracaoJaFeita ? 'Reimportar Dados da Nuvem' : 'Importar Dados Agora'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rodapé institucional */}
        <div className="text-center text-xs text-white/70 space-y-1">
          <p className="font-medium text-white/90">
            {config.denominacao || 'Igreja Evangélica Assembleia de Deus Templo Central'}
          </p>
          <p className="text-[11px] text-white/60">
            Instalação local individual • Licença vitalícia da igreja
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
