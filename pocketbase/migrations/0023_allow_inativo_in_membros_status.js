/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const membrosCol = app.findCollectionByNameOrId('membros')
    const statusField = membrosCol.fields.getByName('status')

    if (statusField) {
      statusField.values = ['Ativo', 'Inativo/Afastado', 'Transferido por Mudança', 'Falecido']
      app.save(membrosCol)
    }
  },
  (app) => {
    try {
      const membrosCol = app.findCollectionByNameOrId('membros')
      const statusField = membrosCol.fields.getByName('status')
      if (statusField) {
        statusField.values = ['Ativo', 'Transferido por Mudança', 'Falecido']
        app.save(membrosCol)
      }
    } catch (_) {}
  },
)
