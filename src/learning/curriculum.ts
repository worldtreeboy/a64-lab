import { LESSONS } from './lessons';
import type { Lesson } from './types';

export interface CurriculumStage {
  id: string;
  title: string;
  description: string;
  firstLesson: number;
  lastLesson: number;
}

export const CURRICULUM_STAGES: readonly CurriculumStage[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    description: 'Instructions, registers, widths, and arithmetic',
    firstLesson: 1,
    lastLesson: 4,
  },
  {
    id: 'memory-stack',
    title: 'Memory & Stack',
    description: 'Pointers, loads, stores, byte order, and SP',
    firstLesson: 5,
    lastLesson: 11,
  },
  {
    id: 'decisions',
    title: 'Decisions',
    description: 'CMP, flags, labels, and branches',
    firstLesson: 12,
    lastLesson: 16,
  },
  {
    id: 'functions',
    title: 'Functions & Frames',
    description: 'BL, LR, RET, arguments, and stack frames',
    firstLesson: 17,
    lastLesson: 26,
  },
  {
    id: 'data-linux',
    title: 'Data & Linux',
    description: 'Sections, strings, addresses, and syscalls',
    firstLesson: 27,
    lastLesson: 31,
  },
  {
    id: 'native-reading',
    title: 'Reading Native Code',
    description: 'Disassembly, debugging, and indirect control flow',
    firstLesson: 32,
    lastLesson: 36,
  },
];

export function lessonsForStage(stage: CurriculumStage): Lesson[] {
  return LESSONS.filter(
    (lesson) => lesson.order >= stage.firstLesson && lesson.order <= stage.lastLesson,
  );
}
