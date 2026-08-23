export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  code?: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
}

export type DiagramKind =
  | 'mental-model'
  | 'register-map'
  | 'arithmetic'
  | 'pointer'
  | 'load-store'
  | 'little-endian'
  | 'stack-growth'
  | 'stack-frame'
  | 'flags'
  | 'control-flow'
  | 'function-call'
  | 'nested-calls'
  | 'data-bytes'
  | 'syscall'
  | 'disassembly'
  | 'c-mapping'
  | 'debug-state'
  | 'indirect-call';

export interface LessonSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  code?: string;
  codeLabel?: string;
  callout?: string;
  diagram?: DiagramKind;
}

export interface Lesson {
  id: string;
  order: number;
  title: string;
  shortTitle: string;
  description: string;
  estimatedMinutes: number;
  prerequisites?: string[];
  sections: LessonSection[];
  quiz: QuizQuestion[];
  labProgram?: string;
}

export type ChallengeCategory =
  | 'Registers'
  | 'Arithmetic'
  | 'Memory'
  | 'Stack'
  | 'Branches'
  | 'Functions'
  | 'Mixed';

interface ChallengeBase {
  id: string;
  title: string;
  category: ChallengeCategory;
  description: string;
  explanation: string;
}

export interface ChoiceChallenge extends ChallengeBase {
  type: 'choice';
  code?: string;
  options: QuizOption[];
  correctOptionId: string;
}

export interface RegisterTarget {
  kind: 'register';
  register: string;
  value: bigint;
}

export interface CodeChallenge extends ChallengeBase {
  type: 'code';
  prompt: string;
  setupProgram: string;
  starterCode: string;
  solution: string;
  target: RegisterTarget;
  minLearnerInstructions?: number;
  maxLearnerInstructions: number;
  forbiddenOpcodes?: string[];
}

export type Challenge = ChoiceChallenge | CodeChallenge;
