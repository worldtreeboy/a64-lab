import type { RegisterName } from '../arm64/registers';

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
  | 'general-registers'
  | 'register-map'
  | 'arithmetic'
  | 'address-number'
  | 'pointer'
  | 'memory-store'
  | 'memory-load'
  | 'load-store'
  | 'little-endian'
  | 'stack-growth'
  | 'stack-value'
  | 'register-pair'
  | 'stack-frame'
  | 'frame-pointer'
  | 'zero-flag'
  | 'cmp-zero'
  | 'flags'
  | 'signed-flags'
  | 'control-flow'
  | 'ordered-branch'
  | 'unconditional-branch'
  | 'function-call'
  | 'bl-only'
  | 'return-flow'
  | 'function-arguments'
  | 'function-result'
  | 'lr-overwrite'
  | 'save-lr-cycle'
  | 'pair-transfer'
  | 'stack-frame-flow'
  | 'nested-calls'
  | 'nested-return-addresses'
  | 'indexed-addressing'
  | 'data-bytes'
  | 'code-sections'
  | 'code-data-sections'
  | 'string-bytes'
  | 'label-address'
  | 'syscall'
  | 'syscall-gate'
  | 'syscall-boundary'
  | 'write-bytes'
  | 'disassembly'
  | 'disassembly-anatomy'
  | 'c-mapping'
  | 'debug-state'
  | 'debug-snapshot'
  | 'indirect-call'
  | 'indirect-control'
  | 'native-workflow';

export type LessonVisualFocus =
  | 'registers'
  | 'pointers'
  | 'memory'
  | 'stack'
  | 'flags'
  | 'calls'
  | 'terminal';

export type LessonFlagFocus = 'N' | 'Z' | 'C' | 'V';

export type StackVisualizationMode = 'simple' | 'detailed';

export type LessonKind = 'concept' | 'integration';

export interface StateWalkthroughContent {
  before: readonly string[];
  execute: string;
  after: readonly string[];
}

export interface OptionalLessonDetails {
  summary: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LessonSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  code?: string;
  codeLabel?: string;
  callout?: string;
  details?: OptionalLessonDetails;
  diagram?: DiagramKind;
  walkthrough?: StateWalkthroughContent;
}

export interface Lesson {
  id: string;
  order: number;
  title: string;
  shortTitle: string;
  description: string;
  estimatedMinutes: number;
  kind: LessonKind;
  coreIdea: string;
  newConcepts: readonly string[];
  buildsOn: readonly string[];
  prerequisites?: readonly string[];
  sections: LessonSection[];
  quiz: QuizQuestion[];
  labProgram?: string;
  nextStep: string;
  visualFocus: readonly LessonVisualFocus[];
  stackVisualization?: StackVisualizationMode;
  registerFocus: readonly RegisterName[];
  flagFocus?: readonly LessonFlagFocus[];
  visualPrompt: string;
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
