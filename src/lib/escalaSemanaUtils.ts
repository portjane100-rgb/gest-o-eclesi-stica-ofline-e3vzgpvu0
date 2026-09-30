import type { EscalaSemanaItem, EscalaSemanaDia } from '@/types/adtc'

export const DIAS_NOMES_PADRAO = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
] as const

/** Formata YYYY-MM-DD para DD/MM/YYYY */
export function formatarDataBr(isoOuDateStr: string): string {
  if (!isoOuDateStr) return ''
  const clean = isoOuDateStr.slice(0, 10)
  const parts = clean.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return clean
}

/** Calcula domingo a partir de uma segunda-feira (soma 6 dias) */
export function calcularDataFim(dataInicioYmd: string): string {
  if (!dataInicioYmd) return ''
  const [ano, mes, dia] = dataInicioYmd.split('-').map(Number)
  if (!ano || !mes || !dia) return ''
  const d = new Date(ano, mes - 1, dia)
  d.setDate(d.getDate() + 6)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dt = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dt}`
}

/** Gera o título automático exigido */
export function gerarTituloEscala(dataInicioYmd: string, dataFimYmd: string): string {
  const inicioBr = formatarDataBr(dataInicioYmd)
  const fimBr = formatarDataBr(dataFimYmd)
  if (inicioBr && fimBr) {
    return `Escala de trabalho da sede e congregações, de ${inicioBr} a ${fimBr}`
  }
  return 'Escala de trabalho da sede e congregações'
}

/** Calcula a data de cada um dos 7 dias a partir da data de início */
export function calcularDataDoDia(dataInicioYmd: string, offsetDias: number): string {
  if (!dataInicioYmd) return ''
  const [ano, mes, dia] = dataInicioYmd.split('-').map(Number)
  if (!ano || !mes || !dia) return ''
  const d = new Date(ano, mes - 1, dia)
  d.setDate(d.getDate() + offsetDias)
  const dt = String(d.getDate()).padStart(2, '0')
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const y = d.getFullYear()
  return `${dt}/${m}/${y}`
}

/** Gera a estrutura inicial vazia dos 7 dias */
export function criarEstruturaDiasInicial(dataInicioYmd?: string): EscalaSemanaDia[] {
  return DIAS_NOMES_PADRAO.map((nomeDia, idx) => ({
    dia: nomeDia,
    data: dataInicioYmd ? calcularDataDoDia(dataInicioYmd, idx) : '',
    atividades: [''],
    obreiros_escalados: '',
    professoras_salinhas: '',
    recepcao: '',
  }))
}

/** Dados de referência / exemplo do usuário para preenchimento rápido */
export const EXEMPLO_REFERENCIA_SEMANA: EscalaSemanaDia[] = [
  {
    dia: 'Segunda-feira',
    data: '21/09/2026',
    atividades: [
      'Consagração de senhoras as 7:30',
      'Ensaio de crianças as 18:00',
      'Ensaio de adolescentes as 19:00',
      'Culto na vila dos pescadores as 19:00 hr',
    ],
    obreiros_escalados: 'Rodrigo e Manoel',
    professoras_salinhas: '',
    recepcao: '',
  },
  {
    dia: 'Terça-feira',
    data: '22/09/2026',
    atividades: ['Ensaio do coral as 19:00 hr'],
    obreiros_escalados: '',
    professoras_salinhas: '',
    recepcao: '',
  },
  {
    dia: 'Quarta-feira',
    data: '23/09/2026',
    atividades: ['Ensaio de senhoras as 19:00hr'],
    obreiros_escalados: '',
    professoras_salinhas: '',
    recepcao: '',
  },
  {
    dia: 'Quinta-feira',
    data: '24/09/2026',
    atividades: ['Culto de doutrina as 19:00hr'],
    obreiros_escalados: '',
    professoras_salinhas: 'Jacinara e Joana',
    recepcao: 'Francisco Mariano',
  },
  {
    dia: 'Sexta-feira',
    data: '25/09/2026',
    atividades: [
      'Círculo de oração as 15:00 hr',
      'Ensaio da banda as 19:00 hr',
      'Culto de doutrina na congregação do alto as 19:00 hr',
    ],
    obreiros_escalados: '',
    professoras_salinhas: '',
    recepcao: '',
  },
  {
    dia: 'Sábado',
    data: '26/09/2026',
    atividades: ['Aula de musica as 9:00 Hr da manhã', 'Culto temático as 19:00'],
    obreiros_escalados: '',
    professoras_salinhas: '',
    recepcao: '',
  },
  {
    dia: 'Domingo',
    data: '27/09/2026',
    atividades: ['Escola dominical as 9:00 Da manhã', 'Culto evangelístico as 19:00'],
    obreiros_escalados: '',
    professoras_salinhas: 'Jacinara e Joana',
    recepcao: 'Francisco Mariano',
  },
]

import { ADTC_LOGO_URL, ADTC_TOCHA_WATERMARK_DATA_URI } from '@/components/AdtcLogo'
import { getLogoAsDataUri } from '@/lib/documentTemplates'

/** Abre a janela de impressão/PDF timbrado oficial da ADTC para a escala semanal */
export interface EscalaPrintChurchIdentity {
  nomeIgreja?: string
  subtituloIgreja?: string
  denominacao?: string
  enderecoIgreja?: string
  cidadeUf?: string
  nomePastor?: string
  siglaIgreja?: string
  logoUrl?: string
}

/** Abre a janela de impressão/PDF timbrado oficial para a escala semanal */
export async function imprimirOuBaixarPdfEscalaSemana(
  semana: EscalaSemanaItem,
  churchIdentity?: EscalaPrintChurchIdentity,
): Promise<boolean> {
  const id = churchIdentity || {}
  const logoSrc = id.logoUrl || ADTC_LOGO_URL
  const logoDataUri = await getLogoAsDataUri(logoSrc)
  const printWindow = window.open('', '_blank', 'width=950,height=900')
  if (!printWindow) return false
  const nomeIgreja = id.nomeIgreja?.trim() || 'Igreja Local'
  const denominacao = id.denominacao?.trim() || 'Igreja Evangélica'
  const subtitulo = id.subtituloIgreja?.trim() || (nomeIgreja ? `Templo Sede — ${nomeIgreja}` : '')
  const endereco = id.enderecoIgreja?.trim() || (id.cidadeUf ? `${id.cidadeUf}` : '')
  const pastorNome = id.nomePastor?.trim() || 'Pastor Presidente'

  const diasHtml = (semana.dias || [])
    .map((d) => {
      const atividadesList = (d.atividades || []).filter((a) => a && a.trim().length > 0)
      const atividadesHtml =
        atividadesList.length > 0
          ? atividadesList
              .map(
                (ativ) => `
            <li style="margin-bottom: 5px; color: #1a1a1a; font-size: 11pt; line-height: 1.5;">
              <span style="display: inline-block; width: 6px; height: 6px; background-color: #C9A227; border-radius: 50%; margin-right: 8px; vertical-align: middle;"></span>
              <strong>${ativ}</strong>
            </li>`,
              )
              .join('')
          : '<li style="color: #888; font-style: italic; font-size: 10pt;">Nenhuma atividade cadastrada.</li>'

      const hasDesignacoes =
        (d.obreiros_escalados && d.obreiros_escalados.trim().length > 0) ||
        (d.professoras_salinhas && d.professoras_salinhas.trim().length > 0) ||
        (d.recepcao && d.recepcao.trim().length > 0)

      const designacoesHtml = hasDesignacoes
        ? `
          <div style="margin-top: 10px; padding: 8px 12px; background-color: #f4efe4; border-left: 3px solid #C9A227; border-radius: 4px; font-size: 10.5pt;">
            <div style="font-weight: bold; color: #8C6D15; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.5px; margin-bottom: 4px;">
              Designações do Dia
            </div>
            ${
              d.obreiros_escalados
                ? `<div style="margin-bottom: 3px;"><strong>Obreiros escalados:</strong> <span style="color: #1E3A5F; font-weight: 600;">${d.obreiros_escalados}</span></div>`
                : ''
            }
            ${
              d.professoras_salinhas
                ? `<div style="margin-bottom: 3px;"><strong>Professoras nas salinhas:</strong> <span style="color: #1E3A5F; font-weight: 600;">${d.professoras_salinhas}</span></div>`
                : ''
            }
            ${
              d.recepcao
                ? `<div><strong>Recepção / Portaria:</strong> <span style="color: #1E3A5F; font-weight: 600;">${d.recepcao}</span></div>`
                : ''
            }
          </div>
        `
        : ''

      return `
        <div style="border: 1px solid #dcd7cc; border-radius: 8px; margin-bottom: 14px; background-color: #ffffff; overflow: hidden; page-break-inside: avoid;">
          <div style="background-color: #1E3A5F; color: #ffffff; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
              ${d.dia}
            </span>
            ${
              d.data
                ? `<span style="background-color: #C9A227; color: #1E3A5F; font-weight: bold; font-size: 9.5pt; padding: 2px 8px; border-radius: 4px;">📅 ${d.data}</span>`
                : ''
            }
          </div>
          <div style="padding: 12px 14px; background-color: #faf9f6;">
            <div style="font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #555; margin-bottom: 6px; letter-spacing: 0.5px;">
              Atividades & Horários
            </div>
            <ul style="list-style: none; padding-left: 0; margin: 0 0 4px 0;">
              ${atividadesHtml}
            </ul>
            ${designacoesHtml}
          </div>
        </div>
      `
    })
    .join('')

  const dataAtualFormatada = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${semana.titulo} — ${nomeIgreja}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Times New Roman', Georgia, serif;
            color: #111;
            background: #FAF8F5; /* Fundo creme leve */
            margin: 0;
            padding: 10px;
            position: relative;
          }
          .escala-watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 320px;
            height: 320px;
            opacity: 0.06;
            pointer-events: none;
            z-index: 0;
            object-fit: contain;
          }
          .escala-content {
            position: relative;
            z-index: 1;
          }
          .print-btn-bar {
            background: #f1ebd8;
            padding: 12px 16px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 8px;
            border: 1px solid #dcd7cc;
          }
          .print-btn {
            background: #1E3A5F;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 11pt;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
          }
          .timbrado {
            border-bottom: 3px double #1E3A5F;
            padding-bottom: 12px;
            margin-bottom: 16px;
            text-align: center;
          }
          .timbrado h1 {
            margin: 0;
            font-size: 19pt;
            color: #1E3A5F;
            letter-spacing: 0.5px;
          }
          .timbrado h2 {
            margin: 4px 0 2px 0;
            font-size: 12pt;
            color: #C9A227;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1.5px;
          }
          .timbrado p {
            margin: 2px 0;
            font-size: 9pt;
            color: #555;
          }
          .titulo-box {
            background-color: #1E3A5F;
            color: #fff;
            padding: 10px 14px;
            border-radius: 6px;
            text-align: center;
            margin: 14px 0 16px 0;
          }
          .titulo-box h3 {
            margin: 0;
            font-size: 13pt;
            color: #f4d068;
            letter-spacing: 0.5px;
          }
          .titulo-box p {
            margin: 3px 0 0 0;
            font-size: 9.5pt;
            color: #e0e7ff;
          }
          .rodape-assinatura {
            margin-top: 25px;
            display: flex;
            justify-content: space-around;
            text-align: center;
            page-break-inside: avoid;
          }
          .linha-assinatura {
            width: 220px;
            border-top: 1px solid #333;
            margin: 0 auto 6px auto;
          }
          .rodape-assinatura p {
            margin: 2px 0;
            font-size: 9pt;
          }
          @media print {
            .print-btn-bar {
              display: none;
            }
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <img src="${ADTC_TOCHA_WATERMARK_DATA_URI}" alt="" class="escala-watermark" />
        <div class="escala-content">
          <div class="print-btn-bar">
            <span style="font-size: 11pt; color: #1E3A5F; font-weight: bold;">
              📄 Documento Oficial — ${nomeIgreja}
            </span>
            <button class="print-btn" onclick="window.print()">
              🖨️ Imprimir / Salvar em PDF
            </button>
          </div>

          <div style="background: linear-gradient(135deg, #072348 0%, #0F325E 60%, #163B6E 100%); border-radius: 8px; padding: 10px 16px; margin-bottom: 12px; border-bottom: 3px solid #C9A227; display: flex; align-items: center; justify-content: center; gap: 16px; box-shadow: 0 2px 6px rgba(7,35,72,0.15);">
          <img src="${logoDataUri}" alt="Logo da Igreja" style="width: 62px; height: 62px; border-radius: 50%; object-fit: cover; border: 2px solid #C9A227; background-color: #072348; flex-shrink: 0;" />
          <div style="text-align: left;">
            <h1 style="margin: 0; font-size: 15pt; color: #FFFFFF; letter-spacing: 0.8px; line-height: 1.15; font-weight: bold; font-family: Georgia, serif;">${denominacao}</h1>
            <h2 style="margin: 2px 0 0 0; font-size: 9.5pt; color: #F3CA52; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px;">${subtitulo}</h2>
            <p style="margin: 2px 0 0 0; font-size: 8pt; color: #E2E8F0; font-family: Arial, sans-serif;">${endereco}</p>
          </div>
        </div>

        <div class="titulo-box">
          <h3>${semana.titulo}</h3>
          <p>Emitida em ${dataAtualFormatada} • Coordenação Eclesiástica Geral</p>
        </div>

        ${
          semana.observacoes
            ? `<div style="margin-bottom: 14px; padding: 8px 12px; background-color: #fff9e6; border: 1px solid #eed894; border-radius: 6px; font-size: 10pt; color: #6d540b;">
                <strong>Observações Pastorais:</strong> ${semana.observacoes}
              </div>`
            : ''
        }

        <div class="dias-container">
          ${diasHtml}
        </div>

        <div class="rodape-assinatura">
          <div>
            <div class="linha-assinatura"></div>
            <p><strong>Coordenação da Escala</strong></p>
            <p style="font-size: 8.5pt; color: #555; text-transform: uppercase;">${nomeIgreja}</p>
          </div>
          <div>
            <div class="linha-assinatura"></div>
            <p><strong>${pastorNome}</strong></p>
            <p style="font-size: 8.5pt; color: #555; text-transform: uppercase;">Pastor Presidente</p>
          </div>
        </div>

          <div style="margin-top: 14px; padding-top: 6px; border-top: 1px dashed #C9A227; text-align: center; font-size: 7.5pt; color: #8C6D15; font-family: Arial, sans-serif; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">
            ${nomeIgreja} • ${endereco}
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
    </html>
  `)
  printWindow.document.close()
  return true
}

