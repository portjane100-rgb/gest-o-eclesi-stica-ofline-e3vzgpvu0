migrate(
  (app) => {
    // 1. Ampliar schema da collection 'membros' com novos campos de ficha cadastral
    const colMembros = app.findCollectionByNameOrId('membros')

    const novosCampos = [
      { name: 'numero_ficha', type: 'text' },
      { name: 'filiacao', type: 'text' },
      { name: 'naturalidade', type: 'text' },
      { name: 'estado_civil', type: 'text' },
      { name: 'rg', type: 'text' },
      { name: 'cpf', type: 'text' },
      { name: 'endereco', type: 'text' },
      { name: 'observacao', type: 'text' },
      { name: 'data_nascimento_texto', type: 'text' },
      { name: 'data_conversao_texto', type: 'text' },
      { name: 'data_batismo_texto', type: 'text' },
    ]

    for (const f of novosCampos) {
      if (!colMembros.fields.getByName(f.name)) {
        colMembros.fields.add(new TextField({ name: f.name }))
      }
    }

    app.save(colMembros)

    // 2. Limpar os registros fictícios de seed inicial de membros (ADTC-001 a ADTC-005)
    // Deletar com segurança pelo número de registro ou nome dos seeds originais
    const seedRegistros = ['ADTC-001', 'ADTC-002', 'ADTC-003', 'ADTC-004', 'ADTC-005']
    for (const reg of seedRegistros) {
      try {
        const r = app.findFirstRecordByData('membros', 'numero_registro', reg)
        app.delete(r)
      } catch (_) {}
    }

    // 3. Limpar obreiros fictícios do seed original, PRESERVANDO o Pastor Presidente real
    // Pastor real: "Pr José Francisco Portela Fontenele"
    // Seeds fictícios: "Ev. Antônio Marcos Silva", "Ev. Raimundo Nonato Ferreira", "Pb. José Ribamar de Sousa",
    // "Pb. Manoel Messias Carneiro", "Pb. Sebastião Rodrigues Filho", "Dc. Francisco Gilberto Lima",
    // "Dc. João Batista Araújo", "Dc. Carlos Eduardo Parente", "Aux. Vicente de Paula Castro",
    // "Aux. Paulo Roberto Vieira", "Aux. Cláudio Henrique Gomes", "Aux. Natanael Silveira Melo",
    // e qualquer outro "Pr. Francisco Oliveira Fontenele"
    const seedObreiros = [
      'Pr. Francisco Oliveira Fontenele',
      'Ev. Antônio Marcos Silva',
      'Ev. Raimundo Nonato Ferreira',
      'Pb. José Ribamar de Sousa',
      'Pb. Manoel Messias Carneiro',
      'Pb. Sebastião Rodrigues Filho',
      'Dc. Francisco Gilberto Lima',
      'Dc. João Batista Araújo',
      'Dc. Carlos Eduardo Parente',
      'Aux. Vicente de Paula Castro',
      'Aux. Paulo Roberto Vieira',
      'Aux. Cláudio Henrique Gomes',
      'Aux. Natanael Silveira Melo',
    ]

    for (const obNome of seedObreiros) {
      try {
        const r = app.findFirstRecordByData('obreiros', 'nome', obNome)
        app.delete(r)
      } catch (_) {}
    }

    // Garantir que o Pastor Presidente esteja cadastrado e ativo
    try {
      app.findFirstRecordByData('obreiros', 'nome', 'Pr José Francisco Portela Fontenele')
    } catch (_) {
      const colObreiros = app.findCollectionByNameOrId('obreiros')
      const pr = new Record(colObreiros)
      pr.set('nome', 'Pr José Francisco Portela Fontenele')
      pr.set('cargo', 'Pastor Presidente')
      pr.set('congregacao', 'Sede')
      pr.set('status', 'Ativo')
      pr.set('ordem', 1)
      pr.set('telefone', '(88) 981138642')
      pr.set(
        'mensagem_pastoral',
        'A graça e a paz de nosso Senhor Jesus Cristo estejam com todo o amado rebanho do Senhor. É uma honra servir a Deus nesta terra de Campanário. O nosso compromisso inegociável é pregar a genuína Palavra…',
      )
      app.save(pr)
    }

    // 4. Inserir dados reais de membros (Remessa nº 116–181) de forma idempotente
    const membrosParaInserir = [
      {
        numero_ficha: '116',
        nome: 'Luíza Filomena de Almeida',
        filiacao: 'José Fernandes de Almeida e Maria Zifirina de Almeida',
        data_nascimento_iso: '1936-11-14 00:00:00.000Z',
        data_nascimento_texto: '',
        numero_registro: '198503',
        naturalidade: 'Uruoca–Ce',
        estado_civil: 'Casada',
        rg: '507194-82',
        cpf: '695949103-72',
        data_conversao_iso: '1985-05-15 00:00:00.000Z',
        data_conversao_texto: '',
        data_batismo_iso: '1985-08-11 00:00:00.000Z',
        data_batismo_texto: '',
        endereco: 'Av. Nova/Maria Ripa',
        congregacao: 'Sede',
        status: 'Ativo',
        observacao: '',
      },
      {
        numero_ficha: '117',
        nome: 'Maria Edivonete Alves Feitosa',
        filiacao: 'Antônio Gomes Feitosa e Diva Maria Alves Feitosa',
        data_nascimento_iso: '1983-03-12 00:00:00.000Z',
        data_nascimento_texto: '',
        numero_registro: '',
        naturalidade: 'Uruoca–Ce',
        estado_civil: 'Casada',
        rg: '2000031099816',
        cpf: '022.924.523-40',
        data_conversao_iso: '2006-01-26 00:00:00.000Z',
        data_conversao_texto: '',
        data_batismo_iso: '2006-01-28 00:00:00.000Z',
        data_batismo_texto: '',
        endereco: 'Av. Nova/Maria Ripa',
        congregacao: 'Sede',
        status: 'Ativo',
        observacao: '',
      },
      {
        numero_ficha: '118',
        nome: 'Maria do Carmo Barbosa Gomes',
        filiacao: 'Francisco Rodrigues Gomes e Maria José Barbosa Gomes',
        data_nascimento_iso: '1964-08-12 00:00:00.000Z',
        data_nascimento_texto: '',
        numero_registro: '199604',
        naturalidade: 'Itapajé–Ce',
        estado_civil: 'Casada',
        rg: '98002030978',
        cpf: '977.523.393-34',
        data_conversao_iso: '',
        data_conversao_texto: 'Não lembra',
        data_batismo_iso: '1996-04-22 00:00:00.000Z',
        data_batismo_texto: '',
        endereco: 'Av. Alberto Batista Fontenele',
        congregacao: 'Sede',
        status: 'Ativo',
        observacao: '',
      },
      {
        numero_ficha: '119',
        nome: 'Lucinete Pereira de Matos',
        filiacao: 'José Pereira de Matos e Francisca das Chagas de Matos',
        data_nascimento_iso: '1969-12-13 00:00:00.000Z',
        data_nascimento_texto: '',
        numero_registro: '200718',
        naturalidade: 'Uruoca–Ce',
        estado_civil: 'Casada',
        rg: '2004005019943',
        cpf: '002.484.573-05',
        data_conversao_iso: '1983-05-18 00:00:00.000Z',
        data_conversao_texto: '',
        data_batismo_iso: '2007-06-23 00:00:00.000Z',
        data_batismo_texto: '',
        endereco: 'Rua Raimundo Fontenele Rocha',
        congregacao: 'Sede',
        status: 'Ativo',
        observacao: '',
      },
    ]

    for (const m of membrosParaInserir) {
      let record
      let exists = false

      // Verificar idempotência por numero_ficha ou nome
      try {
        record = app.findFirstRecordByData('membros', 'numero_ficha', m.numero_ficha)
        exists = true
      } catch (_) {
        try {
          record = app.findFirstRecordByData('membros', 'nome', m.nome)
          exists = true
        } catch (_) {
          record = new Record(colMembros)
        }
      }

      record.set('nome', m.nome)
      record.set('numero_ficha', m.numero_ficha)
      record.set('filiacao', m.filiacao)
      record.set('numero_registro', m.numero_registro)
      record.set('naturalidade', m.naturalidade)
      record.set('estado_civil', m.estado_civil)
      record.set('rg', m.rg)
      record.set('cpf', m.cpf)
      record.set('endereco', m.endereco)
      record.set('congregacao', m.congregacao)
      record.set('status', m.status)
      record.set('observacao', m.observacao)

      if (m.data_nascimento_iso) {
        record.set('data_nascimento', m.data_nascimento_iso)
      }
      record.set('data_nascimento_texto', m.data_nascimento_texto)

      if (m.data_conversao_iso) {
        record.set('data_conversao', m.data_conversao_iso)
      }
      record.set('data_conversao_texto', m.data_conversao_texto)

      if (m.data_batismo_iso) {
        record.set('data_batismo', m.data_batismo_iso)
      }
      record.set('data_batismo_texto', m.data_batismo_texto)

      app.save(record)
    }
  },
  (app) => {
    // Reverter novos campos de membros se necessário
    try {
      const col = app.findCollectionByNameOrId('membros')
      const campos = [
        'numero_ficha',
        'filiacao',
        'naturalidade',
        'estado_civil',
        'rg',
        'cpf',
        'endereco',
        'observacao',
        'data_nascimento_texto',
        'data_conversao_texto',
        'data_batismo_texto',
      ]
      for (const f of campos) {
        col.fields.removeByName(f)
      }
      app.save(col)
    } catch (_) {}
  },
)
