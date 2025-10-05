// --- KB (idéntica a kb.pl) incrustada para evitar CORS al abrir local ---
return `<div class="card"><h3>Semestre ${sem}</h3>${items}</div>`;
}).join('');
}


function getCalifs(){
const checks = [...document.querySelectorAll('.aprobado:checked')];
return checks.map(ch => {
const id = ch.dataset.id;
const grade = document.querySelector(`.nota[data-id="${id}"]`).value || 0;
return { id, grade };
});
}


function renderElegibles(list){
if (!list.length){
$resultado.innerHTML = '<p>No hay cursos elegibles con la información actual.</p>';
return;
}
$resultado.innerHTML = '<ul>' + list.map(c => `<li><span class="pill mono">${c}</span></li>`).join('') + '</ul>';
}


async function calcular(){
$resultado.innerHTML = 'Calculando...';
await consultKB();
const califs = getCalifs();
const listTerm = toListTerm(califs); // [calif(cs101,80), ...]


const X = new pl.type.Var('X');
const goal = new pl.type.Term('elegible', [listTerm, X]);


const elegibles = [];
await new Promise((resolve, reject) => {
session.query(goal, { success: () => {
function next(){
session.answer(ans => {
if(ans === false || ans === null){ resolve(); return; }
const vx = ans.lookup('X');
if (vx && vx.id) elegibles.push(vx.id);
next();
});
}
next();
}, error: reject });
});


renderElegibles(elegibles);
}


async function runConsole(){
await consultKB();
const q = $query.value.trim();
if(!q.endsWith('.')){ alert('Toda consulta debe terminar con punto.'); return; }
$out.textContent = '';
session.query(q, {
success: () => {
const answers = [];
function next(){
session.answer(ans => {
if (ans === false || ans === null){
$out.textContent = answers.length? answers.join('\n') : 'false.'; return;
}
answers.push(pl.format_answer(ans));
next();
})
}
next();
},
error: (e) => $out.textContent = 'Error: '+e
});
}


renderCatalogo();
$calc.addEventListener('click', calcular);
$run.addEventListener('click', runConsole);