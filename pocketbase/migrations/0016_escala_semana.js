migrate(
  (app) => {
    // 1. Criar coleção 'escala_semana' para o formato semanal completo
    // list/view públicos, create/update/delete para autenticados
    let col
    try {
      col = app.findCollectionByNameOrId('escala_semana')
    } catch (_) {}

    if (!col) {
      col = new Collection({
        name: 'escala_semana',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'titulo', type: 'text', required: true },
          { name: 'data_inicio', type: 'date', required: true },
          { name: 'data_fim', type: 'date', required: true },
          { name: 'dias', type: 'json' },
          { name: 'observacoes', type: 'text' },
          { name: 'ativa', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_escala_semana_inicio ON escala_semana (data_inicio)',
          'CREATE INDEX idx_escala_semana_fim ON escala_semana (data_fim)',
        ],
      })
      app.save(col)
    }

    // 2. Seed de exemplo real do usuário:
    // "Escala de trabalho da sede e congregações, de 21/09/2026 a 27/09/2026"
    // Segunda: Consagração de senhoras as 7:30; Ensaio de crianças as 18:00; Ensaio de adolescentes as 19:00; Culto na vila dos pescadores as 19:00 hr; Obreiros escalados: Rodrigo e Manoel.
    // Terça: Ensaio do coral as 19:00 hr.
    // Quarta: Ensaio de senhoras as 19:00hr.
    // Quinta: Culto de doutrina as 19:00hr; salinha: jacinara e Joana; recepção: Francisco mariano.
    // Sexta: Círculo de oração as 15:00 hr; Ensaio da banda as 19:00 hr; Culto de doutrina na congregação do alto as 19:00 hr.
    // Sábado: Aula de musica as 9:00 Hr da manhã; Culto temático as 19:00.
    // Domingo: Escola dominical as 9:00 Da manhã; Culto evangelístico as 19:00; salinhas: jacinara e Joana; recepção: Francisco mariano.
    try {
      const existing = app.findRecordsByFilter('escala_semana', "titulo ~ '21/09/2026'", '', 1, 0)
      if (existing && existing.length > 0) {
        return // Já cadastrado
      }
    } catch (_) {}

    const colEscalaSemana = app.findCollectionByNameOrId('escala_semana')
    const seedRecord = new Record(colEscalaSemana)
    seedRecord.set(
      'titulo',
      'Escala de trabalho da sede e congregações, de 21/09/2026 a 27/09/2026',
    )
    seedRecord.set('data_inicio', '2026-09-21 00:00:00.000Z')
    seedRecord.set('data_fim', '2026-09-27 00:00:00.000Z')
    seedRecord.set('ativa', true)
    seedRecord.set('observacoes', 'Escala oficial da ADTC Campanário (Sede e congregações).')
    seedRecord.set('dias', [
      {
        dia: 'Segunda-feira',
        data: '21/09/2026',
        atividades: [
          'Consagração de senhoras as 7:30',
          'Ensaio de crianças as 18:00',
          'Ensaio de adolescentes as 19:00',
          'Culto na vila dos pescadores as 19:00 hr',
        ],
        obreiros_escalados: 'Rodrigo e Manoel',
        professoras_salinhas: '',
        recepcao: '',
      },
      {
        dia: 'Terça-feira',
        data: '22/09/2026',
        atividades: ['Ensaio do coral as 19:00 hr'],
        obreiros_escalados: '',
        professoras_salinhas: '',
        recepcao: '',
      },
      {
        dia: 'Quarta-feira',
        data: '23/09/2026',
        atividades: ['Ensaio de senhoras as 19:00hr'],
        obreiros_escalados: '',
        professoras_salinhas: '',
        recepcao: '',
      },
      {
        dia: 'Quinta-feira',
        data: '24/09/2026',
        atividades: ['Culto de doutrina as 19:00hr'],
        obreiros_escalados: '',
        professoras_salinhas: 'Jacinara e Joana',
        recepcao: 'Francisco Mariano',
      },
      {
        dia: 'Sexta-feira',
        data: '25/09/2026',
        atividades: [
          'Círculo de oração as 15:00 hr',
          'Ensaio da banda as 19:00 hr',
          'Culto de doutrina na congregação do alto as 19:00 hr',
        ],
        obreiros_escalados: '',
        professoras_salinhas: '',
        recepcao: '',
      },
      {
        dia: 'Sábado',
        data: '26/09/2026',
        atividades: ['Aula de musica as 9:00 Hr da manhã', 'Culto temático as 19:00'],
        obreiros_escalados: '',
        professoras_salinhas: '',
        recepcao: '',
      },
      {
        dia: 'Domingo',
        data: '27/09/2026',
        atividades: ['Escola dominical as 9:00 Da manhã', 'Culto evangelístico as 19:00'],
        obreiros_escalados: '',
        professoras_salinhas: 'Jacinara e Joana',
        recepcao: 'Francisco Mariano',
      },
    ])
    app.save(seedRecord)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('escala_semana')
      app.delete(col)
    } catch (_) {}
  },
)
