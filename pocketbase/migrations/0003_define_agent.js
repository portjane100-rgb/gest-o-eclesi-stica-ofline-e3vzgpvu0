/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'adtc-assistente',
      name: 'Assistente ADTC',
      description:
        'Assistente virtual acolhedor, respeitoso e cristão que conhece a ADTC Campanário.',
      systemPrompt: `Você é o Assistente Virtual da ADTC Campanário (Igreja Evangélica Assembleia de Deus Templo Central em Campanário).
Seu tom é solene, respeitoso, cristão, acolhedor e educado (saudação com "A paz do Senhor" ou "Graça e paz").
Você possui pleno conhecimento institucional sobre a ADTC Campanário:
- Endereço da Sede: Rua Alberto Batista Fontenele, nº 141, Campanário.
- Unidades: Templo Sede e 3 Congregações filiais: "Congregação das Casinhas", "Congregação do Alto", "Congregação da Vila dos Pescadores".
- Liderança: Pastor Presidente Pr. Francisco Oliveira Fontenele, auxiliado por Evangelistas, Presbíteros, Diáconos e Auxiliares de Trabalho.
- Agenda e Liturgia semanal de cada unidade (cultos de doutrina, oração, família, missões, santa ceia, mocidade, crianças, EBD, etc.).
- Doações e Dízimos via PIX: informe com clareza a chave PIX ou oriente que dízimos e ofertas podem ser entregues na Sede.

REGRAS DE PROTEÇÃO E PRIVACIDADE:
1. NUNCA revele nomes de dizimistas ou valores financeiros. Se perguntado sobre dízimos de membros ou dados financeiros sigilosos, responda com respeito que tais dados são sigilosos e geridos exclusivamente pela tesouraria da igreja.
2. NUNCA emita nem forneça documentos oficiais (carteiras de membro, cartas de recomendação, mudança ou certificados de apresentação de crianças). Direcione sempre qualquer solicitação documental à secretaria da igreja na Sede.
3. Responda em português (pt-BR) de forma concisa, clara e amorosa.`,
      tier: 'fast',
      tools: [
        { collection: 'agenda_semanal', perms: { read: true, list: true } },
        { collection: 'obreiros', perms: { read: true, list: true } },
        { collection: 'calendario', perms: { read: true, list: true } },
        { collection: 'escala', perms: { read: true, list: true } },
        { collection: 'configuracoes', perms: { read: true, list: true } },
      ],
      memory: [
        {
          type: 'faq',
          payload: {
            qa: [
              {
                question: 'Qual o endereço da Sede da ADTC Campanário?',
                answer:
                  'A Sede da ADTC Campanário fica localizada na Rua Alberto Batista Fontenele, nº 141, Campanário.',
              },
              {
                question: 'Quais são as congregações da igreja?',
                answer:
                  'A ADTC Campanário possui a Sede e 3 congregações: Congregação das Casinhas, Congregação do Alto e Congregação da Vila dos Pescadores.',
              },
              {
                question: 'Quem é o Pastor Presidente da igreja?',
                answer: 'O Pastor Presidente é o Pr. Francisco Oliveira Fontenele.',
              },
              {
                question: 'Como posso contribuir com dízimos ou ofertas via PIX?',
                answer:
                  'Você pode contribuir através da chave PIX oficial cadastrada na igreja (adtc.campanario.financeiro@gmail.com), disponível na página de Doações PIX, ou pessoalmente na tesouraria da Sede.',
              },
              {
                question: 'Como solicitar carta de recomendação ou carteira de membro?',
                answer:
                  'Documentos oficiais como carteira de membro, carta de recomendação e carta de mudança devem ser solicitados diretamente à Secretaria da Igreja na Sede.',
              },
              {
                question: 'Quais são os cultos de domingo na Sede?',
                answer:
                  'Na Sede, aos domingos temos a Escola Bíblica Dominical (EBD) às 09:00 e o Culto Noturno às 19:00 (1º Domingo Culto de Missões, 2º Culto Evangelístico, 3º Culto da Família, 4º e 5º Culto Evangelístico).',
              },
            ],
          },
        },
        {
          type: 'text',
          payload: {
            text: `Horários litúrgicos da ADTC Campanário:
SEDE (Rua Alberto Batista Fontenele, 141):
- Segunda: 07:30 Consagração de Senhoras (Oração), 18:00 Ensaio das Crianças, 19:00 Ensaio dos Adolescentes.
- Terça: 19:00 Ensaio do Coral (exceto 3ª terça), 3ª terça 19:00 Culto de Senhoras.
- Quarta: 15:00 Tarde de Louvor, 19:00 Ensaio de Senhoras.
- Quinta: 19:00 Culto de Doutrina.
- Sexta: 15:00 Círculo de Oração, 19:00 Ensaio da Banda.
- Sábado: 09:00 Aula de Música, 15:00 Ensaio da Mocidade, 1º Sábado 19:00 Culto de Crianças, 2º Sábado 19:00 Culto de Santa Ceia, 3º Sábado Livre, 4º Sábado 19:00 Culto de Mocidade.
- Domingo: 09:00 EBD, 19:00 Culto da Noite (Missões, Evangelístico, Família).

CASINHAS:
- Segunda: 19:00–20:00 Culto de Oração.
- Quarta: 19:00 Culto de Pregação regular, 2ª quarta Santa Ceia, 3ª quarta Culto de Senhoras.
- Sexta: 19:00 Culto Campal, 3ª sexta Culto de Jovens.
- Domingo: 09:00 EBD, 19:00 Culto de Pregação.

ALTO:
- Sexta: 19:00 (1ª sexta Santa Ceia, 4ª sexta Mocidade, demais Doutrina).
- Domingo: 09:00 EBD, 19:00 Culto Evangelístico.

VILA DOS PESCADORES:
- Segunda: 19:00 Culto Evangelístico.
- Sexta: 18:30 Evangelismo Infantil.`,
          },
        },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'adtc-assistente')
  },
)
