migrate(
  (app) => {
    // Garantir que as chaves de configuração do Modo Revenda existam na coleção 'configuracoes'
    const configCol = app.findCollectionByNameOrId('configuracoes')

    const defaultConfigs = [
      { chave: 'igreja_nome', valor: 'ADTC Campanário' },
      { chave: 'igreja_subtitulo', valor: 'Assembleia de Deus • Templo Central' },
      { chave: 'igreja_denominacao', valor: 'Igreja Evangélica Assembleia de Deus Templo Central' },
      { chave: 'igreja_sigla', valor: 'ADTC' },
      { chave: 'igreja_endereco', valor: 'Rua Alberto Batista Fontenele, nº 141, Campanário' },
      { chave: 'igreja_cidade_estado', valor: 'Uruoca / Campanário - CE' },
      { chave: 'igreja_telefone', valor: '(88) 99368-2458' },
      { chave: 'igreja_email', valor: 'adtccampanario@gmail.com' },
      {
        chave: 'igreja_instagram',
        valor: 'https://www.instagram.com/adtccampanario?stkn=ODNndm02a25xN25r',
      },
      { chave: 'tema_cor_primaria', valor: '#1E3A5F' },
      { chave: 'tema_cor_destaque', valor: '#C9A227' },
      { chave: 'rotulo_membros', valor: 'Membros' },
      { chave: 'rotulo_congregados', valor: 'Congregados' },
      { chave: 'rotulo_obreiros', valor: 'Corpo de Obreiros' },
      { chave: 'rotulo_dizimistas', valor: 'Dizimistas & Ofertas' },
      { chave: 'rotulo_unidades', valor: 'Congregações' },
      { chave: 'rotulo_escala', valor: 'Escala de Trabalho' },
      { chave: 'rotulo_calendario', valor: 'Calendário de Festas' },
      { chave: 'rotulo_salmos', valor: 'Salmos Musicados' },
      { chave: 'rotulo_mural_fotos', valor: 'Mural de Fotos' },
      {
        chave: 'igreja_rodape',
        valor:
          'Igreja Evangélica Assembleia de Deus Templo Central. Uma igreja acolhedora, comprometida com a pregação bíblica, comunhão fraternal e a glória de Deus.',
      },
    ]

    for (let i = 0; i < defaultConfigs.length; i++) {
      const item = defaultConfigs[i]
      try {
        app.findFirstRecordByData('configuracoes', 'chave', item.chave)
      } catch (_) {
        const rec = new Record(configCol)
        rec.set('chave', item.chave)
        rec.set('valor', item.valor)
        app.save(rec)
      }
    }
  },
  (app) => {
    // Reversão opcional (não remove chaves para preservar integridade de dados)
  },
)
