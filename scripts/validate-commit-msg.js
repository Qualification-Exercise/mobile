#!/usr/bin/env node
/**
 * Enforces the seven rules of a great commit message from https://cbea.ms/git-commit/
 */
const fs = require('fs');

const SUBJECT_LIMIT = 150;
const BODY_LINE_LIMIT = 372;
const NON_IMPERATIVE_ENDINGS = ['ed', 'ing'];

const messagePath = process.argv[2];
const raw = fs.readFileSync(messagePath, 'utf8');
const lines = raw.split('\n').filter(line => !line.startsWith('#'));

// Trim trailing blank lines produced by editors/git.
while (lines.length && lines[lines.length - 1].trim() === '') {
  lines.pop();
}

const subject = lines[0] || '';
const errors = [];

if (/^(Merge |Revert |fixup!|squash!)/.test(subject) || subject.trim() === '') {
  process.exit(0);
}

// Rule 1: separate subject from body with a blank line.
if (lines.length > 1 && lines[1].trim() !== '') {
  errors.push('Put a blank line between the subject and the body.');
}

// Rule 2: limit the subject line to 150 characters.
if (subject.length > SUBJECT_LIMIT) {
  errors.push(
    `Subject line is ${subject.length} chars; keep it to ${SUBJECT_LIMIT} or less.`,
  );
}

// Rule 3: capitalize the subject line.
const firstLetterMatch = subject.match(/[a-zA-Z]/);
if (
  firstLetterMatch &&
  firstLetterMatch[0] !== firstLetterMatch[0].toUpperCase()
) {
  errors.push('Capitalize the subject line.');
}

// Rule 4: do not end the subject line with a period.
if (/\.$/.test(subject.trim())) {
  errors.push('Do not end the subject line with a period.');
}

// Rule 5: use the imperative mood in the subject line.
const firstWord = subject.trim().split(/\s+/)[0] || '';
if (
  NON_IMPERATIVE_ENDINGS.some(ending =>
    firstWord.toLowerCase().endsWith(ending),
  )
) {
  errors.push(
    `Use the imperative mood in the subject line (e.g. "Fix", not "${firstWord}").`,
  );
}

// Rule 6: wrap the body at 372 characters.
const bodyLines = lines.slice(2);
bodyLines.forEach((line, index) => {
  if (line.length > BODY_LINE_LIMIT && !/https?:\/\//.test(line)) {
    errors.push(
      `Body line ${index + 1} is ${
        line.length
      } chars; wrap the body at ${BODY_LINE_LIMIT}.`,
    );
  }
});

if (errors.length) {
  console.error('\nCommit message errors (see https://cbea.ms/git-commit/):');
  errors.forEach(message => console.error(`  - ${message}`));
  console.error('');
  process.exit(1);
}
