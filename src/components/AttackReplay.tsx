import React from 'react';

interface VulnSummaryProps {
  pocExploit: string;
  explanation: string;
  cwe: string;
  cvss: number;
}

export const AttackReplay: React.FC<VulnSummaryProps> = (props) => {
  const { cwe, cvss, pocExploit, explanation } = props;
  const cweId = cwe.split(':')[0]?.trim() || 'CWE-000';
  const cweName = cwe.split(':')[1]?.trim() || 'Vulnerability';

  const hasPoC = pocExploit && pocExploit !== '# Attacker Exploit payload or bug demo not generated';

  return (
    <div className="glass-panel" style={{ padding: '20px', background: 'var(--bg-stage)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span style={{ fontSize: '1.2rem' }}>&#x1F6E1;&#xFE0F;</span>
        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{cweId}: {cweName}</strong>
        <span className="badge badge-orange" style={{ fontSize: '0.6rem' }}>CVSS: {cvss}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Fix Summary — from Patcher Agent */}
        <div style={{
          padding: '12px 14px',
          background: 'rgba(76, 215, 246, 0.06)',
          border: '1px solid rgba(76, 215, 246, 0.2)',
          borderRadius: 'var(--radius-md)',
        }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {explanation}
          </p>
        </div>

        {/* PoC Exploit — from Auditor Agent */}
        {hasPoC && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(255, 184, 105, 0.06)',
            border: '1px solid rgba(255, 184, 105, 0.2)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem' }}>&#x1F4A3;</span>
              <strong style={{ fontSize: '0.8rem', color: 'var(--tertiary)' }}>Exploit PoC</strong>
            </div>
            <pre style={{
              margin: 0,
              padding: '8px 10px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'Fira Code, monospace',
              fontSize: '0.72rem',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              color: 'var(--tertiary)',
              maxHeight: '100px',
              overflowY: 'auto',
            }}>
              {pocExploit.slice(0, 500)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
