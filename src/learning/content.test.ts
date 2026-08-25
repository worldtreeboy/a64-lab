import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ARM64CPU, parseProgram } from '../arm64/interpreter';
import { isRegisterName, readRegister, STACK_TOP } from '../arm64/registers';
import { DATA_BASE } from '../arm64/parser';
import { CHALLENGE_CATEGORIES, CHALLENGES, getChallenge } from './challenges';
import { CURRICULUM_STAGES, lessonsForStage } from './curriculum';
import { getAdjacentLessons, getLesson, LESSONS } from './lessons';
import type { Lesson } from './types';

const EXPECTED_LESSON_IDS = [
  'meet-arm64',
  'registers',
  'x-w-registers',
  'mov-arithmetic',
  'addresses-pointers',
  'memory-store',
  'memory-ldr-str',
  'memory-offsets',
  'little-endian',
  'stack',
  'stack-values',
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
] as const;

const ORIGINAL_V1_LESSON_IDS = [
  'meet-arm64',
  'registers',
  'mov-arithmetic',
  'addresses-pointers',
  'memory-ldr-str',
  'little-endian',
  'stack',
  'stack-frames',
  'cmp-nzcv',
  'branches',
  'function-calls',
  'nested-function-calls',
  'data-sections-strings',
  'linux-syscalls',
  'reading-disassembly',
  'c-to-arm64',
  'debugging-state',
  'native-code-patterns',
] as const;

interface ProgressionMetadata {
  kind: 'concept' | 'integration';
  coreIdea: string;
  newConcepts: readonly string[];
  buildsOn: readonly string[];
  visualPrompt: string;
  registerFocus: readonly string[];
}

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function runProgram(source: string, stepLimit = 500): ARM64CPU {
  const cpu = new ARM64CPU();
  cpu.loadProgram(source);
  let steps = 0;
  while (!cpu.halted && steps < stepLimit) {
    cpu.step();
    steps += 1;
  }
  if (!cpu.halted) throw new Error(`Program did not halt within ${stepLimit} steps.`);
  return cpu;
}

