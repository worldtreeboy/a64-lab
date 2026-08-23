import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ARM64CPU, parseProgram } from '../arm64/interpreter';
import { isRegisterName, readRegister, STACK_TOP } from '../arm64/registers';
import { DATA_BASE } from '../arm64/parser';
import { CHALLENGE_CATEGORIES, CHALLENGES, getChallenge } from './challenges';
import { CURRICULUM_STAGES, lessonsForStage } from './curriculum';
import { getAdjacentLessons, getLesson, LESSONS } from './lessons';

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
      expect(lesson.sections.length, `${lesson.id} should stay short`).toBeGreaterThanOrEqual(2);
      expect(lesson.sections.length, `${lesson.id} should stay short`).toBeLessThanOrEqual(3);
      expect(lesson.quiz, `${lesson.id} should have one prediction question`).toHaveLength(1);
      expect(lesson.nextStep.length).toBeGreaterThan(20);
      expect(lesson.visualPrompt.trim().length, `${lesson.id} needs a visual teaching prompt`).toBeGreaterThanOrEqual(20);
      expect(lesson.visualFocus.length, `${lesson.id} needs a focused live visual`).toBeGreaterThan(0);
      expect(lesson.visualFocus.length, `${lesson.id} shows too many visual systems at once`).toBeLessThanOrEqual(2);
      expect(new Set(lesson.visualFocus).size, `${lesson.id} repeats a visual focus`).toBe(lesson.visualFocus.length);
      expect(lesson.registerFocus.length, `${lesson.id} needs watched registers`).toBeGreaterThan(0);
      expect(lesson.registerFocus.length, `${lesson.id} watches too many registers`).toBeLessThanOrEqual(5);
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
        expect(question.options.length).toBeGreaterThanOrEqual(3);
        expect(question.options.length).toBeLessThanOrEqual(4);
        expect(new Set(question.options.map((option) => option.id)).size).toBe(question.options.length);
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

  it('keeps every assembly section and quiz example self-contained and parseable', () => {
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
      }
    }
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
    expect(memory.memory.read64(DATA_BASE)).toBe(42n);

    const endian = runProgram(getLesson('little-endian')!.labProgram!);
    expect(Array.from({ length: 8 }, (_, index) => endian.memory.readByte(DATA_BASE + BigInt(index))))
      .toEqual([0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11]);
    expect(endian.registers.x2).toBe(0x1122_3344_5566_7788n);

    const stack = runProgram(getLesson('stack')!.labProgram!);
    expect(stack.registers.sp).toBe(STACK_TOP);

    const stackValues = runProgram(getLesson('stack-values')!.labProgram!);
    expect(stackValues.registers.sp).toBe(STACK_TOP);
    expect(stackValues.registers.x1).toBe(42n);
    expect(stackValues.memory.read64(STACK_TOP - 16n)).toBe(42n);
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
