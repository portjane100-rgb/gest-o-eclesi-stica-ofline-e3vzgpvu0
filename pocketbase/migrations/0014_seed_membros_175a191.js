migrate(
  (app) => {
    const colMembros = app.findCollectionByNameOrId('membros')

    // Lote de fichas 175 a 191 (17 registros)
    const membrosNovos = [
      // MEMBRO Nº 175
      {
        numero_ficha: '175',
        nome: 'Víctor Hugo Alves dos Santos',
        filiacao: 'Dione Eugênio Alves e Ana Cláudia dos Santos Santiago',
        data_nascimento_iso: '2010-02-03 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: 'Sobral – CE',
        estado_civil: 'Solteiro',
        rg: '2019089404 - 5',
        cpf: '157.757.506-75',
        data_conversao_iso: '2025-08-25 00:00:00.000Z',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 176
      {
        numero_ficha: '176',
        nome: 'Benaia Costa de Matos',
        filiacao: 'Benedito Pereira de Matos e Francisca Valécia Cardoso Costa de Matos',
        data_nascimento_iso: '2013-06-23 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: 'Sobral – CE',
        estado_civil: 'Solteira',
        rg: '',
        cpf: '129.318.253-28',
        data_conversao_iso: '2022-12-25 00:00:00.000Z',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 177
      {
        numero_ficha: '177',
        nome: 'Thalyta Félix Sampaio Barbosa',
        filiacao: 'Robson Barbosa Gomes e Hyrlana Félix Sampaio',
        data_nascimento_iso: '2013-07-28 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: 'Sobral – CE',
        estado_civil: 'Solteira',
        rg: '',
        cpf: '099.927.923-88',
        data_conversao_iso: '',
        data_conversao_texto: '00/05/2019',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 178
      {
        numero_ficha: '178',
        nome: 'Millena Pereira Sampaio',
        filiacao: 'Marcondio Eugênio Sampaio e Antônia Pereira de Matos',
        data_nascimento_iso: '2014-02-17 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: 'Sobral – CE',
        estado_civil: 'Solteira',
        rg: '3813868-9',
        cpf: '086.108.982-02',
        data_conversao_iso: '',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 179
      {
        numero_ficha: '179',
        nome: 'Evilázio Vasconcelos Bessa Teles',
        filiacao: 'José Ladislau Bessa e Ires Vasconcelos Bessa',
        data_nascimento_iso: '1974-06-15 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: 'Fortaleza – CE',
        estado_civil: 'Casado',
        rg: '',
        cpf: '430.061.673-68',
        data_conversao_iso: '',
        data_conversao_texto: '00/05/2026',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 180
      {
        numero_ficha: '180',
        nome: 'Beatriz Sampaio de Oliveira',
        filiacao: '',
        data_nascimento_iso: '2002-06-12 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: '',
        estado_civil: '',
        rg: '',
        cpf: '',
        data_conversao_iso: '',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 181
      {
        numero_ficha: '181',
        nome: 'Edivânia Silva Oliveira',
        filiacao: '',
        data_nascimento_iso: '2009-10-10 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: '',
        estado_civil: 'Solteira',
        rg: '',
        cpf: '',
        data_conversao_iso: '',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 182
      {
        numero_ficha: '182',
        nome: 'Ana Mayara Fontenele De Lima',
        filiacao: '',
        data_nascimento_iso: '2014-07-21 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: '',
        estado_civil: 'Solteira',
        rg: '',
        cpf: '',
        data_conversao_iso: '',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 183
      {
        numero_ficha: '183',
        nome: 'Ester Menezes Leopoldo',
        filiacao: '',
        data_nascimento_iso: '2013-09-23 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: '',
        estado_civil: 'Solteira',
        rg: '',
        cpf: '',
        data_conversao_iso: '',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 184
      {
        numero_ficha: '184',
        nome: 'Maria Laura Guilherme Araújo',
        filiacao: '',
        data_nascimento_iso: '2014-01-27 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: '',
        estado_civil: 'Solteira',
        rg: '',
        cpf: '',
        data_conversao_iso: '',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 185
      {
        numero_ficha: '185',
        nome: 'Davi Cardoso do Nascimento',
        filiacao: '',
        data_nascimento_iso: '2013-12-19 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: '',
        estado_civil: 'Solteiro',
        rg: '',
        cpf: '',
        data_conversao_iso: '',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 186
      {
        numero_ficha: '186',
        nome: 'Natanael Cleiton Oliveira Farias',
        filiacao: '',
        data_nascimento_iso: '2014-04-09 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: '',
        estado_civil: 'Solteiro',
        rg: '',
        cpf: '',
        data_conversao_iso: '',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 187
      {
        numero_ficha: '187',
        nome: 'Antônio Cléber Fernandes Gomes',
        filiacao: '',
        data_nascimento_iso: '2006-06-13 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: '',
        estado_civil: 'Solteiro',
        rg: '',
        cpf: '',
        data_conversao_iso: '',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 188
      {
        numero_ficha: '188',
        nome: 'Miqueias Martins De Oliveira',
        filiacao: '',
        data_nascimento_iso: '2011-02-05 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: '',
        estado_civil: 'Solteiro',
        rg: '',
        cpf: '',
        data_conversao_iso: '',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 189
      {
        numero_ficha: '189',
        nome: 'Maria Aura De Almeida',
        filiacao: '',
        data_nascimento_iso: '1974-07-14 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: '',
        estado_civil: 'Solteiro',
        rg: '',
        cpf: '',
        data_conversao_iso: '',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 190
      {
        numero_ficha: '190',
        nome: 'Camila Araújo Portela',
        filiacao: '',
        data_nascimento_iso: '1993-12-12 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: '',
        estado_civil: 'Casada',
        rg: '',
        cpf: '',
        data_conversao_iso: '',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
      // MEMBRO Nº 191
      {
        numero_ficha: '191',
        nome: 'Joel Carvalho de Sousa',
        filiacao: '',
        data_nascimento_iso: '1991-07-29 00:00:00.000Z',
        data_nascimento_texto: '',
        naturalidade: '',
        estado_civil: 'Casado',
        rg: '',
        cpf: '',
        data_conversao_iso: '',
        data_conversao_texto: '',
        data_batismo_iso: '',
        data_batismo_texto: '08/08/2026',
        endereco: 'Campanário',
        observacao: 'Função: Membro',
      },
    ]

    for (const m of membrosNovos) {
      let record
      // Idempotência: checagem prévia por numero_ficha
      try {
        record = app.findFirstRecordByData('membros', 'numero_ficha', m.numero_ficha)
      } catch (_) {
        record = new Record(colMembros)
      }

      record.set('numero_ficha', m.numero_ficha)
      record.set('nome', m.nome)
      record.set('filiacao', m.filiacao)
      record.set('naturalidade', m.naturalidade)
      record.set('estado_civil', m.estado_civil)
      record.set('rg', m.rg)
      record.set('cpf', m.cpf)
      record.set('endereco', m.endereco)
      record.set('observacao', m.observacao)
      record.set('congregacao', 'Sede')
      record.set('status', 'Ativo')

      if (m.data_nascimento_iso) {
        record.set('data_nascimento', m.data_nascimento_iso)
      } else {
        record.set('data_nascimento', null)
      }
      record.set('data_nascimento_texto', m.data_nascimento_texto)

      if (m.data_conversao_iso) {
        record.set('data_conversao', m.data_conversao_iso)
      } else {
        record.set('data_conversao', null)
      }
      record.set('data_conversao_texto', m.data_conversao_texto)

      if (m.data_batismo_iso) {
        record.set('data_batismo', m.data_batismo_iso)
      } else {
        record.set('data_batismo', null)
      }
      record.set('data_batismo_texto', m.data_batismo_texto)

      app.save(record)
    }
  },
  (app) => {
    // Reverter fichas 175 a 191
    for (let f = 175; f <= 191; f++) {
      try {
        const record = app.findFirstRecordByData('membros', 'numero_ficha', String(f))
        app.delete(record)
      } catch (_) {}
    }
  },
)
