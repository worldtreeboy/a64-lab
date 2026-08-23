const registerFacts = [
  ['X0–X7', 'arguments'],
  ['X0', 'return value'],
  ['X29', 'FP'],
  ['X30', 'LR'],
  ['SP', 'stack pointer'],
  ['PC', 'instruction address'],
];

const instructions = [
  ['MOV', 'move/copy value'],
  ['ADD', 'addition'],
  ['SUB', 'subtraction'],
  ['LDR', 'load from memory'],
  ['STR', 'store to memory'],
  ['LDP', 'load pair'],
  ['STP', 'store pair'],
  ['CMP', 'compare'],
  ['B', 'branch'],
  ['BL', 'call'],
  ['RET', 'return'],
  ['BR', 'indirect jump'],
  ['BLR', 'indirect call'],
  ['SVC', 'system call'],
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
