import assert from 'node:assert/strict';
import test from 'node:test';
import { findMentionQuery, parseMentions, splitMentionQuery } from '../mentions';
import { matchSkillMentions } from '../skillMentions';

const GROUPS = [
  { category: '', skills: [{ name: 'brandkit', description: 'Brand kits', category: '' }] },
  {
    category: 'software-development',
    skills: [
      { name: 'systematic-debugging', description: '4-phase root cause', category: 'software-development' },
      { name: 'test-driven-development', description: 'RED-GREEN-REFACTOR', category: 'software-development' },
    ],
  },
];

test('opens a skill query on @skill: and reports the prefix', () => {
  const found = findMentionQuery('use @skill:sys', 14);
  assert.ok(found);
  // The picker needs to know which catalogue to search, not just the text.
  assert.deepEqual(splitMentionQuery(found.query), { kind: 'skill', term: 'sys' });
});

test('a plain mention still means a file', () => {
  const found = findMentionQuery('read @src/a.ts', 14);
  assert.ok(found);
  assert.deepEqual(splitMentionQuery(found.query), { kind: 'file', term: 'src/a.ts' });
});

test('matches a skill on name and on category', () => {
  assert.deepEqual(
    matchSkillMentions(GROUPS, 'debug').map(s => s.mention),
    ['skill:systematic-debugging'],
  );
  assert.deepEqual(
    matchSkillMentions(GROUPS, 'software').map(s => s.mention),
    ['skill:systematic-debugging', 'skill:test-driven-development'],
  );
});

test('an empty term lists every skill', () => {
  assert.equal(matchSkillMentions(GROUPS, '').length, 3);
});

test('parses a skill mention out of the message so it is not sent as a file', () => {
  // File mentions become resource_links; skill mentions must not, or the
  // host would try to resolve `skill:brandkit` as a path.
  const parsed = parseMentions('run @skill:brandkit on @src/a.ts');
  assert.deepEqual(parsed, ['skill:brandkit', 'src/a.ts']);
});
