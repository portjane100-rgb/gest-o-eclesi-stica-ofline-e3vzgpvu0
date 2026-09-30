migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // Fechar regras da coleção users:
    // listRule e viewRule: apenas usuários autenticados podem listar ou visualizar registros de users
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"

    // createRule: nulo para bloquear cadastro público pela API de users (apenas superusers ou hooks autenticados)
    usersCol.createRule = null

    // updateRule: o próprio usuário pode atualizar seus dados (@request.auth.id = id)
    // OU o Tesoureiro/admin pode atualizar outros usuários
    usersCol.updateRule =
      "@request.auth.id != '' && (id = @request.auth.id || @request.auth.perfil = 'tesoureiro' || @request.auth.perfil = 'admin' || @request.auth.email = 'portelajane@outlook.com')"

    // deleteRule: somente Tesoureiro ou Admin autenticado pode deletar (ou superuser)
    usersCol.deleteRule =
      "@request.auth.id != '' && (@request.auth.perfil = 'tesoureiro' || @request.auth.perfil = 'admin' || @request.auth.email = 'portelajane@outlook.com')"

    app.save(usersCol)
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    usersCol.createRule = null
    usersCol.updateRule = "@request.auth.id != ''"
    usersCol.deleteRule = 'id = @request.auth.id'
    app.save(usersCol)
  },
)
