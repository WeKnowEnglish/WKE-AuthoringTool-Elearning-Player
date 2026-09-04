import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const specsDir = path.join(webRoot, "content/worksheets/specs");
const outDir = path.join(webRoot, "content/worksheets/generated");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function letter(index) {
  return String.fromCharCode(65 + index);
}

function renderMatch(section) {
  const left = section.left ?? [];
  const right = section.right ?? [];
  const rows = left
    .map((item, index) => {
      return `<li><span class="q">${escapeHtml(item)}</span><span class="blank-box" aria-hidden="true"></span></li>`;
    })
    .join("");
  const choices = right
    .map((item, index) => `<li><strong>${letter(index)}.</strong> ${escapeHtml(item)}</li>`)
    .join("");
  return `
    <ol class="match-q">${rows}</ol>
    <ol class="match-a">${choices}</ol>
  `;
}

function renderChoose(section) {
  return `<ol class="choose">
    ${(section.items ?? [])
      .map((item) => {
        const options = (item.options ?? [])
          .map((option) => `<span class="choice">${escapeHtml(option)}</span>`)
          .join(' <span class="slash">/</span> ');
        return `<li>${escapeHtml(item.before ?? "")} (${options}) ${escapeHtml(item.after ?? "")}</li>`;
      })
      .join("")}
  </ol>`;
}

function renderGapfill(section) {
  const bank = (section.bank ?? [])
    .map((word) => `<span class="bank-word">${escapeHtml(word)}</span>`)
    .join("");
  const items = (section.items ?? [])
    .map((item) => `<li>${escapeHtml(item.text).replace(/_____/g, '<span class="gap"></span>')}</li>`)
    .join("");
  return `
    ${bank ? `<p class="word-bank">${bank}</p>` : ""}
    <ol>${items}</ol>
  `;
}

function renderScramble(section) {
  return `<ol class="scramble">
    ${(section.items ?? [])
      .map((item) => {
        const chips = (item.words ?? [])
          .map((word) => `<span class="chip">${escapeHtml(word)}</span>`)
          .join("");
        return `<li>
          <div class="chips">${chips}</div>
          <div class="write-line"></div>
        </li>`;
      })
      .join("")}
  </ol>`;
}

function renderWriting(section) {
  const prompts = (section.prompts ?? [])
    .map(
      (prompt) => `<li>
        <span class="prompt-label">${escapeHtml(prompt.label)}</span>
        <span class="frame">${escapeHtml(prompt.frame)}</span>
      </li>`,
    )
    .join("");
  const extraLines = Array.from({ length: section.lines ?? 0 }, () => `<div class="write-line"></div>`).join("");
  return `
    <ol class="writing">${prompts}</ol>
    ${section.stretch ? `<p class="stretch"><strong>Challenge:</strong> ${escapeHtml(section.stretch)}</p>${extraLines}` : extraLines}
  `;
}

function renderSectionBody(section) {
  switch (section.type) {
    case "match":
      return renderMatch(section);
    case "choose":
      return renderChoose(section);
    case "gapfill":
      return renderGapfill(section);
    case "scramble":
      return renderScramble(section);
    case "writing":
      return renderWriting(section);
    default:
      throw new Error(`Unknown section type: ${section.type}`);
  }
}

