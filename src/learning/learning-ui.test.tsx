// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, type InitialEntry } from 'react-router-dom';
import { AppRoutes } from '../RouterApp';
import { ChallengeCard } from '../components/learning/ChallengeCard';
import { AssemblyExample } from '../components/learning/AssemblyExample';
import { PredictionQuestion } from '../components/learning/PredictionQuestion';
import { CURRICULUM_STAGES } from './curriculum';
import { formatLearnerText } from './learnerText';
import { getLesson, LESSONS } from './lessons';
import {
  ProgressProvider,
  PROGRESS_STORAGE_KEY,
  type LearningProgress,
} from './progress';
import type { CodeChallenge, Lesson, QuizQuestion } from './types';

const setTheme = vi.fn();

function renderRoutes(initialEntries: InitialEntry[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ProgressProvider>
        <AppRoutes theme="debugger" onThemeChange={setTheme} />
      </ProgressProvider>
    </MemoryRouter>,
  );
}

function storedProgress(): LearningProgress {
  const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
  if (!raw) throw new Error('Progress was not persisted');
  return JSON.parse(raw) as LearningProgress;
}

function currentLiveDemo(): HTMLElement {
  const demo = screen.getByRole('heading', { name: 'Step through this lesson' }).closest('section');
  if (!demo) throw new Error('Live lesson demo not found');
  return demo;
}

async function stepLiveDemo(user: ReturnType<typeof userEvent.setup>, count = 1) {
  const demo = currentLiveDemo();
  const step = within(demo).getByRole('button', { name: 'Step' });
  for (let index = 0; index < count; index += 1) await user.click(step);
}

function questionCard(question: QuizQuestion): HTMLElement {
  const card = screen.getByRole('heading', {
    name: formatLearnerText(question.prompt),
  }).closest('section');
  if (!card) throw new Error(`Question card not found: ${question.id}`);
  return card;
}

async function submitQuestion(
  user: ReturnType<typeof userEvent.setup>,
  question: QuizQuestion,
  optionId: string,
) {
  const option = question.options.find((candidate) => candidate.id === optionId);
  if (!option) throw new Error(`Option ${optionId} not found for ${question.id}`);
  const card = questionCard(question);
  await user.click(within(card).getByRole('radio', {
    name: formatLearnerText(option.label),
  }));
  await user.click(within(card).getByRole('button', { name: 'Submit' }));
}

async function answerEveryQuestionCorrectly(
  user: ReturnType<typeof userEvent.setup>,
  lesson: Lesson,
) {
  for (const question of lesson.quiz) {
    await submitQuestion(user, question, question.correctOptionId);
  }
}

