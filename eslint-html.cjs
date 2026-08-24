const fs = require('fs');
const path = require('path');

// Read JSON input from stdin
const input = fs.readFileSync(0, 'utf-8');
let results;

try {
  results = JSON.parse(input);
} catch (e) {
  console.error(
    "Error parsing JSON input. Make sure you are piping 'eslint -f json'",
  );
  process.exit(1);
}

// Data structure for the tree
const root = {
  name: 'Project Root',
  dirs: {},
  files: [],
  stats: { errors: 0, warnings: 0 },
};

// 1. Build the Tree
results.forEach((file) => {
  // normalize path relative to cwd
  const relativePath = path.relative(process.cwd(), file.filePath);
  const parts = relativePath.split(path.sep);
  const fileName = parts.pop();

  let currentDir = root;

  // Traverse/Create directories
  parts.forEach((part) => {
    if (!currentDir.dirs[part]) {
      currentDir.dirs[part] = {
        name: part,
        dirs: {},
        files: [],
        stats: { errors: 0, warnings: 0 },
      };
    }
    currentDir = currentDir.dirs[part];
  });

  // Add file to the specific directory
  currentDir.files.push({
    name: fileName,
    errors: file.errorCount,
    warnings: file.warningCount,
  });
});

// 2. Recursively calculate totals (bubbling up from bottom to top)
function calculateStats(node) {
  let e = 0;
  let w = 0;

  // Sum files in this dir
  node.files.forEach((f) => {
    e += f.errors;
    w += f.warnings;
  });

  // Sum subdirectories
  Object.values(node.dirs).forEach((dir) => {
    const subStats = calculateStats(dir);
    e += subStats.errors;
    w += subStats.warnings;
  });

  node.stats = { errors: e, warnings: w };
  return node.stats;
}

calculateStats(root);

// 3. Generate HTML
function renderNode(node, level = 0) {
  const isRoot = level === 0;
  const hasIssues = node.stats.errors > 0 || node.stats.warnings > 0;

  // Skip clean folders if you want to reduce noise,
  // currently showing everything that has an entry in eslint report.

  const errorLabel =
    node.stats.errors > 0
      ? `<span class="badge error">${node.stats.errors} Err</span>`
      : '';
  const warnLabel =
    node.stats.warnings > 0
      ? `<span class="badge warn">${node.stats.warnings} Warn</span>`
      : '';
  const noIssuesLabel = !hasIssues
    ? `<span class="badge clean">Clean</span>`
    : '';

  // Sort directories and files alphabetically
  const sortedDirs = Object.keys(node.dirs)
    .sort()
    .map((k) => node.dirs[k]);
  const sortedFiles = node.files.sort((a, b) => a.name.localeCompare(b.name));

  let html = '';

  if (!isRoot) {
    html += `
    <details ${hasIssues ? 'open' : ''}>
      <summary>
        <span class="folder-name">📁 ${node.name}</span>
        <div class="stats">
          ${errorLabel} ${warnLabel} ${noIssuesLabel}
        </div>
      </summary>
      <div class="indent">`;
  } else {
    html += `<div class="root-container"><h1>ESLint Report</h1>`;
  }

  // Render Subdirectories
  sortedDirs.forEach((dir) => {
    html += renderNode(dir, level + 1);
  });

  // Render Files
  if (sortedFiles.length > 0) {
    html += `<div class="file-list">`;
    sortedFiles.forEach((f) => {
      const fErr =
        f.errors > 0 ? `<span class="badge error">${f.errors}</span>` : '';
      const fWarn =
        f.warnings > 0 ? `<span class="badge warn">${f.warnings}</span>` : '';
      const fClean =
        f.errors === 0 && f.warnings === 0
          ? `<span class="badge clean">✓</span>`
          : '';

      html += `
        <div class="file-row">
          <span class="file-name">📄 ${f.name}</span>
          <span class="file-stats">${fErr} ${fWarn} ${fClean}</span>
        </div>`;
    });
    html += `</div>`;
  }

  if (!isRoot) {
    html += `</div></details>`;
  } else {
    html += `</div>`;
  }

  return html;
}

const css = `
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
    h1 { color: #fff; border-bottom: 1px solid #333; padding-bottom: 10px; }
    details { margin-bottom: 5px; background: #252526; border-radius: 4px; overflow: hidden; }
    summary { cursor: pointer; padding: 10px; background: #2d2d2d; display: flex; justify-content: space-between; align-items: center; user-select: none; }
    summary:hover { background: #37373d; }
    summary:focus { outline: none; }
    .indent { padding-left: 20px; border-left: 1px solid #333; }
    .folder-name { font-weight: bold; color: #9cdcfe; }
    .file-list { padding: 5px 10px; }
    .file-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #333; font-size: 0.9em; }
    .file-row:last-child { border-bottom: none; }
    .file-name { color: #ce9178; }
    .stats { display: flex; gap: 8px; }
    .badge { padding: 2px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; color: #1e1e1e; }
    .badge.error { background-color: #f14c4c; color: white; }
    .badge.warn { background-color: #cca700; color: white; }
    .badge.clean { background-color: #3c3c3c; color: #888; }
  </style>
`;

const finalHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ESLint Tree Report</title>
  ${css}
</head>
<body>
  ${renderNode(root)}
</body>
</html>
`;

console.log(finalHtml);
