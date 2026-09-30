routerAdd('POST', '/backend/v1/agent-chat', (e) => {
  try {
    const body = e.requestInfo().body || {}
    if (!body.message || !body.message.trim()) {
      return e.json(400, { error: 'A mensagem é obrigatória.' })
    }

    // Identidade do usuário: se autenticado usa e.auth.id, senão usa o usuário de serviço assistente@adtc.local
    let userId = e.auth?.id
    if (!userId) {
      try {
        const serviceUser = $app.findAuthRecordByEmail('users', 'assistente@adtc.local')
        userId = serviceUser.id
      } catch (_) {
        return e.json(500, { error: 'Usuário do assistente não configurado.' })
      }
    }

    const rawMessage = body.message.trim()
    const lower = rawMessage.toLowerCase()

    // Higienização / Validação preventiva de proteção de dados:
    // Se a mensagem solicitar explicitamente CPF, RG, identidade ou dados sigilosos de MEMBROS,
    // o assistente já responde com a recusa solene e protetiva conforme as diretrizes da igreja.
    // NOTA: Se for pergunta sobre PIX, dízimo, doação, CNPJ ou contribuição, NÃO é dado sigiloso de membro.
    const isConsultaContribuicao =
      lower.includes('pix') ||
      lower.includes('doar') ||
      lower.includes('doação') ||
      lower.includes('doacao') ||
      lower.includes('dízimo') ||
      lower.includes('dizimo') ||
      lower.includes('oferta') ||
      lower.includes('contribuir') ||
      lower.includes('contribuição') ||
      lower.includes('contribuicao') ||
      lower.includes('cnpj')

    const pedeDadosSensiveis =
      !isConsultaContribuicao &&
      (lower.includes('cpf') ||
        lower.includes('rg') ||
        lower.includes('identidade') ||
        lower.includes('endereço') ||
        lower.includes('endereco') ||
        lower.includes('telefone') ||
        lower.includes('ficha') ||
        lower.includes('dado pessoal') ||
        lower.includes('dados sensíveis') ||
        lower.includes('dados sensiveis')) &&
      (lower.includes('membro') ||
        lower.includes('irmã') ||
        lower.includes('irma') ||
        lower.includes('irmão') ||
        lower.includes('irmao') ||
        lower.includes('alguém') ||
        lower.includes('alguem') ||
        lower.includes('qual o') ||
        lower.includes('qual é') ||
        lower.includes('qual e') ||
        lower.includes('passe o') ||
        lower.includes('me dê') ||
        lower.includes('me de'))

    // Verificar se a conversa é contínua (se já tem conversation_id com mensagens anteriores)
    let isFirstMessageInConversation = true
    if (body.conversation_id) {
      try {
        const msgList = $ai.agent('adtc-assistente').listMessages({
          conversation_id: body.conversation_id,
          user_id: userId,
          limit: 5,
        })
        if (msgList && msgList.messages && msgList.messages.length > 0) {
          isFirstMessageInConversation = false
        }
      } catch (_) {}
    }

    if (pedeDadosSensiveis) {
      const recusaMsg = 'Não posso fornecer esse dado pessoal.'
      return e.json(200, {
        conversation_id: body.conversation_id || null,
        content: recusaMsg,
        citations: [],
        message_id: 'privacy-guard',
      })
    }

    // Operação administrativa: emissão de carteirinha de membro
    // Conforme novo treinamento: diferenciar capacidade de permissão.
    // O sistema possui essa função, mas a emissão é administrativa e exige acesso autorizado ao painel.
    const pedeCarteirinha =
      (lower.includes('carteirinha') || lower.includes('carteira')) &&
      (lower.includes('membro') ||
        lower.includes('gerar') ||
        lower.includes('emitir') ||
        lower.includes('minha') ||
        lower.includes('fazer') ||
        lower.includes('segunda via') ||
        lower.includes('quero') ||
        lower.includes('como'))

    if (pedeCarteirinha) {
      const carteirinhaMsg =
        'O sistema possui essa função, mas a emissão da carteira é administrativa e exige acesso autorizado ao painel.'
      return e.json(200, {
        conversation_id: body.conversation_id || null,
        content: carteirinhaMsg,
        citations: [],
        message_id: 'carteirinha-admin',
      })
    }

    // Buscar SEMPRE as configurações atualizadas da coleção 'configuracoes' como fonte única de verdade
    let chavePixAtual = '14.037.658/0001-82'
    let titularAtual = 'José Francisco Portela'
    let bancoAtual = ''
    let versiculoPix = '2 Coríntios 9:7'
    let mensagemPix = ''
    let nomeIgrejaConfig = 'nossa igreja'
    let siglaIgrejaConfig = 'Igreja'
    let cidadeEstadoConfig = 'Campanário - CE'
    try {
      const configRecords = $app.findRecordsByFilter('configuracoes', '', '', 100, 0)
      for (let i = 0; i < configRecords.length; i++) {
        const c = configRecords[i]
        const key = c.getString('chave')
        const val = c.getString('valor')
        if (key === 'pix_chave_copia_e_cola' && val) chavePixAtual = val
        if (key === 'pix_cnpj' && val && (!chavePixAtual || chavePixAtual.includes('@'))) {
          chavePixAtual = val
        }
        if (key === 'pix_titular' && val) titularAtual = val
        if (key === 'pix_banco' && val) bancoAtual = val
        if (key === 'pix_versiculo' && val) versiculoPix = val
        if (key === 'pix_mensagem' && val) mensagemPix = val
        if (key === 'igreja_nome' && val) nomeIgrejaConfig = val.trim()
        if (key === 'igreja_sigla' && val) siglaIgrejaConfig = val.trim()
        if (key === 'igreja_cidade_estado' && val) cidadeEstadoConfig = val.trim()
      }
    } catch (_) {}

    // Resposta progressiva e natural quando pergunta sobre doação ou chave PIX:
    // Se a pergunta for ampla como "quero doar" ou "quero fazer uma doação", pergunta antes.
    // Se a pergunta já for direta sobre a chave pix/CNPJ, informa a chave cadastrada com objetividade.
    if (isConsultaContribuicao) {
      const pedeChaveDireta =
        lower.includes('chave') ||
        lower.includes('qual o pix') ||
        lower.includes('qual e o pix') ||
        lower.includes('qual é o pix') ||
        lower.includes('numero') ||
        lower.includes('número') ||
        lower.includes('cnpj') ||
        lower.includes('passa o pix') ||
        lower.includes('manda o pix') ||
        lower.includes('codigo') ||
        lower.includes('código')

      if (pedeChaveDireta) {
        let respostaPix =
          'A chave PIX oficial da ' +
          (siglaIgrejaConfig || nomeIgrejaConfig || 'igreja') +
          ' é o CNPJ: ' +
          chavePixAtual +
          ' (Titular: ' +
          titularAtual +
          (bancoAtual && bancoAtual !== 'N' ? ' - ' + bancoAtual : '') +
          ').'
        return e.json(200, {
          conversation_id: body.conversation_id || null,
          content: respostaPix,
          citations: [],
          message_id: 'pix-live-config',
        })
      }

      // Se for apenas "quero fazer doação", pergunta progressiva
      const perguntaProgressiva = 'Claro! Você prefere fazer pelo PIX ou presencialmente na igreja?'
      return e.json(200, {
        conversation_id: body.conversation_id || null,
        content: perguntaProgressiva,
        citations: [],
        message_id: 'pix-ask-progressivo',
      })
    }

    // ----------------------------------------------------
    // CÁLCULO E FORMATAÇÃO DE DATA E HORA REAL (Fuso Horário: America/Sao_Paulo)
    // Campanário / Horário de Brasília UTC-3
    // ----------------------------------------------------
    const agoraUTC = new Date()
    // Deslocamento UTC-3 em milissegundos
    const tzOffsetMs = -3 * 60 * 60 * 1000
    const agoraLocal = new Date(agoraUTC.getTime() + tzOffsetMs)

    const diasSemanaNomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const mesesNomes = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ]

    const pad = (n) => (n < 10 ? '0' + n : '' + n)

    // Hoje
    const hojeAno = agoraLocal.getUTCFullYear()
    const hojeMes = agoraLocal.getUTCMonth() + 1
    const hojeDia = agoraLocal.getUTCDate()
    const hojeDiaSemanaNome = diasSemanaNomes[agoraLocal.getUTCDay()]
    const hojeDataFormatada = pad(hojeDia) + '/' + pad(hojeMes) + '/' + hojeAno
    const hojeHoraFormatada = pad(agoraLocal.getUTCHours()) + ':' + pad(agoraLocal.getUTCMinutes())

    // Amanhã
    const amanhaLocal = new Date(agoraLocal.getTime() + 24 * 60 * 60 * 1000)
    const amanhaAno = amanhaLocal.getUTCFullYear()
    const amanhaMes = amanhaLocal.getUTCMonth() + 1
    const amanhaDia = amanhaLocal.getUTCDate()
    const amanhaDiaSemanaNome = diasSemanaNomes[amanhaLocal.getUTCDay()]
    const amanhaDataFormatada = pad(amanhaDia) + '/' + pad(amanhaMes) + '/' + amanhaAno

    // Buscar em tempo real a grade de cultos de 'agenda_semanal' para enriquecer o prompt
    // e dar precisão absoluta ao assistente sobre o que há HOJE, AMANHÃ e nos outros dias
    let agendaResumoHoje = []
    let agendaResumoAmanha = []
    let agendaGeralSemanal = []
    try {
      const agendaRecords = $app.findRecordsByFilter(
        'agenda_semanal',
        '',
        'unidade,dia_semana,horario',
        100,
        0,
      )
      for (let i = 0; i < agendaRecords.length; i++) {
        const item = agendaRecords[i]
        const unid = item.getString('unidade')
        const dia = item.getString('dia_semana')
        const hor = item.getString('horario')
        const ev = item.getString('evento')
        const obs = item.getString('observacao')

        const linha =
          '- [' + unid + '] ' + dia + ' às ' + hor + ' - ' + ev + (obs ? ' (' + obs + ')' : '')
        agendaGeralSemanal.push(linha)

        if (dia === hojeDiaSemanaNome) {
          agendaResumoHoje.push(
            '- [' + unid + '] às ' + hor + ': ' + ev + (obs ? ' (' + obs + ')' : ''),
          )
        }
        if (dia === amanhaDiaSemanaNome) {
          agendaResumoAmanha.push(
            '- [' + unid + '] às ' + hor + ': ' + ev + (obs ? ' (' + obs + ')' : ''),
          )
        }
      }
    } catch (_) {}

    // Buscar eventos próximos de 'calendario' (festividades)
    let proximosEventosCalendario = []
    try {
      const calRecords = $app.findRecordsByFilter('calendario', '', 'data_inicio', 10, 0)
      for (let i = 0; i < calRecords.length; i++) {
        const c = calRecords[i]
        const tit = c.getString('titulo')
        const dIni = c.getString('data_inicio')
        const dep = c.getString('departamento')
        proximosEventosCalendario.push(
          '- ' + tit + ' (Início: ' + dIni.slice(0, 10) + ', Dep: ' + dep + ')',
        )
      }
    } catch (_) {}

    // Buscar em tempo real as CONGREGAÇÕES ativas da coleção 'congregacoes'
    // garantindo ordenação com Sede primeiro
    let listaCongregacoes = []
    let nomesCongregacoes = []
    try {
      const congRecords = $app.findRecordsByFilter('congregacoes', '', 'ordem,created', 50, 0)
      for (let i = 0; i < congRecords.length; i++) {
        const c = congRecords[i]
        const ativ = c.getBool('ativa')
        if (ativ !== false) {
          const cNome = c.getString('nome')
          const cTit = c.getString('titulo') || cNome
          const cEnd = c.getString('endereco') || 'Endereço a definir'
          const cCultos = c.getString('dias_culto') || 'Cultos regulares'
          const cDirigente = c.getString('dirigente_geral') || 'Liderança local'
          const cOrdem = c.getInt('ordem') || 999

          listaCongregacoes.push({
            nome: cNome,
            titulo: cTit,
            endereco: cEnd,
            diasCulto: cCultos,
            dirigente: cDirigente,
            ordem: cOrdem,
          })
        }
      }
    } catch (_) {}

    // Ordenar com Sede primeiro, depois pela ordem numérica
    listaCongregacoes.sort(function (a, b) {
      const isASede = a.nome.trim().toLowerCase() === 'sede'
      const isBSede = b.nome.trim().toLowerCase() === 'sede'
      if (isASede && !isBSede) return -1
      if (!isASede && isBSede) return 1
      return (a.ordem || 999) - (b.ordem || 999)
    })

    nomesCongregacoes = listaCongregacoes.map(function (c) {
      return c.nome
    })
    const totalCongregacoes = listaCongregacoes.length

    // Interceptação rápida para perguntas sobre quantidade/lista de congregações
    const isPerguntaQuantasCongregacoes =
      (lower.includes('quantas congregações') ||
        lower.includes('quantas congregacoes') ||
        lower.includes('quantas unidades') ||
        lower.includes('quais são as congregações') ||
        lower.includes('quais sao as congregacoes') ||
        lower.includes('quais as congregações') ||
        lower.includes('quais as congregacoes') ||
        lower.includes('quais são as unidades') ||
        lower.includes('quais sao as unidades') ||
        lower.includes('quais as unidades') ||
        lower.includes('lista de congregações') ||
        lower.includes('lista de congregacoes') ||
        lower.includes('lista de unidades')) &&
      !lower.includes('culto') &&
      !lower.includes('horário') &&
      !lower.includes('horario')

    if (isPerguntaQuantasCongregacoes && totalCongregacoes > 0) {
      const respostaQuantas =
        'Atualmente a ' +
        (nomeIgrejaConfig || siglaIgrejaConfig || 'nossa igreja') +
        ' conta com ' +
        totalCongregacoes +
        (totalCongregacoes === 1 ? ' congregação: ' : ' congregações: ') +
        nomesCongregacoes.join(', ') +
        '.'

      return e.json(200, {
        conversation_id: body.conversation_id || null,
        content: respostaQuantas,
        citations: [],
        message_id: 'congregacoes-live-count',
      })
    }

    let textoResumoCongregacoes = listaCongregacoes
      .map(function (c) {
        return (
          '- ' +
          c.nome +
          ' (' +
          c.titulo +
          '): Endereço: ' +
          c.endereco +
          ' | Cultos: ' +
          c.diasCulto +
          ' | Dirigente: ' +
          c.dirigente
        )
      })
      .join('\n')

    // Montar o bloco de contexto estrito de sistema
    let contextoSistema =
      '\n\n[CONTEXTO TEMPORAL E DADOS DO BANCO EM TEMPO REAL]:\n' +
      '• Fuso Horário Local: America/Sao_Paulo (' +
      cidadeEstadoConfig +
      ')\n' +
      '• Data e Hora Atual de Hoje: ' +
      hojeDiaSemanaNome +
      ', ' +
      hojeDataFormatada +
      ' às ' +
      hojeHoraFormatada +
      '\n' +
      '• Amanhã será: ' +
      amanhaDiaSemanaNome +
      ', ' +
      amanhaDataFormatada +
      '\n' +
      '• Chave PIX Oficial Atual (CNPJ): ' +
      chavePixAtual +
      ' (Titular: ' +
      titularAtual +
      ')\n' +
      '• CONGREGAÇÕES / UNIDADES DA IGREJA (' +
      (siglaIgrejaConfig || nomeIgrejaConfig || 'IGREJA') +
      ') (TOTAL ' +
      totalCongregacoes +
      ', Sede sempre em primeiro):\n' +
      (textoResumoCongregacoes || 'Sede') +
      '\n' +
      '• Nomes das congregações ativas: ' +
      nomesCongregacoes.join(', ') +
      '\n' +
      '• Primeira mensagem da conversa? ' +
      (isFirstMessageInConversation
        ? 'SIM (pode saudar fraternalmente com naturalidade)'
        : 'NÃO (vá direto ao ponto como conversa natural contínua)') +
      '\n\n' +
      '[CULTOS CADASTRADOS PARA HOJE (' +
      hojeDiaSemanaNome +
      ' - ' +
      hojeDataFormatada +
      ')]:\n' +
      (agendaResumoHoje.length > 0
        ? agendaResumoHoje.join('\n')
        : 'NENHUM CULTO CADASTRADO PARA HOJE.') +
      '\n\n' +
      '[CULTOS CADASTRADOS PARA AMANHÃ (' +
      amanhaDiaSemanaNome +
      ' - ' +
      amanhaDataFormatada +
      ')]:\n' +
      (agendaResumoAmanha.length > 0
        ? agendaResumoAmanha.join('\n')
        : 'NENHUM CULTO CADASTRADO PARA AMANHÃ.') +
      '\n\n' +
      '[REGRAS MANDATÓRIAS PARA RESPOSTA]:\n' +
      '1. NUNCA use asteriscos nem marcação markdown (**negrito**, *itálico*). Formate o texto de forma plana e natural.\n' +
      '2. Ao responder sobre congregações ou unidades da igreja, use ESTRITAMENTE a lista dinâmica informada acima (Total: ' +
      totalCongregacoes +
      ' unidades: ' +
      nomesCongregacoes.join(', ') +
      '). NUNCA diga frase fixa como "são quatro" se a lista contiver outro número. Sede é sempre a primeira.\n' +
      '3. Ao responder sobre hoje ou amanhã, use ESTRITAMENTE a data e dia da semana informados acima. NUNCA erre a data ou dia da semana.\n' +
      '4. Se perguntado sobre cultos de hoje ou amanhã, cite EXCLUSIVAMENTE os cultos listados acima. Se a lista estiver vazia ("NENHUM CULTO CADASTRADO"), informe que não encontrou cultos registrados para essa data e NUNCA invente cultos, reuniões ou horários.\n' +
      '5. Para emissão de carteirinha ou documentos administrativos, diferencie capacidade de permissão: o sistema possui a função, mas a emissão é administrativa e exige acesso autorizado ao painel. Não mande ir à secretaria nem invente procedimentos.\n' +
      '6. Respostas progressivas: quando a pergunta for ampla, faça pergunta curta de esclarecimento. Não despeje informações.'

    const promptEnriquecido = rawMessage + contextoSistema

    // No modo stream o iterador devolve chunks diretamente.
    // Quando síncrono ou fallback, limpamos quaisquer asteriscos residuais.
    const limparAsteriscos = (str) => {
      if (!str || typeof str !== 'string') return ''
      return str.replace(/\*/g, '')
    }

    if (body.stream) {
      const conv = $ai.agent('adtc-assistente').getOrCreateConversation({
        user_id: userId,
        id: body.conversation_id || null,
        title: rawMessage.slice(0, 40),
      })

      const iter = $ai.agent('adtc-assistente').chat({
        user_id: userId,
        conversation_id: conv.id,
        message: promptEnriquecido,
        stream: true,
      })

      e.response.header().set('Content-Type', 'text/event-stream')
      e.response.header().set('Cache-Control', 'no-cache')
      e.response.header().set('X-Conversation-Id', conv.id)
      $response.stream(e, iter)
      return
    }

    const result = $ai.agent('adtc-assistente').chat({
      user_id: userId,
      conversation_id: body.conversation_id || null,
      message: promptEnriquecido,
    })

    const textoFinal = limparAsteriscos(result.content || '')

    return e.json(200, {
      conversation_id: result.conversation_id,
      content: textoFinal,
      citations: result.citations,
      message_id: result.message_id,
    })
  } catch (err) {
    if (err instanceof SkipAiConfigError) {
      return e.json(503, { error: 'Assistente de IA temporariamente indisponível.' })
    }
    if (err instanceof SkipAiAgentsError) {
      const status = err.status || 500
      return e.json(status, {
        error: status >= 500 ? 'Falha na solicitação do assistente.' : err.message,
      })
    }
    if (err instanceof SkipAiError) {
      const status = err.status || 502
      return e.json(status, {
        error: status >= 500 ? 'Assistente temporariamente indisponível.' : err.message,
      })
    }
    return e.json(500, { error: err?.message || 'Erro interno ao processar conversa.' })
  }
})
