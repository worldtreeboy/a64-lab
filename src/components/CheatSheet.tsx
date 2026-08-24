const registerRoles = [
  ['X29 / FP', 'Frame Pointer when a function uses one'],
  ['X30 / LR', 'Link Register · return address'],
  ['SP', 'Stack Pointer · current stack boundary address'],
  ['PC', 'Program Counter · address to execute'],
];

const callingConvention = [
  ['X0–X7', 'commonly carry integer/pointer arguments'],
  ['X0', 'commonly carries an integer/pointer return value'],
];

const coreRules = [
  ['Xn / Wn', 'X is 64-bit; W is its low 32-bit view'],
  ['Write Wn', 'also clears the upper 32 bits of Xn'],
  ['Stack', 'SUB SP reserves; ADD SP releases; bytes remain'],
  ['Endian', 'lowest address stores the rightmost value byte'],
];

const instructions = [
  ['MOV', 'copy a value'],
  ['ADD', 'add values'],
  ['SUB', 'subtract values'],
  ['LDR', 'memory → register'],
  ['STR', 'register → memory'],
  ['LDRB', 'one memory byte → W register'],
  ['STRB', 'low register byte → memory'],
  ['LDP', 'memory → two registers'],
  ['STP', 'two registers → memory'],
  ['CMP', 'set NZCV from subtraction; keep operands'],
  ['TST', 'set flags from bitwise AND; keep operands'],
  ['B', 'jump to a label'],
  ['B.cond', 'branch on EQ/NE/GT/LT/GE/LE'],
  ['BL', 'call and save return address in LR'],
  ['RET', 'continue at the address in LR'],
  ['BR', 'jump to an address in a register'],
  ['BLR', 'call an address in a register and save LR'],
  ['SVC', 'request a Linux service'],
];

export function CheatSheet() {
  return (
    <section className="learning-section cheat-sheet" aria-label="ARM64 cheat sheet">
      <div className="learning-heading">
        <div><span className="eyebrow">QUICK REFERENCE</span><h2>ARM64 Cheat Sheet</h2></div>
      </div>
      <div className="cheat-content">
        <span className="eyebrow">REGISTER ROLES</span>
        {registerRoles.map(([name, meaning]) => (
          <div className="cheat-row" key={name}><code>{name}</code><span>→ {meaning}</span></div>
        ))}
        <span className="eyebrow cheat-subheading">CALLING CONVENTION</span>
        {callingConvention.map(([name, meaning]) => (
          <div className="cheat-row" key={name}><code>{name}</code><span>→ {meaning}</span></div>
        ))}
        <span className="eyebrow cheat-subheading">CORE RULES</span>
        {coreRules.map(([name, meaning]) => (
          <div className="cheat-row" key={name}><code>{name}</code><span>→ {meaning}</span></div>
        ))}
        <span className="eyebrow cheat-subheading">INSTRUCTIONS</span>
        {instructions.map(([name, meaning]) => (
          <div className="cheat-row" key={name}><code>{name}</code><span>→ {meaning}</span></div>
        ))}
        <div className="simplified-note">
          <strong>Educational model</strong>
          <p>Unwritten simulated bytes read as zero. There is no virtual-memory mapping or access control, and only write/exit syscalls are modeled.</p>
        </div>
      </div>
    </section>
  );
}
