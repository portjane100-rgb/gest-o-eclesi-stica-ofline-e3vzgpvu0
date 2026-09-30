export interface BibleVerseARC {
  livro: string
  capitulo: number
  versiculo: number
  texto: string
  testamento: 'AT' | 'NT'
  tema?: string
  reflexao?: string
}

export const BIBLIA_ARC_DESTAQUES: BibleVerseARC[] = [
  {
    livro: 'Salmos',
    capitulo: 23,
    versiculo: 1,
    testamento: 'AT',
    tema: 'Cuidado e Provisão Divina',
    texto: 'O SENHOR é o meu pastor; nada me faltará.',
    reflexao:
      'Em qualquer vale ou momento de incerteza, o Bom Pastor guia os nossos passos com graça infinita e nos conduz a águas de descanso.',
  },
  {
    livro: 'Salmos',
    capitulo: 91,
    versiculo: 1,
    testamento: 'AT',
    tema: 'Refúgio e Proteção',
    texto: 'Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.',
    reflexao:
      'A presença de Deus é o nosso abrigo mais seguro. Permanecer nEle é ter paz mesmo em tempos difíceis.',
  },
  {
    livro: 'Salmos',
    capitulo: 121,
    versiculo: 1,
    testamento: 'AT',
    tema: 'Socorro e Fidelidade',
    texto:
      'Levantarei os meus olhos para os montes, de onde vem o meu socorro. O meu socorro vem do SENHOR, que fez o céu e a terra.',
    reflexao:
      'Nosso olhar não deve se fixar nas dificuldades presentes, mas nAquele cujo poder criou os céus e a terra.',
  },
  {
    livro: 'Salmos',
    capitulo: 119,
    versiculo: 105,
    testamento: 'AT',
    tema: 'A Palavra como Luz',
    texto: 'Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.',
    reflexao:
      'As Sagradas Escrituras fornecem a direção límpida e segura para as decisões do nosso cotidiano.',
  },
  {
    livro: 'Salmos',
    capitulo: 46,
    versiculo: 1,
    testamento: 'AT',
    tema: 'Fortaleza Presente',
    texto: 'Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.',
    reflexao:
      'Deus não se atrasa nem se ausenta; no momento mais oportuno Ele manifesta o Seu socorro bendito.',
  },
  {
    livro: 'Provérbios',
    capitulo: 3,
    versiculo: 5,
    testamento: 'AT',
    tema: 'Confiança Inabalável',
    texto:
      'Confia no SENHOR de todo o teu coração e não te estribes no teu próprio entendimento. Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas.',
    reflexao:
      'A rendição sincera ao senhorio de Deus traz clareza e alinha o nosso coração com o propósito eterno.',
  },
  {
    livro: 'Isaías',
    capitulo: 40,
    versiculo: 31,
    testamento: 'AT',
    tema: 'Renovação de Forças',
    texto:
      'Mas os que esperam no SENHOR renovarão as suas forças e subirão com asas como águias; correrão e não se cansarão; caminharão e não se fatigarão.',
    reflexao:
      'A espera no Senhor não é estagnação, é fortalecimento espiritual sobrenatural para alçar novos voos de fé.',
  },
  {
    livro: 'Isaías',
    capitulo: 41,
    versiculo: 10,
    testamento: 'AT',
    tema: 'Coragem e Presença',
    texto:
      'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te esforço, e te ajudo, e te sustento com a destra da minha justiça.',
    reflexao:
      'O Deus Todo-Poderoso segura a tua mão direita; descanse o coração na firmeza de Suas promessas.',
  },
  {
    livro: 'Jeremias',
    capitulo: 29,
    versiculo: 11,
    testamento: 'AT',
    tema: 'Planos de Paz',
    texto:
      'Porque eu bem sei os pensamentos que penso de vós, diz o SENHOR; pensamentos de paz e não de mal, para vos dar o fim que esperais.',
    reflexao:
      'O Senhor arquiteta cada detalhe de nossa trajetória com amor, esperança e futuro próspero na fé.',
  },
  {
    livro: 'Lamentações',
    capitulo: 3,
    versiculo: 22,
    testamento: 'AT',
    tema: 'Misericórdia Renovada',
    texto:
      'As misericórdias do SENHOR são a causa de não sermos consumidos; porque as suas misericórdias não têm fim; novas são cada manhã; grande é a tua fidelidade.',
    reflexao:
      'A cada amanhecer recebemos uma nova porção da graça e fidelidade divinas para recomeçar em vitória.',
  },
  {
    livro: 'Josué',
    capitulo: 1,
    versiculo: 9,
    testamento: 'AT',
    tema: 'Esforço e Ânimo',
    texto:
      'Não to mandei eu? Esforça-te e tem bom ânimo; não pasmes, nem te espantes, porque o SENHOR, teu Deus, é contigo, por onde quer que andares.',
    reflexao:
      'A ordem divina de ter bom ânimo vem acompanhada da garantia de Sua companhia inseparável.',
  },
  {
    livro: 'Mateus',
    capitulo: 6,
    versiculo: 33,
    testamento: 'NT',
    tema: 'Prioridade do Reino',
    texto:
      'Mas buscai primeiro o Reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.',
    reflexao:
      'Quando o Reino de Deus se torna o centro absoluto de nossas prioridades, todo o restante encontra o seu devido lugar.',
  },
  {
    livro: 'Mateus',
    capitulo: 11,
    versiculo: 28,
    testamento: 'NT',
    tema: 'Descanso em Cristo',
    texto: 'Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.',
    reflexao:
      'Jesus é o único que tira o peso da alma e concede paz verdadeira que o mundo não pode oferecer.',
  },
  {
    livro: 'João',
    capitulo: 3,
    versiculo: 16,
    testamento: 'NT',
    tema: 'O Grande Amor de Deus',
    texto:
      'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
    reflexao:
      'A maior declaração de amor do universo foi selada na cruz do Calvário para a nossa salvação eterna.',
  },
  {
    livro: 'João',
    capitulo: 14,
    versiculo: 27,
    testamento: 'NT',
    tema: 'A Paz de Cristo',
    texto:
      'Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá. Não se turbe o vosso coração, nem se atemorize.',
    reflexao:
      'A paz de Jesus não depende das circunstâncias externas; ela guarda a nossa mente e coração.',
  },
  {
    livro: 'João',
    capitulo: 14,
    versiculo: 6,
    testamento: 'NT',
    tema: 'O Caminho, a Verdade e a Vida',
    texto:
      'Disse-lhe Jesus: Eu sou o caminho, e a verdade, e a vida. Ninguém vem ao Pai senão por mim.',
    reflexao: 'Cristo é a revelação plena de Deus e o único mediador entre Deus e a humanidade.',
  },
  {
    livro: 'Romanos',
    capitulo: 8,
    versiculo: 28,
    testamento: 'NT',
    tema: 'Propósito Soberano',
    texto:
      'E sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus, daqueles que são chamados por seu decreto.',
    reflexao:
      'Até as lutas e provas são trabalhadas pelas mãos soberanas do Pai para forjar em nós o caráter de Cristo.',
  },
  {
    livro: 'Romanos',
    capitulo: 8,
    versiculo: 37,
    testamento: 'NT',
    tema: 'Mais que Vencedores',
    texto: 'Mas em todas estas coisas somos mais do que vencedores, por aquele que nos amou.',
    reflexao:
      'Nossa vitória não procede de mérito pessoal, mas do sacrifício perfeito dAquele que nos amou até o fim.',
  },
  {
    livro: 'Romanos',
    capitulo: 12,
    versiculo: 2,
    testamento: 'NT',
    tema: 'Transformação da Mente',
    texto:
      'E não vos conformeis com este mundo, mas transformai-vos pela renovação do vosso entendimento, para que experimenteis qual seja a boa, agradável e perfeita vontade de Deus.',
    reflexao:
      'Uma mente renovada pela Palavra de Deus nos capacita a discernir e viver o melhor de Deus nesta terra.',
  },
  {
    livro: '1 Coríntios',
    capitulo: 13,
    versiculo: 13,
    testamento: 'NT',
    tema: 'A Excelência do Amor',
    texto:
      'Agora, pois, permanecem a fé, a esperança e o amor, estes três; mas o maior destes é o amor.',
    reflexao:
      'O amor genuíno, fruto do Espírito Santo, é a marca suprema da maturidade do discípulo de Jesus.',
  },
  {
    livro: '2 Coríntios',
    capitulo: 5,
    versiculo: 17,
    testamento: 'NT',
    tema: 'Nova Criação',
    texto:
      'Assim que, se alguém está em Cristo, nova criatura é: as coisas velhas já passaram; eis que tudo se fez novo.',
    reflexao:
      'Em Cristo nosso passado é perdoado, nosso presente é redimido e o nosso futuro está assegurado nos céus.',
  },
  {
    livro: 'Gálatas',
    capitulo: 5,
    versiculo: 22,
    testamento: 'NT',
    tema: 'O Fruto do Espírito',
    texto:
      'Mas o fruto do Espírito é: amor, gozo, paz, longanimidade, benignidade, bondade, fidelidade, mansidão, temperança.',
    reflexao:
      'O caráter cristão floresce quando andamos em comunhão diária com o Santo Espírito de Deus.',
  },
  {
    livro: 'Efésios',
    capitulo: 2,
    versiculo: 8,
    testamento: 'NT',
    tema: 'Salvação pela Graça',
    texto: 'Porque pela graça sois salvos, por meio da fé; e isso não vem de vós; é dom de Deus.',
    reflexao:
      'A salvação é um presente imerecido da misericórdia de Deus, recebido unicamente pela fé em Jesus.',
  },
  {
    livro: 'Filipenses',
    capitulo: 4,
    versiculo: 6,
    testamento: 'NT',
    tema: 'Paz pela Oração',
    texto:
      'Não estejais inquietos por coisa alguma; antes, as vossas petições sejam em tudo conhecidas diante de Deus, pela oração e súplicas, com ação de graças. E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos sentimentos em Cristo Jesus.',
    reflexao:
      'Troque a ansiedade pela oração convicta e experimente a paz celestial que blinda o coração.',
  },
  {
    livro: 'Filipenses',
    capitulo: 4,
    versiculo: 13,
    testamento: 'NT',
    tema: 'Capacitação Divina',
    texto: 'Posso todas as coisas naquele que me fortalece.',
    reflexao:
      'Não se trata de autossuficiência, mas de saber que em Cristo temos suprimento pleno para cada missão que Ele nos confia.',
  },
  {
    livro: 'Colossenses',
    capitulo: 3,
    versiculo: 23,
    testamento: 'NT',
    tema: 'Trabalho para o Senhor',
    texto:
      'E, tudo quanto fizerdes, fazei-o de todo o coração, como ao Senhor e não aos homens, sabendo que recebereis do Senhor o galardão da herança.',
    reflexao:
      'Toda atividade, serviço na igreja ou no lar deve ser um ato sincero de adoração a Deus.',
  },
  {
    livro: '1 Tessalonicenses',
    capitulo: 5,
    versiculo: 16,
    testamento: 'NT',
    tema: 'Alegria e Gratidão Contínuas',
    texto:
      'Regozijai-vos sempre. Orai sem cessar. Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco.',
    reflexao:
      'A gratidão contínua e a vida devocional fervorosa abrem as comportas da vitória espiritual.',
  },
  {
    livro: 'Hebreus',
    capitulo: 11,
    versiculo: 1,
    testamento: 'NT',
    tema: 'A Certeza da Fé',
    texto:
      'Ora, a fé é o firme fundamento das coisas que se esperam e a prova das coisas que se não veem.',
    reflexao: 'A fé genuína ancora nossa esperança na fidelidade inerrante dAquele que prometeu.',
  },
  {
    livro: 'Hebreus',
    capitulo: 12,
    versiculo: 2,
    testamento: 'NT',
    tema: 'Olhando para Jesus',
    texto:
      'Olhando para Jesus, autor e consumador da fé, o qual, pelo gozo que lhe estava proposto, suportou a cruz, desprezando a afronta, e assentou-se à destra do trono de Deus.',
    reflexao:
      'Mantenha os olhos fixos em Cristo, o modelo supremo de perseverança, amor e triunfo.',
  },
  {
    livro: 'Tiago',
    capitulo: 1,
    versiculo: 5,
    testamento: 'NT',
    tema: 'Sabedoria do Alto',
    texto:
      'E, se algum de vós tem falta de sabedoria, peça-a a Deus, que a todos dá liberalmente e não o lança em rosto; e ser-lhe-á dada.',
    reflexao:
      'O Senhor tem prazer em acolher nossas orações e conceder discernimento santo para cada encruzilhada da vida.',
  },
  {
    livro: '1 Pedro',
    capitulo: 5,
    versiculo: 7,
    testamento: 'NT',
    tema: 'Entregando os Cuidados',
    texto: 'Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.',
    reflexao:
      'Deus cuida minuciosamente de ti. Deposite aos pés dEle cada peso e descanse na Sua providência.',
  },
  {
    livro: 'Apocalipse',
    capitulo: 21,
    versiculo: 4,
    testamento: 'NT',
    tema: 'Esperança Eterna',
    texto:
      'E Deus limpará de seus olhos toda lágrima, e não haverá mais morte, nem pranto, nem clamor, nem dor, porque já as primeiras coisas são passadas.',
    reflexao:
      'A nossa esperança transcende este mundo presente: a eternidade com o Senhor será de júbilo eterno e sem dor.',
  },
]

