import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Download,
  CheckCircle2,
  HardDrive,
  FolderArchive,
  Loader2,
  FileText,
  Monitor,
  Terminal,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { gerarPacoteZipNoCliente, dispararDownloadBlob } from '@/lib/packageZipClient'

interface DownloadPacotePcModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DownloadPacotePcModal: React.FC<DownloadPacotePcModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [baixando, setBaixando] = useState(false)
  const [progressoTexto, setProgressoTexto] = useState('')
  const [progressoPct, setProgressoPct] = useState(0)
  const [downloadConcluido, setDownloadConcluido] = useState(false)

  const nomeArquivoZip = 'Gestao_Eclesiastica_Versao_PC.zip'

  const handleDownload = async () => {
    setBaixando(true)
    setDownloadConcluido(false)
    setProgressoPct(15)
    setProgressoTexto('Localizando pacote compilado...')

    try {
      // 1. Tentar primeiro baixar o arquivo pré-gerado /Gestao_Eclesiastica_Versao_PC.zip
      // que está na raiz de public/dist
      let baixouEstatico = false
      try {
        // Verifica se consegue dar fetch no arquivo estático
        const resp = await fetch(`./${nomeArquivoZip}`)
        if (resp.ok) {
          setProgressoPct(70)
          setProgressoTexto('Baixando pacote (.zip)...')
          const blob = await resp.blob()
          if (blob && blob.size > 1000) {
            dispararDownloadBlob(blob, nomeArquivoZip)
            baixouEstatico = true
          }
        }
      } catch (_) {
        baixouEstatico = false
      }

      if (!baixouEstatico) {
        // Fallback: se o arquivo estático não estiver acessível, constrói via client
        setProgressoPct(40)
        setProgressoTexto('Montando arquivos do sistema offline...')
        const blob = await gerarPacoteZipNoCliente((msg, pct) => {
          setProgressoTexto(msg)
          setProgressoPct(pct)
        })
        dispararDownloadBlob(blob, nomeArquivoZip)
      }

      setProgressoPct(100)
      setProgressoTexto('Download iniciado!')
      setDownloadConcluido(true)

      toast({
        title: 'Download iniciado!',
        description: `O arquivo ${nomeArquivoZip} foi enviado para a sua pasta de downloads.`,
      })
    } catch (err: any) {
      console.error('Erro no download do pacote:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao baixar pacote',
        description:
          err?.message || 'Não foi possível baixar o arquivo. Tente novamente em instantes.',
      })
    } finally {
      setBaixando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl overflow-hidden p-0">
        <div className="h-2 bg-gradient-to-r from-[#1E3A5F] via-[#C9A227] to-emerald-600" />

        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-2 text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#1E3A5F] text-xs font-semibold w-fit">
              <FolderArchive className="w-3.5 h-3.5 text-[#C9A227]" />
              Pacote Instalável para Computador
            </div>
            <DialogTitle className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A5F]">
              Baixar Sistema para Testar no seu PC (100% Offline)
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Baixe o sistema completo compilado em um único arquivo ZIP pronto para usar no seu
              computador ou para distribuição via <strong>Hotmart</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* O que vem dentro do pacote */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
              Conteúdo do Pacote ZIP ({nomeArquivoZip}):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <Terminal className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block">ABRIR_SISTEMA.bat</strong>
                  <span className="text-[11px] text-slate-500">
                    Inicia no Windows em modo app (Edge/Chrome)
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <Monitor className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block">ABRIR_SISTEMA.command</strong>
                  <span className="text-[11px] text-slate-500">
                    Inicia no macOS com duplo clique
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block">LEIA-ME.txt</strong>
                  <span className="text-[11px] text-slate-500">
                    Instruções completas em português para o cliente
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <HardDrive className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block">index.html + assets</strong>
                  <span className="text-[11px] text-slate-500">
                    Sistema compilado offline com banco IndexedDB
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Passo a passo rápido de uso */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-950">
            <div className="font-bold flex items-center gap-1.5 text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Como testar no seu PC:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-emerald-900 leading-relaxed">
              <li>
                Após baixar, clique com o botão direito no ZIP e selecione{' '}
                <strong>Extrair Tudo</strong>.
              </li>
              <li>
                Abra a pasta extraída e dê <strong>duplo clique em ABRIR_SISTEMA.bat</strong> (no
                Windows) ou direto em <strong>index.html</strong>.
              </li>
              <li>
                O sistema abrirá imediatamente e você poderá cadastrar o seu usuário e testar todas
                as telas sem internet.
              </li>
            </ol>
          </div>

          {/* Barra de progresso se estiver baixando */}
          {baixando && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span className="font-medium">{progressoTexto}</span>
                <span className="font-mono">{progressoPct}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#1E3A5F] h-full transition-all duration-300"
                  style={{ width: `${progressoPct}%` }}
                />
              </div>
            </div>
          )}

          {downloadConcluido && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Pronto!</strong> O arquivo <strong>{nomeArquivoZip}</strong> foi baixado.
                Agora basta extrair e abrir no seu computador!
              </span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Fechar
            </Button>
            <Button
              type="button"
              onClick={handleDownload}
              disabled={baixando}
              className="bg-[#1E3A5F] hover:bg-[#152a45] text-white text-xs font-bold gap-2 shadow-sm"
            >
              {baixando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando Pacote...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-[#C9A227]" />
                  Baixar Arquivo ZIP para PC (.zip)
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DownloadPacotePcModal
