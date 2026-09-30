/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('planilhas_mensais')

    // 1. Campo percentual_sede: porcentagem repassada à SEDE (ex.: 20, 30, 40)
    if (!col.fields.getByName('percentual_sede')) {
      col.fields.add(
        new NumberField({
          name: 'percentual_sede',
          min: 0,
          max: 100,
        }),
      )
    }

    // 2. Campo total_saidas: novo campo de total de saídas/repasse SEDE (preservando total_saidas_20 legado)
    if (!col.fields.getByName('total_saidas')) {
      col.fields.add(
        new NumberField({
          name: 'total_saidas',
        }),
      )
    }

    // 3. Campo valores_manuais: armazena objeto JSON com os valores que o usuário editou manualmente
    // Ex: { total_ofertas: 500, total_dizimos: 1000, total_entradas: 1500, total_saidas: 200, saldo_sede: 800, saldo_congregacao: 300 }
    if (!col.fields.getByName('valores_manuais')) {
      col.fields.add(
        new JSONField({
          name: 'valores_manuais',
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('planilhas_mensais')
      if (col.fields.getByName('percentual_sede')) {
        col.fields.removeByName('percentual_sede')
      }
      if (col.fields.getByName('total_saidas')) {
        col.fields.removeByName('total_saidas')
      }
      if (col.fields.getByName('valores_manuais')) {
        col.fields.removeByName('valores_manuais')
      }
      app.save(col)
    } catch (_) {}
  },
)
