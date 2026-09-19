/**
 * `@skill:` mentions.
 *
 * Skills are already advised to Hermes through the toolbar's skill menu; a
 * mention is a faster path to the same mechanism, typed inline instead of
 * hunted for in a dropdown. Matching is pure so it is testable without a DOM
 * or the filesystem.
 */

import type { SkillGroup } from './skillCatalog';
import type { MentionSuggestion } from './mentions';

/** The `skill:` prefix that distinguishes a skill mention from a file path. */
export const SKILL_PREFIX = 'skill:';

/**
 * Candidate skills for a query, matched on name, category, or description.
 *
 * Category counts because a user who remembers "something in github" should
 * find it without recalling the exact skill name.
 */
export function matchSkillMentions(groups: SkillGroup[], term: string): MentionSuggestion[] {
  const needle = term.trim().toLowerCase();

  return groups
    .flatMap(group => group.skills)
    .filter(skill =>
      needle === ''
      || skill.name.toLowerCase().includes(needle)
      || skill.category.toLowerCase().includes(needle)
      || skill.description.toLowerCase().includes(needle))
    .map(skill => ({
      mention: `${SKILL_PREFIX}${skill.name}`,
      name: skill.name,
      // Reuse the file picker's dim suffix for the category, so both mention
      // kinds render through one code path.
      directory: skill.category,
      uri: '',
    }));
}

/** The skill names in a message, without the `skill:` prefix. */
export function skillNamesFrom(mentions: string[]): string[] {
  return mentions
    .filter(mention => mention.startsWith(SKILL_PREFIX))
    .map(mention => mention.slice(SKILL_PREFIX.length))
    .filter(name => name.length > 0);
}
