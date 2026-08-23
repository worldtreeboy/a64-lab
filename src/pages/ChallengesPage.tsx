import { useState } from 'react';
import { SiteHeader } from '../components/SiteHeader';
import { ChallengeCard } from '../components/learning/ChallengeCard';
import { ProgressBar } from '../components/learning/ProgressBar';
import { CHALLENGE_CATEGORIES, CHALLENGES } from '../learning/challenges';
import { percentComplete, useProgress } from '../learning/progress';
import type { ChallengeCategory } from '../learning/types';
import type { AppTheme } from '../theme';

interface ChallengesPageProps {
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

export function ChallengesPage({ theme, onThemeChange }: ChallengesPageProps) {
  const [category, setCategory] = useState<ChallengeCategory | 'All'>('All');
  const { progress } = useProgress();
  const challengeIds = new Set(CHALLENGES.map((challenge) => challenge.id));
  const completed = new Set(progress.completedChallenges.filter((id) => challengeIds.has(id)));
  const visible = category === 'All'
    ? CHALLENGES
    : CHALLENGES.filter((challenge) => challenge.category === category);
  const percent = percentComplete(completed.size, CHALLENGES.length);

  return (
    <div className="learning-page">
      <SiteHeader theme={theme} onThemeChange={onThemeChange} progressLabel={`Challenges: ${percent}%`} />
      <main className="challenges-page">
        <header className="challenges-hero">
          <div>
            <span className="eyebrow">PRACTICE WITH REAL CPU STATE</span>
            <h2>ARM64 Challenges</h2>
            <p>Predict outcomes and write small instruction sequences. Code answers run through the same ARM64 engine as the Lab.</p>
          </div>
          <ProgressBar
            value={percent}
            label="Challenge progress"
            detail={`${completed.size} / ${CHALLENGES.length} complete`}
          />
        </header>
        <div className="challenge-filters" role="group" aria-label="Challenge category">
          {(['All', ...CHALLENGE_CATEGORIES] as const).map((item) => (
            <button
              className={category === item ? 'active' : ''}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <section className="challenge-grid" aria-label={`${category} challenges`}>
          {visible.map((challenge) => <ChallengeCard challenge={challenge} key={challenge.id} />)}
        </section>
      </main>
    </div>
  );
}
