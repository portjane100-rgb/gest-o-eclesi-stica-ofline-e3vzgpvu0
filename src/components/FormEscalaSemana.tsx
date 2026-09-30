import React, { useState, useEffect } from 'react'
import type { EscalaSemanaItem, EscalaSemanaDia } from '@/types/adtc'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Info,
  CheckCircle,
  Users,
  Baby,
  User,
  Image as ImageIcon,
  X,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { compressImage } from '@/lib/imageCompressor'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'
import {
  formatarDataBr,
  calcularDataFim,
  gerarTituloEscala,
  criarEstruturaDiasInicial,
  EXEMPLO_REFERENCIA_SEMANA,
  calcularDataDoDia,
} from '@/lib/escalaSemanaUtils'

interface FormEscalaSemanaProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    data: {
      titulo: string
      data_inicio: string
      data_fim: string
      dias: EscalaSemanaDia[]
      observacoes?: string
      ativa?: boolean
    },
    novasFotos: File[],
    fotosMantidas: string[],
  ) => Promise<void>
  editingItem?: EscalaSemanaItem | null
  isSubmitting?: boolean
}

export const FormEscalaSemana: React.FC<FormEscalaSemanaProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  isSubmitting = false,
}) => {
  const { config } = useChurchConfig()
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [dias, setDias] = useState<EscalaSemanaDia[]>(criarEstruturaDiasInicial())
  const [observacoes, setObservacoes] = useState('')
  const [ativa, setAtiva] = useState(true)
  const [fotosExistentes, setFotosExistentes] = useState<string[]>([])
  const [novasFotos, setNovasFotos] = useState<{ file: File; previewUrl: string }[]>([])
  const [compressingPhotos, setCompressingPhotos] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Título gerado automaticamente
  const tituloGerado = gerarTituloEscala(dataInicio, dataFim)

  useEffect(() => {
    if (editingItem) {
      const inicio = editingItem.data_inicio ? editingItem.data_inicio.slice(0, 10) : ''
      const fim = editingItem.data_fim ? editingItem.data_fim.slice(0, 10) : ''
      setDataInicio(inicio)
      setDataFim(fim)
      setObservacoes(editingItem.observacoes || '')
      setAtiva(editingItem.ativa ?? true)
      setFotosExistentes(editingItem.fotos || [])
      setNovasFotos([])

      if (editingItem.dias && editingItem.dias.length > 0) {
        setDias(
          editingItem.dias.map((d) => ({
            ...d,
            atividades: d.atividades && d.atividades.length > 0 ? d.atividades : [''],
          })),
        )
      } else {
        setDias(criarEstruturaDiasInicial(inicio))
      }
      setErrors({})
    } else if (isOpen) {
      // Valor padrão para nova semana: próxima segunda-feira ou hoje se for segunda
      const hoje = new Date()
      const diaSemana = hoje.getDay() // 0 dom, 1 seg, ..., 6 sab
      const diasAteSegunda = diaSemana === 1 ? 0 : (8 - diaSemana) % 7
      const proximaSegunda = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate() + diasAteSegunda,
      )

      const y = proximaSegunda.getFullYear()
      const m = String(proximaSegunda.getMonth() + 1).padStart(2, '0')
      const d = String(proximaSegunda.getDate()).padStart(2, '0')
      const inicioStr = `${y}-${m}-${d}`
      const fimStr = calcularDataFim(inicioStr)

      setDataInicio(inicioStr)
      setDataFim(fimStr)
      setDias(criarEstruturaDiasInicial(inicioStr))
      setObservacoes(
        `Escala oficial da ${config.siglaIgreja || config.nomeIgreja || 'igreja'} (Sede e congregações).`,
      )
      setAtiva(true)
      setFotosExistentes([])
      setNovasFotos([])
      setErrors({})
    }
  }, [editingItem, isOpen])

  const handleUploadFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      setCompressingPhotos(true)
      const adicionadas: { file: File; previewUrl: string }[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const res = await compressImage(file, {
          maxDimension: 1000,
          quality: 0.85,
          mimeType: 'image/jpeg',
        })
        adicionadas.push({ file: res.file, previewUrl: res.previewUrl })
      }
      setNovasFotos((prev) => [...prev, ...adicionadas])
    } catch (err) {
      console.error('Erro ao comprimir fotos do culto:', err)
    } finally {
      setCompressingPhotos(false)
    }
  }

  const handleRemoverFotoExistente = (nomeArquivo: string) => {
    setFotosExistentes((prev) => prev.filter((f) => f !== nomeArquivo))
  }

  const handleRemoverNovaFoto = (index: number) => {
    setNovasFotos((prev) => prev.filter((_, idx) => idx !== index))
  }

  // Ao alterar a data de início, recalcular data de término e datas dos dias
  const handleDataInicioChange = (novoInicio: string) => {
    setDataInicio(novoInicio)
    const novoFim = calcularDataFim(novoInicio)
    setDataFim(novoFim)

    // Atualiza datas dos 7 dias
    setDias((prev) =>
      prev.map((diaItem, idx) => ({
        ...diaItem,
        data: calcularDataDoDia(novoInicio, idx),
      })),
    )
  }

  // Manipulação de atividades de um dia
  const handleAddAtividade = (diaIdx: number) => {
    setDias((prev) => {
      const copy = [...prev]
      const currentAtivs = copy[diaIdx].atividades || []
      copy[diaIdx] = {
        ...copy[diaIdx],
        atividades: [...currentAtivs, ''],
      }
      return copy
    })
  }

  const handleUpdateAtividade = (diaIdx: number, ativIdx: number, valor: string) => {
    setDias((prev) => {
      const copy = [...prev]
      const currentAtivs = [...(copy[diaIdx].atividades || [])]
      currentAtivs[ativIdx] = valor
      copy[diaIdx] = {
        ...copy[diaIdx],
        atividades: currentAtivs,
      }
      return copy
    })
  }

  const handleRemoveAtividade = (diaIdx: number, ativIdx: number) => {
    setDias((prev) => {
      const copy = [...prev]
      const currentAtivs = (copy[diaIdx].atividades || []).filter((_, idx) => idx !== ativIdx)
      copy[diaIdx] = {
        ...copy[diaIdx],
        atividades: currentAtivs.length > 0 ? currentAtivs : [''],
      }
      return copy
    })
  }

  // Atualização dos campos livres de designação
  const handleUpdateDesignacao = (
    diaIdx: number,
    campo: 'obreiros_escalados' | 'professoras_salinhas' | 'recepcao',
    valor: string,
  ) => {
    setDias((prev) => {
      const copy = [...prev]
      copy[diaIdx] = {
        ...copy[diaIdx],
        [campo]: valor,
      }
      return copy
    })
  }

  // Carregar dados de exemplo do usuário
  const handleCarregarExemploUsuario = () => {
    setDataInicio('2026-09-21')
    setDataFim('2026-09-27')
    setDias(EXEMPLO_REFERENCIA_SEMANA)
    setObservacoes(
      `Escala oficial da ${config.siglaIgreja || config.nomeIgreja || 'igreja'} (Sede e congregações).`,
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!dataInicio) newErrors.dataInicio = 'A data de início é obrigatória.'
    if (!dataFim) newErrors.dataFim = 'A data de término é obrigatória.'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Limpar atividades vazias
    const diasLimpos: EscalaSemanaDia[] = dias.map((d) => ({
      dia: d.dia,
      data: d.data || '',
      atividades: (d.atividades || []).map((a) => a.trim()).filter((a) => a.length > 0),
      obreiros_escalados: d.obreiros_escalados?.trim() || '',
      professoras_salinhas: d.professoras_salinhas?.trim() || '',
      recepcao: d.recepcao?.trim() || '',
    }))

    await onSave(
      {
        titulo: tituloGerado,
        data_inicio: dataInicio,
        data_fim: dataFim,
        dias: diasLimpos,
        observacoes: observacoes.trim(),
        ativa,
      },
      novasFotos.map((item) => item.file),
      fotosExistentes,
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-4xl bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl max-h-[94vh] flex flex-col p-0 overflow-hidden">
        {/* Cabeçalho fixo no topo do modal */}
        <DialogHeader className="border-b border-[#E6E2D8] p-4 sm:p-5 bg-white shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-6 sm:pr-8">
            <div>
              <DialogTitle className="font-serif text-lg sm:text-2xl font-bold text-[#1E3A5F] text-left">
                {editingItem ? 'Editar Escala da Semana' : 'Nova Escala da Semana'}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5A5A5A] mt-0.5 text-left">
                Preencha os 7 dias com horários de atividades e designações ministeriais.
              </DialogDescription>
            </div>
            {!editingItem && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCarregarExemploUsuario}
                className="self-start sm:self-auto text-xs border-[#C9A227] text-[#8C6D15] hover:bg-[#C9A227]/10 h-8"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-[#C9A227]" />
                Carregar Exemplo Real
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Formulário com corpo rolável e footer fixo acessível em mobile */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Box de Informações da Semana */}
            <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#E6E2D8] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1A1A]">
                    Data Inicial (Segunda-feira) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => handleDataInicioChange(e.target.value)}
                    className={`bg-white text-xs sm:text-sm ${
                      errors.dataInicio ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.dataInicio && (
                    <p className="text-[11px] text-red-600">{errors.dataInicio}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1A1A]">
                    Data Final (Domingo) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className={`bg-white text-xs sm:text-sm ${
                      errors.dataFim ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.dataFim && <p className="text-[11px] text-red-600">{errors.dataFim}</p>}
                </div>
              </div>

              {/* Título gerado em tempo real */}
              <div className="p-3 bg-white rounded-lg border border-[#E6E2D8] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A227] flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Título Oficial Gerado Automaticamente
                </span>
                <p className="font-serif font-bold text-sm sm:text-base text-[#1E3A5F]">
                  {tituloGerado}
                </p>
              </div>
            </div>

            {/* 7 Dias da Semana (Segunda a Domingo) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base sm:text-lg font-bold text-[#1E3A5F] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#C9A227]" />
                  Programação dos 7 Dias da Semana
                </h3>
                <span className="text-xs text-[#5A5A5A]">
                  Adicione quantas atividades precisar por dia
                </span>
              </div>

              <div className="space-y-4">
                {dias.map((diaItem, diaIdx) => (
                  <div
                    key={diaItem.dia}
                    className="p-4 sm:p-5 rounded-2xl border border-[#E6E2D8] bg-white shadow-xs space-y-3.5 hover:border-[#1E3A5F]/30 transition"
                  >
                    {/* Cabeçalho do Dia */}
                    <div className="flex flex-wrap items-center justify-between pb-2 border-b border-[#E6E2D8] gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#1E3A5F] text-white font-bold text-xs uppercase px-2.5 py-1">
                          {diaItem.dia}
                        </Badge>
                        {diaItem.data && (
                          <span className="text-xs text-[#8C6D15] font-semibold">
                            📅 {diaItem.data}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddAtividade(diaIdx)}
                        className="text-xs text-[#1E3A5F] hover:bg-slate-100 h-8"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1 text-[#C9A227]" />
                        Adicionar Atividade
                      </Button>
                    </div>

                    {/* Lista de Atividades do Dia */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#5A5A5A] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#C9A227]" />
                        Atividades com Horário
                      </label>

                      {(diaItem.atividades || ['']).map((ativ, ativIdx) => (
                        <div key={ativIdx} className="flex items-center gap-2">
                          <Input
                            value={ativ}
                            onChange={(e) => handleUpdateAtividade(diaIdx, ativIdx, e.target.value)}
                            placeholder={`Ex: Culto de doutrina as 19:00hr`}
                            className="text-xs sm:text-sm h-10 flex-1 min-w-0 bg-white"
                          />
                          {(diaItem.atividades || []).length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveAtividade(diaIdx, ativIdx)}
                              className="h-10 w-10 text-rose-600 hover:bg-rose-50 flex-shrink-0"
                              title="Remover linha de atividade"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 3 Campos Livres de Designação (Empilhados em coluna única no mobile, grid 3 colunas em sm+) */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:grid sm:grid-cols-3 gap-3">
                      <div className="space-y-1 w-full">
                        <label className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1">
                          <User className="w-3 h-3 text-[#C9A227]" />
                          Obreiros escalados
                        </label>
                        <Input
                          value={diaItem.obreiros_escalados || ''}
                          onChange={(e) =>
                            handleUpdateDesignacao(diaIdx, 'obreiros_escalados', e.target.value)
                          }
                          placeholder="Ex: Rodrigo e Manoel"
                          className="text-xs sm:text-sm h-10 w-full bg-white"
                        />
                      </div>

                      <div className="space-y-1 w-full">
                        <label className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1">
                          <Baby className="w-3 h-3 text-[#C9A227]" />
                          Professoras nas salinhas
                        </label>
                        <Input
                          value={diaItem.professoras_salinhas || ''}
                          onChange={(e) =>
                            handleUpdateDesignacao(diaIdx, 'professoras_salinhas', e.target.value)
                          }
                          placeholder="Ex: Jacinara e Joana"
                          className="text-xs sm:text-sm h-10 w-full bg-white"
                        />
                      </div>

                      <div className="space-y-1 w-full">
                        <label className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#C9A227]" />
                          Recepção
                        </label>
                        <Input
                          value={diaItem.recepcao || ''}
                          onChange={(e) =>
                            handleUpdateDesignacao(diaIdx, 'recepcao', e.target.value)
                          }
                          placeholder="Ex: Francisco Mariano"
                          className="text-xs sm:text-sm h-10 w-full bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Observações e Status */}
            <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#E6E2D8] space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Observações Pastorais Gerais (Opcional)
                </label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Instruções para a equipe, avisos gerais ou mensagem da coordenação..."
                  className="text-xs sm:text-sm bg-white"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="check-ativa"
                  checked={ativa}
                  onChange={(e) => setAtiva(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#C9A227]"
                />
                <label htmlFor="check-ativa" className="text-xs font-medium text-slate-700">
                  Definir como escala ativa da semana (destaque principal no portal público)
                </label>
              </div>
            </div>

            {/* FOTOS DO CULTO NA ESCALA DA SEMANA */}
            <div className="p-4 rounded-xl bg-white border border-[#E6E2D8] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#C9A227]" />
                  <h4 className="font-serif font-bold text-sm text-[#1E3A5F]">
                    Fotos do Culto desta Semana
                  </h4>
                </div>
                <span className="text-[11px] text-[#5A5A5A]">
                  {fotosExistentes.length + novasFotos.length} foto(s)
                </span>
              </div>
              <p className="text-xs text-[#5A5A5A]">
                Suba fotos dos cultos realizados durante esta semana para exibir na escala da semana
                (comprimidas automaticamente).
              </p>

              {/* Botão de upload */}
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-[#1E3A5F] bg-blue-50/50 hover:bg-blue-50 text-xs font-semibold text-[#1E3A5F] transition">
                  <Plus className="w-4 h-4 text-[#C9A227]" />
                  <span>Adicionar Fotos do Culto</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleUploadFotos}
                    disabled={compressingPhotos}
                  />
                </label>
                {compressingPhotos && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A227]" />
                    Comprimindo fotos...
                  </span>
                )}
              </div>

              {/* Miniaturas de fotos existentes e novas */}
              {(fotosExistentes.length > 0 || novasFotos.length > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                  {/* Fotos já salvas no banco */}
                  {editingItem &&
                    fotosExistentes.map((fotoNome) => (
                      <div
                        key={fotoNome}
                        className="relative group rounded-xl overflow-hidden border border-[#E6E2D8] aspect-square bg-slate-50"
                      >
                        <img
                          src={pb.files.getURL(editingItem, fotoNome)}
                          alt="Foto do culto"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoverFotoExistente(fotoNome)}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100 shadow transition"
                          title="Remover foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                  {/* Novas fotos selecionadas */}
                  {novasFotos.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden border-2 border-emerald-500 aspect-square bg-slate-50"
                    >
                      <img
                        src={item.previewUrl}
                        alt="Nova foto do culto"
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute bottom-1 left-1 bg-emerald-600 text-[9px] px-1 py-0">
                        Nova
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleRemoverNovaFoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100 shadow transition"
                        title="Remover"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rodapé de Ações Fixo: Sempre visível e acessível no celular sem sumir */}
          <DialogFooter className="p-3 sm:p-4 border-t border-[#E6E2D8] bg-[#F7F5F0] shrink-0 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none text-xs h-10 border-[#E6E2D8]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none bg-[#1E3A5F] hover:bg-[#16304F] text-white font-bold text-xs h-10 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Escala da Semana'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default FormEscalaSemana