export const LIVROS_BIBLIA_ARC = [
  'Gênesis',
  'Êxodo',
  'Levítico',
  'Números',
  'Deuteronômio',
  'Josué',
  'Juízes',
  'Rute',
  '1 Samuel',
  '2 Samuel',
  '1 Reis',
  '2 Reis',
  '1 Crônicas',
  '2 Crônicas',
  'Esdras',
  'Neemias',
  'Ester',
  'Jó',
  'Salmos',
  'Provérbios',
  'Eclesiastes',
  'Cantares de Salomão',
  'Isaías',
  'Jeremias',
  'Lamentações de Jeremias',
  'Ezequiel',
  'Daniel',
  'Oseias',
  'Joel',
  'Amós',
  'Obadias',
  'Jonas',
  'Miqueias',
  'Naum',
  'Habacuque',
  'Sofonias',
  'Ageu',
  'Zacarias',
  'Malaquias',
  'Mateus',
  'Marcos',
  'Lucas',
  'João',
  'Atos dos Apóstolos',
  'Romanos',
  '1 Coríntios',
  '2 Coríntios',
  'Gálatas',
  'Efésios',
  'Filipenses',
  'Colossenses',
  '1 Tessalonicenses',
  '2 Tessalonicenses',
  '1 Timóteo',
  '2 Timóteo',
  'Tito',
  'Filemom',
  'Hebreus',
  'Tiago',
  '1 Pedro',
  '2 Pedro',
  '1 João',
  '2 João',
  '3 João',
  'Judas',
  'Apocalipse',
]

/**
 * Retorna o versículo do dia determinístico a partir da data atual (versão ARC).
 * A rotação é calculada baseada no dia do ano ou data no fuso de Brasília.
 */
export function getVersiculoDoDiaARC(date: Date = new Date()): BibleVerseARC {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const diff = date.getTime() - startOfYear.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  const dayOfYear = Math.floor(diff / oneDay)

  const index = Math.abs(dayOfYear) % BIBLIA_ARC_DESTAQUES.length
  return BIBLIA_ARC_DESTAQUES[index]
}

/**
 * Busca versículos da versão ARC por termo chave ou referência
 */
export function buscarVersiculoARC(termo: string): BibleVerseARC[] {
  const normalizado = termo.trim().toLowerCase()
  if (!normalizado) return BIBLIA_ARC_DESTAQUES.slice(0, 5)

  return BIBLIA_ARC_DESTAQUES.filter(
    (v) =>
      v.livro.toLowerCase().includes(normalizado) ||
      v.texto.toLowerCase().includes(normalizado) ||
      (v.tema && v.tema.toLowerCase().includes(normalizado)) ||
      (v.reflexao && v.reflexao.toLowerCase().includes(normalizado)),
  )
}
