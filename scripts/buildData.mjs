import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
);

const kindergartenTxtPath = path.join(repoRoot, "Kindergarten.txt");
const firstGradeTxtPath = path.join(repoRoot, "FirstGrade.txt");

const outKindergarten = path.join(
  repoRoot,
  "src",
  "data",
  "kindergarten_course.json",
);
const outFirstGrade = path.join(
  repoRoot,
  "src",
  "data",
  "first_grade_course.json",
);

function splitTokens(raw) {
  const parts = raw
    .split(/[,\uFF0C]/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) =>
      t
        .replace(/^["“”']+/, "")
        .replace(/^(\.|。)+/, "")
        .replace(/["“”']+$/, "")
        .replace(/[\.\。!\?！：:;；,，]+$/, "")
        .trim(),
    )
    .filter(Boolean);

  return parts;
}

// (Unused helper removed in this revision.)

function finalizeUnits(unitMap, lessonKeyDefault) {
  const units = [];
  const unitIds = Array.from(unitMap.keys()).sort((a, b) => a - b);
  for (const unitId of unitIds) {
    const lessonMap = unitMap.get(unitId);
    const lessonIds = Array.from(lessonMap.keys()).sort((a, b) => a - b);
    const lessons = [];
    for (const lessonId of lessonIds) {
      const optionMap = lessonMap.get(lessonId);
      const lesson = {
        id: lessonId,
        ...lessonKeyDefault,
      };
      for (const [k, v] of optionMap.entries()) {
        lesson[k] = v;
      }
      lessons.push(lesson);
    }
    units.push({ id: unitId, lessons });
  }
  return { units };
}

function parseKindergartenWords(txt) {
  const unitMap = new Map();
  let unitId = null;
  let lessonId = null;

  const lines = txt.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.toLowerCase() === "end") break;

    const unitMatch = line.match(/^Unit\s+(\d+)\s*$/);
    if (unitMatch) {
      unitId = Number(unitMatch[1]);
      lessonId = null;
      if (!unitMap.has(unitId)) unitMap.set(unitId, new Map());
      continue;
    }

    const lessonMatch = line.match(/^Lesson\s+(\d+)\s*$/);
    if (lessonMatch) {
      lessonId = Number(lessonMatch[1]);
      if (unitId == null) continue;
      const unitLessons = unitMap.get(unitId);
      if (!unitLessons.has(lessonId)) unitLessons.set(lessonId, new Map());
      continue;
    }

    if (unitId == null || lessonId == null) continue;

    const m = line.match(/^(words|rhythm)\s*[:：]\s*(.*)$/i);
    if (!m) continue;

    const base = m[1].toLowerCase();
    const value = m[2] ?? "";
    const tokens = splitTokens(value);
    if (!tokens.length) continue;

    const unitLessons = unitMap.get(unitId);
    const lessonOptions = unitLessons.get(lessonId);
    if (!lessonOptions.has(base)) lessonOptions.set(base, []);
    lessonOptions.get(base).push(tokens);
  }

  return finalizeUnits(unitMap, { words: [], rhythm: [] });
}

function parseFirstGrade(txt) {
  const unitMap = new Map(); // unitId -> lessonId -> optionKey -> lines
  let unitId = null;
  let lessonId = null;

  const lines = txt.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.toLowerCase() === "end") break;

    const unitMatch = line.match(/^Unit\s+(\d+)\s*$/);
    if (unitMatch) {
      unitId = Number(unitMatch[1]);
      lessonId = null;
      if (!unitMap.has(unitId)) unitMap.set(unitId, new Map());
      continue;
    }

    const lessonMatch = line.match(/^Lesson\s+(\d+)\s*$/);
    if (lessonMatch) {
      lessonId = Number(lessonMatch[1]);
      if (unitId == null) continue;
      const unitLessons = unitMap.get(unitId);
      if (!unitLessons.has(lessonId)) unitLessons.set(lessonId, new Map());
      continue;
    }

    if (unitId == null || lessonId == null) continue;

    const contentMatch = line.match(/^([a-zA-Z]+)\s*(\d*)\s*[:：]\s*(.*)$/);
    if (!contentMatch) continue;

    const base = contentMatch[1].toLowerCase();
    const digits = contentMatch[2] ?? "";
    const value = contentMatch[3] ?? "";

    let optionKey = null;
    if (base === "text") optionKey = "text";
    else if (base === "reading")
      optionKey = digits ? `reading${digits}` : "reading";
    else if (base === "rhythm") optionKey = "rhythm";
    else if (base === "laugh") optionKey = "laugh";
    else continue;

    const tokens = splitTokens(value);
    if (!tokens.length) continue;

    const unitLessons = unitMap.get(unitId);
    const lessonOptions = unitLessons.get(lessonId);
    if (!lessonOptions.has(optionKey)) lessonOptions.set(optionKey, []);
    lessonOptions.get(optionKey).push(tokens);
  }

  return finalizeUnits(unitMap, {
    text: [],
    reading: [],
    reading1: [],
    reading2: [],
    reading3: [],
    reading4: [],
    reading5: [],
    reading6: [],
    rhythm: [],
    laugh: [],
  });
}

function main() {
  const kindergartenTxt = fs.readFileSync(kindergartenTxtPath, "utf8");
  const firstGradeTxt = fs.readFileSync(firstGradeTxtPath, "utf8");

  const kindergartenCourse = parseKindergartenWords(kindergartenTxt);
  const firstGradeCourse = parseFirstGrade(firstGradeTxt);

  fs.mkdirSync(path.dirname(outKindergarten), { recursive: true });
  fs.mkdirSync(path.dirname(outFirstGrade), { recursive: true });

  fs.writeFileSync(outKindergarten, JSON.stringify(kindergartenCourse, null, 2), "utf8");
  fs.writeFileSync(
    outFirstGrade,
    JSON.stringify(firstGradeCourse, null, 2),
    "utf8",
  );
}

main();

