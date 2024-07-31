import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";


const prod = (process.argv[2] === "production");

const context = await esbuild.context({
	banner: {
		js: "const _importMetaUrl = require('url').pathToFileURL(__filename);",
	},
	entryPoints: ["./src/main.ts"],
	bundle: true,
	platform: 'node',
	// refer to: https://github.com/sindresorhus/open/issues/330
	define: { 'import.meta.url': '_importMetaUrl' },
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins],
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: "main.js",
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
