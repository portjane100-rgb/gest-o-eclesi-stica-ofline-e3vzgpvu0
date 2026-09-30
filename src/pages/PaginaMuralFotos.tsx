import React from 'react'
import { MuralDeFotos } from '@/components/MuralDeFotos'
import { useAuth } from '@/contexts/AuthContext'
import { Camera, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export const PaginaMuralFotos: React.FC = () => {
  const { isAdmin } = useAuth()

  return (
    <div className="py-8 sm:py-12 space-y-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-[#1E3A5F]">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Voltar para a Página Inicial
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MuralDeFotos isAdmin={isAdmin} />
      </div>
    </div>
  )
}

export default PaginaMuralFotos
