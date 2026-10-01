import React, { useState, useMemo } from 'react'
import { localDb } from '@/lib/localDb'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { useCongregacoes, type CongregacaoItem } from '@/hooks/useCongregacoes'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Church,
  Plus,
  Search,
  Building2,
  MapPin,
  Clock,
  UserCheck,
  Edit2,
  Trash2,
  ArrowUpDown,
  Loader2,
  AlertTriangle,
  DollarSign,
} from 'lucide-react'
import { FinanceiroCongregacoes } from '@/components/FinanceiroCongregacoes'
export const AdminCongregacoes: React.FC = () => {
  const { toast } = useToast()
  const { congregacoes, loading, reload } = useCongregacoes()

  const [abaAtiva, setAbaAtiva] = useState<'unidades' | 'financeiro'>('unidades')
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  // Item em edição/exclusão
  const [itemEdicao, setItemEdicao] = useState<CongregacaoItem | null>(null)
  const [itemExclusao, setItemExclusao] = useState<CongregacaoItem | null>(null)

  // Formulário
  const [nome, setNome] = useState('')
  const [endereco, setEndereco] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [dirigente, setDirigente] = useState('')
  const [diasCulto, setDiasCulto] = useState('')
  const [ordem, setOrdem] = useState<number>(1)
  const [ativo, setAtivo] = useState(true)

  // Próxima ordem sugerida
  const proximaOrdem = useMemo(() => {
    if (congregacoes.length === 0) return 1
    const maxOrdem = Math.max(
      ...congregacoes.map((c) => (typeof c.ordem === 'number' ? c.ordem : 0)),
    )
    return maxOrdem + 1
  }, [congregacoes])

  const abrirModalNovo = () => {
    setItemEdicao(null)
    setNome('')
    setEndereco('')
    setBairro('')
    setCidade('')
    setDirigente('')
    setDiasCulto('')
    setOrdem(proximaOrdem)
    setAtivo(true)
    setModalAberto(true)
  }

  const abrirModalEditar = (item: CongregacaoItem) => {
    setItemEdicao(item)
    setNome(item.nome || '')
    setEndereco(item.endereco || '')
    setBairro(item.bairro || '')
    setCidade(item.cidade || '')
    setDirigente(item.dirigenteGeral || item.dirigente_geral || '')
    setDiasCulto(item.diasCulto || item.dias_culto || '')
    setOrdem(typeof item.ordem === 'number' ? item.ordem : 1)
    setAtivo(item.ativo !== false)
    setModalAberto(true)
  }

  const abrirModalExcluir = (item: CongregacaoItem) => {
    setItemExclusao(item)
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Informe o nome da congregação/unidade.',
      })
      return
    }

    setSalvando(true)
    try {
      const payload: Record<string, any> = {
        nome: nome.trim(),
        endereco: endereco.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        dirigente_geral: dirigente.trim(),
        dirigenteGeral: dirigente.trim(),
        dias_culto: diasCulto.trim(),
        diasCulto: diasCulto.trim(),
        ordem: Number(ordem) || 1,
        ativo,
      }

      if (itemEdicao?.id) {
        // Atualiza no banco local IndexedDB
        await localDb.update('congregacoes', itemEdicao.id, payload)

        // Sincroniza em segundo plano com PocketBase se estiver conectado
        try {
          await pb.collection('congregacoes').update(itemEdicao.id, {
            nome: payload.nome,
            endereco: payload.endereco,
            bairro: payload.bairro,
            cidade: payload.cidade,
            dirigente_geral: payload.dirigente_geral,
            dias_culto: payload.dias_culto,
            ordem: payload.ordem,
            ativo: payload.ativo,
          })
        } catch {
          // Em modo offline PocketBase pode falhar, IndexedDB já salvou
        }

        toast({
          title: 'Congregação atualizada!',
          description: `"${payload.nome}" salva com sucesso no banco local.`,
        })
      } else {
        const novoId = localDb.generateId()
        const novoRegistro = {
          id: novoId,
          ...payload,
        }

        // Grava no IndexedDB
        await localDb.create('congregacoes', novoRegistro)

        // Tenta gravar no PocketBase se conectado
        try {
          await pb.collection('congregacoes').create({
            id: novoId,
            nome: payload.nome,
            endereco: payload.endereco,
            bairro: payload.bairro,
            cidade: payload.cidade,
            dirigente_geral: payload.dirigente_geral,
            dias_culto: payload.dias_culto,
            ordem: payload.ordem,
            ativo: payload.ativo,
          })
        } catch {
          // Modo offline garantido no IndexedDB
        }

        toast({
          title: 'Congregação cadastrada!',
          description: `"${payload.nome}" já está disponível para todo o sistema.`,
        })
      }

      setModalAberto(false)
      await reload()
    } catch (err: any) {
      console.error('Erro ao salvar congregação:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar congregação',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    if (!itemExclusao?.id) return
    setExcluindo(true)
    try {
      await localDb.delete('congregacoes', itemExclusao.id)

      try {
        await pb.collection('congregacoes').delete(itemExclusao.id)
      } catch {
        // Modo offline
      }

      toast({
        title: 'Congregação excluída',
        description: `A unidade "${itemExclusao.nome}" foi removida do cadastro.`,
      })

      setModalExcluirAberto(false)
      setItemExclusao(null)
      await reload()
    } catch (err: any) {
      console.error('Erro ao excluir congregação:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err?.message || 'Não foi possível remover a congregação.',
      })
    } finally {
      setExcluindo(false)
    }
  }

  const listaFiltrada = useMemo(() => {
    if (!busca.trim()) return congregacoes
    const t = busca.toLowerCase().trim()
    return congregacoes.filter((c) => {
      const n = (c.nome || '').toLowerCase()
      const e = (c.endereco || '').toLowerCase()
      const b = (c.bairro || '').toLowerCase()
      const cid = (c.cidade || '').toLowerCase()
      const d = (c.dirigenteGeral || c.dirigente_geral || '').toLowerCase()
      return n.includes(t) || e.includes(t) || b.includes(t) || cid.includes(t) || d.includes(t)
    })
  }, [congregacoes, busca])

  return (
    <div className="space-y-6">
      {/* Topo / Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Church className="w-6 h-6 text-[#C9A227]" />
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A5F]">
              Congregações / Unidades
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#5A5A5A] mt-1">
            Cadastre e organize as unidades, congregações ou filiais da sua igreja. Elas alimentam
            automaticamente todos os seletores de membros, obreiros, congregados e planilhas.
          </p>
        </div>

        {abaAtiva === 'unidades' && (
          <Button
            onClick={abrirModalNovo}
            className="bg-[#1E3A5F] hover:bg-[#16304F] text-white font-bold text-xs gap-2 shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#C9A227]" />
            Nova Congregação / Unidade
          </Button>
        )}
      </div>

      {/* ABAS: CADASTRO DE UNIDADES vs FINANCEIRO POR CONGREGAÇÃO */}
      <div className="flex border-b border-[#E6E2D8] gap-2">
        <button
          type="button"
          onClick={() => setAbaAtiva('unidades')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
            abaAtiva === 'unidades'
              ? 'border-[#C9A227] text-[#1E3A5F] bg-white rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-[#C9A227]" />
          Unidades Cadastradas ({congregacoes.length})
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('financeiro')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
            abaAtiva === 'financeiro'
              ? 'border-[#C9A227] text-[#1E3A5F] bg-white rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4 text-[#C9A227]" />
          Financeiro por Congregação (Entradas, Saídas e Repasse)
        </button>
      </div>

      {abaAtiva === 'financeiro' ? (
        <FinanceiroCongregacoes />
      ) : (
        <>
          {/* Barra de Busca e Métricas */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar por nome, bairro, cidade ou dirigente..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-10 bg-white border-[#E6E2D8] text-xs sm:text-sm rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3 py-2 rounded-xl border border-[#E6E2D8]">
              <Building2 className="w-4 h-4 text-[#C9A227]" />
              <span>
                Total cadastrado: <strong>{congregacoes.length}</strong>{' '}
                {congregacoes.length === 1 ? 'unidade' : 'unidades'}
              </span>
            </div>
          </div>

          {/* Conteúdo: Lista / Cards */}
          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#E6E2D8] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#C9A227]" />
              <span className="text-xs text-slate-500">
                Carregando congregações do banco local...
              </span>
            </div>
          ) : listaFiltrada.length === 0 ? (
            <Card className="border-[#E6E2D8] bg-white rounded-2xl">
              <CardContent className="p-10 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-[#C9A227] flex items-center justify-center mx-auto">
                  <Church className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-base text-[#1E3A5F]">
                    {busca ? 'Nenhuma congregação encontrada' : 'Nenhuma congregação cadastrada'}
                  </h3>
                  <p className="text-xs text-[#5A5A5A] max-w-md mx-auto">
                    {busca
                      ? 'Nenhum resultado corresponde aos termos da pesquisa.'
                      : 'Comece adicionando a Sede ou congregações/filiais da sua igreja. O sistema é 100% dinâmico.'}
                  </p>
                </div>
                {!busca && (
                  <Button
                    onClick={abrirModalNovo}
                    className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold gap-2"
                  >
                    <Plus className="w-4 h-4 text-[#C9A227]" />
                    Cadastrar Primeira Unidade
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listaFiltrada.map((item) => {
                const dirigenteNome = item.dirigenteGeral || item.dirigente_geral || ''
                const cultos = item.diasCulto || item.dias_culto || ''
                const localizacao = [item.endereco, item.bairro, item.cidade]
                  .filter(Boolean)
                  .join(', ')

                return (
                  <Card
                    key={item.id}
                    className="border-[#E6E2D8] bg-white rounded-2xl shadow-xs hover:border-[#C9A227]/50 transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      <div className="p-4 sm:p-5 pb-3 border-b border-[#F0ECE1] bg-[#F7F5F0]/60 flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] bg-white text-slate-700 border-[#E6E2D8]"
                            >
                              #{item.ordem ?? 1}
                            </Badge>
                            {item.ativo === false && (
                              <Badge className="bg-slate-200 text-slate-700 text-[10px]">
                                Inativa
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-serif text-lg font-bold text-[#1E3A5F] truncate">
                            {item.nome}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirModalEditar(item)}
                            className="h-8 w-8 p-0 text-slate-600 hover:text-[#1E3A5F] hover:bg-white"
                            title="Editar congregação"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirModalExcluir(item)}
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Excluir congregação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <CardContent className="p-4 sm:p-5 space-y-3 text-xs text-slate-600">
                        {localizacao ? (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#C9A227] flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{localizacao}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 italic">
                            <MapPin className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                            <span>Endereço não informado</span>
                          </div>
                        )}

                        {dirigenteNome ? (
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-3.5 h-3.5 text-[#C9A227] flex-shrink-0" />
                            <span className="truncate">
                              <strong>Liderança:</strong> {dirigenteNome}
                            </span>
                          </div>
                        ) : null}

                        {cultos ? (
                          <div className="flex items-start gap-2">
                            <Clock className="w-3.5 h-3.5 text-[#C9A227] flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">
                              <strong>Cultos:</strong> {cultos}
                            </span>
                          </div>
                        ) : null}
                      </CardContent>
                    </div>

                    <div className="p-3 bg-[#F7F5F0]/40 border-t border-[#F0ECE1] flex items-center justify-between text-[11px] text-slate-500">
                      <span>Cadastrada no banco local</span>
                      <button
                        type="button"
                        onClick={() => abrirModalEditar(item)}
                        className="text-[#1E3A5F] font-semibold hover:underline"
                      >
                        Editar detalhes →
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Criar / Editar Congregação */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="w-11 h-11 rounded-full bg-amber-50 border border-[#C9A227]/40 text-[#1E3A5F] flex items-center justify-center mx-auto mb-1">
              <Church className="w-5 h-5 text-[#C9A227]" />
            </div>
            <DialogTitle className="text-center font-serif text-xl font-bold text-[#1E3A5F]">
              {itemEdicao ? 'Editar Congregação / Unidade' : 'Nova Congregação / Unidade'}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              Preencha os dados da unidade. As alterações refletem imediatamente em todo o sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">Nome da Unidade *</label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Templo Sede, Filial Bairro Novo"
                  className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F] flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#C9A227]" />
                  Ordem
                </label>
                <Input
                  type="number"
                  min={1}
                  value={ordem}
                  onChange={(e) => setOrdem(parseInt(e.target.value, 10) || 1)}
                  className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1E3A5F]">Endereço Completo</label>
              <Input
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Ex: Rua Central, nº 100"
                className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">Bairro</label>
                <Input
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Ex: Centro ou Zona Rural"
                  className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E3A5F]">Cidade / UF</label>
                <Input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Ex: Fortaleza - CE"
                  className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1E3A5F]">
                Dirigente / Liderança Responsável
              </label>
              <Input
                value={dirigente}
                onChange={(e) => setDirigente(e.target.value)}
                placeholder="Ex: Pr. João Silva ou Pb. Marcos"
                className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1E3A5F]">Dias e Horários de Culto</label>
              <Input
                value={diasCulto}
                onChange={(e) => setDiasCulto(e.target.value)}
                placeholder="Ex: Terça (19h30) e Domingo (09h e 19h)"
                className="bg-white border-[#E6E2D8] text-xs sm:text-sm"
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#E6E2D8]">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="rounded border-[#E6E2D8] text-[#1E3A5F] focus:ring-[#C9A227]"
                />
                Unidade ativa no sistema
              </label>
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E2D8] gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalAberto(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold gap-1.5"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Congregação'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação de Exclusão */}
      <Dialog open={modalExcluirAberto} onOpenChange={setModalExcluirAberto}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center font-serif text-xl font-bold text-rose-700">
              Excluir Congregação
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A] pt-1">
              Deseja realmente remover a unidade{' '}
              <strong className="text-slate-900 font-semibold">"{itemExclusao?.nome}"</strong> do
              banco local?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
            🛡️ <strong>Segurança do cadastro:</strong> Membros, congregados e obreiros vinculados a
            esta congregação continuarão com seus cadastros intactos no sistema.
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-[#E6E2D8]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModalExcluirAberto(false)
                setItemExclusao(null)
              }}
              disabled={excluindo}
              className="flex-1 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleExcluir}
              disabled={excluindo}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold flex-1 text-xs shadow-md"
            >
              {excluindo ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Excluindo...
                </span>
              ) : (
                'Confirmar Exclusão'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminCongregacoes
