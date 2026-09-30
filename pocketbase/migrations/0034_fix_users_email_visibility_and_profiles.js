migrate(
  (app) => {
    // 1. Atualizar emailVisibility = true em todos os usuários que não sejam o assistente de IA
    // Assim a listagem de usuários pelo SDK (pb.collection('users').getFullList())
    // retorna os e-mails reais no frontend.
    app
      .db()
      .newQuery(`
      UPDATE users
      SET emailVisibility = 1
      WHERE email != 'assistente@adtc.local' OR email IS NULL
    `)
      .execute()

    // 2. Garantir que a conta da Tesouraria e dos secretários tenham os perfis e ativos corretos
    try {
      const tesouraria = app.findAuthRecordByEmail('_pb_users_auth_', 'tesouraria@adtc.local')
      tesouraria.set('perfil', 'tesoureiro')
      tesouraria.set('ativo', true)
      tesouraria.set('emailVisibility', true)
      app.save(tesouraria)
    } catch (_) {}

    try {
      const sec1 = app.findAuthRecordByEmail('_pb_users_auth_', 'cvalderlanio@gmail.com')
      sec1.set('perfil', 'secretario1')
      sec1.set('ativo', true)
      sec1.set('emailVisibility', true)
      app.save(sec1)
    } catch (_) {}

    try {
      const sec2 = app.findAuthRecordByEmail('_pb_users_auth_', 'secretaria2@adtc.local')
      sec2.set('perfil', 'secretario2')
      sec2.set('ativo', true)
      sec2.set('emailVisibility', true)
      app.save(sec2)
    } catch (_) {}

    // Visitante assistente sempre invisível e sem perfil de admin
    try {
      const assistente = app.findAuthRecordByEmail('_pb_users_auth_', 'assistente@adtc.local')
      assistente.set('perfil', '')
      assistente.set('ativo', false)
      assistente.set('emailVisibility', false)
      app.save(assistente)
    } catch (_) {}
  },
  (app) => {
    app
      .db()
      .newQuery(`
      UPDATE users
      SET emailVisibility = 0
    `)
      .execute()
  },
)
