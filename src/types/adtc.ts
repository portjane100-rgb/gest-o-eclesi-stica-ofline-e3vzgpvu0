import type { RecordModel } from 'pocketbase'

export type SituacaoEclesiastica =
  | 'Ativo'
  | 'Inativo/Afastado'
  | 'Transferido por Mudança'
  | 'Falecido'

export interface Membro extends RecordModel {
  nome: string
  numero_ficha?: string
  filiacao?: string
  naturalidade?: string
  estado_civil?: string
  rg?: string
  cpf?: string
  endereco?: string
  observacao?: string
  data_nascimento?: string
  data_nascimento_texto?: string
  telefone?: string
  whatsapp?: string
  data_conversao?: string
  data_conversao_texto?: string
  data_batismo?: string
  data_batismo_texto?: string
  congregacao: string
  foto?: string
  status: SituacaoEclesiastica | string
  numero_registro?: string
  cargo?: string
}

export interface Congregado extends RecordModel {
  nome: string
  telefone?: string
  whatsapp?: string
  data_nascimento?: string
  congregacao: string
  status?: SituacaoEclesiastica | string
}

export interface SolicitacaoCadastro extends RecordModel {
  tipo: 'membro' | 'congregado'
  status_solicitacao: 'pendente' | 'aprovada' | 'rejeitada'
  nome: string
  telefone?: string
  whatsapp?: string
  data_nascimento?: string
  data_nascimento_texto?: string
  congregacao: string
  filiacao?: string
  naturalidade?: string
  estado_civil?: string
  rg?: string
  cpf?: string
  endereco?: string
  observacao?: string
  data_conversao?: string
  data_conversao_texto?: string
  data_batismo?: string
  data_batismo_texto?: string
  cargo?: string
}

export interface Obreiro extends RecordModel {
  nome: string
  cargo: 'Pastor Presidente' | 'Evangelista' | 'Presbítero' | 'Diácono' | 'Auxiliar'
  foto?: string
  telefone?: string
  congregacao: string
  status: 'Ativo' | 'Inativo'
  ordem?: number
  mensagem_pastoral?: string
}

export interface Dizimista extends RecordModel {
  nome: string
  mes_referencia?: string
  congregacao: string
  membro?: string
  ativo?: boolean
  expand?: {
    membro?: Membro
  }
}

export interface Patrimonio extends RecordModel {
  tipo: 'Templo' | 'Casa Pastoral' | 'Bem Inventariado'
  nome: string
  endereco?: string
  descricao?: string
  quantidade?: number
  detalhes?: string
}

export interface EscalaItem extends RecordModel {
  data: string
  culto_horario?: string
  local: string
  dirigente?: string
  pregador?: string
  portaria_recepcao?: string
  som_midia?: string
  louvor?: string
  professores_salinha_criancas?: string
}

export interface EscalaSemanaDia {
  dia: string // 'Segunda-feira', 'Terça-feira', etc.
  data?: string // '21/09/2026'
  atividades: string[]
  obreiros_escalados?: string
  professoras_salinhas?: string
  recepcao?: string
}

export interface EscalaSemanaItem extends RecordModel {
  titulo: string
  data_inicio: string
  data_fim: string
  dias: EscalaSemanaDia[]
  observacoes?: string
  ativa?: boolean
  fotos?: string[]
}

export interface CalendarioEvento extends RecordModel {
  titulo: string
  data_inicio: string
  data_termino?: string
  departamento?: string
  descricao?: string
  foto?: string
}

export interface CongregacaoRegistro extends RecordModel {
  nome: string
  titulo?: string
  subtitulo?: string
  endereco?: string
  dias_culto?: string
  dirigente_geral?: string
  ordem?: number
  ativa?: boolean
}

export type TipoMovimentacaoCongregacao = 'entrada' | 'saida' | 'repasse_sede'

export interface MovimentacaoFinanceiroCongregacao {
  id: string
  congregacao: string
  data: string // YYYY-MM-DD
  descricao: string
  categoria?: string
  tipo: TipoMovimentacaoCongregacao // 'entrada' | 'saida' | 'repasse_sede'
  valor: number
  responsavel?: string
  observacoes?: string
  created?: string
  updated?: string
}