beforeEach(() => {
  localStorage.clear();
  setTheme.mockClear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('prediction questions', () => {
  const question: QuizQuestion = {
    id: 'copy-result',
    prompt: 'What will X2 contain?',
    code: `mov x0, 10
mov x2, x0`,
    options: [
      { id: 'a', label: '0' },
      { id: 'b', label: '10' },
      { id: 'c', label: '20' },
    ],
    correctOptionId: 'b',
    explanation: 'MOV copies 10 from X0 into X2.',
  };

  it('hides feedback until submission, supports retry, and persists quiz scoring', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProgressProvider>
          <PredictionQuestion question={question} lessonId="registers" />
        </ProgressProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByText(question.explanation)).toBeNull();
    const submit = screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    await user.click(screen.getByRole('radio', { name: '0' }));
    await user.click(submit);
    expect(screen.getByRole('status').textContent).toContain('Not quite.');
    expect(screen.getByRole('status').textContent).toContain(question.explanation);

    await waitFor(() => {
      expect(storedProgress().quizResults['registers:copy-result']).toEqual({
        correct: false,
        attempts: 1,
      });
    });

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await user.click(screen.getByRole('radio', { name: '10' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByRole('status').textContent).toContain('Correct.');

    await waitFor(() => {
      expect(storedProgress().quizResults['registers:copy-result']).toEqual({
        correct: true,
        attempts: 2,
      });
    });
  });

  it('reveals an answer only when explicitly requested and does not score it', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProgressProvider>
          <PredictionQuestion question={question} lessonId="registers" />
        </ProgressProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByText(question.explanation)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Reveal answer' }));
    expect(screen.getByRole('status').textContent).toContain('Answer revealed.');
    await waitFor(() => expect(storedProgress().quizResults).toEqual({}));
  });
});

describe('assembly examples', () => {
  it('copies only the executable assembly source', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const code = `mov x0, 10
add x1, x0, #5`;
    render(
      <MemoryRouter>
        <AssemblyExample
          code={code}
          title="Small example"
          lessonId="mov-arithmetic"
          lessonTitle="MOV and Arithmetic"
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(code);
    expect(screen.getByText('Copied')).toBeTruthy();
  });
});

describe('learning routes and navigation', () => {
  it('keeps the exact stack-byte breakdown in a closed optional disclosure', async () => {
    const user = userEvent.setup();
    const { container } = renderRoutes(['/guide/stack']);
    const summary = screen.getByText('Want to see exactly which 16 bytes were reserved?');
    const details = summary.closest('details') as HTMLDetailsElement | null;
    const diagram = screen.getByTestId('foundation-stack-growth-four-stages');

    expect(details).toBeTruthy();
    expect(details?.open).toBe(false);
    expect(container.contains(diagram)).toBe(true);
    expect(diagram.textContent).toContain('0xDFF8');
    expect(diagram.textContent).not.toContain('DFFF');
    expect(screen.getByTestId('dynamic-stack').textContent).not.toMatch(/DFF8|DFFF/);
    await user.click(summary);
    expect(details?.open).toBe(true);
    expect(details?.textContent).toContain('DFF8 through DFFF');
  });

  it('shows inline lesson terms with apostrophes instead of backticks', () => {
    const arithmetic = renderRoutes(['/guide/mov-arithmetic']);
    const lessonView = document.querySelector('.lesson-view');

    expect(lessonView?.textContent).toContain("'add x2, x0, x1'");
    expect(lessonView?.textContent).not.toContain('`add x2, x0, x1`');
    arithmetic.unmount();

    renderRoutes(['/guide/data-sections-strings']);
    expect(screen.getByRole('heading', {
      name: "Do '.data', '.text', or '.globl' consume an ARM64 instruction address?",
    })).toBeTruthy();
    expect(screen.getByRole('radio', {
      name: "Only '.data' consumes an instruction",
    })).toBeTruthy();
  });

  it('renders /guide directly and navigates through the top-level routes', async () => {
    const user = userEvent.setup();
    renderRoutes(['/guide']);
    expect(screen.getByRole('heading', { name: 'Learn ARM64', level: 2 })).toBeTruthy();

    await user.click(screen.getByRole('link', { name: 'Challenges' }));
    expect(screen.getByRole('heading', { name: 'ARM64 Challenges', level: 2 })).toBeTruthy();

    await user.click(screen.getByRole('link', { name: 'Lab' }));
    expect(screen.getByRole('heading', { name: 'Assembly Editor', level: 2 })).toBeTruthy();
  });

  it('renders the complete staged curriculum on the Guide dashboard', () => {
    renderRoutes(['/guide']);

    for (const stage of CURRICULUM_STAGES) {
      expect(screen.getByRole('heading', { name: stage.title, level: 4 })).toBeTruthy();
      expect(screen.getByText(stage.description)).toBeTruthy();
    }
    expect(screen.getByText(`${LESSONS.length} focused lessons`)).toBeTruthy();
  });

  it('renders /lab and /challenges from direct entries', () => {
    const lab = renderRoutes(['/lab']);
    expect(screen.getByRole('heading', { name: 'Assembly Editor', level: 2 })).toBeTruthy();
    lab.unmount();

    renderRoutes(['/challenges']);
    expect(screen.getByRole('heading', { name: 'ARM64 Challenges', level: 2 })).toBeTruthy();
  });

  it('moves between adjacent lessons', async () => {
    const user = userEvent.setup();
    const registers = getLesson('registers');
    const widths = getLesson('x-w-registers');
    if (!registers || !widths) throw new Error('Adjacent register lessons are missing');
    renderRoutes(['/guide/registers']);
    expect(screen.getByRole('heading', { name: registers.title, level: 2 })).toBeTruthy();

    await user.click(screen.getByRole('link', { name: /Next Lesson/ }));
    expect(screen.getByRole('heading', { name: widths.title, level: 2 })).toBeTruthy();

    await user.click(screen.getByRole('link', { name: /Previous Lesson/ }));
    expect(screen.getByRole('heading', { name: registers.title, level: 2 })).toBeTruthy();
  });

  it('resets the embedded real-CPU visualization when the lesson changes', async () => {
    const user = userEvent.setup();
    const nextLesson = getLesson('registers');
    if (!nextLesson) throw new Error('Registers lesson is missing');
    renderRoutes(['/guide/meet-arm64']);
    const firstDemo = screen.getByText('Step through this lesson').closest('section');
    if (!firstDemo) throw new Error('Live lesson demo not found');
    await user.click(within(firstDemo).getByRole('button', { name: 'Step' }));
    expect(within(screen.getByTestId('dynamic-visualizer')).getByText('Register changes')).toBeTruthy();

    await user.click(screen.getByRole('link', { name: /Next Lesson/ }));
    expect(screen.getByRole('heading', { name: nextLesson.title, level: 2 })).toBeTruthy();
    const resetVisual = screen.getByTestId('dynamic-visualizer');
    expect(within(resetVisual).getByText('Reset CPU state')).toBeTruthy();
    expect(within(resetVisual).queryByText('Register changes')).toBeNull();
  });
});

describe('focused live lesson visualizations', () => {
  it('shows Reset and Before → Execute → After without changing watched ADD inputs', async () => {
    const user = userEvent.setup();
    renderRoutes(['/guide/mov-arithmetic']);

    let context = screen.getByTestId('dynamic-context');
    expect(within(context).getByText('Before')).toBeTruthy();
    expect(within(context).getByText('Execute')).toBeTruthy();
    expect(within(context).getByText('After')).toBeTruthy();
    expect(within(context).getByText('Registers to watch')).toBeTruthy();

    await stepLiveDemo(user, 3);
    context = screen.getByTestId('dynamic-context');
    expect(within(context).getByTestId('visual-phase-execute').textContent).toContain('add x2, x0, x1');

    const before = within(context).getByTestId('visual-phase-before');
    const after = within(context).getByTestId('visual-phase-after');
    for (const unchangedInput of ['x0', 'x1']) {
      const beforeValue = before.querySelector(`[data-register="${unchangedInput}"] code`)?.textContent;
      const afterValue = after.querySelector(`[data-register="${unchangedInput}"] code`)?.textContent;
      expect(beforeValue, `${unchangedInput} should be visible before ADD`).toBeTruthy();
      expect(afterValue, `${unchangedInput} should be visible after ADD`).toBe(beforeValue);
      expect(after.querySelector(`[data-register="${unchangedInput}"]`)?.textContent).toContain('unchanged');
    }
    expect(before.querySelector('[data-register="x2"] code')?.textContent).not.toBe(
      after.querySelector('[data-register="x2"] code')?.textContent,
    );

    await user.click(within(currentLiveDemo()).getByRole('button', { name: 'Reset' }));
    context = screen.getByTestId('dynamic-context');
    expect(within(context).getByText('Registers to watch')).toBeTruthy();
    expect(screen.getByTestId('dynamic-visualizer').textContent).toContain('Reset CPU state');
  });

  it('keeps the basic Stack lesson focused on SP and stack memory', async () => {
    const user = userEvent.setup();
    renderRoutes(['/guide/stack']);

    expect(screen.getByTestId('dynamic-stack')).toBeTruthy();
    expect(screen.queryByTestId('dynamic-pointers')).toBeNull();
    expect(screen.queryByTestId('dynamic-branch')).toBeNull();
    expect(screen.queryByTestId('dynamic-calls')).toBeNull();
    expect(screen.queryByTestId('dynamic-terminal')).toBeNull();

    const initialSp = screen.getByTestId('visual-phase-before')
      .querySelector('[data-register="sp"] code')?.textContent;
    expect(initialSp).toBeTruthy();

    await stepLiveDemo(user);
    expect(screen.getByTestId('visual-phase-after')
      .querySelector('[data-register="sp"] code')?.textContent).toBe(initialSp);

    await stepLiveDemo(user);
    let context = screen.getByTestId('dynamic-context');
    expect(context.querySelector('[data-register="sp"]')).toBeTruthy();
    expect(context.querySelector('[data-register="x29"]')).toBeNull();
    expect(context.querySelector('[data-register="x30"]')).toBeNull();
    const movedSp = screen.getByTestId('visual-phase-after')
      .querySelector('[data-register="sp"] code')?.textContent;
    expect(movedSp).not.toBe(initialSp);
    const simpleStack = screen.getByTestId('dynamic-stack');
    expect(simpleStack.textContent).toContain('16 bytes are reserved; memory contents did not change');
    expect(simpleStack.textContent).not.toMatch(/DFF8|DFFF/);

    await user.click(within(currentLiveDemo()).getByRole('button', { name: 'Previous' }));
    context = screen.getByTestId('dynamic-context');
    expect(within(context).getByTestId('visual-phase-execute').textContent).toContain('Restore previous snapshot');
    const restoredSp = screen.getByTestId('visual-phase-after')
      .querySelector('[data-register="sp"] code')?.textContent;
    expect(restoredSp).toBe(initialSp);
    expect(screen.queryByTestId('dynamic-pointers')).toBeNull();
    expect(screen.queryByTestId('dynamic-calls')).toBeNull();
  });

  it('shows only Z while CMP introduces equality', async () => {
    const user = userEvent.setup();
    renderRoutes(['/guide/cmp-nzcv']);
    await stepLiveDemo(user, 3);

    const flags = screen.getByTestId('dynamic-branch');
    expect(within(flags).getByText('Z')).toBeTruthy();
    expect(within(flags).queryByText('N')).toBeNull();
    expect(within(flags).queryByText('C')).toBeNull();
    expect(within(flags).queryByText('V')).toBeNull();
  });

  it('keeps the first BL lesson scoped to PC, LR, and the call path', async () => {
    const user = userEvent.setup();
    renderRoutes(['/guide/function-calls']);
    await stepLiveDemo(user);

    expect(screen.getByTestId('dynamic-calls')).toBeTruthy();
    const watched = new Set(
      [...screen.getByTestId('dynamic-context').querySelectorAll<HTMLElement>('[data-register]')]
        .map((element) => element.dataset.register),
    );
    expect(watched).toEqual(new Set(['pc', 'x30']));
    expect(screen.queryByTestId('dynamic-stack')).toBeNull();
    expect(screen.queryByTestId('dynamic-pointers')).toBeNull();
    expect(screen.queryByTestId('dynamic-branch')).toBeNull();
    expect(screen.queryByTestId('dynamic-terminal')).toBeNull();
  });

  it('restores syscall terminal output with Previous and Reset', async () => {
    const user = userEvent.setup();
    renderRoutes(['/guide/linux-syscalls']);
    await stepLiveDemo(user, 5);

    let terminal = screen.getByTestId('dynamic-terminal');
    expect(terminal.textContent).toContain('hello');

    await user.click(within(currentLiveDemo()).getByRole('button', { name: 'Previous' }));
    terminal = screen.getByTestId('dynamic-terminal');
    expect(terminal.textContent).not.toContain('hello');

    await stepLiveDemo(user);
    expect(screen.getByTestId('dynamic-terminal').textContent).toContain('hello');
    await user.click(within(currentLiveDemo()).getByRole('button', { name: 'Reset' }));
    expect(screen.getByTestId('dynamic-terminal').textContent).not.toContain('hello');
  });
});

describe('Guide and Lab integration', () => {
  it('transfers valid lesson assembly, steps it, and returns to the lesson', async () => {
    const user = userEvent.setup();
    const lesson = getLesson('registers');
    if (!lesson?.labProgram) throw new Error('Registers lesson has no lab program');
    renderRoutes(['/guide/registers']);

    await user.click(within(questionCard(lesson.quiz[0])).getByRole('button', { name: /Try in Lab/ }));

    const editor = screen.getByRole('textbox', { name: 'ARM64 assembly source' }) as HTMLTextAreaElement;
    expect(editor.value).toBe(lesson.labProgram);
    const returnLink = screen.getByRole('link', { name: `← Return to ${lesson.title} lesson` });
    expect(returnLink).toBeTruthy();
    expect(screen.getByText('Lesson program loaded. Press Step when you are ready.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Step' }));
    expect(screen.getByText('X0 = 10')).toBeTruthy();

    await user.click(returnLink);
    expect(screen.getByRole('heading', { name: lesson.title, level: 2 })).toBeTruthy();
  });

  it('completes the BL/LR/RET learning loop and returns to the function lesson', async () => {
    const user = userEvent.setup();
    const lesson = getLesson('function-return');
    if (!lesson) throw new Error('Function return lesson not found');
    renderRoutes(['/guide/function-return']);

    await answerEveryQuestionCorrectly(user, lesson);
    expect(screen.getAllByRole('status').filter((status) => status.textContent?.includes('Correct.')))
      .toHaveLength(lesson.quiz.length);
    await user.click(screen.getAllByRole('button', { name: /Try in Lab/ })[0]);

    const step = screen.getByRole('button', { name: 'Step' });
    await user.click(step);
    let calls = screen.getByTestId('dynamic-calls');
    expect(within(calls).getByText('Call entered')).toBeTruthy();
    expect(within(calls).getByText('X30 / LR')).toBeTruthy();
    expect(within(calls).getByText('foo')).toBeTruthy();

    await user.click(step);
    await user.click(step);
    calls = screen.getByTestId('dynamic-calls');
    expect(within(calls).getByText('Returned')).toBeTruthy();
    expect(within(calls).queryByText('foo')).toBeNull();

    await user.click(screen.getByRole('link', { name: `← Return to ${lesson.title} lesson` }));
    expect(screen.getByRole('heading', { name: lesson.title, level: 2 })).toBeTruthy();
    const markComplete = screen.getByRole('button', { name: 'Mark Complete' }) as HTMLButtonElement;
    expect(markComplete.disabled).toBe(false);
    await user.click(markComplete);
    await waitFor(() => expect(storedProgress().completedLessons).toContain('function-return'));
  });
});

