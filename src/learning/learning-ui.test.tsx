// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, type InitialEntry } from 'react-router-dom';
import { AppRoutes } from '../RouterApp';
import { ChallengeCard } from '../components/learning/ChallengeCard';
import { AssemblyExample } from '../components/learning/AssemblyExample';
import { PredictionQuestion } from '../components/learning/PredictionQuestion';
import { getLesson } from './lessons';
import {
  ProgressProvider,
  PROGRESS_STORAGE_KEY,
  type LearningProgress,
} from './progress';
import type { CodeChallenge, QuizQuestion } from './types';

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
  it('renders /guide directly and navigates through the top-level routes', async () => {
    const user = userEvent.setup();
    renderRoutes(['/guide']);
    expect(screen.getByRole('heading', { name: 'Learn ARM64', level: 2 })).toBeTruthy();

    await user.click(screen.getByRole('link', { name: 'Challenges' }));
    expect(screen.getByRole('heading', { name: 'ARM64 Challenges', level: 2 })).toBeTruthy();

    await user.click(screen.getByRole('link', { name: 'Lab' }));
    expect(screen.getByRole('heading', { name: 'Assembly Editor', level: 2 })).toBeTruthy();
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
    renderRoutes(['/guide/registers']);
    expect(screen.getByRole('heading', { name: 'Registers', level: 2 })).toBeTruthy();

    await user.click(screen.getByRole('link', { name: /Next Lesson/ }));
    expect(screen.getByRole('heading', { name: 'MOV and Arithmetic', level: 2 })).toBeTruthy();

    await user.click(screen.getByRole('link', { name: /Previous Lesson/ }));
    expect(screen.getByRole('heading', { name: 'Registers', level: 2 })).toBeTruthy();
  });

  it('resets the embedded real-CPU visualization when the lesson changes', async () => {
    const user = userEvent.setup();
    renderRoutes(['/guide/meet-arm64']);
    const firstDemo = screen.getByText('Step through this lesson').closest('section');
    if (!firstDemo) throw new Error('Live lesson demo not found');
    await user.click(within(firstDemo).getByRole('button', { name: 'Step' }));
    expect(within(screen.getByTestId('dynamic-visualizer')).getByText('Register changes')).toBeTruthy();

    await user.click(screen.getByRole('link', { name: /Next Lesson/ }));
    expect(screen.getByRole('heading', { name: 'Registers', level: 2 })).toBeTruthy();
    const resetVisual = screen.getByTestId('dynamic-visualizer');
    expect(within(resetVisual).getByText('Reset CPU state')).toBeTruthy();
    expect(within(resetVisual).queryByText('Register changes')).toBeNull();
  });
});

describe('Guide and Lab integration', () => {
  it('transfers valid lesson assembly, steps it, and returns to the lesson', async () => {
    const user = userEvent.setup();
    const lesson = getLesson('registers');
    if (!lesson?.labProgram) throw new Error('Registers lesson has no lab program');
    renderRoutes(['/guide/registers']);

    const quizHeading = screen.getByRole('heading', { name: 'Predict before revealing' });
    const quiz = quizHeading.closest('section');
    if (!quiz) throw new Error('Lesson quiz not found');
    await user.click(within(quiz).getByRole('button', { name: /Try in Lab/ }));

    const editor = screen.getByRole('textbox', { name: 'ARM64 assembly source' }) as HTMLTextAreaElement;
    expect(editor.value).toBe(lesson.labProgram);
    const returnLink = screen.getByRole('link', { name: '← Return to Registers lesson' });
    expect(returnLink).toBeTruthy();
    expect(screen.getByText('Lesson program loaded. Press Step when you are ready.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Step/ }));
    expect(screen.getByText('X0 = 10')).toBeTruthy();

    await user.click(returnLink);
    expect(screen.getByRole('heading', { name: 'Registers', level: 2 })).toBeTruthy();
  });

  it('completes the BL/LR/RET learning loop and returns to the function lesson', async () => {
    const user = userEvent.setup();
    renderRoutes(['/guide/function-calls']);

    await user.click(screen.getByRole('radio', { name: '30' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByRole('status').textContent).toContain('Correct.');
    await user.click(screen.getAllByRole('button', { name: /Try in Lab/ })[0]);

    const step = screen.getByRole('button', { name: /Step/ });
    await user.click(step);
    await user.click(step);
    await user.click(step);
    let calls = screen.getByTestId('dynamic-calls');
    expect(within(calls).getByText('Call entered')).toBeTruthy();
    expect(within(calls).getByText('X30 / LR')).toBeTruthy();
    expect(within(calls).getByText('addnumbers')).toBeTruthy();

    await user.click(step);
    await user.click(step);
    calls = screen.getByTestId('dynamic-calls');
    expect(within(calls).getByText('Returned')).toBeTruthy();
    expect(within(calls).queryByText('addnumbers')).toBeNull();

    await user.click(screen.getByRole('link', { name: '← Return to Function Calls lesson' }));
    expect(screen.getByRole('heading', { name: 'Function Calls', level: 2 })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Mark Complete' }));
    await waitFor(() => expect(storedProgress().completedLessons).toContain('function-calls'));
  });
});

describe('lesson completion persistence', () => {
  it('does not complete a lesson on open, then persists an explicit completion', async () => {
    const user = userEvent.setup();
    const firstRender = renderRoutes(['/guide/registers']);
    await waitFor(() => expect(storedProgress().completedLessons).toEqual([]));

    const markComplete = screen.getByRole('button', { name: 'Mark Complete' }) as HTMLButtonElement;
    expect(markComplete.disabled).toBe(false);
    await user.click(markComplete);
    await waitFor(() => expect(storedProgress().completedLessons).toContain('registers'));
    expect((screen.getByRole('button', { name: '✓ Completed' }) as HTMLButtonElement).disabled).toBe(true);

    firstRender.unmount();
    renderRoutes(['/guide/registers']);
    expect((screen.getByRole('button', { name: '✓ Completed' }) as HTMLButtonElement).disabled).toBe(true);
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
    expect(screen.getByText('0 / 18 lessons completed')).toBeTruthy();
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
