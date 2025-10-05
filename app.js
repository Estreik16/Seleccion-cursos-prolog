// --- KB (idéntica a kb.pl) incrustada para evitar CORS al abrir local ---
const KB = `
% =====================
% Base de conocimiento
% =====================
course(cs101,  'Introducción a Programación', 8, 1).
course(math101,'Cálculo I',                    8, 1).
course(phys101,'Física I',                     8, 1).
course(cs102,  'Estructuras de Datos',         8, 2).
course(math102,'Cálculo II',                   8, 2).
course(cs201,  'Algoritmos',                   8, 3).
course(cs202,  'Bases de Datos',               8, 3).
course(cs203,  'Arquitectura de Computadoras', 8, 3).
course(cs301,  'Lenguajes de Programación',    8, 4).
course(cs302,  'Sistemas Operativos',          8, 4).

prereq(cs102,  cs101,   70).
prereq(math102,math101, 70).
prereq(cs201,  cs102,   70).
prereq(cs201,  math101, 60).
prereq(cs202,  cs102,   70).
prereq(cs203,  phys101, 60).
prereq(cs301,  cs201,   70).
prereq(cs302,  cs201,   70).
prereq(cs302,  cs203,   60).

% Auxiliares
miembro(X, [X|_]).
miembro(X, [_|T]) :- miembro(X, T).

nota_de(Curso, [calif(Curso, N)|_], N) :- !.
nota_de(Curso, [_|T], N) :- nota_de(Curso, T, N).

aprobado(Curso, Califs, Min) :-
    nota_de(Curso, Califs, N),
    N >= Min.

% Verdadero si no tiene prerrequisitos o todos están aprobados con su mínimo
satisface_prerreqs(Curso, Califs) :-
    \\+ prereq(Curso, _, _);
    ( forall(prereq(Curso, P, Min), aprobado(P, Califs, Min)) ).

% Lista de prerequisitos que faltan
faltantes(Curso, Califs, L) :-
    findall(req(P, Min), (prereq(Curso, P, Min), \\+ aprobado(P, Califs, Min)), L).

% Un curso es elegible si existe, no está ya aprobado y satisface prerrequisitos
elegible(Califs, Curso) :-
    course(Curso, _, _, _),
    \\+ (nota_de(Curso, Califs, _)),
    satisface_prerreqs(Curso, Califs).

% Recomendación por semestre
recomendacion_por_semestre(Califs, Sem, L) :-
    findall(C, (elegible(Califs, C), course(C, _, _, Sem)), L).

% utilidades para mostrar
nombre(C, N)   :- course(C, N, _, _).
creditos(C, Cr):- course(C, _, Cr, _).
semestre(C, S) :- course(C, _, _, S).
`;

// --- Tau Prolog session ---
const pl = window.pl;
const session = new pl.type.Session({
    // los módulos core y lists se cargan por las etiquetas <script> en index.html
});

function consultKB() {
    return new Promise((resolve, reject) => {
        session.consult(KB, {
            success: () => resolve(),
            error: (e) => reject(e)
        });
    });
}

function toListTerm(califs) {
    // califs: [{id:"cs101", grade:80}, ...] -> [calif(cs101,80), ...]
    const arr = califs.map(({ id, grade }) =>
        new pl.type.Term("calif", [
            new pl.type.Term(id),
            new pl.type.Num(parseInt(grade, 10), false)
        ])
    );
    return pl.type.fromJavaScript.apply(null, [arr]);
}

function runQuery(q) {
    return new Promise((resolve, reject) => {
        session.query(q, {
            success: () => session.answers(x => resolve(x)),
            error: (err) => reject(err)
        });
    });
}

