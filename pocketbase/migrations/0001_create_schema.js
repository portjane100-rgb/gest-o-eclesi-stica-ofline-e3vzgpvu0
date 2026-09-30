migrate(
  (app) => {
    // 1. Membros (base)
    // Leitura pública de nomes apenas (feita pelo app; list/view permitido para todos para leitura dos nomes e admin para tudo)
    const membros = new Collection({
      name: 'membros',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'data_nascimento', type: 'date' },
        { name: 'telefone', type: 'text' },
        { name: 'data_conversao', type: 'date' },
        { name: 'data_batismo', type: 'date' },
        {
          name: 'congregacao',
          type: 'select',
          required: true,
          values: [
            'Sede',
            'Congregação das Casinhas',
            'Congregação do Alto',
            'Congregação da Vila dos Pescadores',
          ],
          maxSelect: 1,
        },
        {
          name: 'foto',
          type: 'file',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Ativo', 'Transferido por Mudança', 'Falecido'],
          maxSelect: 1,
        },
        { name: 'numero_registro', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_membros_congregacao ON membros (congregacao)',
        'CREATE INDEX idx_membros_status ON membros (status)',
        'CREATE INDEX idx_membros_nome ON membros (nome)',
      ],
    })
    app.save(membros)

    // 2. Congregados (base)
    const congregados = new Collection({
      name: 'congregados',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'telefone', type: 'text' },
        { name: 'data_nascimento', type: 'date' },
        {
          name: 'congregacao',
          type: 'select',
          required: true,
          values: [
            'Sede',
            'Congregação das Casinhas',
            'Congregação do Alto',
            'Congregação da Vila dos Pescadores',
          ],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_congregados_congregacao ON congregados (congregacao)',
        'CREATE INDEX idx_congregados_nome ON congregados (nome)',
      ],
    })
    app.save(congregados)

    // 3. Obreiros (base)
    const obreiros = new Collection({
      name: 'obreiros',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'cargo',
          type: 'select',
          required: true,
          values: ['Pastor Presidente', 'Evangelista', 'Presbítero', 'Diácono', 'Auxiliar'],
          maxSelect: 1,
        },
        {
          name: 'foto',
          type: 'file',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        },
        { name: 'telefone', type: 'text' },
        {
          name: 'congregacao',
          type: 'select',
          required: true,
          values: [
            'Sede',
            'Congregação das Casinhas',
            'Congregação do Alto',
            'Congregação da Vila dos Pescadores',
          ],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Ativo', 'Inativo'],
          maxSelect: 1,
        },
        { name: 'ordem', type: 'number' },
        { name: 'mensagem_pastoral', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_obreiros_cargo ON obreiros (cargo)',
        'CREATE INDEX idx_obreiros_ordem ON obreiros (ordem)',
        'CREATE INDEX idx_obreiros_status ON obreiros (status)',
      ],
    })
    app.save(obreiros)

    // 4. Dizimistas (base) - Somente autenticado admin
    const dizimistas = new Collection({
      name: 'dizimistas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'mes_referencia', type: 'date', required: true },
        {
          name: 'congregacao',
          type: 'select',
          required: true,
          values: [
            'Sede',
            'Congregação das Casinhas',
            'Congregação do Alto',
            'Congregação da Vila dos Pescadores',
          ],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_dizimistas_mes ON dizimistas (mes_referencia)',
        'CREATE INDEX idx_dizimistas_congregacao ON dizimistas (congregacao)',
        'CREATE INDEX idx_dizimistas_nome ON dizimistas (nome)',
      ],
    })
    app.save(dizimistas)

    // 5. Patrimonio (base) - Somente admin
    const patrimonio = new Collection({
      name: 'patrimonio',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['Templo', 'Casa Pastoral', 'Bem Inventariado'],
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'endereco', type: 'text' },
        { name: 'descricao', type: 'text' },
        { name: 'quantidade', type: 'number' },
        { name: 'detalhes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_patrimonio_tipo ON patrimonio (tipo)'],
    })
    app.save(patrimonio)

    // 6. Escala (base) - Leitura pública, escrita admin
    const escala = new Collection({
      name: 'escala',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'data', type: 'date', required: true },
        { name: 'culto_horario', type: 'text' },
        {
          name: 'local',
          type: 'select',
          required: true,
          values: [
            'Sede',
            'Congregação das Casinhas',
            'Congregação do Alto',
            'Congregação da Vila dos Pescadores',
          ],
          maxSelect: 1,
        },
        { name: 'dirigente', type: 'text' },
        { name: 'pregador', type: 'text' },
        { name: 'portaria_recepcao', type: 'text' },
        { name: 'som_midia', type: 'text' },
        { name: 'louvor', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_escala_data ON escala (data)',
        'CREATE INDEX idx_escala_local ON escala (local)',
      ],
    })
    app.save(escala)

    // 7. Calendario (base) - Leitura pública, escrita admin
    const calendario = new Collection({
      name: 'calendario',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'data_inicio', type: 'date', required: true },
        { name: 'data_termino', type: 'date' },
        { name: 'departamento', type: 'text' },
        { name: 'descricao', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_calendario_inicio ON calendario (data_inicio)'],
    })
    app.save(calendario)

    // 8. Agenda Semanal (base) - Leitura pública, escrita admin
    const agendaSemanal = new Collection({
      name: 'agenda_semanal',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'unidade',
          type: 'select',
          required: true,
          values: [
            'Sede',
            'Congregação das Casinhas',
            'Congregação do Alto',
            'Congregação da Vila dos Pescadores',
          ],
          maxSelect: 1,
        },
        {
          name: 'dia_semana',
          type: 'select',
          required: true,
          values: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
          maxSelect: 1,
        },
        { name: 'horario', type: 'text' },
        { name: 'evento', type: 'text', required: true },
        { name: 'observacao', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_agenda_unidade ON agenda_semanal (unidade)',
        'CREATE INDEX idx_agenda_dia ON agenda_semanal (dia_semana)',
      ],
    })
    app.save(agendaSemanal)

    // 9. Configuracoes (base) - Leitura pública (para chave PIX), escrita admin
    const configuracoes = new Collection({
      name: 'configuracoes',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'chave', type: 'text', required: true },
        { name: 'valor', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_configuracoes_chave ON configuracoes (chave)'],
    })
    app.save(configuracoes)
  },
  (app) => {
    const collections = [
      'configuracoes',
      'agenda_semanal',
      'calendario',
      'escala',
      'patrimonio',
      'dizimistas',
      'obreiros',
      'congregados',
      'membros',
    ]
    for (const name of collections) {
      try {
        const c = app.findCollectionByNameOrId(name)
        app.delete(c)
      } catch (_) {}
    }
  },
)
