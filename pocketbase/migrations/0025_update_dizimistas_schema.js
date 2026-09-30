/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const dizimistasCol = app.findCollectionByNameOrId('dizimistas')
    const membrosCol = app.findCollectionByNameOrId('membros')

    // 1. Adicionar campo 'membro' (relation opcional para membros)
    if (!dizimistasCol.fields.getByName('membro')) {
      dizimistasCol.fields.add(
        new RelationField({
          name: 'membro',
          required: false,
          collectionId: membrosCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    // 2. Adicionar campo 'ativo' (bool flag, default true para os novos)
    if (!dizimistasCol.fields.getByName('ativo')) {
      dizimistasCol.fields.add(
        new BoolField({
          name: 'ativo',
          required: false,
        }),
      )
    }

    // 3. Ajustar campo mes_referencia para required: false (pois a seleção é do membro dizimista permanente)
    const mesField = dizimistasCol.fields.getByName('mes_referencia')
    if (mesField) {
      mesField.required = false
    }

    // 4. Permitir listRule e viewRule públicas para que a página /carteirinha consulte sem autenticação
    dizimistasCol.listRule = ''
    dizimistasCol.viewRule = ''
    // create, update e delete continuam restritos ao admin (@request.auth.id != '')
    dizimistasCol.createRule = "@request.auth.id != ''"
    dizimistasCol.updateRule = "@request.auth.id != ''"
    dizimistasCol.deleteRule = "@request.auth.id != ''"

    app.save(dizimistasCol)

    // 5. Atualizar registros existentes de dizimistas para ativo = true
    try {
      app
        .db()
        .newQuery('UPDATE dizimistas SET ativo = 1 WHERE ativo IS NULL OR ativo = 0')
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      const dizimistasCol = app.findCollectionByNameOrId('dizimistas')
      if (dizimistasCol.fields.getByName('membro')) {
        dizimistasCol.fields.removeByName('membro')
      }
      if (dizimistasCol.fields.getByName('ativo')) {
        dizimistasCol.fields.removeByName('ativo')
      }
      dizimistasCol.listRule = "@request.auth.id != ''"
      dizimistasCol.viewRule = "@request.auth.id != ''"
      app.save(dizimistasCol)
    } catch (_) {}
  },
)
