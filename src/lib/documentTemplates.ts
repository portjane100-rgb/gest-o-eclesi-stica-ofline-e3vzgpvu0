/**
 * Utilitário para conversão de imagens para Data URI (base64) no navegador
 * e templates completos autocontidos de impressão A4 para todos os documentos da ADTC.
 */

// Armazena cache da logo em Data URI (base64)
let cachedLogoDataUri: string | null = null

/**
 * Converte uma URL de imagem (como o import Vite / asset) para Data URI Base64.
 * Isso garante que ao abrir a janela de impressão em sobreposição ou nova guia,
 * a imagem nunca falhe ao carregar e não dependa de caminhos relativos.
 */
export async function getLogoAsDataUri(imageUrl: string): Promise<string> {
  if (cachedLogoDataUri) return cachedLogoDataUri

  try {
    const res = await fetch(imageUrl)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        cachedLogoDataUri = result
        resolve(result)
      }
      reader.onerror = () => {
        resolve(imageUrl)
      }
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn('Falha ao converter logo para data URI, usando URL direta:', e)
    return imageUrl
  }
}

/**
 * Converte uma URL qualquer (ex: foto de membro do PocketBase) para Data URI para impressão
 */
export async function convertImageUrlToDataUri(imageUrl: string): Promise<string> {
  try {
    const res = await fetch(imageUrl)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result as string)
      }
      reader.onerror = () => {
        resolve(imageUrl)
      }
      reader.readAsDataURL(blob)
    })
  } catch {
    return imageUrl
  }
}

/** Estilos universais para documentos em folha A4 única (210mm x 297mm) com acabamento solene refinado */
const DOCUMENT_BASE_CSS = `
  @page {
    size: A4 portrait;
    margin: 8mm 12mm 8mm 12mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #FAF8F5; /* Papel levemente creme para impressão elegante */
    color: #1A202C;
    font-family: 'Times New Roman', Times, Georgia, serif;
    font-size: 11pt;
    line-height: 1.6;
    width: 100%;
    height: 100%;
  }
  .page-sheet {
    width: 100%;
    max-width: 184mm;
    margin: 0 auto;
    padding: 8mm 8mm 6mm 8mm;
    min-height: 270mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    background: #FAF8F5;
    page-break-after: avoid;
    page-break-inside: avoid;
    border: 1px solid #EBE5D8;
    box-shadow: 0 0 10px rgba(0,0,0,0.03);
  }
  /* Marca d'água sutil ao centro com opacidade 5% a 7% */
  .watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 320px;
    height: 320px;
    opacity: 0.06;
    pointer-events: none;
    z-index: 0;
    object-fit: contain;
    filter: grayscale(20%);
  }
  .content-relative {
    position: relative;
    z-index: 1;
  }
  /* Timbrado elegante: Faixa azul-marinho com filete dourado */
  .header-timbrado-box {
    background: linear-gradient(135deg, #072348 0%, #0F325E 60%, #163B6E 100%);
    border-radius: 8px;
    padding: 10px 16px;
    margin-bottom: 12px;
    border-bottom: 3px solid #C9A227;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    box-shadow: 0 2px 6px rgba(7,35,72,0.15);
  }
  .header-logo {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #C9A227;
    background: #072348;
    flex-shrink: 0;
    display: block;
    box-shadow: 0 0 8px rgba(201,162,39,0.4);
  }
  .header-titles {
    text-align: left;
  }
  .header-title-main {
    margin: 0;
    font-size: 15pt;
    font-weight: bold;
    color: #FFFFFF;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    line-height: 1.15;
    font-family: Georgia, 'Times New Roman', serif;
  }
  .header-subtitle {
    margin: 2px 0 0 0;
    font-size: 9.5pt;
    font-weight: bold;
    color: #F3CA52;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
  .header-address {
    margin: 2px 0 0 0;
    font-size: 8pt;
    color: #E2E8F0;
    font-family: Arial, Helvetica, sans-serif;
  }
  /* Título em destaque com filete dourado nos dois lados */
  .doc-title-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin: 12px 0 10px 0;
  }
  .doc-title-line {
    flex: 1;
    height: 1.5px;
    background: linear-gradient(to right, transparent, #C9A227, transparent);
  }
  .doc-title-text {
    margin: 0;
    font-size: 16.5pt;
    font-weight: bold;
    color: #0F325E;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    white-space: nowrap;
    font-family: Georgia, serif;
  }
  .greeting {
    font-size: 11pt;
    font-weight: bold;
    color: #0F325E;
    margin-bottom: 10px;
    letter-spacing: 0.2px;
  }
  .body-text {
    font-size: 11.5pt;
    line-height: 1.8;
    text-align: justify;
    text-indent: 28px;
    margin: 0 0 14px 0;
    color: #1A202C;
  }
  .body-text strong {
    color: #072348;
  }
  /* Versículo em relevo com borda dourada */
  .verse-highlight-box {
    background: #F3EEDB;
    border-left: 3.5px solid #C9A227;
    border-radius: 4px;
    padding: 8px 12px;
    margin: 10px 0 12px 0;
    font-size: 10pt;
    font-style: italic;
    color: #334155;
    line-height: 1.5;
  }
  .verse-highlight-box strong {
    color: #8C6D15;
    font-style: normal;
  }
  .expedition-date {
    text-align: right;
    font-size: 10.5pt;
    margin: 14px 0 20px 0;
    color: #1E293B;
  }
  /* Assinaturas simétricas e equilibradas */
  .signatures-grid {
    display: flex;
    justify-content: space-around;
    align-items: flex-start;
    gap: 24px;
    margin-top: 6px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .signatures-grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    align-items: flex-start;
    margin-top: 6px;
    margin-bottom: 10px;
    text-align: center;
    page-break-inside: avoid;
  }
  .sig-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
  }
  .sig-img {
    height: 48px;
    max-width: 170px;
    object-fit: contain;
    margin-bottom: -10px;
    pointer-events: none;
    filter: contrast(1.15);
  }
  .sig-line {
    width: 210px;
    max-width: 90%;
    margin-left: auto;
    margin-right: auto;
    border-top: 1.5px solid #0F325E;
    margin-bottom: 4px;
  }
  .sig-name {
    margin: 0;
    font-size: 10.5pt;
    font-weight: bold;
    color: #072348;
    line-height: 1.2;
    text-transform: capitalize;
  }
  .sig-role {
    margin: 2px 0 0 0;
    font-size: 8.5pt;
    color: #64748B;
    font-family: Arial, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }
  .validity-notice {
    border-top: 1px solid #D8CFBE;
    padding-top: 6px;
    text-align: center;
    font-size: 8.5pt;
    font-style: italic;
    color: #64748B;
    margin-top: 8px;
  }
  /* Rodapé solene com endereço e linha dourada */
  .footer-timbrado {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px dashed #C9A227;
    text-align: center;
    font-size: 7.5pt;
    color: #8C6D15;
    font-family: Arial, sans-serif;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    font-weight: 600;
  }
`

