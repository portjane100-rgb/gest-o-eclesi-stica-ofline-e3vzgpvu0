/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Adicionar campo 'foto' (file) na coleção 'calendario'
    const calendarioCol = app.findCollectionByNameOrId('calendario')
    if (!calendarioCol.fields.getByName('foto')) {
      calendarioCol.fields.add(
        new FileField({
          name: 'foto',
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      )
      app.save(calendarioCol)
    }

    // 2. Adicionar campo 'fotos' (file, maxSelect 10) na coleção 'escala_semana'
    const escalaSemanaCol = app.findCollectionByNameOrId('escala_semana')
    if (!escalaSemanaCol.fields.getByName('fotos')) {
      escalaSemanaCol.fields.add(
        new FileField({
          name: 'fotos',
          maxSelect: 10,
          maxSize: 10485760, // 10MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      )
      app.save(escalaSemanaCol)
    }

    // 3. Criar coleção 'congregacoes' para persistência dinâmica das congregações
    let congregacoesCol = null
    try {
      congregacoesCol = app.findCollectionByNameOrId('congregacoes')
    } catch (_) {}

    if (!congregacoesCol) {
      congregacoesCol = new Collection({
        name: 'congregacoes',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'titulo', type: 'text' },
          { name: 'subtitulo', type: 'text' },
          { name: 'endereco', type: 'text' },
          { name: 'dias_culto', type: 'text' },
          { name: 'dirigente_geral', type: 'text' },
          { name: 'ordem', type: 'number' },
          { name: 'ativa', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_congregacoes_nome ON congregacoes (nome)'],
      })
      app.save(congregacoesCol)

      // Seed das 4 congregações históricas padrão se não existirem
      const seeds = [
        {
          nome: 'Sede',
          titulo: 'Templo Sede ADTC',
          subtitulo: 'Centro de Adoração e Sede Administrativa',
          endereco: 'Rua Alberto Batista Fontenele, nº 141, Campanário',
          dias_culto: 'Quinta-feira e Domingo (19h00) • Escola Bíblica aos Domingos (09h00)',
          dirigente_geral: 'Liderança Geral do Pastor Presidente',
          ordem: 1,
          ativa: true,
        },
        {
          nome: 'Congregação das Casinhas',
          titulo: 'Congregação das Casinhas',
          subtitulo: 'Filial 1 • Bairro Novo Campanário',
          endereco: 'Conjunto Habitacional Novo Campanário (Casinhas)',
          dias_culto: 'Segunda, Quarta, Sexta e Domingo',
          dirigente_geral: 'Presbítero Responsável',
          ordem: 2,
          ativa: true,
        },
        {
          nome: 'Congregação do Alto',
          titulo: 'Congregação do Alto',
          subtitulo: 'Filial 2 • Comunidade do Alto',
          endereco: 'Bairro do Alto, Campanário',
          dias_culto: 'Sexta (19h00) e Domingo (09h00 e 19h00)',
          dirigente_geral: 'Presbítero Responsável',
          ordem: 3,
          ativa: true,
        },
        {
          nome: 'Congregação da Vila dos Pescadores',
          titulo: 'Vila dos Pescadores',
          subtitulo: 'Filial 3 • Comunidade Pesqueira',
          endereco: 'Comunidade da Vila dos Pescadores',
          dias_culto: 'Segunda (19h00) e Sexta (18h30)',
          dirigente_geral: 'Evangelista Responsável',
          ordem: 4,
          ativa: true,
        },
      ]

      for (const item of seeds) {
        try {
          app.findFirstRecordByData('congregacoes', 'nome', item.nome)
        } catch (_) {
          const record = new Record(congregacoesCol)
          record.set('nome', item.nome)
          record.set('titulo', item.titulo)
          record.set('subtitulo', item.subtitulo)
          record.set('endereco', item.endereco)
          record.set('dias_culto', item.dias_culto)
          record.set('dirigente_geral', item.dirigente_geral)
          record.set('ordem', item.ordem)
          record.set('ativa', item.ativa)
          app.save(record)
        }
      }
    }
  },
  (app) => {
    try {
      const cal = app.findCollectionByNameOrId('calendario')
      if (cal.fields.getByName('foto')) {
        cal.fields.removeByName('foto')
        app.save(cal)
      }
    } catch (_) {}

    try {
      const esc = app.findCollectionByNameOrId('escala_semana')
      if (esc.fields.getByName('fotos')) {
        esc.fields.removeByName('fotos')
        app.save(esc)
      }
    } catch (_) {}

    try {
      const cong = app.findCollectionByNameOrId('congregacoes')
      app.delete(cong)
    } catch (_) {}
  },
)
