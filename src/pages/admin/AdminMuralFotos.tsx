import React, { useState, useEffect, useRef } from 'react'
import {
  FolderPlus,
  Upload,
  Trash2,
  Edit2,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  Folder,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

export const AdminMuralFotos: React.FC = () => {
  const { toast } = useToast()

  const [albuns, setAlbuns] = useState<AlbumFotos[]>([])
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)
  const [fotos, setFotos] = useState<FotoItem[]>([])
  const [loadingAlbuns, setLoadingAlbuns] = useState(true)
  const [loadingFotos, setLoadingFotos] = useState(false)

  // Modais de Criação/Edição de Pasta / Álbum
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false)
  const [editingAlbum, setEditingAlbum] = useState<AlbumFotos | null>(null)
  const [albumTitulo, setAlbumTitulo] = useState('')
  const [albumDescricao, setAlbumDescricao] = useState('')
  const [albumDataEvento, setAlbumDataEvento] = useState('')
  const [isSavingAlbum, setIsSavingAlbum] = useState(false)

  // Modal de Upload de Fotos
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadLegenda, setUploadLegenda] = useState('')
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgressText, setUploadProgressText] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Modal de Exclusão
  const [deletingInfo, setDeletingInfo] = useState<{
    tipo: 'album' | 'foto'
    id: string
    nome: string
  } | null>(null)

  // Carregar Pastas / Álbuns
  const fetchAlbuns = async () => {
    try {
      const res = await pb.collection('albuns_fotos').getFullList<AlbumFotos>({
        sort: 'ordem,-created',
      })
      setAlbuns(res)
      if (res.length > 0 && !selectedAlbumId) {
        setSelectedAlbumId(res[0].id)
      } else if (res.length === 0) {
        setSelectedAlbumId(null)
      }
    } catch (err: any) {
      console.error('Erro ao buscar pastas do mural:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar pastas',
        description: err?.message,
      })
    } finally {
      setLoadingAlbuns(false)
    }
  }

  // Carregar Fotos da Pasta selecionada
  const fetchFotos = async (albumId: string) => {
    setLoadingFotos(true)
    try {
      const res = await pb.collection('fotos').getFullList<FotoItem>({
        filter: `album='${albumId}'`,
        sort: 'ordem,-created',
      })
      setFotos(res)
    } catch (err: any) {
      console.error('Erro ao carregar fotos:', err)
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

  // Abrir criação de pasta
  const handleOpenAddAlbum = () => {
    setEditingAlbum(null)
    setAlbumTitulo('')
    setAlbumDescricao('')
    setAlbumDataEvento('')
    setIsAlbumModalOpen(true)
  }

  // Abrir edição de pasta
  const handleOpenEditAlbum = (album: AlbumFotos) => {
    setEditingAlbum(album)
    setAlbumTitulo(album.titulo || '')
    setAlbumDescricao(album.descricao || '')
    setAlbumDataEvento(album.data_evento ? album.data_evento.slice(0, 10) : '')
    setIsAlbumModalOpen(true)
  }

  // Salvar Pasta / Álbum (Criação e Edição com nome persistido de ponta a ponta)
  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault()
    const tituloLimpo = albumTitulo.trim()
    if (!tituloLimpo) {
      toast({ variant: 'destructive', title: 'Informe o nome da pasta / álbum.' })
      return
    }

    setIsSavingAlbum(true)
    try {
      const payload: Record<string, any> = {
        titulo: tituloLimpo,
        descricao: albumDescricao.trim(),
      }

      if (albumDataEvento) {
        payload.data_evento = `${albumDataEvento} 12:00:00.000Z`
      } else {
        payload.data_evento = ''
      }

      if (editingAlbum) {
        await pb.collection('albuns_fotos').update(editingAlbum.id, payload)
        toast({ title: 'Nome da pasta atualizado com sucesso!' })
      } else {
        const novo = await pb.collection('albuns_fotos').create<AlbumFotos>(payload)
        setSelectedAlbumId(novo.id)
        toast({ title: 'Pasta / Álbum criado com sucesso!' })
      }

      setIsAlbumModalOpen(false)
      fetchAlbuns()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar pasta',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setIsSavingAlbum(false)
    }
  }

  // Upload de Fotos na pasta ativa
  const handleOpenUploadFotos = () => {
    if (!selectedAlbumId) {
      toast({ variant: 'destructive', title: 'Selecione ou crie uma pasta primeiro.' })
      return
    }
    setUploadLegenda('')
    setUploadFiles(null)
    setUploadProgressText('')
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
    const total = uploadFiles.length
    let sucesso = 0
    let falha = 0

    try {
      for (let i = 0; i < total; i++) {
        const file = uploadFiles[i]
        setUploadProgressText(`Enviando foto ${i + 1} de ${total}... (${file.name})`)
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
          console.error(`Erro ao subir arquivo ${file.name}:`, err)
          falha++
        }
      }

      if (sucesso > 0) {
        toast({
          title: 'Fotos adicionadas com sucesso!',
          description: `${sucesso} foto(s) enviada(s) para a pasta. ${
            falha > 0 ? `(${falha} falharam)` : ''
          }`,
        })
        setIsUploadModalOpen(false)
        fetchFotos(selectedAlbumId)
      } else {
        toast({
          variant: 'destructive',
          title: 'Não foi possível enviar as fotos',
          description: 'Verifique se os arquivos são imagens válidas (JPG, PNG, WEBP).',
        })
      }
    } finally {
      setIsUploading(false)
      setUploadProgressText('')
    }
  }

  // Exclusão de foto ou pasta
  const handleDeleteConfirm = async () => {
    if (!deletingInfo) return
    try {
      if (deletingInfo.tipo === 'album') {
        await pb.collection('albuns_fotos').delete(deletingInfo.id)
        toast({ title: 'Pasta de fotos removida com sucesso.' })
        if (selectedAlbumId === deletingInfo.id) {
          setSelectedAlbumId(null)
        }
        fetchAlbuns()
      } else {
        await pb.collection('fotos').delete(deletingInfo.id)
        toast({ title: 'Foto removida com sucesso.' })
        if (selectedAlbumId) {
          fetchFotos(selectedAlbumId)
        }
      }
      setDeletingInfo(null)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir item',
        description: err?.message,
      })
    }
  }

  const currentAlbum = albuns.find((a) => a.id === selectedAlbumId)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho da Gestão do Mural */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            Mural de Fotos & Festividades
            <Folder className="w-5 h-5 text-[#C9A227]" />
          </h2>
          <p className="text-xs sm:text-sm text-[#5A5A5A]">
            Crie pastas para eventos, cultos solenes e congressos, e suba fotos com facilidade.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenAddAlbum}
            className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4 text-[#C9A227]" />
            Nova Pasta / Álbum
          </Button>
          {selectedAlbumId && (
            <Button
              onClick={handleOpenUploadFotos}
              className="bg-[#C9A227] hover:bg-[#B08E1E] text-[#1E3A5F] font-bold text-xs flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Subir Fotos nesta Pasta
            </Button>
          )}
        </div>
      </div>

      {/* Grid: Coluna Esquerda = Pastas / Coluna Direita = Fotos da pasta */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista de Pastas */}
        <Card className="lg:col-span-4 border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="p-4 border-b border-[#E6E2D8] bg-[#F7F5F0]/60">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-sm font-bold text-[#1E3A5F]">
                Pastas Cadastradas ({albuns.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenAddAlbum}
                className="h-7 text-xs text-[#1E3A5F]"
              >
                + Criar Pasta
              </Button>
            </div>
            <CardDescription className="text-[11px] text-[#5A5A5A]">
              Clique em uma pasta para gerenciar suas fotos ou editar seu nome.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
            {loadingAlbuns ? (
              <div className="p-8 text-center text-xs text-[#5A5A5A] flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#C9A227]" />
                Carregando pastas...
              </div>
            ) : albuns.length > 0 ? (
              albuns.map((album) => {
                const isSelected = selectedAlbumId === album.id
                return (
                  <div
                    key={album.id}
                    onClick={() => setSelectedAlbumId(album.id)}
                    className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between gap-2 border ${
                      isSelected
                        ? 'bg-[#1E3A5F] text-white border-[#1E3A5F] shadow-sm'
                        : 'bg-white hover:bg-[#F7F5F0] text-slate-800 border-transparent hover:border-[#E6E2D8]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Folder
                          className={`w-4 h-4 flex-shrink-0 ${
                            isSelected ? 'text-[#C9A227]' : 'text-slate-400'
                          }`}
                        />
                        <span className="font-semibold text-xs sm:text-sm truncate block">
                          {album.titulo}
                        </span>
                      </div>
                      {album.descricao && (
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? 'text-slate-200' : 'text-slate-500'
                          }`}
                        >
                          {album.descricao}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEditAlbum(album)
                        }}
                        className={`p-1.5 rounded-md text-xs transition ${
                          isSelected
                            ? 'hover:bg-white/20 text-white'
                            : 'hover:bg-slate-200 text-slate-600'
                        }`}
                        title="Editar nome da pasta"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingInfo({
                            tipo: 'album',
                            id: album.id,
                            nome: album.titulo,
                          })
                        }}
                        className="p-1.5 rounded-md text-xs text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition"
                        title="Excluir pasta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center text-xs text-[#5A5A5A] italic">
                Nenhuma pasta criada ainda. Clique em "Nova Pasta" para começar.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fotos da Pasta Ativa */}
        <Card className="lg:col-span-8 border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="p-5 border-b border-[#E6E2D8] bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#1E3A5F] text-white text-[10px]">Pasta Selecionada</Badge>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-[#1E3A5F]">
                    {currentAlbum ? currentAlbum.titulo : 'Nenhuma pasta selecionada'}
                  </h3>
                </div>
                {currentAlbum?.descricao && (
                  <p className="text-xs text-[#5A5A5A] mt-1">{currentAlbum.descricao}</p>
                )}
              </div>

              {currentAlbum && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleOpenUploadFotos}
                    size="sm"
                    className="bg-[#C9A227] hover:bg-[#B08E1E] text-[#1E3A5F] font-bold text-xs"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Subir Fotos
                  </Button>
                  <Button
                    onClick={() => handleOpenEditAlbum(currentAlbum)}
                    variant="outline"
                    size="sm"
                    className="text-xs border-[#1E3A5F] text-[#1E3A5F]"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Renomear Pasta
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-5">
              {loadingFotos ? (
                <div className="py-16 text-center text-xs text-[#5A5A5A] flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#C9A227]" />
                  <span>Carregando fotos da pasta...</span>
                </div>
              ) : !currentAlbum ? (
                <div className="py-16 text-center text-xs text-[#5A5A5A]">
                  Selecione uma pasta ao lado para visualizar e subir fotos.
                </div>
              ) : fotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {fotos.map((foto) => {
                    const url = pb.files.getURL(foto, foto.arquivo)
                    return (
                      <div
                        key={foto.id}
                        className="group relative rounded-xl overflow-hidden border border-[#E6E2D8] bg-slate-100 aspect-square shadow-2xs hover:shadow-md transition"
                      >
                        <img
                          src={url}
                          alt={foto.legenda || currentAlbum.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                          <div className="flex justify-end">
                            <button
                              onClick={() =>
                                setDeletingInfo({
                                  tipo: 'foto',
                                  id: foto.id,
                                  nome: foto.legenda || 'esta foto',
                                })
                              }
                              className="p-1 rounded bg-rose-600 hover:bg-rose-700 text-white transition text-xs shadow-xs"
                              title="Excluir foto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {foto.legenda && (
                            <p className="text-[11px] text-white font-medium line-clamp-2">
                              {foto.legenda}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-[#5A5A5A] space-y-2 bg-[#F7F5F0]/50 rounded-xl border border-dashed border-[#E6E2D8]">
                  <ImageIcon className="w-8 h-8 text-[#C9A227] mx-auto opacity-70" />
                  <p>Esta pasta ainda não possui fotos.</p>
                  <Button
                    onClick={handleOpenUploadFotos}
                    size="sm"
                    className="bg-[#1E3A5F] text-white text-xs mt-2"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Fazer Primeiro Upload
                  </Button>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Modal Criar / Editar Pasta / Álbum */}
      <Dialog open={isAlbumModalOpen} onOpenChange={setIsAlbumModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              {editingAlbum ? 'Editar Nome da Pasta' : 'Criar Nova Pasta / Álbum'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Dê um nome para a pasta (Ex: Aniversário da Igreja, Congresso UMADTC, Círculo de
              Oração, Culto de Ceia).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAlbum} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Nome da Pasta / Álbum <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ex: Congresso de Jovens UMADTC"
                value={albumTitulo}
                onChange={(e) => setAlbumTitulo(e.target.value)}
                className="text-xs sm:text-sm"
                autoFocus
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Data do Evento (opcional)
              </label>
              <Input
                type="date"
                value={albumDataEvento}
                onChange={(e) => setAlbumDataEvento(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">Descrição / Detalhes</label>
              <Textarea
                placeholder="Ex: Festividade solene realizada com toda a membresia..."
                value={albumDescricao}
                onChange={(e) => setAlbumDescricao(e.target.value)}
                className="text-xs sm:text-sm"
                rows={2}
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button type="button" variant="outline" onClick={() => setIsAlbumModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingAlbum || !albumTitulo.trim()}
                className="bg-[#1E3A5F] text-white"
              >
                {isSavingAlbum ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Pasta'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Upload de Fotos */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#1E3A5F]">
              Subir Fotos na Pasta
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Pasta de destino: <strong>{currentAlbum?.titulo}</strong>. Selecione uma ou mais
              imagens do seu celular ou computador.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadFotos} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-[#C9A227]" />
                Selecione as Fotos (JPG, PNG, WEBP)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setUploadFiles(e.target.files)}
                className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1E3A5F] file:text-white hover:file:bg-[#16304F] border border-[#E6E2D8] rounded-md p-1"
                required
              />
              {uploadFiles && uploadFiles.length > 0 && (
                <p className="text-[11px] text-emerald-700 font-medium">
                  {uploadFiles.length} foto(s) pronta(s) para subir.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Legenda padrão (opcional)
              </label>
              <Input
                placeholder="Ex: Momento de oração e louvor"
                value={uploadLegenda}
                onChange={(e) => setUploadLegenda(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>

            {uploadProgressText && (
              <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                {uploadProgressText}
              </p>
            )}

            <DialogFooter className="pt-3 border-t border-[#E6E2D8]">
              <Button
                type="button"
                variant="outline"
                disabled={isUploading}
                onClick={() => setIsUploadModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isUploading || !uploadFiles || uploadFiles.length === 0}
                className="bg-[#1E3A5F] text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Enviando Fotos...
                  </>
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
              Deseja realmente excluir {deletingInfo?.tipo === 'album' ? 'a pasta' : 'a foto'}{' '}
              <strong>"{deletingInfo?.nome}"</strong>?
              {deletingInfo?.tipo === 'album' &&
                ' Todas as fotos armazenadas dentro desta pasta também serão apagadas permanentemente.'}
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
    </div>
  )
}

export default AdminMuralFotos
