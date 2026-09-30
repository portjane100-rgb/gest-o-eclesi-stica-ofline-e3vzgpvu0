migrate(
  (app) => {
    const colObreiros = app.findCollectionByNameOrId('obreiros')

    // Lista de Obreiros por Unidade fornecida pelo usuário
    // Sede: 2 Presbíteros, 13 Diáconos, 4 Auxiliares (Total 19 novos + Pr. Presidente existente = 20)
    // Congregação das Casinhas: 1 Evangelista, 2 Presbíteros, 2 Diáconos, 3 Auxiliares (Total 8)
    // Congregação do Alto: 2 Presbíteros, 1 Diácono (Total 3)
    const novosObreiros = [
      // ================= OBREIROS DA SEDE =================
      // Presbíteros
      {
        nome: 'Benedito Rodrigues Davi',
        cargo: 'Presbítero',
        congregacao: 'Sede',
        ordem: 2,
      },
      {
        nome: 'Valderlânio Carneiro Araújo',
        cargo: 'Presbítero',
        congregacao: 'Sede',
        ordem: 3,
      },
      // Diáconos
      {
        nome: 'Antônio de Vasconcelos',
        cargo: 'Diácono',
        congregacao: 'Sede',
        ordem: 4,
      },
      {
        nome: 'Belchior Fernandes Vasconcelos',
        cargo: 'Diácono',
        congregacao: 'Sede',
        ordem: 5,
      },
      {
        nome: 'Benedito Pereira de Matos',
        cargo: 'Diácono',
        congregacao: 'Sede',
        ordem: 6,
      },
      {
        nome: 'Kleinberg Régio Frota Veras',
        cargo: 'Diácono',
        congregacao: 'Sede',
        ordem: 7,
      },
      {
        nome: 'Nadir Ferreira Monteiro',
        cargo: 'Diácono',
        congregacao: 'Sede',
        ordem: 8,
      },
      {
        nome: 'Raimundo Ferreira Matos',
        cargo: 'Diácono',
        congregacao: 'Sede',
        ordem: 9,
      },
      {
        nome: 'José Wilton Flor Silva',
        cargo: 'Diácono',
        congregacao: 'Sede',
        ordem: 10,
      },
      {
        nome: 'Francisco Abelardo de Matos',
        cargo: 'Diácono',
        congregacao: 'Sede',
        ordem: 11,
      },
      {
        nome: 'Charles de Matos Arruda',
        cargo: 'Diácono',
        congregacao: 'Sede',
        ordem: 12,
      },
      {
        nome: 'Francisco Alves de Menezes Júnior',
        cargo: 'Diácono',
        congregacao: 'Sede',
        ordem: 13,
      },
      {
        nome: 'Francisco Antônio da Silveira',
        cargo: 'Diácono',
        congregacao: 'Sede',
        ordem: 14,
      },
      {
        nome: 'Valderlan Carvalho Ferreira',
        cargo: 'Diácono',
        congregacao: 'Sede',
        ordem: 15,
      },
      {
        nome: 'José Rodrigo Frota',
        cargo: 'Diácono',
        congregacao: 'Sede',
        ordem: 16,
      },
      // Auxiliares
      {
        nome: 'Antônio Fernando Sampaio',
        cargo: 'Auxiliar',
        congregacao: 'Sede',
        ordem: 17,
      },
      {
        nome: 'Antônio Mauro de Oliveira',
        cargo: 'Auxiliar',
        congregacao: 'Sede',
        ordem: 18,
      },
      {
        nome: 'Pedro Clemente Tiago',
        cargo: 'Auxiliar',
        congregacao: 'Sede',
        ordem: 19,
      },
      {
        nome: 'Raimundo Nonato Moura da Costa',
        cargo: 'Auxiliar',
        congregacao: 'Sede',
        ordem: 20,
      },

      // ================= CONGREGAÇÃO DAS CASINHAS =================
      // Evangelista
      {
        nome: 'Denevaldo Leopoldo do Nascimento',
        cargo: 'Evangelista',
        congregacao: 'Congregação das Casinhas',
        ordem: 21,
      },
      // Presbíteros
      {
        nome: 'Francisco Araújo Fontenele',
        cargo: 'Presbítero',
        congregacao: 'Congregação das Casinhas',
        ordem: 22,
      },
      {
        nome: 'Benedito Frota Araújo',
        cargo: 'Presbítero',
        congregacao: 'Congregação das Casinhas',
        ordem: 23,
      },
      // Diáconos
      {
        nome: 'José Alves Ferreira',
        cargo: 'Diácono',
        congregacao: 'Congregação das Casinhas',
        ordem: 24,
      },
      {
        nome: 'Miguel Araújo Fontenele',
        cargo: 'Diácono',
        congregacao: 'Congregação das Casinhas',
        ordem: 25,
      },
      // Auxiliares
      {
        nome: 'Clécio Araújo de Lima',
        cargo: 'Auxiliar',
        congregacao: 'Congregação das Casinhas',
        ordem: 26,
      },
      {
        nome: 'Francisco Carvalho Ferreira',
        cargo: 'Auxiliar',
        congregacao: 'Congregação das Casinhas',
        ordem: 27,
      },
      {
        nome: 'José Zacarias da Costa',
        cargo: 'Auxiliar',
        congregacao: 'Congregação das Casinhas',
        ordem: 28,
      },

      // ================= CONGREGAÇÃO DO ALTO =================
      // Presbíteros
      {
        nome: 'Gilson Fontenele Cardoso',
        cargo: 'Presbítero',
        congregacao: 'Congregação do Alto',
        ordem: 29,
      },
      {
        nome: 'Joaquim Fontenele Cardoso',
        cargo: 'Presbítero',
        congregacao: 'Congregação do Alto',
        ordem: 30,
      },
      // Diáconos
      {
        nome: 'José Fernandes Fontenele',
        cargo: 'Diácono',
        congregacao: 'Congregação do Alto',
        ordem: 31,
      },
    ]

    for (const item of novosObreiros) {
      let record
      // Idempotência: buscar por nome + congregacao
      try {
        const found = app.findRecordsByFilter(
          'obreiros',
          `nome = '${item.nome.replace(/'/g, "\\'")}' && congregacao = '${item.congregacao}'`,
          '',
          1,
          0,
        )
        if (found && found.length > 0) {
          record = found[0]
        }
      } catch (_) {}

      if (!record) {
        record = new Record(colObreiros)
      }

      record.set('nome', item.nome)
      record.set('cargo', item.cargo)
      record.set('congregacao', item.congregacao)
      record.set('status', 'Ativo')
      if (!record.get('ordem') || record.get('ordem') === 1) {
        record.set('ordem', item.ordem)
      }

      app.save(record)
    }
  },
  (app) => {
    // Reverter os obreiros inseridos nesta migration (mantendo intacto o Pastor Presidente)
    const nomesParaRemover = [
      { nome: 'Benedito Rodrigues Davi', congregacao: 'Sede' },
      { nome: 'Valderlânio Carneiro Araújo', congregacao: 'Sede' },
      { nome: 'Antônio de Vasconcelos', congregacao: 'Sede' },
      { nome: 'Belchior Fernandes Vasconcelos', congregacao: 'Sede' },
      { nome: 'Benedito Pereira de Matos', congregacao: 'Sede' },
      { nome: 'Kleinberg Régio Frota Veras', congregacao: 'Sede' },
      { nome: 'Nadir Ferreira Monteiro', congregacao: 'Sede' },
      { nome: 'Raimundo Ferreira Matos', congregacao: 'Sede' },
      { nome: 'José Wilton Flor Silva', congregacao: 'Sede' },
      { nome: 'Francisco Abelardo de Matos', congregacao: 'Sede' },
      { nome: 'Charles de Matos Arruda', congregacao: 'Sede' },
      { nome: 'Francisco Alves de Menezes Júnior', congregacao: 'Sede' },
      { nome: 'Francisco Antônio da Silveira', congregacao: 'Sede' },
      { nome: 'Valderlan Carvalho Ferreira', congregacao: 'Sede' },
      { nome: 'José Rodrigo Frota', congregacao: 'Sede' },
      { nome: 'Antônio Fernando Sampaio', congregacao: 'Sede' },
      { nome: 'Antônio Mauro de Oliveira', congregacao: 'Sede' },
      { nome: 'Pedro Clemente Tiago', congregacao: 'Sede' },
      { nome: 'Raimundo Nonato Moura da Costa', congregacao: 'Sede' },
      { nome: 'Denevaldo Leopoldo do Nascimento', congregacao: 'Congregação das Casinhas' },
      { nome: 'Francisco Araújo Fontenele', congregacao: 'Congregação das Casinhas' },
      { nome: 'Benedito Frota Araújo', congregacao: 'Congregação das Casinhas' },
      { nome: 'José Alves Ferreira', congregacao: 'Congregação das Casinhas' },
      { nome: 'Miguel Araújo Fontenele', congregacao: 'Congregação das Casinhas' },
      { nome: 'Clécio Araújo de Lima', congregacao: 'Congregação das Casinhas' },
      { nome: 'Francisco Carvalho Ferreira', congregacao: 'Congregação das Casinhas' },
      { nome: 'José Zacarias da Costa', congregacao: 'Congregação das Casinhas' },
      { nome: 'Gilson Fontenele Cardoso', congregacao: 'Congregação do Alto' },
      { nome: 'Joaquim Fontenele Cardoso', congregacao: 'Congregação do Alto' },
      { nome: 'José Fernandes Fontenele', congregacao: 'Congregação do Alto' },
    ]

    for (const item of nomesParaRemover) {
      try {
        const found = app.findRecordsByFilter(
          'obreiros',
          `nome = '${item.nome.replace(/'/g, "\\'")}' && congregacao = '${item.congregacao}'`,
          '',
          1,
          0,
        )
        if (found && found.length > 0) {
          app.delete(found[0])
        }
      } catch (_) {}
    }
  },
)
