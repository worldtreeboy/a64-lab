import type { StateWalkthroughContent } from '../../learning/types';
import { formatLearnerText } from '../../learning/learnerText';

interface StateWalkthroughProps {
  walkthrough: StateWalkthroughContent;
}

function StateList({ values }: { values: readonly string[] }) {
  return (
    <ul>
      {values.map((value, index) => (
        <li key={`${index}-${value}`}>{formatLearnerText(value)}</li>
      ))}
    </ul>
  );
}

/** A static prediction aid. Live values remain owned by the real CPU visualizer. */
export function StateWalkthrough({ walkthrough }: StateWalkthroughProps) {
  return (
    <figure className="state-walkthrough" aria-label="Before, execute, and after state walkthrough">
      <div className="state-walkthrough-phase state-walkthrough-before">
        <span>Before</span>
        <StateList values={walkthrough.before} />
      </div>
      <span className="state-walkthrough-arrow" aria-hidden="true">→</span>
      <div className="state-walkthrough-phase state-walkthrough-execute">
        <span>Execute</span>
        <code>{walkthrough.execute}</code>
      </div>
      <span className="state-walkthrough-arrow" aria-hidden="true">→</span>
      <div className="state-walkthrough-phase state-walkthrough-after">
        <span>After</span>
        <StateList values={walkthrough.after} />
      </div>
    </figure>
  );
}
