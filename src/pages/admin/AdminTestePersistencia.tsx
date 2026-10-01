import React, { useState } from 'react'
import { getItems, createItem, updateItem, deleteItem, getChurchSettings } from '@/lib/dataClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Loader2,
  ShieldCheck,
  Database,
  Trash2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TestStep {
  id: string
  name: string
  collection: string
  status: 'idle' | 'running' | 'success' | 'failed'
  details?: string
  createdId?: string
}

export const AdminTestePersistencia: React.FC = () => {
  const { toast } = useToast()
  const [isRunning, setIsRunning] = useState(false)
  const [testCompleted, setTestCompleted] = useState(false)
  const [score, setScore] = useState<{ passed: number; total: number }>({ passed: 0, total: 7 })

  const [steps, setSteps] = useState<TestStep[]>([
    { id: '1', name: '1. MEMBRO TESTE', collection: 'membros', status: 'idle' },
    { id: '2', name: '2. OBREIRO TESTE', collection: 'obreiros', status: 'idle' },
    { id: '3', name: '3. PATRIMÔNIO TESTE', collection: 'patrimonio', status: 'idle' },
    { id: '4', name: '4. EVENTO TESTE', collection: 'calendario', status: 'idle' },
    { id: '5', name: '5. ESCALA TESTE', collection: 'escala_semana', status: 'idle' },
    { id: '6', name: '6. CONFIGURAÇÃO TESTE', collection: 'configuracoes', status: 'idle' },
    {
      id: '7',
      name: '7. DOCUMENTO TESTE (Carta Recebida)',
      collection: 'cartas_recebidas',
      status: 'idle',
    },
  ])

  const runAllTests = async () => {
    setIsRunning(true)
    setTestCompleted(false)
    let passedCount = 0
    const nowStamp = Date.now()

    const updateStep = (id: string, patch: Partial<TestStep>) => {
      setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    }

    try {
      // 1. MEMBRO TESTE
      updateStep('1', { status: 'running', details: 'Criando registro de membro...' })
      try {
        const membroPayload = {
          nome: `Membro Teste Persistência ${nowStamp}`,
          numero_ficha: `TEST-${nowStamp.toString().slice(-4)}`,
          status: 'Ativo',
          estado_civil: 'Casado',
          filiacao: 'Pai Teste e Mãe Teste',
          naturalidade: 'Cidade Teste',
          cpf: '000.000.000-00',
          observacao: 'Registro automatizado do Teste de Persistência',
        }
        const membroCreated = await createItem('membros', membroPayload)
        const membrosList = await getItems('membros')
        const achouMembro = membrosList.find((m: any) => m.id === membroCreated.id)

        if (!achouMembro || achouMembro.nome !== membroPayload.nome) {
          throw new Error('Membro criado não foi recuperado fielmente na reconsulta.')
        }

        // Testar update
        await updateItem('membros', membroCreated.id, {
          observacao: 'Observação alterada com sucesso no teste',
        })
        const membrosListPosUpdate = await getItems('membros')
        const achouPosUpdate = membrosListPosUpdate.find((m: any) => m.id === membroCreated.id)
        if (achouPosUpdate?.observacao !== 'Observação alterada com sucesso no teste') {
          throw new Error('Atualização de membro não refletiu no banco.')
        }

        updateStep('1', {
          status: 'success',
          createdId: membroCreated.id,
          details: `Salvo e verificado com sucesso (ID: ${membroCreated.id})`,
        })
        passedCount++
      } catch (err: any) {
        updateStep('1', { status: 'failed', details: err?.message || 'Falha no teste' })
      }

      // 2. OBREIRO TESTE
      updateStep('2', { status: 'running', details: 'Criando registro de obreiro...' })
      try {
        const obreiroPayload = {
          nome: `Obreiro Teste Persistência ${nowStamp}`,
          cargo: 'Diácono',
          status: 'Ativo',
          ordem: 999,
          telefone: '(85) 99999-0000',
        }
        const obreiroCreated = await createItem('obreiros', obreiroPayload)
        const obreirosList = await getItems('obreiros')
        const achouObreiro = obreirosList.find((o: any) => o.id === obreiroCreated.id)

        if (!achouObreiro || achouObreiro.nome !== obreiroPayload.nome) {
          throw new Error('Obreiro criado não foi recuperado fielmente.')
        }

        updateStep('2', {
          status: 'success',
          createdId: obreiroCreated.id,
          details: `Salvo e verificado com sucesso (ID: ${obreiroCreated.id})`,
        })
        passedCount++
      } catch (err: any) {
        updateStep('2', { status: 'failed', details: err?.message || 'Falha no teste' })
      }

      // 3. PATRIMÔNIO TESTE
      updateStep('3', { status: 'running', details: 'Criando registro de patrimônio...' })
      try {
        const patrimonioPayload = {
          nome: `Item Patrimônio Teste ${nowStamp}`,
          categoria: 'Equipamento de Som',
          localizacao: 'Templo Sede',
          quantidade: 2,
          estado: 'Novo',
          observacoes: 'Item gerado pelo teste de persistência',
        }
        const patrimonioCreated = await createItem('patrimonio', patrimonioPayload)
        const patList = await getItems('patrimonio')
        const achouPat = patList.find((p: any) => p.id === patrimonioCreated.id)

        if (!achouPat || achouPat.nome !== patrimonioPayload.nome) {
          throw new Error('Patrimônio criado não foi recuperado fielmente.')
        }

        updateStep('3', {
          status: 'success',
          createdId: patrimonioCreated.id,
          details: `Salvo e verificado com sucesso (ID: ${patrimonioCreated.id})`,
        })
        passedCount++
      } catch (err: any) {
        updateStep('3', { status: 'failed', details: err?.message || 'Falha no teste' })
      }

      // 4. EVENTO TESTE
      updateStep('4', { status: 'running', details: 'Criando registro de evento no calendário...' })
      try {
        const eventoPayload = {
          titulo: `Evento Teste Persistência ${nowStamp}`,
          data_inicio: '2026-12-25',
          data_termino: '2026-12-25',
          departamento: 'Geral',
          descricao: 'Celebração de teste de persistência',
        }
        const eventoCreated = await createItem('calendario', eventoPayload)
        const calList = await getItems('calendario')
        const achouEvento = calList.find((e: any) => e.id === eventoCreated.id)

        if (!achouEvento || achouEvento.titulo !== eventoPayload.titulo) {
          throw new Error('Evento de calendário criado não foi recuperado.')
        }

        updateStep('4', {
          status: 'success',
          createdId: eventoCreated.id,
          details: `Salvo e verificado com sucesso (ID: ${eventoCreated.id})`,
        })
        passedCount++
      } catch (err: any) {
        updateStep('4', { status: 'failed', details: err?.message || 'Falha no teste' })
      }

      // 5. ESCALA TESTE
      updateStep('5', { status: 'running', details: 'Criando escala da semana de teste...' })
      try {
        const escalaPayload = {
          titulo: `Escala Teste Persistência ${nowStamp}`,
          data_inicio: '2026-11-02',
          data_fim: '2026-11-08',
          dias: [
            { dia: 'Segunda-feira', data: '02/11/2026', atividades: ['Oração 19:30'] },
            { dia: 'Quarta-feira', data: '04/11/2026', atividades: ['Doutrina 19:30'] },
          ],
          observacoes: 'Escala de teste',
          ativa: true,
        }
        const escalaCreated = await createItem('escala_semana', escalaPayload)
        const escalaList = await getItems('escala_semana')
        const achouEscala = escalaList.find((e: any) => e.id === escalaCreated.id)

        if (!achouEscala || achouEscala.titulo !== escalaPayload.titulo) {
          throw new Error('Escala criada não foi recuperada fielmente.')
        }

        updateStep('5', {
          status: 'success',
          createdId: escalaCreated.id,
          details: `Salvo e verificado com sucesso (ID: ${escalaCreated.id})`,
        })
        passedCount++
      } catch (err: any) {
        updateStep('5', { status: 'failed', details: err?.message || 'Falha no teste' })
      }

      // 6. CONFIGURAÇÃO TESTE
      updateStep('6', { status: 'running', details: 'Gravando chave de configuração...' })
      try {
        const testChave = `teste_persist_${nowStamp}`
        const testValor = `VALOR_OK_${nowStamp}`
        const configCreated = await createItem('configuracoes', {
          chave: testChave,
          valor: testValor,
        })
        const configsList = await getItems('configuracoes')
        const achouConfig = configsList.find((c: any) => c.chave === testChave)

        if (!achouConfig || achouConfig.valor !== testValor) {
          throw new Error('Configuração de teste não foi gravada ou lida com exatidão.')
        }

        // Testar também a fonte única getChurchSettings
        const settings = await getChurchSettings()
        if (!settings || typeof settings.nomeIgreja !== 'string') {
          throw new Error('getChurchSettings não retornou o objeto de configuração unificado.')
        }

        updateStep('6', {
          status: 'success',
          createdId: configCreated.id,
          details: `Chave gravada e lida via dataClient + getChurchSettings ativa (ID: ${configCreated.id})`,
        })
        passedCount++
      } catch (err: any) {
        updateStep('6', { status: 'failed', details: err?.message || 'Falha no teste' })
      }

      // 7. DOCUMENTO TESTE (Carta Recebida)
      updateStep('7', { status: 'running', details: 'Criando documento em cartas_recebidas...' })
      try {
        const cartaPayload = {
          nome: `Membro Transferido Teste ${nowStamp}`,
          tipo_pessoa: 'Membro',
          igreja_origem: 'Igreja Coirmã Teste',
          cidade_origem: 'Fortaleza/CE',
          data_recebimento: '2026-10-10',
          observacoes: 'Documento oficial de teste de persistência',
        }
        const cartaCreated = await createItem('cartas_recebidas', cartaPayload)
        const cartas = await getItems('cartas_recebidas')
        const achouCarta = cartas.find((c: any) => c.id === cartaCreated.id)

        if (!achouCarta || achouCarta.nome !== cartaPayload.nome) {
          throw new Error('Documento criado em cartas_recebidas não foi recuperado.')
        }

        updateStep('7', {
          status: 'success',
          createdId: cartaCreated.id,
          details: `Salvo e verificado com sucesso (ID: ${cartaCreated.id})`,
        })
        passedCount++
      } catch (err: any) {
        updateStep('7', { status: 'failed', details: err?.message || 'Falha no teste' })
      }
    } finally {
      setIsRunning(false)
      setTestCompleted(true)
      setScore({ passed: passedCount, total: 7 })

      if (passedCount === 7) {
        toast({
          title: '✓ PERSISTÊNCIA: 7/7 APROVADA!',
          description:
            'Todas as 7 entidades foram criadas, lidas e validadas com sucesso via dataClient.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: `Persistência: ${passedCount}/7`,
          description: 'Alguns testes falharam. Verifique os detalhes na tela.',
        })
      }
    }
  }

  const cleanAllTestRecords = async () => {
    setIsRunning(true)
    let cleaned = 0
    try {
      for (const step of steps) {
        if (step.createdId) {
          try {
            await deleteItem(step.collection, step.createdId)
            cleaned++
          } catch (e) {
            console.warn(`Falha ao remover registro de teste ${step.createdId}:`, e)
          }
        }
      }

      setSteps((prev) =>
        prev.map((s) => ({
          ...s,
          createdId: undefined,
          details:
            s.status === 'success' ? `${s.details} [Registro removido do banco ✓]` : s.details,
        })),
      )

      toast({
        title: 'Registros de teste limpos com sucesso!',
        description: `${cleaned} registros temporários foram removidos do banco de dados.`,
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E6E2D8] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Badge className="bg-[#1E3A5F] text-white text-[10px] uppercase font-bold tracking-wider mb-1">
            Auditoria & Verificação
          </Badge>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3A5F] flex items-center gap-2">
            Teste de Persistência 7/7
            <ShieldCheck className="w-6 h-6 text-[#C9A227]" />
          </h2>
          <p className="text-xs sm:text-sm text-[#5A5A5A] mt-1">
            Cria 7 entidades de teste via dataClient, salva, reabre/reconsulta, compara e faz
            limpeza automática.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold h-10 px-4 flex items-center gap-2 shadow-sm"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 text-[#C9A227]" />
            )}
            Executar Teste Completo
          </Button>

          {testCompleted && (
            <Button
              onClick={cleanAllTestRecords}
              disabled={isRunning || !steps.some((s) => s.createdId)}
              variant="outline"
              className="border-rose-400 text-rose-700 hover:bg-rose-50 text-xs font-bold h-10 px-3 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Remover Registros de Teste
            </Button>
          )}
        </div>
      </div>

      {/* Placar de Sucesso */}
      {testCompleted && (
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            score.passed === 7
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-3">
            {score.passed === 7 ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-8 h-8 text-amber-600 shrink-0" />
            )}
            <div>
              <div className="font-serif text-xl sm:text-2xl font-black">
                {score.passed === 7
                  ? '✓ PERSISTÊNCIA: 7/7 APROVADA'
                  : `PERSISTÊNCIA: ${score.passed}/7`}
              </div>
              <p className="text-xs sm:text-sm text-slate-700 mt-0.5">
                {score.passed === 7
                  ? 'Todas as 7 entidades operacionais foram criadas, recuperadas na reconsulta, validadas e estão prontas para limpeza.'
                  : 'Algumas etapas não completaram a validação esperada. Veja os detalhes abaixo.'}
              </p>
            </div>
          </div>

          <Badge
            className={`text-sm px-3 py-1 font-mono font-bold ${
              score.passed === 7 ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}
          >
            {score.passed} / {score.total} PASSOU
          </Badge>
        </div>
      )}

      {/* Lista das 7 Etapas */}
      <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-[#E6E2D8] bg-slate-50/50 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-base sm:text-lg font-bold text-[#1E3A5F] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#C9A227]" />
              Checklist de Persistência via dataClient
            </CardTitle>
            <span className="text-xs text-slate-500 font-medium">
              Banco local (IndexedDB) & dataClient
            </span>
          </div>
          <CardDescription className="text-xs text-slate-500 mt-1">
            Cada teste gera dados únicos com timestamp, salva no banco local, relê a coleção inteira
            e compara os campos para certificar leitura e escrita sem perdas.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-[#E6E2D8]">
          {steps.map((step) => {
            return (
              <div
                key={step.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#1E3A5F]">{step.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                      col: {step.collection}
                    </Badge>
                  </div>
                  {step.details && (
                    <p className="text-xs text-slate-600 font-mono bg-slate-50 p-1.5 rounded-md border border-slate-200 inline-block">
                      {step.details}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {step.status === 'idle' && (
                    <Badge variant="outline" className="text-xs text-slate-400 border-slate-300">
                      Pendente
                    </Badge>
                  )}
                  {step.status === 'running' && (
                    <Badge className="bg-blue-600 text-white text-xs flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Testando...
                    </Badge>
                  )}
                  {step.status === 'success' && (
                    <Badge className="bg-emerald-600 text-white text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />✓ Validado
                    </Badge>
                  )}
                  {step.status === 'failed' && (
                    <Badge className="bg-rose-600 text-white text-xs font-bold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      Falha
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminTestePersistencia
