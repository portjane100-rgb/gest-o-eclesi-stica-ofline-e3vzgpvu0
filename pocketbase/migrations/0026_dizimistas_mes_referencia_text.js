/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const dizimistasCol = app.findCollectionByNameOrId('dizimistas')

    // 1. Remover o índice antigo se existir sobre mes_referencia
    try {
      dizimistasCol.removeIndex('idx_dizimistas_mes')
    } catch (_) {}

    // 2. Remover o campo date mes_referencia antigo
    if (dizimistasCol.fields.getByName('mes_referencia')) {
      dizimistasCol.fields.removeByName('mes_referencia')
    }

    // 3. Adicionar mes_referencia como campo de texto flexível (não obrigatório)
    dizimistasCol.fields.add(
      new TextField({
        name: 'mes_referencia',
        required: false,
      }),
    )

    // 4. Recriar índice não exclusivo sobre mes_referencia
    try {
      dizimistasCol.addIndex('idx_dizimistas_mes', false, 'mes_referencia', '')
    } catch (_) {}

    app.save(dizimistasCol)
  },
  (app) => {
    try {
      const dizimistasCol = app.findCollectionByNameOrId('dizimistas')
      if (dizimistasCol.fields.getByName('mes_referencia')) {
        dizimistasCol.fields.removeByName('mes_referencia')
      }
      dizimistasCol.fields.add(
        new DateField({
          name: 'mes_referencia',
          required: false,
        }),
      )
      dizimistasCol.addIndex('idx_dizimistas_mes', false, 'mes_referencia', '')
      app.save(dizimistasCol)
    } catch (_) {}
  },
)
