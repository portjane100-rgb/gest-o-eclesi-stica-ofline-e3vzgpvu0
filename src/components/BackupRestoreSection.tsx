import React, { useState, useEffect } from 'react'
import {
  Download,
  Upload,
  HardDrive,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileCheck,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import {
  exportarBackupCompleto,
  validarArquivoBackup,
  restaurarBackup,
  deveExibirLembreteBackup,
  getUltimaDataBackup,
  type BackupMetadata,
  type BackupFileContent,
} from '@/lib/backupService'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'

export const BackupRestoreSection: React.FC = () => {
  const { config } = useChurchConfig()

  const [exportando, setExportando] = useState(false)
  const [restaurando, setRestaurando] = useState(false)
  const [ultimaData, setUltimaData] = useState<string | null>(null)
  const [lembrete, setLembrete] = useState<{
    deveLembrar: boolean
    diasSemBackup: number
    ultimoBackup: Date | null
  }>({ deveLembrar: false, diasSemBackup: 0, ultimoBackup: null })

  // Estados do Modal / Confirmação de Restauração
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  const [metadataValidada, setMetadataValidada] = useState<BackupMetadata | null>(null)
  const [conteudoValidado, setConteudoValidado] = useState<BackupFileContent | null>(null)
  const [confirmacaoTexto, setConfirmacaoTexto] = useState('')
  const [erroRestauracao, setErroRestauracao] = useState<string | null>(null)

  const carregarStatusBackup = () => {
    const data = getUltimaDataBackup()
    setUltimaData(data)
    setLembrete(deveExibirLembreteBackup(7))
  }

  useEffect(() => {
    carregarStatusBackup()
  }, [])

  // Exportar Backup
  const handleExportar = async () => {
    setExportando(true)
    try {
      const res = await exportarBackupCompleto(config.nomeIgreja)
      toast({
        title: 'Backup concluído com sucesso!',
        description: `Arquivo ${res.filename} gerado com ${res.totalRecords} registros exportados. Guarde-o em seu pendrive ou pasta segura.`,
      })
      carregarStatusBackup()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar backup',
        description: err?.message || 'Falha ao exportar registros locais.',
      })
    } finally {
      setExportando(false)
    }
  }

  // Seleção e validação do arquivo de restauração
  const handleSelecionarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setArquivoSelecionado(file)
    setErroRestauracao(null)
    setMetadataValidada(null)
    setConteudoValidado(null)
    setConfirmacaoTexto('')

    const val = await validarArquivoBackup(file)
    if (!val.valido || !val.rawContent) {
      setErroRestauracao(val.error || 'Arquivo de backup inválido.')
      toast({
        variant: 'destructive',
        title: 'Arquivo inválido',
        description: val.error || 'Não foi possível validar o arquivo de backup.',
      })
      return
    }

    setMetadataValidada(val.metadata || null)
    setConteudoValidado(val.rawContent)
  }

  // Executar restauração com confirmação explícita
  const handleExecutarRestauracao = async () => {
    if (!conteudoValidado) return
    if (confirmacaoTexto.trim().toUpperCase() !== 'RESTAURAR') {
      toast({
        variant: 'destructive',
        title: 'Confirmação necessária',
        description: 'Digite exatamente a palavra RESTAURAR para autorizar a operação.',
      })
      return
    }

    setRestaurando(true)
    try {
      const res = await restaurarBackup(conteudoValidado)
      toast({
        title: 'Banco local restaurado com sucesso!',
        description: `${res.totalRestaurado} registros foram restaurados no seu computador. A página será recarregada.`,
      })

      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na restauração',
        description: err?.message || 'Falha ao restaurar dados.',
      })
      setRestaurando(false)
    }
  }

  const cancelarRestauracao = () => {
    setArquivoSelecionado(null)
    setMetadataValidada(null)
    setConteudoValidado(null)
    setConfirmacaoTexto('')
    setErroRestauracao(null)
  }

  return (
    <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-blue-600 via-[#1E3A5F] to-emerald-600" />
      <CardHeader className="p-5 sm:p-6 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="font-serif text-xl font-bold text-[#1E3A5F] flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-[#C9A227]" />
              Backup & Restauração Local (Pendrive / Pasta)
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-[#5A5A5A] mt-1">
              Como o sistema funciona 100% no computador da igreja de forma offline e independente,
              faça backups regulares para salvar os dados em segurança em um pendrive ou pasta na
              nuvem.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono font-medium border border-slate-200">
              Arquivo .adtcbackup
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 pt-2 space-y-5">
        {/* Lembrete Periódico de Backup */}
        {lembrete.deveLembrar && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h5 className="font-bold text-amber-900">
                {ultimaData
                  ? `Lembrete: Faz ${lembrete.diasSemBackup} dias desde o último backup`
                  : 'Nenhum backup recente foi detectado neste computador!'}
              </h5>
              <p className="text-amber-800 leading-relaxed">
                Recomendamos exportar uma cópia de segurança pelo menos a cada 7 dias para evitar
                perda de lançamentos e cadastros em caso de falha no computador.
              </p>
            </div>
          </div>
        )}

        {/* Status do último backup */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Clock className="w-4 h-4 text-[#1E3A5F]" />
              Último Backup Realizado
            </div>
            <div className="text-sm font-medium text-slate-900">
              {ultimaData ? (
                new Date(ultimaData).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              ) : (
                <span className="text-amber-700 font-normal">Ainda não realizado</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Clique no botão ao lado para baixar uma cópia atualizada agora mesmo.
            </p>
            <Button
              type="button"
              onClick={handleExportar}
              disabled={exportando}
              className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white text-xs font-semibold h-9 gap-1.5 shadow-2xs mt-1"
            >
              {exportando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-[#C9A227]" />
              )}
              {exportando ? 'Exportando dados...' : 'Exportar Backup Completo'}
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Upload className="w-4 h-4 text-emerald-600" />
              Restaurar Dados a partir de um Arquivo
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Substitui a base deste computador com o arquivo de backup exportado anteriormente.
            </p>
            <label className="block">
              <input
                type="file"
                accept=".adtcbackup,.json"
                onChange={handleSelecionarArquivo}
                className="hidden"
                id="input-restaurar-backup"
              />
              <span className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-300 rounded-md cursor-pointer transition-colors shadow-2xs">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Selecionar Arquivo de Backup...
              </span>
            </label>
          </div>
        </div>

        {/* Caixa de Confirmação de Restauração quando arquivo é selecionado */}
        {arquivoSelecionado && metadataValidada && (
          <div className="p-4 sm:p-5 rounded-xl border border-amber-300 bg-amber-50/60 space-y-4">
            <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Confirmação de Restauração de Dados
            </div>

            <div className="text-xs text-amber-900 space-y-1.5 bg-white p-3 rounded-lg border border-amber-200">
              <div>
                <strong>Igreja no Backup:</strong> {metadataValidada.churchName || 'ADTC'}
              </div>
              <div>
                <strong>Data de Exportação:</strong>{' '}
                {new Date(metadataValidada.exportDate).toLocaleString('pt-BR')}
              </div>
              <div>
                <strong>Total de Registros:</strong> {metadataValidada.totalRecords}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-amber-950 font-semibold">
                ⚠️ AVISO: Esta ação irá substituir os registros atuais do banco deste computador
                pelos dados contidos no arquivo selecionado.
              </p>
              <label className="block text-xs text-slate-700 font-medium">
                Para confirmar, digite <strong>RESTAURAR</strong> no campo abaixo:
              </label>
              <input
                type="text"
                value={confirmacaoTexto}
                onChange={(e) => setConfirmacaoTexto(e.target.value)}
                placeholder="Digite RESTAURAR"
                className="h-9 px-3 text-xs w-full sm:max-w-xs border border-amber-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelarRestauracao}
                disabled={restaurando}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExecutarRestauracao}
                disabled={restaurando || confirmacaoTexto.trim().toUpperCase() !== 'RESTAURAR'}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
              >
                {restaurando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                )}
                {restaurando ? 'Restaurando...' : 'Confirmar e Restaurar Dados'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BackupRestoreSection
