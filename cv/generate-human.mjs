import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "yaml";

const resume = parse(readFileSync(new URL("resume.yaml", import.meta.url), "utf8"));
const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
const text = (value, lang) => escapeHtml(typeof value === "string" ? value : value[lang]);

const bullets = (items, lang) => items?.length
  ? `    <ul>\n${items.map((item) => `      <li>${text(item, lang)}</li>`).join("\n")}\n    </ul>\n`
  : "";

function position(position, lang) {
  return `    <div class="sub">
      <div class="job-head">
        <span class="job-role">${text(position.role, lang)}</span>
        <span class="job-period mono">${text(position.period, lang)}</span>
      </div>
${bullets(position.bullets, lang)}    </div>
`;
}

function job(job, lang) {
  return `  <div class="job">
    <div class="job-head">
      <span><span class="job-org">${text(job.organization, lang)}</span> <span class="job-role">- ${text(job.role, lang)}</span></span>
      <span class="job-period mono">${text(job.period, lang)}</span>
    </div>
${job.description ? `    <p>${text(job.description, lang)}</p>\n` : ""}${job.note ? `    <p class="note">${text(job.note, lang)}</p>\n` : ""}${bullets(job.bullets, lang)}${(job.positions ?? []).map((item) => position(item, lang)).join("\n")}  </div>
`;
}

for (const lang of ["ru", "en"]) {
  const name = text(resume.profile.name, lang);
  const page = `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <title>${text(resume.headings.pageTitle, lang)}</title>
  <link rel="stylesheet" href="human-cv.css">
</head>
<body>
  <header>
    <img class="photo" src="../src/assets/me.jpeg" alt="${name}">
    <div>
      <h1>${name}</h1>
      <p class="title">${text(resume.profile.title, lang)}</p>
      <p class="location">${text(resume.profile.location, lang)}</p>
    </div>
    <ul class="contacts mono">
${resume.contacts.map((contact) => `      <li><a href="${escapeHtml(contact.startsWith("https://") ? contact : `mailto:${contact}`)}">${escapeHtml(contact)}</a></li>`).join("\n")}
    </ul>
  </header>

  <h2>${text(resume.headings.summary, lang)}</h2>
  <p>${text(resume.profile.summary, lang)}</p>

  <h2>${text(resume.headings.experience, lang)}</h2>
${resume.experience.map((item) => job(item, lang)).join("\n")}
  <h2>${text(resume.headings.openSource, lang)}</h2>
  <dl class="grid">
${resume.openSource.map((project) => `    <dt>${text(project.name, lang)}</dt><dd>${text(project.description, lang)} <span class="nowrap">${escapeHtml(project.link)}</span></dd>`).join("\n")}
  </dl>

  <div class="two-col">
    <div>
      <h2>${text(resume.headings.skills, lang)}</h2>
      <p>${text(resume.skills, lang).replace(/\n/g, "<br>\n")}</p>
    </div>
    <div>
      <h2>${text(resume.headings.education, lang)}</h2>
      <p><b>${text(resume.education.school, lang)}</b></p>
${resume.education.degrees.map((degree) => `      <p>${text(degree.name, lang)} <span class="job-period mono">${text(degree.period, lang)}</span></p>`).join("\n")}
      <h2>${text(resume.headings.languages, lang)}</h2>
      <p>${text(resume.languageSummary, lang)}</p>
    </div>
  </div>
</body>
</html>
`;
  writeFileSync(new URL(`human-${lang}.html`, import.meta.url), page);
  console.log(`Generated cv/human-${lang}.html`);
}
