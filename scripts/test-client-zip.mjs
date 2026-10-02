/**
 * Script de teste e validação do gerador de ZIP cliente.
 * Simula o ambiente de execução cliente carregando os recursos compilados de dist/
 * através de um mock/handler de fetch local que reproduz a mesma resolução de URL
 * que o navegador do usuário faz ao acessar o sistema publicado.
 *
 * Ele constrói o pacote via buildStandaloneHtmlFromUrl e gerarPacoteZipNoCliente,
 * valida o Blob gerado e inspeciona cada arquivo dentro do ZIP.
 */
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {
  buildZipBlob,
  buildStandaloneHtmlFromUrl,
  validarPacoteZipGerado,
} from '../src/lib/packageZipClient.ts'

const distDir = path.resolve('dist')
const publicDir = path.resolve('public')

// Se dist/ não existir ou não estiver compilado, compilar via vite build programmaticamente
if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
  console.log('[TESTE CLIENTE ZIP] dist/index.html não encontrado. Executando vite build...')
  const { execSync } = await import('node:child_process')
  execSync('npx vite build', { stdio: 'inherit' })
}

// Iniciar um servidor HTTP local simples para simular o site publicado servindo dist/
const server = http.createServer((req, res) => {
  const reqUrl = req.url || '/'
  const cleanPath = reqUrl.split('?')[0].replace(/^\//, '')

  let targetFile = path.join(distDir, cleanPath)
  if (cleanPath === '' || cleanPath === 'index.html') {
    targetFile = path.join(distDir, 'index.html')
  }

  // Se não estiver em dist, tentar em public
  if (!fs.existsSync(targetFile)) {
    targetFile = path.join(publicDir, cleanPath)
  }

  if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
    const ext = path.extname(targetFile).toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === '.html') contentType = 'text/html; charset=utf-8'
    else if (ext === '.css') contentType = 'text/css; charset=utf-8'
    else if (ext === '.js') contentType = 'application/javascript; charset=utf-8'
    else if (ext === '.json') contentType = 'application/json; charset=utf-8'
    else if (ext === '.txt') contentType = 'text/plain; charset=utf-8'
    else if (ext === '.bat') contentType = 'text/plain; charset=utf-8'
    else if (ext === '.svg') contentType = 'image/svg+xml'
    else if (ext === '.ico') contentType = 'image/x-icon'
    else if (ext === '.png') contentType = 'image/png'

    res.writeHead(200, { 'Content-Type': contentType })
    res.end(fs.readFileSync(targetFile))
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  }
})