/** Formata texto resumido da semana para envio rápido via WhatsApp ou Web Share */
export function formatarTextoParaCompartilhar(
  semana: EscalaSemanaItem,
  churchIdentity?: EscalaPrintChurchIdentity,
): string {
  const nomeIgreja =
    churchIdentity?.nomeIgreja?.trim() ||
    churchIdentity?.denominacao?.trim() ||
    'Gestão Eclesiástica'
  let txt = `📋 *${semana.titulo}*\n`
  txt += `_${nomeIgreja}_\n\n`

  for (const d of semana.dias || []) {
    const ativs = (d.atividades || []).filter((a) => a && a.trim().length > 0)
    txt += `🗓️ *${d.dia}*${d.data ? ` (${d.data})` : ''}:\n`
    if (ativs.length > 0) {
      ativs.forEach((a) => {
        txt += `  • ${a}\n`
      })
    } else {
      txt += `  • Atividades regulares\n`
    }
    if (d.obreiros_escalados?.trim()) {
      txt += `  👤 Obreiros: ${d.obreiros_escalados.trim()}\n`
    }
    if (d.professoras_salinhas?.trim()) {
      txt += `  👶 Salinhas: ${d.professoras_salinhas.trim()}\n`
    }
    if (d.recepcao?.trim()) {
      txt += `  🤝 Recepção: ${d.recepcao.trim()}\n`
    }
    txt += `\n`
  }

  if (semana.observacoes?.trim()) {
    txt += `📌 *Obs:* ${semana.observacoes.trim()}\n\n`
  }
  return txt
}

/** Compartilha a escala semanal usando Web Share API ou cópia para área de transferência */
export async function compartilharEscalaSemana(
  semana: EscalaSemanaItem,
  onCopied?: () => void,
): Promise<'shared' | 'copied' | 'cancelled'> {
  const shareText = formatarTextoParaCompartilhar(semana)
  const shareData = {
    title: semana.titulo,
    text: shareText,
    url: `${window.location.origin}/escala`,
  }

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData)
      return 'shared'
    } catch (err: any) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }

  // Fallback: copiar para a área de transferência
  try {
    await navigator.clipboard.writeText(shareText)
    if (onCopied) onCopied()
    return 'copied'
  } catch {
    return 'cancelled'
  }
}
