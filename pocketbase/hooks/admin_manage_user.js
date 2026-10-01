// Hook para gestão administrativa dos logins do painel (Tesoureiro como gerente do sistema)
// Permite EXCLUSIVAMENTE ao Tesoureiro ou Admin:
// - Criar novos logins ou atualizar e-mail, nome, perfil, status (ativo/inativo) e redefinir senha
// - O próprio usuário comum só pode alterar a própria senha via /backend/v1/admin/change-password
// - Proteções:
//   1. Assistente de IA não pode ser alterado
//   2. Não é permitido desativar a própria conta de gerente (Tesoureiro)
//   3. Não é permitido alterar o perfil do único Tesoureiro ativo se não restar outro Tesoureiro ativo
//   4. Senha real gravada com setPassword + emailVisibility garantido true
routerAdd(
  'POST',
  '/backend/v1/admin/manage-user',
  (e) => {
    try {
      const authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Acesso não autorizado. Faça login novamente.' })
      }

      const callerPerfil = authRecord.getString('perfil') || ''
      const isManager = callerPerfil === 'tesoureiro' || callerPerfil === 'admin'

      // Seção e endpoints de gestão de logins são EXCLUSIVOS do Tesoureiro / Admin
      if (!isManager) {
        return e.json(403, {
          error:
            'Acesso negado. O gerenciamento de logins do painel é de competência exclusiva do Tesoureiro.',
        })
      }

      const body = e.requestInfo().body || {}
      const userId = (body.userId || '').trim()
      const email = (body.email || '').trim().toLowerCase()
      const name = (body.name || '').trim()
      const perfil = (body.perfil || '').trim()
      const newPassword = (body.password || '').trim()
      const newPasswordConfirm = (
        body.passwordConfirm ||
        body.confirmPassword ||
        body.password ||
        ''
      ).trim()
      const ativo = body.ativo !== undefined ? Boolean(body.ativo) : true

      let targetUser = null
      if (userId) {
        try {
          targetUser = $app.findRecordById('users', userId)
        } catch (_) {}
      }

      if (!targetUser && email) {
        try {
          targetUser = $app.findAuthRecordByEmail('users', email)
        } catch (_) {}
      }

      // Se não encontrou o usuário e é criação de novo login
      if (!targetUser) {
        if (!email) {
          return e.json(400, { error: 'O e-mail é obrigatório para cadastrar o login.' })
        }

        if (!newPassword || newPassword.length < 6) {
          return e.json(400, { error: 'A senha inicial deve possuir no mínimo 6 caracteres.' })
        }

        if (newPasswordConfirm && newPassword !== newPasswordConfirm) {
          return e.json(400, { error: 'A confirmação de senha não confere.' })
        }

        // Checar se e-mail já existe
        try {
          const existing = $app.findAuthRecordByEmail('users', email)
          if (existing) {
            return e.json(400, { error: 'Já existe um usuário cadastrado com este e-mail.' })
          }
        } catch (_) {}

        const usersCol = $app.findCollectionByNameOrId('users')
        targetUser = new Record(usersCol)
        targetUser.setEmail(email)
        targetUser.setPassword(newPassword)
        targetUser.setVerified(true)
        targetUser.set('emailVisibility', true)
        targetUser.set(
          'name',
          name ||
            (perfil === 'secretario1'
              ? '1º Secretário'
              : perfil === 'secretario2'
                ? '2º Secretário'
                : perfil === 'tesoureiro'
                  ? 'Tesoureiro'
                  : 'Novo Usuário'),
        )
        targetUser.set('perfil', perfil || 'secretario1')
        targetUser.set('ativo', ativo)

        $app.save(targetUser)

        return e.json(200, {
          success: true,
          message: 'Novo login cadastrado com sucesso!',
          user: {
            id: targetUser.id,
            email: targetUser.email(),
            name: targetUser.getString('name'),
            perfil: targetUser.getString('perfil'),
            ativo: targetUser.getBool('ativo'),
          },
        })
      }

      // Proteger o assistente de IA contra edições indevidas
      if (
        targetUser.email() === 'assistente@adtc.local' ||
        targetUser.getString('name') === 'Visitante Assistente'
      ) {
        return e.json(400, { error: 'Este usuário de serviço não pode ser alterado.' })
      }

      const isEditingSelf = targetUser.id === authRecord.id

      // REQUISITO 3: IMPEDIR AUTODESATIVAÇÃO DO GERENTE (TESOUREIRO)
      // O gerente nunca pode desativar o próprio login
      if (isEditingSelf && !ativo) {
        return e.json(400, {
          error:
            'Ação não permitida: Você não pode desativar seu próprio login de gerente. O sistema deve manter sempre um Tesoureiro ativo.',
        })
      }

      // REQUISITO 4: SUCESSÃO E GARANTIA DE PELO MENOS UM TESOUREIRO ATIVO
      // Se estiver desativando um usuário Tesoureiro ou mudando seu perfil para secretário,
      // verificar se ainda restará ao menos um Tesoureiro ativo no sistema
      const currentTargetPerfil = targetUser.getString('perfil') || ''
      const isTargetTesoureiro =
        currentTargetPerfil === 'tesoureiro' || currentTargetPerfil === 'admin'
      const changingToNonTesoureiro = perfil && perfil !== 'tesoureiro' && perfil !== 'admin'
      const becomingInactive = ativo === false

      if (isTargetTesoureiro && (changingToNonTesoureiro || becomingInactive)) {
        // Contar quantos outros usuários têm perfil tesoureiro/admin e estão ativos
        let otherActiveTesoureiros = 0
        try {
          const allUsers = $app.findRecordsByFilter('users', 'ativo = true', '-created', 50, 0)
          for (let i = 0; i < allUsers.length; i++) {
            const u = allUsers[i]
            if (u.id !== targetUser.id) {
              const p = u.getString('perfil') || ''
              if (p === 'tesoureiro' || p === 'admin') {
                otherActiveTesoureiros++
              }
            }
          }
        } catch (_) {}

        if (otherActiveTesoureiros === 0) {
          return e.json(400, {
            error:
              'Operação recusada: Deve haver sempre pelo menos um usuário com perfil Tesoureiro ativo no sistema. Para transferir a função de gerente (sucessão), configure antes o novo Tesoureiro como ativo.',
          })
        }
      }

      // Atualizar Nome
      if (name) {
        targetUser.set('name', name)
      }

      // Atualizar E-mail
      if (email && email !== targetUser.email().toLowerCase()) {
        try {
          const existing = $app.findAuthRecordByEmail('users', email)
          if (existing.id !== targetUser.id) {
            return e.json(400, { error: 'Este e-mail já está em uso por outro usuário.' })
          }
        } catch (_) {}
        targetUser.setEmail(email)
        targetUser.setVerified(true)
      }

      // Garantir visibilidade do e-mail na listagem
      targetUser.set('emailVisibility', true)

      // Atualizar Perfil e Ativo
      if (perfil) {
        targetUser.set('perfil', perfil)
      }
      targetUser.set('ativo', ativo)

      // Atualizar Senha (com verificação e passwordConfirm)
      if (newPassword) {
        if (newPassword.length < 6) {
          return e.json(400, { error: 'A senha deve possuir pelo menos 6 caracteres.' })
        }
        if (newPasswordConfirm && newPassword !== newPasswordConfirm) {
          return e.json(400, { error: 'A confirmação de senha não confere.' })
        }
        targetUser.setPassword(newPassword)
      }

      $app.save(targetUser)

      return e.json(200, {
        success: true,
        message: 'Dados do login atualizados com sucesso.',
        user: {
          id: targetUser.id,
          email: targetUser.email(),
          name: targetUser.getString('name'),
          perfil: targetUser.getString('perfil'),
          ativo: targetUser.getBool('ativo'),
        },
      })
    } catch (err) {
      return e.json(500, { error: err?.message || 'Erro ao gerenciar usuário.' })
    }
  },
  $apis.requireAuth(),
)
