import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Church, ArrowLeft } from 'lucide-react'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'

export const NotFound: React.FC = () => {
  const { config } = useChurchConfig()

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16 space-y-4">
      <div className="w-16 h-16 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] flex items-center justify-center">
        <Church className="w-8 h-8 text-[#C9A227]" />
      </div>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1E3A5F]">
        Página não encontrada
      </h1>
      <p className="text-sm text-[#5A5A5A] max-w-md">
        A página solicitada não existe ou foi movida. Retorne à página inicial da{' '}
        {config.siglaIgreja || config.nomeIgreja || 'Igreja'}.
      </p>
      <Button asChild className="bg-[#1E3A5F] hover:bg-[#16304F] text-white">
        <Link to="/" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Início
        </Link>
      </Button>
    </div>
  )
}

export default NotFound
