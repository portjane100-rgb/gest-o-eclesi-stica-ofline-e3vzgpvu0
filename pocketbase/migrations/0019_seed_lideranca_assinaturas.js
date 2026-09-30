migrate(
  (app) => {
    const configCol = app.findCollectionByNameOrId('configuracoes')

    const seeds = [
      { chave: 'lideranca_nome_pastor', valor: 'José Francisco Portela Fontenele' },
      { chave: 'lideranca_cargo_pastor', valor: 'Pastor' },
      { chave: 'lideranca_nome_1_secretario', valor: 'Valderlanio Carneiro Araújo' },
      { chave: 'lideranca_cargo_1_secretario', valor: '1ºSecretário' },
      { chave: 'lideranca_nome_2_secretario', valor: 'Antonio de Vasconcelos' },
      { chave: 'lideranca_cargo_2_secretario', valor: '2ºSecretário' },
    ]

    for (const item of seeds) {
      try {
        const existing = app.findFirstRecordByData('configuracoes', 'chave', item.chave)
        if (!existing.getString('valor')) {
          existing.set('valor', item.valor)
          app.save(existing)
        }
      } catch (_) {
        const record = new Record(configCol)
        record.set('chave', item.chave)
        record.set('valor', item.valor)
        app.save(record)
      }
    }
  },
  (app) => {
    const chaves = [
      'lideranca_nome_pastor',
      'lideranca_cargo_pastor',
      'lideranca_nome_1_secretario',
      'lideranca_cargo_1_secretario',
      'lideranca_nome_2_secretario',
      'lideranca_cargo_2_secretario',
    ]
    for (const chave of chaves) {
      try {
        const record = app.findFirstRecordByData('configuracoes', 'chave', chave)
        app.delete(record)
      } catch (_) {}
    }
  },
)
