import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { useAuth } from '@/contexts/AuthContext'

export const ProtectedFinanceiroRoute: React.FC<{
  children: React.ReactNode
  podeAcessar?: boolean
}> = ({ children, podeAcessar: podeAcessarProp }) => {
  const { podeAcessarFinanceiro } = useAuth()
  const podeAcessar = podeAcessarProp !== undefined ? podeAcessarProp : podeAcessarFinanceiro
  if (!podeAcessar) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card className="border-[#E6E2D8] bg-white shadow-md rounded-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-[#1E3A5F]" />
          <CardContent className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-200 inline-block">
                Acesso Restrito ao Tesoureiro
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1E3A5F]">
                Sessão Financeira Bloqueada
              </h2>
              <p className="text-xs sm:text-sm text-[#5A5A5A] max-w-md mx-auto leading-relaxed">
                As sessões de <strong>Dizimistas &amp; Planilha Mensal de Entradas</strong>{' '}
                (dízimos, ofertas, contabilidade e repasse para a SEDE) são de acesso exclusivo do{' '}
                <strong>Tesoureiro</strong> da igreja.
              </p>
            </div>

            <div className="p-3.5 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] text-left text-xs text-[#5A5A5A] space-y-1 max-w-md mx-auto">
              <div className="flex items-center gap-1.5 font-bold text-[#1E3A5F]">
                <Lock className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Perfil Atual: Secretário</span>
              </div>
              <p className="text-[11px]">
                Seu perfil possui permissão completa para Membros, Congregados, Obreiros,
                Patrimônio, Escala, Calendário e Documentos Oficiais.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs w-full sm:w-auto"
              >
                <Link to="/admin">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Voltar ao Dashboard
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-[#E6E2D8] text-[#5A5A5A] text-xs w-full sm:w-auto"
              >
                <Link to="/admin/membros">Ir para Cadastro de Membros</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedFinanceiroRoute
