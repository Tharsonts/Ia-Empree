const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const API_KEY = 'AIzaSyDJnQa8YfCsMM79HWn8SYzTQfeXtZahOSM';

const perguntas = [
  'Qual sua idade?',
  'Você gosta de tecnologia?',
  'Você gosta de lógica/matemática?',
  'Você prefere trabalhar com pessoas ou com máquinas?'
];

// Controle de sessão simples em memória
const conversas = {};

app.post('/api/pergunta', (req, res) => {
  const { sessionId, resposta } = req.body;
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
  let prompt = 'Você é um assistente de carreira para jovens de baixa renda do ensino médio, especialista em orientar para áreas de tecnologia. Com base nas respostas abaixo, gere uma sugestão de carreira em TI, com explicação motivacional, linguagem acessível, e cite exemplos de caminhos possíveis. Seja empático, breve e inspirador. Use um emoji relacionado à área sugerida no início da resposta.\n\n';
  perguntas.forEach((p, i) => {
    prompt += `Pergunta: ${p}\nResposta: ${respostas[i] || ''}\n`;
  });
  prompt += '\nFormato da resposta:\n[emoji] <Sugestão de carreira>\nExplicação motivacional e breve sobre a área, por que combina com o perfil, e incentive a buscar os cursos gratuitos recomendados abaixo.';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    res.json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar uma resposta." });
  } catch (e) {
    res.status(500).json({ text: "Erro ao consultar IA." });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => console.log('Backend rodando em http://localhost:3000')); 