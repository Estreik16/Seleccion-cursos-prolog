# Selección de Cursos (Prolog + Tau Prolog)

Este proyecto ayuda a un alumno/tutor a **seleccionar cursos** respetando la **seriación** y los **mínimos de aprobación** de prerrequisitos.  
La interfaz es 100% **web** (HTML + JS) y usa **[Tau Prolog](https://tau-prolog.org/)** en el navegador, por lo que **no necesitas instalar Prolog** para probar.

---

## Demo local rápida

1. Descarga este repositorio
   - **Git**:  
     ```bash
     git clone https://github.com/TU_USUARIO/seleccion-cursos-prolog.git
     cd seleccion-cursos-prolog
     ```
   - **ZIP**: botón **Code → Download ZIP** y descomprime.

2. Abre `index.html` en tu navegador  
   (doble clic o usa un servidor local si tu navegador bloquea scripts locales).

   **Servidor local (opcional pero recomendado):**
   - Con Python:
     ```bash
     # dentro de la carpeta del proyecto
     python -m http.server 5500
     # visita http://localhost:5500/
     ```
   - Con VS Code: extensión **Live Server** → “Open with Live Server”.

3. En la página:
   - Marca los cursos que **ya aprobaste** e ingresa la **calificación**.
   - Clic en **Calcular cursos elegibles** para ver qué materias puedes inscribir.
   - Usa la **Consola Prolog** para ejecutar consultas manuales (terminan en punto `.`).

---

## Estructura del proyecto

