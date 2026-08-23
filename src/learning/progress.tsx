import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export const PROGRESS_STORAGE_KEY = 'a64-lab-learning-progress-v1';

export interface QuizResult {
  correct: boolean;
  attempts: number;
}

export interface LearningProgress {
  completedLessons: string[];
  quizResults: Record<string, QuizResult>;
  completedChallenges: string[];
}

export const EMPTY_PROGRESS: LearningProgress = {
  completedLessons: [],
  quizResults: {},
  completedChallenges: [],
};

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string'))];
}

export function normalizeProgress(value: unknown): LearningProgress {
  if (!value || typeof value !== 'object') return { ...EMPTY_PROGRESS };
  const candidate = value as Partial<LearningProgress>;
  const quizResults: Record<string, QuizResult> = {};
  if (candidate.quizResults && typeof candidate.quizResults === 'object') {
    for (const [key, result] of Object.entries(candidate.quizResults)) {
      if (!result || typeof result !== 'object') continue;
      const entry = result as Partial<QuizResult>;
      if (typeof entry.correct !== 'boolean' || typeof entry.attempts !== 'number') continue;
      quizResults[key] = {
        correct: entry.correct,
        attempts: Math.max(0, Math.floor(entry.attempts)),
      };
    }
  }
  return {
    completedLessons: uniqueStrings(candidate.completedLessons),
    quizResults,
    completedChallenges: uniqueStrings(candidate.completedChallenges),
  };
}

export function loadProgress(storage: Pick<Storage, 'getItem'> = localStorage): LearningProgress {
  try {
    const raw = storage.getItem(PROGRESS_STORAGE_KEY);
    return raw ? normalizeProgress(JSON.parse(raw)) : { ...EMPTY_PROGRESS };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

interface ProgressContextValue {
  progress: LearningProgress;
  markLessonComplete: (lessonId: string) => void;
  unmarkLessonComplete: (lessonId: string) => void;
  recordQuizResult: (lessonId: string, questionId: string, correct: boolean) => void;
  markChallengeComplete: (challengeId: string) => void;
  resetProgress: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<LearningProgress>(() => loadProgress());

  useEffect(() => {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const value = useMemo<ProgressContextValue>(() => ({
    progress,
    markLessonComplete: (lessonId) => {
      setProgress((current) => current.completedLessons.includes(lessonId)
        ? current
        : { ...current, completedLessons: [...current.completedLessons, lessonId] });
    },
    unmarkLessonComplete: (lessonId) => {
      setProgress((current) => current.completedLessons.includes(lessonId)
        ? {
            ...current,
            completedLessons: current.completedLessons.filter((id) => id !== lessonId),
          }
        : current);
    },
    recordQuizResult: (lessonId, questionId, correct) => {
      const key = `${lessonId}:${questionId}`;
      setProgress((current) => {
        const previous = current.quizResults[key];
        return {
          ...current,
          quizResults: {
            ...current.quizResults,
            [key]: {
              correct: previous?.correct === true || correct,
              attempts: (previous?.attempts ?? 0) + 1,
            },
          },
        };
      });
    },
    markChallengeComplete: (challengeId) => {
      setProgress((current) => current.completedChallenges.includes(challengeId)
        ? current
        : { ...current, completedChallenges: [...current.completedChallenges, challengeId] });
    },
    resetProgress: () => setProgress({ ...EMPTY_PROGRESS, quizResults: {} }),
  }), [progress]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress must be used inside ProgressProvider');
  return context;
}

export function percentComplete(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(Math.max(completed, 0), total) / total) * 100);
}
