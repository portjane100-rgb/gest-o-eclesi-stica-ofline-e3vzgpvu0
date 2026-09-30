migrate(
  (app) => {
    const collection = new Collection({
      name: 'planilhas_mensais',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'mes', type: 'number', required: true, min: 1, max: 12 },
        { name: 'ano', type: 'number', required: true, min: 2000, max: 2100 },
        { name: 'congregacao', type: 'text', required: true },
        { name: 'chave_periodo', type: 'text', required: true },
        { name: 'linhas_dizimos', type: 'json' },
        { name: 'linhas_ofertas', type: 'json' },
        { name: 'linhas_contabilidade', type: 'json' },
        { name: 'saldo_mes_anterior', type: 'number' },
        { name: 'total_ofertas', type: 'number' },
        { name: 'total_dizimos', type: 'number' },
        { name: 'oferta_especial', type: 'number' },
        { name: 'total_entradas', type: 'number' },
        { name: 'total_saidas_20', type: 'number' },
        { name: 'saldo_sede', type: 'number' },
        { name: 'saldo_congregacao', type: 'number' },
        { name: 'assinaturas', type: 'json' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_planilhas_periodo ON planilhas_mensais (ano DESC, mes DESC)',
        'CREATE INDEX idx_planilhas_congregacao ON planilhas_mensais (congregacao)',
        'CREATE UNIQUE INDEX idx_planilhas_chave ON planilhas_mensais (chave_periodo)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('planilhas_mensais')
      app.delete(collection)
    } catch (_) {}
  },
)
