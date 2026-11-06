const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'src/app/core');
const output = path.join(root, 'dist/server/core');
if (!path.resolve(output).startsWith(root + path.sep)) throw new Error('Invalid build directory');
fs.rmSync(output, { recursive: true, force: true });
const files = ['api-models.ts', 'room.ts'].map((name) => path.join(source, name));
const program = ts.createProgram(files, {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  strict: true,
  skipLibCheck: true,
  rootDir: source,
  outDir: output,
  noEmitOnError: true,
  types: [],
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
});
const result = program.emit();
const errors = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);
if (errors.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: (x) => x,
      getCurrentDirectory: () => root,
      getNewLine: () => '\n',
    }),
  );
  process.exit(1);
}
console.log('Server game modules compiled.');
