import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const { version } = JSON.parse(await readFile("package.json", "utf8"));
const { outputFiles } = await build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: true,
  write: false,
  outdir: "build",
  jsx: "automatic",
  legalComments: "inline",
  define: { __APP_VERSION_LABEL__: JSON.stringify(`v${version}`), "process.env.NODE_ENV": '"production"' },
  loader: Object.fromEntries(
    [".svg", ".woff2", ".png", ".webp"].map((ext) => [ext, "dataurl"]),
  ),
});
const template = await readFile("src/page.html", "utf8");
const css = outputFiles.find((file) => file.path.endsWith(".css")).text;
const js = outputFiles.find((file) => file.path.endsWith(".js")).text;
const html = template
  .replace("/* STYLES */", () => css)
  .replace("/* APPLICATION */", () => js.replace(/<\/script/gi, "<\\/script"));

await writeFile("index.html", html);
await mkdir("dist", { recursive: true });
const analytics = '<script defer src="https://cloud.umami.is/script.js" data-website-id="e01c9f78-4607-4e60-b01c-77c8190b12b4"></script>';
await writeFile("dist/index.html", html.replace("</head>", analytics + "</head>"));
