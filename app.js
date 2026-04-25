import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// barbeiros
const barbeiros = [
  { id: "1", nome: "João" },
  { id: "2", nome: "Carlos" }
];

// duração dos serviços
const servicosDuracao = {
  "Corte": 30,
  "Corte + Barba": 60,
  "Corte + Sobrancelha": 45,
  "Combo Completo": 90
};

// horário da barbearia
const abertura = 8;
const fechamento = 19;
const almocoInicio = 12;
const almocoFim = 13;

let agendamentos = [];
let selecionado = null;

// elementos
const barbeiroEl = document.getElementById("barbeiro");
const dataEl = document.getElementById("data");
const horariosEl = document.getElementById("horarios");
const msg = document.getElementById("msg");

// carregar barbeiros
barbeiros.forEach(b => {
  const opt = document.createElement("option");
  opt.value = b.id;
  opt.textContent = b.nome;
  barbeiroEl.appendChild(opt);
});

// gerar horários dinâmicos
function gerarHorarios(servico) {
  const duracao = servicosDuracao[servico];
  const lista = [];

  let hora = abertura;
  let minuto = 0;

  while (hora < fechamento) {

    if (hora >= almocoInicio && hora < almocoFim) {
      hora = almocoFim;
      minuto = 0;
      continue;
    }

    const h = String(hora).padStart(2,"0");
    const m = String(minuto).padStart(2,"0");

    lista.push(`${h}:${m}`);

    minuto += duracao;

    if (minuto >= 60) {
      hora += Math.floor(minuto / 60);
      minuto = minuto % 60;
    }
  }

  return lista;
}

// tempo real
onSnapshot(collection(db, "agendamentos"), snap => {
  agendamentos = snap.docs.map(d => d.data());
  render();
});

// render
function render() {
  horariosEl.innerHTML = "";
  selecionado = null;

  const barbeiro = barbeiroEl.value;
  const data = dataEl.value;
  const servico = document.getElementById("servico").value;

  if (!servico) return;

  const horarios = gerarHorarios(servico);

  const agora = new Date();
  const hoje = agora.toISOString().split("T")[0];

  horarios.forEach(h => {

    // bloquear passado
    if (data === hoje) {
      const [hh, mm] = h.split(":");
      const teste = new Date();
      teste.setHours(hh, mm);

      if (teste < agora) return;
    }

    const ocupado = agendamentos.find(a =>
      a.barbeiro === barbeiro &&
      a.data === data &&
      a.horario === h
    );

    if (ocupado) return;

    const div = document.createElement("div");
    div.className = "horario";
    div.textContent = h;

    div.onclick = () => {
      document.querySelectorAll(".horario").forEach(e => e.classList.remove("selected"));
      div.classList.add("selected");
      selecionado = h;
    };

    horariosEl.appendChild(div);
  });
}

// eventos
barbeiroEl.onchange = render;
dataEl.onchange = render;
document.getElementById("servico").onchange = render;

// agendar
document.getElementById("agendar").onclick = async () => {

  const servico = document.getElementById("servico").value;
  const barbeiro = barbeiroEl.value;
  const data = dataEl.value;

  if (!servico || !barbeiro || !data || !selecionado) {
    msg.textContent = "Preencha tudo!";
    msg.style.color = "red";
    return;
  }

  const q = query(
    collection(db, "agendamentos"),
    where("barbeiro", "==", barbeiro),
    where("data", "==", data),
    where("horario", "==", selecionado)
  );

  const snap = await getDocs(q);

  if (!snap.empty) {
    msg.textContent = "Horário já ocupado!";
    return;
  }

  await addDoc(collection(db, "agendamentos"), {
    servico,
    barbeiro,
    data,
    horario: selecionado,
    createdAt: new Date()
  });

  msg.textContent = "Agendado com sucesso!";
  msg.style.color = "lightgreen";
};