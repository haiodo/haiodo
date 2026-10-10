// Single source for the projects list, shared by the home page and /projects.
export type ProjectLink = { label: string; href: string; icon?: boolean };
export type Project = {
  name: string;
  lang: string;
  years: string;
  note: string;
  about: string;
  links: ProjectLink[];
};

export const projects: Project[] = [
  {
    name: "Intabia Platform",
    lang: "TypeScript",
    years: "2025 -",
    note: "Интабия Платформа, чем занимаюсь сейчас",
    about: "Продуктовая ветка платформы в Intabia Fusion, где я со-основатель. Тот же фундамент, что и Huly: объектная модель, живые запросы, постоянное соединение.",
    links: [
      { label: "platform.intabia.ru", href: "https://platform.intabia.ru" },
      { label: "github", href: "https://github.com/intabia-fusion/platform/pulls", icon: true },
    ],
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
  },
  {
    name: "Huly",
    lang: "TypeScript",
    years: "2021 - 2025",
    note: "открытая платформа для бизнес-приложений",
    about: "Открытая платформа для приложений: Chat, Tracker, HRM, ATS. Моими руками сделаны Tracker, Github Integration, системные и UI-компоненты. 26k+ звёзд на GitHub.",
    links: [
      { label: "huly.io", href: "https://huly.io" },
      { label: "github", href: "https://github.com/hcengineering/platform", icon: true },
    ],
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
  },
  {
    name: "OAITT",
    lang: "Python / Swift",
    years: "2025 -",
    note: "распознавание речи на GigaAM с API как у OpenAI",
    about: "Сервис распознавания речи на модели GigaAM с API, совместимым с OpenAI. Две реализации с одним API: сервис на Python и нативная сборка на Swift/MLX для Apple Silicon в виде приложения для строки меню macOS. Воркеры - отдельные процессы с автоперезапуском, живая статистика, бенчмарки.",
    links: [{ label: "github", href: "https://github.com/haiodo/oaitt", icon: true }],
  },
  {
    name: "Tenniarb",
    lang: "Swift",
    years: "2018 -",
    note: "редактор мозговых карт для macOS",
    about: "Личный проект: нативный редактор мозговых карт для macOS со своим текстовым форматом описания диаграмм и движком вычислений.",
    links: [{ label: "github", href: "https://github.com/haiodo/tenniarb", icon: true }],
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
  },
  {
    name: "OOP",
    lang: "C++ / Java",
    years: "2023 -",
    note: "курс и задания по ООП для НГУ",
    about: "Курс и задания по объектно-ориентированному программированию, который веду у студентов Новосибирского государственного университета.",
    links: [{ label: "github", href: "https://github.com/haiodo/oop", icon: true }],
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
  },
  {
    name: "ECL",
    lang: "Java",
    years: "2010 - 2013",
    note: "Eclipse Command Language, скриптовый язык Q7 и RCPTT",
    about: "Расширяемый скриптовый язык командной строки от Xored, основной язык сценариев Q7 и RCPTT. Делал ядро, runtime отладчика, переработку клиент-серверного выполнения команд и новые команды.",
    links: [{ label: "github", href: "https://github.com/haiodo/ecl", icon: true }],
  },
  {
    name: "F4",
    lang: "Java / Fantom",
    years: "2010 - 2016",
    note: "IDE для языка Fantom на Eclipse",
    about: "IDE для языка Fantom на базе Eclipse и DLTK. Интеграция с JDT, автодополнение и навигация по FFI, парсер, сборка; позже сопровождал проект и принимал PR сообщества.",
    links: [{ label: "github", href: "https://github.com/haiodo/f4", icon: true }],
  },
  {
    name: "YANG-IDE",
    lang: "Java",
    years: "2014 - 2016",
    note: "IDE для языка моделирования YANG / NETCONF",
    about: "IDE для языка YANG, разрабатывалась в Xored для Cisco. Продукт, сборка, редакторы, модель. Форк продолжает жить в OpenDaylight.",
    links: [{ label: "github", href: "https://github.com/haiodo/yang-ide", icon: true }],
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
  },
  {
    name: "RCPML",
    lang: "Java",
    years: "2006 - 2007",
    note: "декларативный UI на XML для Eclipse RCP",
    about: "UI-движок для Eclipse RCP: интерфейс описывается на XML и оформляется стилями CSS. Делал ядро, формы и отрисовку на SWT.",
    links: [{ label: "github", href: "https://github.com/haiodo/rcpml", icon: true }],
  },
// Active projects ("2025 -") go first in the order written; finished ones follow, newest start year first.
].sort((a, b) => {
  const aActive = a.years.endsWith("-");
  const bActive = b.years.endsWith("-");
  if (aActive !== bActive) return aActive ? -1 : 1;
  if (aActive) return 0;
  return parseInt(b.years) - parseInt(a.years);
});
