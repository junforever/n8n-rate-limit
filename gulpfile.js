const { src, dest, task } = require('gulp');

// Función para copiar y procesar el SVG del nodo RateLimit
function buildIcons() {
  return src('nodes/**/*.svg').pipe(dest('dist/nodes/'));
}

// Tarea build:icons
task('build:icons', buildIcons);

// Tarea por defecto
task('default', task('build:icons'));

module.exports = {
  'build:icons': buildIcons,
};
