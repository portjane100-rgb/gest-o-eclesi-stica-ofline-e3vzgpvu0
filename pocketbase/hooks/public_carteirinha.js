// Hook de verificação e geração da Carteirinha Digital do Dizimista
// Rota pública segura: POST /backend/v1/public/carteirinha
// Fornece verificação de dizimista e emissão de dados da carteirinha
routerAdd('POST', '/backend/v1/public/carteirinha', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const nomeInformado = (body.nome || '').trim()
    const cpfInformado = (body.cpf || '').trim()

    if (!nomeInformado || !cpfInformado) {
      return e.json(400, {
        error: 'Informe seu nome completo e seu CPF para consultar sua carteirinha.',
      })
    }

    // Normalizador de texto (remove acentos, espaços extras e converte para minúsculas)
    const normalizar = (str) => {
      if (!str) return ''
      return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    }

    const apenasDigitos = (str) => {
      if (!str) return ''
      return String(str).replace(/\D/g, '')
    }

    const cpfBuscado = apenasDigitos(cpfInformado)
    const nomeBuscado = normalizar(nomeInformado)

    if (cpfBuscado.length < 5) {
      return e.json(404, {
        error: 'Não encontramos sua carteirinha. Verifique os dados ou fale com a secretaria.',
      })
    }

    // 1. Buscar membros com status 'Ativo'
    const membrosCol = $app.findCollectionByNameOrId('membros')
    const membrosRecords = $app.findRecordsByFilter(
      'membros',
      "status = 'Ativo'",
      '-created',
      300,
      0,
    )

    let membroEncontrado = null

    for (const m of membrosRecords) {
      const cpfMembro = apenasDigitos(m.get('cpf'))
      if (!cpfMembro) continue

      // CPF deve bater exatamente pelos dígitos
      if (cpfMembro !== cpfBuscado) continue

      // Comparação tolerante de nome
      const nomeMembroNorm = normalizar(m.get('nome'))
      if (!nomeMembroNorm) continue

      // Tolerante: exato, ou inclui nome buscado no membro, ou nome do membro no buscado
      if (
        nomeMembroNorm === nomeBuscado ||
        nomeMembroNorm.includes(nomeBuscado) ||
        nomeBuscado.includes(nomeMembroNorm)
      ) {
        membroEncontrado = m
        break
      }
    }

    if (!membroEncontrado) {
      return e.json(404, {
        error: 'Não encontramos sua carteirinha. Verifique os dados ou fale com a secretaria.',
      })
    }

    // 2. Verificar se o membro está na sessão Dizimistas com status ativo
    const dizimistasCol = $app.findCollectionByNameOrId('dizimistas')
    const dizimistasRecords = $app.findRecordsByFilter('dizimistas', '', '-created', 500, 0)

    let dizimistaAtivo = false
    const membroId = membroEncontrado.id
    const nomeMembroNorm = normalizar(membroEncontrado.get('nome'))

    for (const d of dizimistasRecords) {
      const isAtivo = d.get('ativo') !== false // default true

      // Verifica pelo vínculo relacional membro
      if (d.get('membro') === membroId && isAtivo) {
        dizimistaAtivo = true
        break
      }

      // Fallback: se for registro legado sem campo membro vinculado, compara pelo nome
      const dNome = normalizar(d.get('nome'))
      if (dNome && isAtivo) {
        if (
          dNome === nomeMembroNorm ||
          dNome.includes(nomeMembroNorm) ||
          nomeMembroNorm.includes(dNome)
        ) {
          dizimistaAtivo = true
          break
        }
      }
    }

    if (!dizimistaAtivo) {
      // Se não estiver como dizimista ativo, exibe a mesma mensagem amigável sem revelar detalhes
      return e.json(404, {
        error: 'Não encontramos sua carteirinha. Verifique os dados ou fale com a secretaria.',
      })
    }

    // 3. Montar dados da carteirinha
    const fotoNome = membroEncontrado.get('foto')
    let fotoUrl = null
    if (fotoNome) {
      // Gera URL pública do arquivo
      const host = e.requestInfo().url.host || ''
      const scheme = e.requestInfo().url.scheme || 'https'
      fotoUrl = `${scheme}://${host}/api/files/membros/${membroEncontrado.id}/${fotoNome}`
    }

    // Buscar configurações de liderança e assinaturas gravadas
    let pastorNome = 'Pr José Francisco Portela Fontenele'
    let pastorCargo = 'Pastor'
    let sigPastorUrl = null
    let sig1SecUrl = null
    let cidadePadrao = 'Campanário - CE'
    let siglaPadrao = 'ADTC'

    try {
      const confs = $app.findRecordsByFilter('configuracoes', '', '', 100, 0)
      const host = e.requestInfo().url.host || ''
      const scheme = e.requestInfo().url.scheme || 'https'

      for (const c of confs) {
        const k = c.get('chave')
        const v = c.get('valor')
        const arq = c.get('arquivo')

        if (k === 'lideranca_nome_pastor' && v && !v.startsWith('[')) pastorNome = v.trim()
        if (k === 'lideranca_cargo_pastor' && v && !v.startsWith('[')) pastorCargo = v.trim()
        if (k === 'igreja_cidade_estado' && v) cidadePadrao = v.trim()
        if (k === 'igreja_sigla' && v) siglaPadrao = v.trim()

        if (k === 'assinatura_pastor') {
          if (arq) sigPastorUrl = `${scheme}://${host}/api/files/configuracoes/${c.id}/${arq}`
          else if (v && v.startsWith('data:image')) sigPastorUrl = v
        }
        if (k === 'assinatura_secretario1') {
          if (arq) sig1SecUrl = `${scheme}://${host}/api/files/configuracoes/${c.id}/${arq}`
          else if (v && v.startsWith('data:image')) sig1SecUrl = v
        }
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      membro: {
        id: membroEncontrado.id,
        nome: membroEncontrado.get('nome'),
        filiacao: membroEncontrado.get('filiacao') || '',
        data_nascimento: membroEncontrado.get('data_nascimento') || '',
        data_nascimento_texto: membroEncontrado.get('data_nascimento_texto') || '',
        naturalidade: membroEncontrado.get('naturalidade') || cidadePadrao,
        nacionalidade: 'Brasileira',
        estado_civil: membroEncontrado.get('estado_civil') || 'Solteiro(a)',
        data_batismo: membroEncontrado.get('data_batismo') || '',
        data_batismo_texto: membroEncontrado.get('data_batismo_texto') || '',
        cpf: membroEncontrado.get('cpf') || '',
        rg: membroEncontrado.get('rg') || '',
        congregacao: membroEncontrado.get('congregacao') || 'Sede',
        numero_registro:
          membroEncontrado.get('numero_registro') ||
          membroEncontrado.get('numero_ficha') ||
          `${siglaPadrao || 'MBR'}-001`,
        foto: fotoNome || '',
        fotoUrl: fotoUrl,
      },
      lideranca: {
        pastorNome: pastorNome,
        pastorCargo: pastorCargo,
        assinaturaPastorUrl: sigPastorUrl,
        assinatura1SecUrl: sig1SecUrl,
      },
    })
  } catch (err) {
    return e.json(500, {
      error: 'Ocorreu um erro ao consultar. Tente novamente mais tarde.',
    })
  }
})
