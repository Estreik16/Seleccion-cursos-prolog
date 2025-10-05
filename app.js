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

% ---------------------
% Predicados auxiliares
% ---------------------
miembro(X, [X|_]).
miembro(X, [_|T]) :- miembro(X, T).

% negación como falla (evitamos \\+ para máxima compatibilidad)
not(G) :- call(G), !, fail.
not(_).

% nota_de(Curso, ListaCalifs, Nota)
nota_de(Curso, [calif(Curso, N)|_], N) :- !.
nota_de(Curso, [_|T], N) :- nota_de(Curso, T, N).

aprobado(Curso, Califs, Min) :-
    nota_de(Curso, Califs, N),
    N >= Min.

% Verdadero si NO tiene prerrequisitos o TODOS los prerrequisitos están aprobados
satisface_prerreqs(Curso, Califs) :-
    not(prereq(Curso, _, _));                                   % sin prerrequisitos
    not( (prereq(Curso, P, Min), not(aprobado(P, Califs, Min))) ). % no existe prereq sin aprobar

% Lista de prerequisitos faltantes
faltantes(Curso, Califs, L) :-
    findall(req(P, Min), (prereq(Curso, P, Min), not(aprobado(P, Califs, Min))), L).

% Elegible si existe, no está ya aprobado y satisface prerrequisitos
elegible(Califs, Curso) :-
    course(Curso, _, _, _),
    not(nota_de(Curso, Califs, _)),
    satisface_prerreqs(Curso, Califs).

recomendacion_por_semestre(Califs, Sem, L) :-
    findall(C, (elegible(Califs, C), course(C, _, _, Sem)), L).

nombre(C, N)   :- course(C, N, _, _).
creditos(C, Cr):- course(C, _, Cr, _).
semestre(C, S) :- course(C, _, _, S).
`;

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

// --- Render del catálogo ---
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

// --- Obtener calificaciones marcadas en la UI ---
function getCalifs() {
    const checks = [...document.querySelectorAll('.aprobado:checked')];
    return checks.map(ch => {
        const id = ch.dataset.id;
        const grade = document.querySelector(`.nota[data-id="${id}"]`).value || 0;
        return { id, grade: parseInt(grade, 10) || 0 };
    });
}

// --- Construye la lista Prolog como TEXTO: [calif(cs101,80), ...] ---
function califsToString(califs) {
    return '[' + califs.map(c => `calif(${c.id},${c.grade})`).join(',') + ']';
}

// --- Mostrar cursos elegibles ---
function renderElegibles(list) {
    if (!list.length) {
        $resultado.innerHTML = '<p>No hay cursos elegibles con la información actual.</p>';
        return;
    }
    const detalles = list.map(id => {
        const c = cursos.find(x => x.id === id);
        return `<li><span class="pill mono">${id}</span> – ${c ? c.nombre : ''}</li>`;
    });
    $resultado.innerHTML = '<ul>' + detalles.join('') + '</ul>';
}

// --- Calcular cursos elegibles (versión robusta con consultas de texto) ---
async function calcular() {
    try {
        $resultado.innerHTML = 'Calculando...';

        // Sesión limpia cada vez
        const session = new pl.type.Session();

        // Cargar KB
        await new Promise((resolve, reject) => {
            session.consult(KB, { success: resolve, error: reject });
        });

        const califs = getCalifs();
        const califsStr = califsToString(califs);        // p. ej. [calif(cs101,80),calif(math101,75)]
        const query = `elegible(${califsStr}, X).`;      // consulta textual

        const elegibles = [];

        await new Promise((resolve, reject) => {
            session.query(query, {
                success: () => {
                    (function next() {
                        session.answer(ans => {
                            if (ans === false || ans === null) { resolve(); return; }
                            const subst = pl.format_answer(ans);   // p. ej. "X = cs102."
                            const match = subst.match(/X\s*=\s*([a-zA-Z0-9_]+)/);
                            if (match) elegibles.push(match[1]);
                            next();
                        });
                    })();
                },
                error: (e) => {
                    console.error('Tau Prolog lanzó un error en query:', e && e.toString ? e.toString() : e);
                    reject(e);
                }
            });
        });

        renderElegibles(elegibles);

    } catch (err) {
        console.error('❌ Error durante el cálculo:', err && err.toString ? err.toString() : err);
        $resultado.innerHTML = '<p style="color:#f66">Error al procesar la consulta (ver consola).</p>';
    }
}

// --- Consola Prolog (también en modo texto) ---
async function runConsole() {
    const session = new pl.type.Session();

    await new Promise((resolve, reject) => {
        session.consult(KB, { success: resolve, error: reject });
    });

    const q = $query.value.trim();
    if (!q.endsWith('.')) {
        alert('Toda consulta debe terminar en punto.');
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
        error: (e) => {
            console.error('Tau Prolog lanzó un error en consola:', e && e.toString ? e.toString() : e);
            $out.textContent = 'Error: ' + (e && e.toString ? e.toString() : e);
        }
    });
}

// --- Inicialización ---
renderCatalogo();
$calc.addEventListener('click', calcular);
$run.addEventListener('click', runConsole);
