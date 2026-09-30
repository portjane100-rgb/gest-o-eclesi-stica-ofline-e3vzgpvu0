import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChurchConfigProvider } from '@/contexts/ChurchConfigContext'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/Layout'
import AdminLayout from '@/components/AdminLayout'
import { ProtectedAdminRoute } from '@/components/ProtectedAdminRoute'
import { ProtectedFinanceiroRoute } from '@/components/ProtectedFinanceiroRoute'
import { useAuth } from '@/contexts/AuthContext'

// Páginas Públicas
import Index from '@/pages/Index'
import Obreiros from '@/pages/Obreiros'
import AgendaSemanal from '@/pages/AgendaSemanal'
import Escala from '@/pages/Escala'
import Congregacoes from '@/pages/Congregacoes'
import Calendario from '@/pages/Calendario'
import Doacoes from '@/pages/Doacoes'
import PaginaSalmos from '@/pages/PaginaSalmos'
import PaginaMuralFotos from '@/pages/PaginaMuralFotos'
import CadastroMembroPublico from '@/pages/CadastroMembroPublico'
import CadastroCongregadoPublico from '@/pages/CadastroCongregadoPublico'
import CarteirinhaPublica from '@/pages/CarteirinhaPublica'
import NotFound from '@/pages/NotFound'

// Páginas do Painel Administrativo
import Dashboard from '@/pages/admin/Dashboard'
import AdminMembros from '@/pages/admin/AdminMembros'
import AdminCongregados from '@/pages/admin/AdminCongregados'
import AdminObreiros from '@/pages/admin/AdminObreiros'
import AdminDizimistas from '@/pages/admin/AdminDizimistas'
import AdminPatrimonio from '@/pages/admin/AdminPatrimonio'
import AdminEscala from '@/pages/admin/AdminEscala'
import AdminCalendario from '@/pages/admin/AdminCalendario'
import AdminDocumentos from '@/pages/admin/AdminDocumentos'
import AdminMuralFotos from '@/pages/admin/AdminMuralFotos'
import AdminConfig from '@/pages/admin/AdminConfig'

export function App() {
  return (
    <AuthProvider>
      <ChurchConfigProvider>
        <BrowserRouter>
          <Routes>
            {/* Rotas Públicas com Header e Footer */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Index />} />
              <Route path="obreiros" element={<Obreiros />} />
              <Route path="agenda-semanal" element={<AgendaSemanal />} />
              <Route path="escala" element={<Escala />} />
              <Route path="congregacoes" element={<Congregacoes />} />
              <Route path="calendario" element={<Calendario />} />
              <Route path="salmos" element={<PaginaSalmos />} />
              <Route path="mural-fotos" element={<PaginaMuralFotos />} />
              <Route path="doacoes" element={<Doacoes />} />
              <Route path="carteirinha" element={<CarteirinhaPublica />} />
              <Route path="cadastro/membro" element={<CadastroMembroPublico />} />
              <Route path="cadastro/congregado" element={<CadastroCongregadoPublico />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Rotas Administrativas Protegidas */}
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="membros" element={<AdminMembros />} />
              <Route path="congregados" element={<AdminCongregados />} />
              <Route path="obreiros" element={<AdminObreiros />} />
              <Route path="dizimistas" element={<AdminDizimistasWrapper />} />
              <Route path="patrimonio" element={<AdminPatrimonio />} />
              <Route path="escala" element={<AdminEscala />} />
              <Route path="calendario" element={<AdminCalendario />} />
              <Route path="mural-fotos" element={<AdminMuralFotos />} />
              <Route path="documentos" element={<AdminDocumentos />} />
              <Route path="config" element={<AdminConfig />} />
            </Route>
          </Routes>
          <Toaster />
        </BrowserRouter>
      </ChurchConfigProvider>
    </AuthProvider>
  )
}

// app
// Wrapper para aplicar a proteção de acesso financeiro restrita ao Tesoureiro
function AdminDizimistasWrapper() {
  const { podeAcessarFinanceiro } = useAuth()
  return (
    <ProtectedFinanceiroRoute podeAcessar={podeAcessarFinanceiro}>
      <AdminDizimistas />
    </ProtectedFinanceiroRoute>
  )
}

export default App
