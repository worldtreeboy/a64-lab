const registerFacts = [
  ['X0–X7', 'function arguments'],
  ['X0', 'return value'],
  ['X29', 'Frame Pointer (FP)'],
  ['X30', 'Link Register (LR)'],
  ['SP', 'Stack Pointer'],
  ['PC', 'current instruction'],
];

const instructions = [
  ['MOV', 'move value'],
  ['LDR / STR', 'load / store memory'],
  ['ADD / SUB', 'arithmetic'],
  ['CMP / TST', 'set NZCV flags'],
  ['B', 'branch'],
  ['BL', 'branch + save return in X30'],
  ['RET', 'return using X30'],
  ['SVC', 'Linux system call'],
];

export function CheatSheet() {
  return (
    <section className="learning-section cheat-sheet" aria-label="ARM64 cheat sheet">
      <div className="learning-heading">
        <div><span className="eyebrow">QUICK REFERENCE</span><h2>ARM64 Cheat Sheet</h2></div>
      </div>
      <div className="cheat-content">
        <span className="eyebrow">CALLING CONVENTION</span>
        {registerFacts.map(([name, meaning]) => (
          <div className="cheat-row" key={name}><code>{name}</code><span>→ {meaning}</span></div>
        ))}
        <span className="eyebrow cheat-subheading">INSTRUCTIONS</span>
        {instructions.map(([name, meaning]) => (
          <div className="cheat-row" key={name}><code>{name}</code><span>→ {meaning}</span></div>
        ))}
        <div className="simplified-note">
          <strong>Educational model</strong>
          <p>Sparse zero-filled memory, no MMU or permissions, and only write/exit syscalls.</p>
        </div>
      </div>
    </section>
  );
}
