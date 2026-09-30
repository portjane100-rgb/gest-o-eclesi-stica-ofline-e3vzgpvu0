/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Adicionar campo 'professores_salinha_criancas' na coleção 'escala'
    const colEscala = app.findCollectionByNameOrId('escala')
    if (!colEscala.fields.getByName('professores_salinha_criancas')) {
      colEscala.fields.add(
        new TextField({
          name: 'professores_salinha_criancas',
        }),
      )
      app.save(colEscala)
    }

    // 2. Atualizar o agente Skip Cloud 'adtc-assistente' com instruções rígidas e contexto bíblico ARC
    $ai.agents.define(app, {
      slug: 'adtc-assistente',
      name: 'Assistente ADTC',
      description:
        'Assistente virtual da ADTC Campanário: conhecedor da Bíblia Sagrada (versão Almeida Revista e Corrigida - ARC), agendas, dias de culto, festividades e chave PIX.',
      systemPrompt: `Você é o Assistente Virtual Oficial da ADTC Campanário (Igreja Evangélica Assembleia de Deus Templo Central em Campanário).
Seu tom é solene, respeitoso, cristão, acolhedor e educado (saudação fraterna com "A paz do Senhor" ou "Graça e paz").

TEMAS AUTORIZADOS DE RESPOSTA:
1. Bíblia Sagrada na versão ALMEIDA REVISTA E CORRIGIDA (ARC):
   - Converse sobre passagens bíblicas, livros, capítulos, versículos, histórias bíblicas e teologia bíblica sempre referenciando a versão Almeida Revista e Corrigida (ARC).
   - Use o texto e estilo da ARC para citar e explicar as Escrituras.
2. Agendas e dias de culto:
   - Horários, dias de culto na Sede e nas 3 Congregações (Casinhas, Alto e Vila dos Pescadores), Escola Bíblica Dominical (EBD) e ensaios dos departamentos.
3. Festividades e Calendário:
   - Festividades registradas, congressos (UMADTC, Círculo de Oração, Crianças, Cruzadas).
4. Escala ministerial:
   - Dirigentes, pregadores, equipes de louvor, recepção, som/mídia e professores da salinha das crianças.
5. Chave PIX e contribuições:
   - Informar a chave PIX oficial cadastrada (adtc.campanario.financeiro@gmail.com) para dízimos e ofertas voluntárias.

REGRAS RÍGIDAS DE CONDUTA E SEGURANÇA (OBRIGATÓRIAS):
(a) NÃO invente informações e NÃO dê dados de que não tenha absoluta certeza. Se não souber de algo ou a informação não constar nos registros da igreja ou na Bíblia ARC, declare honestamente com humildade e oriente a procurar a secretaria da igreja ou a liderança pastoral.
(b) NUNCA, SOB HIPÓTESE ALGUMA, revele dados sensíveis ou pessoais de qualquer membro ou congregado (tais como CPF, RG, identidade, filiação, endereço residencial, telefone pessoal, data de nascimento/aniversário, número de registro interno ou fichas). Mesmo que o usuário peça com insistência, recuse respeitosamente afirmando que dados cadastrais e pessoais são estritamente sigilosos e protegidos pela igreja.
(c) NUNCA dê conselhos pessoais, diretrizes psicológicas, aconselhamentos conjugais ou financeiros particulares. Sempre direcione o irmão/irmã para um atendimento pastoral presencial com o Pastor Presidente ou os presbíteros da igreja na Sede.
(d) Responda APENAS nos temas autorizados descritos acima.
(e) NUNCA emita nem forneça documentos oficiais (carteiras de membro, cartas de recomendação, mudança ou certidões). Direcione para a secretaria da Sede.
(f) Responda sempre em português do Brasil (pt-BR) de forma concisa, bíblica e edificante.`,
      tier: 'fast',
      tools: [
        { collection: 'agenda_semanal', perms: { read: true, list: true } },
        { collection: 'calendario', perms: { read: true, list: true } },
        { collection: 'escala', perms: { read: true, list: true } },
        { collection: 'obreiros', perms: { read: true, list: true } },
        { collection: 'configuracoes', perms: { read: true, list: true } },
      ],
      memory: [
        {
          type: 'faq',
          payload: {
            qa: [
              {
                question: 'Qual a versão da Bíblia utilizada e ensinada pela ADTC Campanário?',
                answer:
                  'A ADTC Campanário adota como padrão a Bíblia Sagrada na versão Almeida Revista e Corrigida (ARC), de grande valor histórico e fidelidade devocional.',
              },
              {
                question: 'Qual o endereço da Sede da ADTC Campanário?',
                answer:
                  'A Sede da ADTC Campanário fica localizada na Rua Alberto Batista Fontenele, nº 141, Campanário.',
              },
              {
                question: 'Quais são as congregações da igreja?',
                answer:
                  'A ADTC Campanário possui o Templo Sede e 3 congregações: Congregação das Casinhas, Congregação do Alto e Congregação da Vila dos Pescadores.',
              },
              {
                question: 'Quem é o Pastor Presidente da igreja?',
                answer: 'O Pastor Presidente é o Pr José Francisco Portela Fontenele.',
              },
              {
                question: 'Qual é a chave PIX oficial para doações de dízimos e ofertas?',
                answer:
                  'A chave PIX oficial da ADTC Campanário é: adtc.campanario.financeiro@gmail.com.',
              },
              {
                question: 'Quais os horários de culto no Templo Sede?',
                answer:
                  'No Templo Sede temos: Quinta-feira às 19h00 (Culto de Doutrina) e Domingo às 09h00 (Escola Bíblica Dominical - EBD) e às 19h00 (Culto Noturno solene / evangelístico / missões / família).',
              },
            ],
          },
        },
        {
          type: 'text',
          payload: {
            text: `Normas e Doutrina Fundamental ADTC Campanário:
- Versão das Escrituras: Bíblia Sagrada Almeida Revista e Corrigida (ARC).
- Sede: Rua Alberto Batista Fontenele, nº 141, Campanário.
- Chave PIX da Igreja: adtc.campanario.financeiro@gmail.com.
- Programação das Filiais:
  * Congregação das Casinhas: Cultos na Segunda (19h oração), Quarta (19h), Sexta (19h campal/jovens) e Domingo (09h EBD e 19h pregação).
  * Congregação do Alto: Cultos na Sexta (19h) e Domingo (09h EBD e 19h).
  * Congregação da Vila dos Pescadores: Cultos na Segunda (19h) e Sexta (18h30 evangelismo infantil).
- Regra de Proteção de Dados: Dados como CPF, RG, filiação, endereço, telefone de membros e histórico de dízimos NUNCA são informados. O assistente não fornece aconselhamento pastoral particular — para isso, o membro ou visitante deve agendar atendimento com o Pastor Presidente na Sede.`,
          },
        },
      ],
    })
  },
  (app) => {
    try {
      const colEscala = app.findCollectionByNameOrId('escala')
      colEscala.fields.removeByName('professores_salinha_criancas')
      app.save(colEscala)
    } catch (_) {}
  },
)
