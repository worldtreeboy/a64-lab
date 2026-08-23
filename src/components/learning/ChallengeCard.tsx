import { useState } from 'react';
import { ARM64CPU, parseProgram } from '../../arm64/interpreter';
import { isRegisterName, readRegister } from '../../arm64/registers';
import { useProgress } from '../../learning/progress';
import type { Challenge, CodeChallenge, QuizQuestion } from '../../learning/types';
import { AssemblyCode } from './AssemblyExample';
import { PredictionQuestion } from './PredictionQuestion';

function ChoiceChallengeCard({ challenge }: { challenge: Extract<Challenge, { type: 'choice' }> }) {
  const { progress, markChallengeComplete } = useProgress();
  const complete = progress.completedChallenges.includes(challenge.id);
  const question: QuizQuestion = {
    id: challenge.id,
    prompt: challenge.description,
    code: challenge.code,
    options: challenge.options,
    correctOptionId: challenge.correctOptionId,
    explanation: challenge.explanation,
  };
  return (
    <article className={`challenge-card ${complete ? 'complete' : ''}`}>
      <header className="challenge-card-heading">
        <div><span className="eyebrow">{challenge.category}</span><h3>{challenge.title}</h3></div>
        {complete && <span className="challenge-complete">✓ COMPLETE</span>}
      </header>
      <PredictionQuestion question={question} onCorrect={() => markChallengeComplete(challenge.id)} />
    </article>
  );
}

function validateCodeChallenge(challenge: CodeChallenge, learnerSource: string): string {
  const learnerProgram = parseProgram(learnerSource);
  const count = learnerProgram.instructions.length;
  const minimum = challenge.minLearnerInstructions ?? 1;
  if (count < minimum || count > challenge.maxLearnerInstructions) {
    throw new Error(`Use ${minimum === challenge.maxLearnerInstructions ? minimum : `${minimum}–${challenge.maxLearnerInstructions}`} learner instruction${challenge.maxLearnerInstructions === 1 ? '' : 's'}.`);
  }
  const forbidden = new Set(challenge.forbiddenOpcodes?.map((opcode) => opcode.toLowerCase()) ?? []);
  const usedForbidden = learnerProgram.instructions.find((instruction) => forbidden.has(instruction.opcode));
  if (usedForbidden) throw new Error(`${usedForbidden.opcode.toUpperCase()} is not allowed for this challenge.`);

  const cpu = new ARM64CPU();
  cpu.loadProgram(`${challenge.setupProgram}\n${learnerSource}`);
  let steps = 0;
  while (!cpu.halted && steps < 200) {
    cpu.step();
    steps += 1;
  }
  if (!cpu.halted) throw new Error('Execution did not finish within 200 steps.');
  if (!isRegisterName(challenge.target.register)) {
    throw new Error(`Challenge has an invalid target register: ${challenge.target.register}`);
  }
  const actual = readRegister(cpu.registers, challenge.target.register);
  if (actual !== challenge.target.value) {
    return `${challenge.target.register.toUpperCase()} is ${actual}; target is ${challenge.target.value}.`;
  }
  return '';
}

function CodeChallengeCard({ challenge }: { challenge: CodeChallenge }) {
  const { progress, markChallengeComplete } = useProgress();
  const complete = progress.completedChallenges.includes(challenge.id);
  const [source, setSource] = useState(challenge.starterCode);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [revealed, setRevealed] = useState(false);

  const verify = () => {
    try {
      const mismatch = validateCodeChallenge(challenge, source);
      if (mismatch) {
        setFeedback({ success: false, message: mismatch });
        return;
      }
      markChallengeComplete(challenge.id);
      setFeedback({ success: true, message: `Challenge complete. ${challenge.explanation}` });
    } catch (error) {
      setFeedback({ success: false, message: (error as Error).message });
    }
  };

  return (
    <article className={`challenge-card code-challenge ${complete ? 'complete' : ''}`}>
      <header className="challenge-card-heading">
        <div><span className="eyebrow">{challenge.category} · WRITE CODE</span><h3>{challenge.title}</h3></div>
        {complete && <span className="challenge-complete">✓ COMPLETE</span>}
      </header>
      <p>{challenge.prompt}</p>
      <div className="challenge-starting-state">
        <span className="eyebrow">STARTING PROGRAM</span>
        <AssemblyCode code={challenge.setupProgram} label="Challenge setup assembly" />
      </div>
      <label className="challenge-editor">
        <span>Your instructions</span>
        <textarea
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            setFeedback(null);
            setRevealed(false);
          }}
          placeholder="Enter ARM64 assembly"
          spellCheck={false}
        />
      </label>
      <div className="quiz-actions">
        <button className="button button-primary" type="button" onClick={verify}>Verify</button>
        <button className="button button-ghost" type="button" onClick={() => setRevealed(true)}>Reveal solution</button>
        <button className="button button-ghost" type="button" onClick={() => {
          setSource(challenge.starterCode);
          setFeedback(null);
          setRevealed(false);
        }}>Retry</button>
      </div>
      {feedback && (
        <div className={`quiz-feedback ${feedback.success ? 'correct' : 'incorrect'}`} role="status">
          <strong>{feedback.success ? 'Correct.' : 'Keep going.'}</strong>
          <span>{feedback.message}</span>
        </div>
      )}
      {revealed && (
        <div className="challenge-solution">
          <span className="eyebrow">ONE SOLUTION</span>
          <AssemblyCode code={challenge.solution} label="Challenge solution assembly" />
          <p>{challenge.explanation}</p>
        </div>
      )}
    </article>
  );
}

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  return challenge.type === 'choice'
    ? <ChoiceChallengeCard challenge={challenge} />
    : <CodeChallengeCard challenge={challenge} />;
}
