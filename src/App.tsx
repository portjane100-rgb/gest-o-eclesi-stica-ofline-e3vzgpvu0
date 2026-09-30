import { HashRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChurchConfigProvider } from '@/contexts/ChurchConfigContext'
import { Toaster } from '@/components/ui/toaster'
import AdminLayout from '@/components/AdminLayout'
import { ProtectedAdminRoute } from '@/components/ProtectedAdminRoute'
import { ProtectedFinanceiroRoute } from '@/components/ProtectedFinanceiroRoute'
import LoginPage from '@/pages/LoginPage'
import CarteirinhaPublica from '@/pages/CarteirinhaPublica'
import NotFound from '@/pages/NotFound'

// Páginas Administrativas (Versão Local Desktop)
import Dashboard from '@/pages/admin/Dashboard'
import AdminMembros from '@/pages/admin/AdminMembros'
import AdminCongregados from '@/pages/admin/AdminCongregados'
import AdminObreiros from '@/pages/admin/AdminObreiros'
import AdminDizimistas from '@/pages/admin/AdminDizimistas'
import AdminPatrimonio from '@/pages/admin/AdminPatrimonio'
import AdminEscala from '@/pages/admin/AdminEscala'
import AdminCalendario from '@/pages/admin/AdminCalendario'
import AdminDocumentos from '@/pages/admin/AdminDocumentos'
import AdminConfig from '@/pages/admin/AdminConfig'

export function App() {
  return (
    <AuthProvider>
      <ChurchConfigProvider>
        <HashRouter>
          <Routes>
            {/* A tela de login local passa a ser a porta de entrada do sistema */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Carteirinha para visualização / impressão local */}
            <Route path="/carteirinha" element={<CarteirinhaPublica />} />
            <Route path="/carteirinha/:id" element={<CarteirinhaPublica />} />

            {/* Painel Administrativo Local */}
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="membros" element={<AdminMembros />} />
              <Route path="congregados" element={<AdminCongregados />} />
              <Route
                path="dizimistas"
                element={
                  <ProtectedFinanceiroRoute>
                    <AdminDizimistas />
                  </ProtectedFinanceiroRoute>
                }
              />
              <Route path="escala" element={<AdminEscala />} />
              <Route path="calendario" element={<AdminCalendario />} />
              <Route path="patrimonio" element={<AdminPatrimonio />} />
              <Route path="obreiros" element={<AdminObreiros />} />
              <Route path="documentos" element={<AdminDocumentos />} />
              <Route path="config" element={<AdminConfig />} />
            </Route>

            {/* Fallback de rotas desconhecidas */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
        <Toaster />
      </ChurchConfigProvider>
    </AuthProvider>
  )
}

export default App
