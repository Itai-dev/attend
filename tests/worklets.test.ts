import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * Worklets as the iPhone runs them (20 Oct 2026). On the UI runtime a worklet's captured
 * variables are unpacked at the top of its body (`const { X } = this.__closure`), after its
 * parameters are evaluated. A default parameter that names one (`attackMs = ATTACK_MS`) is a
 * ReferenceError there, and an error on the UI thread closes the app: every practice crashed as
 * it opened. Web runs the plain function, so nothing else catches it. This compiles each file
 * that holds a worklet with the app's own Babel preset and checks the code the UI thread gets.
 */
const require = createRequire(import.meta.url);
const babel = require('@babel/core');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

test('no worklet reads a captured variable in its parameters', () => {
  const files = sources('src').filter((f) => readFileSync(f, 'utf8').includes("'worklet'") || /use(AnimatedStyle|DerivedValue|FrameCallback|AnimatedReaction|AnimatedProps)\(/.test(readFileSync(f, 'utf8')));
  assert.ok(files.length > 0);
  let checked = 0;
  for (const file of files) {
    const out = babel.transformFileSync(file, {
      babelrc: false,
      configFile: false,
      presets: ['babel-preset-expo'],
      filename: file,
      caller: { name: 'metro', platform: 'ios', bundler: 'metro', isDev: false },
    });
    for (const m of (out.code as string).matchAll(/code:"function [\w$]+\(([^)]*)\)\{(?:const\{([^}]*)\}=this\.__closure;)?/g)) {
      checked++;
      const params = m[1];
      const captured = (m[2] ?? '').split(',').map((s) => s.trim().split(':')[0]).filter(Boolean);
      for (const name of captured) {
        assert.doesNotMatch(params, new RegExp(`=[^,]*\\b${name.replace('$', '\\$')}\\b`), `${file}: a worklet's parameters use "${name}", which the UI thread hasn't unpacked yet`);
      }
    }
  }
  assert.ok(checked > 5, `found ${checked} worklets`);
});