export interface AgendaSemanalItem extends RecordModel {
  unidade: string
  dia_semana: 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Domingo'
  horario?: string
  evento: string
  observacao?: string
}

export interface Configuracao extends RecordModel {
  chave: string
  valor?: string
  arquivo?: string
}

export interface Salmo extends RecordModel {
  numero?: number
  titulo: string
  descricao?: string
  audio?: string
  ordem?: number
}

export interface AlbumFotos extends RecordModel {
  titulo: string
  descricao?: string
  data_evento?: string
  ordem?: number
}

export interface FotoItem extends RecordModel {
  album: string
  arquivo: string
  legenda?: string
  ordem?: number
  expand?: {
    album?: AlbumFotos
  }
}

export interface CartaRecebida extends RecordModel {
  nome: string
  tipo_pessoa: 'Membro' | 'Obreiro'
  funcao_obreiro?: string
  igreja_origem: string
  cidade_origem?: string
  data_recebimento: string
  congregacao_destino?: string
  arquivo_pdf?: string
  observacoes?: string
}

export interface LinhaDizimoPlanilha {
  id: string
  numero: number
  nome: string
  membroId?: string
  origem?: string // 'Sede' ou 'Congregação <nome>'
  valor1: number
  valor2: number
  valor3: number
  total: number
}

export interface LinhaOfertaPlanilha {
  id: string
  numero: number
  data: string
  valor: number
}

export interface LinhaContabilidadePlanilha {
  id: string
  numero: number
  descricao: string
  tipo: 'Entrada' | 'Despesa'
  valor: number
}

export interface AssinaturasPlanilha {
  tesoureiro?: string
  fiscal?: string
  supervisor?: string
  pastorPresidente?: string
}

export interface ValoresManuaisPlanilha {
  total_ofertas?: number | null
  total_dizimos?: number | null
  oferta_especial?: number | null
  total_entradas?: number | null
  total_saidas?: number | null
  saldo_sede?: number | null
  saldo_congregacao?: number | null
  saldo_mes_anterior?: number | null
  porcentagem_dirigente?: number | null
  saldo_restante_apos_despesas?: number | null
  valor_dirigente?: number | null
}

export interface PlanilhaMensalRecord extends RecordModel {
  mes: number
  ano: number
  congregacao: string
  chave_periodo: string
  linhas_dizimos: LinhaDizimoPlanilha[]
  linhas_ofertas: LinhaOfertaPlanilha[]
  linhas_contabilidade: LinhaContabilidadePlanilha[]
  saldo_mes_anterior: number
  total_ofertas: number
  total_dizimos: number
  oferta_especial: number
  total_entradas: number
  total_saidas_20?: number // campo legado mantido para compatibilidade
  total_saidas?: number // novo campo com o percentual dinâmico
  percentual_sede?: number // porcentagem repassada à sede ou do dirigente (ex. 20, 30, 40)
  porcentagem_dirigente?: number // porcentagem do dirigente na filial (ex: 20, 30, 40)
  saldos_recebidos_congregacoes?: Record<string, number> // na Sede: mapa { nomeCongregacao: valor }
  total_saldos_recebidos?: number // somatório na Sede
  valores_manuais?: ValoresManuaisPlanilha
  saldo_sede: number
  saldo_congregacao: number
  assinaturas?: AssinaturasPlanilha
  observacoes?: string
  metadata?: {
    salvo_por?: string
    salvo_por_id?: string
    salvo_por_perfil?: string
    data_hora_salvo?: string
  }
}

// Lista dinâmica: mantida como array aberto de string para seletores que precisam de fallback
export const UNIDADES: string[] = []

export const DIAS_SEMANA = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
] as const

export const CARGOS_OBREIROS = [
  'Pastor Presidente',
  'Evangelista',
  'Presbítero',
  'Diácono',
  'Auxiliar',
] as const
