/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const colCongregados = app.findCollectionByNameOrId('congregados')

    const normalizar = (s) => {
      if (!s) return ''
      return s
        .toLowerCase()
        .replace(/[áàâãä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòôõö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    // Carregar membros e congregados para idempotência e proteção contra duplicações
    let membrosExistentes = []
    let congregadosExistentes = []
    try {
      membrosExistentes = app.findRecordsByFilter('membros', '', '', 1000, 0) || []
    } catch (_) {}
    try {
      congregadosExistentes = app.findRecordsByFilter('congregados', '', '', 1000, 0) || []
    } catch (_) {}

    const nomesExistentesNorm = []
    for (let i = 0; i < membrosExistentes.length; i++) {
      const n = membrosExistentes[i].get('nome')
      if (n) nomesExistentesNorm.push(normalizar(n))
    }
    for (let i = 0; i < congregadosExistentes.length; i++) {
      const n = congregadosExistentes[i].get('nome')
      if (n) nomesExistentesNorm.push(normalizar(n))
    }

    // 34 novos congregados (28 Sede + 6 Casinhas)
    // Nomes já existentes (Déborah Ramos, Benjamim Pedroza, Benjamim Gael, Heloa Silva Fernandes, Jayrla Alves, Mathias Alves)
    // foram ignorados conforme solicitado.
    const listaNovos = [
      // SEDE
      { nome: 'Marcos Manoel Ponte Freire', congregacao: 'Sede' },
      { nome: 'Joesley Costa Cardozo', congregacao: 'Sede' },
      { nome: 'Maria Kaylane Pessoa Frota', congregacao: 'Sede' },
      { nome: 'Ana Rayssa Almeida de Matos', congregacao: 'Sede' },
      { nome: 'Débora Menezes Leopoldo', congregacao: 'Sede' },
      { nome: 'Sara Freire Carneiro', congregacao: 'Sede' },
      { nome: 'Lília Sophia Ferreira Sabino', congregacao: 'Sede' },
      { nome: 'Lyara Pereira Dourado', congregacao: 'Sede' },
      { nome: 'Liz Matos Ferreira', congregacao: 'Sede' },
      { nome: 'Millena Silva Dourado', congregacao: 'Sede' },
      { nome: 'Isabele Fernandes Frota', congregacao: 'Sede' },
      { nome: 'Ana Maria Nascimento de Vasconcelos', congregacao: 'Sede' },
      { nome: 'João Moreira Cardoso', congregacao: 'Sede' },
      { nome: 'Levi Cardozo de Sousa', congregacao: 'Sede' },
      { nome: 'Enzo Emanuel Cardozo da Silva', congregacao: 'Sede' },
      { nome: 'Miguel Cardozo da Silva', congregacao: 'Sede' },
      { nome: 'Aurora Dias da Silva', congregacao: 'Sede' },
      { nome: 'Davi Moreira Menezes', congregacao: 'Sede' },
      { nome: 'Victoria Ernestina Moreira Menezes', congregacao: 'Sede' },
      { nome: 'Anna Kevellyn Costa dos Santos', congregacao: 'Sede' },
      { nome: 'Emanuel Araújo Carvalho', congregacao: 'Sede' },
      { nome: 'Ana Nicolly Matos Fernandes', congregacao: 'Sede' },
      { nome: 'Luiz Otávio Rodrigues Dias', congregacao: 'Sede' },
      { nome: 'Dante Dias Magalhães', congregacao: 'Sede' },
      { nome: 'Viviam Pereira Sampaio', congregacao: 'Sede' },
      { nome: 'Maria Clara Rodrigues de Vasconcelos', congregacao: 'Sede' },
      { nome: 'João Matheus Rodrigues de Vasconcelos', congregacao: 'Sede' },
      { nome: 'Ester Vasconcelos', congregacao: 'Sede' },

      // CONGREGAÇÃO DAS CASINHAS
      { nome: 'Tainara Sandy da Silva de Araújo', congregacao: 'Congregação das Casinhas' },
      { nome: 'Lindomar Florêncio Farias', congregacao: 'Congregação das Casinhas' },
      { nome: 'João Batista de Araújo', congregacao: 'Congregação das Casinhas' },
      { nome: 'Antônia Izadora Ferreira Florêncio', congregacao: 'Congregação das Casinhas' },
      { nome: 'Maria Ferreira Fontenele', congregacao: 'Congregação das Casinhas' },
      { nome: 'Maria Isabel Ferreira Florêncio', congregacao: 'Congregação das Casinhas' },
    ]

    for (let i = 0; i < listaNovos.length; i++) {
      const item = listaNovos[i]
      const nNorm = normalizar(item.nome)

      if (nomesExistentesNorm.includes(nNorm)) {
        continue
      }

      nomesExistentesNorm.push(nNorm)

      const record = new Record(colCongregados)
      record.set('nome', item.nome)
      record.set('congregacao', item.congregacao)
      record.set('status', 'Ativo')
      record.set('telefone', '')
      record.set('whatsapp', '')
      app.save(record)
    }
  },
  (app) => {
    const nomesInseridos = [
      'Marcos Manoel Ponte Freire',
      'Joesley Costa Cardozo',
      'Maria Kaylane Pessoa Frota',
      'Ana Rayssa Almeida de Matos',
      'Débora Menezes Leopoldo',
      'Sara Freire Carneiro',
      'Lília Sophia Ferreira Sabino',
      'Lyara Pereira Dourado',
      'Liz Matos Ferreira',
      'Millena Silva Dourado',
      'Isabele Fernandes Frota',
      'Ana Maria Nascimento de Vasconcelos',
      'João Moreira Cardoso',
      'Levi Cardozo de Sousa',
      'Enzo Emanuel Cardozo da Silva',
      'Miguel Cardozo da Silva',
      'Aurora Dias da Silva',
      'Davi Moreira Menezes',
      'Victoria Ernestina Moreira Menezes',
      'Anna Kevellyn Costa dos Santos',
      'Emanuel Araújo Carvalho',
      'Ana Nicolly Matos Fernandes',
      'Luiz Otávio Rodrigues Dias',
      'Dante Dias Magalhães',
      'Viviam Pereira Sampaio',
      'Maria Clara Rodrigues de Vasconcelos',
      'João Matheus Rodrigues de Vasconcelos',
      'Ester Vasconcelos',
      'Tainara Sandy da Silva de Araújo',
      'Lindomar Florêncio Farias',
      'João Batista de Araújo',
      'Antônia Izadora Ferreira Florêncio',
      'Maria Ferreira Fontenele',
      'Maria Isabel Ferreira Florêncio',
    ]

    for (let i = 0; i < nomesInseridos.length; i++) {
      try {
        const found = app.findRecordsByFilter(
          'congregados',
          `nome = '${nomesInseridos[i].replace(/'/g, "\\'")}'`,
          '',
          10,
          0,
        )
        if (found && found.length > 0) {
          for (let j = 0; j < found.length; j++) {
            app.delete(found[j])
          }
        }
      } catch (_) {}
    }
  },
)
