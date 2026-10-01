import { getLogoAsDataUri, type DocChurchIdentity } from '@/lib/documentTemplates'
import { ADTC_LOGO_URL } from '@/components/AdtcLogo'
import type {
  LinhaDizimoPlanilha,
  LinhaOfertaPlanilha,
  LinhaContabilidadePlanilha,
} from '@/types/adtc'

export interface PlanilhaPdfData {
  mes: number
  mesNome: string
  ano: number
  congregacao: string
  linhasDizimos: LinhaDizimoPlanilha[]
  linhasOfertas: LinhaOfertaPlanilha[]
  linhasContabilidade: LinhaContabilidadePlanilha[]
  saldoMesAnterior: number
  totalOfertas: number
  totalDizimos: number
  ofertaEspecial: number
  totalEntradas: number
  totalSaidas20?: number // compatibilidade
  totalSaidas?: number // novo total das saídas / repasse à SEDE
  percentualSede?: number // percentual dinâmico (ex.: 20, 30, 40)
  totalDespesas?: number // total de despesas lançadas no verso
  baseCalculoRepasse?: number // bruto após despesas
  saldoSede: number
  saldoCongregacao: number
  // Assinaturas configuradas ou gravadas
  assinaturaPastorUrl?: string | null
  assinaturaSecretario1Url?: string | null
  assinaturaSecretario2Url?: string | null
  nomePastor?: string
  cargoPastor?: string
  nomeTesoureiro?: string
  nomeFiscal?: string
  nomeSupervisor?: string
  observacoes?: string
  church?: DocChurchIdentity
}

