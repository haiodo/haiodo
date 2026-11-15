// Single source for the projects list, shared by the home page and /projects.
export type ProjectLink = { label: string; href: string; icon?: boolean };
export type Project = {
  name: string;
  lang: string;
  years: string;
  note: string;
  about: string;
  links: ProjectLink[];
  /** English copy; pages without a translation fall back to the Russian one. */
  en?: { name?: string; note: string; about: string; links?: ProjectLink[] };
};

export const projects: Project[] = [
  {
    name: "Интабия Платформа",
    lang: "TypeScript",
    years: "2025 -",
    note: "открытая платформа для команд, чем занимаюсь сейчас",
    about: "Открытая платформа и единое место работы для команд: Chat, Tracker, Office, Drive. Доступна в Web, Desktop, iOS, Android и через MCP.",
    links: [
      { label: "platform.intabia.ru", href: "https://platform.intabia.ru" },
      { label: "github", href: "https://github.com/intabia-fusion/platform/pulls", icon: true },
    ],
    en: {
      name: "Intabia Platform",
      note: "open platform for teams, what I work on now",
      about: "An open platform and a single workspace for teams: Chat, Tracker, Office, Drive. Available on Web, Desktop, iOS, Android and through MCP.",
    },
  },
  {
    name: "Platform Collective",
    lang: "TypeScript",
    years: "2026 -",
    note: "продолжение платформы сообществом",
    about: "Тот же фундамент, что и Huly, но развитие идёт сообществом и в открытую. Форк, который живёт своей жизнью.",
    links: [
      { label: "Platform-Collective", href: "https://github.com/Platform-Collective", icon: true },
      { label: "platform", href: "https://github.com/Platform-Collective/platform", icon: true },
    ],
    en: {
      note: "the platform continued by the community",
      about: "The same foundation as Huly, but development happens in the open, by the community. A fork that lives its own life.",
    },
  },
  {
    name: "Huly",
    lang: "TypeScript",
    years: "2021 - 2025",
    note: "открытая платформа для бизнес-приложений",
    about: "Открытая платформа для приложений: Chat, Tracker, HRM, ATS. Моими руками сделаны Tracker, Github Integration, системные и UI-компоненты. 27.9k звёзд на GitHub.",
    links: [
      { label: "huly.io", href: "https://huly.io" },
      { label: "github", href: "https://github.com/hcengineering/platform", icon: true },
    ],
    en: {
      note: "open platform for business applications",
      about: "An open platform for applications: Chat, Tracker, HRM, ATS. Tracker, GitHub Integration, system and UI components are my work. 27.9k stars on GitHub.",
    },
  },
  {
    name: "GOWT",
    lang: "Go",
    years: "2026 -",
    note: "нативный графический интерфейс для Go без cgo",
    about: "Библиотека для создания приложений на Go с нативными виджетами macOS, Windows и Linux. Go API построен по технологии Eclipse SWT, адаптированной с Java на Go. + Чистые Go подходы.",
    links: [
      { label: "github", href: "https://github.com/haiodo/gowt", icon: true },
      { label: "история изменений", href: "/projects/GOWT/changelog" },
      { label: "О пользе генеративного AI, или Как я сделал свой UI-фреймворк", href: "/posts/021_widget_toolkit", icon: true }
    ],
    en: {
      note: "native GUI for Go without cgo",
      about: "A library for building Go applications with native widgets on macOS, Windows and Linux. The Go API follows Eclipse SWT, adapted from Java to Go. Plus clean Go approaches.",
      links: [
        { label: "github", href: "https://github.com/haiodo/gowt", icon: true },
        { label: "changelog", href: "/projects/GOWT/changelog" },
        { label: "On the benefits of generative AI, or how I built my own UI framework", href: "/en/posts/021_widget_toolkit", icon: true }
      ],
    },
  },
  {
    name: "Hum1izer",
    lang: "Go",
    years: "2026 -",
    note: "ищет канцелярит и следы нейросети в тексте, комментариях и коммитах",
    about: "CLI на Go: проверяет прозу, комментарии в коде и сообщения коммитов на штампы, канцелярит и AI-слоп, показывает находки с номерами строк и советом. Встраивается в Claude Code, Codex, opencode и pi как скилл и хуки: агент видит находку сразу после правки. Текст сам не пишет, решает человек.",
    links: [
      { label: "github", href: "https://github.com/haiodo/hum1izer", icon: true },
      { label: "как делался", href: "/posts/013_hum1izer" },
      { label: "неделя с хуками", href: "/posts/016_hum1izer_hooks" },
    ],
    en: {
      note: "finds officialese and AI traces in prose, code comments and commits",
      about: "A Go CLI: checks prose, code comments and commit messages for clichés, officialese and AI slop, reports findings with line numbers and a suggestion. Plugs into Claude Code, Codex, opencode and pi as a skill and hooks: the agent sees the finding right after an edit. It doesn't write text for you; the human decides.",
      links: [
        { label: "github", href: "https://github.com/haiodo/hum1izer", icon: true },
        { label: "how it was built", href: "/en/posts/013_hum1izer" },
        { label: "a week with hooks", href: "/en/posts/016_hum1izer_hooks" },
      ],
    },
  },
  {
    name: "OAITT",
    lang: "Python / Swift",
    years: "2025 -",
    note: "распознавание речи на GigaAM с API как у OpenAI",
    about: "Сервис распознавания речи на модели GigaAM с API, совместимым с OpenAI. Две реализации с одним API: сервис на Python и нативная сборка на Swift/MLX для Apple Silicon в виде приложения для строки меню macOS. Воркеры - отдельные процессы с автоперезапуском, живая статистика, бенчмарки.",
    links: [{ label: "github", href: "https://github.com/haiodo/oaitt", icon: true }],
    en: {
      note: "speech recognition on GigaAM with an OpenAI-compatible API",
      about: "A speech recognition service on the GigaAM model with an OpenAI-compatible API. Two implementations with one API: a Python service and a native Swift/MLX build for Apple Silicon as a macOS menu bar app. Workers run as separate processes with auto-restart, live stats and benchmarks.",
    },
  },
  {
    name: "Tenniarb",
    lang: "Go / TypeScript",
    years: "2018 -",
    note: "дизайн-инструмент с текстовым форматом",
    about: "Личный проект: дизайн-инструмент, в котором интерфейсы живут в текстовом формате .tenn — компоненты, стили, параметры, анимации и вычисления в узлах. Приложение на Go для macOS, Windows и Linux, веб-версия и MCP для агентов.",
    links: [
      { label: "описание проекта", href: "/projects/Tenniarb/overview" },
      { label: "живая демонстрация", href: "/projects/Tenniarb/demo" },
      { label: "github", href: "https://github.com/haiodo/tenniarb", icon: true },
    ],
    en: {
      note: "design tool with a text format",
      about: "A personal project: a design tool where interfaces live in the .tenn text format — components, styles, parameters, animations and computations in nodes. A Go app for macOS, Windows and Linux, a web version and MCP for agents.",
      links: [
        { label: "project overview", href: "/projects/Tenniarb/overview" },
        { label: "live demo", href: "/projects/Tenniarb/demo" },
        { label: "github", href: "https://github.com/haiodo/tenniarb", icon: true },
      ],
    },
  },
  {
    name: "Network Service Mesh",
    lang: "Go",
    years: "2018 - 2020",
    note: "hybrid/multi-cloud IP service mesh",
    about: "Гибридный/мульти-облачный IP service mesh для Kubernetes. Работал над ядром и интеграциями.",
    links: [
      { label: "networkservicemesh.io", href: "https://networkservicemesh.io" },
      { label: "github", href: "https://github.com/networkservicemesh", icon: true },
    ],
    en: {
      note: "hybrid/multi-cloud IP service mesh",
      about: "A hybrid/multi-cloud IP service mesh for Kubernetes. I worked on the core and integrations.",
    },
  },
  {
    name: "OOP",
    lang: "C++ / Java",
    years: "2023 -",
    note: "курс и задания по ООП для НГУ",
    about: "Курс и задания по объектно-ориентированному программированию, который веду у студентов Новосибирского государственного университета.",
    links: [{ label: "github", href: "https://github.com/haiodo/oop", icon: true }],
    en: {
      note: "OOP course and assignments for NSU",
      about: "An object-oriented programming course and assignments that I teach to students at Novosibirsk State University.",
    },
  },
  {
    name: "Eclipse RCPTT",
    lang: "Java",
    years: "2009 - 2021",
    note: "инструмент UI-тестирования Eclipse-приложений",
    about: "Инструмент записи и воспроизведения UI-тестов для Eclipse/SWT-приложений. Вырос из проекта Q7 в Xored и стал открытым проектом Eclipse Foundation. Язык сценариев ECL, распределённое выполнение тестов.",
    links: [
      { label: "eclipse.dev/rcptt", href: "https://eclipse.dev/rcptt" },
      { label: "github", href: "https://github.com/eclipse-rcptt", icon: true },
    ],
    en: {
      note: "UI testing tool for Eclipse applications",
      about: "A record-and-replay UI testing tool for Eclipse/SWT applications. It grew out of the Q7 project at Xored and became an open Eclipse Foundation project. The ECL scripting language, distributed test execution.",
    },
  },
  {
    name: "ECL",
    lang: "Java",
    years: "2010 - 2013",
    note: "Eclipse Command Language, скриптовый язык Q7 и RCPTT",
    about: "Расширяемый скриптовый язык командной строки от Xored, основной язык сценариев Q7 и RCPTT. Делал ядро, runtime отладчика, переработку клиент-серверного выполнения команд и новые команды.",
    links: [{ label: "github", href: "https://github.com/haiodo/ecl", icon: true }],
    en: {
      note: "Eclipse Command Language, the scripting language of Q7 and RCPTT",
      about: "An extensible command-line scripting language from Xored, the main scripting language of Q7 and RCPTT. I built the core, the debugger runtime, redesigned client-server command execution and added new commands.",
    },
  },
  {
    name: "F4",
    lang: "Java / Fantom",
    years: "2010 - 2016",
    note: "IDE для языка Fantom на Eclipse",
    about: "IDE для языка Fantom на базе Eclipse и DLTK. Интеграция с JDT, автодополнение и навигация по FFI, парсер, сборка; позже сопровождал проект и принимал PR сообщества.",
    links: [{ label: "github", href: "https://github.com/haiodo/f4", icon: true }],
    en: {
      note: "IDE for the Fantom language on Eclipse",
      about: "An IDE for the Fantom language based on Eclipse and DLTK. JDT integration, completion and FFI navigation, parser, build; later I maintained the project and took community PRs.",
    },
  },
  {
    name: "YANG-IDE",
    lang: "Java",
    years: "2014 - 2016",
    note: "IDE для языка моделирования YANG / NETCONF",
    about: "IDE для языка YANG, разрабатывалась в Xored для Cisco. Продукт, сборка, редакторы, модель. Форк продолжает жить в OpenDaylight.",
    links: [{ label: "github", href: "https://github.com/haiodo/yang-ide", icon: true }],
    en: {
      note: "IDE for the YANG / NETCONF modeling language",
      about: "An IDE for the YANG language, developed at Xored for Cisco. Product, build, editors, model. The fork lives on in OpenDaylight.",
    },
  },
  {
    name: "Eclipse DLTK",
    lang: "Java",
    years: "2005 - 2015",
    note: "Dynamic Languages Toolkit, один из первых контрибьюторов",
    about: "Фреймворк для построения IDE под динамические языки - TCL, Ruby, JavaScript. Один из первых контрибьюторов проекта, делал основу фреймворка и полноценные IDE поверх него.",
    links: [
      { label: "eclipse.dev/dltk", href: "https://eclipse.dev/dltk" },
      { label: "github", href: "https://github.com/eclipse-dltk", icon: true },
    ],
    en: {
      note: "Dynamic Languages Toolkit, one of the first contributors",
      about: "A framework for building IDEs for dynamic languages - TCL, Ruby, JavaScript. One of the first contributors to the project, I built the framework foundation and full IDEs on top of it.",
    },
  },
  {
    name: "RCPML",
    lang: "Java",
    years: "2006 - 2007",
    note: "декларативный UI на XML для Eclipse RCP",
    about: "UI-движок для Eclipse RCP: интерфейс описывается на XML и оформляется стилями CSS. Делал ядро, формы и отрисовку на SWT.",
    links: [{ label: "github", href: "https://github.com/haiodo/rcpml", icon: true }],
    en: {
      note: "declarative UI in XML for Eclipse RCP",
      about: "A UI engine for Eclipse RCP: the interface is described in XML and styled with CSS. I built the core, forms and SWT rendering.",
    },
  },
  // Active projects ("2025 -") go first in the order written; finished ones follow, newest start year first.
].sort((a, b) => {
  const aActive = a.years.endsWith("-");
  const bActive = b.years.endsWith("-");
  if (aActive !== bActive) return aActive ? -1 : 1;
  if (aActive) return 0;
  return parseInt(b.years) - parseInt(a.years);
});

/** Copy in the requested language, with the Russian original as the fallback. */
export function projectText(p: Project, lang: "ru" | "en") {
  if (lang === "ru" || !p.en) {
    return { name: p.name, note: p.note, about: p.about, links: p.links };
  }
  return {
    name: p.en.name ?? p.name,
    note: p.en.note,
    about: p.en.about,
    links: p.en.links ?? p.links,
  };
}
