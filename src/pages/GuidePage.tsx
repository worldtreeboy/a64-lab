import { Link, Navigate, useParams } from 'react-router-dom';
import { CheatSheet } from '../components/CheatSheet';
import { SiteHeader } from '../components/SiteHeader';
import { GuideSidebar } from '../components/learning/GuideSidebar';
import { LessonView } from '../components/learning/LessonView';
import { ProgressBar } from '../components/learning/ProgressBar';
import { getLesson, LESSONS } from '../learning/lessons';
import { percentComplete, useProgress } from '../learning/progress';
import type { AppTheme } from '../theme';

interface GuidePageProps {
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

export function GuidePage({ theme, onThemeChange }: GuidePageProps) {
  const { lessonId } = useParams();
  const lesson = lessonId ? getLesson(lessonId) : undefined;
  const { progress, resetProgress } = useProgress();
  const completed = new Set(progress.completedLessons.filter((id) => getLesson(id)));
  const percent = percentComplete(completed.size, LESSONS.length);
  const continueLesson = LESSONS.find((item) => !completed.has(item.id)) ?? LESSONS.at(-1)!;

  if (lessonId && !lesson) return <Navigate to="/guide" replace />;

  return (
    <div className="learning-page">
      <SiteHeader
        theme={theme}
        onThemeChange={onThemeChange}
        progressLabel={`ARM64 Foundations: ${percent}%`}
      />
      <div className="guide-layout">
        <GuideSidebar currentLessonId={lesson?.id} />
        <main className="guide-main">
          <details className="guide-mobile-reference">
            <summary>ARM64 Quick Reference</summary>
            <CheatSheet />
          </details>
          {lesson ? (
            <LessonView lesson={lesson} />
          ) : (
            <section className="guide-dashboard">
              <header className="guide-hero">
                <span className="eyebrow">INTERACTIVE CURRICULUM</span>
                <h2>Learn ARM64</h2>
                <p>Start with zero assembly knowledge. Build up by watching registers, memory, stack, and control flow change.</p>
              </header>

              <section className="learning-path" aria-labelledby="learning-path-title">
                <div className="learning-path-heading">
                  <span className="eyebrow">YOUR LEARNING LOOP</span>
                  <h3 id="learning-path-title">From first instruction to native-code patterns</h3>
                </div>
                <ol>
                  <li><span>01</span><strong>Learn</strong><small>One idea in plain language</small></li>
                  <li><span>02</span><strong>Predict</strong><small>Choose what changes next</small></li>
                  <li><span>03</span><strong>Watch</strong><small>Step the real simulator</small></li>
                  <li><span>04</span><strong>Practice</strong><small>Solve a focused challenge</small></li>
                </ol>
              </section>

              <div className="dashboard-progress panel">
                <ProgressBar
                  value={percent}
                  label="ARM64 Foundations"
                  detail={`${completed.size} / ${LESSONS.length} lessons completed`}
                />
                <Link className="continue-card" to={`/guide/${continueLesson.id}`}>
                  <span className="eyebrow">CONTINUE LEARNING</span>
                  <strong>→ {continueLesson.title}</strong>
                  <span>{continueLesson.estimatedMinutes} minute lesson</span>
                </Link>
              </div>

              <div className="dashboard-heading">
                <div><span className="eyebrow">CURRICULUM</span><h3>18 focused modules</h3></div>
                <button
                  className="reset-progress"
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset all lesson, quiz, and challenge progress?')) resetProgress();
                  }}
                >
                  Reset Progress
                </button>
              </div>
              <div className="module-grid">
                {LESSONS.map((item) => (
                  <Link className={`module-card ${completed.has(item.id) ? 'complete' : ''}`} to={`/guide/${item.id}`} key={item.id}>
                    <span>{completed.has(item.id) ? '✓' : item.order.toString().padStart(2, '0')}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                    <small>{item.estimatedMinutes} min</small>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
        <aside className="guide-reference">
          <CheatSheet />
        </aside>
      </div>
    </div>
  );
}
