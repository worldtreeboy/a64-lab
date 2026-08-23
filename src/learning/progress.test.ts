import { describe, expect, it } from 'vitest';
import {
  EMPTY_PROGRESS,
  loadProgress,
  normalizeProgress,
  percentComplete,
  PROGRESS_STORAGE_KEY,
} from './progress';

describe('learning progress data', () => {
  it('normalizes persisted progress and removes duplicate ids', () => {
    expect(normalizeProgress({
      completedLessons: ['registers', 'registers', 12],
      quizResults: {
        'registers:copy': { correct: true, attempts: 2.8 },
        broken: { correct: 'yes', attempts: 1 },
      },
      completedChallenges: ['make-x2-thirty', 'make-x2-thirty', null],
    })).toEqual({
      completedLessons: ['registers'],
      quizResults: {
        'registers:copy': { correct: true, attempts: 2 },
      },
      completedChallenges: ['make-x2-thirty'],
    });
  });

  it('loads valid JSON from the stable storage key', () => {
    const calls: string[] = [];
    const progress = loadProgress({
      getItem(key) {
        calls.push(key);
        return JSON.stringify({
          completedLessons: ['stack'],
          quizResults: {},
          completedChallenges: ['register-copy'],
        });
      },
    });
    expect(calls).toEqual([PROGRESS_STORAGE_KEY]);
    expect(progress.completedLessons).toEqual(['stack']);
    expect(progress.completedChallenges).toEqual(['register-copy']);
  });

  it('recovers from missing, malformed, or inaccessible storage', () => {
    expect(loadProgress({ getItem: () => null })).toEqual(EMPTY_PROGRESS);
    expect(loadProgress({ getItem: () => '{broken' })).toEqual(EMPTY_PROGRESS);
    expect(loadProgress({ getItem: () => { throw new Error('blocked'); } })).toEqual(EMPTY_PROGRESS);
  });

  it('calculates predictable rounded percentages', () => {
    expect(percentComplete(0, 0)).toBe(0);
    expect(percentComplete(0, 18)).toBe(0);
    expect(percentComplete(12, 18)).toBe(67);
    expect(percentComplete(18, 18)).toBe(100);
  });
});
