let pedidos = [
  {
    id_ped: 1, codigo:'KAO3799376INO',
    nomeP:'Maria Luísa Ferreira', tel:'923 456 789',
    endereco:'Rua dos Coqueiros, 45', data: Date.now() - 3*60000,
    estado:'pendente',
    tempoMinutos: null, inicioPrep: null,
    produtos:[
      { nome:'Kino Smash Burger', preco:2500, qtd:2, subTotal:5000 },
      { nome:'Refrigerante 500ml', preco:400,  qtd:2, subTotal:800  },
    ],
  },
  {
    id_ped: 2, codigo:'KAO0011200INO',
    nomeP:'João Baptista Silva', tel:'912 000 111',
    endereco:'Av. 4 de Fevereiro, 12', data: Date.now() - 20*60000,
    estado:'preparando', tempoMinutos:30, inicioPrep: Date.now() - 8*60000,
    produtos:[
      { nome:'Double Kino Burger', preco:3200, qtd:1, subTotal:3200 },
      { nome:'Batata Frita Grande', preco:800, qtd:1, subTotal:800  },
    ],
  },
  {
    id_ped: 3, codigo:'KAO5500312INO',
    nomeP:'Sofia Neto', tel:'934 567 890',
    endereco:'Rua da Samba, 7', data: Date.now() - 60*60000,
    estado:'feito', tempoMinutos:20, inicioPrep: Date.now() - 50*60000,
    produtos:[
      { nome:'Kino Smash Burger', preco:2500, qtd:1, subTotal:2500 },
    ],
  },
  {
    id_ped: 4, codigo:'KAO9900001INO',
    nomeP:'Rui Baptista', tel:'941 234 567',
    endereco:'Bairro Azul, Casa 3', data: Date.now() - 90*60000,
    estado:'entregue', tempoMinutos:25, inicioPrep: Date.now() - 80*60000,
    produtos:[
      { nome:'Batata Frita Pequena', preco:600, qtd:2, subTotal:1200 },
      { nome:'Refrigerante 330ml',   preco:300, qtd:2, subTotal:600  },
    ],
  },
];

let filtroAtual  = '';
let idAceitar    = null;
let idNegar      = null;
let idDel        = null;
let tempoSel     = null;   /* minutos seleccionados no modal de aceitar */

/* Intervalos do temporizador por pedido (id → intervalID) */
const timers = {};

/* ━━ UTILITÁRIOS ━━ */
const fmt  = v => new Intl.NumberFormat('pt-AO',{style:'currency',currency:'AOA'}).format(v);
const hora = ms => {
  const d = new Date(ms);
  return d.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
};
const total = p => p.produtos.reduce((a,x) => a + x.subTotal, 0);

