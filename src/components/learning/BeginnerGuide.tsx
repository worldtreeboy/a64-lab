import { useId } from 'react';
import type { BeginnerGuide as BeginnerGuideData } from '../../learning/beginnerGuides';
import { formatLearnerText } from '../../learning/learnerText';
import '../../beginner-guide.css';

export type BeginnerGuideContent = Pick<
  BeginnerGuideData,
  'title' | 'purpose' | 'terms' | 'steps' | 'remember'
>;

interface BeginnerGuideProps {
  guide: BeginnerGuideContent;
}

/**
 * A short, repeatable introduction for lessons that use unfamiliar concepts.
 * It deliberately teaches the reason and vocabulary before the ordered steps.
 */
export function BeginnerGuide({ guide }: BeginnerGuideProps) {
  const instanceId = useId();
  const titleId = `${instanceId}-title`;
  const purposeId = `${instanceId}-purpose`;
  const termsId = `${instanceId}-terms`;
  const stepsId = `${instanceId}-steps`;
  const rememberId = `${instanceId}-remember`;

  return (
    <section className="beginner-guide" aria-labelledby={titleId}>
      <header className="beginner-guide__header">
        <span className="beginner-guide__eyebrow">START HERE</span>
        <h3 id={titleId}>{formatLearnerText(guide.title)}</h3>
      </header>

      <div className="beginner-guide__content">
        <section className="beginner-guide__block beginner-guide__purpose" aria-labelledby={purposeId}>
          <div className="beginner-guide__section-heading">
            <span className="beginner-guide__marker" aria-hidden="true">?</span>
            <h4 id={purposeId}>Why this matters</h4>
          </div>
          <p>{formatLearnerText(guide.purpose)}</p>
        </section>

        <section className="beginner-guide__block beginner-guide__terms" aria-labelledby={termsId}>
          <div className="beginner-guide__section-heading">
            <span className="beginner-guide__marker" aria-hidden="true">Aa</span>
            <h4 id={termsId}>Words to know</h4>
          </div>
          <dl>
            {guide.terms.map(({ term, meaning }, index) => (
              <div className="beginner-guide__term" key={`${term}-${index}`}>
                <dt>{formatLearnerText(term)}</dt>
                <dd>{formatLearnerText(meaning)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="beginner-guide__block beginner-guide__steps" aria-labelledby={stepsId}>
          <div className="beginner-guide__section-heading">
            <span className="beginner-guide__marker" aria-hidden="true">1→</span>
            <h4 id={stepsId}>The idea, in order</h4>
          </div>
          <ol>
            {guide.steps.map((step, index) => (
              <li key={`${step.title}-${index}`}>
                <div className="beginner-guide__step-copy">
                  <strong>{formatLearnerText(step.title)}</strong>
                  <span>{formatLearnerText(step.explanation)}</span>
                  {step.example && <code>{step.example}</code>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <aside className="beginner-guide__remember" aria-labelledby={rememberId}>
          <span className="beginner-guide__remember-icon" aria-hidden="true">✓</span>
          <div>
            <h4 id={rememberId}>Remember</h4>
            <p>{formatLearnerText(guide.remember)}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
