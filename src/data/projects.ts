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
];
