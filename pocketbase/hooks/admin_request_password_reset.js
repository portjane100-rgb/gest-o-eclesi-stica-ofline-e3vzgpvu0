// Hook de recuperação de senha: envia link ou código de redefinição para o e-mail do admin
routerAdd('POST', '/backend/v1/admin/request-password-reset', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const email = (body.email || '').trim().toLowerCase()

    if (!email) {
      return e.json(400, { error: 'O e-mail cadastrado é obrigatório.' })
    }

    const ADMIN_EMAIL = 'portelajane@outlook.com'
    if (email !== ADMIN_EMAIL) {
      return e.json(400, {
        error:
          'E-mail não reconhecido como administrador do sistema. Utilize o e-mail oficial cadastrado.',
      })
    }

    // Tentar localizar o usuário admin
    let user
    try {
      user = $app.findAuthRecordByEmail('users', ADMIN_EMAIL)
    } catch (_) {
      return e.json(404, { error: 'Usuário administrador não encontrado no sistema.' })
    }

    // Tentar enviar o email oficial de redefinição de senha do PocketBase
    let emailSent = false
    let resetError = ''
    try {
      $mails.sendRecordPasswordReset($app, user)
      emailSent = true
    } catch (err) {
      resetError = err?.message || String(err)
      console.log('Aviso ao enviar e-mail via $mails.sendRecordPasswordReset:', resetError)
    }

    // Se o serviço SMTP nativo falhar ou estiver sem credenciais externas, gerar código de recuperação temporário de 6 dígitos
    // gravado na coleção configuracoes para garantir que o administrador consiga redefinir sem travamentos
    const tempCode = $security.randomString(6).toUpperCase()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos

    try {
      const col = $app.findCollectionByNameOrId('configuracoes')
      let rec
      try {
        rec = $app.findFirstRecordByData('configuracoes', 'chave', 'admin_pwd_reset_token')
      } catch (_) {
        rec = new Record(col)
        rec.set('chave', 'admin_pwd_reset_token')
      }
      rec.set('valor', JSON.stringify({ code: tempCode, expiresAt: expiresAt, email: ADMIN_EMAIL }))
      $app.save(rec)
    } catch (saveErr) {
      console.log('Erro ao salvar token de backup:', saveErr)
    }

    return e.json(200, {
      success: true,
      emailSent: emailSent,
      message: emailSent
        ? 'Link de redefinição enviado com sucesso para portelajane@outlook.com. Verifique sua caixa de entrada e spam.'
        : 'Código de recuperação gerado para portelajane@outlook.com.',
      // Fornece código de recuperação caso o servidor SMTP esteja sem envio direto
      recoveryCode: emailSent ? undefined : tempCode,
    })
  } catch (err) {
    return e.json(500, { error: err?.message || 'Falha ao processar solicitação de redefinição.' })
  }
})