describe('lesson content', () => {
  it('keeps the source file and runtime curriculum in the same contiguous order', () => {
    const source = readFileSync(new URL('./lessons.ts', import.meta.url), 'utf8');
    const sourceLessonIds = [...source.matchAll(/^    id: '([^']+)',/gm)].map((match) => match[1]);
    const sourceOrders = [...source.matchAll(/^    order: (\d+),/gm)].map((match) => Number(match[1]));
    const contiguousOrders = Array.from(
      { length: EXPECTED_LESSON_IDS.length },
      (_, index) => index + 1,
    );

    expect(sourceLessonIds).toEqual(EXPECTED_LESSON_IDS);
    expect(sourceOrders).toEqual(contiguousOrders);
    expect(LESSONS.map((lesson) => lesson.id)).toEqual(EXPECTED_LESSON_IDS);
    expect(LESSONS.map((lesson) => lesson.order)).toEqual(contiguousOrders);
  });

  it('retains every lesson id from the original 18-lesson guide', () => {
    for (const lessonId of ORIGINAL_V1_LESSON_IDS) {
      expect(getLesson(lessonId), `legacy lesson id ${lessonId} should remain addressable`).toBeDefined();
    }
  });

  it('groups all lessons into contiguous curriculum stages exactly once', () => {
    expect(new Set(CURRICULUM_STAGES.map((stage) => stage.id)).size).toBe(CURRICULUM_STAGES.length);
    expect(CURRICULUM_STAGES.map((stage) => [stage.firstLesson, stage.lastLesson])).toEqual([
      [1, 4],
      [5, 11],
      [12, 16],
      [17, 26],
      [27, 31],
      [32, 36],
    ]);
    expect(CURRICULUM_STAGES[0]?.firstLesson).toBe(1);
    expect(CURRICULUM_STAGES.at(-1)?.lastLesson).toBe(LESSONS.length);

    for (let index = 0; index < CURRICULUM_STAGES.length; index += 1) {
      const stage = CURRICULUM_STAGES[index];
      const previous = CURRICULUM_STAGES[index - 1];
      expect(stage.id).toMatch(ID_PATTERN);
      expect(stage.title.trim().length).toBeGreaterThan(0);
      expect(stage.description.trim().length).toBeGreaterThanOrEqual(20);
      expect(stage.firstLesson).toBeLessThanOrEqual(stage.lastLesson);
      if (previous) expect(stage.firstLesson).toBe(previous.lastLesson + 1);
      expect(lessonsForStage(stage).map((lesson) => lesson.order)).toEqual(
        Array.from(
          { length: stage.lastLesson - stage.firstLesson + 1 },
          (_, offset) => stage.firstLesson + offset,
        ),
      );
    }

    const groupedLessonIds = CURRICULUM_STAGES.flatMap((stage) => (
      lessonsForStage(stage).map((lesson) => lesson.id)
    ));
    expect(groupedLessonIds).toEqual(EXPECTED_LESSON_IDS);
    expect(new Set(groupedLessonIds).size).toBe(LESSONS.length);
  });

  it('introduces at most two new concepts and only builds on earlier ideas', () => {
    const introducedConcepts = new Set<string>();

    for (const rawLesson of LESSONS) {
      const lesson = rawLesson as typeof rawLesson & ProgressionMetadata;
      expect(['concept', 'integration'], `${lesson.id} has an invalid lesson kind`).toContain(lesson.kind);
      expect(lesson.coreIdea.trim().length, `${lesson.id} needs one clear core idea`).toBeGreaterThanOrEqual(20);
      expect(new Set(lesson.newConcepts).size, `${lesson.id} repeats a new concept`).toBe(lesson.newConcepts.length);
      expect(new Set(lesson.buildsOn).size, `${lesson.id} repeats a buildsOn concept`).toBe(lesson.buildsOn.length);
      expect(
        lesson.newConcepts.some((concept) => lesson.buildsOn.includes(concept)),
        `${lesson.id} cannot both introduce and build on the same concept`,
      ).toBe(false);

      if (lesson.kind === 'concept') {
        expect(lesson.newConcepts.length, `${lesson.id} should introduce one or two ideas`).toBeGreaterThanOrEqual(1);
        expect(lesson.newConcepts.length, `${lesson.id} introduces too many ideas`).toBeLessThanOrEqual(2);
      } else {
        expect(lesson.newConcepts, `${lesson.id} should combine known ideas, not add new ones`).toEqual([]);
      }

      for (const concept of lesson.buildsOn) {
        expect(concept.trim().length, `${lesson.id} has an empty buildsOn concept`).toBeGreaterThan(0);
        expect(
          introducedConcepts.has(concept),
          `${lesson.id} builds on ${concept} before that concept is taught`,
        ).toBe(true);
      }
      for (const concept of lesson.newConcepts) {
        expect(concept.trim().length, `${lesson.id} has an empty new concept`).toBeGreaterThan(0);
        expect(
          introducedConcepts.has(concept),
          `${concept} is introduced more than once (again in ${lesson.id})`,
        ).toBe(false);
        introducedConcepts.add(concept);
      }
    }
  });

  it('defines focused, uniquely-addressable beginner lessons', () => {
    const lessonIds = new Set(LESSONS.map((lesson) => lesson.id));
    const sectionIds = new Set<string>();
    const quizIds = new Set<string>();

    expect(new Set(LESSONS.map((lesson) => lesson.id)).size).toBe(LESSONS.length);
    for (const rawLesson of LESSONS) {
      const lesson = rawLesson as typeof rawLesson & ProgressionMetadata;
      expect(getLesson(lesson.id)).toBe(lesson);
      expect(lesson.id).toMatch(ID_PATTERN);
      expect(lesson.sections.length, `${lesson.id} needs at least a concept and an example`).toBeGreaterThanOrEqual(2);
      expect(
        lesson.sections.length,
        `${lesson.id} should use no more than ten small, sequential teaching chunks`,
      ).toBeLessThanOrEqual(10);
      expect(
        lesson.quiz.length,
        `${lesson.id} needs at least two questions so the learner checks the idea more than once`,
      ).toBeGreaterThanOrEqual(2);
      expect(
        new Set(lesson.quiz.map((question) => question.prompt.trim())).size,
        `${lesson.id} repeats a question prompt`,
      ).toBe(lesson.quiz.length);
      expect(lesson.nextStep.length).toBeGreaterThan(20);
      expect(lesson.visualPrompt.trim().length, `${lesson.id} needs a visual teaching prompt`).toBeGreaterThanOrEqual(20);
      expect(lesson.visualFocus.length, `${lesson.id} needs a focused live visual`).toBeGreaterThan(0);
      const visualFocusLimit = lesson.id === 'native-code-patterns' ? 3 : 2;
      expect(lesson.visualFocus.length, `${lesson.id} shows too many visual systems at once`).toBeLessThanOrEqual(visualFocusLimit);
      expect(new Set(lesson.visualFocus).size, `${lesson.id} repeats a visual focus`).toBe(lesson.visualFocus.length);
      expect(lesson.registerFocus.length, `${lesson.id} needs watched registers`).toBeGreaterThan(0);
      const registerFocusLimit = lesson.id === 'native-code-patterns' ? 6 : 5;
      expect(lesson.registerFocus.length, `${lesson.id} watches too many registers`).toBeLessThanOrEqual(registerFocusLimit);
      expect(new Set(lesson.registerFocus).size, `${lesson.id} repeats a watched register`).toBe(lesson.registerFocus.length);
      expect(new Set(lesson.flagFocus ?? []).size, `${lesson.id} repeats a watched flag`).toBe(lesson.flagFocus?.length ?? 0);
      expect(lesson.flagFocus?.length ?? 0, `${lesson.id} watches too many flags`).toBeLessThanOrEqual(4);

      for (const prerequisite of lesson.prerequisites ?? []) {
        expect(lessonIds.has(prerequisite), `${lesson.id} has an unknown prerequisite`).toBe(true);
        expect(
          EXPECTED_LESSON_IDS.indexOf(prerequisite as typeof EXPECTED_LESSON_IDS[number]),
          `${lesson.id} depends on a lesson that appears later`,
        ).toBeLessThan(EXPECTED_LESSON_IDS.indexOf(lesson.id as typeof EXPECTED_LESSON_IDS[number]));
      }
      for (const section of lesson.sections) {
        expect(section.id).toMatch(ID_PATTERN);
        expect(sectionIds.has(section.id), `duplicate section id: ${section.id}`).toBe(false);
        sectionIds.add(section.id);
      }
      for (const question of lesson.quiz) {
        expect(question.id).toMatch(ID_PATTERN);
        expect(quizIds.has(question.id), `duplicate quiz id: ${question.id}`).toBe(false);
        quizIds.add(question.id);
        expect(question.prompt.trim().length, `${question.id} needs a useful prompt`).toBeGreaterThanOrEqual(10);
        expect(question.correctOptionId, `${question.id} has an invalid answer id`).toMatch(ID_PATTERN);
        expect(question.options.length).toBeGreaterThanOrEqual(3);
        expect(question.options.length).toBeLessThanOrEqual(4);
        expect(new Set(question.options.map((option) => option.id)).size).toBe(question.options.length);
        for (const option of question.options) {
          expect(option.id, `${question.id} has an invalid option id`).toMatch(ID_PATTERN);
          expect(option.label.trim().length, `${question.id}/${option.id} has an empty option`).toBeGreaterThan(0);
        }
        expect(
          new Set(question.options.map((option) => option.label.trim())).size,
          `${question.id} repeats an answer label`,
        ).toBe(question.options.length);
        expect(
          question.options.some((option) => option.id === question.correctOptionId),
          `${question.id} has an unknown correct answer`,
        ).toBe(true);
        expect(question.explanation.trim().length).toBeGreaterThanOrEqual(20);
      }
      expect(
        lesson.sections.filter((section) => Boolean(section.diagram)),
        `${lesson.id} should include one concept-specific visual diagram`,
      ).toHaveLength(1);
      const diagramSectionIndex = lesson.sections.findIndex((section) => Boolean(section.diagram));
      const firstExecutionSectionIndex = lesson.sections.findIndex((section) => (
        Boolean(section.code) || Boolean(section.walkthrough)
      ));
      expect(
        diagramSectionIndex,
        `${lesson.id} should show its concept visual before its first execution example`,
      ).toBeLessThanOrEqual(firstExecutionSectionIndex);
      expect(
        lesson.visualPrompt,
        `${lesson.id} visualPrompt is shown to learners and must not contain an implementation instruction`,
      ).not.toMatch(/\b(draw|animate|place the listing|spotlight)\b/i);

      for (const section of lesson.sections) {
        if (!section.walkthrough) continue;
        expect(
          section.walkthrough.execute,
          `${lesson.id}/${section.id} should teach one instruction or setup action at a time`,
        ).not.toMatch(/[;\n]|\bthen\b|\bfollowed by\b/i);
        expect(
          section.walkthrough.execute,
          `${lesson.id}/${section.id} needs one concrete action`,
        ).toMatch(/^(?:mov|add|sub|cmp|tst|b(?:\.[a-z]+)?|bl|br|blr|ret|ldr|str|ldrb|strb|ldp|stp|svc)\b|^Load the program\b/i);
      }
      expect(lesson.estimatedMinutes).toBeGreaterThanOrEqual(5);
      expect(lesson.estimatedMinutes).toBeLessThanOrEqual(15);
    }
  });

  it('returns the correct previous and next lessons', () => {
    expect(getAdjacentLessons('meet-arm64')).toEqual({
      previous: null,
      next: LESSONS[1],
    });
    expect(getAdjacentLessons('registers')).toEqual({
      previous: LESSONS[0],
      next: LESSONS[2],
    });
    expect(getAdjacentLessons('native-code-patterns')).toEqual({
      previous: LESSONS[LESSONS.length - 2],
      next: null,
    });
    expect(getAdjacentLessons('missing')).toEqual({ previous: null, next: null });
  });

  it('keeps every assembly section and quiz example self-contained, parseable, and finite', () => {
    for (const lesson of LESSONS) {
      for (const section of lesson.sections) {
        if (!section.code) continue;
        expect(
          () => parseProgram(section.code!),
          `${lesson.id}/${section.id} should contain valid ARM64 assembly`,
        ).not.toThrow();
      }
      for (const question of lesson.quiz) {
        if (!question.code) continue;
        expect(
          () => parseProgram(question.code!),
          `${lesson.id}/${question.id} should contain self-contained ARM64 assembly`,
        ).not.toThrow();
        expect(
          () => runProgram(question.code!),
          `${lesson.id}/${question.id} should execute to completion`,
        ).not.toThrow();
      }
    }
  });

  it('executes every assembly listing from lessons 12 through 36', () => {
    for (const lesson of LESSONS.slice(11)) {
      for (const section of lesson.sections) {
        if (!section.code) continue;
        expect(
          () => runProgram(section.code!),
          `${lesson.id}/${section.id} listing should execute to completion`,
        ).not.toThrow();
      }
    }
  });

  it('introduces advanced terms before the section that first shows their syntax', () => {
    const contracts: Array<{
      lessonId: string;
      concept: string;
      definitionSectionId: string;
      syntax: RegExp;
    }> = [
      { lessonId: 'loading-addresses', concept: 'data label', definitionSectionId: 'label-is-a-location-name', syntax: /^\s*message:/m },
      { lessonId: 'loading-addresses', concept: 'equals-label pseudo-load', definitionSectionId: 'pseudo-load-copies-the-address', syntax: /ldr x1,\s*=message/i },
      { lessonId: 'syscall-gate', concept: 'X8 syscall number', definitionSectionId: 'x8-selects-the-service', syntax: /mov x8,\s*93/i },
      { lessonId: 'syscall-gate', concept: 'SVC gate', definitionSectionId: 'svc-crosses-the-boundary', syntax: /svc\s+(?:#)?0/i },
      { lessonId: 'linux-syscalls', concept: 'write syscall', definitionSectionId: 'write-copies-a-memory-range', syntax: /mov x8,\s*64|svc\s+(?:#)?0/i },
      { lessonId: 'reading-disassembly', concept: 'disassembly', definitionSectionId: 'disassembly-comes-from-machine-bytes', syntax: /stp x29/i },
      { lessonId: 'c-to-arm64', concept: 'source mapping', definitionSectionId: 'source-code-describes-behavior', syntax: /add w0/i },
      { lessonId: 'debugging-state', concept: 'recognizable byte pattern', definitionSectionId: 'debug-example-is-constructed', syntax: /0x4141414141414141/i },
      { lessonId: 'indirect-control-flow', concept: 'register target', definitionSectionId: 'code-pointer-selects-an-instruction', syntax: /\b(?:br|blr)\b/i },
      { lessonId: 'native-code-patterns', concept: 'native-code workflow', definitionSectionId: 'native-reading-needs-a-repeatable-order', syntax: /bl transform/i },
    ];
    const executableText = (section: Lesson['sections'][number]) => (
      `${section.code ?? ''}\n${section.walkthrough?.execute ?? ''}`
    );

    for (const contract of contracts) {
      const lesson = getLesson(contract.lessonId)!;
      const definitionIndex = lesson.sections.findIndex((section) => section.id === contract.definitionSectionId);
      const syntaxIndex = lesson.sections.findIndex((section) => contract.syntax.test(executableText(section)));
      expect(definitionIndex, `${contract.concept} definition missing`).toBeGreaterThanOrEqual(0);
      expect(syntaxIndex, `${contract.concept} syntax missing`).toBeGreaterThanOrEqual(0);
      expect(definitionIndex, `${contract.concept} must be explained before syntax`).toBeLessThanOrEqual(syntaxIndex);
    }
  });

  it('classifies RET as indirect control flow without claiming that input controls it', () => {
    const taught = (lesson: Lesson) => [
      lesson.coreIdea,
      ...lesson.sections.flatMap((section) => [
        section.title,
        ...section.paragraphs,
        ...(section.bullets ?? []),
        section.callout ?? '',
      ]),
    ].join(' ');
    const indirect = taught(getLesson('indirect-control-flow')!);
    const native = taught(getLesson('native-code-patterns')!);

    expect(indirect).toMatch(/RET.*(?:indirect|register-targeted).*X30|(?:indirect|register-targeted).*RET.*X30/i);
    expect(native).not.toMatch(/no indirect branch/i);
    expect(native).toMatch(/RET.*indirect return.*X30/i);
    expect(native).toMatch(/no evidence.*input.*(?:X30|return address|indirect target)/i);
  });

  it('runs every Try in Lab program to completion on the real CPU', () => {
    for (const lesson of LESSONS) {
      expect(lesson.labProgram, `${lesson.id} should have a lab program`).toBeTruthy();
      expect(
        () => runProgram(lesson.labProgram!),
        `${lesson.id} lab program should halt`,
      ).not.toThrow();
    }
  });

  it('labels arbitrary-wide MOV immediates as simulator shorthand before first use', () => {
    const lesson = getLesson('x-w-registers')!;
    const shorthandIndex = lesson.sections.findIndex((section) => section.id === 'wide-mov-simulator-shorthand');
    const firstCodeIndex = lesson.sections.findIndex((section) => Boolean(section.code));
    const shorthand = lesson.sections[shorthandIndex];

    expect(shorthandIndex).toBeGreaterThanOrEqual(0);
    expect(shorthandIndex).toBeLessThan(firstCodeIndex);
    expect(`${shorthand?.paragraphs.join(' ')} ${shorthand?.callout}`).toMatch(/A64 Lab accepts any 64-bit constant/i);
    expect(`${shorthand?.paragraphs.join(' ')} ${shorthand?.callout}`).toMatch(/real A64 instruction cannot/i);
    expect(`${shorthand?.paragraphs.join(' ')} ${shorthand?.callout}`).toMatch(/MOVZ.*MOVK|memory/i);
  });

  it('teaches and executes the supported one-byte memory operations and TST', () => {
    const taughtText = LESSONS.flatMap((lesson) => lesson.sections)
      .flatMap((section) => [section.title, ...section.paragraphs, section.walkthrough?.execute ?? ''])
      .join(' ');
    expect(taughtText).toMatch(/\bLDRB\b/);
    expect(taughtText).toMatch(/\bSTRB\b/);
    expect(taughtText).toMatch(/\bTST\b/);

    const memoryProgram = parseProgram(getLesson('memory-ldr-str')!.labProgram!);
    expect(memoryProgram.instructions.map((instruction) => instruction.opcode)).toEqual(expect.arrayContaining(['ldrb', 'strb']));
    const memory = runProgram(getLesson('memory-ldr-str')!.labProgram!);
    expect(memory.registers.x2).toBe(42n);
    expect(memory.registers.x4).toBe(0x34n);
    expect(memory.memory.readByte(DATA_BASE)).toBe(0x34);

    const compareProgram = parseProgram(getLesson('cmp-nzcv')!.labProgram!);
    expect(compareProgram.instructions.map((instruction) => instruction.opcode)).toContain('tst');
    const comparison = runProgram(getLesson('cmp-nzcv')!.labProgram!);
    expect(comparison.registers.x0).toBe(0x0an);
    expect(comparison.registers.x1).toBe(0x04n);
    expect(comparison.flags).toEqual({ N: false, Z: true, C: false, V: false });
  });

  it('defines CMP and TST separately before their first executable use', () => {
    const lesson = getLesson('cmp-nzcv')!;
    const text = (section: Lesson['sections'][number]) => [
      section.title,
      ...section.paragraphs,
      ...(section.bullets ?? []),
      section.callout ?? '',
    ].join(' ');
    const firstUse = (opcode: 'cmp' | 'tst') => lesson.sections.findIndex((section) => (
      new RegExp(`(?:^|\\n)\\s*${opcode}\\b`, 'i').test(section.code ?? '')
        || new RegExp(`^${opcode}\\b`, 'i').test(section.walkthrough?.execute ?? '')
    ));
    const cmpDefinition = lesson.sections.findIndex((section) => /CMP means Compare/i.test(text(section)));
    const tstDefinition = lesson.sections.findIndex((section) => /TST means Test Bits/i.test(text(section)));

    expect(cmpDefinition).toBeGreaterThanOrEqual(0);
    expect(tstDefinition).toBeGreaterThanOrEqual(0);
    expect(cmpDefinition).not.toBe(tstDefinition);
    expect(cmpDefinition).toBeLessThanOrEqual(firstUse('cmp'));
    expect(tstDefinition).toBeLessThanOrEqual(firstUse('tst'));

    const cmpText = text(lesson.sections[cmpDefinition]!);
    expect(cmpText).toMatch(/subtract/i);
    expect(cmpText).toMatch(/throws .* away|discard|does not store/i);
    expect(cmpText).toMatch(/input registers.*stay the same|X0 and X1 stay the same/i);

    const tstText = text(lesson.sections[tstDefinition]!);
    expect(tstText).toMatch(/bitwise AND/i);
    expect(tstText).toMatch(/overlap|same position/i);
    expect(tstText).toMatch(/discards|throws .* away|does not save/i);
    expect(tstText).toMatch(/input registers stay unchanged/i);

    const taught = lesson.sections.map(text).join(' ');
    expect(taught).toMatch(/Z is the Zero flag/i);
    expect(taught).toMatch(/zero[^.]*Z\s*=\s*1/i);
    expect(taught).toMatch(/non-zero[^.]*Z\s*=\s*0/i);
  });

  it('runs both CMP and TST outcomes without changing their operands', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(getLesson('cmp-nzcv')!.labProgram!);
    const observations: Array<{
      opcode: string;
      before: [bigint, bigint];
      after: [bigint, bigint];
      Z: boolean;
    }> = [];

    while (!cpu.halted) {
      const opcode = cpu.currentInstruction?.opcode;
      const before: [bigint, bigint] = [cpu.registers.x0, cpu.registers.x1];
      cpu.step();
      if (opcode === 'cmp' || opcode === 'tst') {
        observations.push({
          opcode,
          before,
          after: [cpu.registers.x0, cpu.registers.x1],
          Z: cpu.flags.Z,
        });
      }
    }

    expect(observations).toEqual([
      { opcode: 'cmp', before: [5n, 5n], after: [5n, 5n], Z: true },
      { opcode: 'cmp', before: [5n, 7n], after: [5n, 7n], Z: false },
      { opcode: 'tst', before: [0x0an, 0x02n], after: [0x0an, 0x02n], Z: false },
      { opcode: 'tst', before: [0x0an, 0x04n], after: [0x0an, 0x04n], Z: true },
    ]);
  });

  it('demonstrates why signed less-than reads N together with V', () => {
    const overflowExample = getLesson('signed-flags')!.sections
      .find((section) => section.id === 'overflow-can-mislead-n');
    expect(overflowExample?.code).toBeTruthy();

    const cpu = runProgram(overflowExample!.code!);
    expect(cpu.registers.x0).toBe(0x80000000n);
    expect(cpu.registers.x1).toBe(1n);
    expect(cpu.flags).toEqual({ N: false, Z: false, C: true, V: true });
    expect(cpu.flags.N).not.toBe(cpu.flags.V);
  });

  it('keeps the debugger snapshot program and final integration visual focus exact', () => {
    const debugLesson = getLesson('debugging-state')!;
    const debugProgram = parseProgram(debugLesson.labProgram!);
    expect(debugProgram.instructions.map((instruction) => instruction.sourceText)).toEqual([
      'mov x1, 0x4141414141414141',
      'mov x29, sp',
      'sub sp, sp, #32',
      'mov x30, 0x4141414141414141',
    ]);
    const debug = runProgram(debugLesson.labProgram!);
    expect(debug.registers.pc).toBe(0x10n);
    expect(debug.registers.x1).toBe(0x4141_4141_4141_4141n);
    expect(debug.registers.x30).toBe(0x4141_4141_4141_4141n);
    expect(debug.registers.x29).toBe(STACK_TOP);
    expect(debug.registers.sp).toBe(STACK_TOP - 32n);

    const integration = getLesson('native-code-patterns')!;
    expect(integration.registerFocus).toContain('x1');
    expect(integration.visualFocus).toEqual(expect.arrayContaining(['stack', 'calls', 'flags']));
    expect(integration.flagFocus).toEqual(['Z']);
  });

  it('executes the arithmetic lesson with X2 equal to 30', () => {
    const cpu = runProgram(`mov x0, 10
mov x1, 20
add x2, x0, x1`);
    expect(cpu.registers.x2).toBe(30n);
  });

  it('matches the register, memory, endian, and stack states taught in the early lessons', () => {
    const width = runProgram(getLesson('x-w-registers')!.labProgram!);
    expect(width.registers.x0).toBe(1n);

    const store = runProgram(getLesson('memory-store')!.labProgram!);
    expect(store.memory.read64(DATA_BASE)).toBe(42n);

    const memory = runProgram(getLesson('memory-ldr-str')!.labProgram!);
    expect(memory.registers.x2).toBe(42n);
    expect(memory.registers.x4).toBe(0x34n);
    expect(memory.memory.read64(DATA_BASE)).toBe(0x34n);

    const endian = runProgram(getLesson('little-endian')!.labProgram!);
    expect(Array.from({ length: 8 }, (_, index) => endian.memory.readByte(DATA_BASE + BigInt(index))))
      .toEqual([0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11]);
    expect(endian.registers.x2).toBe(0x1122_3344_5566_7788n);

    const stack = runProgram(getLesson('stack')!.labProgram!);
    expect(stack.registers.sp).toBe(STACK_TOP);
    expect(stack.registers.x0).toBe(42n);
    expect(stack.registers.x1).toBe(42n);
    expect(stack.memory.read64(STACK_TOP - 16n)).toBe(42n);

    const stackValues = runProgram(getLesson('stack-values')!.labProgram!);
    expect(stackValues.registers.sp).toBe(STACK_TOP);
    expect(stackValues.registers.x1).toBe(42n);
    expect(stackValues.memory.read64(STACK_TOP - 16n)).toBe(42n);
  });

  it('explains when registers are enough and when stack backup is useful', () => {
    const stackLesson = getLesson('stack')!;
    const whySection = stackLesson.sections.find((section) => section.id === 'why-stack-exists');
    const registerOnlySection = stackLesson.sections.find((section) => (
      section.id === 'register-only-example'
    ));
    const useCasesSection = stackLesson.sections.find((section) => section.id === 'when-stack-helps');
    const preserveSection = stackLesson.sections.find((section) => (
      section.id === 'save-x0-across-call'
    ));
    const rangeSection = stackLesson.sections.find((section) => (
      section.id === 'reserve-exact-stack-range'
    ));
    const mainLessonText = [
      stackLesson.coreIdea,
      stackLesson.visualPrompt,
      ...stackLesson.sections.flatMap((section) => [
        ...section.paragraphs,
        ...(section.bullets ?? []),
        section.callout ?? '',
      ]),
    ].join(' ');
    const optionalText = [
      ...(rangeSection?.details?.paragraphs ?? []),
      ...(rangeSection?.details?.bullets ?? []),
    ].join(' ');
    const preservationReason = preserveSection?.paragraphs.join(' ') ?? '';

    expect(whySection?.diagram).toBe('stack-growth');
    expect(stackLesson.sections[0]?.id).toBe('why-stack-exists');
    expect(mainLessonText).toContain('Registers → fastest temporary workspace → keep values here when practical');
    expect(mainLessonText).toContain('Stack → extra / backup workspace in memory → save or preserve values here when needed');
    expect(mainLessonText).toMatch(/registers = immediate working area/i);
    expect(mainLessonText).toMatch(/stack = temporary backup \/ extra working area/i);
    const useCases = useCasesSection?.bullets?.join(' ') ?? '';
    expect(useCases).toMatch(/more temporary values than convenient registers/i);
    expect(useCases).toMatch(/survive a function call/i);
    expect(useCases).toMatch(/register value must be saved and restored/i);
    expect(useCases).toMatch(/return address must be kept safe/i);
    expect(useCases).toMatch(/local variables or temporary data/i);

    expect(registerOnlySection?.code).toBe('mov x0, 42\nadd x1, x0, #1');
    expect(registerOnlySection?.code).not.toMatch(/\bsp\b|\[[^\]]+\]/i);
    const registerOnly = runProgram(registerOnlySection!.code!);
    expect(registerOnly.registers.x0).toBe(42n);
    expect(registerOnly.registers.x1).toBe(43n);
    expect(registerOnly.registers.sp).toBe(STACK_TOP);

    expect(preservationReason).toMatch(/need the old X0 later/i);
    expect(preservationReason).toMatch(/function call may change X0/i);
    expect(preservationReason).toMatch(/save X0 in stack memory first/i);
    expect(preserveSection?.code).toMatch(/sub sp, sp, #16[\s\S]*str x0, \[sp\][\s\S]*bl foo[\s\S]*ldr x0, \[sp\][\s\S]*add sp, sp, #16/);
    const preserved = runProgram(preserveSection!.code!);
    expect(preserved.registers.x0).toBe(42n);
    expect(preserved.registers.sp).toBe(STACK_TOP);
    expect(preserved.memory.read64(STACK_TOP - 16n)).toBe(42n);

    expect(mainLessonText).toMatch(/SUB.*actual (?:stack )?(?:allocation|reservation)/i);
    expect(mainLessonText).toMatch(/STR.*write/i);
    expect(mainLessonText).toMatch(/LDR.*read/i);
    expect(mainLessonText).toMatch(/ADD.*finish/i);
    expect(mainLessonText).toMatch(/moving SP(?: back)? does not erase/i);
    expect(mainLessonText).not.toMatch(/\bFP\b|\bLR\b|\bSTP\b|\bLDP\b|stack frame|allocator/i);

    expect(mainLessonText).toMatch(/stack is ordinary memory/i);
    expect(mainLessonText).toMatch(/SP.*register containing the address/i);
    expect(mainLessonText).toContain('reserve → use → restore');
    expect(mainLessonText).toContain('marks 16 bytes as current temporary space');
    expect(mainLessonText).not.toMatch(/DFF7|DFF8|DFFF|hexadecimal continues|individual byte/i);
    expect(rangeSection?.details?.summary).toBe('Want to see exactly which 16 bytes were reserved?');
    expect(optionalText).toContain('DFF0 through DFF7');
    expect(optionalText).toContain('DFF8 through DFFF');
    expect(optionalText).toContain('Hexadecimal continues DFFD, DFFE, DFFF, E000');
    expect(optionalText).toContain('E000 − 0x10 = DFF0');
    expect(stackLesson.stackVisualization).toBe('simple');
    expect(stackLesson.quiz.map((question) => question.prompt).join(' ')).not.toMatch(/DFFF|exact.*range/i);
  });

  it('matches the control-flow and progressive stack-frame states described by the guide', () => {
    const branch = runProgram(getLesson('branches')!.labProgram!);
    expect(branch.registers.x2).toBe(1n);
    expect(branch.registers.x3).toBe(1n);

    const directBranch = runProgram(getLesson('unconditional-branches')!.labProgram!);
    expect(directBranch.registers.x0).toBe(1n);
    expect(directBranch.registers.x1).toBe(1n);

    const call = runProgram(getLesson('function-calls')!.labProgram!);
    expect(call.registers.x0).toBe(1n);
    expect(call.registers.x30).toBe(4n);

    const returnLesson = runProgram(getLesson('function-return')!.labProgram!);
    expect(returnLesson.registers.x0).toBe(1n);
    expect(returnLesson.registers.x1).toBe(1n);

    const argumentsLesson = runProgram(getLesson('function-arguments')!.labProgram!);
    expect(argumentsLesson.registers.x0).toBe(10n);
    expect(argumentsLesson.registers.x2).toBe(30n);
    expect(argumentsLesson.registers.x3).toBe(30n);

    const resultsLesson = runProgram(getLesson('function-results')!.labProgram!);
    expect(resultsLesson.registers.x0).toBe(30n);
    expect(resultsLesson.registers.x2).toBe(30n);
    expect(resultsLesson.registers.x3).toBe(30n);

    const savedLr = runProgram(getLesson('saving-return-address')!.labProgram!);
    expect(savedLr.registers.x0).toBe(15n);
    expect(savedLr.registers.x1).toBe(15n);
    expect(savedLr.registers.sp).toBe(STACK_TOP);

    for (const lessonId of ['load-store-pair', 'indexed-addressing'] as const) {
      const pair = runProgram(getLesson(lessonId)!.labProgram!);
      expect(pair.registers.x29).toBe(0x1111n);
      expect(pair.registers.x30).toBe(0x2222n);
      expect(pair.registers.sp).toBe(STACK_TOP);
    }

    const framePointer = runProgram(getLesson('frame-pointer')!.labProgram!);
    expect(framePointer.registers.x29).toBe(STACK_TOP - 32n);
    expect(framePointer.registers.sp).toBe(STACK_TOP);

    for (const lessonId of ['stack-frames', 'nested-function-calls'] as const) {
      const frame = runProgram(getLesson(lessonId)!.labProgram!);
      expect(frame.registers.sp).toBe(STACK_TOP);
      expect(frame.registers.x29).toBe(0n);
    }
  });

  it('executes the function lesson with X0 and X1 equal to 15', () => {
    const cpu = runProgram(`mov x0, 5
bl foo
b end

foo:
add x0, x0, #10
ret

end:
mov x1, x0`);
    expect(cpu.registers.x0).toBe(15n);
    expect(cpu.registers.x1).toBe(15n);
  });

  it('executes the Linux syscall lesson and emits the exact byte count', () => {
    const gate = runProgram(getLesson('syscall-gate')!.labProgram!);
    expect(gate.terminalOutput).toBe('');
    expect(gate.exited).toBe(true);
    expect(gate.exitCode).toBe(0n);

    const lesson = getLesson('linux-syscalls');
    expect(lesson?.labProgram).toBeTruthy();
    const cpu = runProgram(lesson!.labProgram!);
    expect(cpu.terminalOutput).toBe('hello\n');
    expect(cpu.exited).toBe(true);
    expect(cpu.exitCode).toBe(0n);
  });

  it('loads a labeled data address and completes the indirect-control-flow lessons', () => {
    const address = runProgram(getLesson('loading-addresses')!.labProgram!);
    expect(address.registers.x1).toBe(DATA_BASE);

    const indirect = runProgram(getLesson('indirect-control-flow')!.labProgram!);
    expect(indirect.registers.x0).toBe(15n);
    expect(indirect.registers.x1).toBe(15n);

    const synthesis = runProgram(getLesson('native-code-patterns')!.labProgram!);
    expect(synthesis.registers.x0).toBe(15n);
    expect(synthesis.registers.x2).toBe(15n);
  });
});

describe('challenge content', () => {
  it('covers every advertised category and resolves challenges by id', () => {
    const actual = new Set(CHALLENGES.map((challenge) => challenge.category));
    for (const category of CHALLENGE_CATEGORIES) expect(actual.has(category)).toBe(true);
    expect(new Set(CHALLENGES.map((challenge) => challenge.id)).size).toBe(CHALLENGES.length);
    for (const challenge of CHALLENGES) expect(getChallenge(challenge.id)).toBe(challenge);
    expect(getChallenge('missing')).toBeUndefined();
  });

  it('keeps all choice programs valid and finite', () => {
    for (const challenge of CHALLENGES) {
      if (challenge.type !== 'choice' || !challenge.code) continue;
      expect(
        () => runProgram(challenge.code!),
        `${challenge.id} should execute cleanly`,
      ).not.toThrow();
    }
  });

  it('keeps every supplied code solution within its rules and on target', () => {
    for (const challenge of CHALLENGES) {
      if (challenge.type !== 'code') continue;
      const parsedSolution = parseProgram(challenge.solution);
      const minimum = challenge.minLearnerInstructions ?? 1;
      expect(parsedSolution.instructions.length).toBeGreaterThanOrEqual(minimum);
      expect(parsedSolution.instructions.length).toBeLessThanOrEqual(challenge.maxLearnerInstructions);
      const forbidden = new Set(challenge.forbiddenOpcodes?.map((opcode) => opcode.toLowerCase()) ?? []);
      expect(parsedSolution.instructions.some((instruction) => forbidden.has(instruction.opcode))).toBe(false);

      const cpu = runProgram(`${challenge.setupProgram}\n${challenge.solution}`);
      if (!isRegisterName(challenge.target.register)) {
        throw new Error(`${challenge.id} has an invalid target register`);
      }
      expect(readRegister(cpu.registers, challenge.target.register)).toBe(challenge.target.value);
    }
  });

  it('includes the required X2 target from prepared X0 and X1 values', () => {
    const challenge = getChallenge('make-x2-thirty');
    expect(challenge?.type).toBe('code');
    if (!challenge || challenge.type !== 'code') throw new Error('Missing X2 challenge');
    const cpu = runProgram(`${challenge.setupProgram}\nadd x2, x0, x1`);
    expect(cpu.registers.x0).toBe(10n);
    expect(cpu.registers.x1).toBe(20n);
    expect(cpu.registers.x2).toBe(30n);
  });
});
