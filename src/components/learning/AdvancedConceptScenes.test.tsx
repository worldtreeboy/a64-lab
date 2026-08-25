// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AdvancedConceptScene, type AdvancedConceptKind } from './AdvancedConceptScenes';

afterEach(cleanup);

const KINDS: readonly AdvancedConceptKind[] = [
  'code-data-sections',
  'string-bytes',
  'label-address',
  'syscall-boundary',
  'write-bytes',
  'disassembly-anatomy',
  'c-mapping',
  'debug-snapshot',
  'indirect-control',
  'native-workflow',
];

describe('advanced learning concept scenes', () => {
  it.each(KINDS)('renders the %s scene as a labelled figure', (kind) => {
    const { container } = render(<AdvancedConceptScene kind={kind} />);
    const figure = container.querySelector('figure');

    expect(figure).toBeTruthy();
    expect(figure?.classList.contains(`acs-${kind}`)).toBe(true);
    expect(figure?.getAttribute('aria-label')).toMatch(/visual diagram$/);
    expect(figure?.querySelector('figcaption')?.textContent?.length).toBeGreaterThan(30);
  });

  it('shows code and data as separate regions with PC inside text', () => {
    const { container } = render(<AdvancedConceptScene kind="code-data-sections" />);

    expect(container.querySelectorAll('.acs-memory-region')).toHaveLength(2);
    expect(container.textContent).toContain('.datastored bytes');
    expect(container.textContent).toContain('.textinstructions');
    expect(container.textContent).toContain('0x00400000—empty in this example');
    expect(container.textContent).toContain('PC →0x00000000mov x0, 1');
    expect(container.textContent).not.toContain('add x0, x0, #1');
  });

  it('shows the exact .ascii and .asciz byte rows', () => {
    const { container } = render(<AdvancedConceptScene kind="string-bytes" />);
    const rows = container.querySelectorAll('.acs-string-row');

    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain('.ascii "ARM64"');
    expect(rows[0]?.textContent).toContain('+041A+152R+24DM+3366+4344');
    expect(rows[1]?.textContent).toContain('.asciz "hello\\n"');
    const messageCells = rows[1]?.querySelectorAll('.acs-byte-cell');
    expect(messageCells).toHaveLength(7);
    expect(messageCells?.[5]?.textContent).toBe('+50A\\n');
    expect(messageCells?.[6]?.textContent).toBe('+600\\0');
  });

  it('distinguishes obtaining a label address from dereferencing it', () => {
    const { container } = render(<AdvancedConceptScene kind="label-address" />);

    expect(container.textContent).toContain('message0x00400000');
    expect(container.textContent).toContain('ldr x1, =message');
    expect(container.textContent).toContain('The bytes stored at message were not read');
    expect(container.textContent).toContain('ldrb w2, [x1]');
    expect(container.textContent).toContain('LDRB reads one byte there');
    expect(container.textContent).toContain('0x68 · first byte at X1');
  });

  it('labels the syscall boundary as a simulation', () => {
    const { container } = render(<AdvancedConceptScene kind="syscall-boundary" />);

    expect(container.textContent).toContain('Request prepared. Nothing has happened yet.');
    expect(container.textContent).toContain('SVC 0');
    expect(container.textContent).toContain('EDUCATIONAL SIMULATION');
    expect(container.textContent).toContain('does not invoke a real host kernel');
  });

  it('sends six write bytes and leaves the NUL outside the count', () => {
    const { container } = render(<AdvancedConceptScene kind="write-bytes" />);

    expect(container.querySelectorAll('.acs-byte-sent')).toHaveLength(6);
    expect(container.querySelectorAll('.acs-byte-excluded')).toHaveLength(1);
    expect(container.querySelector('.acs-byte-excluded')?.textContent).toContain('00');
    expect(container.textContent).toContain('X2 = 6');
    expect(container.textContent).toContain('hello↵');
  });

  it('breaks one disassembly row into address, bytes, mnemonic, and operands', () => {
    const { container } = render(<AdvancedConceptScene kind="disassembly-anatomy" />);

    expect(container.textContent).toContain('Assembly source');
    expect(container.textContent).toContain('Machine bytes');
    expect(container.textContent).toContain('Instruction listing');
    expect(container.querySelectorAll('.acs-annotated-row > div')).toHaveLength(4);
    expect(container.textContent).toContain('address000000000000000C');
    expect(container.textContent).toContain('encoded bytesFD 7B BE A9');
  });

  it('maps a C function through W0, W1, ADD, and the W0 result', () => {
    const { container } = render(<AdvancedConceptScene kind="c-mapping" />);

    expect(container.textContent).toContain('int addints(int a, int b)');
    expect(container.textContent).toContain('W0 = 10');
    expect(container.textContent).toContain('W1 = 20');
    expect(container.textContent).toContain('ADD W0, W0, W1');
    expect(container.textContent).toContain('W0 = 30');
  });

  it('renders the exact post-Step-4 debugger snapshot and triage checklist', () => {
    const { container } = render(<AdvancedConceptScene kind="debug-snapshot" />);

    expect(container.querySelectorAll('.acs-debug-checklist li')).toHaveLength(5);
    expect(container.textContent).toContain('Which instruction is current, or has execution finished?');
    expect(container.textContent).toContain('next position · program completePC0x0000000000000010');
    expect(container.textContent).toContain('X30 / LR0x4141414141414141');
    expect(container.textContent).toContain('SP0x00007FFFFFFFDFE0');
    expect(container.textContent).toContain('recognizable data valueX10x4141414141414141');
    expect(container.textContent).not.toContain('0x000000000010000C');
    expect(container.textContent).not.toContain('1 / 0x00400000');
    expect(container.textContent).toContain('investigation clue, not proof');
  });

  it('compares all four direct and indirect control-flow forms', () => {
    const { container } = render(<AdvancedConceptScene kind="indirect-control" />);

    expect(container.querySelectorAll('.acs-control-card')).toHaveLength(4);
    for (const opcode of ['B label', 'BL label', 'BR X9', 'BLR X8']) {
      expect(container.textContent).toContain(opcode);
    }
    expect(container.textContent).toContain('assembler encodes a PC-relative offset');
    expect(container.textContent).toContain('signed PC-relative offset in machine code');
    expect(container.textContent).not.toContain('label encoded in instruction');
    expect(container.textContent).toContain('Only BL and BLR create a new return address');
  });

  it('ends with a seven-step native security-reading workflow', () => {
    const { container } = render(<AdvancedConceptScene kind="native-workflow" />);

    expect(container.querySelectorAll('.acs-native-steps li')).toHaveLength(7);
    expect(container.textContent).toContain('Mark control flow');
    expect(container.textContent).toContain('Resolve memory access');
    expect(container.textContent).toContain('Ask security questions');
    expect(container.textContent).toContain('length, address, memory write, or indirect target');
  });
});
