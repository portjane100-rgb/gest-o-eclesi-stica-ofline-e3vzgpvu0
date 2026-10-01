import React, { useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Menu,
  X,
  Lock,
  Heart,
  Calendar,
  Users,
  Clock,
  ShieldCheck,
  MapPin,
  ChevronRight,
} from 'lucide-react'
import { AdtcLogo } from '@/components/AdtcLogo'
import { useAuth } from '@/contexts/AuthContext'
import { LoginModal } from '@/components/LoginModal'
import { AssistantWidget } from '@/components/AssistantWidget'
import { useCongregacoes } from '@/hooks/useCongregacoes'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'

export const Layout: React.FC = () => {
  const { isAdmin, openLoginModal } = useAuth()
  const { config } = useChurchConfig()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { congregacoes = [], total = 0 } = useCongregacoes()
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const id = location.hash.replace('#', '')
      setTimeout(() => {
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }, [location.pathname, location.hash])

  const navLinks = [
    { to: '/', label: 'Início' },
    { to: '/obreiros', label: config.labelObreiros || 'Corpo de Obreiros' },
    { to: '/agenda-semanal', label: 'Agenda Semanal' },
    { to: '/escala', label: config.labelEscala || 'Escala de Trabalho' },
    { to: '/congregacoes', label: config.labelUnidades || 'Congregações' },
    { to: '/calendario', label: config.labelCalendario || 'Calendário de Festas' },
    { to: '/doacoes', label: 'Doações PIX' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-[#1A1A1A] selection:bg-[#C9A227]/30 w-full max-w-full overflow-x-hidden">
      {/* Top Header Fixo */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#1E3A5F]/95 backdrop-blur-md shadow-md py-3 text-white'
            : 'bg-[#1E3A5F] py-4 text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo / Marca */}
          <Link to="/" className="flex items-center gap-3 group">
            <AdtcLogo className="w-11 h-11 border-2 border-[#C9A227]/80 transition-transform duration-300 group-hover:scale-105 bg-white" />
            <div className="min-w-0">
              <span className="font-serif font-bold text-lg tracking-wide text-white flex items-center gap-1.5 truncate">
                {config.nomeIgreja || 'Gestão Eclesiástica'}
              </span>
              <span className="block text-[10px] tracking-widest uppercase text-[#C9A227] font-medium truncate">
                {config.subtituloIgreja || 'Assembleia de Deus • Templo Central'}
              </span>
            </div>
          </Link>

          {/* Menu Desktop */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `relative px-3 py-1.5 text-xs xl:text-sm font-medium transition-colors hover:text-[#C9A227] ${
                    isActive ? 'text-[#C9A227] font-semibold' : 'text-slate-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#C9A227] rounded-full animate-fade-in" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Cadeado Admin e Menu Mobile */}
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C9A227] text-[#1E3A5F] text-xs font-semibold hover:bg-[#B08E1E] transition shadow-sm"
                title="Painel Administrativo"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            ) : (
              <button
                onClick={openLoginModal}
                className="p-2 rounded-full hover:bg-white/10 text-slate-200 hover:text-[#C9A227] transition"
                title="Acesso Administrativo"
                aria-label="Abrir login administrativo"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}

            {/* Botão Hambúrguer Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-slate-100"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Painel lateral direito */}
          <div className="fixed inset-y-0 right-0 w-[280px] max-w-full bg-[#1E3A5F] text-white p-6 shadow-2xl flex flex-col justify-between animate-slide-left">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <AdtcLogo className="w-8 h-8 border border-[#C9A227] bg-white" />
                  <div className="min-w-0">
                    <span className="font-serif font-bold text-sm text-white truncate block">
                      {config.nomeIgreja || 'Gestão Eclesiástica'}
                    </span>
                    <span className="block text-[9px] uppercase tracking-wider text-[#C9A227] truncate">
                      {config.siglaIgreja || 'Comunhão'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-slate-300 hover:text-white"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 flex flex-col space-y-2">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? 'bg-[#C9A227] text-[#1E3A5F] font-semibold'
                          : 'text-slate-200 hover:bg-white/10 hover:text-[#C9A227]'
                      }`
                    }
                  >
                    <span>{link.label}</span>
                    <ChevronRight className="w-4 h-4 opacity-60" />
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/10">
              {isAdmin ? (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#C9A227] text-[#1E3A5F] font-semibold text-sm hover:bg-[#B08E1E] transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Painel Administrativo
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    openLoginModal()
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 text-slate-100 hover:text-[#C9A227] hover:bg-white/20 transition text-sm font-medium"
                >
                  <Lock className="w-4 h-4" />
                  Área dos Administradores
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 pt-20 overflow-x-hidden w-full max-w-full">
        <Outlet />
      </main>

      {/* Footer Solene */}
      <footer className="bg-[#1E3A5F] text-white mt-16 border-t-4 border-[#C9A227]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Coluna 1: Igreja */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <AdtcLogo className="w-10 h-10 border-2 border-[#C9A227] bg-white" />
                <div>
                  <h3 className="font-serif font-bold text-lg text-white leading-tight">
                    {config.nomeIgreja || 'Gestão Eclesiástica'}
                  </h3>
                  <span className="text-[10px] text-[#C9A227] font-semibold uppercase tracking-wider">
                    {config.siglaIgreja || 'Templo Central'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {config.textoRodape ||
                  'Igreja Evangélica. Uma igreja acolhedora, comprometida com a pregação bíblica, comunhão fraternal e a glória de Deus.'}
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-[#C9A227]">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{config.enderecoSede || 'Sede'}</span>
              </div>
            </div>

            {/* Coluna 2: Unidades e Congregações */}
            <div className="space-y-3">
              <h4 className="font-serif font-semibold text-sm text-[#C9A227] tracking-wider uppercase">
                {total} {total === 1 ? 'Unidade' : 'Unidades'} •{' '}
                {config.labelUnidades || 'Congregações'}
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {(congregacoes || []).map((item, idx) => {
                  const isSede = item.nome.trim().toLowerCase() === 'sede'
                  return (
                    <li key={item.id || item.nome || idx} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227] mt-1.5 flex-shrink-0" />
                      <span className="text-slate-300">
                        {isSede ? (
                          <>
                            <strong className="italic font-bold text-amber-300 text-sm">
                              Templo Sede:
                            </strong>{' '}
                            {item.endereco || 'Rua Alberto Batista Fontenele, 141'}
                          </>
                        ) : (
                          <span className="italic font-bold text-slate-200 text-sm">
                            {item.nome}
                          </span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Coluna 3: Links Rápidos */}
            <div className="space-y-3">
              <h4 className="font-serif font-semibold text-sm text-[#C9A227] tracking-wider uppercase">
                Navegação
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                <li>
                  <Link
                    to="/obreiros"
                    className="hover:text-[#C9A227] transition inline-block py-0.5"
                  >
                    Corpo de Obreiros
                  </Link>
                </li>
                <li>
                  <Link
                    to="/agenda-semanal"
                    className="hover:text-[#C9A227] transition inline-block py-0.5"
                  >
                    Agenda Semanal de Cultos
                  </Link>
                </li>
                <li>
                  <Link
                    to="/escala"
                    className="hover:text-[#C9A227] transition inline-block py-0.5"
                  >
                    Escala de Trabalho
                  </Link>
                </li>
                <li>
                  <Link
                    to="/congregacoes"
                    className="hover:text-[#C9A227] transition inline-block py-0.5"
                  >
                    Relação de Congregações
                  </Link>
                </li>

                <li>
                  <Link
                    to="/calendario"
                    className="hover:text-[#C9A227] transition inline-block py-0.5"
                  >
                    Calendário de Festas
                  </Link>
                </li>
                <li>
                  <Link
                    to="/escala"
                    className="hover:text-[#C9A227] transition inline-block py-0.5"
                  >
                    Escala de Trabalho
                  </Link>
                </li>
                <li>
                  <Link
                    to="/doacoes"
                    className="hover:text-[#C9A227] transition inline-block py-0.5"
                  >
                    Doações e Dízimos (PIX)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Coluna 4: Informações, Redes Sociais e Admin */}
            <div className="space-y-3">
              <h4 className="font-serif font-semibold text-sm text-[#C9A227] tracking-wider uppercase">
                Redes Sociais & Contato
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Acompanhe as transmissões, avisos e cultos ao vivo pelo nosso Instagram oficial:
              </p>
              {config.instagramUrl && (
                <div>
                  <a
                    href={config.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 text-white text-xs font-semibold hover:opacity-95 transition shadow-sm"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                    <span>Instagram Oficial</span>
                  </a>
                </div>
              )}
              <div className="pt-2">
                <button
                  onClick={openLoginModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs text-slate-200 hover:text-white transition"
                >
                  <Lock className="w-3.5 h-3.5 text-[#C9A227]" />
                  Acesso Restrito aos Administradores
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
            <p>
              © {new Date().getFullYear()} {config.nomeIgreja || 'Gestão Eclesiástica'} — Todos os
              direitos reservados.
            </p>
            <p className="text-slate-500">
              {config.denominacao || config.subtituloIgreja || 'Igreja Evangélica'}
            </p>
          </div>
        </div>
      </footer>

      {/* Modal de Login e Widget de Assistente Virtual */}
      <LoginModal />
      <AssistantWidget />
    </div>
  )
}

export default Layout