// --- UI helpers ---
const cursos = [
    { id: "cs101", nombre: "Introducción a Programación", sem: 1 },
    { id: "math101", nombre: "Cálculo I", sem: 1 },
    { id: "phys101", nombre: "Física I", sem: 1 },
    { id: "cs102", nombre: "Estructuras de Datos", sem: 2 },
    { id: "math102", nombre: "Cálculo II", sem: 2 },
    { id: "cs201", nombre: "Algoritmos", sem: 3 },
    { id: "cs202", nombre: "Bases de Datos", sem: 3 },
    { id: "cs203", nombre: "Arquitectura de Computadoras", sem: 3 },
    { id: "cs301", nombre: "Lenguajes de Programación", sem: 4 },
    { id: "cs302", nombre: "Sistemas Operativos", sem: 4 },
];

const $catalogo = document.getElementById('catalogo');
const $resultado = document.getElementById('resultado');
const $calc = document.getElementById('calc');
const $query = document.getElementById('query');
const $run = document.getElementById('run');
const $out = document.getElementById('out');
const $kbview = document.getElementById('kbview');

$kbview.textContent = KB;

function renderCatalogo() {
    const group = cursos.reduce((acc, c) => {
        acc[c.sem] = acc[c.sem] || [];
        acc[c.sem].push(c);
        return acc;
    }, {});

    $catalogo.innerHTML = Object.keys(group)
        .sort((a, b) => a - b)
        .map(sem => {
            const items = group[sem]
                .map(c => `
        <label style="display:flex;align-items:center;gap:.5rem;margin:.4rem 0">
            <input type="checkbox" data-id="${c.id}" class="aprobado">
            <span class="pill">${c.id}</span> ${c.nombre}
            <span style="margin-left:auto">Calif:
            <input type="number" min="0" max="100" step="1" value="80" class="nota" data-id="${c.id}">
            </span>
        </label>
        `)
                .join('');
            return `<div class="card"><h3>Semestre ${sem}</h3>${items}</div>`;
        })
        .join('');
}

function getCalifs() {
    const checks = [...document.querySelectorAll('.aprobado:checked')];
    return checks.map(ch => {
        const id = ch.dataset.id;
        const grade = document.querySelector(`.nota[data-id="${id}"]`).value || 0;
        return { id, grade };
    });
}

function renderElegibles(list) {
    if (!list.length) {
        $resultado.innerHTML = '<p>No hay cursos elegibles con la información actual.</p>';
        return;
    }
    $resultado.innerHTML =
        '<ul>' + list.map(c => `<li><span class="pill mono">${c}</span></li>`).join('') + '</ul>';
}

async function calcular() {
    $resultado.innerHTML = 'Calculando...';
    await consultKB();

    const califs = getCalifs();
    const listTerm = toListTerm(califs); // [calif(cs101,80), ...]

    const X = new pl.type.Var('X');
    const goal = new pl.type.Term('elegible', [listTerm, X]);

    const elegibles = [];
    await new Promise((resolve, reject) => {
        session.query(goal, {
            success: () => {
                (function next() {
                    session.answer(ans => {
                        if (ans === false || ans === null) { resolve(); return; }
                        const vx = ans.lookup('X');
                        if (vx && vx.id) elegibles.push(vx.id);
                        next();
                    });
                })();
            },
            error: reject
        });
    });

    renderElegibles(elegibles);
}

async function runConsole() {
    await consultKB();
    const q = $query.value.trim();
    if (!q.endsWith('.')) {
        alert('Toda consulta debe terminar con punto.');
        return;
    }
    $out.textContent = '';
    session.query(q, {
        success: () => {
            const answers = [];
            (function next() {
                session.answer(ans => {
                    if (ans === false || ans === null) {
                        $out.textContent = answers.length ? answers.join('\n') : 'false.';
                        return;
                    }
                    answers.push(pl.format_answer(ans));
                    next();
                });
            })();
        },
        error: (e) => $out.textContent = 'Error: ' + e
    });
}

// Inicialización UI
renderCatalogo();
$calc.addEventListener('click', calcular);
$run.addEventListener('click', runConsole);
