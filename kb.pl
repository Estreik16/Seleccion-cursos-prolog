## kb.pl (base de conocimiento Prolog)
course(cs201, 'Algoritmos', 8, 3).
course(cs202, 'Bases de Datos', 8, 3).
course(cs203, 'Arquitectura de Computadoras', 8, 3).
course(cs301, 'Lenguajes de Programación', 8, 4).
course(cs302, 'Sistemas Operativos', 8, 4).


% prereq(Curso, Prerrequisito, MinCalif).
prereq(cs102, cs101, 70).
prereq(math102,math101, 70).
prereq(cs201, cs102, 70).
prereq(cs201, math101, 60).
prereq(cs202, cs102, 70).
prereq(cs203, phys101, 60).
prereq(cs301, cs201, 70).
prereq(cs302, cs201, 70).
prereq(cs302, cs203, 60).


% ---------------------
% Predicados auxiliares
% ---------------------
% miembro/2 (para no depender de librerías)
miembro(X, [X|_]).
miembro(X, [_|T]) :- miembro(X, T).


% nota_de(Curso, ListaCalifs, Nota)
nota_de(Curso, [calif(Curso, N)|_], N) :- !.
nota_de(Curso, [_|T], N) :- nota_de(Curso, T, N).


% aprobado(Curso, Califs) :- existe calificacion y cumple mínimo
aprobado(Curso, Califs, Min) :- nota_de(Curso, Califs, N), N >= Min.


% satisface_prerreqs(Curso, Califs)
% Verdadero si TODOS los prerrequisitos de Curso están aprobados con la mínima requerida.
satisface_prerreqs(Curso, Califs) :-
\+ prereq(Curso, _, _); % No tiene prerrequisitos
( forall(prereq(Curso, P, Min), aprobado(P, Califs, Min))
).


% faltantes(Curso, Califs, ListaFaltantes)
% Regresa la lista de prerrequisitos que aún faltan por cumplir (con su mínimo)
faltantes(Curso, Califs, L) :-
findall(req(P, Min), (prereq(Curso, P, Min), \+ aprobado(P, Califs, Min)), L).


% elegible(Califs, Curso)
% Un curso es elegible si existe en el catálogo, no está ya aprobado y satisface todos sus prerrequisitos.
elegible(Califs, Curso) :-
course(Curso, _, _, _),
\+ (nota_de(Curso, Califs, _)),
satisface_prerreqs(Curso, Califs).


% recomendacion_por_semestre(Califs, Semestre, ListaCursos)
recomendacion_por_semestre(Califs, Sem, L) :-
findall(C, (elegible(Califs, C), course(C, _, _, Sem)), L).


% utilidades para mostrar
nombre(C, N) :- course(C, N, _, _).
creditos(C, Cr) :- course(C, _, Cr, _).
semestre(C, S) :- course(C, _, _, S).