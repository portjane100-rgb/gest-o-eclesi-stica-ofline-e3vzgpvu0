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
  AlertTriangle,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  gerarPacoteZipNoCliente,
  dispararDownloadBlob,
  ClientZipValidationResult,
} from '@/lib/packageZipClient'

interface DownloadPacotePcModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DownloadPacotePcModal: React.FC<DownloadPacotePcModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [gerando, setGerando] = useState(false)
  const [progressoTexto, setProgressoTexto] = useState('')
  const [progressoPct, setProgressoPct] = useState(0)
  const [downloadConcluido, setDownloadConcluido] = useState(false)
  const [erroMsg, setErroMsg] = useState<string | null>(null)
  const [validacaoInfo, setValidacaoInfo] = useState<ClientZipValidationResult | null>(null)

  const nomeArquivoZip = 'Gestao_Eclesiastica_Versao_PC.zip'

  // Fluxo principal: gera o ZIP diretamente no navegador a partir dos recursos publicados
  const handleGerarEBaixarPacote = async () => {
    setGerando(true)
    setDownloadConcluido(false)
    setErroMsg(null)
    setValidacaoInfo(null)
    setProgressoPct(5)
    setProgressoTexto('Iniciando geração do pacote ZIP no navegador...')

    try {
      const { blob, validacao } = await gerarPacoteZipNoCliente((msg, pct) => {
        setProgressoTexto(msg)
        setProgressoPct(pct)
      })

      // Se a validação não passar, o gerador dispara exceção, mas por garantia extra:
      if (!validacao.valido || validacao.erros.length > 0) {
        throw new Error(validacao.erros.join(' | '))
      }

      setValidacaoInfo(validacao)

      // Disparar o download do Blob autônomo validado
      dispararDownloadBlob(blob, nomeArquivoZip)
      setProgressoPct(100)
      setProgressoTexto('Download concluído!')
      setDownloadConcluido(true)

      toast({
        title: 'Download concluído!',
        description: `O pacote ${nomeArquivoZip} (${(blob.size / (1024 * 1024)).toFixed(2)} MB) foi gerado e enviado para a sua pasta de downloads.`,
      })
    } catch (err: any) {
      console.error('Erro na geração do pacote PC:', err)
      const msg = err?.message || 'Falha ao gerar o pacote autônomo no navegador.'
      setErroMsg(msg)
      setDownloadConcluido(false)
      toast({
        variant: 'destructive',
        title: 'Falha na geração do pacote',
        description: msg,
      })
    } finally {
      setGerando(false)
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
              Gera diretamente no seu navegador um arquivo ZIP autônomo e completo, pronto para
              executar no Windows sem depender de servidores ou conexão com a internet.
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
                <Terminal className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block">INSTALAR.bat</strong>
                  <span className="text-[11px] text-slate-500">
                    Instalador automático com atalho na Área de Trabalho
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

              <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200 sm:col-span-2">
                <HardDrive className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block">index.html autônomo (Inlined)</strong>
                  <span className="text-[11px] text-slate-500">
                    HTML com todos os estilos, scripts e fontes embutidos para funcionamento 100%
                    offline em file://
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
                Abra a pasta extraída e dê <strong>duplo clique em INSTALAR.bat</strong> (para criar
                o atalho) ou em <strong>ABRIR_SISTEMA.bat</strong>.
              </li>
              <li>
                O sistema abrirá imediatamente e você poderá cadastrar o seu usuário e testar todas
                as telas sem internet.
              </li>
            </ol>
          </div>

          {/* Barra de progresso durante a geração */}
          {gerando && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span className="font-medium flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1E3A5F]" />
                  {progressoTexto}
                </span>
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

          {/* Mensagem de Erro com detalhes do recurso */}
          {erroMsg && !gerando && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Falha ao gerar o pacote ZIP:</strong>
                <span className="text-[11px] leading-relaxed break-words">{erroMsg}</span>
              </div>
            </div>
          )}

          {/* Mensagem de Sucesso */}
          {downloadConcluido && !gerando && !erroMsg && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong>Download concluído com sucesso!</strong>
                <p className="text-[11px] mt-0.5 text-emerald-800">
                  O arquivo <strong>{nomeArquivoZip}</strong> foi validado e gerado com{' '}
                  {validacaoInfo?.totalArquivos ?? 'todos os'} arquivos essenciais.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
              disabled={gerando}
            >
              Fechar
            </Button>
            <Button
              type="button"
              onClick={handleGerarEBaixarPacote}
              disabled={gerando}
              className="font-bold text-xs h-9 px-4 bg-[#1E3A5F] hover:bg-[#152a45] text-white gap-2 shadow-sm transition-colors"
            >
              {gerando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                  Gerando Pacote...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-[#C9A227]" />
                  Gerar e Baixar Pacote ZIP para PC (.zip)
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