describe('lesson completion persistence', () => {
  it('keeps completion locked after wrong and revealed answers, then unlocks after every correct retry', async () => {
    const user = userEvent.setup();
    const lesson = getLesson('registers');
    if (!lesson || lesson.quiz.length < 2) throw new Error('Registers needs at least two questions');
    renderRoutes(['/guide/registers']);
    await waitFor(() => expect(storedProgress().completedLessons).toEqual([]));

    const markComplete = screen.getByRole('button', { name: 'Mark Complete' }) as HTMLButtonElement;
    expect(markComplete.disabled).toBe(true);
    expect(questionCard(lesson.quiz[0]).textContent).toContain(`QUESTION 1 OF ${lesson.quiz.length}`);
    expect(questionCard(lesson.quiz[1]).textContent).toContain(`QUESTION 2 OF ${lesson.quiz.length}`);
    expect(screen.getByText(`0 / ${lesson.quiz.length} questions correct. Answer every question correctly to unlock lesson completion.`)).toBeTruthy();

    const firstQuestion = lesson.quiz[0];
    const wrongOption = firstQuestion.options.find((option) => option.id !== firstQuestion.correctOptionId);
    if (!wrongOption) throw new Error('First question needs a distractor');
    await submitQuestion(user, firstQuestion, wrongOption.id);
    expect(within(questionCard(firstQuestion)).getByRole('status').textContent).toContain('Not quite.');

    const secondQuestion = lesson.quiz[1];
    await user.click(within(questionCard(secondQuestion)).getByRole('button', { name: 'Reveal answer' }));
    expect(within(questionCard(secondQuestion)).getByRole('status').textContent).toContain('Answer revealed.');
    expect(markComplete.disabled).toBe(true);
    await waitFor(() => {
      expect(storedProgress().quizResults[`${lesson.id}:${firstQuestion.id}`]?.correct).toBe(false);
      expect(storedProgress().quizResults[`${lesson.id}:${secondQuestion.id}`]).toBeUndefined();
      expect(storedProgress().completedLessons).not.toContain(lesson.id);
    });

    await user.click(within(questionCard(firstQuestion)).getByRole('button', { name: 'Retry' }));
    await submitQuestion(user, firstQuestion, firstQuestion.correctOptionId);
    expect(markComplete.disabled).toBe(true);
    expect(screen.getByText(`1 / ${lesson.quiz.length} questions correct. Answer every question correctly to unlock lesson completion.`)).toBeTruthy();

    await user.click(within(questionCard(secondQuestion)).getByRole('button', { name: 'Retry' }));
    await submitQuestion(user, secondQuestion, secondQuestion.correctOptionId);
    expect(markComplete.disabled).toBe(false);
    expect(screen.getByText(`${lesson.quiz.length} / ${lesson.quiz.length} questions correct. You can now mark this lesson complete.`)).toBeTruthy();
  });

  it('persists quiz unlock and lesson completion across remounts', async () => {
    const user = userEvent.setup();
    const lesson = getLesson('registers');
    if (!lesson) throw new Error('Registers lesson is missing');
    const firstRender = renderRoutes(['/guide/registers']);
    await answerEveryQuestionCorrectly(user, lesson);
    await waitFor(() => {
      for (const question of lesson.quiz) {
        expect(storedProgress().quizResults[`${lesson.id}:${question.id}`]?.correct).toBe(true);
      }
    });

    firstRender.unmount();
    renderRoutes(['/guide/registers']);
    const persistedMark = screen.getByRole('button', { name: 'Mark Complete' }) as HTMLButtonElement;
    expect(persistedMark.disabled).toBe(false);
    await user.click(persistedMark);
    await waitFor(() => expect(storedProgress().completedLessons).toContain(lesson.id));
    expect(screen.getByText('Lesson complete!')).toBeTruthy();

    cleanup();
    renderRoutes(['/guide/registers']);
    const persistedUnmark = screen.getByRole('button', { name: 'Unmark Complete' }) as HTMLButtonElement;
    expect(persistedUnmark.disabled).toBe(false);
    expect(persistedUnmark.getAttribute('aria-pressed')).toBe('true');
  });

  it('preserves a legacy completion without retroactive quiz gating, then gates it after unmarking', async () => {
    const lesson = getLesson('registers');
    if (!lesson) throw new Error('Registers lesson is missing');
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({
      completedLessons: [lesson.id],
      quizResults: {},
      completedChallenges: [],
    }));
    const user = userEvent.setup();
    renderRoutes(['/guide/registers']);

    const unmark = screen.getByRole('button', { name: 'Unmark Complete' }) as HTMLButtonElement;
    expect(unmark.disabled).toBe(false);
    expect(unmark.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Your progress is saved on this device.')).toBeTruthy();

    await user.click(unmark);
    await waitFor(() => expect(storedProgress().completedLessons).not.toContain(lesson.id));
    const markAgain = screen.getByRole('button', { name: 'Mark Complete' }) as HTMLButtonElement;
    expect(markAgain.disabled).toBe(true);
    expect(screen.getByText(`0 / ${lesson.quiz.length} questions correct. Answer every question correctly to unlock lesson completion.`)).toBeTruthy();
  });

  it('resets saved lesson, quiz, and challenge progress only after confirmation', async () => {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({
      completedLessons: ['registers'],
      quizResults: { 'registers:copy': { correct: true, attempts: 1 } },
      completedChallenges: ['register-copy'],
    }));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderRoutes(['/guide']);

    await user.click(screen.getByRole('button', { name: 'Reset Progress' }));
    expect(confirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(storedProgress()).toEqual({
      completedLessons: [],
      quizResults: {},
      completedChallenges: [],
    }));
    expect(screen.getByText(`0 / ${LESSONS.length} lessons completed`)).toBeTruthy();
  });
});