function renderAnswers(spec) {
  const blocks = (spec.sections ?? []).map((section) => {
    let body = "";
    if (section.type === "match") {
      body = `<ol>${(section.left ?? [])
        .map((item, index) => {
          const letterKey = section.answers?.[index] ?? "";
          const rightIndex = letterKey.charCodeAt(0) - 65;
          const answer = section.right?.[rightIndex] ?? letterKey;
          return `<li>${escapeHtml(item)} → <strong>${escapeHtml(letterKey)}</strong> ${escapeHtml(answer)}</li>`;
        })
        .join("")}</ol>`;
    } else if (section.type === "choose") {
      body = `<ol>${(section.items ?? [])
        .map((item) => `<li>${escapeHtml(item.before ?? "")} <strong>${escapeHtml(item.answer)}</strong> ${escapeHtml(item.after ?? "")}</li>`)
        .join("")}</ol>`;
    } else if (section.type === "gapfill") {
      body = `<ol>${(section.items ?? [])
        .map((item) => `<li>${escapeHtml(item.text.replace("_____", item.answer))} <em>(${escapeHtml(item.answer)})</em></li>`)
        .join("")}</ol>`;
    } else if (section.type === "scramble") {
      body = `<ol>${(section.items ?? [])
        .map((item) => `<li>${escapeHtml(item.answer)}</li>`)
        .join("")}</ol>`;
    } else if (section.type === "writing") {
      body = `<p>Student's own answers. Check for a complete sentence, capital letter, and full stop.</p>`;
    }
    return `<section class="answer-block"><h3>${escapeHtml(section.title)}</h3>${body}</section>`;
  });
  return blocks.join("");
}

function worksheetCss() {
  return `
    :root {
      --ink: #1f2937;
      --muted: #64748b;
      --line: #cbd5e1;
      --paper: #fffdf8;
      --accent: #0f766e;
      --box: #f1f5f4;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", "Trebuchet MS", sans-serif;
      color: var(--ink);
      background: #e2e8f0;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
      padding: 10px 16px;
      background: #0f172a;
      color: white;
      font-size: 14px;
    }
    .toolbar button {
      border: 0;
      border-radius: 999px;
      padding: 7px 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .toolbar .print { background: #f8fafc; }
    .toolbar .toggle { background: #5eead4; color: #134e4a; }
    .sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 16px auto;
      padding: 14mm 14mm 16mm;
      background: var(--paper);
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.18);
    }
    header.masthead {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      border-bottom: 3px solid var(--accent);
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .brand {
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 800;
    }
    h1 { margin: 2px 0 0; font-size: 28px; line-height: 1.1; }
    .subtitle { margin: 2px 0 0; color: var(--muted); font-size: 14px; }
    .meta {
      font-size: 12px;
      text-align: right;
      color: var(--muted);
    }
    .id-row {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr;
      gap: 12px;
      margin: 12px 0 16px;
      font-size: 13px;
    }
    .id-row span {
      display: block;
      border-bottom: 1.5px solid var(--ink);
      min-height: 22px;
    }
    .intro { margin: 0 0 14px; font-size: 14px; }
    section.block { margin: 0 0 16px; break-inside: avoid; }
    h2 {
      margin: 0 0 6px;
      font-size: 16px;
      color: var(--accent);
    }
    .instruction { margin: 0 0 8px; font-size: 13px; color: var(--muted); }
    ol { margin: 0; padding-left: 22px; }
    li { margin: 0 0 8px; }
    .match-q { margin-bottom: 10px; }
    .match-q li {
      display: grid;
      grid-template-columns: 1fr 36px;
      align-items: center;
      gap: 10px;
    }
    .blank-box {
      width: 32px;
      height: 26px;
      border: 1.5px solid var(--ink);
      border-radius: 4px;
    }
    .match-a {
      columns: 2;
      background: var(--box);
      padding: 10px 12px 10px 32px;
      border-radius: 8px;
    }
    .choice {
      display: inline-block;
      min-width: 2.2em;
      text-align: center;
      border-bottom: 1.5px dashed var(--ink);
      padding: 0 2px;
    }
    .word-bank {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 10px;
    }
    .bank-word, .chip {
      display: inline-block;
      padding: 3px 9px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: white;
      font-weight: 700;
    }
    .gap {
      display: inline-block;
      width: 88px;
      border-bottom: 1.5px solid var(--ink);
    }
    .chips { margin-bottom: 6px; display: flex; flex-wrap: wrap; gap: 6px; }
    .write-line {
      border-bottom: 1.5px solid var(--line);
      height: 26px;
    }
    .writing .prompt-label {
      display: inline-block;
      width: 78px;
      font-weight: 700;
      color: var(--muted);
      font-size: 12px;
    }
    .stretch { margin: 8px 0 6px; }
    .answers { display: none; page-break-before: always; }
    body.show-answers .answers { display: block; }
    body.show-answers .student-only { display: none; }
    .answers h2 { color: #9a3412; }
    footer.note {
      margin-top: 18px;
      font-size: 11px;
      color: var(--muted);
      border-top: 1px solid var(--line);
      padding-top: 8px;
    }
    @page { size: A4; margin: 12mm; }
    @media print {
      body { background: white; }
      .toolbar { display: none; }
      .sheet {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
    }
  `;
}

