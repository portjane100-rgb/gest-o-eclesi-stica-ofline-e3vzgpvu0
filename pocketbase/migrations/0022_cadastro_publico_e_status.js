/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Atualizar coleção congregados para ter o campo 'status' (Ativo | Inativo/Afastado | Falecido)
    const congregadosCol = app.findCollectionByNameOrId('congregados')
    if (!congregadosCol.fields.getByName('status')) {
      congregadosCol.fields.add(
        new SelectField({
          name: 'status',
          required: false,
          values: ['Ativo', 'Inativo/Afastado', 'Falecido'],
          maxSelect: 1,
        }),
      )
      app.save(congregadosCol)
    }

    // Preencher status padrão 'Ativo' para registros existentes de congregados que estiverem sem status
    try {
      app
        .db()
        .newQuery("UPDATE congregados SET status = 'Ativo' WHERE status IS NULL OR status = ''")
        .execute()
    } catch (e) {
      console.log('Erro ao atualizar status de congregados existentes:', e)
    }

    // Atualizar índice de status em congregados
    try {
      congregadosCol.addIndex('idx_congregados_status', false, 'status', '')
      app.save(congregadosCol)
    } catch (e) {
      console.log('Indice idx_congregados_status:', e)
    }

    // 2. Criar coleção solicitacoes_cadastro
    // Recebe submissões públicas de cadastro tanto para Membro quanto para Congregado
    if (!app.hasTable('solicitacoes_cadastro')) {
      const solicitacoes = new Collection({
        name: 'solicitacoes_cadastro',
        type: 'base',
        // Público pode criar solicitações; somente autenticado (admin) pode listar, ver, atualizar e deletar
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: '', // público
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'tipo',
            type: 'select',
            required: true,
            values: ['membro', 'congregado'],
            maxSelect: 1,
          },
          {
            name: 'status_solicitacao',
            type: 'select',
            required: true,
            values: ['pendente', 'aprovada', 'rejeitada'],
            maxSelect: 1,
          },
          { name: 'nome', type: 'text', required: true },
          { name: 'telefone', type: 'text' },
          { name: 'data_nascimento', type: 'date' },
          { name: 'data_nascimento_texto', type: 'text' },
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
          // Campos específicos da ficha de membro
          { name: 'filiacao', type: 'text' },
          { name: 'naturalidade', type: 'text' },
          { name: 'estado_civil', type: 'text' },
          { name: 'rg', type: 'text' },
          { name: 'cpf', type: 'text' },
          { name: 'endereco', type: 'text' },
          { name: 'observacao', type: 'text' },
          { name: 'data_conversao', type: 'date' },
          { name: 'data_conversao_texto', type: 'text' },
          { name: 'data_batismo', type: 'date' },
          { name: 'data_batismo_texto', type: 'text' },
          { name: 'cargo', type: 'text' },
          // Campos de autodate obrigatórios em coleções base
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_solicitacoes_status ON solicitacoes_cadastro (status_solicitacao)',
          'CREATE INDEX idx_solicitacoes_tipo ON solicitacoes_cadastro (tipo)',
          'CREATE INDEX idx_solicitacoes_congregacao ON solicitacoes_cadastro (congregacao)',
        ],
      })
      app.save(solicitacoes)
    }
  },
  (app) => {
    try {
      const solicitacoes = app.findCollectionByNameOrId('solicitacoes_cadastro')
      app.delete(solicitacoes)
    } catch (_) {}
  },
)
