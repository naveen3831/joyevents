import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "../src");

const SKIP = new Set(["lib/utils.js", "lib/useGoogleTranslate.js"]);

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (/\.(jsx?)$/.test(ent.name)) files.push(p);
  }
  return files;
}

function ensureImport(content) {
  if (/import\s*\{[^}]*\bformatCurrency\b/.test(content)) return content;

  const utilsImport = content.match(/import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/utils["']/);
  if (utilsImport) {
    const names = utilsImport[1].split(",").map((s) => s.trim()).filter(Boolean);
    if (!names.includes("formatCurrency")) {
      names.push("formatCurrency");
      return content.replace(
        utilsImport[0],
        `import { ${names.join(", ")} } from "@/lib/utils"`
      );
    }
    return content;
  }

  const firstImport = content.match(/^import .+;\r?\n/m);
  const line = 'import { formatCurrency } from "@/lib/utils";\n';
  if (firstImport) {
    return content.replace(firstImport[0], firstImport[0] + line);
  }
  return line + content;
}

function transform(content) {
  let c = content;

  // Avoid double-transform
  c = c.replace(/formatCurrency\(formatCurrency\(/g, "formatCurrency(");

  // Template / string: ₹${x.toLocaleString()}
  c = c.replace(/₹\$\{([^}]+)\.toLocaleString\(\)\}/g, "${formatCurrency($1)}");
  c = c.replace(/₹\$\{([^}]+)\.toFixed\((\d+)\)\}/g, "${formatCurrency($1, { minimumFractionDigits: $2, maximumFractionDigits: $2 })}");

  // JSX: ₹{x.toLocaleString()}
  c = c.replace(/₹\{([^}]+)\.toLocaleString\(\)\}/g, "{formatCurrency($1)}");

  // Prefix variants before ₹{
  c = c.replace(/\+₹\{([^}]+)\}/g, "+{formatCurrency($1)}");
  c = c.replace(/-₹\{([^}]+)\}/g, "-{formatCurrency($1)}");
  c = c.replace(/Min\. ₹\{([^}]+)\}/g, "Min. {formatCurrency($1)}");
  c = c.replace(/From ₹\{([^}]+)\}/g, "From {formatCurrency($1)}");
  c = c.replace(/Pay ₹\{([^}]+)\}/g, "Pay {formatCurrency($1)}");
  c = c.replace(/Starting from ₹\{([^}]+)\}/g, "Starting from {formatCurrency($1)}");
  c = c.replace(/Starting price: <span[^>]*>₹\{([^}]+)\}/g, (m, expr) =>
    m.replace(`₹{${expr}}`, `{formatCurrency(${expr})}`)
  );

  // Remaining JSX ₹{expr} — skip if already formatCurrency
  c = c.replace(/₹\{([^}]+)\}/g, (match, expr) => {
    if (expr.includes("formatCurrency")) return match;
    return `{formatCurrency(${expr})}`;
  });

  // Remaining template ₹${expr} — skip formatCurrency and OFF/percentage contexts handled above
  c = c.replace(/₹\$\{([^}]+)\}/g, (match, expr) => {
    if (expr.includes("formatCurrency")) return match;
    return `\${formatCurrency(${expr})}`;
  });

  // Literal examples like ₹1000 → formatCurrency(1000)
  c = c.replace(/₹(\d{2,})(?![\d,])/g, (_, n) => `\${formatCurrency(${n})}`);

  return c;
}

let updated = 0;
for (const file of walk(srcDir)) {
  const rel = path.relative(srcDir, file).replace(/\\/g, "/");
  if (SKIP.has(rel)) continue;

  const original = fs.readFileSync(file, "utf8");
  if (!original.includes("₹")) continue;

  let content = transform(original);
  if (content.includes("formatCurrency") && content !== original) {
    content = ensureImport(content);
    fs.writeFileSync(file, content);
    updated++;
    console.log(rel);
  }
}

console.log(`Updated ${updated} files`);
