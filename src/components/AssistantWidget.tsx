import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { streamAgentChat } from '@/lib/skipAi'
import pb from '@/lib/pocketbase/client'
import { buscarVersiculoARC } from '@/lib/bibleArc'
import { useCongregacoes } from '@/hooks/useCongregacoes'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// Sanitização de asteriscos markdown (* e **) para manter o texto totalmente plano e natural
export function sanitizeMarkdownAsterisks(text: string): string {
  if (!text) return ''
  return text.replace(/\*/g, '')
}

// Resposta local de fallback estruturada e bíblica caso a conexão com a IA falhe
function generateLocalFallback(
  prompt: string,
  _isFirstMessage: boolean,
  pixConfig?: { chave: string; titular: string; mensagem: string; versiculo: string },
  congregacoesLista?: { nome: string; titulo?: string; endereco?: string; diasCulto?: string }[],
  churchName?: string,
  churchSigla?: string,
): string {
  const p = prompt.toLowerCase()
  const nomeIgreja = churchName || 'nossa igreja'
  const siglaIgreja = churchSigla || churchName || 'Igreja'

  // Carteirinha de membro / documentos administrativos
  // Diferenciar capacidade de permissão: o sistema possui essa função, mas a emissão é administrativa e exige acesso autorizado ao painel.
  if (
    p.includes('carteirinha') ||
    (p.includes('carteira') &&
      (p.includes('membro') ||
        p.includes('gerar') ||
        p.includes('minha') ||
        p.includes('emitir') ||
        p.includes('fazer')))
  ) {
    return 'O sistema possui essa função, mas a emissão da carteira é administrativa e exige acesso autorizado ao painel.'
  }

  if (p.includes('carta de recomendação') || p.includes('carta de mudança')) {
    return 'Esse documento pode ser emitido pelo sistema administrativo. Para gerar a carta, é necessário acesso autorizado ao painel.'
  }

  // Chave PIX e Contribuições
  if (
    p.includes('pix') ||
    p.includes('doar') ||
    p.includes('doação') ||
    p.includes('doacao') ||
    p.includes('dízimo') ||
    p.includes('dizimo') ||
    p.includes('oferta') ||
    p.includes('contribuir') ||
    p.includes('contribuição') ||
    p.includes('contribuicao') ||
    p.includes('cnpj')
  ) {
    const chave = pixConfig?.chave || '14.037.658/0001-82'
    const titular = pixConfig?.titular || 'José Francisco Portela'

    const pedeChaveDireta =
      p.includes('chave') ||
      p.includes('qual o') ||
      p.includes('qual é') ||
      p.includes('qual e') ||
      p.includes('número') ||
      p.includes('numero') ||
      p.includes('cnpj')

    if (pedeChaveDireta) {
      return `A chave PIX oficial da ${siglaIgreja} é o CNPJ: ${chave} (Titular: ${titular}).`
    }

    return 'Claro. Você prefere fazer pelo PIX ou presencialmente na igreja?'
  }

  // Bloqueio de dados pessoais de membros
  if (
    p.includes('cpf') ||
    p.includes('rg') ||
    p.includes('identidade') ||
    p.includes('endereço') ||
    p.includes('endereco') ||
    p.includes('telefone') ||
    p.includes('ficha')
  ) {
    return 'Não posso fornecer esse dado pessoal.'
  }

  // Quantidade de congregações / unidades
  if (
    p.includes('quantas congregações') ||
    p.includes('quantas congregacoes') ||
    p.includes('quantas unidades') ||
    p.includes('quais são as congregações') ||
    p.includes('quais sao as congregacoes') ||
    p.includes('quais as congregações') ||
    p.includes('quais as congregacoes') ||
    p.includes('quais são as unidades') ||
    p.includes('quais sao as unidades') ||
    p.includes('quais as unidades') ||
    p.includes('lista de congregações') ||
    p.includes('lista de congregacoes') ||
    p.includes('lista de unidades')
  ) {
    if (congregacoesLista && congregacoesLista.length > 0) {
      const total = congregacoesLista.length
      const nomes = congregacoesLista.map((c) => c.nome).join(', ')
      return `Atualmente a ${nomeIgreja} conta com ${total} ${total === 1 ? 'congregação' : 'congregações'}: ${nomes}.`
    }
    return `A ${nomeIgreja} conta com o Templo Sede e congregações filiais em constante expansão.`
  }

  // Bíblia ARC / Versículos
  if (
    p.includes('biblia') ||
    p.includes('bíblia') ||
    p.includes('versículo') ||
    p.includes('versiculo') ||
    p.includes('almeida') ||
    p.includes('arc') ||
    p.includes('salmo') ||
    p.includes('deus') ||
    p.includes('jesus') ||
    p.includes('oração') ||
    p.includes('oracao') ||
    p.includes('paz') ||
    p.includes('fé') ||
    p.includes('fe')
  ) {
    const achados = buscarVersiculoARC(prompt)
    const v = achados[0]
    return `"${v.texto}" — ${v.livro} ${v.capitulo}:${v.versiculo} (ARC).`
  }

  // Agendas / Cultos / Endereços dinâmicos por congregação
  if (
    p.includes('culto') ||
    p.includes('agenda') ||
    p.includes('horário') ||
    p.includes('horario') ||
    p.includes('domingo') ||
    p.includes('quinta') ||
    p.includes('endereço') ||
    p.includes('endereco') ||
    p.includes('onde fica') ||
    p.includes('localização') ||
    p.includes('localizacao')
  ) {
    if (congregacoesLista && congregacoesLista.length > 0) {
      for (const cong of congregacoesLista) {
        const nomeLower = cong.nome.toLowerCase()
        const palavrasChave = nomeLower
          .replace('congregação', '')
          .replace('da', '')
          .replace('das', '')
          .replace('do', '')
          .replace('dos', '')
          .trim()
          .split(/\s+/)
          .filter((w) => w.length >= 3)

        const match = p.includes(nomeLower) || palavrasChave.some((palavra) => p.includes(palavra))

        if (match) {
          if (
            p.includes('endereço') ||
            p.includes('endereco') ||
            p.includes('onde fica') ||
            p.includes('localização') ||
            p.includes('localizacao')
          ) {
            return `O endereço de ${cong.nome} é: ${cong.endereco || 'informação disponível com a secretaria'}.`
          }
          return `Em ${cong.nome}, a programação de cultos é: ${cong.diasCulto || 'consulte a nossa agenda semanal'}.`
        }
      }
      const nomes = congregacoesLista.map((c) => c.nome).join(', ')
      return `Claro. Em qual congregação você quer saber: ${nomes}?`
    }

    if (congregacoesLista && congregacoesLista.length > 0) {
      const nomes = congregacoesLista.map((c) => c.nome).join(', ')
      return `Em qual unidade você deseja saber a programação: ${nomes}?`
    }
    return 'Consulte a programação completa dos cultos no menu do sistema.'
  }

  // Festividades / Calendário
  if (
    p.includes('festa') ||
    p.includes('festividade') ||
    p.includes('calendário') ||
    p.includes('calendario') ||
    p.includes('congresso') ||
    p.includes('evento')
  ) {
    return 'Você encontra a programação completa das festividades na página de Calendário do sistema.'
  }

  return `Olá! Posso te ajudar com horários de cultos, congregações, escalas, Bíblia Sagrada (ARC) ou informações da ${nomeIgreja}. Do que você precisa?`
}