/* Tempo restante em mm:ss */
function tempoRestante(ped) {
  if (!ped.inicioPrep || !ped.tempoMinutos) return null;
  const fim = ped.inicioPrep + ped.tempoMinutos * 60000;
  const resto = fim - Date.now();
  if (resto <= 0) return '00:00';
  const m = Math.floor(resto/60000);
  const s = Math.floor((resto%60000)/1000);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* ━━ LABELS DE ESTADO ━━ */
const LABEL = {
  pendente:'⏳ Pendente', preparando:'🔥 Preparando',
  feito:'✅ Feito', entrega_pendente:'🛵 Entrega Pendente',
  entregue:'📦 Entregue', negado:'❌ Negado',
};

/* ━━ ACTUALIZAR CONTADORES DOS CARDS DE RESUMO ━━ */
function atualizarContadores() {
  const estados = ['pendente','preparando','feito','entrega_pendente','entregue'];
  document.getElementById('n-todos').textContent = pedidos.length;
  estados.forEach(e => {
    const el = document.getElementById(`n-${e}`);
    if (el) el.textContent = pedidos.filter(p => p.estado === e).length;
  });
}

/* ━━ FILTRO RÁPIDO PELOS CARDS ━━ */
function filtroRapido(estado) {
  filtroAtual = estado;
  document.getElementById('filtroEstado').value = estado;
  /* Destaca card activo */
  document.querySelectorAll('.card-resumo').forEach(c => c.classList.remove('ativo'));
  const alvo = estado ? document.getElementById(`cr-${estado}`) : document.getElementById('cr-todos');
  if (alvo) alvo.classList.add('ativo');
  renderizar();
}

/* Sincroniza o card quando o select muda */
function sincronizarCard() {
  const v = document.getElementById('filtroEstado').value;
  filtroRapido(v);
}

/* ━━ RENDERIZAR LISTA DE PEDIDOS ━━ */
function renderizar() {
  const termo  = document.getElementById('busca').value.toLowerCase();
  const estado = document.getElementById('filtroEstado').value;
  const ordem  = document.getElementById('filtroOrdem').value;

  let lista = pedidos.filter(p => {
    const ok1 = !estado || p.estado === estado;
    const ok2 = !termo  || p.codigo.toLowerCase().includes(termo)
                        || p.nomeP.toLowerCase().includes(termo);
    return ok1 && ok2;
  });

  lista.sort((a,b) => ordem === 'recente' ? b.data - a.data : a.data - b.data);

  const cont = document.getElementById('listaPedidos');
  const vazio = document.getElementById('vazio');

  if (!lista.length) {
    cont.innerHTML = ''; vazio.style.display = 'block'; return;
  }
  vazio.style.display = 'none';

  cont.innerHTML = lista.map(p => cardHTML(p)).join('');

  /* Arranca temporizadores nos pedidos "preparando" */
  lista.filter(p => p.estado === 'preparando').forEach(p => arrancarTimer(p.id_ped));

  atualizarContadores();
  document.getElementById('ultimaActual').textContent = 'Actualizado às ' + hora(Date.now());
}

/* ━━ GERAR HTML DE UM CARD DE PEDIDO ━━ */
function cardHTML(p) {
  const chips = p.produtos.map(pr =>
    `<div class="chip-prod">🍔 ${pr.nome} ×${pr.qtd}</div>`
  ).join('');

  const timer = (p.estado === 'preparando')
    ? `<div class="cp-timer" id="timer-${p.id_ped}">
         ⏱ A preparar — <span class="relogio" id="rel-${p.id_ped}">${tempoRestante(p) ?? '--:--'}</span>
       </div>` : '';

  /* Botões conforme o estado */
  let acoes = '';
  if (p.estado === 'pendente') {
    acoes = `<button class="btn-card bc-aceitar" onclick="abrirAceitar(${p.id_ped})">✔ Aceitar</button>
             <button class="btn-card bc-negar"   onclick="abrirNegar(${p.id_ped})">✘ Negar</button>
             <button class="btn-card bc-del"      onclick="abrirDel(${p.id_ped})">🗑 Eliminar</button>`;
  } else if (p.estado === 'preparando') {
    acoes = `<button class="btn-card bc-del" onclick="abrirDel(${p.id_ped})">🗑 Eliminar</button>`;
  } else if (p.estado === 'feito') {
    acoes = `<button class="btn-card bc-entregar" onclick="marcarEntregaPendente(${p.id_ped})">🛵 Enviar para entrega</button>
             <button class="btn-card bc-del"       onclick="abrirDel(${p.id_ped})">🗑 Eliminar</button>`;
  } else if (p.estado === 'entrega_pendente') {
    acoes = `<button class="btn-card bc-aceitar" onclick="marcarEntregue(${p.id_ped})">📦 Confirmar entrega</button>
             <button class="btn-card bc-del"     onclick="abrirDel(${p.id_ped})">🗑 Eliminar</button>`;
  } else {
    /* entregue / negado — só eliminar */
    acoes = `<button class="btn-card bc-del" onclick="abrirDel(${p.id_ped})">🗑 Eliminar</button>`;
  }

  return `
  <div class="card-pedido" id="card-${p.id_ped}">
    <div class="cp-topo">
      <div>
        <div class="cp-cliente">${p.nomeP}</div>
        <div class="cp-meta">
          <span class="cp-codigo">${p.codigo}</span>
          &nbsp;·&nbsp; ${p.endereco}
          &nbsp;·&nbsp; ${p.tel}
          &nbsp;·&nbsp; ${hora(p.data)}
          ${p.tempoMinutos ? `&nbsp;·&nbsp; Tempo: ${p.tempoMinutos} min` : ''}
        </div>
      </div>
      <span class="badge-estado ${p.estado}">${LABEL[p.estado]}</span>
    </div>

    <div class="cp-produtos">${chips}</div>
    ${timer}
    <div class="cp-total">Total: <span>${fmt(total(p))}</span></div>
    <div class="cp-acoes">${acoes}</div>
  </div>`;
}

/* ━━ TEMPORIZADOR ━━
   Actualiza o contador de cada pedido "preparando"
   e transita automaticamente para "feito" ao chegar a zero. */
function arrancarTimer(id) {
  if (timers[id]) return; /* já está a correr */
  timers[id] = setInterval(() => {
    const ped = pedidos.find(p => p.id_ped === id);
    if (!ped || ped.estado !== 'preparando') {
      clearInterval(timers[id]); delete timers[id]; return;
    }
    const tr = tempoRestante(ped);
    const el = document.getElementById(`rel-${id}`);
    if (el) el.textContent = tr;

    /* Quando o tempo chega a zero → transita para "feito" */
    if (tr === '00:00') {
      clearInterval(timers[id]); delete timers[id];
      ped.estado = 'feito';
      renderizar();
      toast(`Pedido ${ped.codigo} está FEITO!`, 'ok');
    }
  }, 1000);
}

/* ━━ ACEITAR PEDIDO ━━ */
function abrirAceitar(id) {
  idAceitar  = id;
  tempoSel   = null;
  document.getElementById('tempoManual').value = '';
  document.getElementById('textoTempoSel').textContent = 'Nenhum tempo seleccionado.';
  document.querySelectorAll('.opc-tempo').forEach(o => o.classList.remove('sel'));
  abrir('ovAceitar');
}

function selTempo(min) {
  tempoSel = min;
  document.getElementById('tempoManual').value = min;
  document.getElementById('textoTempoSel').textContent = `Tempo seleccionado: ${min} minuto(s).`;
  document.querySelectorAll('.opc-tempo').forEach(o => o.classList.remove('sel'));
  /* Destaca o botão clicado */
  event.target.classList.add('sel');
}

function confirmarAceitar() {
  const manual = parseInt(document.getElementById('tempoManual').value);
  const min = tempoSel || manual;
  if (!min || min < 1) { toast('Seleccione ou escreva o tempo de preparação.','err'); return; }

  const ped = pedidos.find(p => p.id_ped === idAceitar);
  ped.estado       = 'preparando';
  ped.tempoMinutos = min;
  ped.inicioPrep   = Date.now();
  fechar('ovAceitar');
  renderizar();
  toast(`Pedido aceite! Tempo: ${min} min.`, 'ok');
}

/* ━━ NEGAR ━━ */
function abrirNegar(id) {
  idNegar = id;
  const p = pedidos.find(x => x.id_ped === id);
  document.getElementById('txtNegar').textContent =
    `Negar o pedido de "${p.nomeP}" (${p.codigo})?`;
  abrir('ovNegar');
}

function confirmarNegar() {
  const ped = pedidos.find(p => p.id_ped === idNegar);
  ped.estado = 'negado';
  fechar('ovNegar');
  renderizar();
  toast('Pedido negado.', 'inf');
}

/* ━━ ENTREGA PENDENTE ━━ */
function marcarEntregaPendente(id) {
  const ped = pedidos.find(p => p.id_ped === id);
  ped.estado = 'entrega_pendente';
  renderizar();
  toast('Pedido enviado para entrega.', 'ok');
}

/* ━━ CONFIRMAR ENTREGUE ━━ */
function marcarEntregue(id) {
  const ped = pedidos.find(p => p.id_ped === id);
  ped.estado = 'entregue';
  renderizar();
  toast('Entrega confirmada!', 'ok');
}

/* ━━ ELIMINAR ━━ */
function abrirDel(id) {
  idDel = id;
  const p = pedidos.find(x => x.id_ped === id);
  document.getElementById('txtDel').textContent =
    `Eliminar pedido "${p.codigo}" de ${p.nomeP}? Esta acção não pode ser revertida.`;
  abrir('ovDel');
}

function confirmarDel() {
  const idx = pedidos.findIndex(p => p.id_ped === idDel);
  const cod = pedidos[idx].codigo;
  if (timers[idDel]) { clearInterval(timers[idDel]); delete timers[idDel]; }
  pedidos.splice(idx, 1);
  idDel = null;
  fechar('ovDel');
  renderizar();
  toast(`Pedido ${cod} eliminado.`, 'ok');
}

/* ━━ HELPERS MODAL ━━ */
function abrir(id)  { document.getElementById(id).classList.add('aberto'); }
function fechar(id) { document.getElementById(id).classList.remove('aberto'); }
function fecharSeFundo(e,id) { if(e.target===document.getElementById(id)) fechar(id); }
document.addEventListener('keydown', e => {
  if(e.key==='Escape'){ fechar('ovAceitar'); fechar('ovNegar'); fechar('ovDel'); }
});

/* ━━ TOAST ━━ */
let _tt;
function toast(msg, tipo='ok') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = `toast v ${tipo}`;
  clearTimeout(_tt); _tt = setTimeout(()=>el.classList.remove('v'),3200);
}

/* ━━ ARRANQUE ━━ */
renderizar();
atualizarContadores();
/* Actualiza a cada 30s para simular chegada de novos pedidos */
setInterval(() => { renderizar(); atualizarContadores(); }, 30000);