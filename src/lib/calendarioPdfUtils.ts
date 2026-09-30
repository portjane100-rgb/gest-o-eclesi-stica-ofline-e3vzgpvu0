import { ADTC_LOGO_URL } from '@/components/AdtcLogo'
import { getLogoAsDataUri, type DocChurchIdentity } from '@/lib/documentTemplates'
import type { CalendarioEvento } from '@/types/adtc'
import { formatarPeriodoEvento } from '@/lib/utils'

export interface CalendarioPdfOptions {
  departamentoFiltro?: string
  anoFiltro?: string
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

/**
 * Gera documento HTML timbrado oficial em padrão folha A4
 * com a planilha/lista de datas e festividades eclesiásticas.
 */
export async function buildCalendarioFestasHtml(
  eventos: CalendarioEvento[],
  church: DocChurchIdentity,
  options?: CalendarioPdfOptions,
): Promise<string> {
  const logoSrc = church?.logoUrl || ADTC_LOGO_URL
  const logoDataUri = await getLogoAsDataUri(logoSrc)
  const nomeIgreja = church?.nomeIgreja?.trim() || 'Igreja Local'
  const denominacao = church?.denominacao?.trim() || 'IGREJA EVANGÉLICA ASSEMBLEIA DE DEUS'
  const subtitulo =
    church?.subtituloIgreja?.trim() || (nomeIgreja ? `Templo Sede — ${nomeIgreja}` : '')
  const endereco = church?.enderecoIgreja?.trim() || (church?.cidadeUf ? `${church.cidadeUf}` : '')
  const cidadeUf = church?.cidadeUf?.trim() || ''

  // Ordena os eventos por data de início crescente
  const eventosOrdenados = [...eventos].sort((a, b) => {
    const da = a.data_inicio || ''
    const db = b.data_inicio || ''
    return da.localeCompare(db)
  })

  const anoReferencia =
    options?.anoFiltro ||
    (eventosOrdenados[0]?.data_inicio
      ? eventosOrdenados[0].data_inicio.slice(0, 4)
      : new Date().getFullYear().toString())

  const subfiltro =
    options?.departamentoFiltro && options.departamentoFiltro !== 'Todos'
      ? ` • Departamento: ${options.departamentoFiltro}`
      : ''

  const linhasHtml =
    eventosOrdenados.length > 0
      ? eventosOrdenados
          .map((ev, idx) => {
            const num = idx + 1
            const fimVal = ev.data_termino || (ev as any).data_fim
            const periodoStr = formatarPeriodoEvento(ev.data_inicio, fimVal, { formato: 'abrev' })
            const depStr = ev.departamento || 'Geral'
            const tituloStr = escapeHtml(ev.titulo || 'Evento sem título')
            const descStr = escapeHtml(ev.descricao || '—')

            return `
              <tr>
                <td class="col-num">${num}</td>
                <td class="col-periodo">${periodoStr}</td>
                <td class="col-titulo">
                  <strong>${tituloStr}</strong>
                </td>
                <td class="col-dep">
                  <span class="badge-dep">${escapeHtml(depStr)}</span>
                </td>
                <td class="col-desc">${descStr}</td>
              </tr>
            `
          })
          .join('')
      : `<tr><td colspan="5" class="sem-registros">Nenhum evento ou festa cadastrado no período.</td></tr>`

  const dataEmissao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Calendário Oficial de Festas — ${escapeHtml(nomeIgreja)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #FAF8F5;
      color: #1A202C;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      line-height: 1.35;
      width: 100%;
      height: 100%;
    }
    .sheet {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      padding: 6mm 8mm;
      min-height: 275mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      background: #FAF8F5;
      border: 1px solid #EBE5D8;
    }
    .header-box {
      background: linear-gradient(135deg, #072348 0%, #0F325E 60%, #163B6E 100%);
      border-radius: 8px;
      padding: 9px 14px;
      margin-bottom: 10px;
      border-bottom: 3px solid #C9A227;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      box-shadow: 0 2px 6px rgba(7,35,72,0.15);
      color: #FFFFFF;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .header-logo {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #C9A227;
      background: #072348;
      flex-shrink: 0;
    }
    .header-titles h1 {
      margin: 0;
      font-size: 13.5pt;
      font-weight: bold;
      color: #FFFFFF;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-family: Georgia, serif;
      line-height: 1.15;
    }
    .header-titles h2 {
      margin: 2px 0 0 0;
      font-size: 8.5pt;
      font-weight: bold;
      color: #F3CA52;
      text-transform: uppercase;
      letter-spacing: 1.2px;
    }
    .header-titles p {
      margin: 2px 0 0 0;
      font-size: 7.5pt;
      color: #E2E8F0;
    }
    .header-badge {
      border: 1.5px dashed #C9A227;
      border-radius: 6px;
      padding: 5px 10px;
      text-align: center;
      background: rgba(7, 35, 72, 0.6);
      min-width: 95px;
    }
    .header-badge .lbl {
      font-size: 6.5pt;
      text-transform: uppercase;
      color: #F3CA52;
      font-weight: bold;
      letter-spacing: 0.5px;
      display: block;
    }
    .header-badge .val {
      font-size: 11pt;
      font-weight: bold;
      color: #FFFFFF;
      font-family: Georgia, serif;
      display: block;
      margin-top: 1px;
    }
    .title-strip {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: 6px 0 8px 0;
    }
    .title-strip-line {
      flex: 1;
      height: 1.5px;
      background: linear-gradient(to right, transparent, #C9A227, transparent);
    }
    .title-strip-text {
      font-family: Georgia, serif;
      font-size: 13.5pt;
      font-weight: bold;
      color: #0F325E;
      text-transform: uppercase;
      letter-spacing: 1px;
      white-space: nowrap;
      margin: 0;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #475569;
      padding: 4px 6px;
      background: #F1EBD8;
      border-radius: 4px;
      margin-bottom: 8px;
      border: 1px solid #E2D9C2;
    }
    .meta-bar strong {
      color: #0F325E;
    }
    .tabela-calendario {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #CBD5E1;
      font-size: 8.5pt;
      background: #FFFFFF;
      border-radius: 6px;
      overflow: hidden;
    }
    .tabela-calendario th {
      background: #0F325E;
      color: #FFFFFF;
      font-weight: bold;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 6px 8px;
      border: 1px solid #072348;
      text-align: left;
    }
    .tabela-calendario td {
      border: 1px solid #E2E8F0;
      padding: 5px 8px;
      vertical-align: top;
      color: #1A202C;
    }
    .tabela-calendario tr:nth-child(even) td {
      background: #FAF8F5;
    }
    .col-num {
      width: 24px;
      text-align: center;
      font-weight: bold;
      color: #64748B;
      background: #F8FAFC !important;
    }
    .col-periodo {
      width: 125px;
      font-weight: 600;
      color: #0F325E;
      white-space: nowrap;
    }
    .col-titulo {
      width: 180px;
      color: #072348;
    }
    .col-dep {
      width: 95px;
      text-align: center;
    }
    .badge-dep {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      background: #F1EBD8;
      border: 1px solid #C9A227;
      color: #8C6D15;
      font-size: 7pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .col-desc {
      font-size: 8pt;
      color: #475569;
      line-height: 1.35;
    }
    .sem-registros {
      text-align: center;
      padding: 24px !important;
      color: #64748B;
      font-style: italic;
    }
    .rodape-box {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #CBD5E1;
    }
    .signatures-row {
      display: flex;
      justify-content: space-around;
      gap: 30px;
      margin-top: 20px;
      margin-bottom: 8px;
      text-align: center;
      page-break-inside: avoid;
    }
    .sig-col {
      flex: 1;
      max-width: 220px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .sig-line {
      width: 100%;
      border-top: 1.5px solid #0F325E;
      margin-bottom: 4px;
    }
    .sig-label {
      font-size: 8pt;
      font-weight: bold;
      color: #072348;
      text-transform: uppercase;
    }
    .sig-cargo {
      font-size: 7.5pt;
      color: #64748B;
      text-transform: uppercase;
      margin-top: 1px;
    }
    .footer-timbrado {
      margin-top: 8px;
      padding-top: 5px;
      border-top: 1px dashed #C9A227;
      text-align: center;
      font-size: 7pt;
      color: #8C6D15;
      font-family: Arial, sans-serif;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div>
      <!-- Cabeçalho Timbrado Oficial -->
      <div class="header-box">
        <div class="header-left">
          <img src="${logoDataUri}" alt="Logo da Igreja" class="header-logo" />
          <div class="header-titles">
            <h1>${escapeHtml(denominacao)}</h1>
            <h2>${escapeHtml(subtitulo)}</h2>
            <p>${escapeHtml(endereco)}</p>
          </div>
        </div>
        <div class="header-badge">
          <span class="lbl">Exercício</span>
          <span class="val">${escapeHtml(anoReferencia)}</span>
        </div>
      </div>

      <!-- Título Oficial -->
      <div class="title-strip">
        <div class="title-strip-line"></div>
        <h2 class="title-strip-text">Calendário Oficial de Festas & Eventos</h2>
        <div class="title-strip-line"></div>
      </div>

      <!-- Barra de Metadados -->
      <div class="meta-bar">
        <span><strong>Agenda Eclesiástica:</strong> ${eventosOrdenados.length} celebração(ões) registrada(s)${escapeHtml(subfiltro)}</span>
        <span>Emitido em: <strong>${dataEmissao}</strong></span>
      </div>

      <!-- Planilha de Eventos e Festividades -->
      <table class="tabela-calendario">
        <thead>
          <tr>
            <th style="width: 24px; text-align: center;">Nº</th>
            <th style="width: 125px;">Período / Data</th>
            <th style="width: 180px;">Evento / Festividade</th>
            <th style="width: 95px; text-align: center;">Departamento</th>
            <th>Descrição / Programação</th>
          </tr>
        </thead>
        <tbody>
          ${linhasHtml}
        </tbody>
      </table>
    </div>

    <!-- Rodapé Solene com Assinaturas Oficiais -->
    <div class="rodape-box">
      <div class="signatures-row">
        <div class="sig-col">
          <div class="sig-line"></div>
          <span class="sig-label">Secretaria Geral</span>
          <span class="sig-cargo">Registro Eclesiástico Oficial</span>
        </div>
        <div class="sig-col">
          <div class="sig-line"></div>
          <span class="sig-label">Pastor Presidente</span>
          <span class="sig-cargo">${escapeHtml(nomeIgreja)}</span>
        </div>
      </div>

      <div class="footer-timbrado">
        ${escapeHtml(nomeIgreja)} • ${escapeHtml(endereco || cidadeUf)}
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`
}

/**
 * Abre a janela de visualização e impressão direta em PDF
 */
export async function imprimirOuBaixarPdfCalendario(
  eventos: CalendarioEvento[],
  church: DocChurchIdentity,
  options?: CalendarioPdfOptions,
): Promise<boolean> {
  const html = await buildCalendarioFestasHtml(eventos, church, options)
  const printWindow = window.open('', '_blank', 'width=950,height=900')
  if (!printWindow) return false
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}
