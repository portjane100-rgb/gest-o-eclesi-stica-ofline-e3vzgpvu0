// Hook de confirmação de recuperação de senha via código ou token
routerAdd('POST', '/backend/v1/admin/confirm-password-reset', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const code = (body.code || '').trim().toUpperCase()
    const newPassword = (body.newPassword || '').trim()
    const confirmPassword = (body.confirmPassword || '').trim()
    if (!code) {
      return e.json(400, { error: 'O código de recuperação é obrigatório.' })
    }

    if (!newPassword || newPassword.length < 6) {
      return e.json(400, { error: 'A nova senha deve ter no mínimo 6 caracteres.' })
    }

    if (newPassword !== confirmPassword) {
      return e.json(400, { error: 'A confirmação de senha não confere.' })
    }

    // Verificar se o código bate com o código salvo em configuracoes
    let valid = false
    let targetEmail = ''
    try {
      const rec = $app.findFirstRecordByData('configuracoes', 'chave', 'admin_pwd_reset_token')
      const data = JSON.parse(rec.getString('valor') || '{}')
      if (data.code && data.code.toUpperCase() === code) {
        if (new Date(data.expiresAt) > new Date()) {
          valid = true
          targetEmail = data.email || ''
        } else {
          return e.json(400, { error: 'O código de recuperação expirou. Solicite um novo.' })
        }
      }
    } catch (_) {}

    if (!valid || !targetEmail) {
      return e.json(400, { error: 'Código de recuperação inválido ou inexistente.' })
    }

    // Atualizar a senha do usuário
    let user
    try {
      user = $app.findAuthRecordByEmail('users', targetEmail)
    } catch (_) {
      return e.json(404, { error: 'Usuário não encontrado para redefinir senha.' })
    }
    user.setPassword(newPassword)
    $app.save(user)

    // Excluir ou limpar o token
    try {
      const rec = $app.findFirstRecordByData('configuracoes', 'chave', 'admin_pwd_reset_token')
      rec.set('valor', '')
      $app.save(rec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: 'Senha redefinida com sucesso! Você já pode entrar com a nova senha.',
    })
  } catch (err) {
    return e.json(500, { error: err?.message || 'Falha ao redefinir a senha.' })
  }
})
