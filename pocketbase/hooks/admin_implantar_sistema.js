// Hook backend para o "Kit de Implantação" (Modo Revenda)
// Permite EXCLUSIVAMENTE ao Tesoureiro (gerente do sistema) ou Admin:
// 1. Validar confirmação explícita digitada (IMPLANTAR)
// 2. Apagar todos os dados transacionais e de membros/conteúdo da igreja anterior:
//    membros, congregados, obreiros, dizimistas, patrimonio, escala, calendario,
//    agenda_semanal, salmos, albuns_fotos, fotos, escala_semana, cartas_recebidas,
//    solicitacoes_cadastro, planilhas_mensais.
// 3. Resetar e cadastrar as congregações/unidades iniciais fornecidas.
// 4. Salvar as configurações institucionais da nova igreja (nome, logo, cores, textos, pix).
// 5. Configurar os logins iniciais:
//    - Atualizar a conta do Tesoureiro gerente (e-mail, nome, senha)
//    - Opcionalmente criar/atualizar secretários (secretario1, secretario2)
//    - NUNCA apagar/desativar o usuário de serviço assistente@adtc.local!
routerAdd(
  'POST',
  '/backend/v1/admin/implantar-sistema',
  (e) => {
    try {
      const authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Acesso não autorizado. Faça login como Tesoureiro.' })
      }

      const callerPerfil = authRecord.getString('perfil') || ''
      const isManager = callerPerfil === 'tesoureiro' || callerPerfil === 'admin'
      if (!isManager) {
        return e.json(403, {
          error:
            'Acesso negado. A execução do Kit de Implantação e limpeza total é de competência exclusiva do Tesoureiro.',
        })
      }

      const body = e.requestInfo().body || {}
      const confirmacao = (body.confirmacao || '').trim().toUpperCase()

      if (confirmacao !== 'IMPLANTAR') {
        return e.json(400, {
          error:
            'Confirmação de segurança inválida. É obrigatório digitar exatamente a palavra IMPLANTAR em letras maiúsculas para prosseguir.',
        })
      }

      const igreja = body.igreja || {}
      const unidades = Array.isArray(body.unidades) ? body.unidades : []
      const tesoureiroLogin = body.tesoureiro || {}
      const secretarios = Array.isArray(body.secretarios) ? body.secretarios : []

      if (!igreja.nome || !igreja.nome.trim()) {
        return e.json(400, { error: 'O nome da nova igreja compradora é obrigatório.' })
      }

      if (!tesoureiroLogin.email || !tesoureiroLogin.email.trim()) {
        return e.json(400, { error: 'O e-mail do Tesoureiro gerente é obrigatório.' })
      }

      // Execução atômica e segura via Transaction
      $app.runInTransaction((txApp) => {
        // 1. Coleções para ZERAR dados transacionais e de membros/conteúdo
        const collectionsToClear = [
          'membros',
          'congregados',
          'obreiros',
          'dizimistas',
          'patrimonio',
          'escala',
          'calendario',
          'agenda_semanal',
          'salmos',
          'fotos',
          'albuns_fotos',
          'escala_semana',
          'cartas_recebidas',
          'solicitacoes_cadastro',
          'planilhas_mensais',
        ]

        for (let i = 0; i < collectionsToClear.length; i++) {
          const colName = collectionsToClear[i]
          try {
            const col = txApp.findCollectionByNameOrId(colName)
            txApp.truncateCollection(col)
          } catch (tErr) {
            // Se truncate falhar, deleta registros em lote via raw query
            try {
              txApp
                .db()
                .newQuery('DELETE FROM ' + colName)
                .execute()
            } catch (_) {}
          }
        }

        // 2. Limpar e recriar Congregações / Unidades
        try {
          const congCol = txApp.findCollectionByNameOrId('congregacoes')
          txApp.truncateCollection(congCol)
        } catch (_) {
          try {
            txApp.db().newQuery('DELETE FROM congregacoes').execute()
          } catch (_) {}
        }

        const congCollection = txApp.findCollectionByNameOrId('congregacoes')
        if (unidades && unidades.length > 0) {
          for (let u = 0; u < unidades.length; u++) {
            const uData = unidades[u]
            if (!uData || !uData.nome || !uData.nome.trim()) continue
            const rec = new Record(congCollection)
            rec.set('nome', uData.nome.trim())
            rec.set('titulo', (uData.titulo || uData.nome).trim())
            rec.set(
              'subtitulo',
              (uData.subtitulo || (u === 0 ? 'Templo Sede' : 'Congregação Filial')).trim(),
            )
            rec.set('endereco', (uData.endereco || '').trim())
            rec.set('dias_culto', (uData.diasCulto || uData.dias_culto || '').trim())
            rec.set('dirigente_geral', (uData.dirigenteGeral || uData.dirigente_geral || '').trim())
            rec.set('ordem', u + 1)
            rec.set('ativa', true)
            txApp.save(rec)
          }
        } else {
          // Fallback para pelo menos a Sede
          const recSede = new Record(congCollection)
          recSede.set('nome', 'Sede')
          recSede.set('titulo', 'Templo Sede')
          recSede.set('subtitulo', 'Sede Administrativa e Templo Central')
          recSede.set('endereco', igreja.endereco || '')
          recSede.set('dias_culto', 'Domingo e Quinta-feira')
          recSede.set('ordem', 1)
          recSede.set('ativa', true)
          txApp.save(recSede)
        }

        // 3. Salvar as Novas Configurações Institucionais e Visuais
        const configKeysToSet = {
          igreja_nome: igreja.nome.trim(),
          igreja_subtitulo: (igreja.subtitulo || '').trim(),
          igreja_denominacao: (igreja.denominacao || igreja.nome).trim(),
          igreja_sigla: (igreja.sigla || '').trim(),
          igreja_endereco: (igreja.endereco || '').trim(),
          igreja_cidade_estado: (igreja.cidadeEstado || '').trim(),
          igreja_telefone: (igreja.telefone || '').trim(),
          igreja_email: (igreja.email || '').trim(),
          igreja_instagram: (igreja.instagram || '').trim(),

          home_hero_title: igreja.nome.trim(),
          home_hero_badge: (igreja.denominacao || igreja.nome).trim(),
          home_hero_subtitle: (
            igreja.heroSubtitle ||
            'Um lugar de adoração, comunhão fraternal e proclamação da Palavra de Deus para toda a família.'
          ).trim(),
          home_hero_endereco: (igreja.endereco ? 'Sede: ' + igreja.endereco : '').trim(),
          igreja_rodape: (
            igreja.textoRodape ||
            igreja.nome +
              '. Uma igreja acolhedora, comprometida com a pregação bíblica e a glória de Deus.'
          ).trim(),

          tema_cor_primaria: (igreja.corPrimaria || '#1E3A5F').trim(),
          tema_cor_destaque: (igreja.corDestaque || '#C9A227').trim(),

          // Rótulos personalizáveis
          rotulo_membros: (igreja.labelMembros || 'Membros').trim(),
          rotulo_congregados: (igreja.labelCongregados || 'Congregados').trim(),
          rotulo_obreiros: (igreja.labelObreiros || 'Corpo de Obreiros').trim(),
          rotulo_dizimistas: (igreja.labelDizimistas || 'Dizimistas & Ofertas').trim(),
          rotulo_unidades: (igreja.labelUnidades || 'Congregações').trim(),
          rotulo_escala: (igreja.labelEscala || 'Escala de Trabalho').trim(),
          rotulo_calendario: (igreja.labelCalendario || 'Calendário de Festas').trim(),
          rotulo_salmos: (igreja.labelSalmos || 'Salmos').trim(),
          rotulo_mural_fotos: (igreja.labelMuralFotos || 'Mural de Fotos').trim(),

          // Dados PIX do novo cliente
          pix_chave_copia_e_cola: (igreja.pixChave || '').trim(),
          pix_titular: (igreja.pixTitular || tesoureiroLogin.name || igreja.nome).trim(),
          pix_banco: (igreja.pixBanco || '').trim(),
          pix_cnpj: (igreja.pixCnpj || igreja.pixChave || '').trim(),
          pix_mensagem: (
            igreja.pixMensagem ||
            'Cada um dê conforme determinou em seu coração, não com tristeza ou por obrigação, pois Deus ama quem dá com alegria.'
          ).trim(),
          pix_versiculo: (igreja.pixVersiculo || '2 Coríntios 9:7').trim(),

          // Liderança inicial de documentos
          lideranca_nome_pastor: (igreja.nomePastor || 'Pastor Presidente').trim(),
          lideranca_cargo_pastor: (igreja.cargoPastor || 'Pastor').trim(),
          lideranca_nome_1_secretario: (igreja.nome1Secretario || '1º Secretário').trim(),
          lideranca_cargo_1_secretario: (igreja.cargo1Secretario || '1º Secretário').trim(),
          lideranca_nome_2_secretario: (igreja.nome2Secretario || '2º Secretário').trim(),
          lideranca_cargo_2_secretario: (igreja.cargo2Secretario || '2º Secretário').trim(),
          mensagem_aniversario: (
            igreja.mensagemAniversario ||
            'A paz do Senhor, {nome}! A ' +
              igreja.nome +
              ' deseja a você muitas felicidades e que Deus abençoe seu novo ano de vida! Jeremias 29:11'
          ).trim(),
        }

        const configCol = txApp.findCollectionByNameOrId('configuracoes')
        for (const chave in configKeysToSet) {
          const valor = configKeysToSet[chave]
          try {
            const existing = txApp.findFirstRecordByData('configuracoes', 'chave', chave)
            existing.set('valor', valor)
            txApp.save(existing)
          } catch (_) {
            const rec = new Record(configCol)
            rec.set('chave', chave)
            rec.set('valor', valor)
            txApp.save(rec)
          }
        }

        // Limpar assinaturas antigas gravadas para não vazar assinaturas da ADTC
        const assinaturasKeys = [
          'assinatura_pastor',
          'assinatura_secretario1',
          'assinatura_secretario2',
        ]
        for (let a = 0; a < assinaturasKeys.length; a++) {
          const k = assinaturasKeys[a]
          try {
            const existing = txApp.findFirstRecordByData('configuracoes', 'chave', k)
            existing.set('arquivo', null)
            existing.set('valor', '')
            txApp.save(existing)
          } catch (_) {}
        }

        // 4. Configurar Logins Iniciais do Novo Cliente
        // Atualizar o próprio usuário chamador (ou encontrar o tesoureiro atual)
        const targetTesoureiro = authRecord
        const novoEmailTesoureiro = tesoureiroLogin.email.trim().toLowerCase()
        const novoNomeTesoureiro = (tesoureiroLogin.name || 'Tesoureiro').trim()
        const novaSenhaTesoureiro = (tesoureiroLogin.password || '').trim()

        targetTesoureiro.setEmail(novoEmailTesoureiro)
        targetTesoureiro.set('name', novoNomeTesoureiro)
        targetTesoureiro.set('perfil', 'tesoureiro')
        targetTesoureiro.set('ativo', true)
        targetTesoureiro.set('emailVisibility', true)
        targetTesoureiro.setVerified(true)
        if (novaSenhaTesoureiro && novaSenhaTesoureiro.length >= 6) {
          targetTesoureiro.setPassword(novaSenhaTesoureiro)
        }
        txApp.save(targetTesoureiro)

        // Limpar ou reconfigurar secretários antigos
        // Encontra todos os usuários existentes exceto o caller e o assistente virtual
        const allUsers = txApp.findRecordsByFilter(
          'users',
          "email != 'assistente@adtc.local'",
          '-created',
          50,
          0,
        )
        for (let u = 0; u < allUsers.length; u++) {
          const otherUser = allUsers[u]
          if (otherUser.id !== targetTesoureiro.id) {
            // Desativa contas antigas da ADTC para segurança
            otherUser.set('ativo', false)
            txApp.save(otherUser)
          }
        }

        // Criar ou reativar novos secretários fornecidos
        const usersCol = txApp.findCollectionByNameOrId('users')
        for (let s = 0; s < secretarios.length; s++) {
          const secData = secretarios[s]
          if (!secData || !secData.email || !secData.email.trim()) continue
          const secEmail = secData.email.trim().toLowerCase()
          let secRec = null
          try {
            secRec = txApp.findAuthRecordByEmail('users', secEmail)
          } catch (_) {}

          if (!secRec) {
            secRec = new Record(usersCol)
            secRec.setEmail(secEmail)
            secRec.setVerified(true)
          }

          secRec.set('name', (secData.name || (s === 0 ? '1º Secretário' : '2º Secretário')).trim())
          secRec.set('perfil', s === 0 ? 'secretario1' : 'secretario2')
          secRec.set('ativo', true)
          secRec.set('emailVisibility', true)
          if (secData.password && secData.password.trim().length >= 6) {
            secRec.setPassword(secData.password.trim())
          } else if (!secRec.id) {
            secRec.setPassword('Igreja@123')
          }
          txApp.save(secRec)
        }
      })

      return e.json(200, {
        success: true,
        message:
          'Sistema implantado com sucesso! Os dados foram zerados, a identidade da nova igreja foi gravada e o login do Tesoureiro foi atualizado.',
      })
    } catch (err) {
      return e.json(500, { error: err?.message || 'Erro ao implantar sistema.' })
    }
  },
  $apis.requireAuth(),
)