export const AssistantWidget: React.FC = () => {
  const { congregacoes } = useCongregacoes()
  const { config } = useChurchConfig()
  const [isOpen, setIsOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>('/assistant-avatar.png')
  const [pixConfig, setPixConfig] = useState<{
    chave: string
    titular: string
    mensagem: string
    versiculo: string
  }>({
    chave: '14.037.658/0001-82',
    titular: 'José Francisco Portela',
    mensagem:
      'Cada um dê conforme determinou em seu coração, não com tristeza ou por obrigação, pois Deus ama quem dá com alegria.',
    versiculo: '2 Coríntios 9:7',
  })
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Em que posso ajudar?',
    },
  ])

  useEffect(() => {
    // Busca a foto oficial do Pastor Presidente para sincronizar com o avatar do assistente se houver
    const fetchDados = async () => {
      try {
        const pastor = await pb
          .collection('obreiros')
          .getFirstListItem<any>("cargo='Pastor Presidente'")
        if (pastor && pastor.foto) {
          setAvatarUrl(pb.files.getURL(pastor, pastor.foto))
        }
      } catch {
        // Fallback mantém /assistant-avatar.png
      }

      // Buscar configurações oficiais da igreja (chave PIX, titular, versículo)
      try {
        const configs = await pb.collection('configuracoes').getFullList<any>()
        const cfgMap: Record<string, string> = {}
        configs.forEach((c) => {
          if (c.chave && c.valor) cfgMap[c.chave] = c.valor
        })

        const chaveEncontrada =
          cfgMap['pix_chave_copia_e_cola'] || cfgMap['pix_cnpj'] || '14.037.658/0001-82'
        setPixConfig({
          chave: chaveEncontrada.includes('@') ? '14.037.658/0001-82' : chaveEncontrada,
          titular: cfgMap['pix_titular'] || 'José Francisco Portela',
          mensagem:
            cfgMap['pix_mensagem'] ||
            'Cada um dê conforme determinou em seu coração, não com tristeza ou por obrigação, pois Deus ama quem dá com alegria.',
          versiculo: cfgMap['pix_versiculo'] || '2 Coríntios 9:7',
        })
      } catch {
        /* ignore */
      }
    }
    fetchDados()
  }, [])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMsgId = 'msg-' + Date.now()
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, role: 'user', content: trimmed },
    ]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    const assistantMsgId = 'msg-' + (Date.now() + 1)
    // Placeholder para a resposta
    setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }])

    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    try {
      const baseUrl = import.meta.env.VITE_POCKETBASE_URL
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (pb.authStore.token) {
        headers['Authorization'] = pb.authStore.token
      }

      const res = await fetch(`${baseUrl}/backend/v1/agent-chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: trimmed,
          conversation_id: conversationId,
          stream: true,
        }),
        signal,
      })

      const result = await streamAgentChat(res, {
        onChunk: (_delta, full) => {
          const sanitized = sanitizeMarkdownAsterisks(full)
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: sanitized } : m)),
          )
        },
        signal,
      })

      if (result.conversation_id) {
        setConversationId(result.conversation_id)
      }
      if (result.content) {
        const sanitizedFinal = sanitizeMarkdownAsterisks(result.content)
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: sanitizedFinal } : m)),
        )
      }
    } catch (err: unknown) {
      if (signal.aborted) return
      // Fallback em caso de erro na stream: tenta resposta síncrona
      try {
        const baseUrl = import.meta.env.VITE_POCKETBASE_URL
        const fallbackRes = await fetch(`${baseUrl}/backend/v1/agent-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {}),
          },
          body: JSON.stringify({
            message: trimmed,
            conversation_id: conversationId,
            stream: false,
          }),
        })
        const data = await fallbackRes.json()
        if (data.content) {
          const sanitizedSync = sanitizeMarkdownAsterisks(data.content)
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: sanitizedSync } : m)),
          )
          if (data.conversation_id) setConversationId(data.conversation_id)
          return
        }
      } catch {
        /* intentionally ignored */
      }

      const isFirst = messages.filter((m) => m.role === 'user').length <= 1
      const fallbackTexto = sanitizeMarkdownAsterisks(
        generateLocalFallback(
          trimmed,
          isFirst,
          pixConfig,
          congregacoes,
          config.nomeIgreja,
          config.siglaIgreja,
        ),
      )
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: fallbackTexto,
              }
            : m,
        ),
      )
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            aria-label={`Abrir Assistente ${config.siglaIgreja || 'da Igreja'}`}
            className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-[#1E3A5F] shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:ring-offset-2 overflow-hidden border-2 border-[#C9A227]"
          >
            <img
              src={avatarUrl}
              alt={`Avatar Assistente ${config.siglaIgreja || 'da Igreja'}`}
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                // Fallback para ícone caso a imagem falhe
                ;(e.currentTarget as HTMLElement).style.display = 'none'
              }}
            />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C9A227] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#C9A227]"></span>
            </span>
          </button>
        ) : null}
      </div>

      {/* Painel do Chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[400px] h-[540px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-[#E6E2D8] flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-[#1E3A5F] text-white px-4 py-3.5 flex items-center justify-between border-b border-[#16304F]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full border-2 border-[#C9A227] flex items-center justify-center overflow-hidden bg-white/10 flex-shrink-0 shadow-sm">
                <img
                  src={avatarUrl}
                  alt={`Assistente Virtual ${config.siglaIgreja || 'da Igreja'}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-serif text-sm font-semibold text-white flex items-center gap-1.5">
                  Assistente Virtual {config.siglaIgreja || 'da Igreja'}
                  <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                </h3>
                <p className="text-[11px] text-slate-300">Em que posso ajudar? • Online</p>
              </div>
            </div>
            <button
              onClick={() => {
                handleCancel()
                setIsOpen(false)
              }}
              className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Fechar assistente"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lista de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F7F5F0]/60">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full border border-[#C9A227]/60 overflow-hidden flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm bg-white">
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-[#1E3A5F] text-white rounded-tr-xs'
                      : 'bg-white text-[#1A1A1A] border border-[#E6E2D8] rounded-tl-xs whitespace-pre-wrap'
                  }`}
                >
                  {m.content ? (
                    m.role === 'assistant' ? (
                      sanitizeMarkdownAsterisks(m.content)
                    ) : (
                      m.content
                    )
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400 py-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-pulse"></span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-pulse delay-150"></span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-pulse delay-300"></span>
                    </span>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-[#C9A227] text-[#1E3A5F] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs shadow-sm font-semibold">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Sugestões rápidas no início */}
          {messages.length <= 1 && (
            <div className="px-3 py-2 bg-white border-t border-[#E6E2D8]/80 flex gap-1.5 overflow-x-auto text-[11px]">
              <button
                onClick={() => {
                  setInput('Compartilhe um versículo bíblico da versão ARC com uma reflexão.')
                }}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-[#C9A227] font-medium transition flex items-center gap-1"
              >
                <BookOpen className="w-3 h-3" />📖 Bíblia ARC
              </button>
              <button
                onClick={() => {
                  setInput('Quais os dias e horários de culto na igreja?')
                }}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                🕒 Dias de Culto
              </button>
              <button
                onClick={() => {
                  setInput('Quais são as próximas festividades no calendário da igreja?')
                }}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                🎉 Festividades
              </button>
              <button
                onClick={() => {
                  setInput('Qual é a chave PIX para envio de dízimos e ofertas?')
                }}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                💰 Chave PIX
              </button>
            </div>
          )}

          {/* Input de envio */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-white border-t border-[#E6E2D8] flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida ou mensagem..."
              className="text-xs sm:text-sm border-[#E6E2D8] focus-visible:ring-[#C9A227]"
              disabled={isLoading}
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !input.trim()}
              className="bg-[#1E3A5F] hover:bg-[#16304F] text-white px-3 flex-shrink-0"
              aria-label="Enviar mensagem"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  )
}
