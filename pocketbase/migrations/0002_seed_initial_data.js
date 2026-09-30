migrate(
  (app) => {
    // 1. Seed Admin user
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'portelajane@outlook.com')
    } catch (_) {
      const admin = new Record(users)
      admin.setEmail('portelajane@outlook.com')
      admin.setPassword('Skip@Pass')
      admin.setVerified(true)
      admin.set('name', 'Administrador ADTC')
      app.save(admin)
    }

    // 1b. Seed service user for public AI agent chat
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'assistente@adtc.local')
    } catch (_) {
      const assistenteUser = new Record(users)
      assistenteUser.setEmail('assistente@adtc.local')
      assistenteUser.setPassword('AdtcPass2025!')
      assistenteUser.setVerified(true)
      assistenteUser.set('name', 'Visitante Assistente')
      app.save(assistenteUser)
    }

    // 2. Seed Configuracoes (Chave PIX)
    const configuracoes = app.findCollectionByNameOrId('configuracoes')
    try {
      app.findFirstRecordByData('configuracoes', 'chave', 'pix_chave_copia_e_cola')
    } catch (_) {
      const pixConf = new Record(configuracoes)
      pixConf.set('chave', 'pix_chave_copia_e_cola')
      pixConf.set('valor', 'adtc.campanario.financeiro@gmail.com')
      app.save(pixConf)
    }

    // 3. Seed Agenda Semanal (Liturgia COMPLETA)
    const agendaCol = app.findCollectionByNameOrId('agenda_semanal')
    const countAgenda = app.countRecords('agenda_semanal')
    if (countAgenda === 0) {
      const agendaData = [
        // SEDE (Rua Alberto Batista Fontenele, 141)
        {
          unidade: 'Sede',
          dia_semana: 'Segunda',
          horario: '07:30',
          evento: 'Consagração de Senhoras (Oração)',
          observacao: 'Oração matinal no templo sede',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Segunda',
          horario: '18:00',
          evento: 'Ensaio das Crianças',
          observacao: 'Departamento Infantil',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Segunda',
          horario: '19:00',
          evento: 'Ensaio dos Adolescentes',
          observacao: 'União de Adolescentes',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Terça',
          horario: '19:00',
          evento: 'Ensaio do Coral',
          observacao: 'Exceto na 3ª terça-feira do mês',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Terça',
          horario: '19:00',
          evento: 'Culto de Senhoras',
          observacao: 'Exclusivo na 3ª terça-feira do mês',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Quarta',
          horario: '15:00',
          evento: 'Tarde de Louvor',
          observacao: 'Momento de intercessão e louvor',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Quarta',
          horario: '19:00',
          evento: 'Ensaio de Senhoras',
          observacao: 'Círculo de Oração Feminino',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Quinta',
          horario: '19:00',
          evento: 'Culto de Doutrina',
          observacao: 'Estudo bíblico e ensinamento ministerial',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Sexta',
          horario: '15:00',
          evento: 'Círculo de Oração',
          observacao: 'Campanha de oração e clamor',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Sexta',
          horario: '19:00',
          evento: 'Ensaio da Banda',
          observacao: 'Ministério de Louvor da Sede',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Sábado',
          horario: '09:00',
          evento: 'Aula de Música',
          observacao: 'Formação de músicos e levitas',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Sábado',
          horario: '15:00',
          evento: 'Ensaio da Mocidade',
          observacao: 'Jovens e adolescentes',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Sábado',
          horario: '19:00',
          evento: 'Culto de Crianças',
          observacao: '1º Sábado do mês',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Sábado',
          horario: '19:00',
          evento: 'Culto de Santa Ceia',
          observacao: '2º Sábado do mês',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Sábado',
          horario: '19:00',
          evento: 'Sábado Livre',
          observacao: '3º Sábado do mês (sem culto oficial na Sede)',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Sábado',
          horario: '19:00',
          evento: 'Culto de Mocidade',
          observacao: '4º Sábado do mês',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Domingo',
          horario: '09:00',
          evento: 'Escola Bíblica Dominical (EBD)',
          observacao: 'Todas as classes e faixas etárias',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Domingo',
          horario: '19:00',
          evento: 'Culto de Missões',
          observacao: '1º Domingo do mês',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Domingo',
          horario: '19:00',
          evento: 'Culto Evangelístico',
          observacao: '2º Domingo do mês',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Domingo',
          horario: '19:00',
          evento: 'Culto da Família',
          observacao: '3º Domingo do mês',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Domingo',
          horario: '19:00',
          evento: 'Culto Evangelístico',
          observacao: '4º Domingo do mês',
        },
        {
          unidade: 'Sede',
          dia_semana: 'Domingo',
          horario: '19:00',
          evento: 'Culto Evangelístico',
          observacao: '5º Domingo do mês (se houver)',
        },

        // CASINHAS
        {
          unidade: 'Congregação das Casinhas',
          dia_semana: 'Segunda',
          horario: '19:00–20:00',
          evento: 'Culto de Oração',
          observacao: 'Clamor e busca congregacional',
        },
        {
          unidade: 'Congregação das Casinhas',
          dia_semana: 'Quarta',
          horario: '19:00',
          evento: 'Culto de Pregação',
          observacao: 'Culto regular (1ª e 4ª quartas)',
        },
        {
          unidade: 'Congregação das Casinhas',
          dia_semana: 'Quarta',
          horario: '19:00',
          evento: 'Culto de Santa Ceia',
          observacao: '2ª quarta-feira do mês',
        },
        {
          unidade: 'Congregação das Casinhas',
          dia_semana: 'Quarta',
          horario: '19:00',
          evento: 'Culto de Senhoras',
          observacao: '3ª quarta-feira do mês',
        },
        {
          unidade: 'Congregação das Casinhas',
          dia_semana: 'Sexta',
          horario: '19:00',
          evento: 'Culto Campal',
          observacao: 'Evangelismo ao ar livre',
        },
        {
          unidade: 'Congregação das Casinhas',
          dia_semana: 'Sexta',
          horario: '19:00',
          evento: 'Culto de Jovens',
          observacao: '3ª sexta-feira do mês',
        },
        {
          unidade: 'Congregação das Casinhas',
          dia_semana: 'Domingo',
          horario: '09:00',
          evento: 'Escola Bíblica Dominical (EBD)',
          observacao: 'Manhã de ensinamento',
        },
        {
          unidade: 'Congregação das Casinhas',
          dia_semana: 'Domingo',
          horario: '19:00',
          evento: 'Culto de Pregação',
          observacao: 'Culto solene dominical',
        },

        // ALTO
        {
          unidade: 'Congregação do Alto',
          dia_semana: 'Sexta',
          horario: '19:00',
          evento: 'Culto de Santa Ceia',
          observacao: '1ª sexta-feira do mês',
        },
        {
          unidade: 'Congregação do Alto',
          dia_semana: 'Sexta',
          horario: '19:00',
          evento: 'Culto de Mocidade',
          observacao: '4ª sexta-feira do mês',
        },
        {
          unidade: 'Congregação do Alto',
          dia_semana: 'Sexta',
          horario: '19:00',
          evento: 'Culto de Doutrina',
          observacao: 'Demais sextas-feiras do mês',
        },
        {
          unidade: 'Congregação do Alto',
          dia_semana: 'Domingo',
          horario: '09:00',
          evento: 'Escola Bíblica Dominical (EBD)',
          observacao: 'Estudo da Palavra',
        },
        {
          unidade: 'Congregação do Alto',
          dia_semana: 'Domingo',
          horario: '19:00',
          evento: 'Culto Evangelístico',
          observacao: 'Celebração evangelística de domingo',
        },

        // VILA DOS PESCADORES
        {
          unidade: 'Congregação da Vila dos Pescadores',
          dia_semana: 'Segunda',
          horario: '19:00',
          evento: 'Culto Evangelístico',
          observacao: 'Proclamação da Palavra e salvação',
        },
        {
          unidade: 'Congregação da Vila dos Pescadores',
          dia_semana: 'Sexta',
          horario: '18:30',
          evento: 'Evangelismo Infantil',
          observacao: 'Trabalho missionário com crianças da comunidade',
        },
      ]

      for (const item of agendaData) {
        const rec = new Record(agendaCol)
        rec.set('unidade', item.unidade)
        rec.set('dia_semana', item.dia_semana)
        rec.set('horario', item.horario)
        rec.set('evento', item.evento)
        rec.set('observacao', item.observacao)
        app.save(rec)
      }
    }

    // 4. Seed Obreiros (hierarquia solene)
    const obreirosCol = app.findCollectionByNameOrId('obreiros')
    if (app.countRecords('obreiros') === 0) {
      const obreirosData = [
        {
          nome: 'Pr. Francisco Oliveira Fontenele',
          cargo: 'Pastor Presidente',
          congregacao: 'Sede',
          status: 'Ativo',
          ordem: 1,
          telefone: '(88) 99876-1234',
          mensagem_pastoral:
            'A graça e a paz de nosso Senhor Jesus Cristo estejam com todo o amado rebanho do Senhor. É uma honra servir a Deus nesta terra de Campanário. O nosso compromisso inegociável é pregar a genuína Palavra de Deus, cuidar com zelo de cada família e avançar no Reino com unção, amor e integridade. Sejam todos muito bem-vindos à ADTC Campanário!',
        },
        {
          nome: 'Ev. Antônio Marcos Silva',
          cargo: 'Evangelista',
          congregacao: 'Congregação das Casinhas',
          status: 'Ativo',
          ordem: 1,
          telefone: '(88) 99812-4567',
        },
        {
          nome: 'Ev. Raimundo Nonato Ferreira',
          cargo: 'Evangelista',
          congregacao: 'Congregação do Alto',
          status: 'Ativo',
          ordem: 2,
          telefone: '(88) 99765-8899',
        },
        {
          nome: 'Pb. José Ribamar de Sousa',
          cargo: 'Presbítero',
          congregacao: 'Sede',
          status: 'Ativo',
          ordem: 1,
          telefone: '(88) 99632-1122',
        },
        {
          nome: 'Pb. Manoel Messias Carneiro',
          cargo: 'Presbítero',
          congregacao: 'Congregação da Vila dos Pescadores',
          status: 'Ativo',
          ordem: 2,
          telefone: '(88) 99901-4455',
        },
        {
          nome: 'Pb. Sebastião Rodrigues Filho',
          cargo: 'Presbítero',
          congregacao: 'Congregação das Casinhas',
          status: 'Ativo',
          ordem: 3,
          telefone: '(88) 99678-3344',
        },
        {
          nome: 'Dc. Francisco Gilberto Lima',
          cargo: 'Diácono',
          congregacao: 'Sede',
          status: 'Ativo',
          ordem: 1,
          telefone: '(88) 99777-6655',
        },
        {
          nome: 'Dc. João Batista Araújo',
          cargo: 'Diácono',
          congregacao: 'Congregação do Alto',
          status: 'Ativo',
          ordem: 2,
          telefone: '(88) 99888-2233',
        },
        {
          nome: 'Dc. Carlos Eduardo Parente',
          cargo: 'Diácono',
          congregacao: 'Congregação da Vila dos Pescadores',
          status: 'Ativo',
          ordem: 3,
          telefone: '(88) 99933-7711',
        },
        {
          nome: 'Aux. Vicente de Paula Castro',
          cargo: 'Auxiliar',
          congregacao: 'Sede',
          status: 'Ativo',
          ordem: 1,
          telefone: '(88) 99711-2244',
        },
        {
          nome: 'Aux. Paulo Roberto Vieira',
          cargo: 'Auxiliar',
          congregacao: 'Congregação das Casinhas',
          status: 'Ativo',
          ordem: 2,
          telefone: '(88) 99822-3355',
        },
        {
          nome: 'Aux. Cláudio Henrique Gomes',
          cargo: 'Auxiliar',
          congregacao: 'Congregação do Alto',
          status: 'Ativo',
          ordem: 3,
          telefone: '(88) 99655-4466',
        },
        {
          nome: 'Aux. Natanael Silveira Melo',
          cargo: 'Auxiliar',
          congregacao: 'Congregação da Vila dos Pescadores',
          status: 'Ativo',
          ordem: 4,
          telefone: '(88) 99744-8899',
        },
      ]

      for (const ob of obreirosData) {
        const rec = new Record(obreirosCol)
        rec.set('nome', ob.nome)
        rec.set('cargo', ob.cargo)
        rec.set('congregacao', ob.congregacao)
        rec.set('status', ob.status)
        rec.set('ordem', ob.ordem)
        rec.set('telefone', ob.telefone)
        if (ob.mensagem_pastoral) {
          rec.set('mensagem_pastoral', ob.mensagem_pastoral)
        }
        app.save(rec)
      }
    }

    // 5. Seed Membros (amostras com número de registro sequencial)
    const membrosCol = app.findCollectionByNameOrId('membros')
    if (app.countRecords('membros') === 0) {
      const membrosData = [
        {
          nome: 'Maria das Graças Silva Fontenele',
          data_nascimento: '1978-05-14 00:00:00.000Z',
          telefone: '(88) 99712-3456',
          data_conversao: '1996-03-10 00:00:00.000Z',
          data_batismo: '1996-12-15 00:00:00.000Z',
          congregacao: 'Sede',
          status: 'Ativo',
          numero_registro: 'ADTC-001',
        },
        {
          nome: 'José Wilson de Albuquerque',
          data_nascimento: '1985-08-22 00:00:00.000Z',
          telefone: '(88) 99834-5678',
          data_conversao: '2005-07-18 00:00:00.000Z',
          data_batismo: '2006-01-20 00:00:00.000Z',
          congregacao: 'Sede',
          status: 'Ativo',
          numero_registro: 'ADTC-002',
        },
        {
          nome: 'Ana Lúcia Barbosa Carneiro',
          data_nascimento: '1992-11-03 00:00:00.000Z',
          telefone: '(88) 99655-1290',
          data_conversao: '2010-09-05 00:00:00.000Z',
          data_batismo: '2011-04-12 00:00:00.000Z',
          congregacao: 'Congregação das Casinhas',
          status: 'Ativo',
          numero_registro: 'ADTC-003',
        },
        {
          nome: 'Carlos Eduardo Fontenele Lima',
          data_nascimento: '1980-02-19 00:00:00.000Z',
          telefone: '(88) 99744-8812',
          data_conversao: '2001-04-15 00:00:00.000Z',
          data_batismo: '2001-11-20 00:00:00.000Z',
          congregacao: 'Congregação do Alto',
          status: 'Ativo',
          numero_registro: 'ADTC-004',
        },
        {
          nome: 'Luzia Rodrigues dos Santos',
          data_nascimento: '1975-09-30 00:00:00.000Z',
          telefone: '(88) 99922-4411',
          data_conversao: '1998-06-25 00:00:00.000Z',
          data_batismo: '1998-12-10 00:00:00.000Z',
          congregacao: 'Congregação da Vila dos Pescadores',
          status: 'Ativo',
          numero_registro: 'ADTC-005',
        },
      ]

      for (const m of membrosData) {
        const rec = new Record(membrosCol)
        rec.set('nome', m.nome)
        rec.set('data_nascimento', m.data_nascimento)
        rec.set('telefone', m.telefone)
        rec.set('data_conversao', m.data_conversao)
        rec.set('data_batismo', m.data_batismo)
        rec.set('congregacao', m.congregacao)
        rec.set('status', m.status)
        rec.set('numero_registro', m.numero_registro)
        app.save(rec)
      }
    }

    // 6. Seed Congregados (amostras)
    const congregadosCol = app.findCollectionByNameOrId('congregados')
    if (app.countRecords('congregados') === 0) {
      const congData = [
        {
          nome: 'Marcos Vinícius de Castro',
          telefone: '(88) 99811-0022',
          data_nascimento: '2000-01-15 00:00:00.000Z',
          congregacao: 'Sede',
        },
        {
          nome: 'Francisca Marlene de Sousa',
          telefone: '(88) 99722-1133',
          data_nascimento: '1983-04-19 00:00:00.000Z',
          congregacao: 'Sede',
        },
        {
          nome: 'Lucas Gabriel Ferreira',
          telefone: '(88) 99633-2244',
          data_nascimento: '2004-07-28 00:00:00.000Z',
          congregacao: 'Congregação das Casinhas',
        },
        {
          nome: 'Teresa Cristina de Lima',
          telefone: '(88) 99944-3355',
          data_nascimento: '1990-10-12 00:00:00.000Z',
          congregacao: 'Congregação do Alto',
        },
        {
          nome: 'Edilson Manoel Pescador',
          telefone: '(88) 99855-4466',
          data_nascimento: '1972-12-05 00:00:00.000Z',
          congregacao: 'Congregação da Vila dos Pescadores',
        },
      ]

      for (const c of congData) {
        const rec = new Record(congregadosCol)
        rec.set('nome', c.nome)
        rec.set('telefone', c.telefone)
        rec.set('data_nascimento', c.data_nascimento)
        rec.set('congregacao', c.congregacao)
        app.save(rec)
      }
    }

    // 7. Seed Dizimistas (sem nenhum valor monetário)
    const dizimistasCol = app.findCollectionByNameOrId('dizimistas')
    if (app.countRecords('dizimistas') === 0) {
      const dData = [
        {
          nome: 'Maria das Graças Silva Fontenele',
          mes_referencia: '2025-05-01 00:00:00.000Z',
          congregacao: 'Sede',
        },
        {
          nome: 'José Wilson de Albuquerque',
          mes_referencia: '2025-05-01 00:00:00.000Z',
          congregacao: 'Sede',
        },
        {
          nome: 'Ana Lúcia Barbosa Carneiro',
          mes_referencia: '2025-05-01 00:00:00.000Z',
          congregacao: 'Congregação das Casinhas',
        },
        {
          nome: 'Carlos Eduardo Fontenele Lima',
          mes_referencia: '2025-05-01 00:00:00.000Z',
          congregacao: 'Congregação do Alto',
        },
      ]
      for (const d of dData) {
        const rec = new Record(dizimistasCol)
        rec.set('nome', d.nome)
        rec.set('mes_referencia', d.mes_referencia)
        rec.set('congregacao', d.congregacao)
        app.save(rec)
      }
    }

    // 8. Seed Patrimonio (Templos, Casa Pastoral e Bens)
    const patCol = app.findCollectionByNameOrId('patrimonio')
    if (app.countRecords('patrimonio') === 0) {
      const pData = [
        {
          tipo: 'Templo',
          nome: 'Templo Sede ADTC Campanário',
          endereco: 'Rua Alberto Batista Fontenele, nº 141, Campanário',
          quantidade: 1,
          descricao:
            'Templo sede com nave principal, galeria, púlpito em madeira de lei e baptistério.',
          detalhes: 'Capacidade para 350 pessoas sentadas. Prédio próprio regularizado.',
        },
        {
          tipo: 'Templo',
          nome: 'Congregação das Casinhas',
          endereco: 'Bairro Novo Campanário (Casinhas)',
          quantidade: 1,
          descricao: 'Salão de cultos com nave, banheiros e sala para Escola Bíblica Dominical.',
          detalhes: 'Capacidade para 120 pessoas sentadas.',
        },
        {
          tipo: 'Templo',
          nome: 'Congregação do Alto',
          endereco: 'Bairro do Alto, Campanário',
          quantidade: 1,
          descricao: 'Templo filial com nave e sala infantil.',
          detalhes: 'Capacidade para 100 pessoas sentadas.',
        },
        {
          tipo: 'Templo',
          nome: 'Congregação da Vila dos Pescadores',
          endereco: 'Vila dos Pescadores, Campanário',
          quantidade: 1,
          descricao: 'Ponto de pregação e templo comunitário.',
          detalhes: 'Capacidade para 80 pessoas sentadas.',
        },
        {
          tipo: 'Casa Pastoral',
          nome: 'Casa Pastoral Sede',
          endereco: 'Rua Alberto Batista Fontenele, nº 145 (anexo à Sede)',
          quantidade: 1,
          descricao:
            'Residência pastoral com 3 quartos, sala de estar, cozinha, escritório e garagem.',
          detalhes:
            'Imóvel de alvenaria em excelente estado de conservação, pertencente ao patrimônio da igreja.',
        },
        {
          tipo: 'Bem Inventariado',
          nome: 'Mesa de Som Digital Yamaha TF1',
          endereco: 'Sede - Cabine de Áudio',
          quantidade: 1,
          descricao: 'Mesa digital 16 canais com expansão USB para gravação e transmissão.',
          detalhes: 'Número de tombamento PAT-2024-001. Em perfeito estado operacional.',
        },
        {
          tipo: 'Bem Inventariado',
          nome: 'Projetor Multimídia Epson Full HD 4000 Lumens',
          endereco: 'Sede - Nave Principal',
          quantidade: 1,
          descricao: 'Projetor fixado no teto para exibição de hinos e mensagens.',
          detalhes: 'Tombamento PAT-2024-002.',
        },
        {
          tipo: 'Bem Inventariado',
          nome: 'Bateria Acústica Odery Fluence',
          endereco: 'Sede - Púlpito',
          quantidade: 1,
          descricao: 'Instrumento musical de percussão completo com pratos B20.',
          detalhes: 'Tombamento PAT-2023-015.',
        },
      ]
      for (const p of pData) {
        const rec = new Record(patCol)
        rec.set('tipo', p.tipo)
        rec.set('nome', p.nome)
        rec.set('endereco', p.endereco)
        rec.set('descricao', p.descricao)
        rec.set('quantidade', p.quantidade)
        rec.set('detalhes', p.detalhes)
        app.save(rec)
      }
    }

    // 9. Seed Escala de Trabalho
    const escalaCol = app.findCollectionByNameOrId('escala')
    if (app.countRecords('escala') === 0) {
      const eData = [
        {
          data: '2025-05-18 19:00:00.000Z',
          culto_horario: 'Culto Solene de Domingo - 19h00',
          local: 'Sede',
          dirigente: 'Pb. José Ribamar de Sousa',
          pregador: 'Pr. Francisco Oliveira Fontenele',
          portaria_recepcao: 'Dc. Francisco Gilberto Lima e Irmã Maria',
          som_midia: 'Irmão Natanael Melo',
          louvor: 'Banda Voz de Adoração e Ministério Local',
        },
        {
          data: '2025-05-21 19:00:00.000Z',
          culto_horario: 'Culto de Pregação - 19h00',
          local: 'Congregação das Casinhas',
          dirigente: 'Ev. Antônio Marcos Silva',
          pregador: 'Pb. Sebastião Rodrigues Filho',
          portaria_recepcao: 'Aux. Paulo Roberto',
          som_midia: 'Equipe de Som Casinhas',
          louvor: 'Círculo de Oração Monte Sinai',
        },
        {
          data: '2025-05-23 19:00:00.000Z',
          culto_horario: 'Culto de Doutrina - 19h00',
          local: 'Congregação do Alto',
          dirigente: 'Ev. Raimundo Nonato Ferreira',
          pregador: 'Ev. Raimundo Nonato Ferreira',
          portaria_recepcao: 'Dc. João Batista Araújo',
          som_midia: 'Irmão Carlos',
          louvor: 'Conjunto Peniel',
        },
        {
          data: '2025-05-25 19:00:00.000Z',
          culto_horario: 'Culto Evangelístico - 19h00',
          local: 'Congregação da Vila dos Pescadores',
          dirigente: 'Pb. Manoel Messias Carneiro',
          pregador: 'Aux. Natanael Silveira Melo',
          portaria_recepcao: 'Dc. Carlos Eduardo Parente',
          som_midia: 'Equipe Local',
          louvor: 'Grupo de Louvor Chama Viva',
        },
      ]
      for (const item of eData) {
        const rec = new Record(escalaCol)
        rec.set('data', item.data)
        rec.set('culto_horario', item.culto_horario)
        rec.set('local', item.local)
        rec.set('dirigente', item.dirigente)
        rec.set('pregador', item.pregador)
        rec.set('portaria_recepcao', item.portaria_recepcao)
        rec.set('som_midia', item.som_midia)
        rec.set('louvor', item.louvor)
        app.save(rec)
      }
    }

    // 10. Seed Calendário de Festas
    const calCol = app.findCollectionByNameOrId('calendario')
    if (app.countRecords('calendario') === 0) {
      const cData = [
        {
          titulo: 'Grande Congresso de Jovens (UMADTC)',
          data_inicio: '2025-07-18 19:00:00.000Z',
          data_termino: '2025-07-20 21:30:00.000Z',
          departamento: 'Mocidade',
          descricao:
            'Três dias de despertamento espiritual, louvor e pregação da Palavra com jovens da Sede e de todas as congregações.',
        },
        {
          titulo: 'Aniversário do Círculo de Oração da Sede',
          data_inicio: '2025-08-15 15:00:00.000Z',
          data_termino: '2025-08-17 21:00:00.000Z',
          departamento: 'Senhoras',
          descricao:
            'Celebração em gratidão a Deus pelas vitórias e intercessões do Círculo de Oração Feminino.',
        },
        {
          titulo: 'Festa das Crianças - Departamento Infantil',
          data_inicio: '2025-10-11 16:00:00.000Z',
          data_termino: '2025-10-12 20:30:00.000Z',
          departamento: 'Infantil',
          descricao:
            'Apresentações bíblicas, teatro, distribuição de brindes e louvor com todas as crianças de Campanário.',
        },
        {
          titulo: 'Cruzada Evangelística na Vila dos Pescadores',
          data_inicio: '2025-09-06 18:30:00.000Z',
          data_termino: '2025-09-06 22:00:00.000Z',
          departamento: 'Missões & Evangelismo',
          descricao:
            'Grande culto ao ar livre em prol da salvação de almas e reconciliação com Cristo na comunidade costeira.',
        },
      ]
      for (const item of cData) {
        const rec = new Record(calCol)
        rec.set('titulo', item.titulo)
        rec.set('data_inicio', item.data_inicio)
        rec.set('data_termino', item.data_termino)
        rec.set('departamento', item.departamento)
        rec.set('descricao', item.descricao)
        app.save(rec)
      }
    }
  },
  (app) => {
    // down migration
  },
)