export interface DocChurchIdentity {
  nomeIgreja?: string
  denominacao?: string
  subtituloIgreja?: string
  enderecoIgreja?: string
  cidadeUf?: string
  siglaIgreja?: string
  logoUrl?: string
  cnpj?: string
  nomePastor?: string
}
export interface DocRecomendacaoData {
  corpoHtml: string
  dataExpedicaoExtenso: string
  nomePastor: string
  cargoPastor: string
  nome1Sec: string
  cargo1Sec: string
  nome2Sec: string
  cargo2Sec: string
  logoDataUri: string
  watermarkDataUri?: string
  assinaturaPastorDataUri?: string | null
  assinatura1SecDataUri?: string | null
  assinatura2SecDataUri?: string | null
  churchIdentity?: DocChurchIdentity & { modeloCartaRecomendacao?: string }
}

export function buildCartaRecomendacaoHtml(data: DocRecomendacaoData): string {
  const watermarkSrc = data.watermarkDataUri || data.logoDataUri
  const id = data.churchIdentity || {}
  const nomeIgreja = id.nomeIgreja?.trim() || 'Igreja Local'
  const denominacao = id.denominacao?.trim() || 'Igreja Evangélica'
  const subtitulo = id.subtituloIgreja?.trim() || (nomeIgreja ? `Templo Sede — ${nomeIgreja}` : '')
  const endereco = id.enderecoIgreja?.trim() || ''
  const cidadeUf = id.cidadeUf?.trim() || ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Carta de Recomendação — ${nomeIgreja}</title>
  <style>
    ${DOCUMENT_BASE_CSS}
  </style>
</head>
<body>
  <div class="page-sheet">
    <img src="${watermarkSrc}" alt="" class="watermark" />
    <div class="content-relative">
      <!-- Timbrado elegante com dados dinâmicos da igreja -->
      <div class="header-timbrado-box">
        <img src="${data.logoDataUri}" alt="Logo da Igreja" class="header-logo" />
        <div class="header-titles">
          <h1 class="header-title-main">${denominacao}</h1>
          <p class="header-subtitle">${subtitulo}</p>
          <p class="header-address">${endereco}</p>
        </div>
      </div>

      <!-- Título com filetes dourados em ambos os lados -->
      <div class="doc-title-wrapper">
        <div class="doc-title-line"></div>
        <h2 class="doc-title-text">Carta de Recomendação</h2>
        <div class="doc-title-line"></div>
      </div>

      <!-- Versículo em relevo de recomendação apostólica -->
      <div class="verse-highlight-box">
        &ldquo;Recomendo-vos a nossa irmã... para que a recebais no Senhor, como é digno dos santos, e a ajudeis em qualquer coisa que de vós necessitar...&rdquo; (Romanos 16:1-2)
      </div>

      <div class="greeting">
        Saudações no Senhor Jesus Cristo.
      </div>

      <div class="body-text">
        ${data.churchIdentity?.modeloCartaRecomendacao ? `<p style="margin-bottom: 12px; font-style: italic; color: #1E3A5F; font-weight: 500;">${data.churchIdentity.modeloCartaRecomendacao}</p>` : ''}
        ${data.corpoHtml}
      </div>

      <div class="expedition-date">
        ${cidadeUf}, ${data.dataExpedicaoExtenso}.
      </div>
    </div>

    <div class="content-relative">
      <!-- Bloco de assinaturas para assinatura manual sobre nome e cargo -->
      <div class="signatures-grid-3">
        <div class="sig-col">
          <div class="sig-line" style="margin-top: 36px;"></div>
          <p class="sig-name">${data.nomePastor}</p>
          <p class="sig-role">${data.cargoPastor || 'Pastor Presidente'}</p>
        </div>

        <div class="sig-col">
          <div class="sig-line" style="margin-top: 36px;"></div>
          <p class="sig-name">${data.nome1Sec}</p>
          <p class="sig-role">${data.cargo1Sec || '1º Secretário'}</p>
        </div>

        <div class="sig-col">
          <div class="sig-line" style="margin-top: 36px;"></div>
          <p class="sig-name">${data.nome2Sec}</p>
          <p class="sig-role">${data.cargo2Sec || '2º Secretário'}</p>
        </div>
      </div>

      <div class="validity-notice">
        Esta carta terá validade de 30 dias após a data de expedição.
      </div>

      <!-- Rodapé com endereço e identificação oficial -->
      <div class="footer-timbrado">
        ${nomeIgreja} • ${endereco}
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

export interface DocMudancaData {
  corpoHtml: string
  dataExpedicaoExtenso: string
  nomePastor: string
  cargoPastor: string
  nome1Sec?: string
  cargo1Sec?: string
  nome2Sec?: string
  cargo2Sec?: string
  logoDataUri: string
  watermarkDataUri?: string
  assinaturaPastorDataUri?: string | null
  assinatura1SecDataUri?: string | null
  assinatura2SecDataUri?: string | null
  churchIdentity?: DocChurchIdentity & { modeloCartaMudanca?: string }
}

export function buildCartaMudancaHtml(data: DocMudancaData): string {
  const watermarkSrc = data.watermarkDataUri || data.logoDataUri
  const id = data.churchIdentity || {}
  const nomeIgreja = id.nomeIgreja?.trim() || 'Igreja Local'
  const denominacao = id.denominacao?.trim() || 'Igreja Evangélica'
  const subtitulo = id.subtituloIgreja?.trim() || (nomeIgreja ? `Templo Sede — ${nomeIgreja}` : '')
  const endereco = id.enderecoIgreja?.trim() || ''
  const cidadeUf = id.cidadeUf?.trim() || ''

  // Se tiver 1º e 2º secretários, usa o grid de 3 assinaturas igual à Carta de Recomendação
  const temSecretarios = Boolean(data.nome1Sec || data.nome2Sec)

  const pastorSigImg = data.assinaturaPastorDataUri
    ? `<img src="${data.assinaturaPastorDataUri}" alt="Assinatura" class="sig-img" />`
    : ''
  const sec1SigImg = data.assinatura1SecDataUri
    ? `<img src="${data.assinatura1SecDataUri}" alt="Assinatura" class="sig-img" />`
    : ''
  const sec2SigImg = data.assinatura2SecDataUri
    ? `<img src="${data.assinatura2SecDataUri}" alt="Assinatura" class="sig-img" />`
    : ''

  const assinaturasHtml = temSecretarios
    ? `<div class="signatures-grid-3">
        <div class="sig-col">
          <div class="sig-line" style="margin-top: 36px;"></div>
          <p class="sig-name">${data.nomePastor}</p>
          <p class="sig-role">${data.cargoPastor || 'Pastor Presidente'}</p>
        </div>

        <div class="sig-col">
          <div class="sig-line" style="margin-top: 36px;"></div>
          <p class="sig-name">${data.nome1Sec || ''}</p>
          <p class="sig-role">${data.cargo1Sec || '1º Secretário'}</p>
        </div>

        <div class="sig-col">
          <div class="sig-line" style="margin-top: 36px;"></div>
          <p class="sig-name">${data.nome2Sec || ''}</p>
          <p class="sig-role">${data.cargo2Sec || '2º Secretário'}</p>
        </div>
      </div>`
    : `<div style="display: flex; justify-content: center; margin-top: 14px; margin-bottom: 14px;">
        <div class="sig-col" style="max-width: 320px;">
          <div class="sig-line" style="width: 250px; margin-top: 36px;"></div>
          <p class="sig-name">${data.nomePastor}</p>
          <p class="sig-role">${data.cargoPastor || 'Pastor Presidente'}</p>
        </div>
      </div>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Carta de Mudança — ${nomeIgreja}</title>
  <style>
    ${DOCUMENT_BASE_CSS}
  </style>
</head>
<body>
  <div class="page-sheet">
    <img src="${watermarkSrc}" alt="" class="watermark" />
    <div class="content-relative">
      <!-- Timbrado elegante com dados dinâmicos da igreja -->
      <div class="header-timbrado-box">
        <img src="${data.logoDataUri}" alt="Logo da Igreja" class="header-logo" />
        <div class="header-titles">
          <h1 class="header-title-main">${denominacao}</h1>
          <p class="header-subtitle">${subtitulo}</p>
          <p class="header-address">${endereco}</p>
        </div>
      </div>

      <!-- Título com filetes dourados nos lados -->
      <div class="doc-title-wrapper">
        <div class="doc-title-line"></div>
        <h2 class="doc-title-text">Carta de Mudança</h2>
        <div class="doc-title-line"></div>
      </div>

      <!-- Versículo em relevo de comunhão e transferência -->
      <div class="verse-highlight-box">
        &ldquo;Nós recomendamo-vos para que a recebais no Senhor, como usam fazer aos santos.&rdquo; (Romanos 16:2)
      </div>

      <div class="greeting">
        Saudações no Senhor Jesus Cristo.
      </div>

      <div class="body-text">
        ${data.churchIdentity?.modeloCartaMudanca ? `<p style="margin-bottom: 12px; font-style: italic; color: #1E3A5F; font-weight: 500;">${data.churchIdentity.modeloCartaMudanca}</p>` : ''}
        ${data.corpoHtml}
      </div>

      <div class="expedition-date">
        ${cidadeUf}, ${data.dataExpedicaoExtenso}.
      </div>
    </div>

    <div class="content-relative">
      <!-- Bloco de assinaturas equilibrado: Pastor + 1º e 2º Secretários -->
      ${assinaturasHtml}

      <div class="validity-notice">
        Esta carta terá validade de 30 dias após a data de expedição.
      </div>

      <!-- Rodapé com endereço e identificação oficial -->
      <div class="footer-timbrado">
        ${nomeIgreja} • ${endereco}
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

export interface DocCartaoMembroData {
  nome: string
  pai: string
  mae: string
  emissao: string
  funcao: string
  registro: string
  nascimento: string
  nacionalidade: string
  naturalidade: string
  estadoCivil: string
  batismo: string
  cpf: string
  fotoDataUri: string | null
  logoDataUri: string
  pastorPresidente: string
  assinaturaPastorDataUri?: string | null
  assinatura1SecDataUri?: string | null
  churchIdentity?: DocChurchIdentity
}

export function buildCartaoMembroHtml(data: DocCartaoMembroData): string {
  const id = data.churchIdentity || {}
  const nomeIgreja = id.nomeIgreja?.trim() || 'Igreja Local'
  const denominacao = id.denominacao?.trim() || 'Igreja Evangélica'
  const subtitulo = id.subtituloIgreja?.trim() || ''
  const endereco = id.enderecoIgreja?.trim() || ''

  const fotoBlock = data.fotoDataUri
    ? `<img src="${data.fotoDataUri}" alt="${data.nome}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" />`
    : `<div style="width: 100%; height: 100%; background: #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #64748b; font-size: 9px; font-weight: bold; border-radius: 4px;">FOTO 3x4</div>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Cartão de Membro — ${data.nome}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 10px;
      background: #fff;
      font-family: Arial, Helvetica, sans-serif;
    }
    .instrucao {
      text-align: center;
      margin-bottom: 16px;
      font-size: 10pt;
      color: #1E3A5F;
      font-weight: bold;
    }
    .cartoes-wrapper {
      display: flex;
      flex-direction: column;
      gap: 22px;
      align-items: center;
      justify-content: center;
    }
    .cartao-card {
      width: 440px;
      height: 280px;
      border-radius: 14px;
      overflow: hidden;
      background: linear-gradient(135deg, #073B72 0%, #0c4d8f 35%, #185a9d 70%, #0d2847 100%);
      color: #fff;
      border: 2px solid #0D2544;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      position: relative;
      page-break-inside: avoid;
    }
    .cartao-header {
      padding: 10px 14px 4px 14px;
    }
    .cartao-header-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .logo-badge {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid #C9A227;
      background: #072348;
      object-fit: cover;
      flex-shrink: 0;
    }
    .header-text {
      flex: 1;
      text-align: center;
      line-height: 1.1;
    }
    .header-text h2 {
      margin: 0;
      font-size: 10.5px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #fff;
      text-transform: uppercase;
    }
    .header-text h3 {
      margin: 2px 0 0 0;
      font-size: 9px;
      font-weight: bold;
      color: #fde047;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .header-text p {
      margin: 2px 0 0 0;
      font-size: 7.5px;
      color: #cbd5e1;
    }
    .gold-divider {
      height: 2px;
      background: linear-gradient(to right, transparent, #C9A227, transparent);
      margin-top: 6px;
    }
    .title-row {
      padding: 0 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
    }
    .title-row .title-label {
      font-size: 14px;
      font-weight: 900;
      color: #fff;
      letter-spacing: 0.8px;
    }
    .registro-tag {
      background: #fff;
      color: #073B72;
      font-family: monospace;
      font-weight: bold;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }
    .corpo-frente {
      padding: 0 14px 6px 14px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .foto-box {
      width: 90px;
      height: 115px;
      background: #fff;
      padding: 3px;
      border-radius: 6px;
      border: 2px solid #C9A227;
      flex-shrink: 0;
      overflow: hidden;
    }
    .campos-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .campo-label {
      font-size: 8px;
      font-weight: bold;
      color: #e2e8f0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 1px;
      display: block;
    }
    .campo-val {
      background: #fff;
      color: #0D2544;
      font-size: 9.5px;
      font-weight: bold;
      padding: 2px 7px;
      border-radius: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border: 1px solid #cbd5e1;
    }
    .rodape-obs {
      background: #062142;
      padding: 4px 10px;
      text-align: center;
      font-size: 7px;
      color: #cbd5e1;
      border-top: 1px solid rgba(255,255,255,0.15);
      font-weight: 600;
    }
    /* Verso */
    .verso-verse {
      text-align: center;
      font-family: Georgia, serif;
      font-style: italic;
      color: #fde047;
      font-size: 9.5px;
      font-weight: bold;
      padding: 10px 14px 2px 14px;
    }
    .verso-grid {
      padding: 0 14px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .verso-validade-txt {
      font-size: 7.5px;
      color: #e2e8f0;
      text-align: center;
      line-height: 1.2;
      margin-top: 3px;
      padding: 0 4px;
    }
    .pastor-box {
      background: #fff;
      border-radius: 4px;
      padding: 4px 8px;
      max-width: 260px;
      margin: 0 auto;
      text-align: center;
      border: 1px solid #cbd5e1;
    }
    .pastor-line {
      border-top: 1px solid #334155;
      margin-top: 18px;
      padding-top: 2px;
    }
    .pastor-title {
      font-size: 9px;
      font-style: italic;
      font-weight: bold;
      color: #0D2544;
      display: block;
      font-family: Georgia, serif;
    }
    .pastor-nome {
      font-size: 8px;
      color: #475569;
      display: block;
      margin-top: 1px;
    }
  </style>
</head>
<body>
  <div class="instrucao">
    📄 Cartão de Membro Oficial — ${nomeIgreja} (Frente e Verso para recorte e plastificação)
  </div>

  <div class="cartoes-wrapper">
    <!-- FRENTE -->
    <div class="cartao-card">
      <div class="cartao-header">
        <div class="cartao-header-inner">
          <img src="${data.logoDataUri}" alt="Logo da Igreja" class="logo-badge" />
          <div class="header-text">
            <h2>${denominacao}</h2>
            <h3>${subtitulo}</h3>
            <p>${endereco}</p>
          </div>
        </div>
        <div class="gold-divider"></div>
      </div>

      <div class="title-row">
        <span class="title-label">CARTÃO DE MEMBRO</span>
        <div style="display: flex; align-items: center; gap: 4px;">
          <span style="font-size: 9px; color: #fde047; font-weight: bold;">REGISTRO:</span>
          <span class="registro-tag">${data.registro}</span>
        </div>
      </div>

      <div class="corpo-frente">
        <div class="foto-box">
          ${fotoBlock}
        </div>
        <div class="campos-col">
          <div>
            <span class="campo-label">Nome</span>
            <div class="campo-val">${data.nome || '—'}</div>
          </div>
          <div>
            <span class="campo-label">Pai</span>
            <div class="campo-val" style="font-weight: 500; font-size: 9px;">${data.pai || '—'}</div>
          </div>
          <div>
            <span class="campo-label">Mãe</span>
            <div class="campo-val" style="font-weight: 500; font-size: 9px;">${data.mae || '—'}</div>
          </div>
          <div class="grid-2">
            <div>
              <span class="campo-label">Emissão</span>
              <div class="campo-val" style="text-align: center;">${data.emissao}</div>
            </div>
            <div>
              <span class="campo-label">Função</span>
              <div class="campo-val" style="text-align: center; color: #073B72;">${data.funcao}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="rodape-obs">
        Obs: É válida enquanto o portador se mantiver de acordo com os ensinamentos bíblicos e as normas desta igreja.
      </div>
    </div>

    <!-- VERSO -->
    <div class="cartao-card">
      <div>
        <div class="verso-verse">
          "Como pois recebestes o Senhor Jesus Cristo, assim andai nEle" Cl. 2.6
        </div>
        <div class="gold-divider" style="margin: 4px 14px 8px 14px;"></div>
      </div>

      <div class="verso-grid">
        <div class="grid-2">
          <div>
            <span class="campo-label">Nascimento</span>
            <div class="campo-val" style="text-align: center;">${data.nascimento}</div>
          </div>
          <div>
            <span class="campo-label">Nacionalidade</span>
            <div class="campo-val" style="text-align: center;">${data.nacionalidade || 'Brasileira'}</div>
          </div>
        </div>

        <div class="grid-2">
          <div>
            <span class="campo-label">Naturalidade</span>
            <div class="campo-val" style="text-align: center;">${data.naturalidade || '—'}</div>
          </div>
          <div>
            <span class="campo-label">Estado Civil</span>
            <div class="campo-val" style="text-align: center;">${data.estadoCivil || '—'}</div>
          </div>
        </div>

        <div class="grid-2">
          <div>
            <span class="campo-label">Batismo</span>
            <div class="campo-val" style="text-align: center;">${data.batismo}</div>
          </div>
          <div>
            <span class="campo-label">CPF</span>
            <div class="campo-val" style="text-align: center; font-family: monospace;">${data.cpf || '—'}</div>
          </div>
        </div>

        <p class="verso-validade-txt">
          Este cartão só terá validade enquanto o seu portador além de conservar-se fiel aos princípios bíblicos, permanecer vinculado à entidade emitente.
        </p>
      </div>

      <div style="padding: 0 14px 10px 14px;">
        <div class="pastor-box">
          <div class="pastor-line" style="margin-top: 24px;">
            <span class="pastor-title">Pastor presidente</span>
            <span class="pastor-nome">${data.pastorPresidente}</span>
          </div>
        </div>
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

export interface DocCertificadoApresentacaoData {
  nomeCrianca: string
  dataNascimentoExtenso: string
  nomePai: string
  nomeMae: string
  dataApresentacaoExtenso: string
  pastorOficiante: string
  logoDataUri: string
  watermarkDataUri?: string
  assinaturaPastorDataUri?: string | null
  churchIdentity?: DocChurchIdentity
}

export interface DocFichaMembroBrancoData {
  logoDataUri: string
  watermarkDataUri?: string
  unidades?: string[]
  churchIdentity?: DocChurchIdentity
}

export function buildFichaMembroBrancoHtml(data: DocFichaMembroBrancoData): string {
  const watermarkSrc = data.watermarkDataUri || data.logoDataUri
  const id = data.churchIdentity || {}
  const nomeIgreja = id.nomeIgreja?.trim() || 'Igreja Local'
  const denominacao = id.denominacao?.trim() || 'Igreja Evangélica'
  const subtitulo = id.subtituloIgreja?.trim() || (nomeIgreja ? `Templo Sede — ${nomeIgreja}` : '')
  const endereco = id.enderecoIgreja?.trim() || ''

  const unidades =
    data.unidades && data.unidades.length > 0 ? data.unidades : ['Sede', 'Filial 1', 'Filial 2']

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Ficha de Cadastro de Membro — ${nomeIgreja}</title>
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
      background: #FFFFFF;
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
      padding: 4mm 6mm;
      min-height: 275mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      background: #FFFFFF;
      page-break-inside: avoid;
    }
    .watermark {
      position: absolute;
      top: 52%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 320px;
      height: 320px;
      opacity: 0.05;
      pointer-events: none;
      z-index: 0;
      object-fit: contain;
    }
    .content {
      position: relative;
      z-index: 1;
    }
    .header-box {
      background: linear-gradient(135deg, #072348 0%, #0F325E 60%, #163B6E 100%);
      border-radius: 8px;
      padding: 8px 14px;
      margin-bottom: 8px;
      border-bottom: 3px solid #C9A227;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      color: #FFFFFF;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-logo {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #C9A227;
      background: #072348;
      flex-shrink: 0;
    }
    .header-titles h1 {
      margin: 0;
      font-size: 13pt;
      font-weight: bold;
      color: #FFFFFF;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
    .header-badge-ficha {
      border: 1.5px dashed #C9A227;
      border-radius: 6px;
      padding: 4px 8px;
      text-align: center;
      background: rgba(7, 35, 72, 0.6);
      min-width: 90px;
    }
    .header-badge-ficha .lbl {
      font-size: 6.5pt;
      text-transform: uppercase;
      color: #F3CA52;
      font-weight: bold;
      letter-spacing: 0.5px;
      display: block;
    }
    .header-badge-ficha .val {
      font-size: 9pt;
      font-weight: bold;
      color: #FFFFFF;
      font-family: monospace;
      display: block;
      margin-top: 1px;
    }
    .title-strip {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin: 4px 0 8px 0;
    }
    .title-strip-line {
      flex: 1;
      height: 1.5px;
      background: linear-gradient(to right, transparent, #C9A227, transparent);
    }
    .title-strip-text {
      font-family: Georgia, serif;
      font-size: 13pt;
      font-weight: bold;
      color: #0F325E;
      text-transform: uppercase;
      letter-spacing: 1px;
      white-space: nowrap;
    }
    .section-box {
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 6px 10px 8px 10px;
      margin-bottom: 7px;
      background: #FFFFFF;
    }
    .section-title {
      font-family: Georgia, serif;
      font-size: 8.5pt;
      font-weight: bold;
      color: #0F325E;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-bottom: 1.5px solid #C9A227;
      padding-bottom: 2px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-title span.tag {
      font-family: Arial, sans-serif;
      font-size: 6.5pt;
      color: #8C6D15;
      font-weight: normal;
      letter-spacing: 0.2px;
      text-transform: none;
    }
    .row {
      display: flex;
      gap: 10px;
      margin-bottom: 5px;
      align-items: flex-end;
    }
    .field {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .field-label {
      font-size: 7pt;
      font-weight: bold;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 2px;
    }
    .field-line {
      height: 18px;
      border-bottom: 1px solid #1E293B;
      width: 100%;
    }
    .field-boxes {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 2px;
    }
    .checkbox-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 7.5pt;
      color: #1E293B;
    }
    .checkbox-square {
      width: 11px;
      height: 11px;
      border: 1.2px solid #0F325E;
      border-radius: 2px;
      display: inline-block;
    }
    .footer-signatures {
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
      margin-top: 6px;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-top: 14px;
      text-align: center;
    }
    .sig-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .sig-line {
      width: 85%;
      border-top: 1px solid #0F325E;
      margin-bottom: 3px;
    }
    .sig-label {
      font-size: 7.5pt;
      color: #475569;
      text-transform: uppercase;
      font-weight: bold;
    }
    .footer-legend {
      text-align: center;
      font-size: 7pt;
      color: #8C6D15;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-top: 6px;
      border-top: 1px dashed #C9A227;
      padding-top: 3px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <img src="${watermarkSrc}" alt="" class="watermark" />

    <div class="content">
      <!-- Cabeçalho Institucional -->
      <div class="header-box">
        <div class="header-left">
          <img src="${data.logoDataUri}" alt="Logo da Igreja" class="header-logo" />
          <div class="header-titles">
            <h1>${denominacao}</h1>
            <h2>${subtitulo}</h2>
            <p>${endereco}</p>
          </div>
        </div>
        <div class="header-badge-ficha">
          <span class="lbl">Ficha Nº Oficial</span>
          <span class="val">_______</span>
          <span class="lbl" style="margin-top: 2px;">Nº Registro</span>
          <span class="val">_______</span>
        </div>
      </div>

      <!-- Título Oficial -->
      <div class="title-strip">
        <div class="title-strip-line"></div>
        <h2 class="title-strip-text">Ficha de Cadastro de Membro</h2>
        <div class="title-strip-line"></div>
      </div>

      <!-- 1. IDENTIFICAÇÃO PESSOAL -->
      <div class="section-box">
        <div class="section-title">
          <span>1. Identificação Pessoal</span>
          <span class="tag">Preencher de forma legível à mão</span>
        </div>

        <div class="row">
          <div class="field" style="flex: 3;">
            <span class="field-label">Nome Completo:</span>
            <div class="field-line"></div>
          </div>
          <div class="field" style="flex: 1.2;">
            <span class="field-label">Observação / Apelido:</span>
            <div class="field-line"></div>
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex: 2.5;">
            <span class="field-label">Filiação (Nome do Pai e da Mãe):</span>
            <div class="field-line"></div>
          </div>
          <div class="field" style="flex: 1.2;">
            <span class="field-label">Naturalidade (Cidade/UF):</span>
            <div class="field-line"></div>
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex: 1.2;">
            <span class="field-label">Estado Civil:</span>
            <div class="field-boxes" style="padding-top: 3px;">
              <span class="checkbox-item"><span class="checkbox-square"></span> Solteiro(a)</span>
              <span class="checkbox-item"><span class="checkbox-square"></span> Casado(a)</span>
              <span class="checkbox-item"><span class="checkbox-square"></span> Viúvo(a)</span>
              <span class="checkbox-item"><span class="checkbox-square"></span> Outro</span>
            </div>
          </div>
          <div class="field" style="flex: 1;">
            <span class="field-label">RG (Identidade):</span>
            <div class="field-line"></div>
          </div>
          <div class="field" style="flex: 1;">
            <span class="field-label">CPF:</span>
            <div class="field-line"></div>
          </div>
        </div>
      </div>

      <!-- 2. CONGREGAÇÃO, LOCALIZAÇÃO & CONTATO -->
      <div class="section-box">
        <div class="section-title">
          <span>2. Congregação Vinculada & Contato</span>
          <span class="tag">Unidades da Igreja</span>
        </div>

        <div class="row" style="margin-bottom: 4px;">
          <div class="field">
            <span class="field-label">Congregação Vinculada:</span>
            <div class="field-boxes" style="flex-wrap: wrap; gap: 12px; padding-top: 2px;">
              ${unidades
                .map(
                  (u) =>
                    `<span class="checkbox-item"><span class="checkbox-square"></span> ${u}</span>`,
                )
                .join('')}
            </div>
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex: 2;">
            <span class="field-label">Endereço Residencial (Rua/Av., Nº, Bairro/Localidade):</span>
            <div class="field-line"></div>
          </div>
          <div class="field" style="flex: 1;">
            <span class="field-label">Telefone:</span>
            <div class="field-line"></div>
          </div>
          <div class="field" style="flex: 1;">
            <span class="field-label">WhatsApp (Celular):</span>
            <div class="field-line"></div>
          </div>
        </div>
      </div>

      <!-- 3. DATAS HISTÓRICAS & ECLESIÁSTICAS -->
      <div class="section-box">
        <div class="section-title">
          <span>3. Datas Históricas & Eclesiásticas</span>
          <span class="tag">Preencha data exata ou texto alternativo / aproximado</span>
        </div>

        <!-- Nascimento -->
        <div class="row">
          <div class="field" style="flex: 1;">
            <span class="field-label">Data de Nascimento (Exata):</span>
            <div class="field-line" style="font-family: monospace; font-size: 8pt; color: #64748B; padding-top: 2px;">__ / __ / ____</div>
          </div>
          <div class="field" style="flex: 1.5;">
            <span class="field-label">Ou caso não lembre o dia exato (Texto/Ano Aprox.):</span>
            <div class="field-line"></div>
          </div>
        </div>

        <!-- Conversão -->
        <div class="row">
          <div class="field" style="flex: 1;">
            <span class="field-label">Data de Conversão (Decisão):</span>
            <div class="field-line" style="font-family: monospace; font-size: 8pt; color: #64748B; padding-top: 2px;">__ / __ / ____</div>
          </div>
          <div class="field" style="flex: 1.5;">
            <span class="field-label">Conversão em texto (Ex: Na fé desde a infância, aprox.):</span>
            <div class="field-line"></div>
          </div>
        </div>

        <!-- Batismo -->
        <div class="row">
          <div class="field" style="flex: 1;">
            <span class="field-label">Data do Batismo nas Águas:</span>
            <div class="field-line" style="font-family: monospace; font-size: 8pt; color: #64748B; padding-top: 2px;">__ / __ / ____</div>
          </div>
          <div class="field" style="flex: 1.5;">
            <span class="field-label">Batismo em texto (Ex: Ano, Pastor oficiante, não lembra):</span>
            <div class="field-line"></div>
          </div>
        </div>
      </div>

      <!-- 4. SITUAÇÃO ECLESIÁSTICA & OBSERVAÇÕES DA SECRETARIA -->
      <div class="section-box">
        <div class="section-title">
          <span>4. Uso Exclusivo da Secretaria / Liderança</span>
          <span class="tag">Registro institucional</span>
        </div>

        <div class="row">
          <div class="field" style="flex: 1.5;">
            <span class="field-label">Situação do Membro:</span>
            <div class="field-boxes" style="padding-top: 3px;">
              <span class="checkbox-item"><span class="checkbox-square"></span> Ativo (Comunhão)</span>
              <span class="checkbox-item"><span class="checkbox-square"></span> Inativo / Afastado</span>
              <span class="checkbox-item"><span class="checkbox-square"></span> Mudança</span>
            </div>
          </div>
          <div class="field" style="flex: 1.5;">
            <span class="field-label">Data de Entrada / Registro:</span>
            <div class="field-line" style="font-family: monospace; font-size: 8pt; color: #64748B; padding-top: 2px;">__ / __ / 202_</div>
          </div>
        </div>

        <div class="row" style="margin-top: 4px;">
          <div class="field">
            <span class="field-label">Observações Pastorais / Histórico:</span>
            <div class="field-line" style="height: 16px;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Rodapé e Assinaturas -->
    <div class="footer-signatures">
      <div class="signatures-row">
        <div class="sig-col">
          <div class="sig-line"></div>
          <span class="sig-label">Assinatura do Membro</span>
        </div>
        <div class="sig-col">
          <div class="sig-line"></div>
          <span class="sig-label">Secretaria da Igreja</span>
        </div>
        <div class="sig-col">
          <div class="sig-line"></div>
          <span class="sig-label">Pastor Presidente</span>
        </div>
      </div>

      <div class="footer-legend">
        ${nomeIgreja} • Formulário Oficial para Preenchimento à Mão
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

export function buildCertificadoApresentacaoHtml(data: DocCertificadoApresentacaoData): string {
  const watermarkSrc = data.watermarkDataUri || data.logoDataUri
  const id = data.churchIdentity || {}
  const nomeIgreja = id.nomeIgreja?.trim() || 'Igreja Local'
  const siglaIgreja = id.siglaIgreja?.trim() || ''
  const denominacao = id.denominacao?.trim() || 'Igreja Evangélica'
  const cnpj = id.cnpj?.trim() || ''
  const enderecoIgreja = id.enderecoIgreja?.trim() || ''
  const cidadeUf = id.cidadeUf?.trim() || ''
  const endereco = enderecoIgreja
  const subtitulo = id.subtituloIgreja?.trim() || (nomeIgreja ? `Templo Sede — ${nomeIgreja}` : '')
  const sigla = siglaIgreja || 'Igreja'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Certidão de Apresentação de Criança — ${data.nomeCrianca}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background: #FAF8F5; /* Tom creme elegante */
      font-family: 'Times New Roman', Times, Georgia, serif;
      color: #0F325E;
    }
    .cert-frame {
      border: 3.5px solid #C9A227;
      padding: 10px;
      margin: 0 auto;
      max-width: 186mm;
      min-height: 272mm;
      position: relative;
      background: #FAF8F5;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
      box-shadow: 0 0 10px rgba(201,162,39,0.12);
    }
    .cert-inner-frame {
      border: 1px solid #0F325E;
      padding: 14px 16px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    /* Marca d'água sutil ao centro 6% opacidade */
    .cert-watermark {
      position: absolute;
      top: 52%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 290px;
      height: 290px;
      opacity: 0.06;
      pointer-events: none;
      z-index: 0;
      object-fit: contain;
    }
    .cert-content-rel {
      position: relative;
      z-index: 1;
    }
    /* Timbrado em faixa marinho solene */
    .cert-header-box {
      background: linear-gradient(135deg, #072348 0%, #0F325E 60%, #163B6E 100%);
      border-radius: 8px;
      padding: 8px 14px;
      border-bottom: 2.5px solid #C9A227;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      box-shadow: 0 2px 6px rgba(7,35,72,0.15);
    }
    .cert-logo {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 2px solid #C9A227;
      background: #072348;
      object-fit: cover;
      flex-shrink: 0;
      box-shadow: 0 0 6px rgba(201,162,39,0.4);
    }
    .cert-titles-wrap {
      text-align: left;
    }
    .cert-h1 {
      margin: 0;
      font-size: 15pt;
      font-weight: bold;
      color: #FFFFFF;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-family: Georgia, serif;
    }
    .cert-h2 {
      margin: 2px 0 0 0;
      font-size: 9.5pt;
      font-weight: bold;
      color: #F3CA52;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .cert-addr {
      margin: 2px 0 0 0;
      font-size: 8pt;
      color: #E2E8F0;
      font-family: Arial, Helvetica, sans-serif;
    }
    .cert-tag {
      font-size: 9pt;
      font-weight: bold;
      color: #8C6D15;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-top: 10px;
      display: block;
      text-align: center;
      font-family: Arial, Helvetica, sans-serif;
    }
    .cert-title-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: 2px 0 4px 0;
    }
    .cert-title-line {
      flex: 1;
      height: 1.5px;
      background: linear-gradient(to right, transparent, #C9A227, transparent);
    }
    .cert-title {
      font-size: 20pt;
      font-weight: bold;
      color: #0F325E;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      font-family: Georgia, serif;
      white-space: nowrap;
    }
    .cert-verse-box {
      background: #F3EEDB;
      border-left: 3.5px solid #C9A227;
      border-radius: 4px;
      padding: 6px 12px;
      margin: 6px auto 10px auto;
      text-align: center;
      font-style: italic;
      font-size: 9.5pt;
      color: #334155;
      max-width: 540px;
      line-height: 1.45;
    }
    .cert-body-box {
      background: #FFFFFF;
      border: 1px solid #E4DCBE;
      border-radius: 8px;
      padding: 14px 20px;
      margin: 6px 0;
      font-size: 11pt;
      line-height: 1.7;
      text-align: justify;
      color: #1A202C;
    }
    .crianca-destaque {
      text-align: center;
      border-top: 2px solid #C9A227;
      border-bottom: 2px solid #C9A227;
      padding: 8px 6px;
      margin: 10px 0;
      background: #FDFBF7;
    }
    .crianca-nome {
      font-size: 19pt;
      font-weight: bold;
      color: #072348;
      display: block;
      letter-spacing: 0.5px;
      font-family: Georgia, serif;
    }
    .crianca-nasc {
      font-size: 9.5pt;
      color: #4A5568;
      font-family: Arial, Helvetica, sans-serif;
      margin-top: 3px;
      display: block;
    }
    .filiacao-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 8px 0;
    }
    .filiacao-item {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 6px 10px;
    }
    .filiacao-lbl {
      font-size: 8pt;
      font-weight: bold;
      color: #64748B;
      text-transform: uppercase;
      font-family: Arial, Helvetica, sans-serif;
      display: block;
    }
    .filiacao-val {
      font-size: 10.5pt;
      font-weight: bold;
      color: #0F325E;
      display: block;
      margin-top: 1px;
    }
    .cert-signatures {
      display: flex;
      justify-content: space-around;
      margin-top: 14px;
      margin-bottom: 8px;
      text-align: center;
    }
    .cert-sig-col {
      width: 210px;
    }
    .cert-sig-line {
      border-top: 1.5px solid #0F325E;
      margin-bottom: 4px;
    }
    .cert-sig-name {
      font-size: 10.5pt;
      font-weight: bold;
      margin: 0;
      color: #072348;
    }
    .cert-sig-role {
      font-size: 8pt;
      color: #64748B;
      margin: 1px 0 0 0;
      text-transform: uppercase;
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 600;
    }
    .cert-footer-date {
      text-align: center;
      font-size: 9.5pt;
      color: #334155;
      margin-top: 6px;
      font-family: Arial, Helvetica, sans-serif;
    }
    .cert-footer-timbrado {
      margin-top: 6px;
      padding-top: 4px;
      border-top: 1px dashed #C9A227;
      text-align: center;
      font-size: 7.5pt;
      color: #8C6D15;
      font-family: Arial, sans-serif;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="cert-frame">
    <div class="cert-inner-frame">
      <!-- Marca d'água sutil ao centro -->
      <img src="${watermarkSrc}" alt="" class="cert-watermark" />

      <div class="cert-content-rel">
        <!-- Timbrado Oficial em faixa azul-marinho com logo e dourado -->
        <div class="cert-header-box">
          <img src="${data.logoDataUri}" alt="Logo da Igreja" class="cert-logo" />
          <div class="cert-titles-wrap">
            <h1 class="cert-h1">${denominacao}</h1>
            <h2 class="cert-h2">${subtitulo}</h2>
            <p class="cert-addr">${endereco}</p>
          </div>
        </div>

        <span class="cert-tag">Registro Eclesiástico Solene</span>

        <div class="cert-title-wrapper">
          <div class="cert-title-line"></div>
          <div class="cert-title">Certidão de Apresentação de Criança</div>
          <div class="cert-title-line"></div>
        </div>

        <div class="cert-verse-box">
          &ldquo;Trouxeram-lhe, então, algumas crianças, para que lhes impusesse as mãos e orasse...&rdquo; (Mateus 19:13 - Bíblia ARC)
        </div>

        <div class="cert-body-box">
          <p style="margin: 0; text-indent: 28px;">
            Certificamos solenemente que, em culto de louvor e adoração ao Todo-Poderoso realizado no templo da <strong>${nomeIgreja}</strong>, foi apresentada ao Senhor Jesus Cristo a criança:
          </p>

          <div class="crianca-destaque">
            <span class="crianca-nome">${data.nomeCrianca || 'Nome da Criança'}</span>
            <span class="crianca-nasc">Nascido(a) em: <strong>${data.dataNascimentoExtenso || 'Data não informada'}</strong></span>
          </div>

          <div class="filiacao-grid">
            <div class="filiacao-item">
              <span class="filiacao-lbl">Pai</span>
              <span class="filiacao-val">${data.nomePai || 'Não informado'}</span>
            </div>
            <div class="filiacao-item">
              <span class="filiacao-lbl">Mãe</span>
              <span class="filiacao-val">${data.nomeMae || 'Não informada'}</span>
            </div>
          </div>

          <p style="margin: 8px 0 0 0; text-indent: 28px;">
            Tendo sido impetrada sobre a sua vida a oração pastoral de consagração e bênção para que cresça em graça, estatura e sabedoria diante de Deus e dos homens (Lucas 2:52).
          </p>
        </div>
      </div>

      <div class="cert-content-rel">
        <div class="cert-signatures">
          <div class="cert-sig-col" style="display: flex; flex-direction: column; align-items: center;">
            <div class="cert-sig-line" style="width: 100%; margin-top: 36px;"></div>
            <p class="cert-sig-name">${data.pastorOficiante}</p>
            <p class="cert-sig-role">Pastor Oficiante • ${sigla}</p>
          </div>

          <div class="cert-sig-col" style="display: flex; flex-direction: column; align-items: center;">
            <div class="cert-sig-line" style="width: 100%; margin-top: 36px;"></div>
            <p class="cert-sig-name">${data.nomePai || data.nomeMae || 'Pais / Responsáveis'}</p>
            <p class="cert-sig-role">Assinatura dos Responsáveis</p>
          </div>
        </div>

        <div class="cert-footer-date">
          ${cidadeUf}, apresentada ao Senhor em <strong>${data.dataApresentacaoExtenso}</strong>.
        </div>

        <div class="cert-footer-timbrado">
          ${nomeIgreja} • ${endereco}
        </div>
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
