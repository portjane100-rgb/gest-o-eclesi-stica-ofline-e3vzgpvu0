// Hook para alteração de senha do usuário logado em /admin/config
routerAdd(
  'POST',
  '/backend/v1/admin/change-password',
  (e) => {
    try {
      const authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Acesso não autorizado. Faça login novamente.' })
      }

      const body = e.requestInfo().body || {}
      const oldPassword = (body.oldPassword || '').trim()
      const newPassword = (body.newPassword || '').trim()
      const confirmPassword = (body.confirmPassword || body.passwordConfirm || '').trim()

      if (!newPassword || newPassword.length < 6) {
        return e.json(400, { error: 'A nova senha deve ter no mínimo 6 caracteres.' })
      }

      if (newPassword !== confirmPassword) {
        return e.json(400, { error: 'A confirmação de senha não confere.' })
      }

      // Se oldPassword foi informada, validar se bate com a senha atual
      if (oldPassword) {
        try {
          $app.findAuthRecordByPassword('users', authRecord.email(), oldPassword)
        } catch (_) {
          return e.json(400, { error: 'A senha atual informada está incorreta.' })
        }
      }

      // Carregar o registro auth e atualizar com a nova senha
      const user = $app.findAuthRecordByEmail('users', authRecord.email())
      user.setPassword(newPassword)
      $app.save(user)

      return e.json(200, {
        success: true,
        message: 'Senha alterada com sucesso! A nova senha já está ativa.',
      })
    } catch (err) {
      return e.json(500, { error: err?.message || 'Erro ao alterar a senha.' })
    }
  },
  $apis.requireAuth(),
)
