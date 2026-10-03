/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. MEMBROS: converter campo 'congregacao' de SelectField fixo para TextField livre
    try {
      const membrosCol = app.findCollectionByNameOrId('membros')
      try {
        membrosCol.removeIndex('idx_membros_congregacao')
      } catch (_) {}

      if (membrosCol.fields.getByName('congregacao')) {
        membrosCol.fields.removeByName('congregacao')
      }

      membrosCol.fields.add(
        new TextField({
          name: 'congregacao',
          required: false,
        }),
      )

      try {
        membrosCol.addIndex('idx_membros_congregacao', false, 'congregacao', '')
      } catch (_) {}

      app.save(membrosCol)
    } catch (err) {
      console.log('Erro ao atualizar campo congregacao em membros:', err)
      throw err
    }

    // 2. DIZIMISTAS: converter campo 'congregacao' de SelectField fixo para TextField livre
    try {
      const dizimistasCol = app.findCollectionByNameOrId('dizimistas')
      try {
        dizimistasCol.removeIndex('idx_dizimistas_congregacao')
      } catch (_) {}

      if (dizimistasCol.fields.getByName('congregacao')) {
        dizimistasCol.fields.removeByName('congregacao')
      }

      dizimistasCol.fields.add(
        new TextField({
          name: 'congregacao',
          required: false,
        }),
      )

      try {
        dizimistasCol.addIndex('idx_dizimistas_congregacao', false, 'congregacao', '')
      } catch (_) {}

      app.save(dizimistasCol)
    } catch (err) {
      console.log('Erro ao atualizar campo congregacao em dizimistas:', err)
      throw err
    }

    // 3. CONGREGADOS: também flexibilizar para TextField livre
    try {
      const congregadosCol = app.findCollectionByNameOrId('congregados')
      try {
        congregadosCol.removeIndex('idx_congregados_congregacao')
      } catch (_) {}

      if (congregadosCol.fields.getByName('congregacao')) {
        congregadosCol.fields.removeByName('congregacao')
      }

      congregadosCol.fields.add(
        new TextField({
          name: 'congregacao',
          required: false,
        }),
      )

      try {
        congregadosCol.addIndex('idx_congregados_congregacao', false, 'congregacao', '')
      } catch (_) {}

      app.save(congregadosCol)
    } catch (err) {
      console.log('Aviso ao flexibilizar congregacao em congregados (opcional):', err)
    }
  },
  (app) => {
    // Reversão básica
    try {
      const membrosCol = app.findCollectionByNameOrId('membros')
      if (membrosCol.fields.getByName('congregacao')) {
        membrosCol.fields.removeByName('congregacao')
      }
      membrosCol.fields.add(
        new SelectField({
          name: 'congregacao',
          required: true,
          values: [
            'Sede',
            'Congregação das Casinhas',
            'Congregação do Alto',
            'Congregação da Vila dos Pescadores',
          ],
          maxSelect: 1,
        }),
      )
      app.save(membrosCol)
    } catch (_) {}

    try {
      const dizimistasCol = app.findCollectionByNameOrId('dizimistas')
      if (dizimistasCol.fields.getByName('congregacao')) {
        dizimistasCol.fields.removeByName('congregacao')
      }
      dizimistasCol.fields.add(
        new SelectField({
          name: 'congregacao',
          required: true,
          values: [
            'Sede',
            'Congregação das Casinhas',
            'Congregação do Alto',
            'Congregação da Vila dos Pescadores',
          ],
          maxSelect: 1,
        }),
      )
      app.save(dizimistasCol)
    } catch (_) {}
  },
)
