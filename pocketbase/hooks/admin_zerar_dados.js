// Hook backend para zerar exclusivamente dados operacionais da instância
// Mantém intactos:
// 1. users (logins)
// 2. configuracoes (dados da igreja, logotipo, cores, rótulos, liderança, PIX)
// 3. congregacoes (unidades / congregações cadastradas)
//
// Apaga todos os dados operacionais:
// - membros, congregados, obreiros, dizimistas, patrimonio, escala, calendario,
//   agenda_semanal, salmos, fotos, albuns_fotos, escala_semana, cartas_recebidas,
//   solicitacoes_cadastro, planilhas_mensais.
routerAdd(
  'POST',
  '/backend/v1/admin/zerar-dados-sistema',
  (e) => {
    try {
      const authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Acesso não autorizado. Faça login novamente.' })
      }

      const callerPerfil = authRecord.getString('perfil') || ''
      const isManager = callerPerfil === 'admin' || callerPerfil === 'tesoureiro'

      if (!isManager) {
        return e.json(403, {
          error: 'Acesso negado. Apenas administradores do painel têm permissão para zerar dados.',
        })
      }

      const body = e.requestInfo().body || {}
      const confirmacao = (body.confirmacao || '').trim().toUpperCase()

      if (confirmacao !== 'ZERAR') {
        return e.json(400, {
          error:
            'Confirmação de segurança inválida. É obrigatório digitar exatamente a palavra ZERAR em letras maiúsculas para prosseguir.',
        })
      }

      const collectionsToClear = [
        'membros',
        'congregados',
        'obreiros',
        'dizimistas',
        'patrimonio',
        'escala',
        'calendario',
        'agenda_semanal',
        'salmos',
        'fotos',
        'albuns_fotos',
        'escala_semana',
        'cartas_recebidas',
        'solicitacoes_cadastro',
        'planilhas_mensais',
      ]

      const counts = {}
      let totalDeleted = 0

      $app.runInTransaction((txApp) => {
        for (let i = 0; i < collectionsToClear.length; i++) {
          const colName = collectionsToClear[i]
          let count = 0

          try {
            count = txApp.countRecords(colName)
          } catch (_) {
            count = 0
          }

          counts[colName] = count
          totalDeleted += count

          try {
            const col = txApp.findCollectionByNameOrId(colName)
            txApp.truncateCollection(col)
          } catch (tErr) {
            try {
              txApp
                .db()
                .newQuery('DELETE FROM ' + colName)
                .execute()
            } catch (_) {}
          }
        }
      })

      return e.json(200, {
        success: true,
        message:
          'Dados operacionais zerados com sucesso! Estrutura de congregações, configurações e logins foram preservados.',
        counts: counts,
        totalDeleted: totalDeleted,
      })
    } catch (err) {
      return e.json(500, { error: err?.message || 'Erro ao zerar dados operacionais do sistema.' })
    }
  },
  $apis.requireAuth(),
)
