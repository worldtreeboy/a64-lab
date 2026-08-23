import { describe, expect, it } from 'vitest';
import { ARM64CPU, parseProgram } from '../arm64/interpreter';
import { isRegisterName, readRegister } from '../arm64/registers';
import { CHALLENGE_CATEGORIES, CHALLENGES, getChallenge } from './challenges';
import { getAdjacentLessons, getLesson, LESSONS } from './lessons';

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
  it('defines an ordered, uniquely-addressable 18 lesson curriculum', () => {
    const lessonIds = new Set(LESSONS.map((lesson) => lesson.id));
    const quizIds = new Set<string>();

    expect(LESSONS).toHaveLength(18);
    expect(LESSONS.map((lesson) => lesson.order)).toEqual(
      Array.from({ length: 18 }, (_, index) => index + 1),
    );
    expect(new Set(LESSONS.map((lesson) => lesson.id)).size).toBe(LESSONS.length);
    for (const lesson of LESSONS) {
      expect(getLesson(lesson.id)).toBe(lesson);
      expect(lesson.quiz.length).toBeGreaterThan(0);
      for (const prerequisite of lesson.prerequisites ?? []) {
        expect(lessonIds.has(prerequisite), `${lesson.id} has an unknown prerequisite`).toBe(true);
      }
      for (const question of lesson.quiz) {
        expect(quizIds.has(question.id), `duplicate quiz id: ${question.id}`).toBe(false);
        quizIds.add(question.id);
        expect(
          question.options.some((option) => option.id === question.correctOptionId),
          `${question.id} has an unknown correct answer`,
        ).toBe(true);
      }
      expect(
        lesson.sections.some((section) => Boolean(section.diagram)),
        `${lesson.id} should include a concept-specific visual diagram`,
      ).toBe(true);
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
      previous: LESSONS[16],
      next: null,
    });
    expect(getAdjacentLessons('missing')).toEqual({ previous: null, next: null });
  });

  it('keeps every assembly section parseable by the existing parser', () => {
    for (const lesson of LESSONS) {
      for (const section of lesson.sections) {
        if (!section.code) continue;
        expect(
          () => parseProgram(section.code!),
          `${lesson.id}/${section.id} should contain valid ARM64 assembly`,
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
    const lesson = getLesson('linux-syscalls');
    expect(lesson?.labProgram).toBeTruthy();
    const cpu = runProgram(lesson!.labProgram!);
    expect(cpu.terminalOutput).toBe('hello\n');
    expect(cpu.exited).toBe(true);
    expect(cpu.exitCode).toBe(0n);
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
