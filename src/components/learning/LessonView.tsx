import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdjacentLessons } from '../../learning/lessons';
import { useProgress } from '../../learning/progress';
import type { Lesson } from '../../learning/types';
import { AssemblyExample, TryInLabButton } from './AssemblyExample';
import { ConceptDiagram } from './ConceptDiagram';
import { LiveLessonDemo } from './LiveLessonDemo';
import { PredictionQuestion } from './PredictionQuestion';
import { StateWalkthrough } from './StateWalkthrough';

const CONCEPT_ACRONYMS = new Set([
  'abi', 'arm64', 'bl', 'blr', 'br', 'cmp', 'cpu', 'fp', 'ldp', 'ldr', 'lr', 'nzcv', 'pc',
  'ret', 'sp', 'stp', 'str', 'svc', 'w', 'x',
]);

function conceptLabel(value: string): string {
  return value
    .split('-')
    .map((word) => CONCEPT_ACRONYMS.has(word) ? word.toUpperCase() : word)
    .join(' ');
}

export function LessonView({ lesson }: { lesson: Lesson }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [celebrationId, setCelebrationId] = useState(0);
  const { progress, markLessonComplete, unmarkLessonComplete } = useProgress();
  const complete = progress.completedLessons.includes(lesson.id);
  const { previous, next } = getAdjacentLessons(lesson.id);

  useEffect(() => {
    titleRef.current?.focus();
    setCelebrationId(0);
  }, [lesson.id]);

  useEffect(() => {
    if (celebrationId === 0) return undefined;
    const timeout = window.setTimeout(() => setCelebrationId(0), 2200);
    return () => window.clearTimeout(timeout);
  }, [celebrationId]);

  return (
    <article className="lesson-view">
      <header className="lesson-header">
        <div>
          <span className="eyebrow">LESSON {lesson.order.toString().padStart(2, '0')}</span>
          <h2 ref={titleRef} tabIndex={-1}>{lesson.title}</h2>
          <p>{lesson.description}</p>
        </div>
        <span className="lesson-duration">{lesson.estimatedMinutes} min</span>
      </header>

      <section className={`lesson-mental-model lesson-mental-model-${lesson.kind}`} aria-labelledby={`core-idea-${lesson.id}`}>
        <span className="eyebrow">
          {lesson.kind === 'integration' ? 'PUTTING FAMILIAR IDEAS TOGETHER' : 'ONE NEW MENTAL MODEL'}
        </span>
        <h3 id={`core-idea-${lesson.id}`}>{lesson.coreIdea}</h3>
        <div className="lesson-concept-context">
          {lesson.buildsOn.length > 0 && (
            <p><strong>You already know</strong><span>{lesson.buildsOn.map(conceptLabel).join(' · ')}</span></p>
          )}
          {lesson.newConcepts.length > 0 && (
            <p>
              <strong>{lesson.kind === 'integration' ? 'You will connect' : 'New today'}</strong>
              <span>{lesson.newConcepts.map(conceptLabel).join(' · ')}</span>
            </p>
          )}
        </div>
      </section>

      {lesson.sections.map((section) => (
        <section className="lesson-section" id={section.id} key={section.id}>
          <h3>{section.title}</h3>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.bullets && (
            <ul>
              {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          )}
          {section.diagram && <ConceptDiagram kind={section.diagram} />}
          {section.code && (
            <AssemblyExample
              code={section.code}
              title={section.codeLabel}
              labProgram={section.code === lesson.labProgram ? section.code : undefined}
              lessonId={lesson.id}
              lessonTitle={lesson.title}
            />
          )}
          {section.walkthrough && <StateWalkthrough walkthrough={section.walkthrough} />}
          {section.callout && <div className="lesson-callout">{section.callout}</div>}
        </section>
      ))}

      {lesson.labProgram && (
        <LiveLessonDemo
          key={lesson.id}
          program={lesson.labProgram}
          title={lesson.title}
          focus={lesson.visualFocus}
          flagFocus={lesson.flagFocus}
          registerFocus={lesson.registerFocus}
          visualPrompt={lesson.visualPrompt}
        />
      )}

      <section className="lesson-quiz" aria-labelledby={`quiz-${lesson.id}`}>
        <div className="lesson-section-heading">
          <span className="eyebrow">CHECK YOUR UNDERSTANDING</span>
          <h3 id={`quiz-${lesson.id}`}>Predict before revealing</h3>
        </div>
        {lesson.quiz.map((question) => (
          <PredictionQuestion
            question={question}
            lessonId={lesson.id}
            lessonTitle={lesson.title}
            labProgram={lesson.labProgram}
            key={question.id}
          />
        ))}
      </section>

      <section className="lesson-finish">
        <div>
          <h3>{complete ? 'Lesson complete' : 'Ready to continue?'}</h3>
          <p>{complete ? 'Your progress is saved on this device.' : 'Mark this lesson complete when you are comfortable with the core idea.'}</p>
        </div>
        <div className="lesson-finish-actions">
          {lesson.labProgram && (
            <TryInLabButton
              program={lesson.labProgram}
              lessonId={lesson.id}
              lessonTitle={lesson.title}
            />
          )}
          <button
            className={`button ${complete ? 'button-secondary completion-toggle-complete' : 'button-primary'}`}
            type="button"
            aria-pressed={complete}
            onClick={() => {
              if (complete) {
                unmarkLessonComplete(lesson.id);
                return;
              }
              markLessonComplete(lesson.id);
              setCelebrationId((current) => current + 1);
            }}
          >
            {complete ? 'Unmark Complete' : 'Mark Complete'}
          </button>
        </div>
      </section>

      {celebrationId > 0 && (
        <div className="lesson-celebration" role="status" aria-live="polite" key={celebrationId}>
          <div className="celebration-particles" aria-hidden="true">
            {Array.from({ length: 14 }, (_, index) => <span key={index} />)}
          </div>
          <div className="celebration-card">
            <span className="celebration-check" aria-hidden="true">✓</span>
            <div>
              <strong>Lesson complete!</strong>
              <span>Nice work. That concept is now part of your ARM64 toolkit.</span>
            </div>
          </div>
        </div>
      )}

      <aside className="lesson-transition" aria-label="What comes next">
        <span className="eyebrow">CONNECT THE IDEAS</span>
        <p>{lesson.nextStep}</p>
      </aside>

      <nav className="lesson-navigation" aria-label="Lesson navigation">
        {previous
          ? <Link to={`/guide/${previous.id}`}>← Previous Lesson<span>{previous.shortTitle}</span></Link>
          : <span />}
        {next
          ? <Link to={`/guide/${next.id}`}>Next Lesson →<span>{next.shortTitle}</span></Link>
          : <Link to="/challenges">Practice Challenges →<span>Apply what you learned</span></Link>}
      </nav>
    </article>
  );
}
