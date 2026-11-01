// Bundles src/render/html5-runtime.ts (renderAt + its helpers) into one standalone
// script string, exposed as `virtual:html5-runtime` for the HTML5 banner zip.
import { build } from "esbuild";
import path from "node:path";
import type { Plugin } from "vite";

const ID = "virtual:html5-runtime";
const RESOLVED = "\0" + ID;

export function html5Runtime(): Plugin {
  const root = path.resolve(__dirname, "src");
  return {
    name: "gp-html5-runtime",
    resolveId: (id) => (id === ID ? RESOLVED : null),
    async load(id) {
      if (id !== RESOLVED) return null;
      const entry = path.join(root, "render/html5-runtime.ts");
      const out = await build({
        entryPoints: [entry],
        bundle: true,
        write: false,
        format: "iife",
        target: "es2019",
        minify: true,
        legalComments: "none",
        plugins: [{
          name: "alias",
          setup(b) {
            // The banner embeds its own fonts; the app font loader (React/server code) stays out.
            b.onResolve({ filter: /^@\/lib\/stillframe\/fonts$/ }, () => ({ path: "fonts-stub", namespace: "stub" }));
            b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export async function loadFont(){}", loader: "js" }));
            b.onResolve({ filter: /^@\// }, async (a) => {
              const r = await b.resolve("./" + a.path.slice(2), { resolveDir: root, kind: a.kind });
              return { path: r.path, errors: r.errors };
            });
          },
        }],
      });
      // Rebuild when any render source changes.
      this.addWatchFile(entry);
      return `export default ${JSON.stringify(out.outputFiles[0]!.text)};`;
    },
  };
}
