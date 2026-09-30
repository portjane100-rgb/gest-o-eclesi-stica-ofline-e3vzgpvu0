import React, { useState, useEffect, useRef } from 'react'
import {
  Camera,
  Plus,
  Upload,
  Trash2,
  Edit2,
  Image as ImageIcon,
  FolderPlus,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
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
import type { AlbumFotos, FotoItem } from '@/types/adtc'
import { useToast } from '@/hooks/use-toast'
import InlineText from '@/components/InlineText'

interface MuralDeFotosProps {
  isAdmin: boolean
  tituloSecao?: string
  subtituloSecao?: string
  onTituloChange?: (novo: string) => void
  onSubtituloChange?: (novo: string) => void
}

export const MuralDeFotos: React.FC<MuralDeFotosProps> = ({
  isAdmin,
  tituloSecao = 'Mural de Fotos',
  subtituloSecao = 'Momentos especiais, cultos solenes e festividades das congregações',
  onTituloChange,
  onSubtituloChange,
}) => {
  const { toast } = useToast()

  const [albuns, setAlbuns] = useState<AlbumFotos[]>([])
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)
  const [fotos, setFotos] = useState<FotoItem[]>([])
  const [loadingAlbuns, setLoadingAlbuns] = useState(true)
  const [loadingFotos, setLoadingFotos] = useState(false)

  // Lightbox Modal
  const [lightboxFotoIndex, setLightboxFotoIndex] = useState<number | null>(null)

  // Modais de Criação/Edição de Álbum / Tema
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false)
  const [editingAlbum, setEditingAlbum] = useState<AlbumFotos | null>(null)
  const [albumTitulo, setAlbumTitulo] = useState('')
  const [albumDescricao, setAlbumDescricao] = useState('')
  const [isSavingAlbum, setIsSavingAlbum] = useState(false)

  // Modal de Upload de Fotos no Álbum Selecionado
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadLegenda, setUploadLegenda] = useState('')
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Modal de Exclusão de Álbum ou Foto
  const [deletingInfo, setDeletingInfo] = useState<{
    tipo: 'album' | 'foto'
    id: string
    nome: string
  } | null>(null)

  // Carregar temas/álbuns
  const fetchAlbuns = async () => {
    try {
      const res = await pb.collection('albuns_fotos').getFullList<AlbumFotos>({
        sort: 'ordem,-created',
      })
      setAlbuns(res)
      if (res.length > 0 && !selectedAlbumId) {
        setSelectedAlbumId(res[0].id)
      }
    } catch (err) {
      console.error('Erro ao buscar temas/álbuns de fotos:', err)
    } finally {
      setLoadingAlbuns(false)
    }
  }

  // Carregar fotos do álbum selecionado
  const fetchFotos = async (albumId: string) => {
    setLoadingFotos(true)
    try {
      const res = await pb.collection('fotos').getFullList<FotoItem>({
        filter: `album='${albumId}'`,
        sort: 'ordem,-created',
      })
      setFotos(res)
    } catch (err) {
      console.error('Erro ao buscar fotos do tema:', err)
    } finally {
      setLoadingFotos(false)
    }
  }

  useEffect(() => {
    fetchAlbuns()
  }, [])

  useEffect(() => {
    if (selectedAlbumId) {
      fetchFotos(selectedAlbumId)
    } else {
      setFotos([])
    }
  }, [selectedAlbumId])

  // Gerenciamento de Álbuns
  const handleOpenAddAlbum = () => {
    setEditingAlbum(null)
    setAlbumTitulo('')
    setAlbumDescricao('')
    setIsAlbumModalOpen(true)
  }

  const handleOpenEditAlbum = (album: AlbumFotos) => {
    setEditingAlbum(album)
    setAlbumTitulo(album.titulo)
    setAlbumDescricao(album.descricao || '')
    setIsAlbumModalOpen(true)
  }

  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!albumTitulo.trim()) {
      toast({ variant: 'destructive', title: 'Informe o título do tema/festa.' })
      return
    }

    setIsSavingAlbum(true)
    try {
      if (editingAlbum) {
        await pb.collection('albuns_fotos').update(editingAlbum.id, {
          titulo: albumTitulo.trim(),
          descricao: albumDescricao.trim(),
        })
        toast({ title: 'Tema atualizado com sucesso!' })
      } else {
        const novo = await pb.collection('albuns_fotos').create({
          titulo: albumTitulo.trim(),
          descricao: albumDescricao.trim(),
        })
        setSelectedAlbumId(novo.id)
        toast({ title: 'Novo tema de fotos criado com sucesso!' })
      }
      setIsAlbumModalOpen(false)
      fetchAlbuns()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar tema',
        description: err?.message,
      })
    } finally {
      setIsSavingAlbum(false)
    }
  }

  // Upload de fotos
  const handleOpenUploadFotos = () => {
    if (!selectedAlbumId) {
      toast({ variant: 'destructive', title: 'Crie ou selecione um tema antes de enviar fotos.' })
      return
    }
    setUploadLegenda('')
    setUploadFiles(null)
    setIsUploadModalOpen(true)
  }

  const handleUploadFotos = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAlbumId) return
    if (!uploadFiles || uploadFiles.length === 0) {
      toast({ variant: 'destructive', title: 'Selecione ao menos uma foto para enviar.' })
      return
    }

    setIsUploading(true)
    let sucesso = 0
    let falha = 0
    try {
      // Envio sequencial de cada foto para garantir integridade e relatar falhas com precisão
      const arquivos = Array.from(uploadFiles)
      for (const file of arquivos) {
        try {
          const formData = new FormData()
          formData.append('album', selectedAlbumId)
          formData.append('arquivo', file)
          if (uploadLegenda.trim()) {
            formData.append('legenda', uploadLegenda.trim())
          }
          await pb.collection('fotos').create(formData)
          sucesso++
        } catch (err) {
          console.error(`Erro ao enviar foto ${file.name}:`, err)
          falha++
        }
      }

      if (sucesso > 0) {
        toast({
          title: 'Fotos enviadas com sucesso!',
          description: `${sucesso} foto(s) adicionada(s) à pasta. ${falha > 0 ? `(${falha} falharam)` : ''}`,
        })
        setIsUploadModalOpen(false)
        fetchFotos(selectedAlbumId)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao enviar fotos',
          description: 'Não foi possível enviar os arquivos selecionados.',
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no envio',
        description: err?.message,
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Exclusão
  const handleDeleteConfirm = async () => {
    if (!deletingInfo) return
    try {
      if (deletingInfo.tipo === 'album') {
        await pb.collection('albuns_fotos').delete(deletingInfo.id)
        toast({ title: 'Tema de fotos removido.' })
        if (selectedAlbumId === deletingInfo.id) {
          setSelectedAlbumId(null)
        }
        fetchAlbuns()
      } else {
        await pb.collection('fotos').delete(deletingInfo.id)
        toast({ title: 'Foto removida.' })
        if (selectedAlbumId) {
          fetchFotos(selectedAlbumId)
        }
      }
      setDeletingInfo(null)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover item',
        description: err?.message,
      })
    }
  }

  // Lightbox navegação
  const handleNextPhoto = () => {
    if (lightboxFotoIndex === null) return
    setLightboxFotoIndex((prev) => (prev! + 1) % fotos.length)
  }

  const handlePrevPhoto = () => {
    if (lightboxFotoIndex === null) return
    setLightboxFotoIndex((prev) => (prev! - 1 + fotos.length) % fotos.length)
  }

  const currentAlbum = albuns.find((a) => a.id === selectedAlbumId)
  const currentLightboxFoto = lightboxFotoIndex !== null ? fotos[lightboxFotoIndex] : null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Card className="border-2 border-[#C9A227]/70 bg-white shadow-md rounded-2xl overflow-hidden">
        {/* Cabeçalho da Seção */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1E3A5F] via-[#16304F] to-[#1E3A5F] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-[#C9A227]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#C9A227]/20 border border-[#C9A227] flex items-center justify-center text-[#C9A227] shadow-sm flex-shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#C9A227] text-[#1E3A5F] font-bold text-[10px] uppercase tracking-wider">
                  Galeria & Comunhão
                </Badge>
                <span className="text-xs text-slate-300">
                  {albuns.length}{' '}
                  {albuns.length === 1 ? 'tema cadastrado' : 'temas de festividades'}
                </span>
              </div>
              <InlineText
                configKey="home_titulo_mural"
                defaultText={tituloSecao}
                isAdmin={isAdmin}
                tag="h2"
                label="Título da Seção Mural de Fotos"
                className="font-serif text-xl sm:text-2xl font-bold text-white mt-0.5"
                onSave={onTituloChange}
              />
              <InlineText
                configKey="home_subtitulo_mural"
                defaultText={subtituloSecao}
                isAdmin={isAdmin}
                tag="p"
                label="Subtítulo da Seção Mural de Fotos"
                className="text-xs sm:text-sm text-slate-200"
                onSave={onSubtituloChange}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {isAdmin && (
              <>
                <Button
                  onClick={handleOpenAddAlbum}
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/20"
                >
                  <FolderPlus className="w-3.5 h-3.5 mr-1 text-[#C9A227]" />
                  Novo Tema
                </Button>
                <Button
                  onClick={handleOpenUploadFotos}
                  disabled={!selectedAlbumId}
                  size="sm"
                  className="bg-[#C9A227] hover:bg-[#B08E1E] text-[#1E3A5F] font-bold text-xs shadow-sm flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Fotos
                </Button>
              </>
            )}
          </div>
        </div>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Seletor / Abas dos Temas de Festas */}
          {albuns.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-[#E6E2D8]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#C9A227] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Selecione a Festa / Tema:
                </span>

                {isAdmin && currentAlbum && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditAlbum(currentAlbum)}
                      className="text-xs text-[#1E3A5F] hover:text-[#C9A227] flex items-center gap-1 font-medium"
                    >
                      <Edit2 className="w-3 h-3" />
                      Editar Nome do Tema
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() =>
                        setDeletingInfo({
                          tipo: 'album',
                          id: currentAlbum.id,
                          nome: currentAlbum.titulo,
                        })
                      }
                      className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium"
                    >
                      <Trash2 className="w-3 h-3" />
                      Excluir Tema
                    </button>
                  </div>
                )}
              </div>

              {/* Botões dos Temas */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {albuns.map((album) => {
                  const isSelected = selectedAlbumId === album.id
                  return (
                    <button
                      key={album.id}
                      onClick={() => setSelectedAlbumId(album.id)}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                        isSelected
                          ? 'bg-[#1E3A5F] text-white shadow-md'
                          : 'bg-[#F7F5F0] text-[#1E3A5F] hover:bg-slate-200 border border-[#E6E2D8]'
                      }`}
                    >
                      <span>{album.titulo}</span>
                    </button>
                  )
                })}
              </div>

              {/* Descrição do Tema Selecionado */}
              {currentAlbum && (
                <div className="bg-[#F7F5F0]/60 p-3.5 rounded-xl border border-[#E6E2D8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-serif font-bold text-sm sm:text-base text-[#1E3A5F]">
                      {currentAlbum.titulo}
                    </h3>
                    {currentAlbum.descricao && (
                      <p className="text-xs text-[#5A5A5A] mt-0.5">{currentAlbum.descricao}</p>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {fotos.length} {fotos.length === 1 ? 'foto registrada' : 'fotos registradas'}
                  </div>
                </div>
              )}

              {/* Grid de Fotos */}
              {loadingFotos ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-xs text-[#5A5A5A]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#C9A227]" />
                  <span>Carregando fotos do tema...</span>
                </div>
              ) : fotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {fotos.map((foto, index) => {
                    const fotoUrl = pb.files.getURL(foto, foto.arquivo)
                    return (
                      <div
                        key={foto.id}
                        className="group relative rounded-xl overflow-hidden border border-[#E6E2D8] bg-slate-100 shadow-2xs hover:shadow-md transition aspect-square"
                      >
                        <img
                          src={fotoUrl}
                          alt={foto.legenda || currentAlbum?.titulo || 'Foto da festa'}
                          className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                          onClick={() => setLightboxFotoIndex(index)}
                        />

                        {/* Overlay hover com legenda ou ações */}
                        <div
                          onClick={() => setLightboxFotoIndex(index)}
                          className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between cursor-pointer"
                        >
                          <div className="flex justify-end">
                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletingInfo({
                                    tipo: 'foto',
                                    id: foto.id,
                                    nome: foto.legenda || 'esta foto',
                                  })
                                }}
                                className="p-1 rounded bg-rose-600/80 hover:bg-rose-700 text-white transition text-xs shadow-xs"
                                title="Excluir foto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {foto.legenda && (
                            <p className="text-[11px] text-white font-medium line-clamp-2 drop-shadow-sm">
                              {foto.legenda}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[#5A5A5A] space-y-2 bg-[#F7F5F0]/50 rounded-xl border border-dashed border-[#E6E2D8]">
                  <ImageIcon className="w-8 h-8 text-[#C9A227] mx-auto opacity-70" />
                  <p>Ainda não há fotos anexadas neste tema de festa.</p>
                  {isAdmin && (
                    <Button
                      onClick={handleOpenUploadFotos}
                      size="sm"
                      className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs mt-2"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      Fazer Upload das Primeiras Fotos
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#5A5A5A] space-y-2 bg-[#F7F5F0]/50 rounded-xl border border-dashed border-[#E6E2D8]">
              <Camera className="w-10 h-10 text-[#C9A227] mx-auto opacity-70" />
              <p>Nenhum tema ou festa criado ainda no Mural de Fotos.</p>
              {isAdmin && (
                <Button
                  onClick={handleOpenAddAlbum}
                  size="sm"
                  className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs mt-2"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Criar Primeiro Tema de Festa
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Lightbox (Visualizador em tamanho maior) */}
      {currentLightboxFoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxFotoIndex(null)}
        >
          <button
            onClick={() => setLightboxFotoIndex(null)}
            className="absolute top-4 right-4 text-white hover:text-[#C9A227] p-2 rounded-full bg-white/10 hover:bg-white/20 transition z-50"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navegação Anterior */}
          {fotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePrevPhoto()
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-[#C9A227] p-3 rounded-full bg-white/10 hover:bg-white/20 transition z-50"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Conteúdo da foto */}
          <div
            className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={pb.files.getURL(currentLightboxFoto, currentLightboxFoto.arquivo)}
              alt={currentLightboxFoto.legenda || 'Foto ampliada'}
              className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
            {currentLightboxFoto.legenda && (
              <p className="text-white text-sm mt-3 text-center bg-black/60 px-4 py-1.5 rounded-full">
                {currentLightboxFoto.legenda}
              </p>
            )}
            <span className="text-slate-400 text-xs mt-1">
              Foto {lightboxFotoIndex! + 1} de {fotos.length}
            </span>
          </div>

          {/* Navegação Próxima */}
          {fotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleNextPhoto()
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-[#C9A227] p-3 rounded-full bg-white/10 hover:bg-white/20 transition z-50"
              aria-label="Próxima foto"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}

      {/* Modal Criar / Editar Álbum / Tema */}
      <Dialog open={isAlbumModalOpen} onOpenChange={setIsAlbumModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              {editingAlbum ? 'Editar Tema / Festa' : 'Novo Tema de Fotos'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Cadastre o tema da festividade (Ex: Aniversário da Igreja, Congresso de Jovens, Festa
              das Crianças).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAlbum} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Título do Tema / Festa <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ex: 25º Aniversário da ADTC Campanário"
                value={albumTitulo}
                onChange={(e) => setAlbumTitulo(e.target.value)}
                className="text-xs sm:text-sm h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Descrição / Detalhes</label>
              <Input
                placeholder="Ex: Cultos festivos realizados nos dias 18 a 20 de Julho"
                value={albumDescricao}
                onChange={(e) => setAlbumDescricao(e.target.value)}
                className="text-xs sm:text-sm h-9"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button type="button" variant="outline" onClick={() => setIsAlbumModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingAlbum} className="bg-[#1E3A5F] text-white">
                {isSavingAlbum ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Tema'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Upload de Fotos no Álbum */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              Upload de Fotos
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Tema selecionado: <strong>{currentAlbum?.titulo}</strong>. Você pode selecionar várias
              fotos de uma vez.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadFotos} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-[#C9A227]" />
                Selecione as Imagens (JPG, PNG, WEBP)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setUploadFiles(e.target.files)}
                className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1E3A5F] file:text-white hover:file:bg-[#16304F] border border-[#E6E2D8] rounded-md p-1"
              />
              {uploadFiles && uploadFiles.length > 0 && (
                <p className="text-[11px] text-emerald-700 font-medium">
                  {uploadFiles.length} foto(s) selecionada(s) para envio.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Legenda Geral (opcional)
              </label>
              <Input
                placeholder="Ex: Momento de louvor e celebração"
                value={uploadLegenda}
                onChange={(e) => setUploadLegenda(e.target.value)}
                className="text-xs sm:text-sm h-9"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading} className="bg-[#1E3A5F] text-white">
                {isUploading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                  </span>
                ) : (
                  'Fazer Upload'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <Dialog open={!!deletingInfo} onOpenChange={(open) => !open && setDeletingInfo(null)}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-serif text-lg text-[#1E3A5F]">
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Deseja realmente excluir {deletingInfo?.tipo === 'album' ? 'o tema' : 'a foto'}{' '}
              <strong>"{deletingInfo?.nome}"</strong>?
              {deletingInfo?.tipo === 'album' &&
                ' Todas as fotos associadas a este tema serão excluídas.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingInfo(null)} className="flex-1">
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

export default MuralDeFotos
