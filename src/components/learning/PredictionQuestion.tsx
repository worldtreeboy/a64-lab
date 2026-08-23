import { useId, useState } from 'react';
import type { QuizQuestion } from '../../learning/types';
import { useProgress } from '../../learning/progress';
import { AssemblyCode, TryInLabButton } from './AssemblyExample';

interface PredictionQuestionProps {
  question: QuizQuestion;
  lessonId?: string;
  lessonTitle?: string;
  labProgram?: string;
  questionIndex?: number;
  questionCount?: number;
  onCorrect?: () => void;
}

export function PredictionQuestion({
  question,
  lessonId,
  lessonTitle,
  labProgram,
  questionIndex,
  questionCount,
  onCorrect,
}: PredictionQuestionProps) {
  const groupId = useId();
  const { recordQuizResult } = useProgress();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const correct = selected === question.correctOptionId;
  const showAnswer = submitted || revealed;

  const submit = () => {
    if (!selected) return;
    setSubmitted(true);
    if (lessonId) recordQuizResult(lessonId, question.id, correct);
    if (correct) onCorrect?.();
  };

  const retry = () => {
    setSelected(null);
    setSubmitted(false);
    setRevealed(false);
  };

  return (
    <section className="prediction-card" aria-labelledby={`${groupId}-title`}>
      <span className="eyebrow">
        {questionIndex !== undefined && questionCount !== undefined
          ? `QUESTION ${questionIndex + 1} OF ${questionCount}`
          : 'PREDICT THE RESULT'}
      </span>
      {question.code && <AssemblyCode code={question.code} label="Question assembly" />}
      <h3 id={`${groupId}-title`}>{question.prompt}</h3>
      <fieldset disabled={submitted || revealed}>
        <legend className="sr-only">Choose one answer</legend>
        {question.options.map((option) => {
          const isAnswer = option.id === question.correctOptionId;
          const stateClass = showAnswer && isAnswer
            ? 'answer-correct'
            : submitted && selected === option.id
              ? 'answer-incorrect'
              : '';
          return (
            <label className={`quiz-option ${stateClass}`} key={option.id}>
              <input
                type="radio"
                name={groupId}
                value={option.id}
                checked={selected === option.id}
                onChange={() => setSelected(option.id)}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </fieldset>
      <div className="quiz-actions">
        {!showAnswer && (
          <button className="button button-primary" type="button" onClick={submit} disabled={!selected}>
            Submit
          </button>
        )}
        {!showAnswer && (
          <button className="button button-ghost" type="button" onClick={() => setRevealed(true)}>
            Reveal answer
          </button>
        )}
        {showAnswer && !correct && (
          <button className="button button-secondary" type="button" onClick={retry}>Retry</button>
        )}
        {labProgram && lessonId && lessonTitle && (
          <TryInLabButton
            program={labProgram}
            lessonId={lessonId}
            lessonTitle={lessonTitle}
          />
        )}
      </div>
      {showAnswer && (
        <div className={`quiz-feedback ${submitted && correct ? 'correct' : revealed ? 'revealed' : 'incorrect'}`} role="status">
          <strong>{submitted ? correct ? 'Correct.' : 'Not quite.' : 'Answer revealed.'}</strong>
          <span>{question.explanation}</span>
        </div>
      )}
    </section>
  );
}
