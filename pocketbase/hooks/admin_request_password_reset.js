// Hook de recuperação de senha: envia link ou código de redefinição para o e-mail do admin
routerAdd('POST', '/backend/v1/admin/request-password-reset', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const email = (body.email || '').trim().toLowerCase()

    if (!email) {
      return e.json(400, { error: 'O e-mail cadastrado é obrigatório.' })
    }

    // Tentar localizar o usuário por e-mail
    let user
    try {
      user = $app.findAuthRecordByEmail('users', email)
    } catch (_) {
      return e.json(404, { error: 'Usuário não encontrado no sistema com o e-mail informado.' })
    }

    const targetEmail = email

    // Gerar código de recuperação de 6 dígitos alfanuméricos
    // gravado na coleção configuracoes com validade de 30 minutos
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
      rec.set('valor', JSON.stringify({ code: tempCode, expiresAt: expiresAt, email: targetEmail }))
      $app.save(rec)
    } catch (saveErr) {
      console.log('Erro ao salvar token de recuperação:', saveErr)
    }

    // Enviar e-mail informativo com o CÓDIGO de 6 dígitos (sem link externo quebrado)
    let emailSent = false
    let resetError = ''
    try {
      const senderAddress = $app.settings().meta.senderAddress || 'noreply@goskip.app'
      const senderName = $app.settings().meta.senderName || 'ADTC Campanário'

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #E6E2D8; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #1E3A5F; margin: 0 0 6px 0; font-size: 20px;">ADTC Campanário — Gestão Eclesiástica</h2>
            <p style="color: #5A5A5A; margin: 0; font-size: 13px;">Recuperação de Senha do Painel Administrativo</p>
          </div>
          <div style="background: #F8F9FA; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
            <p style="color: #333333; font-size: 14px; margin: 0 0 12px 0;">Seu código de recuperação de senha é:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1E3A5F; font-family: monospace; background: #ffffff; padding: 12px 24px; display: inline-block; border-radius: 8px; border: 2px dashed #C9A227;">
              ${tempCode}
            </div>
            <p style="color: #666666; font-size: 12px; margin: 12px 0 0 0;">Este código é válido por <strong>30 minutos</strong>.</p>
          </div>
          <div style="color: #4A5568; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0;"><strong>Como redefinir sua senha:</strong></p>
            <ol style="margin: 0; padding-left: 20px;">
              <li>Acesse o site da igreja no computador ou no celular.</li>
              <li>No modal de login, clique em <em>"Criar Nova Senha"</em>.</li>
              <li>Informe este código de 6 dígitos e crie sua nova senha (mínimo de 6 caracteres).</li>
            </ol>
          </div>
          <div style="border-top: 1px solid #E2E8F0; padding-top: 14px; text-align: center; color: #718096; font-size: 11px;">
            <p style="margin: 0;">Se você não solicitou a redefinição de senha, desconsidere esta mensagem com segurança.</p>
          </div>
        </div>
      `

      const message = new MailerMessage({
        from: {
          address: senderAddress,
          name: senderName,
        },
        to: [{ address: targetEmail }],
        subject: `Código de Recuperação de Senha: ${tempCode} - ADTC Campanário`,
        html: emailHtml,
      })

      $app.newMailClient().send(message)
      emailSent = true
    } catch (err) {
      resetError = err?.message || String(err)
      console.log('Aviso ao enviar e-mail customizado via $app.newMailClient().send:', resetError)
    }

    return e.json(200, {
      success: true,
      emailSent: emailSent,
      targetEmail: targetEmail,
      message: emailSent
        ? `Código de recuperação gerado e enviado para ${targetEmail}. Você também pode utilizar o código exibido abaixo na tela Criar Nova Senha.`
        : `Código de recuperação gerado com sucesso para ${targetEmail}.`,
      recoveryCode: tempCode,
    })
  } catch (err) {
    return e.json(500, { error: err?.message || 'Falha ao processar solicitação de redefinição.' })
  }
})
