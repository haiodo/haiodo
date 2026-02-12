#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Функция для цветного вывода
function colorLog(text, color = 'reset') {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

// Получить дату неделю назад
function getWeekAgoDate() {
  const date = new Date();
  date.setDate(date.getDate() - 365 - 16);
  return date.toISOString().split('T')[0];
}

// Получить сегодняшнюю дату
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// Проверить существование директории и что это git репозиторий
function isValidGitRepo(repoPath) {
  try {
    return (
      fs.existsSync(repoPath) && fs.existsSync(path.join(repoPath, '.git'))
    );
  } catch (error) {
    return false;
  }
}

// Выполнить git команду в определенной директории
function execGitCommand(command, repoPath) {
  try {
    const result = execSync(command, {
      cwd: repoPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch (error) {
    return '';
  }
}

// Проверить статус git репозитория
function checkGitStatus(repoPath) {
  try {
    const statusOutput = execSync('git status --porcelain', {
      cwd: repoPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return statusOutput.trim();
  } catch (error) {
    return '';
  }
}

// Обновить репозиторий (fetch + rebase)
function updateRepository(repoPath, repoName, branch) {
  colorLog(`🔄 Updating repository: ${repoName}`, 'cyan');

  // Проверить статус
  const status = checkGitStatus(repoPath);
  if (status) {
    colorLog(`⚠️  Warning: ${repoName} has uncommitted changes!`, 'yellow');
    colorLog(
      `❌ Skipping update for ${repoName} due to uncommitted changes`,
      'red'
    );
    console.log(`Uncommitted files:\n${status}`);
    return false;
  }

  try {
    // Git fetch
    colorLog(`📥 Fetching latest changes for ${repoName}...`, 'blue');
    execSync('git fetch origin', {
      cwd: repoPath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Git rebase
    colorLog(`🔀 Rebasing ${repoName} to ${branch}...`, 'blue');
    execSync(`git rebase ${branch}`, {
      cwd: repoPath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    colorLog(`✅ Successfully updated ${repoName}`, 'green');
    return true;
  } catch (error) {
    colorLog(`❌ Failed to update ${repoName}: ${error.message}`, 'red');
    return false;
  }
}

// Получить статистику по репозиторию
function getRepoStats(repoPath, repoName, branch, weekAgo, today) {
  if (!isValidGitRepo(repoPath)) {
    colorLog(`❌ Repository not found or not a git repo: ${repoPath}`, 'red');
    return {
      commits: 0,
      linesAdded: 0,
      linesDeleted: 0,
      filesChanged: 0,
      tags: 0,
      totalCommits: 0,
      totalLinesAdded: 0,
      totalLinesDeleted: 0,
      totalContributors: 0,
      myContribution: 0,
      topContributors: [],
      allContributors: [],
      topCommits: [],
      clocStats: {
        totalFiles: 0,
        totalLines: 0,
        totalCode: 0,
        totalComments: 0,
        totalBlank: 0,
      },
    };
  }

  // Получить имя автора
  const author = execGitCommand('git config user.name', repoPath);

  colorLog(`\n📁 Repository: ${repoName}`, 'blue');
  colorLog(`📂 Path: ${repoPath}`, 'blue');
  colorLog(`👤 Author: ${author}`, 'blue');
  colorLog(`🌿 Branch: ${branch}`, 'blue');

  // Получить коммиты за неделю
  colorLog(`🔍 Analyzing commits...`, 'cyan');
  const commitsOutput = execGitCommand(
    `git log --author="${author}" --since="${weekAgo}" --until="${today}" --oneline`,
    repoPath
  );

  const commits = commitsOutput ? commitsOutput.split('\n').length : 0;
  colorLog(`📝 Commits: ${commits}`, 'green');

  // Показать последние коммиты
  if (commits > 0) {
    colorLog('Recent commits:', 'yellow');
    const recentCommits = commitsOutput.split('\n').slice(0, 5);
    recentCommits.forEach((commit) => {
      if (commit.trim()) {
        console.log(`  ${commit}`);
      }
    });
    console.log();
  }

  // Получить статистику изменений строк
  colorLog(`📊 Analyzing line changes...`, 'cyan');
  const statsOutput = execGitCommand(
    `git log --author="${author}" --since="${weekAgo}" --until="${today}" --numstat --pretty=format:""`,
    repoPath
  );

  let linesAdded = 0;
  let linesDeleted = 0;
  let filesChanged = 0;

  if (statsOutput) {
    const lines = statsOutput
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('commit'));
    filesChanged = lines.length;

    lines.forEach((line) => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const added = parseInt(parts[0]) || 0;
        const deleted = parseInt(parts[1]) || 0;
        linesAdded += added;
        linesDeleted += deleted;
      }
    });
  }

  colorLog(`➕ Lines added: ${linesAdded}`, 'green');
  colorLog(`➖ Lines deleted: ${linesDeleted}`, 'red');
  colorLog(`📄 Files changed: ${filesChanged}`, 'purple');

  // Получить теги созданные за неделю
  colorLog(`🏷️  Analyzing tags...`, 'cyan');
  const tagsOutput = execGitCommand(
    `git tag --list --sort=-creatordate --format='%(creatordate:short) %(refname:short)'`,
    repoPath
  );

  let tags = 0;
  if (tagsOutput) {
    const tagLines = tagsOutput.split('\n').filter((line) => {
      const parts = line.trim().split(' ');
      if (parts.length >= 2) {
        const tagDate = parts[0];
        return tagDate >= weekAgo;
      }
      return false;
    });
    tags = tagLines.length;

    if (tags > 0) {
      colorLog(`🏷️  Tags created: ${tags}`, 'cyan');
      colorLog('Recent tags:', 'yellow');
      tagLines.forEach((tagLine) => {
        console.log(`  ${tagLine}`);
      });
    } else {
      colorLog(`🏷️  Tags created: ${tags}`, 'cyan');
    }
  } else {
    colorLog(`🏷️  Tags created: ${tags}`, 'cyan');
  }

  // Получить общую статистику по репозиторию за неделю (все авторы)
  const totalStatsOutput = execGitCommand(
    `git log --since="${weekAgo}" --until="${today}" --numstat --pretty=format:""`,
    repoPath
  );

  let totalLinesAdded = 0;
  let totalLinesDeleted = 0;

  if (totalStatsOutput) {
    const totalLines = totalStatsOutput
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('commit'));
    totalLines.forEach((line) => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const added = parseInt(parts[0]) || 0;
        const deleted = parseInt(parts[1]) || 0;
        totalLinesAdded += added;
        totalLinesDeleted += deleted;
      }
    });
  }

  // Получить общее количество коммитов за неделю
  colorLog(`📈 Analyzing total repository activity...`, 'cyan');
  const totalCommitsOutput = execGitCommand(
    `git log --since="${weekAgo}" --until="${today}" --oneline`,
    repoPath
  );
  const totalCommits = totalCommitsOutput
    ? totalCommitsOutput.split('\n').filter((line) => line.trim()).length
    : 0;

  // Получить количество уникальных участников за неделю
  const contributorsOutput = execGitCommand(
    `git log --since="${weekAgo}" --until="${today}" --format="%an" | sort | uniq`,
    repoPath
  );
  const totalContributors = contributorsOutput
    ? contributorsOutput.split('\n').filter((line) => line.trim()).length
    : 0;

  // Получить всех контрибьюторов с количеством коммитов
  const topContributorsOutput = execGitCommand(
    `git log --since="${weekAgo}" --until="${today}" --format="%an" | sort | uniq -c | sort -nr`,
    repoPath
  );

  let topContributors = [];
  let allContributors = [];
  if (topContributorsOutput) {
    const contributorLines = topContributorsOutput
      .split('\n')
      .filter((line) => line.trim());

    // Собираем всех контрибьюторов для Activity breakdown
    allContributors = contributorLines
      .map((line) => {
        const match = line.trim().match(/^\s*(\d+)\s+(.+)$/);
        if (match) {
          const authorName = match[2];
          const commits = parseInt(match[1]);

          // Получаем статистику по строкам для этого контрибьютора
          const authorStatsOutput = execGitCommand(
            `git log --since="${weekAgo}" --until="${today}" --author="${authorName}" --numstat --pretty=format:""`,
            repoPath
          );

          let linesAdded = 0;
          let linesDeleted = 0;

          if (authorStatsOutput) {
            const authorLines = authorStatsOutput
              .split('\n')
              .filter((line) => line.trim() && !line.startsWith('commit'));

            authorLines.forEach((line) => {
              const parts = line.trim().split('\t');
              if (parts.length >= 2) {
                const added = parseInt(parts[0]) || 0;
                const deleted = parseInt(parts[1]) || 0;
                linesAdded += added;
                linesDeleted += deleted;
              }
            });
          }

          return {
            name: authorName,
            commits: commits,
            linesAdded: linesAdded,
            linesDeleted: linesDeleted,
            netChanges: linesAdded - linesDeleted,
          };
        }
        return null;
      })
      .filter((contributor) => contributor !== null); // Топ-3 для таблицы
    topContributors = allContributors.slice(0, 3);
  }

  // Получить топ коммиты с информацией об изменениях
  colorLog(`🔝 Analyzing top commits...`, 'cyan');
  const topCommitsOutput = execGitCommand(
    `git log --since="${weekAgo}" --until="${today}" --numstat --format="%H|%an|%s|%ad" --date=short`,
    repoPath
  );

  let topCommits = [];
  if (topCommitsOutput) {
    const lines = topCommitsOutput.split('\n');
    let currentCommit = null;
    let commits = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes('|')) {
        // Это строка с информацией о коммите
        if (currentCommit) {
          commits.push(currentCommit);
        }
        const parts = line.split('|');
        if (parts.length >= 4) {
          currentCommit = {
            hash: parts[0].substring(0, 8),
            author: parts[1],
            message: parts[2],
            date: parts[3],
            linesAdded: 0,
            linesDeleted: 0,
            totalChanges: 0,
          };
        }
      } else if (line && currentCommit && line.match(/^\d+\s+\d+/)) {
        // Это строка со статистикой файла
        const stats = line.split('\t');
        if (stats.length >= 2) {
          const added = parseInt(stats[0]) || 0;
          const deleted = parseInt(stats[1]) || 0;
          currentCommit.linesAdded += added;
          currentCommit.linesDeleted += deleted;
          currentCommit.totalChanges += added + deleted;
        }
      }
    }

    // Добавить последний коммит
    if (currentCommit) {
      commits.push(currentCommit);
    }

    // Сортировать по общему количеству изменений и взять топ-20
    topCommits = commits
      .sort((a, b) => b.totalChanges - a.totalChanges)
      .slice(0, 20);
  }

  // Получить статистику CLOC (общее количество строк кода)
  colorLog(`📏 Analyzing codebase size with CLOC...`, 'cyan');
  const clocOutput = execGitCommand(
    `cloc --json --exclude-dir=node_modules,.git,lib,dist,build,out --exclude-ext=js,json,yaml .`,
    repoPath
  );

  let clocStats = {
    totalFiles: 0,
    totalLines: 0,
    totalCode: 0,
    totalComments: 0,
    totalBlank: 0,
  };

  if (clocOutput) {
    try {
      // Найти начало JSON (строку с "{")
      const jsonStart = clocOutput.indexOf('{');
      if (jsonStart !== -1) {
        const jsonString = clocOutput.substring(jsonStart);
        const clocData = JSON.parse(jsonString);

        if (clocData.SUM) {
          clocStats = {
            totalFiles: clocData.SUM.nFiles || 0,
            totalLines:
              (clocData.SUM.code || 0) +
              (clocData.SUM.comment || 0) +
              (clocData.SUM.blank || 0),
            totalCode: clocData.SUM.code || 0,
            totalComments: clocData.SUM.comment || 0,
            totalBlank: clocData.SUM.blank || 0,
          };
          colorLog(
            `📏 CLOC: ${clocStats.totalCode.toLocaleString()} lines of code, ${clocStats.totalFiles.toLocaleString()} files`,
            'green'
          );
        }
      }
    } catch (error) {
      // Если не удалось распарсить JSON, используем значения по умолчанию
      console.log(
        `Warning: Could not parse cloc output for ${repoName}: ${error.message}`
      );
    }
  }

  // Вычислить мой вклад в процентах
  const myContribution =
    totalLinesAdded > 0 ? (linesAdded / totalLinesAdded) * 100 : 0;

  console.log('\n---\n');

  return {
    commits,
    linesAdded,
    linesDeleted,
    filesChanged,
    tags,
    totalCommits,
    totalLinesAdded,
    totalLinesDeleted,
    totalContributors,
    myContribution,
    topContributors,
    allContributors,
    topCommits,
    clocStats,
  };
}

// Функция для генерации markdown таблицы
function generateMarkdownTable(
  repositories,
  allStats,
  totalStats,
  weekAgo,
  today
) {
  let markdown = `# 📊 Weekly Git Statistics Report\n\n`;
  markdown += `> **Period:** ${weekAgo} to ${today}  \n`;
  markdown += `> **Generated:** ${new Date().toLocaleString()}  \n`;
  markdown += `> **Repositories:** ${repositories.length}\n\n`;
  markdown += `---\n\n`;

  // Основная таблица статистики
  markdown += `## 📋 Repository Statistics Overview\n\n`;
  markdown += `| Repository | My Commits | My Lines +/- | Total Commits | Total Lines +/- | Contributors | My Contribution % | Top Contributors | Tags Created | Codebase Size |\n`;
  markdown += `|------------|------------|--------------|---------------|-----------------|--------------|-------------------|------------------|--------------|---------------|\n`;

  allStats.forEach((stats, index) => {
    const repo = repositories[index];
    const myNetChange = stats.linesAdded - stats.linesDeleted;
    const totalNetChange = stats.totalLinesAdded - stats.totalLinesDeleted;
    const myChangeStr =
      myNetChange >= 0
        ? `+${myNetChange.toLocaleString()}`
        : `${myNetChange.toLocaleString()}`;
    const totalChangeStr =
      totalNetChange >= 0
        ? `+${totalNetChange.toLocaleString()}`
        : `${totalNetChange.toLocaleString()}`;
    const contributionStr = stats.myContribution.toFixed(1);

    // Форматируем топ контрибьюторов
    const topContributorsStr =
      stats.topContributors
        .map((contributor) => `${contributor.name} (${contributor.commits})`)
        .join(', ') || 'N/A';

    // Форматируем размер кодовой базы
    const codebaseStr = `${stats.clocStats.totalCode.toLocaleString()} lines (${stats.clocStats.totalFiles.toLocaleString()} files)`;

    markdown += `| ${repo.name} | ${
      stats.commits
    } | +${stats.linesAdded.toLocaleString()}/-${stats.linesDeleted.toLocaleString()} (${myChangeStr}) | ${
      stats.totalCommits
    } | +${stats.totalLinesAdded.toLocaleString()}/-${stats.totalLinesDeleted.toLocaleString()} (${totalChangeStr}) | ${
      stats.totalContributors
    } | ${contributionStr}% | ${topContributorsStr} | ${
      stats.tags
    } | ${codebaseStr} |\n`;
  });

  // Общая статистика
  const myTotalNetChange = totalStats.linesAdded - totalStats.linesDeleted;
  const globalTotalNetChange =
    totalStats.totalLinesAdded - totalStats.totalLinesDeleted;
  const myTotalChangeStr =
    myTotalNetChange >= 0 ? `+${myTotalNetChange}` : `${myTotalNetChange}`;
  const globalTotalChangeStr =
    globalTotalNetChange >= 0
      ? `+${globalTotalNetChange}`
      : `${globalTotalNetChange}`;
  const overallContribution =
    totalStats.totalLinesAdded > 0
      ? (totalStats.linesAdded / totalStats.totalLinesAdded) * 100
      : 0;

  // Собираем всех топ контрибьюторов со всех репозиториев
  const allTopContributors = [];
  allStats.forEach((stats) => {
    stats.topContributors.forEach((contributor) => {
      const existing = allTopContributors.find(
        (c) => c.name === contributor.name
      );
      if (existing) {
        existing.commits += contributor.commits;
      } else {
        allTopContributors.push({ ...contributor });
      }
    });
  });

  // Сортируем по количеству коммитов и берем топ 3
  const globalTopContributors =
    allTopContributors
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 3)
      .map((contributor) => `${contributor.name} (${contributor.commits})`)
      .join(', ') || 'N/A';

  // Форматируем общую статистику кодовой базы
  const totalCodebaseStr = `${totalStats.clocStats.totalCode.toLocaleString()} lines (${totalStats.clocStats.totalFiles.toLocaleString()} files)`;

  const myTotalChangeStrFormatted =
    myTotalNetChange >= 0
      ? `+${myTotalNetChange.toLocaleString()}`
      : `${myTotalNetChange.toLocaleString()}`;
  const globalTotalChangeStrFormatted =
    globalTotalNetChange >= 0
      ? `+${globalTotalNetChange.toLocaleString()}`
      : `${globalTotalNetChange.toLocaleString()}`;

  markdown += `| **TOTAL** | **${
    totalStats.commits
  }** | **+${totalStats.linesAdded.toLocaleString()}/-${totalStats.linesDeleted.toLocaleString()} (${myTotalChangeStrFormatted})** | **${
    totalStats.totalCommits
  }** | **+${totalStats.totalLinesAdded.toLocaleString()}/-${totalStats.totalLinesDeleted.toLocaleString()} (${globalTotalChangeStrFormatted})** | **${
    totalStats.totalContributors
  }** | **${overallContribution.toFixed(
    1
  )}%** | **${globalTopContributors}** | **${
    totalStats.tags
  }** | **${totalCodebaseStr}** |\n\n`;

  // Дополнительная статистика
  markdown += `## 📈 Summary\n\n`;

  markdown += `### 👤 My Activity\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Commits | ${totalStats.commits} |\n`;
  markdown += `| Files changed | ${totalStats.filesChanged.toLocaleString()} |\n`;
  markdown += `| Tags created | ${totalStats.tags} |\n`;
  markdown += `| Lines added | +${totalStats.linesAdded.toLocaleString()} |\n`;
  markdown += `| Lines deleted | -${totalStats.linesDeleted.toLocaleString()} |\n`;
  markdown += `| Net change | ${myTotalChangeStr} lines |\n\n`;

  markdown += `### 👥 Team Activity\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Total commits | ${totalStats.totalCommits} |\n`;
  markdown += `| Total contributors | ${totalStats.totalContributors} |\n`;
  markdown += `| Total lines added | +${totalStats.totalLinesAdded.toLocaleString()} |\n`;
  markdown += `| Total lines deleted | -${totalStats.totalLinesDeleted.toLocaleString()} |\n`;
  markdown += `| Total net change | ${globalTotalChangeStr} lines |\n\n`;

  markdown += `### 🎯 My Contribution Impact\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Overall contribution to codebase changes | ${overallContribution.toFixed(
    1
  )}% |\n`;
  markdown += `| Average contribution per repository | ${(
    overallContribution / repositories.length
  ).toFixed(1)}% |\n`;
  markdown += `| Repositories contributed to | ${
    allStats.filter((s) => s.commits > 0).length
  } of ${repositories.length} |\n\n`;

  markdown += `---\n\n`;

  // Таблица топ контрибьюторов по проектам
  markdown += `## 🏆 Top Contributors Summary\n\n`;

  // Собираем данные по всем контрибьюторам
  const contributorProjects = new Map();

  allStats.forEach((stats, index) => {
    const repo = repositories[index];
    stats.allContributors.forEach((contributor) => {
      if (!contributorProjects.has(contributor.name)) {
        contributorProjects.set(contributor.name, {
          name: contributor.name,
          totalCommits: 0,
          totalLinesAdded: 0,
          totalLinesDeleted: 0,
          totalNetChanges: 0,
          projects: [],
        });
      }

      const contributorData = contributorProjects.get(contributor.name);
      contributorData.totalCommits += contributor.commits;
      contributorData.totalLinesAdded += contributor.linesAdded || 0;
      contributorData.totalLinesDeleted += contributor.linesDeleted || 0;
      contributorData.totalNetChanges += contributor.netChanges || 0;
      contributorData.projects.push({
        name: repo.name,
        commits: contributor.commits,
        linesAdded: contributor.linesAdded || 0,
        linesDeleted: contributor.linesDeleted || 0,
      });
    });
  });

  // Сортируем контрибьюторов по общему количеству коммитов
  const sortedContributors = Array.from(contributorProjects.values())
    .sort((a, b) => b.totalCommits - a.totalCommits)
    .slice(0, 15); // Берем топ 15

  markdown += `| Contributor | Total Commits | Lines Added | Lines Deleted | Net Changes | Projects Contributed |\n`;
  markdown += `|-------------|---------------|-------------|---------------|-------------|---------------------|\n`;

  sortedContributors.forEach((contributor) => {
    const projectsStr = contributor.projects
      .map((p) => `${p.name} (${p.commits})`)
      .join(', ');

    const netChangeStr =
      contributor.totalNetChanges >= 0
        ? `+${contributor.totalNetChanges}`
        : `${contributor.totalNetChanges}`;

    markdown += `| ${contributor.name} | ${contributor.totalCommits} | +${contributor.totalLinesAdded} | -${contributor.totalLinesDeleted} | ${netChangeStr} | ${projectsStr} |\n`;
  });

  markdown += `\n`;

  markdown += `---\n\n`;

  // Активность по репозиториям
  markdown += `## 📦 Activity Breakdown by Repository\n\n`;
  allStats.forEach((stats, index) => {
    const repo = repositories[index];
    if (stats.commits > 0) {
      markdown += `### 📁 ${repo.name}\n\n`;

      // Краткая статистика в таблице
      markdown += `| Metric | My Stats | Repository Total |\n`;
      markdown += `|--------|----------|------------------|\n`;
      markdown += `| Commits | ${stats.commits} (${(
        (stats.commits / stats.totalCommits) *
        100
      ).toFixed(1)}%) | ${stats.totalCommits} |\n`;
      markdown += `| Lines Added | +${stats.linesAdded.toLocaleString()} | +${stats.totalLinesAdded.toLocaleString()} |\n`;
      markdown += `| Lines Deleted | -${stats.linesDeleted.toLocaleString()} | -${stats.totalLinesDeleted.toLocaleString()} |\n`;
      markdown += `| Contributors | - | ${stats.totalContributors} |\n`;
      markdown += `| My Contribution | ${stats.myContribution.toFixed(
        1
      )}% | 100% |\n\n`;

      // Codebase info
      markdown += `**📊 Codebase Size:** ${stats.clocStats.totalCode.toLocaleString()} lines of code\n`;
      markdown += `- Total files: ${stats.clocStats.totalFiles.toLocaleString()}\n`;
      markdown += `- Code: ${stats.clocStats.totalCode.toLocaleString()} lines\n`;
      markdown += `- Comments: ${stats.clocStats.totalComments.toLocaleString()} lines\n`;
      markdown += `- Blank: ${stats.clocStats.totalBlank.toLocaleString()} lines\n\n`;

      if (stats.allContributors.length > 0) {
        markdown += `**👥 All Contributors:**\n\n`;
        markdown += `| # | Contributor | Commits | Lines Added | Lines Deleted | Net Changes |\n`;
        markdown += `|---|-------------|---------|-------------|---------------|-------------|\n`;
        stats.allContributors.forEach((contributor, idx) => {
          const netChange =
            (contributor.linesAdded || 0) - (contributor.linesDeleted || 0);
          const netChangeStr =
            netChange >= 0 ? `+${netChange}` : `${netChange}`;
          markdown += `| ${idx + 1} | ${contributor.name} | ${
            contributor.commits
          } | +${contributor.linesAdded || 0} | -${
            contributor.linesDeleted || 0
          } | ${netChangeStr} |\n`;
        });
        markdown += `\n`;
      }

      if (stats.topCommits.length > 0) {
        markdown += `\n#### 📊 Top 20 Commits by Changes\n\n`;
        markdown += `| # | Hash | Author | Date | Message | Changes |\n`;
        markdown += `|---|------|--------|------|---------|----------|\n`;
        stats.topCommits.forEach((commit, idx) => {
          const shortHash = commit.hash.substring(0, 8);
          const shortMessage =
            commit.message.length > 60
              ? commit.message.substring(0, 57) + '...'
              : commit.message;
          const changesStr = `+${commit.linesAdded}/-${commit.linesDeleted}`;
          markdown += `| ${idx + 1} | \`${shortHash}\` | ${commit.author} | ${
            commit.date
          } | ${shortMessage} | ${changesStr} |\n`;
        });
      }

      markdown += `\n`;
    }
  });

  markdown += `---\n\n`;

  // Дополнительная таблица с тегами по репозиториям
  markdown += `## 🏷️ Tags Summary\n\n`;
  markdown += `Overview of tags created across all repositories during this period.\n\n`;
  markdown += `| Repository | Tags Created | Total Codebase Size |\n`;
  markdown += `|------------|--------------|--------------------|\n`;

  allStats.forEach((stats, index) => {
    const repo = repositories[index];
    const codebaseStr = `${stats.clocStats.totalCode.toLocaleString()} lines`;
    if (stats.tags > 0 || stats.commits > 0) {
      markdown += `| ${repo.name} | ${stats.tags} | ${codebaseStr} |\n`;
    }
  });

  const totalTags = allStats.reduce((sum, stats) => sum + stats.tags, 0);
  const summaryCodebaseStr = `${totalStats.clocStats.totalCode.toLocaleString()} lines`;
  markdown += `| **TOTAL** | **${totalTags}** | **${summaryCodebaseStr}** |\n\n`;

  markdown += `---\n\n`;
  markdown += `*Report generated by weekly_stats.js on ${new Date().toLocaleString()}*\n`;

  return markdown;
}

// Парсить файл repositories.md
function parseRepositoriesFile() {
  const scriptDir = __dirname;
  const repositoriesFile = path.join(scriptDir, 'repositories.md');

  if (!fs.existsSync(repositoriesFile)) {
    colorLog('❌ File repositories.md not found in scripts directory', 'red');
    process.exit(1);
  }

  const content = fs.readFileSync(repositoriesFile, 'utf-8');
  const lines = content.split('\n');
  const repositories = [];

  lines.forEach((line) => {
    // Ищем строки вида "1. Huly.core: /path/to/repo origin/branch"
    const match = line.match(/^(\d+)\.\s+([^:]+):\s+(.+)$/);
    if (match) {
      const repoName = match[2].trim();
      const pathAndBranch = match[3].trim().split(' ');
      const repoPath = pathAndBranch[0];
      const branch = pathAndBranch[1] || 'origin/main'; // default branch
      repositories.push({ name: repoName, path: repoPath, branch: branch });
    }
  });

  return repositories;
}

// Основная функция
function main() {
  const weekAgo = getWeekAgoDate();
  const today = getTodayDate();

  colorLog('=== Git Statistics for the Last Week ===', 'cyan');
  colorLog(`Period: ${weekAgo} to ${today}`, 'cyan');
  colorLog('', 'reset');

  const repositories = parseRepositoriesFile();

  if (repositories.length === 0) {
    colorLog('❌ No repositories found in repositories.md', 'red');
    process.exit(1);
  }

  // Общие счетчики
  let totalStats = {
    commits: 0,
    linesAdded: 0,
    linesDeleted: 0,
    filesChanged: 0,
    tags: 0,
    totalCommits: 0,
    totalLinesAdded: 0,
    totalLinesDeleted: 0,
    totalContributors: 0,
    clocStats: {
      totalFiles: 0,
      totalLines: 0,
      totalCode: 0,
      totalComments: 0,
      totalBlank: 0,
    },
  };

  const allStats = [];

  // Обработать каждый репозиторий
  repositories.forEach((repo) => {
    colorLog(`\n🔄 Processing repository: ${repo.name}`, 'bold');

    // Обновить репозиторий
    const updateSuccess = updateRepository(repo.path, repo.name, repo.branch);

    // Анализировать статистику
    const stats = getRepoStats(
      repo.path,
      repo.name,
      repo.branch,
      weekAgo,
      today
    );
    allStats.push(stats);

    totalStats.commits += stats.commits;
    totalStats.linesAdded += stats.linesAdded;
    totalStats.linesDeleted += stats.linesDeleted;
    totalStats.filesChanged += stats.filesChanged;
    totalStats.tags += stats.tags;
    totalStats.totalCommits += stats.totalCommits;
    totalStats.totalLinesAdded += stats.totalLinesAdded;
    totalStats.totalLinesDeleted += stats.totalLinesDeleted;
    totalStats.totalContributors = Math.max(
      totalStats.totalContributors,
      stats.totalContributors
    );

    // Агрегируем CLOC статистику
    totalStats.clocStats.totalFiles += stats.clocStats.totalFiles;
    totalStats.clocStats.totalLines += stats.clocStats.totalLines;
    totalStats.clocStats.totalCode += stats.clocStats.totalCode;
    totalStats.clocStats.totalComments += stats.clocStats.totalComments;
    totalStats.clocStats.totalBlank += stats.clocStats.totalBlank;
  });

  // Показать общую статистику
  colorLog('=== 📊 TOTAL STATISTICS ===', 'cyan');
  colorLog(`📝 Total commits: ${totalStats.commits}`, 'green');
  colorLog(`➕ Total lines added: ${totalStats.linesAdded}`, 'green');
  colorLog(`➖ Total lines deleted: ${totalStats.linesDeleted}`, 'red');
  colorLog(`📄 Total files changed: ${totalStats.filesChanged}`, 'purple');
  colorLog(`🏷️  Total tags created: ${totalStats.tags}`, 'cyan');

  // Показать чистое изменение строк
  const netChange = totalStats.linesAdded - totalStats.linesDeleted;
  if (netChange >= 0) {
    colorLog(`📈 Net lines change: +${netChange}`, 'green');
  } else {
    colorLog(`📉 Net lines change: ${netChange}`, 'red');
  }

  console.log();
  colorLog(`Generated on: ${new Date().toLocaleString()}`, 'cyan');

  // Генерировать и сохранить markdown отчет
  colorLog(`\n📝 Generating markdown report...`, 'cyan');
  const markdown = generateMarkdownTable(
    repositories,
    allStats,
    totalStats,
    weekAgo,
    today
  );
  const reportPath = path.join(__dirname, `weekly-report-${today}.md`);

  try {
    fs.writeFileSync(reportPath, markdown);
    colorLog(`📄 Markdown report saved to: ${reportPath}`, 'green');
  } catch (error) {
    colorLog(`❌ Failed to save markdown report: ${error.message}`, 'red');
  }
}

// Запустить скрипт
main();
