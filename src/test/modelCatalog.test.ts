import assert from 'node:assert/strict';
import test from 'node:test';
import { buildModelGroups } from '../modelCatalog';

// ACP sends the authenticated inventory on session/new:
//   name     "Anthropic · claude-opus-5"
//   modelId  "anthropic:claude-opus-5"
// The provider label is human-readable and already carried in `name`, so the
// picker never has to hardcode a provider list.

test('groups the live ACP inventory by its provider label', () => {
  const groups = buildModelGroups({
    currentModelId: 'anthropic:claude-opus-5',
    availableModels: [
      { modelId: 'anthropic:claude-opus-5', name: 'Anthropic · claude-opus-5' },
      { modelId: 'anthropic:claude-sonnet-5', name: 'Anthropic · claude-sonnet-5' },
      {
        modelId: 'openai-codex:gpt-6-astra',
        name: 'ChatGPT or Codex Subscription · gpt-6-astra',
      },
    ],
  });

  assert.deepEqual(
    groups.map(group => group.group),
    ['Anthropic', 'ChatGPT or Codex Subscription'],
  );
  assert.deepEqual(groups[0].items.map(item => item.label), [
    'claude-opus-5',
    'claude-sonnet-5',
  ]);
  // The id must round-trip verbatim: set_session_model is given back exactly
  // what the server advertised.
  assert.equal(groups[0].items[0].command, 'anthropic:claude-opus-5');
  assert.equal(groups[1].items[0].label, 'gpt-6-astra');
});

test('falls back to the id prefix when a name carries no provider label', () => {
  const groups = buildModelGroups({
    availableModels: [
      { modelId: 'custom:my-model', name: 'my-model' },
      { modelId: 'bare-model' },
    ],
  });

  assert.deepEqual(
    groups.map(group => group.group),
    ['custom', 'Models'],
  );
  assert.equal(groups[0].items[0].label, 'my-model');
  assert.equal(groups[1].items[0].label, 'bare-model');
  assert.equal(groups[1].items[0].command, 'bare-model');
});

test('returns no groups when the server advertises no inventory', () => {
  assert.deepEqual(buildModelGroups(undefined), []);
  assert.deepEqual(buildModelGroups({ availableModels: [] }), []);
});
