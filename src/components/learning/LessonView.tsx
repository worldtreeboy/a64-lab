import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getAdjacentLessons } from '../../learning/lessons';
import { useProgress } from '../../learning/progress';
import type { Lesson } from '../../learning/types';
import { AssemblyExample, TryInLabButton } from './AssemblyExample';
import { ConceptDiagram } from './ConceptDiagram';
import { LiveLessonDemo } from './LiveLessonDemo';
import { PredictionQuestion } from './PredictionQuestion';

export function LessonView({ lesson }: { lesson: Lesson }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { progress, markLessonComplete } = useProgress();
  const complete = progress.completedLessons.includes(lesson.id);
  const { previous, next } = getAdjacentLessons(lesson.id);

  useEffect(() => {
    titleRef.current?.focus();
  }, [lesson.id]);

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
              labProgram={lesson.labProgram}
              lessonId={lesson.id}
              lessonTitle={lesson.title}
            />
          )}
          {section.callout && <div className="lesson-callout">{section.callout}</div>}
        </section>
      ))}

      {lesson.labProgram && (
        <LiveLessonDemo
          key={lesson.id}
          program={lesson.labProgram}
          title={lesson.title}
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
            className="button button-primary"
            type="button"
            disabled={complete}
            onClick={() => markLessonComplete(lesson.id)}
          >
            {complete ? '✓ Completed' : 'Mark Complete'}
          </button>
        </div>
      </section>

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
