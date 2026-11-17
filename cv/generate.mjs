import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "yaml";

const resume = parse(readFileSync(new URL("resume.yaml", import.meta.url), "utf8"));
const ids = resume.experience.flatMap((job) => [job.id, ...(job.positions ?? []).map((position) => position.id)]);
assert.equal(new Set(ids).size, ids.length, "Experience ids must be unique");

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
const plain = (value, lang) => typeof value === "string" ? value : value[lang];
const text = (value, lang) => escapeHtml(plain(value, lang));

const bullets = (items, lang) => items?.length
  ? `<ul>\n${items.map((item) => `  <li>- ${text(item, lang)}</li>`).join("\n")}\n</ul>\n`
  : "";

function position(position, lang, organization) {
  return `<div class="sub">
  <p class="job-head">${text(position.role, lang)}, ${text(organization, lang)}, ${text(position.period, lang)}</p>
${bullets(position.bullets, lang)}</div>
`;
}

function job(job, lang) {
  return `<section class="job">
  <p class="job-head">${text(job.role, lang)}, ${text(job.organization, lang)}, ${text(job.period, lang)}</p>
${job.description ? `  <p>${text(job.description, lang)}</p>\n` : ""}${job.note ? `  <p>${text(job.note, lang)}</p>\n` : ""}${bullets(job.bullets, lang)}${(job.positions ?? []).map((item) => position(item, lang, job.organization)).join("\n")}</section>
`;
}

function markdown(lang) {
  const lines = [
    `# ${plain(resume.profile.name, lang)}`,
    "",
    plain(resume.profile.title, lang),
    plain(resume.profile.location, lang),
    "",
    ...resume.contacts,
    "",
    `## ${plain(resume.headings.summary, lang)}`,
    "",
    plain(resume.profile.summary, lang),
    "",
    `## ${plain(resume.headings.experience, lang)}`,
  ];
  for (const job of resume.experience) {
    lines.push("", `### ${plain(job.role, lang)}, ${plain(job.organization, lang)}, ${plain(job.period, lang)}`);
    if (job.description) lines.push("", plain(job.description, lang));
    if (job.note) lines.push("", plain(job.note, lang));
    for (const bullet of job.bullets ?? []) lines.push(`- ${plain(bullet, lang)}`);
    for (const position of job.positions ?? []) {
      lines.push("", `#### ${plain(position.role, lang)}, ${plain(job.organization, lang)}, ${plain(position.period, lang)}`);
      for (const bullet of position.bullets ?? []) lines.push(`- ${plain(bullet, lang)}`);
    }
  }
  lines.push("", `## ${plain(resume.headings.openSource, lang)}`);
  for (const project of resume.openSource) {
    lines.push(`- ${plain(project.name, lang)}: ${plain(project.description, lang)} ${project.link}`);
  }
  lines.push(
    "",
    `## ${plain(resume.headings.skills, lang)}`,
    "",
    plain(resume.skills, lang),
    "",
    `## ${plain(resume.headings.education, lang)}`,
    "",
    plain(resume.education.school, lang),
  );
  for (const degree of resume.education.degrees) {
    lines.push(`${plain(degree.name, lang)}, ${degree.period}`);
  }
  lines.push("", `## ${plain(resume.headings.languages, lang)}`, "", plain(resume.languageSummary, lang));
  return `${lines.join("\n")}\n`;
}

for (const lang of ["ru", "en"]) {
  const page = `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <title>${text(resume.headings.pageTitle, lang)}</title>
  <link rel="stylesheet" href="cv.css">
</head>
<body>
  <section class="identity">
    <h1>${text(resume.profile.name, lang)}</h1>
    <p>${text(resume.profile.title, lang)}</p>
    <p>${text(resume.profile.location, lang)}</p>
${resume.contacts.map((contact) => `    <p class="contact">${escapeHtml(contact)}</p>`).join("\n")}
  </section>

  <h2>${text(resume.headings.summary, lang)}</h2>
  <p>${text(resume.profile.summary, lang)}</p>

  <h2>${text(resume.headings.experience, lang)}</h2>
${resume.experience.map((item) => job(item, lang)).join("\n")}
  <h2>${text(resume.headings.openSource, lang)}</h2>
${resume.openSource.map((project) => `  <p>- ${text(project.name, lang)}: ${text(project.description, lang)} ${escapeHtml(project.link)}</p>`).join("\n")}

  <h2>${text(resume.headings.skills, lang)}</h2>
  <p>${text(resume.skills, lang).replace(/\n/g, "<br>\n")}</p>

  <h2>${text(resume.headings.education, lang)}</h2>
  <p>${text(resume.education.school, lang)}</p>
${resume.education.degrees.map((degree) => `  <p>${text(degree.name, lang)}, ${text(degree.period, lang)}</p>`).join("\n")}

  <h2>${text(resume.headings.languages, lang)}</h2>
  <p>${text(resume.languageSummary, lang)}</p>
</body>
</html>
`;
  writeFileSync(new URL(`${lang}.html`, import.meta.url), page);
  writeFileSync(new URL(`${lang}.md`, import.meta.url), markdown(lang));
  console.log(`Generated cv/${lang}.html and cv/${lang}.md`);
}
