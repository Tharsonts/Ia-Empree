import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const API_KEY = 'AIzaSyDJnQa8YfCsMM79HWn8SYzTQfeXtZahOSM';

const perguntas = [
  'Qual sua idade?',
  'Você gosta de aprender novas tecnologias ou prefere tarefas mais tradicionais?',
  'Você se sente mais confortável resolvendo problemas lógicos/matemáticos ou lidando com pessoas e comunicação?',
  'Prefere trabalhar em equipe, sozinho ou tanto faz?',
  'Você se imagina trabalhando em escritório, remotamente ou em campo?',
  'Tem interesse em aprender inglês ou outras línguas?',
  'Prefere projetos de longo prazo ou tarefas rápidas e variadas?',
  'Você gosta de criar (ex: design, conteúdo, arte) ou prefere analisar e organizar informações?',
  'Tem interesse em segurança digital, redes ou infraestrutura de computadores?'
];

// Controle de sessão simples em memória
const conversas = {};

// Gatilhos refinados para sugestão de área
function analisarPerfil(respostas) {
  const idade = respostas[0]?.toLowerCase() || '';
  const tecnologia = respostas[1]?.toLowerCase() || '';
  const logicaOuPessoas = respostas[2]?.toLowerCase() || '';
  const equipe = respostas[3]?.toLowerCase() || '';
  const local = respostas[4]?.toLowerCase() || '';
  const ingles = respostas[5]?.toLowerCase() || '';
  const projetos = respostas[6]?.toLowerCase() || '';
  const criacaoOuAnalise = respostas[7]?.toLowerCase() || '';
  const segRedes = respostas[8]?.toLowerCase() || '';

  // Cibersegurança
  if (segRedes.includes('sim') || segRedes.includes('segurança') || segRedes.includes('infraestrutura')) {
    return 'Cibersegurança';
  }
  // Ciência de Dados
  if (logicaOuPessoas.includes('lógico') || logicaOuPessoas.includes('matemático')) {
    if (criacaoOuAnalise.includes('analisar') || criacaoOuAnalise.includes('organizar')) {
      return 'Ciência de Dados';
    }
  }
  // Desenvolvimento de Software
  if (tecnologia.includes('novas') && (projetos.includes('longo') || projetos.includes('projetos'))) {
    return 'Desenvolvimento de Software';
  }
  // Marketing Digital
  if (criacaoOuAnalise.includes('criar') || criacaoOuAnalise.includes('design') || criacaoOuAnalise.includes('conteúdo')) {
    if (logicaOuPessoas.includes('pessoas') || equipe.includes('equipe')) {
      return 'Marketing Digital';
    }
  }
  // Suporte Técnico
  if (tecnologia.includes('tradicionais') && (local.includes('campo') || local.includes('escritório'))) {
    return 'Suporte Técnico';
  }
  // Programação Web
  if (local.includes('remoto')) {
    return 'Programação Web';
  }
  // UX/UI Design
  if (criacaoOuAnalise.includes('design') || criacaoOuAnalise.includes('arte')) {
    return 'UX/UI Design';
  }
  // Exploração em TI
  return 'Exploração em TI';
}

app.post('/api/pergunta', (req, res) => {
  const { sessionId, resposta } = req.body;
  if (!res.locals) res.locals = {};
  if (!res.locals.conversas) res.locals.conversas = {};
  if (!conversas[sessionId]) conversas[sessionId] = { etapa: 0, respostas: [] };

  if (typeof resposta === 'string') conversas[sessionId].respostas.push(resposta);

  const etapa = conversas[sessionId].etapa;
  if (etapa < perguntas.length) {
    const pergunta = perguntas[etapa];
    conversas[sessionId].etapa++;
    return res.json({ pergunta, finished: false });
  } else {
    return res.json({ finished: true });
  }
});

app.post('/api/final', async (req, res) => {
  const { sessionId } = req.body;
  const respostas = conversas[sessionId]?.respostas || [];
  const sugestao = analisarPerfil(respostas);
  let prompt = `Você é um assistente de carreira para jovens de baixa renda do ensino médio, especialista em orientar para áreas de tecnologia. Com base nas respostas abaixo, gere uma sugestão de carreira em TI para esse jovem, com explicação motivacional, linguagem acessível, e cite exemplos de profissões e caminhos de estudo diferentes para essa área. Seja empático, breve e inspirador. Use um emoji relacionado à área sugerida no início da resposta. Responda em até 3 parágrafos, sempre de forma positiva e acolhedora.\n\n`;
  perguntas.forEach((p, i) => {
    prompt += `Pergunta: ${p}\nResposta: ${respostas[i] || ''}\n`;
  });
  prompt += `\nSugestão de área de TI com base nas respostas: ${sugestao}.\n`;
  prompt += '\nFormato da resposta:\n[emoji] <Sugestão de carreira>\nExplicação motivacional e breve sobre a área, por que combina com o perfil, e incentive a buscar os cursos gratuitos recomendados abaixo. Cite exemplos de profissões e caminhos de estudo diferentes.';

  // Modelo Gemini correto
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${API_KEY}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    // Log para debug
    console.log('Resposta Gemini:', JSON.stringify(data));
    let texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto || texto.trim().length < 10) {
      texto = `✨ Jovem, a área de tecnologia tem espaço para todos! Com seu perfil, você pode se destacar em áreas como ${sugestao}, Suporte Técnico, Desenvolvimento, Ciência de Dados ou Marketing Digital. O importante é acreditar no seu potencial e buscar sempre aprender mais. Conte com a tecnologia para transformar seu futuro! Exemplos de profissões: Analista de Suporte, Cientista de Dados, Desenvolvedor Web, Designer UX/UI, Analista de Marketing Digital. Caminhos de estudo: cursos online gratuitos, graduação em TI, bootcamps, certificações técnicas.`;
    }
    res.json({ text: texto });
  } catch (e) {
    res.status(500).json({ text: `✨ Jovem, a área de tecnologia tem espaço para todos! Com seu perfil, você pode se destacar em áreas como ${sugestao}, Suporte Técnico, Desenvolvimento, Ciência de Dados ou Marketing Digital. O importante é acreditar no seu potencial e buscar sempre aprender mais. Conte com a tecnologia para transformar seu futuro! Exemplos de profissões: Analista de Suporte, Cientista de Dados, Desenvolvedor Web, Designer UX/UI, Analista de Marketing Digital. Caminhos de estudo: cursos online gratuitos, graduação em TI, bootcamps, certificações técnicas.` });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => console.log('Backend rodando em http://localhost:3000')); 