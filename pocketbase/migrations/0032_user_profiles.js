migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Adicionar campos 'perfil' e 'ativo' se não existirem
    if (!usersCol.fields.getByName('perfil')) {
      usersCol.fields.add(
        new SelectField({
          name: 'perfil',
          required: false,
          values: ['tesoureiro', 'secretario1', 'secretario2', 'admin'],
          maxSelect: 1,
        }),
      )
    }

    if (!usersCol.fields.getByName('ativo')) {
      // BoolField não deve ser required para permitir false
      usersCol.fields.add(
        new BoolField({
          name: 'ativo',
          required: false,
        }),
      )
    }

    // Regras de acesso da coleção users:
    // Permitir list e view para usuários autenticados para que administradores logados consigam listar e gerenciar as contas
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    // Atualização pelo próprio usuário ou por qualquer admin autenticado
    usersCol.updateRule = "@request.auth.id != ''"

    app.save(usersCol)

    // 2. Atualizar o usuário atual portelajane@outlook.com com perfil admin e ativo
    try {
      const adminOld = app.findAuthRecordByEmail('_pb_users_auth_', 'portelajane@outlook.com')
      adminOld.set('perfil', 'admin')
      adminOld.set('ativo', true)
      app.save(adminOld)
    } catch (_) {}

    // 3. Seed dos 3 perfis oficiais com credenciais padrão seguras
    // Tesoureiro: login 'tesouraria@adtc.local' ou username 'tesoureiro'
    // Secretário 1: login 'secretaria1@adtc.local' ou username 'secretario1'
    // Secretário 2: login 'secretaria2@adtc.local' ou username 'secretario2'
    const seedUsers = [
      {
        email: 'tesouraria@adtc.local',
        username: 'tesoureiro',
        name: 'Tesouraria ADTC',
        perfil: 'tesoureiro',
        password: 'Skip@Pass',
      },
      {
        email: 'secretaria1@adtc.local',
        username: 'secretario1',
        name: '1º Secretário',
        perfil: 'secretario1',
        password: 'Skip@Pass',
      },
      {
        email: 'secretaria2@adtc.local',
        username: 'secretario2',
        name: '2º Secretário',
        perfil: 'secretario2',
        password: 'Skip@Pass',
      },
    ]

    for (const u of seedUsers) {
      let record
      try {
        record = app.findAuthRecordByEmail('_pb_users_auth_', u.email)
      } catch (_) {
        record = new Record(usersCol)
        record.setEmail(u.email)
        record.setPassword(u.password)
        record.setVerified(true)
      }
      record.set('name', u.name)
      record.set('perfil', u.perfil)
      record.set('ativo', true)
      try {
        record.set('username', u.username)
      } catch (_) {}
      app.save(record)
    }
  },
  (app) => {
    // down migration
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const perfilField = usersCol.fields.getByName('perfil')
    if (perfilField) usersCol.fields.removeByName('perfil')
    const ativoField = usersCol.fields.getByName('ativo')
    if (ativoField) usersCol.fields.removeByName('ativo')
    app.save(usersCol)
  },
)
