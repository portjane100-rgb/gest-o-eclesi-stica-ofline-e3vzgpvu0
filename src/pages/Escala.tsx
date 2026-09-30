import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import type { EscalaSemanaItem } from '@/types/adtc'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Download, Share2, Sparkles, FileText } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import { VisualizadorEscalaSemana } from '@/components/VisualizadorEscalaSemana'
import { imprimirOuBaixarPdfEscalaSemana, compartilharEscalaSemana } from '@/lib/escalaSemanaUtils'

export const Escala: React.FC = () => {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { config } = useChurchConfig()

  const [semanas, setSemanas] = useState<EscalaSemanaItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const res = await pb.collection('escala_semana').getFullList<EscalaSemanaItem>({
        sort: '-data_inicio',
      })
      setSemanas(res)
    } catch (err) {
      console.error('Erro ao buscar escalas da semana:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Escala da semana ativa (ou a mais recente)
  const semanaPrincipal = semanas.find((s) => s.ativa) || (semanas.length > 0 ? semanas[0] : null)
  const outrasSemanas = semanaPrincipal ? semanas.filter((s) => s.id !== semanaPrincipal.id) : []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Cabeçalho */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <Badge className="bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40 uppercase tracking-widest text-xs font-semibold">
          Serviço e Ministério
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1E3A5F]">
          Escala de Trabalho
        </h1>
        <p className="text-sm sm:text-base text-[#5A5A5A] leading-relaxed">
          Escala oficial da Sede e congregações: atividades com horário, obreiros escalados,
          professoras nas salinhas e equipe de recepção.
        </p>

        {/* Botões de Ação Pública e Gestão */}
        <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
          {semanaPrincipal && (
            <>
              <Button
                onClick={async () => {
                  await imprimirOuBaixarPdfEscalaSemana(semanaPrincipal, {
                    nomeIgreja: config.nomeIgreja,
                    subtituloIgreja: config.subtituloIgreja,
                    denominacao: config.denominacao,
                    enderecoIgreja: config.enderecoIgreja,
                    cidadeUf: config.cidadeUf,
                    nomePastor: config.nomePastor,
                    siglaIgreja: config.siglaIgreja,
                  })
                }}
                className="bg-[#C9A227] hover:bg-[#B08E1E] text-[#1E3A5F] font-bold text-xs sm:text-sm shadow-md transition hover:scale-105 active:scale-95"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Baixar Escala da Semana (PDF)
              </Button>
              <Button
                onClick={async () => {
                  const res = await compartilharEscalaSemana(semanaPrincipal, () => {
                    toast({
                      title: 'Escala copiada!',
                      description: 'Texto pronto para colar no WhatsApp.',
                    })
                  })
                  if (res === 'shared') toast({ title: 'Compartilhado com sucesso!' })
                }}
                variant="outline"
                className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/10 text-xs sm:text-sm"
              >
                <Share2 className="w-4 h-4 mr-1.5 text-[#1E3A5F]" />
                Compartilhar no WhatsApp
              </Button>
            </>
          )}

          {isAdmin && (
            <Link to="/admin/escala">
              <Button className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold shadow-md">
                <Plus className="w-4 h-4 mr-1.5" />
                Gerenciar Escalas no Painel
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* =========================================================================
          SEÇÃO 1: ESCALA DA SEMANA OFICIAL (DESTAQUE PRINCIPAL)
      ========================================================================= */}
      {semanaPrincipal ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C9A227]" />
              Escala da Semana em Destaque
            </h2>
            <span className="text-xs text-[#5A5A5A]">7 dias de atividades litúrgicas</span>
          </div>

          <VisualizadorEscalaSemana
            semana={semanaPrincipal}
            showActions={true}
            initialExpanded={true}
          />
        </div>
      ) : null}

      {/* Outras semanas cadastradas anteriormente */}
      {outrasSemanas.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[#E6E2D8]">
          <h3 className="font-serif text-lg font-bold text-[#1E3A5F] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#C9A227]" />
            Outras Semanas Arquivadas
          </h3>
          <div className="space-y-4">
            {outrasSemanas.map((sem) => (
              <VisualizadorEscalaSemana
                key={sem.id}
                semana={sem}
                showActions={true}
                initialExpanded={false}
              />
            ))}
          </div>
        </div>
      )}

      {semanas.length === 0 && !loading && (
        <Card className="border-[#E6E2D8] bg-white p-12 text-center text-[#5A5A5A] rounded-2xl">
          <p>Nenhuma escala da semana publicada no momento.</p>
          {isAdmin && (
            <Link to="/admin/escala">
              <Button className="mt-4 bg-[#1E3A5F] text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                Cadastrar Primeira Escala da Semana
              </Button>
            </Link>
          )}
        </Card>
      )}
    </div>
  )
}

export default Escala
