import React, { useState } from 'react'
import { FileText, Save, RotateCcw, Check, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { useChurchConfig, CHURCH_CONFIG_DEFAULTS } from '@/contexts/ChurchConfigContext'

export const ModelosDocumentosSection: React.FC = () => {
  const { config, updateConfigKeys } = useChurchConfig()

  const [cartaRecomendacao, setCartaRecomendacao] = useState(
    config.modeloCartaRecomendacao || CHURCH_CONFIG_DEFAULTS.modeloCartaRecomendacao || '',
  )
  const [cartaMudanca, setCartaMudanca] = useState(
    config.modeloCartaMudanca || CHURCH_CONFIG_DEFAULTS.modeloCartaMudanca || '',
  )
  const [certificadoApresentacao, setCertificadoApresentacao] = useState(
    config.modeloCertificadoApresentacao ||
      CHURCH_CONFIG_DEFAULTS.modeloCertificadoApresentacao ||
      '',
  )

  const [salvando, setSalvando] = useState(false)

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      await updateConfigKeys({
        modelo_carta_recomendacao: cartaRecomendacao,
        modelo_carta_mudanca: cartaMudanca,
        modelo_certificado_apresentacao: certificadoApresentacao,
      })

      toast({
        title: 'Modelos de documentos atualizados!',
        description: 'Os novos textos serão aplicados aos próximos PDFs gerados.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar modelos',
        description: err?.message || 'Falha ao salvar no banco local.',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleRestaurarPadrao = () => {
    setCartaRecomendacao(CHURCH_CONFIG_DEFAULTS.modeloCartaRecomendacao || '')
    setCartaMudanca(CHURCH_CONFIG_DEFAULTS.modeloCartaMudanca || '')
    setCertificadoApresentacao(CHURCH_CONFIG_DEFAULTS.modeloCertificadoApresentacao || '')
    toast({
      title: 'Padrões restaurados no formulário',
      description: 'Clique em "Salvar Modelos" para confirmar a gravação.',
    })
  }

  return (
    <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
      <div className="h-1.5 bg-[#1E3A5F]" />
      <CardHeader className="p-5 sm:p-6 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="font-serif text-xl font-bold text-[#1E3A5F] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C9A227]" />
              Modelos de Textos dos Documentos PDF
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-[#5A5A5A] mt-1">
              Personalize os textos oficiais impressos nas Cartas de Recomendação, Mudança e
              Certificados de Apresentação sem precisar mexer em código.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRestaurarPadrao}
              className="text-xs border-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Restaurar Padrão
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSalvar}
              disabled={salvando}
              className="bg-[#1E3A5F] hover:bg-[#152a45] text-white text-xs font-semibold gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-[#C9A227]" />
              {salvando ? 'Salvando...' : 'Salvar Modelos'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 pt-2 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-800">
            Texto Principal • Carta de Recomendação
          </Label>
          <Textarea
            rows={3}
            value={cartaRecomendacao}
            onChange={(e) => setCartaRecomendacao(e.target.value)}
            className="text-xs sm:text-sm border-[#E6E2D8] bg-[#FDFCFB]"
            placeholder="Texto do corpo da carta de recomendação..."
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-800">
            Texto Principal • Carta de Mudança / Transferência
          </Label>
          <Textarea
            rows={3}
            value={cartaMudanca}
            onChange={(e) => setCartaMudanca(e.target.value)}
            className="text-xs sm:text-sm border-[#E6E2D8] bg-[#FDFCFB]"
            placeholder="Texto do corpo da carta de mudança..."
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-800">
            Texto Principal • Certificado de Apresentação de Crianças
          </Label>
          <Textarea
            rows={3}
            value={certificadoApresentacao}
            onChange={(e) => setCertificadoApresentacao(e.target.value)}
            className="text-xs sm:text-sm border-[#E6E2D8] bg-[#FDFCFB]"
            placeholder="Texto do corpo do certificado de apresentação..."
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default ModelosDocumentosSection
