migrate(
  (app) => {
    const collection = new Collection({
      name: 'cartas_recebidas',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'nome',
          type: 'text',
          required: true,
        },
        {
          name: 'tipo_pessoa',
          type: 'select',
          required: true,
          values: ['Membro', 'Obreiro'],
          maxSelect: 1,
        },
        {
          name: 'funcao_obreiro',
          type: 'text',
        },
        {
          name: 'igreja_origem',
          type: 'text',
          required: true,
        },
        {
          name: 'cidade_origem',
          type: 'text',
        },
        {
          name: 'data_recebimento',
          type: 'date',
          required: true,
        },
        {
          name: 'congregacao_destino',
          type: 'select',
          values: [
            'Sede',
            'Congregação das Casinhas',
            'Congregação do Alto',
            'Congregação da Vila dos Pescadores',
          ],
          maxSelect: 1,
        },
        {
          name: 'arquivo_pdf',
          type: 'file',
          required: false,
          maxSelect: 1,
          maxSize: 20971520, // 20 MB
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        },
        {
          name: 'observacoes',
          type: 'text',
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_cartas_tipo ON cartas_recebidas (tipo_pessoa)',
        'CREATE INDEX idx_cartas_nome ON cartas_recebidas (nome)',
        'CREATE INDEX idx_cartas_data ON cartas_recebidas (data_recebimento DESC)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('cartas_recebidas')
      app.delete(collection)
    } catch (_) {}
  },
)
