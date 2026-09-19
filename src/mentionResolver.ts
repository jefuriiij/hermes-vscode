/**
 * Resolve `@` mentions against the workspace.
 *
 * Lives in the extension host because only it has `vscode.workspace`; the
 * webview sends a query and receives matches. Parsing and prompt assembly are
 * in `mentions.ts`, which stays DOM- and vscode-free so it can be unit-tested.
 */

import * as vscode from 'vscode';
import { parseMentions, type ResolvedMention } from './mentions';

/** Cap results so a bare `@` in a large repo cannot stall the picker. */
const MAX_SUGGESTIONS = 50;
/** Exclude heavy directories the user will never want to mention. */
const EXCLUDE = '**/{node_modules,.git,dist,out,build,.next,coverage}/**';

export interface MentionSuggestion {
  /** Text inserted after `@`, workspace-relative and slash-normalised. */
  mention: string;
  /** Basename, shown as the primary label. */
  name: string;
  /** Containing directory, shown as the dim suffix. */
  directory: string;
  uri: string;
}

function toSuggestion(uri: vscode.Uri): MentionSuggestion {
  const relative = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
  const slash = relative.lastIndexOf('/');
  return {
    mention: relative,
    name: slash >= 0 ? relative.slice(slash + 1) : relative,
    directory: slash >= 0 ? relative.slice(0, slash + 1) : '',
    uri: uri.toString(),
  };
}

/**
 * Files matching a mention query.
 *
 * An empty query lists the first `MAX_SUGGESTIONS` files, which is what a bare
 * `@` should show.
 */
export async function findMentionCandidates(query: string): Promise<MentionSuggestion[]> {
  const trimmed = query.trim();
  const pattern = trimmed ? `**/*${trimmed}*` : '**/*';

  try {
    const matches = await vscode.workspace.findFiles(pattern, EXCLUDE, MAX_SUGGESTIONS);
    return matches.map(toSuggestion);
  } catch {
    return [];
  }
}

/**
 * Resolve every mention in a composed message to a workspace file.
 *
 * Unresolved mentions are dropped rather than guessed at: `buildPromptBlocks`
 * leaves them as literal text, so the agent still sees what was typed without
 * a `resource_link` pointing at a path that does not exist.
 */
export async function resolveMentions(text: string): Promise<ResolvedMention[]> {
  const mentions = parseMentions(text);
  if (mentions.length === 0) {
    return [];
  }

  const resolved: ResolvedMention[] = [];
  for (const mention of mentions) {
    const normalized = mention.replace(/\\/g, '/');
    // Anchor on the full relative path so `@src/a.ts` cannot match `lib/a.ts`.
    const matches = await vscode.workspace.findFiles(`**/${normalized}`, EXCLUDE, 2);
    const exact = matches.find(
      uri => vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/') === normalized,
    ) ?? (matches.length === 1 ? matches[0] : undefined);

    if (exact) {
      const suggestion = toSuggestion(exact);
      resolved.push({ mention, uri: suggestion.uri, name: suggestion.name });
    }
  }

  return resolved;
}
