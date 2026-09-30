migrate(
  (app) => {
    // Garantir que a regra de update da coleção users permita a alteração pelo próprio usuário autenticado
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    usersCol.updateRule = "@request.auth.id != '' && id = @request.auth.id"
    app.save(usersCol)
  },
  (app) => {
    // down migration
  },
)
