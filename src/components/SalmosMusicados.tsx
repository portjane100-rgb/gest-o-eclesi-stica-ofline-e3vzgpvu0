import React, { useState, useEffect, useRef } from 'react'
import {
  Music,
  Play,
  Pause,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Search,
  ChevronDown,
  ChevronUp,
  Volume2,
  FileAudio,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import pb from '@/lib/pocketbase/client'
import type { Salmo } from '@/types/adtc'
import { useToast } from '@/hooks/use-toast'
import InlineText from '@/components/InlineText'

interface SalmosMusicadosProps {
  isAdmin: boolean
  tituloSecao?: string
  subtituloSecao?: string
  onTituloChange?: (novo: string) => void
  onSubtituloChange?: (novo: string) => void
}

export const SalmosMusicados: React.FC<SalmosMusicadosProps> = ({
  isAdmin,
  tituloSecao = 'Salmos Musicados',
  subtituloSecao = 'Ouça os louvores e cânticos de salmos da igreja',
  onTituloChange,
  onSubtituloChange,
}) => {
  const { toast } = useToast()

  const [salmos, setSalmos] = useState<Salmo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isExpanded, setIsExpanded] = useState(true)

  // Player de Áudio
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Modais de Criação/Edição de Salmo
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSalmo, setEditingSalmo] = useState<Salmo | null>(null)
  const [formNumero, setFormNumero] = useState<string>('')
  const [formTitulo, setFormTitulo] = useState<string>('')
  const [formDescricao, setFormDescricao] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Modal Exclusão
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchSalmos = async () => {
    try {
      const res = await pb.collection('salmos').getFullList<Salmo>({
        sort: 'numero,ordem,created',
      })
      setSalmos(res)
    } catch (err) {
      console.error('Erro ao carregar salmos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSalmos()
  }, [])

  // Gerenciamento do player
  const handlePlayToggle = (salmo: Salmo) => {
    if (!salmo.audio) {
      toast({
        variant: 'destructive',
        title: 'Áudio indisponível',
        description: 'Este salmo ainda não possui arquivo de áudio anexado.',
      })
      return
    }

    const url = pb.files.getURL(salmo, salmo.audio)

    if (currentPlayingId === salmo.id) {
      if (isPlaying) {
        audioRef.current?.pause()
        setIsPlaying(false)
      } else {
        audioRef.current?.play()
        setIsPlaying(true)
      }
    } else {
      setCurrentPlayingId(salmo.id)
      setAudioUrl(url)
      setIsPlaying(true)
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch((e) => console.log('Autoplay bloqueado', e))
        }
      }, 50)
    }
  }

  const handleOpenAdd = () => {
    setEditingSalmo(null)
    setFormNumero('')
    setFormTitulo('')
    setFormDescricao('')
    setSelectedFile(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (salmo: Salmo) => {
    setEditingSalmo(salmo)
    setFormNumero(salmo.numero ? String(salmo.numero) : '')
    setFormTitulo(salmo.titulo)
    setFormDescricao(salmo.descricao || '')
    setSelectedFile(null)
    setIsModalOpen(true)
  }

  const handleSaveSalmo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitulo.trim()) {
      toast({ variant: 'destructive', title: 'Informe o título do salmo.' })
      return
    }

    setIsSaving(true)
    try {
      const formData = new FormData()
      if (formNumero) formData.append('numero', formNumero)
      formData.append('titulo', formTitulo.trim())
      formData.append('descricao', formDescricao.trim())

      if (selectedFile) {
        formData.append('audio', selectedFile)
      }

      if (editingSalmo) {
        await pb.collection('salmos').update(editingSalmo.id, formData)
        toast({ title: 'Salmo atualizado com sucesso!' })
      } else {
        await pb.collection('salmos').create(formData)
        toast({ title: 'Salmo adicionado com sucesso!' })
      }

      setIsModalOpen(false)
      fetchSalmos()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar salmo',
        description: err?.message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    try {
      await pb.collection('salmos').delete(deletingId)
      if (currentPlayingId === deletingId) {
        audioRef.current?.pause()
        setCurrentPlayingId(null)
        setAudioUrl(null)
        setIsPlaying(false)
      }
      toast({ title: 'Salmo removido com sucesso.' })
      setDeletingId(null)
      fetchSalmos()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir salmo',
        description: err?.message,
      })
    }
  }

  const filteredSalmos = salmos.filter((s) => {
    const termo = searchTerm.toLowerCase().trim()
    const matchNumero = s.numero ? String(s.numero).includes(termo) : false
    const matchTitulo = s.titulo.toLowerCase().includes(termo)
    const matchDesc = s.descricao ? s.descricao.toLowerCase().includes(termo) : false
    return matchNumero || matchTitulo || matchDesc
  })

  const currentPlayingSalmo = salmos.find((s) => s.id === currentPlayingId)

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Card className="border-2 border-[#C9A227]/70 bg-white shadow-md rounded-2xl overflow-hidden">
        {/* Cabeçalho da Seção com Botão de Recolher */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1E3A5F] via-[#16304F] to-[#1E3A5F] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-[#C9A227]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#C9A227]/20 border border-[#C9A227] flex items-center justify-center text-[#C9A227] shadow-sm flex-shrink-0">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-[10px] uppercase tracking-wider">
                  Harpa & Cânticos
                </Badge>
                <span className="text-xs text-slate-300">
                  {salmos.length} {salmos.length === 1 ? 'salmo cadastrado' : 'salmos cadastrados'}
                </span>
              </div>
              <InlineText
                configKey="home_titulo_salmos"
                defaultText={tituloSecao}
                isAdmin={isAdmin}
                tag="h2"
                label="Título da Seção de Salmos"
                className="font-serif text-xl sm:text-2xl font-bold text-white mt-0.5"
                onSave={onTituloChange}
              />
              <InlineText
                configKey="home_subtitulo_salmos"
                defaultText={subtituloSecao}
                isAdmin={isAdmin}
                tag="p"
                label="Subtítulo da Seção de Salmos"
                className="text-xs sm:text-sm text-slate-200"
                onSave={onSubtituloChange}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {isAdmin && (
              <Button
                onClick={handleOpenAdd}
                size="sm"
                className="bg-[#C9A227] hover:bg-[#B08E1E] text-[#1E3A5F] font-bold text-xs shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload de Salmo (MP3)</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="border-white/30 text-white hover:bg-white/10 hover:text-white text-xs flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Ocultar</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>Ver Salmos ({salmos.length})</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Player em Destaque Fixo quando estiver tocando */}
        {currentPlayingSalmo && (
          <div className="bg-amber-50/90 border-b border-[#C9A227]/40 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
              <div className="w-9 h-9 rounded-full bg-[#1E3A5F] text-[#C9A227] flex items-center justify-center flex-shrink-0 animate-pulse">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A227] block">
                  Tocando Agora
                </span>
                <p className="font-serif font-bold text-sm text-[#1E3A5F] truncate">
                  {currentPlayingSalmo.numero ? `Salmo ${currentPlayingSalmo.numero} — ` : ''}
                  {currentPlayingSalmo.titulo}
                </p>
              </div>
            </div>

            {/* Audio nativo com controles completos */}
            <div className="w-full sm:w-auto flex items-center gap-3">
              <audio
                ref={audioRef}
                src={audioUrl || undefined}
                controls
                className="h-9 w-full sm:w-80 rounded-lg"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false)
                }}
              />
            </div>
          </div>
        )}

        {/* Conteúdo com rolagem quando expandido */}
        {isExpanded && (
          <CardContent className="p-5 sm:p-6 space-y-4">
            {/* Campo de Busca rápida */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Pesquisar por número do salmo ou título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs sm:text-sm bg-white border-[#E6E2D8] rounded-xl"
                />
              </div>

              <div className="text-xs text-[#5A5A5A] hidden sm:block">
                <span>Lista com rolagem rápida (até ~100 salmos)</span>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-xs text-[#5A5A5A]">
                <Loader2 className="w-6 h-6 animate-spin text-[#C9A227]" />
                <span>Carregando salmos musicados...</span>
              </div>
            ) : filteredSalmos.length > 0 ? (
              /* Container com scroll vertical delimitado */
              <div className="max-h-96 overflow-y-auto pr-1 space-y-2 border border-[#E6E2D8] rounded-xl p-2 bg-[#F7F5F0]/40 scrollbar-thin">
                {filteredSalmos.map((salmo) => {
                  const isCurrent = currentPlayingId === salmo.id
                  const isCurrentPlaying = isCurrent && isPlaying

                  return (
                    <div
                      key={salmo.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-amber-50/90 border-[#C9A227] shadow-xs'
                          : 'bg-white border-[#E6E2D8] hover:border-[#C9A227]/60 hover:bg-[#F7F5F0]/60'
                      }`}
                    >
                      {/* Botão Play/Pause + Título */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          onClick={() => handlePlayToggle(salmo)}
                          disabled={!salmo.audio}
                          title={salmo.audio ? 'Ouvir salmo' : 'Áudio ainda não adicionado'}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                            salmo.audio
                              ? isCurrentPlaying
                                ? 'bg-[#1E3A5F] text-[#C9A227] shadow-md scale-105'
                                : 'bg-[#C9A227] text-[#1E3A5F] hover:bg-[#B08E1E] shadow-xs'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {isCurrentPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {salmo.numero && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-[#1E3A5F]/30 text-[#1E3A5F] font-bold px-1.5 py-0 h-4"
                              >
                                Salmo {salmo.numero}
                              </Badge>
                            )}
                            <h4
                              className={`font-serif font-bold text-xs sm:text-sm truncate ${
                                isCurrent ? 'text-[#1E3A5F]' : 'text-[#1A1A1A]'
                              }`}
                              title={salmo.titulo}
                            >
                              {salmo.titulo}
                            </h4>
                          </div>
                          {salmo.descricao && (
                            <p className="text-[11px] text-[#5A5A5A] truncate mt-0.5">
                              {salmo.descricao}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status / Ações Admin */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {salmo.audio ? (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium hidden sm:inline-flex items-center gap-1">
                            <FileAudio className="w-3 h-3" />
                            MP3
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-medium hidden sm:inline-block">
                            Sem áudio
                          </span>
                        )}

                        {isAdmin && (
                          <div className="flex items-center gap-1 border-l border-[#E6E2D8] pl-2">
                            <button
                              onClick={() => handleOpenEdit(salmo)}
                              className="p-1 rounded text-[#1E3A5F] hover:bg-[#1E3A5F]/10 transition"
                              title="Editar salmo"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(salmo.id)}
                              className="p-1 rounded text-rose-600 hover:bg-rose-50 transition"
                              title="Excluir salmo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#5A5A5A] space-y-2 bg-[#F7F5F0]/50 rounded-xl border border-dashed border-[#E6E2D8]">
                <FileAudio className="w-8 h-8 text-[#C9A227] mx-auto opacity-70" />
                <p>Nenhum salmo encontrado com o termo pesquisado.</p>
                {isAdmin && (
                  <Button
                    onClick={handleOpenAdd}
                    size="sm"
                    className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs mt-2"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Fazer Upload do Primeiro Salmo
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Modal Adicionar / Editar Salmo */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              {editingSalmo ? 'Editar Salmo Musicado' : 'Novo Salmo Musicado'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Faça upload do arquivo de áudio MP3 e defina o número e título do salmo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSalmo} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1 col-span-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Número</label>
                <Input
                  type="number"
                  placeholder="Ex: 23"
                  value={formNumero}
                  onChange={(e) => setFormNumero(e.target.value)}
                  className="text-xs sm:text-sm h-9"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Título do Salmo / Cântico <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Ex: O Senhor é o meu pastor"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="text-xs sm:text-sm h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Descrição / Tom / Coro (opcional)
              </label>
              <Input
                placeholder="Ex: Cantado pelo conjunto de mocidade, Tom: Sol Maior"
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                className="text-xs sm:text-sm h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-[#C9A227]" />
                Arquivo de Áudio (MP3 / WAV)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0])
                  }
                }}
                className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1E3A5F] file:text-white hover:file:bg-[#16304F] border border-[#E6E2D8] rounded-md p-1"
              />
              {editingSalmo?.audio && !selectedFile && (
                <p className="text-[11px] text-[#5A5A5A]">
                  Já existe um arquivo salvo: <strong>{editingSalmo.audio}</strong>. Selecione outro
                  apenas se quiser substituir.
                </p>
              )}
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-[#1E3A5F] text-white">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Salmo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-serif text-lg text-[#1E3A5F]">
              Excluir Salmo
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Deseja realmente remover este salmo e seu arquivo de áudio? Esta ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleDeleteConfirm} className="bg-rose-600 text-white flex-1">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default SalmosMusicados
