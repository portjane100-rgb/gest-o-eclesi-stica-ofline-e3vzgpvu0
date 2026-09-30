migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'portelajane@outlook.com')
      user.setPassword('AdtcAdmin2025!#')
      user.setVerified(true)
      user.set('ativo', true)
      user.set('perfil', 'admin')
      user.set('emailVisibility', true)
      user.set('tokenKey', $security.randomString(30))
      app.save(user)
    } catch (err) {
      console.log('Erro ao redefinir senha do admin:', err)
    }
  },
  (app) => {
    // Reversão não é necessária / no-op
  },
)
