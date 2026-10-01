/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    let col = null
    try {
      col = app.findCollectionByNameOrId('congregacoes')
    } catch (_) {}

    if (col) {
      if (!col.fields.getByName('dirigente_percentual')) {
        col.fields.add(
          new NumberField({
            name: 'dirigente_percentual',
            min: 0,
            max: 100,
          }),
        )
        app.save(col)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('congregacoes')
      if (col && col.fields.getByName('dirigente_percentual')) {
        col.fields.removeByName('dirigente_percentual')
        app.save(col)
      }
    } catch (_) {}
  },
)
