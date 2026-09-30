import React, { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Award,
  Wallet,
  Building,
  CalendarDays,
  Clock,
  Camera,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import { Button } from '@/components/ui/button'
import { AdtcLogo } from '@/components/AdtcLogo'

export const AdminLayout: React.FC = () => {
  const { logout, user, podeAcessarFinanceiro, perfil } = useAuth()
  const { config } = useChurchConfig()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Label amigável do perfil
  const getPerfilLabel = () => {
    if (perfil === 'tesoureiro') return 'Tesoureiro'
    if (perfil === 'secretario1') return '1º Secretário'
    if (perfil === 'secretario2') return '2º Secretário'
    if (perfil === 'admin') return 'Administrador'
    return 'Administrador'
  }

  // Se o usuário não tem permissão financeira (Secretários), o item 'Dizimistas & Planilha' é ocultado
  const allMenuItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/admin/membros', label: config.labelMembros || 'Membros', icon: Users },
    { to: '/admin/congregados', label: config.labelCongregados || 'Congregados', icon: UserCheck },
    { to: '/admin/obreiros', label: config.labelObreiros || 'Obreiros', icon: Award },
    {
      to: '/admin/dizimistas',
      label: config.labelDizimistas || 'Dizimistas & Planilha',
      icon: Wallet,
      financeiroOnly: true,
    },
    { to: '/admin/patrimonio', label: 'Patrimônio', icon: Building },
    { to: '/admin/escala', label: config.labelEscala || 'Escala de Trabalho', icon: Clock },
    {
      to: '/admin/calendario',
      label: config.labelCalendario || 'Calendário de Festas',
      icon: CalendarDays,
    },
    { to: '/admin/mural-fotos', label: config.labelMuralFotos || 'Mural de Fotos', icon: Camera },
    { to: '/admin/documentos', label: 'Documentos Oficiais', icon: FileText },
    { to: '/admin/config', label: 'Configurações', icon: Settings },
  ]

  const menuItems = allMenuItems.filter((item) => !item.financeiroOnly || podeAcessarFinanceiro)

  const getPageTitle = () => {
    const current = menuItems.find((item) =>
      item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to),
    )
    return current ? current.label : 'Painel Administrativo'
  }

  return (
    <div className="min-h-screen flex bg-[#F7F5F0]">
      {/* Sidebar Desktop Fixa */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#1E3A5F] text-white border-r border-[#16304F] flex-shrink-0">
        {/* Cabeçalho Sidebar */}
        <div className="p-5 border-b border-[#16304F] flex items-center gap-3">
          <AdtcLogo className="w-10 h-10 border border-[#C9A227] bg-white flex-shrink-0" />
          <div className="min-w-0">
            <span className="font-serif font-bold text-sm text-white block truncate">
              {config.nomeIgreja || 'ADTC Campanário'}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[#C9A227] font-semibold">
              Painel de Gestão
            </span>
          </div>
        </div>

        {/* Links de navegação admin */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#C9A227] text-[#1E3A5F] font-bold shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#1E3A5F]' : 'text-[#C9A227]'}`} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Rodapé da sidebar com logout */}
        <div className="p-4 border-t border-[#16304F] space-y-2">
          <div className="text-[11px] text-slate-400 px-2 truncate">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded font-bold bg-[#C9A227] text-[#1E3A5F]">
                {getPerfilLabel()}
              </span>
            </div>
            <strong className="text-white block truncate">{user?.name || 'Administrador'}</strong>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-950/40"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair do Painel
          </Button>
        </div>
      </aside>

      {/* Drawer Mobile */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-[#1E3A5F] text-white p-4 flex flex-col justify-between shadow-2xl animate-slide-right">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#16304F]">
                <div className="flex items-center gap-2">
                  <AdtcLogo className="w-7 h-7 border border-[#C9A227] bg-white" />
                  <span className="font-serif font-bold text-sm truncate">
                    {config.nomeIgreja || 'ADTC Campanário'}
                  </span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded-md text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = item.exact
                    ? location.pathname === item.to
                    : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${
                        isActive
                          ? 'bg-[#C9A227] text-[#1E3A5F] font-bold'
                          : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#16304F]">
              <Button
                onClick={() => {
                  setMobileDrawerOpen(false)
                  handleLogout()
                }}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-950/40"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal do Painel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Superior do Admin */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#E6E2D8] px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-[#1E3A5F] hover:bg-slate-100"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-serif text-lg sm:text-xl font-bold text-[#1E3A5F]">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A5F] hover:text-[#C9A227] transition px-3 py-1.5 rounded-lg hover:bg-slate-50 border border-[#E6E2D8]"
            >
              <span>Voltar ao site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex text-xs text-[#5A5A5A] hover:text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Sair
            </Button>
          </div>
        </header>

        {/* View da Sub-rota */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
