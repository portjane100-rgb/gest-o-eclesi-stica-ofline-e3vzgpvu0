migrate(
  (app) => {
    // 1. Coleção salmos: para áudios MP3 de salmos musicados
    const salmos = new Collection({
      name: 'salmos',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'numero', type: 'number' },
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'audio',
          type: 'file',
          maxSelect: 1,
          maxSize: 52428800, // até 50MB por arquivo de áudio
          mimeTypes: [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/ogg',
            'audio/m4a',
            'audio/x-m4a',
          ],
        },
        { name: 'ordem', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_salmos_numero ON salmos (numero)',
        'CREATE INDEX idx_salmos_ordem ON salmos (ordem)',
      ],
    })
    app.save(salmos)

    // 2. Coleção albuns_fotos: temas de cada festa/evento da igreja
    const albunsFotos = new Collection({
      name: 'albuns_fotos',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'data_evento', type: 'date' },
        { name: 'ordem', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_albuns_fotos_ordem ON albuns_fotos (ordem)'],
    })
    app.save(albunsFotos)

    // 3. Coleção fotos: fotos pertencentes a cada tema/festa
    const albumColId = app.findCollectionByNameOrId('albuns_fotos').id
    const fotos = new Collection({
      name: 'fotos',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'album',
          type: 'relation',
          required: true,
          collectionId: albumColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'arquivo',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 20971520, // até 20MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        },
        { name: 'legenda', type: 'text' },
        { name: 'ordem', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_fotos_album ON fotos (album)',
        'CREATE INDEX idx_fotos_ordem ON fotos (ordem)',
      ],
    })
    app.save(fotos)
  },
  (app) => {
    const list = ['fotos', 'albuns_fotos', 'salmos']
    for (const name of list) {
      try {
        const c = app.findCollectionByNameOrId(name)
        app.delete(c)
      } catch (_) {}
    }
  },
)
