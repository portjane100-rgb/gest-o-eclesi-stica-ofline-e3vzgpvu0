/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Adicionar campo 'whatsapp' (text, opcional) na coleção membros
    const membrosCol = app.findCollectionByNameOrId('membros')
    if (!membrosCol.fields.getByName('whatsapp')) {
      membrosCol.fields.add(
        new TextField({
          name: 'whatsapp',
          required: false,
        }),
      )
      app.save(membrosCol)
    }

    // 2. Adicionar campo 'whatsapp' (text, opcional) na coleção congregados
    const congregadosCol = app.findCollectionByNameOrId('congregados')
    if (!congregadosCol.fields.getByName('whatsapp')) {
      congregadosCol.fields.add(
        new TextField({
          name: 'whatsapp',
          required: false,
        }),
      )
      app.save(congregadosCol)
    }

    // 3. Adicionar campo 'whatsapp' (text, opcional) na coleção solicitacoes_cadastro se existir
    try {
      const solicitacoesCol = app.findCollectionByNameOrId('solicitacoes_cadastro')
      if (solicitacoesCol && !solicitacoesCol.fields.getByName('whatsapp')) {
        solicitacoesCol.fields.add(
          new TextField({
            name: 'whatsapp',
            required: false,
          }),
        )
        app.save(solicitacoesCol)
      }
    } catch (_) {}

    // 4. Iniciar configuração mensagem_aniversario se não existir
    try {
      const configCol = app.findCollectionByNameOrId('configuracoes')
      try {
        app.findFirstRecordByData('configuracoes', 'chave', 'mensagem_aniversario')
      } catch (_) {
        const record = new Record(configCol)
        record.set('chave', 'mensagem_aniversario')
        record.set(
          'valor',
          'A paz do Senhor, {nome}! A Assembleia de Deus — Templo Central de Campanário deseja a você muitas felicidades e que Deus abençoe seu novo ano de vida! 🎉',
        )
        app.save(record)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const membrosCol = app.findCollectionByNameOrId('membros')
      const wfM = membrosCol.fields.getByName('whatsapp')
      if (wfM) {
        membrosCol.fields.removeByName('whatsapp')
        app.save(membrosCol)
      }
    } catch (_) {}

    try {
      const congregadosCol = app.findCollectionByNameOrId('congregados')
      const wfC = congregadosCol.fields.getByName('whatsapp')
      if (wfC) {
        congregadosCol.fields.removeByName('whatsapp')
        app.save(congregadosCol)
      }
    } catch (_) {}

    try {
      const solicitacoesCol = app.findCollectionByNameOrId('solicitacoes_cadastro')
      const wfS = solicitacoesCol.fields.getByName('whatsapp')
      if (wfS) {
        solicitacoesCol.fields.removeByName('whatsapp')
        app.save(solicitacoesCol)
      }
    } catch (_) {}
  },
)