export function formatarMoeda(valor?: number): string {
  const v = typeof valor === 'number' && !isNaN(valor) ? valor : 0
  return v.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatarMoedaOuVazio(valor?: number): string {
  if (typeof valor !== 'number' || isNaN(valor) || valor === 0) {
    return ''
  }
  return formatarMoeda(valor)
}

/**
 * Constrói o HTML frente e verso fiel ao modelo em papel oficial da igreja:
 * - Página 1 (Frente): Cabeçalho oficial com logo da ADTC, congregação, mês/ano,
 *   bloco esquerdo "Entrada por Dízimos" (56 linhas numeradas com Nome, 3x R$, Total)
 *   e bloco direito "Entrada por Ofertas" (Data | R$).
 * - Página 2 (Verso): Cabeçalho "Contabilidade Geral", tabela de "Outras Entradas / Despesas"
 *   com Descrição e Valor (20+ linhas), bloco de cálculos automáticos (Saldo mês anterior,
 *   Total ofertas, Total dízimos, Oferta Especial, Total entradas, Saídas 20%, Saldo Sede,
 *   Saldo congregação), e linha com 4 assinaturas (Tesoureiro, Fiscal, Supervisor, Pastor Presidente).
 */
export async function buildPlanilhaMensalHtml(dados: PlanilhaPdfData): Promise<string> {
  const logoSrc = dados.church?.logoUrl || ADTC_LOGO_URL
  const logoDataUri = await getLogoAsDataUri(logoSrc)
  const nomeIgreja =
    dados.church?.denominacao || dados.church?.nomeIgreja || 'IGREJA EVANGÉLICA ASSEMBLEIA DE DEUS'
  const subtituloIgreja = dados.church?.subtituloIgreja || 'MINISTÉRIO TEMPLO CENTRAL'
  const siglaOuNome = dados.church?.siglaIgreja || dados.church?.nomeIgreja || 'Igreja'

  // Prepara exatamente 56 linhas na frente para os dízimos (conforme o modelo oficial em papel)
  const maxLinhasDizimos = 56
  const linhasDizimosCompletas: Array<{
    numero: number
    nome: string
    origem?: string
    valor1: number
    valor2: number
    valor3: number
    total: number
  }> = []

  for (let i = 1; i <= maxLinhasDizimos; i++) {
    const item = dados.linhasDizimos[i - 1]
    if (item) {
      linhasDizimosCompletas.push({
        numero: i,
        nome: item.nome || '',
        origem: item.origem || '',
        valor1: item.valor1 || 0,
        valor2: item.valor2 || 0,
        valor3: item.valor3 || 0,
        total: item.total || 0,
      })
    } else {
      linhasDizimosCompletas.push({
        numero: i,
        nome: '',
        origem: '',
        valor1: 0,
        valor2: 0,
        valor3: 0,
        total: 0,
      })
    }
  }

  // Prepara 56 linhas na coluna de ofertas (para casar a altura da tabela)
  const maxLinhasOfertas = 56
  const linhasOfertasCompletas: Array<{
    numero: number
    data: string
    valor: number
  }> = []

  for (let i = 1; i <= maxLinhasOfertas; i++) {
    const item = dados.linhasOfertas[i - 1]
    if (item) {
      linhasOfertasCompletas.push({
        numero: i,
        data: item.data || '',
        valor: item.valor || 0,
      })
    } else {
      linhasOfertasCompletas.push({
        numero: i,
        data: '',
        valor: 0,
      })
    }
  }

  // Prepara 20 linhas no verso para a tabela Descrição / Valor
  const maxLinhasVerso = 20
  const linhasVersoCompletas: Array<{
    numero: number
    descricao: string
    tipo: 'Entrada' | 'Despesa'
    valor: number
  }> = []

  for (let i = 1; i <= maxLinhasVerso; i++) {
    const item = dados.linhasContabilidade[i - 1]
    if (item) {
      linhasVersoCompletas.push({
        numero: i,
        descricao: item.descricao || '',
        tipo: item.tipo || 'Despesa',
        valor: item.valor || 0,
      })
    } else {
      linhasVersoCompletas.push({
        numero: i,
        descricao: '',
        tipo: 'Despesa',
        valor: 0,
      })
    }
  }

  const linhasDizimosHtml = linhasDizimosCompletas
    .map((l) => {
      const v1 = formatarMoedaOuVazio(l.valor1)
      const v2 = formatarMoedaOuVazio(l.valor2)
      const v3 = formatarMoedaOuVazio(l.valor3)
      const tot = l.total > 0 ? formatarMoeda(l.total) : ''

      // Identificação da origem do lançamento na planilha
      let origemBadge = ''
      if (l.origem && l.origem.trim()) {
        const origLimpa = l.origem.trim()
        const isSede = origLimpa.toLowerCase() === 'sede'
        const labelOrigem = isSede
          ? 'Sede'
          : origLimpa.toLowerCase().startsWith('congrega')
            ? origLimpa
            : `Congregação ${origLimpa}`
        origemBadge = `<span class="tag-origem ${isSede ? 'tag-sede' : 'tag-cong'}">${escapeHtml(labelOrigem)}</span>`
      }

      return `<tr>
        <td class="col-num">${l.numero}</td>
        <td class="col-nome"><div class="nome-origem-wrap"><span>${escapeHtml(l.nome)}</span>${origemBadge}</div></td>
        <td class="col-val">${v1}</td>
        <td class="col-val">${v2}</td>
        <td class="col-val">${v3}</td>
        <td class="col-total">${tot}</td>
      </tr>`
    })
    .join('')

  const linhasOfertasHtml = linhasOfertasCompletas
    .map((l) => {
      const v = formatarMoedaOuVazio(l.valor)
      return `<tr>
        <td class="col-data">${escapeHtml(l.data)}</td>
        <td class="col-val-oferta">${v}</td>
      </tr>`
    })
    .join('')

  const linhasVersoHtml = linhasVersoCompletas
    .map((l) => {
      const v = formatarMoedaOuVazio(l.valor)
      const tagTipo =
        l.descricao.trim() && l.tipo
          ? `<span class="tag-tipo ${l.tipo.toLowerCase()}">${l.tipo}</span>`
          : ''
      return `<tr>
        <td class="col-num">${l.numero}</td>
        <td class="col-desc">${escapeHtml(l.descricao)} ${tagTipo}</td>
        <td class="col-val-verso">${v}</td>
      </tr>`
    })
    .join('')

  const pastorImg = dados.assinaturaPastorUrl
    ? `<img src="${dados.assinaturaPastorUrl}" alt="Assinatura Pastor" class="sig-img" />`
    : ''

  const pctSede = typeof dados.percentualSede === 'number' ? dados.percentualSede : 20
  const valorTotalSaidas =
    typeof dados.totalSaidas === 'number'
      ? dados.totalSaidas
      : typeof dados.totalSaidas20 === 'number'
        ? dados.totalSaidas20
        : 0

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Planilha Mensal Entradas - ${escapeHtml(dados.congregacao)} - ${dados.mesNome}/${dados.ano}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 7mm 8mm 7mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8.5px;
      color: #000;
      background: #fff;
      line-height: 1.15;
    }

    .page {
      width: 100%;
      min-height: 280mm;
      position: relative;
      background: #fff;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .page:last-child {
      page-break-after: avoid;
    }

    /* CABEÇALHO FRENTE */
    .header-frente {
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .logo-container {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }
    .logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .header-text {
      flex: 1;
      text-align: center;
    }
    .titulo-igreja {
      font-size: 11.5px;
      font-weight: 900;
      letter-spacing: 0.3px;
      margin: 0;
      text-transform: uppercase;
    }
    .subtitulo-igreja {
      font-size: 8.5px;
      font-weight: bold;
      letter-spacing: 1px;
      margin: 1px 0 3px 0;
      text-transform: uppercase;
    }
    .titulo-planilha {
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin: 0;
    }

    /* BARRA DE IDENTIFICAÇÃO: CONGREGAÇÃO E MÊS/ANO */
    .info-bar {
      border: 1.5px solid #000;
      border-top: none;
      display: flex;
      font-size: 9px;
      font-weight: bold;
      margin-bottom: 4px;
      background: #fff;
    }
    .info-bar-top {
      border: 1.5px solid #000;
      display: flex;
      font-size: 9.5px;
      font-weight: bold;
      margin-bottom: 3px;
    }
    .info-bar-top > div {
      padding: 3px 6px;
    }
    .info-bar-top .campo-cong {
      flex: 1.6;
      border-right: 1.5px solid #000;
    }
    .info-bar-top .campo-mes {
      flex: 1;
      border-right: 1.5px solid #000;
    }
    .info-bar-top .campo-ano {
      width: 75px;
      text-align: center;
    }

    /* GRID PRINCIPAL: DÍZIMOS À ESQUERDA, OFERTAS À DIREITA */
    .grid-tabelas {
      display: flex;
      gap: 4px;
      flex: 1;
    }
    .tabela-dizimos-wrap {
      flex: 3.2;
    }
    .tabela-ofertas-wrap {
      flex: 1.25;
    }

    table.grade {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000;
      font-size: 8px;
    }
    table.grade th, table.grade td {
      border: 1px solid #000;
      padding: 1.5px 2px;
      height: 12.5px;
      vertical-align: middle;
    }
    table.grade th {
      background: #f0f0f0;
      font-weight: bold;
      text-align: center;
      font-size: 8.5px;
    }

    .th-principal {
      font-size: 9.5px;
      font-weight: 900;
      padding: 3px !important;
      text-transform: uppercase;
      background: #e8e8e8 !important;
    }

    .col-num {
      width: 18px;
      text-align: center;
      font-weight: bold;
      background: #fafafa;
    }
    .col-nome {
      text-align: left;
      font-weight: 500;
      padding-left: 4px !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 175px;
    }
    .nome-origem-wrap {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 3px;
      width: 100%;
    }
    .nome-origem-wrap > span:first-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tag-origem {
      font-size: 6.5px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 0.5px 3px;
      border-radius: 2px;
      letter-spacing: 0.2px;
      flex-shrink: 0;
    }
    .tag-sede {
      background: #e8e8e8;
      color: #333;
      border: 0.5px solid #bbb;
    }
    .tag-cong {
      background: #fef3c7;
      color: #78350f;
      border: 0.5px solid #d97706;
    }
    .col-val {
      width: 38px;
      text-align: right;
      padding-right: 3px !important;
      font-family: "Courier New", Courier, monospace;
      font-size: 7.5px;
    }
    .col-total {
      width: 44px;
      text-align: right;
      font-weight: bold;
      padding-right: 3px !important;
      background: #f7f7f7;
      font-family: "Courier New", Courier, monospace;
      font-size: 7.5px;
    }
    .col-data {
      width: 50px;
      text-align: center;
      font-family: "Courier New", Courier, monospace;
      font-size: 7.5px;
    }
    .col-val-oferta {
      text-align: right;
      padding-right: 3px !important;
      font-family: "Courier New", Courier, monospace;
      font-size: 7.5px;
    }

    /* RODAPÉ FRENTE COM TOTAIS RÁPIDOS */
    .rodape-frente {
      display: flex;
      justify-content: space-between;
      border: 1.5px solid #000;
      border-top: none;
      padding: 3px 6px;
      font-weight: bold;
      font-size: 9px;
      background: #f5f5f5;
      margin-top: -1px;
    }

    /* ================================================= */
    /* VERSO: CONTABILIDADE GERAL */
    /* ================================================= */
    .header-verso {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .header-verso .titulo {
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin: 0;
    }
    .header-verso .sub {
      font-size: 9px;
      font-weight: bold;
      margin: 2px 0 0 0;
    }

    table.grade-verso {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000;
      font-size: 9px;
      margin-bottom: 12px;
    }
    table.grade-verso th, table.grade-verso td {
      border: 1px solid #000;
      padding: 2.5px 4px;
      height: 16px;
    }
    table.grade-verso th {
      background: #f0f0f0;
      font-weight: bold;
      font-size: 9.5px;
    }
    .col-desc {
      text-align: left;
      font-weight: 500;
      padding-left: 6px !important;
    }
    .col-val-verso {
      width: 130px;
      text-align: right;
      padding-right: 6px !important;
      font-family: "Courier New", Courier, monospace;
      font-weight: bold;
    }
    .tag-tipo {
      display: inline-block;
      font-size: 7px;
      padding: 1px 3px;
      border-radius: 2px;
      margin-left: 6px;
      text-transform: uppercase;
      font-weight: bold;
      border: 1px solid #ccc;
    }
    .tag-tipo.entrada {
      background: #e6f4ea;
      color: #137333;
      border-color: #ceead6;
    }
    .tag-tipo.despesa {
      background: #fce8e6;
      color: #c5221f;
      border-color: #fad2cf;
    }

    /* CAIXAS DE CÁLCULO CONTÁBIL */
    .titulo-secao-calc {
      text-align: center;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 10px 0 6px 0;
    }

    .bloco-contabil-grid {
      border: 1.5px solid #000;
      margin-bottom: 8px;
    }
    .linha-contabil {
      display: flex;
      border-bottom: 1px solid #000;
      min-height: 22px;
      align-items: stretch;
    }
    .linha-contabil:last-child {
      border-bottom: none;
    }
    .linha-contabil .rotulo {
      flex: 1;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 9.5px;
      display: flex;
      align-items: center;
      background: #fff;
    }
    .linha-contabil .sufixo-rs {
      width: 45px;
      border-left: 1px solid #000;
      border-right: 1px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 9.5px;
      background: #fbfbfb;
    }
    .linha-contabil .valor-box {
      width: 140px;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      font-family: "Courier New", Courier, monospace;
      font-size: 10px;
      font-weight: 900;
      background: #fff;
    }
    .linha-destaque {
      background: #f2f2f2 !important;
    }
    .linha-destaque .rotulo {
      background: #f2f2f2 !important;
      font-weight: 900;
    }
    .linha-destaque .valor-box {
      background: #f2f2f2 !important;
    }

    /* LINHA DE ASSINATURAS DO VERSO */
    .area-assinaturas {
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding-top: 4px;
    }
    .box-assinatura {
      flex: 1;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      min-height: 70px;
    }
    .sig-img-container {
      height: 38px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      margin-bottom: 2px;
    }
    .sig-img {
      max-height: 38px;
      max-width: 90%;
      object-fit: contain;
    }
    .linha-traco {
      border-top: 1px solid #000;
      margin: 0 auto 3px auto;
      width: 95%;
    }
    .cargo-assinatura {
      font-size: 8.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .nome-assinatura {
      font-size: 7.5px;
      color: #333;
      margin-top: 1px;
    }

    .rodape-documento {
      margin-top: 10px;
      border-top: 1px dashed #999;
      padding-top: 3px;
      display: flex;
      justify-content: space-between;
      font-size: 7px;
      color: #666;
    }

    @media print {
      body {
        background: #fff;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <!-- ========================================================= -->
  <!-- PÁGINA 1: FRENTE — PLANILHA MENSAL ENTRADAS -->
  <!-- ========================================================= -->
  <div class="page">
    <div>
      <!-- CABEÇALHO OFICIAL COM LOGO -->
      <div class="header-frente">
        <div class="logo-container">
          <img src="${logoDataUri}" alt="Logo ${escapeHtml(siglaOuNome)}" class="logo-img" />
        </div>
        <div class="header-text">
          <h1 class="titulo-igreja">${escapeHtml(nomeIgreja.toUpperCase())}</h1>
          <p class="subtitulo-igreja">${escapeHtml(subtituloIgreja.toUpperCase())}</p>
          <h2 class="titulo-planilha">Planilha Mensal Entradas</h2>
        </div>
        <div style="width: 44px;"></div>
      </div>

      <!-- BARRA DE IDENTIFICAÇÃO -->
      <div class="info-bar-top">
        <div class="campo-cong">Congregação: <strong>${escapeHtml(dados.congregacao)}</strong></div>
        <div class="campo-mes">Mês: <strong>${escapeHtml(dados.mesNome)}</strong></div>
        <div class="campo-ano">Ano: <strong>${dados.ano}</strong></div>
      </div>

      <!-- GRID COM DUAS TABELAS LADO A LADO -->
      <div class="grid-tabelas">
        <!-- BLOCO ESQUERDO: DÍZIMOS (56 LINHAS) -->
        <div class="tabela-dizimos-wrap">
          <table class="grade">
            <thead>
              <tr>
                <th colspan="6" class="th-principal">Entrada por Dízimos</th>
              </tr>
              <tr>
                <th style="width: 18px;">Nº</th>
                <th>Nome dos Dizimistas</th>
                <th style="width: 38px;">R$</th>
                <th style="width: 38px;">R$</th>
                <th style="width: 38px;">R$</th>
                <th style="width: 44px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${linhasDizimosHtml}
            </tbody>
          </table>
        </div>

        <!-- BLOCO DIREITO: OFERTAS (56 LINHAS) -->
        <div class="tabela-ofertas-wrap">
          <table class="grade">
            <thead>
              <tr>
                <th colspan="2" class="th-principal">Entrada por Ofertas</th>
              </tr>
              <tr>
                <th style="width: 50px;">Data</th>
                <th>R$</th>
              </tr>
            </thead>
            <tbody>
              ${linhasOfertasHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- TOTAIS RÁPIDOS DA FRENTE -->
      <div class="rodape-frente">
        <span>Total de Dízimos: R$ ${formatarMoeda(dados.totalDizimos)}</span>
        <span>Total de Ofertas: R$ ${formatarMoeda(dados.totalOfertas)}</span>
        <span>Soma Frente: R$ ${formatarMoeda(dados.totalDizimos + dados.totalOfertas)}</span>
      </div>
    </div>

    <!-- RODAPÉ TÉCNICO -->
    <div class="rodape-documento">
      <span>${escapeHtml(dados.church?.nomeIgreja || 'Sistema de Gestão Eclesiástica')} • Sistema de Gestão Eclesiástica</span>
      <span>FRENTE • Página 1 de 2</span>
      <span>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  </div>

  <!-- ========================================================= -->
  <!-- PÁGINA 2: VERSO — CONTABILIDADE GERAL -->
  <!-- ========================================================= -->
  <div class="page">
    <div>
      <!-- CABEÇALHO DO VERSO -->
      <div class="header-verso">
        <h2 class="titulo">Contabilidade Geral</h2>
        <p class="sub">${escapeHtml(dados.congregacao)} • ${escapeHtml(dados.mesNome)} de ${dados.ano}</p>
      </div>

      <!-- TABELA SUPERIOR: DESCRIÇÃO | VALOR (20 LINHAS) -->
      <table class="grade-verso">
        <thead>
          <tr>
            <th style="width: 30px;">Nº</th>
            <th>Descrição (Outras Entradas / Despesas)</th>
            <th style="width: 130px;">Valor (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${linhasVersoHtml}
        </tbody>
      </table>

      <!-- CAIXAS DE CÁLCULO CONTÁBIL -->
      <div class="titulo-secao-calc">Fechamento do Mês</div>

      <div class="bloco-contabil-grid">
        <div class="linha-contabil">
          <div class="rotulo">Saldo do Mês Anterior</div>
          <div class="sufixo-rs">R$ =</div>
          <div class="valor-box">${formatarMoeda(dados.saldoMesAnterior)}</div>
        </div>

        <div class="linha-contabil">
          <div class="rotulo">Total de Ofertas</div>
          <div class="sufixo-rs">R$ =</div>
          <div class="valor-box">${formatarMoeda(dados.totalOfertas)}</div>
        </div>

        <div class="linha-contabil">
          <div class="rotulo">Total de Dízimos</div>
          <div class="sufixo-rs">R$ =</div>
          <div class="valor-box">${formatarMoeda(dados.totalDizimos)}</div>
        </div>

        <div class="linha-contabil">
          <div class="rotulo">Oferta Especial</div>
          <div class="sufixo-rs">R$ =</div>
          <div class="valor-box">${formatarMoeda(dados.ofertaEspecial)}</div>
        </div>

        <div class="linha-contabil linha-destaque">
          <div class="rotulo">Total das Entradas (Dízimos + Ofertas + Oferta Especial + Outras Entradas)</div>
          <div class="sufixo-rs">R$ =</div>
          <div class="valor-box">${formatarMoeda(dados.totalEntradas)}</div>
        </div>

        <div class="linha-contabil">
          <div class="rotulo">
            Total das Saídas (${pctSede}% sobre o bruto após despesas)
          </div>
          <div class="sufixo-rs">R$ =</div>
          <div class="valor-box">${formatarMoeda(valorTotalSaidas)}</div>
        </div>

        <div class="linha-contabil linha-destaque">
          <div class="rotulo">Saldo para SEDE (Dízimos − Repasse SEDE + Oferta Especial ou Voto)</div>
          <div class="sufixo-rs">R$ =</div>
          <div class="valor-box">${formatarMoeda(dados.saldoSede)}</div>
        </div>

        <div class="linha-contabil linha-destaque">
          <div class="rotulo">Saldo para Congregação (Ofertas − Despesas + Saldo Anterior)</div>
          <div class="sufixo-rs">R$ =</div>
          <div class="valor-box">${formatarMoeda(dados.saldoCongregacao)}</div>
        </div>
      </div>

      <!-- ÁREA DE ASSINATURAS DO VERSO -->
      <div class="area-assinaturas">
        <!-- 1. Tesoureiro -->
        <div class="box-assinatura">
          <div class="sig-img-container"></div>
          <div class="linha-traco"></div>
          <div class="cargo-assinatura">Tesoureiro</div>
          <div class="nome-assinatura">${escapeHtml(dados.nomeTesoureiro || 'Assinatura do Tesoureiro')}</div>
        </div>

        <!-- 2. Fiscal -->
        <div class="box-assinatura">
          <div class="sig-img-container"></div>
          <div class="linha-traco"></div>
          <div class="cargo-assinatura">Fiscal</div>
          <div class="nome-assinatura">${escapeHtml(dados.nomeFiscal || 'Conselho Fiscal')}</div>
        </div>

        <!-- 3. Supervisor -->
        <div class="box-assinatura">
          <div class="sig-img-container"></div>
          <div class="linha-traco"></div>
          <div class="cargo-assinatura">Supervisor</div>
          <div class="nome-assinatura">${escapeHtml(dados.nomeSupervisor || 'Supervisor de Área')}</div>
        </div>

        <!-- 4. Pastor Presidente -->
        <div class="box-assinatura">
          <div class="sig-img-container">
            ${pastorImg}
          </div>
          <div class="linha-traco"></div>
          <div class="cargo-assinatura">Pastor Presidente</div>
          <div class="nome-assinatura">${escapeHtml(dados.nomePastor || 'Pr. José Francisco Portela Fontenele')}</div>
        </div>
      </div>
    </div>

    <!-- RODAPÉ VERSO -->
    <div class="rodape-documento">
      <span>${escapeHtml(dados.church?.nomeIgreja || 'Gestão Eclesiástica')} • Contabilidade Geral de Congregação</span>
      <span>VERSO • Página 2 de 2</span>
      <span>Via oficial arquivada • ${escapeHtml(subtituloIgreja)}</span>
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`

  return html
}

function escapeHtml(str?: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
