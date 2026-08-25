import { describe, expect, it } from 'vitest';
import { getBeginnerGuide, type BeginnerGuideLessonId } from './beginnerGuides';
import { LESSONS } from './lessons';

const LESSON_IDS = [
  'cmp-nzcv',
  'unconditional-branches',
  'branches',
  'signed-flags',
  'ordered-branches',
  'function-calls',
  'function-return',
  'function-arguments',
  'function-results',
  'saving-return-address',
  'load-store-pair',
  'indexed-addressing',
  'frame-pointer',
  'stack-frames',
  'nested-function-calls',
  'data-sections-strings',
  'string-data',
  'loading-addresses',
  'syscall-gate',
  'linux-syscalls',
  'reading-disassembly',
  'c-to-arm64',
  'debugging-state',
  'indirect-control-flow',
  'native-code-patterns',
] as const satisfies readonly BeginnerGuideLessonId[];

describe('beginner guides', () => {
  it('covers every lesson from 12 through 36 in order', () => {
    expect(LESSON_IDS).toEqual(LESSONS.slice(11).map((lesson) => lesson.id));
    expect(LESSON_IDS.map((id) => getBeginnerGuide(id)?.order))
      .toEqual(Array.from({ length: 25 }, (_, index) => index + 12));
  });

  it.each(LESSON_IDS)('gives %s a complete beginner-first structure', (id) => {
    const guide = getBeginnerGuide(id);

    expect(guide).toBeDefined();
    expect(guide?.lessonId).toBe(id);
    expect(guide?.title.trim()).not.toBe('');
    expect(guide?.purpose.trim()).not.toBe('');
    expect(guide?.terms.length).toBeGreaterThan(0);
    expect(guide?.steps.length).toBeGreaterThan(0);
    expect(guide?.remember.trim()).not.toBe('');

    for (const term of guide?.terms ?? []) {
      expect(term.term.trim()).not.toBe('');
      expect(term.meaning.trim()).not.toBe('');
    }

    for (const step of guide?.steps ?? []) {
      expect(step.title.trim()).not.toBe('');
      expect(step.explanation.trim()).not.toBe('');
    }
  });

  it('returns undefined for an unknown lesson', () => {
    expect(getBeginnerGuide('not-a-lesson')).toBeUndefined();
  });

  it('locks the easy-to-confuse architecture and Linux distinctions', () => {
    const guideText = (id: BeginnerGuideLessonId) => {
      const guide = getBeginnerGuide(id)!;
      return [
        guide.purpose,
        ...guide.terms.flatMap((term) => [term.term, term.meaning]),
        ...guide.steps.flatMap((step) => [step.title, step.explanation, step.example ?? '']),
        guide.remember,
      ].join(' ');
    };

    expect(guideText('cmp-nzcv')).toMatch(/CMP.*Compare.*subtract/i);
    expect(guideText('cmp-nzcv')).toMatch(/TST.*Test bits.*bitwise AND/i);
    expect(guideText('cmp-nzcv')).toMatch(/Z.*Zero flag.*zero.*1/i);
    expect(guideText('function-arguments')).toMatch(/not a complete rule for every type/i);
    expect(guideText('load-store-pair')).toMatch(/STP.*Store Pair.*neighboring memory/i);
    expect(guideText('load-store-pair')).toMatch(/LDP.*Load Pair.*neighboring memory/i);
    expect(guideText('data-sections-strings')).toMatch(/\.globl.*does not by itself choose.*entry point/i);
    expect(guideText('loading-addresses')).toMatch(/pseudo-instruction/i);
    expect(guideText('syscall-gate')).toMatch(/raw Linux AArch64 syscall.*X8.*ordinary general-purpose register/i);
    expect(guideText('syscall-gate')).toMatch(/93 exits the calling thread/i);
    expect(guideText('linux-syscalls')).toMatch(/X0 contains either the number of bytes written or a negative error/i);
    expect(guideText('indirect-control-flow')).toMatch(/RET.*indirect.*X30/i);
  });
});
