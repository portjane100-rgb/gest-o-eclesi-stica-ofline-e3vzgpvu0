migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('configuracoes')
    if (!col.fields.getByName('arquivo')) {
      col.fields.add(
        new FileField({
          name: 'arquivo',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('configuracoes')
    const field = col.fields.getByName('arquivo')
    if (field) {
      col.fields.removeByName('arquivo')
      app.save(col)
    }
  },
)