describe('challenge completion', () => {
  it('rejects wrong, malformed, and over-limit code, then accepts an alternate semantic solution', async () => {
    const user = userEvent.setup();
    renderRoutes(['/challenges']);
    const heading = screen.getByRole('heading', { name: 'Make X2 equal 30' });
    const card = heading.closest('article');
    if (!card) throw new Error('Challenge card not found');
    const cardQueries = within(card);
    const editor = cardQueries.getByRole('textbox', { name: 'Your instructions' });

    await user.type(editor, 'mov x2, 29');
    await user.click(cardQueries.getByRole('button', { name: 'Verify' }));
    expect(cardQueries.getByRole('status').textContent).toContain('X2 is 29; target is 30.');
    expect(storedProgress().completedChallenges).not.toContain('make-x2-thirty');

    await user.clear(editor);
    await user.type(editor, 'not an instruction');
    await user.click(cardQueries.getByRole('button', { name: 'Verify' }));
    expect(cardQueries.getByRole('status').textContent).toContain('Unsupported instruction');
    expect(storedProgress().completedChallenges).not.toContain('make-x2-thirty');

    await user.clear(editor);
    await user.type(editor, 'mov x2, 0{enter}add x2, x0, x1');
    await user.click(cardQueries.getByRole('button', { name: 'Verify' }));
    expect(cardQueries.getByRole('status').textContent).toContain('Use 1 learner instruction.');
    expect(storedProgress().completedChallenges).not.toContain('make-x2-thirty');

    await user.clear(editor);
    await user.type(editor, 'add x2, x1, #10');
    await user.click(cardQueries.getByRole('button', { name: 'Verify' }));
    expect(cardQueries.getByRole('status').textContent).toContain('Challenge complete.');
    await waitFor(() => {
      expect(storedProgress().completedChallenges).toContain('make-x2-thirty');
    });
  });

  it('fails a looping learner program cleanly without recording completion', async () => {
    const user = userEvent.setup();
    const loopingChallenge: CodeChallenge = {
      id: 'test-loop',
      title: 'Loop safety',
      category: 'Branches',
      type: 'code',
      description: 'Test execution safety.',
      prompt: 'Make X1 equal 1.',
      explanation: 'A finite program is required.',
      setupProgram: 'mov x0, 0',
      starterCode: '',
      solution: 'mov x1, 1',
      target: { kind: 'register', register: 'x1', value: 1n },
      maxLearnerInstructions: 1,
    };
    render(
      <MemoryRouter>
        <ProgressProvider>
          <ChallengeCard challenge={loopingChallenge} />
        </ProgressProvider>
      </MemoryRouter>,
    );

    const editor = screen.getByRole('textbox', { name: 'Your instructions' });
    await user.type(editor, 'loop:{enter}b loop');
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(screen.getByRole('status').textContent).toContain('Execution did not finish within 200 steps.');
    await waitFor(() => expect(storedProgress().completedChallenges).not.toContain('test-loop'));
  });
});
