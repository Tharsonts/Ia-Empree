function gerarSessionId() {
  return 'sess-' + Math.random().toString(36).substr(2, 9);
}

const sessionId = gerarSessionId();
const chat = document.getElementById('chat');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const btnEnviar = document.getElementById('btnEnviar');
const loader = document.getElementById('loader');

let esperandoPergunta = false;
let finished = false;

function adicionarBalao(texto, autor = 'ia', efeito = false) {
  const balao = document.createElement('div');
  balao.className = 'balao ' + autor;
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.innerHTML = autor === 'ia' ? '🤖' : '🧑';
  const msg = document.createElement('div');
  msg.className = 'msg';
  if (efeito) {
    let i = 0;
    function digitar() {
      if (i < texto.length) {
        msg.innerHTML += texto.charAt(i);
        i++;
        setTimeout(digitar, 13);
      }
    }
    digitar();
  } else {
    msg.innerHTML = texto;
  }
  balao.appendChild(avatar);
  balao.appendChild(msg);
  chat.appendChild(balao);
  chat.scrollTop = chat.scrollHeight;
}

async function pedirPergunta(resposta = null) {
  esperandoPergunta = true;
  loader.style.display = 'inline-block';
  btnEnviar.disabled = true;
  chatInput.disabled = true;
  try {
    const resp = await fetch('/api/pergunta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, resposta })
    });
    const data = await resp.json();
    loader.style.display = 'none';
    btnEnviar.disabled = false;
    chatInput.disabled = false;
    if (data.finished) {
      finished = true;
      pedirRespostaFinal();
    } else {
      adicionarBalao(data.pergunta, 'ia', true);
      esperandoPergunta = false;
    }
  } catch (err) {
    adicionarBalao('Erro ao conectar ao servidor.', 'ia');
    loader.style.display = 'none';
    btnEnviar.disabled = false;
    chatInput.disabled = false;
  }
}

async function pedirRespostaFinal() {
  loader.style.display = 'inline-block';
  btnEnviar.disabled = true;
  chatInput.disabled = true;
  try {
    const resp = await fetch('/api/final', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    const data = await resp.json();
    adicionarBalao(data.text, 'ia', true);
    adicionarBalao('<strong>Cursos gratuitos recomendados:</strong><ul style="margin:8px 0 0 0;">' +
      '<li><a href="https://www.alura.com.br/start" target="_blank">Alura Start</a></li>' +
      '<li><a href="https://www.coursera.org/browse/information-technology" target="_blank">Coursera (TI para todos)</a></li>' +
      '<li><a href="https://www.ev.org.br/cursos/tecnologia" target="_blank">Fundação Bradesco</a></li>' +
      '<li><a href="https://learn.microsoft.com/pt-br/training/" target="_blank">Microsoft Learn</a></li>' +
      '</ul>', 'ia');
  } catch (err) {
    adicionarBalao('Erro ao consultar a IA.', 'ia');
  }
  loader.style.display = 'none';
  btnEnviar.disabled = false;
  chatInput.disabled = false;
}

chatForm.addEventListener('submit', function(e) {
  e.preventDefault();
  if (esperandoPergunta || finished) return;
  const texto = chatInput.value.trim();
  if (!texto) return;
  adicionarBalao(texto, 'user');
  chatInput.value = '';
  pedirPergunta(texto);
});

// Inicia o chat com a primeira pergunta
window.onload = () => {
  pedirPergunta();
}; 