function renderHtml(spec) {
  const sections = (spec.sections ?? [])
    .map((section) => {
      return `<section class="block">
        <h2>${escapeHtml(section.title)}</h2>
        ${section.instruction ? `<p class="instruction">${escapeHtml(section.instruction)}</p>` : ""}
        ${renderSectionBody(section)}
      </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(spec.title)} — ${escapeHtml(spec.school ?? "Worksheet")}</title>
  <style>${worksheetCss()}</style>
</head>
<body>
  <div class="toolbar">
    <span>Print this page, then choose Save as PDF.</span>
    <button class="toggle" type="button" data-toggle>Show answers</button>
    <button class="print" type="button" data-print>Print / Save PDF</button>
  </div>
  <main class="sheet student-only">
    <header class="masthead">
      <div>
        <div class="brand">${escapeHtml(spec.school ?? "We Know English Center")}</div>
        <h1>${escapeHtml(spec.title)}</h1>
        <p class="subtitle">${escapeHtml(spec.subtitle ?? "")}</p>
      </div>
      <div class="meta">
        <div>${escapeHtml(spec.level ?? "")}</div>
        <div>${spec.minutes ? `${spec.minutes} minutes` : ""}</div>
      </div>
    </header>
    <div class="id-row">
      <div>Name <span></span></div>
      <div>Class <span></span></div>
      <div>Date <span></span></div>
    </div>
    ${spec.intro ? `<p class="intro">${escapeHtml(spec.intro)}</p>` : ""}
    ${sections}
    <footer class="note">Write neatly. Check capitals, spelling, and full stops.</footer>
  </main>
  <main class="sheet answers">
    <header class="masthead">
      <div>
        <div class="brand">${escapeHtml(spec.school ?? "We Know English Center")}</div>
        <h1>${escapeHtml(spec.title)} — Answer key</h1>
        <p class="subtitle">Teacher copy</p>
      </div>
    </header>
    ${renderAnswers(spec)}
  </main>
  <script>
    const toggle = document.querySelector("[data-toggle]");
    const printBtn = document.querySelector("[data-print]");
    toggle.addEventListener("click", () => {
      const showing = document.body.classList.toggle("show-answers");
      toggle.textContent = showing ? "Show student sheet" : "Show answers";
    });
    printBtn.addEventListener("click", () => window.print());
  </script>
</body>
</html>
`;
}

function loadSpecs() {
  const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const files = requested.length
    ? requested.map((name) => (name.endsWith(".json") ? name : `${name}.json`))
    : fs.readdirSync(specsDir).filter((name) => name.endsWith(".json"));
  return files.map((file) => {
    const specPath = path.isAbsolute(file) ? file : path.join(specsDir, path.basename(file));
    const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
    if (!spec.id || !spec.title) throw new Error(`Spec ${specPath} needs id and title.`);
    return spec;
  });
}

fs.mkdirSync(outDir, { recursive: true });
const specs = loadSpecs();
for (const spec of specs) {
  const outPath = path.join(outDir, `${spec.id}.html`);
  fs.writeFileSync(outPath, renderHtml(spec), "utf8");
  console.log(`Wrote ${path.relative(webRoot, outPath)}`);
}
