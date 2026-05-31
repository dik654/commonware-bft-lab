#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const json = process.argv.includes("--json");
const scanAll = process.argv.includes("--all");
const baseIndex = process.argv.indexOf("--base");
const baseRef = baseIndex >= 0 ? process.argv[baseIndex + 1] : "";
const exts = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".py"]);
const excludedDirs = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
]);
const excludedPrefixes = [
  "web-ui/public/rhwp/",
  "web-ui/public/assets/",
];
const excludedFiles = new Set([
  "scripts/ai-quality-gates.mjs",
]);

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function isExcluded(relativePath) {
  if (excludedFiles.has(relativePath)) return true;
  if (excludedPrefixes.some(prefix => relativePath.startsWith(prefix))) return true;
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
      continue;
    }
    if (exts.has(path.extname(entry.name))) files.push(abs);
  }
  return files;
}

function gitFiles(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
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

  const unique = [...new Set(changed)]
    .filter(file => exts.has(path.extname(file)))
    .filter(file => !isExcluded(file));
  return unique.map(file => path.resolve(root, file));
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/#.*$/gm, "");
}

function addIssue(issues, severity, file, line, rule, message, sample) {
  issues.push({ severity, file, line, rule, message, sample: sample?.trim().slice(0, 220) ?? "" });
}

function scanErrorHandling(file, text, issues) {
  const catchRe = /catch\s*(?:\([^)]*\))?\s*\{([\s\S]*?)\}/g;
  for (const m of text.matchAll(catchRe)) {
    const body = stripComments(m[1]).trim();
    const line = lineOf(text, m.index ?? 0);
    if (!body) {
      addIssue(issues, "error", file, line, "no-empty-catch", "empty catch block", m[0]);
      continue;
    }
    const hasObservableHandling = /\b(throw|console\.|logger\.|log\.|captureException|reportError|NextResponse\.json\s*\([^)]*error|status\s*:\s*[45]\d\d)\b/.test(body);
    const returnsSuccess = /\breturn\s+(true|false|null|undefined|\[\]|\{\}|["'`]{2})\b/.test(body)
      || /\breturn\s+NextResponse\.json\s*\(\s*\{\s*ok\s*:\s*true\b/.test(body)
      || /\breturn\s+\{\s*ok\s*:\s*true\b/.test(body);
    if (!hasObservableHandling && returnsSuccess) {
      addIssue(issues, "error", file, line, "no-broad-swallow", "catch block converts an error into a successful-looking result", m[0]);
    } else if (!hasObservableHandling) {
      addIssue(issues, "warn", file, line, "catch-observability", "catch block does not rethrow, log, report, or return an error status", m[0]);
    }
  }

  const pyEmptyExceptRe = /except\s+(?:Exception|BaseException|.*Error)?\s*:\s*(?:\n[ \t]+(?:pass|return\s+(?:True|False|None|\[\]|\{\}|["']{2}))\b)/g;
  for (const m of text.matchAll(pyEmptyExceptRe)) {
    addIssue(issues, "error", file, lineOf(text, m.index ?? 0), "no-broad-except-pass", "broad except silently passes or returns a default value", m[0]);
  }
}

function scanTests(file, text, issues) {
  if (!/(^|[._-])(test|spec)\.[cm]?[jt]sx?$/.test(path.basename(file))) return;
  const uncommented = stripComments(text);
  const hasTestCase = /\b(test|it)\s*\(/.test(uncommented);
  const hasAssertion = /\b(expect|assert|strictEqual|deepEqual|toBe|toEqual|toThrow|rejects|resolves|throws)\b/.test(uncommented);
  if (hasTestCase && !hasAssertion) {
    addIssue(issues, "error", file, 1, "tests-assert", "test file has test cases but no assertion signal", "");
  }

  const skipRe = /\b(?:describe|test|it)\.skip\s*\(/g;
  for (const m of uncommented.matchAll(skipRe)) {
    addIssue(issues, "warn", file, lineOf(text, m.index ?? 0), "no-skipped-tests", "skipped test left in source", m[0]);
  }

  const tautologyRe = /expect\s*\(\s*(?:true|1|["'][^"']*["'])\s*\)\s*\.\s*(?:toBe|toEqual)\s*\(\s*(?:true|1|["'][^"']*["'])\s*\)/g;
  for (const m of uncommented.matchAll(tautologyRe)) {
    addIssue(issues, "error", file, lineOf(text, m.index ?? 0), "no-tautology-tests", "test assertion is a tautology", m[0]);
  }
}

function summarize(issues) {
  const errors = issues.filter(i => i.severity === "error").length;
  const warnings = issues.filter(i => i.severity === "warn").length;
  return [
    {
      id: "tests-assert",
      name: "테스트 assertion/observable behavior 검증",
      status: issues.some(i => i.rule === "tests-assert" || i.rule === "no-tautology-tests") ? "fail" : "pass",
    },
    {
      id: "no-empty-catch",
      name: "empty catch / broad except pass 금지",
      status: issues.some(i => i.rule === "no-empty-catch" || i.rule === "no-broad-except-pass") ? "fail" : "pass",
    },
    {
      id: "no-broad-swallow",
      name: "에러를 성공처럼 삼키는 처리 금지",
      status: issues.some(i => i.rule === "no-broad-swallow") ? "fail" : issues.some(i => i.rule === "catch-observability") ? "warn" : "pass",
    },
    {
      id: "no-skipped-tests",
      name: "skip/todo 테스트 감시",
      status: issues.some(i => i.rule === "no-skipped-tests") ? "warn" : "pass",
    },
    {
      id: "summary",
      name: `${errors} errors, ${warnings} warnings`,
      status: errors ? "fail" : warnings ? "warn" : "pass",
    },
  ];
}

const files = await targetFiles();
const issues = [];
for (const abs of files) {
  const file = rel(abs);
  const text = await readFile(abs, "utf8");
  scanErrorHandling(file, text, issues);
  scanTests(file, text, issues);
}

const result = {
  ok: !issues.some(i => i.severity === "error"),
  scanned_files: files.length,
  gates: summarize(issues),
  issues: issues.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`AI quality gates: ${result.ok ? "PASS" : "FAIL"} (${result.scanned_files} files scanned)`);
  for (const gate of result.gates) console.log(`- ${gate.status.toUpperCase()} ${gate.id}: ${gate.name}`);
  for (const issue of result.issues) {
    console.log(`${issue.severity.toUpperCase()} ${issue.file}:${issue.line} ${issue.rule} - ${issue.message}`);
  }
}

process.exit(result.ok ? 0 : 1);
