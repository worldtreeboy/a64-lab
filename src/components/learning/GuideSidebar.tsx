import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CURRICULUM_STAGES, lessonsForStage } from '../../learning/curriculum';
import { LESSONS } from '../../learning/lessons';
import { percentComplete, useProgress } from '../../learning/progress';
import { ProgressBar } from './ProgressBar';

export function GuideSidebar({ currentLessonId }: { currentLessonId?: string }) {
  const [open, setOpen] = useState(false);
  const { progress } = useProgress();
  const lessonIds = new Set(LESSONS.map((lesson) => lesson.id));
  const completed = new Set(progress.completedLessons.filter((id) => lessonIds.has(id)));
  const percent = percentComplete(completed.size, LESSONS.length);

  useEffect(() => setOpen(false), [currentLessonId]);

  return (
    <aside className={`guide-sidebar ${open ? 'curriculum-open' : ''}`}>
      <button
        className="curriculum-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="guide-curriculum"
        onClick={() => setOpen((value) => !value)}
      >
        <span>ARM64 Guide</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <div id="guide-curriculum" className="curriculum-content">
        <div className="curriculum-heading">
          <span className="eyebrow">CURRICULUM</span>
          <h2>ARM64 Guide</h2>
        </div>
        <ProgressBar
          value={percent}
          label="ARM64 Foundations"
          detail={`${completed.size} / ${LESSONS.length} lessons`}
        />
        <nav className="lesson-list" aria-label="ARM64 lessons">
          {CURRICULUM_STAGES.map((stage) => (
            <section className="lesson-stage" aria-labelledby={`stage-${stage.id}`} key={stage.id}>
              <header>
                <span id={`stage-${stage.id}`}>{stage.title}</span>
                <small>{stage.firstLesson}–{stage.lastLesson}</small>
              </header>
              {lessonsForStage(stage).map((lesson) => {
                const isComplete = completed.has(lesson.id);
                return (
                  <NavLink
                    to={`/guide/${lesson.id}`}
                    key={lesson.id}
                    className={({ isActive }) => isActive ? 'active' : ''}
                  >
                    <span className={`lesson-status ${isComplete ? 'complete' : ''}`} aria-hidden="true">
                      {isComplete ? '✓' : currentLessonId === lesson.id ? '→' : lesson.order}
                    </span>
                    <span>{lesson.shortTitle}</span>
                  </NavLink>
                );
              })}
            </section>
          ))}
        </nav>
      </div>
    </aside>
  );
}