server.listen(0, '127.0.0.1', async () => {
  const address = server.address()
  if (!address || typeof address === 'string') {
    console.error('Falha ao iniciar servidor de teste')
    process.exit(1)
  }

  const port = address.port
  const baseUrl = `http://127.0.0.1:${port}/`
  console.log(`[TESTE CLIENTE ZIP] Servidor HTTP de teste ativo em ${baseUrl}`)

  try {
    console.log('[TESTE CLIENTE ZIP] Testando obtenção e inline de index.html...')
    const standaloneResult = await buildStandaloneHtmlFromUrl(baseUrl, (msg, pct) => {
      console.log(`  [Progresso ${pct}%] ${msg}`)
    })

    console.log(
      `[TESTE CLIENTE ZIP] Assets embutidos: ${standaloneResult.assetsEmpacotados.length}`,
    )
    for (const a of standaloneResult.assetsEmpacotados) {
      console.log(`   - ${a.caminho} (${a.bytes} bytes)`)
    }

    if (standaloneResult.recursosComErro.length > 0) {
      console.error('[TESTE CLIENTE ZIP] Recursos com erro:', standaloneResult.recursosComErro)
      throw new Error('Falha ao obter recursos essenciais!')
    }

    // Baixar arquivos de apoio
    const pastaRaiz = 'Gestao_Eclesiastica_PC/'
    const arquivosApoio = [
      { nome: 'INSTALAR.bat', obrigatorio: true, binario: false },
      { nome: 'ABRIR_SISTEMA.bat', obrigatorio: true, binario: false },
      { nome: 'ABRIR_SISTEMA.command', obrigatorio: false, binario: false },
      { nome: 'LEIA-ME.txt', obrigatorio: true, binario: false },
      { nome: 'favicon.ico', obrigatorio: true, binario: true },
      { nome: 'manifest.json', obrigatorio: false, binario: false },
    ]

    const files = [
      {
        relativePath: pastaRaiz + 'index.html',
        content: standaloneResult.html,
      },
    ]

    for (const item of arquivosApoio) {
      const res = await fetch(new URL(item.nome, baseUrl).href)
      if (!res.ok) {
        if (item.obrigatorio) {
          throw new Error(`Falha ao obter arquivo obrigatório ${item.nome}`)
        }
        continue
      }
      const content = item.binario ? new Uint8Array(await res.arrayBuffer()) : await res.text()
      files.push({
        relativePath: pastaRaiz + item.nome,
        content,
      })
    }

    // Adicionar metadados
    files.push({
      relativePath: pastaRaiz + 'versao-pacote.json',
      content: JSON.stringify(
        {
          app: 'Gestão Eclesiástica',
          version: '0.0.40',
          buildTimestamp: new Date().toISOString(),
          offlineOnly: true,
          geradoNoCliente: true,
        },
        null,
        2,
      ),
    })

    console.log('[TESTE CLIENTE ZIP] Compactando arquivos via buildZipBlob...')
    const zipBlob = buildZipBlob(files)
    const zipArrayBuffer = await zipBlob.arrayBuffer()
    const zipBuffer = Buffer.from(zipArrayBuffer)

    console.log(
      `[TESTE CLIENTE ZIP] ZIP gerado com sucesso! Tamanho: ${zipBuffer.length} bytes (${(zipBuffer.length / (1024 * 1024)).toFixed(2)} MB)`,
    )

    // Validar usando a função de validação do cliente
    console.log('[TESTE CLIENTE ZIP] Executando validação de regras...')
    const validacao = validarPacoteZipGerado(files, zipBlob)
    console.log('[TESTE CLIENTE ZIP] Resultado da validação:', {
      valido: validacao.valido,
      totalArquivos: validacao.totalArquivos,
      erros: validacao.erros,
      avisos: validacao.avisos,
    })

    if (!validacao.valido) {
      throw new Error(`Validação do pacote falhou: ${validacao.erros.join(', ')}`)
    }

    // Inspecionar binário ZIP real
    let eocdOffset = -1
    for (let i = zipBuffer.length - 22; i >= 0; i--) {
      if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
        eocdOffset = i
        break
      }
    }
    if (eocdOffset === -1) {
      throw new Error('EOCD não encontrado no ZIP!')
    }

    const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10)
    const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16)
    let p = cdOffset
    const entriesInZip = []
    for (let i = 0; i < totalEntries; i++) {
      const sig = zipBuffer.readUInt32LE(p)
      if (sig !== 0x02014b50) break
      const nameLen = zipBuffer.readUInt16LE(p + 28)
      const extraLen = zipBuffer.readUInt16LE(p + 30)
      const commentLen = zipBuffer.readUInt16LE(p + 32)
      const name = zipBuffer.toString('utf-8', p + 46, p + 46 + nameLen)
      entriesInZip.push(name)
      p += 46 + nameLen + extraLen + commentLen
    }

    console.log('\n[TESTE CLIENTE ZIP] Lista de arquivos dentro do ZIP:')
    for (const name of entriesInZip) {
      console.log(`  - ${name}`)
    }

    // Salvar o arquivo gerado de teste e resumo para comprovação
    const outputPath = path.resolve('public/Gestao_Eclesiastica_Versao_PC.zip')
    fs.writeFileSync(outputPath, zipBuffer)
    const stat = fs.statSync(outputPath)
    console.log(
      `\n[TESTE CLIENTE ZIP] Arquivo salvo em: ${outputPath} (${stat.size} bytes / ${(stat.size / (1024 * 1024)).toFixed(2)} MB)`,
    )

    const testSummary = {
      zipPath: outputPath,
      sizeBytes: stat.size,
      sizeMB: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
      totalFiles: entriesInZip.length,
      files: entriesInZip,
      validation: validacao,
    }
    fs.writeFileSync(
      path.resolve('public/client-zip-summary.json'),
      JSON.stringify(testSummary, null, 2),
      'utf-8',
    )

    // Também salvar cópia no repo para persistir além do sandbox de build
    fs.writeFileSync(
      path.resolve('scripts/client-zip-summary.json'),
      JSON.stringify(testSummary, null, 2),
      'utf-8',
    )

    server.close()
    console.log('\n[TESTE CLIENTE ZIP] Todos os testes passaram com sucesso!')
    process.exit(0)
  } catch (err) {
    console.error('\n[TESTE CLIENTE ZIP] ERRO DURANTE O TESTE:', err)
    server.close()
    process.exit(1)
  }
})
