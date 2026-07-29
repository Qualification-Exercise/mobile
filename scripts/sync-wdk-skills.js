#!/usr/bin/env node
/**
 * Sync WDK agent skills into .cursor/skills/ and .claude/skills/.
 *
 * Flow:
 * 1. `npx skills update` writes upstream copies to .agents/skills/ (required names).
 * 2. This script copies them to .cursor/ and .claude/ (with local aliases such as wdk-code-of-conduct).
 * 3. Copies are cached in .wdk-skills-source/ and removed from .agents/skills/ so Cursor
 *    does not show duplicate skills (e.g. code-of-conduct + wdk-code-of-conduct).
 *
 * Run via `npm run skills:update` (not standalone — requires fresh output from `npx skills update`).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOCK_FILE = path.join(ROOT, 'skills-lock.json');
const AGENTS_SOURCE_DIR = path.join(ROOT, '.agents/skills');
const STAGING_DIR = path.join(ROOT, '.wdk-skills-source');
const TARGET_DIRS = [
  path.join(ROOT, '.cursor/skills'),
  path.join(ROOT, '.claude/skills'),
];

// Upstream lock/skill folder name -> local folder name in .cursor/ and .claude/.
const TARGET_FOLDER_ALIASES = {
  'code-of-conduct': 'wdk-code-of-conduct',
};

// Frontmatter `name:` values to enforce in .cursor/ and .claude/ copies.
const SKILL_NAME_OVERRIDES = {
  'code-of-conduct': 'wdk-code-of-conduct',
};

function readSkillNames() {
  const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
  return Object.keys(lock.skills || {});
}

function resolveSourceFolder(sourceName) {
  const agentsPath = path.join(AGENTS_SOURCE_DIR, sourceName);
  if (fs.existsSync(agentsPath)) {
    return agentsPath;
  }

  const stagingPath = path.join(STAGING_DIR, sourceName);
  if (fs.existsSync(stagingPath)) {
    return stagingPath;
  }

  return null;
}

function copyDir(source, destination) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(source, destination, { recursive: true });
}

function patchSkillName(skillDir, skillName) {
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    return;
  }

  const content = fs.readFileSync(skillFile, 'utf8');
  const patched = content.replace(/^name:\s*.+$/m, `name: ${skillName}`);

  if (patched !== content) {
    fs.writeFileSync(skillFile, patched);
  }
}

function cleanupStaleRenamedSource(sourceName) {
  const staleName = TARGET_FOLDER_ALIASES[sourceName];
  if (!staleName) {
    return;
  }

  for (const dir of [AGENTS_SOURCE_DIR, STAGING_DIR]) {
    const stalePath = path.join(dir, staleName);
    if (fs.existsSync(stalePath)) {
      fs.rmSync(stalePath, { recursive: true, force: true });
      console.log(`Removed stale ${path.relative(ROOT, stalePath)}`);
    }
  }
}

function removeAgentsCopy(sourceName) {
  const agentsPath = path.join(AGENTS_SOURCE_DIR, sourceName);
  if (!fs.existsSync(agentsPath)) {
    return;
  }

  fs.rmSync(agentsPath, { recursive: true, force: true });
  console.log(`Removed ${path.relative(ROOT, agentsPath)} (agent copies live in .cursor/ and .claude/)`);
}

function syncSkill(sourceName) {
  cleanupStaleRenamedSource(sourceName);

  const source = resolveSourceFolder(sourceName);
  if (!source) {
    throw new Error(
      `Missing source skill for ${sourceName}. Run: npm run skills:update`,
    );
  }

  const stagingDestination = path.join(STAGING_DIR, sourceName);
  copyDir(source, stagingDestination);

  const targetName = TARGET_FOLDER_ALIASES[sourceName] || sourceName;
  const skillName = SKILL_NAME_OVERRIDES[sourceName] || targetName;

  for (const targetRoot of TARGET_DIRS) {
    const destination = path.join(targetRoot, targetName);
    copyDir(stagingDestination, destination);
    patchSkillName(destination, skillName);
  }

  removeAgentsCopy(sourceName);

  console.log(
    targetName === sourceName
      ? `Synced ${sourceName}`
      : `Synced ${sourceName} -> ${targetName}`,
  );
}

function main() {
  if (!fs.existsSync(LOCK_FILE)) {
    console.error('skills-lock.json not found. Run: npx skills add tetherto/wdk-agent-skills');
    process.exit(1);
  }

  if (!fs.existsSync(AGENTS_SOURCE_DIR) && !fs.existsSync(STAGING_DIR)) {
    console.error('No WDK skills found. Run: npm run skills:update');
    process.exit(1);
  }

  fs.mkdirSync(STAGING_DIR, { recursive: true });

  const skillNames = readSkillNames();
  skillNames.forEach(syncSkill);

  console.log(`Done. Synced ${skillNames.length} skill(s) to .cursor/skills/ and .claude/skills/.`);
}

main();
