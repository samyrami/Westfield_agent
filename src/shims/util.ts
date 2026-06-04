/**
 * Shim mínimo del módulo `util` de Node para el navegador.
 *
 * `@readyplayerme/visage` arrastra una dependencia que, en tiempo de import,
 * lee `util.inspect.custom`. Vite externaliza el builtin `util` en el browser,
 * con lo que `util.inspect` queda `undefined` y `.custom` lanza
 * "Cannot read properties of undefined (reading 'custom')", tumbando el avatar 3D.
 *
 * Este shim provee lo justo (`inspect` + `inspect.custom`) para que el módulo
 * cargue. No se usa para formateo real en runtime de la app.
 */
const inspect = Object.assign((value: unknown) => String(value), {
  custom: Symbol.for("nodejs.util.inspect.custom"),
});

export { inspect };
export default { inspect };
