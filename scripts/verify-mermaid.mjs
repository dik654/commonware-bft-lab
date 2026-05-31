#!/usr/bin/env node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const scanAll = process.argv.includes("--all");
const baseIndex = process.argv.indexOf("--base");
const baseRef = baseIndex >= 0 ? process.argv[baseIndex + 1] : "";
const mermaidCli = process.env.MERMAID_CLI_PACKAGE ?? "@mermaid-js/mermaid-cli@11.4.2";
const excludedDirs = new Set([".git", "node_modules", "target"]);

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function isExcluded(relativePath) {
  return relativePath.split("/").some(part => excludedDirs.has(part));
}

async function walk(dir = root) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const relativePath = rel(abs);
    if (isExcluded(relativePath)) continue;
    if (entry.isDirectory()) {
      files.push(...await walk(abs));
    } else if (entry.name.endsWith(".md")) {
      files.push(abs);
    }
  }
  return files;
}

function gitFiles(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function targetFiles() {
  if (scanAll) return walk();

  const changed = baseRef
    ? gitFiles(["diff", "--name-only", "--diff-filter=ACMR", `${baseRef}...HEAD`])
    : [
        ...gitFiles(["diff", "--name-only", "--diff-filter=ACMR", "HEAD"]),
        ...gitFiles(["ls-files", "--others", "--exclude-standard"]),
      ];

  return [...new Set(changed)]
    .filter(file => file.endsWith(".md"))
    .filter(file => !isExcluded(file))
    .map(file => path.resolve(root, file));
}

function mermaidBlocks(markdown) {
  const blocks = [];
  const re = /^```mermaid\s*\n([\s\S]*?)^```\s*$/gm;
  for (const match of markdown.matchAll(re)) {
    blocks.push(match[1].trim() + "\n");
  }
  return blocks;
}

const tempDir = mkdtempSync(path.join(os.tmpdir(), "verify-mermaid-"));
const puppeteerConfig = path.join(tempDir, "puppeteer.json");
writeFileSync(
  puppeteerConfig,
  JSON.stringify({ args: ["--no-sandbox", "--disable-setuid-sandbox"] }),
);

let rendered = 0;
const failures = [];

try {
  for (const abs of await targetFiles()) {
    const file = rel(abs);
    const markdown = await readFile(abs, "utf8");
    const blocks = mermaidBlocks(markdown);
    for (const [index, block] of blocks.entries()) {
      const input = path.join(tempDir, `${file.replaceAll("/", "__")}-${index}.mmd`);
      const output = path.join(tempDir, `${file.replaceAll("/", "__")}-${index}.svg`);
      writeFileSync(input, block);
      try {
        execFileSync("npx", ["-y", mermaidCli, "-p", puppeteerConfig, "-i", input, "-o", output], {
          cwd: root,
          stdio: ["ignore", "pipe", "pipe"],
          encoding: "utf8",
        });
        rendered += 1;
      } catch (err) {
        failures.push({
          file,
          block: index + 1,
          error: `${err.stdout ?? ""}${err.stderr ?? ""}`.trim(),
        });
      }
    }
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`Mermaid verification: FAIL (${failures.length} failed, ${rendered} rendered)`);
  for (const failure of failures) {
    console.error(`\n${failure.file} block ${failure.block}`);
    console.error(failure.error);
  }
  process.exit(1);
}

console.log(`Mermaid verification: PASS (${rendered} rendered)`);
