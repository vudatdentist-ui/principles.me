import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

export function checkUiContracts() {
  const errors = [];
  for (const path of [...files("app"), ...files("features")]) {
    const source = readFileSync(path, "utf8");
    if (path.endsWith(".css") && /\[aria-label\s*[*^$|~]?=/.test(source)) {
      errors.push(
        `${path}: accessible copy must not select layout rules; use owned classes.`,
      );
    }
    if (
      path.startsWith("features/") &&
      path.endsWith(".css") &&
      /\b100vw\b/.test(source)
    ) {
      errors.push(
        `${path}: nested features must size to their container, not the viewport.`,
      );
    }
    if (!path.endsWith(".tsx")) continue;
    if (/\.observe\(document\.(body|documentElement)/.test(source)) {
      errors.push(
        `${path}: document-wide mutation observers must not rewrite React-owned UI.`,
      );
    }
    for (const match of source.matchAll(
      /import\s+(\w+)\s+from\s+["']([^"']+\.module\.css)["']/g,
    )) {
      const [, binding, target] = match;
      const cssPath = target.startsWith("@/")
        ? resolve(target.slice(2))
        : resolve(dirname(path), target);
      const css = readFileSync(cssPath, "utf8");
      const classes = new Set(
        Array.from(css.matchAll(/\.([A-Za-z_][\w-]*)/g), (item) => item[1]),
      );
      for (const access of source.matchAll(
        new RegExp(`\\b${binding}\\.(\\w+)`, "g"),
      )) {
        if (!classes.has(access[1]))
          errors.push(`${path}: missing CSS class ${binding}.${access[1]}.`);
      }
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  process.stdout.write("UI_CONTRACTS_OK=1\n");
}
