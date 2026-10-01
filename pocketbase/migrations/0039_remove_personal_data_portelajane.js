migrate(
  (app) => {
    // 1. Atualizar regras da coleção users para remover a menção hardcoded a portelajane@outlook.com
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    usersCol.updateRule =
      "@request.auth.id != '' && (id = @request.auth.id || @request.auth.perfil = 'tesoureiro' || @request.auth.perfil = 'admin')"
    usersCol.deleteRule =
      "@request.auth.id != '' && (@request.auth.perfil = 'tesoureiro' || @request.auth.perfil = 'admin')"
    app.save(usersCol)

    // 2. Apagar usuário portelajane@outlook.com do banco de dados
    try {
      const user = app.findAuthRecordByEmail('users', 'portelajane@outlook.com')
      app.delete(user)
    } catch (_) {
      // já não existe ou foi removido
    }
  },
  (app) => {
    // down: nada a restaurar de dados pessoais
  },
)
