import React, { useState } from 'react';
import type { VulnerabilityScenario } from '../data/vulnerabilities';
import { DiffViewer } from './DiffViewer';

interface PullRequestViewProps {
  scenario: VulnerabilityScenario;
  onMerge: () => void;
  isMerged: boolean;
}

export const PullRequestView: React.FC<PullRequestViewProps> = ({
  scenario,
  onMerge,
  isMerged,
}) => {
  const [activeTab, setActiveTab] = useState<'conversation' | 'files_changed'>('conversation');
  const [merging, setMerging] = useState(false);

  const handleMerge = () => {
    setMerging(true);
    setTimeout(() => {
      setMerging(false);
      onMerge();
    }, 1500);
  };

  // Simple, robust custom parser for the scenario's markdown report
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('### ')) {
        return <h3 key={index} style={{ color: 'hsl(var(--text-primary))', marginTop: '16px', marginBottom: '8px', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '6px' }}>{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={index} style={{ color: 'hsl(var(--text-secondary))', marginTop: '14px', marginBottom: '6px' }}>{line.replace('#### ', '')}</h4>;
      }
      if (line.startsWith('- ')) {
        return <li key={index} style={{ color: 'hsl(var(--text-secondary))', marginLeft: '16px', marginBottom: '4px', fontSize: '0.85rem' }}>{line.replace('- ', '')}</li>;
      }
      if (line.startsWith('`') && line.endsWith('`')) {
        return <code key={index} style={{ display: 'block', backgroundColor: 'hsl(var(--bg-darker))', padding: '10px', borderRadius: '4px', border: '1px solid hsl(var(--border))', margin: '8px 0', fontSize: '0.8rem' }}>{line.replace(/`/g, '')}</code>;
      }
      if (line.startsWith('\`\`\`')) {
        return null; // Skip markdown block markers in simple parser
      }
      return <p key={index} style={{ color: 'hsl(var(--text-secondary))', margin: '6px 0', lineHeight: 1.5, fontSize: '0.875rem' }}>{line}</p>;
    });
  };

  // Calculate branch names
  const branchName = `patchforge-fix-${scenario.id.replace(/_/g, '-')}`;

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
      {/* PR Header */}
      <div style={{ borderBottom: '1px solid hsl(var(--border))', paddingBottom: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
            [Security Patch] Fix {scenario.cwe.split(':')[1]} in {scenario.name}
          </span>
          <span style={{ fontSize: '1.2rem', color: 'hsl(var(--text-muted))' }}>#1</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isMerged ? (
            <span className="badge" style={{ backgroundColor: 'rgba(167, 139, 250, 0.15)', color: '#c084fc', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
              🟣 Merged
            </span>
          ) : (
            <span className="badge badge-green">
              🟢 Open
            </span>
          )}
          <span className="badge badge-red" style={{ fontSize: '0.65rem', border: '1px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5', fontWeight: 700 }}>
            CVSS: {scenario.cvss}
          </span>
          {scenario.compliance && scenario.compliance.map((c) => (
            <span key={c} className="badge" style={{ fontSize: '0.65rem', backgroundColor: 'rgba(156, 163, 175, 0.1)', color: '#e5e7eb', border: '1px solid rgba(156, 163, 175, 0.2)' }}>
              🛡️ {c}
            </span>
          ))}
          <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
            <strong>patchforge-bot</strong> wants to merge 1 commit into <code style={{ backgroundColor: 'hsla(var(--bg-card) / 0.5)', padding: '2px 6px', borderRadius: '4px' }}>main</code> from <code style={{ backgroundColor: 'hsla(var(--bg-card) / 0.5)', padding: '2px 6px', borderRadius: '4px' }}>{branchName}</code>
          </span>
        </div>
      </div>

      {/* GitHub Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))', marginBottom: '20px', gap: '4px' }}>
        <button
          onClick={() => setActiveTab('conversation')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'conversation' ? '2px solid hsl(var(--primary))' : '2px solid transparent',
            color: activeTab === 'conversation' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          💬 Conversation
        </button>
        <button
          onClick={() => setActiveTab('files_changed')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'files_changed' ? '2px solid hsl(var(--primary))' : '2px solid transparent',
            color: activeTab === 'files_changed' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📁 Files Changed <span style={{ backgroundColor: 'hsla(var(--bg-card) / 0.8)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.75rem', marginLeft: '4px' }}>1</span>
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
        {activeTab === 'conversation' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* PR Description Card */}
            <div className="glass-panel" style={{ padding: '20px', backgroundColor: 'hsla(var(--bg-card) / 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '10px', marginBottom: '14px' }}>
                <span style={{ fontSize: '1.1rem' }}>🤖</span>
                <strong style={{ fontSize: '0.85rem' }}>patchforge-bot</strong>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>commented 1 minute ago</span>
                <span className="badge badge-blue" style={{ fontSize: '0.65rem', marginLeft: 'auto' }}>Agent Report</span>
              </div>
              <div style={{ overflow: 'hidden' }}>
                {renderMarkdown(scenario.prSummary)}
              </div>
            </div>

            {scenario.pocExploit && (
              <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '10px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '1.1rem' }}>💥</span>
                  <strong style={{ fontSize: '0.85rem' }}>Attacker's Proof-of-Concept Exploit (Auditor Report)</strong>
                  <span className="badge badge-red" style={{ fontSize: '0.65rem', marginLeft: 'auto' }}>Security Exploit PoC</span>
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                  The CyberSec Auditor Agent generated this exploit demonstration payload:
                </p>
                <pre style={{
                  margin: 0,
                  padding: '12px',
                  backgroundColor: 'hsl(var(--bg-darker))',
                  border: '1px solid hsla(346, 84%, 53%, 0.15)',
                  borderRadius: 'var(--radius-md)',
                  color: '#fca5a5',
                  fontFamily: 'Fira Code, monospace',
                  fontSize: '0.825rem',
                  lineHeight: 1.4,
                  whiteSpace: 'pre-wrap',
                  overflowX: 'auto'
                }}>
                  {scenario.pocExploit}
                </pre>
              </div>
            )}

            {/* Conversation timeline entry */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '20px', borderLeft: '2px solid hsl(var(--border))', marginLeft: '25px', position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '-9px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: 'hsl(var(--border))',
                border: '3px solid hsl(var(--bg-darker))',
                display: 'inline-block'
              }}></span>
              <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                🚀 <strong>patchforge-bot</strong> pushed commit <code style={{ color: 'hsl(var(--primary))' }}>9f3c7ae</code>: "security: fix vulnerability in {scenario.name}"
              </span>
            </div>
          </div>
        ) : (
          <DiffViewer
            scenarioId={scenario.id}
            originalCode={scenario.vulnerableCode}
            patchedCode={scenario.patchedCode}
            filename={scenario.name}
          />
        )}
      </div>

      {/* GitHub Merge Box Section */}
      <div className="glass-panel" style={{ padding: '20px', borderLeft: isMerged ? '4px solid #a78bfa' : '4px solid hsl(var(--success))', backgroundColor: 'hsla(var(--bg-dark) / 0.5)' }}>
        {isMerged ? (
          <div>
            <h4 style={{ margin: 0, color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
              🟣 Pull request successfully merged and closed
            </h4>
            <p style={{ margin: '6px 0 0 0', color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>
              All checks passed. The codebase is secure and the branch has been deleted.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h4 style={{ margin: 0, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem' }}>
                🛡️ Branch has no conflicts with the base branch
              </h4>
              <p style={{ margin: '6px 0 0 0', color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>
                Security tests successfully compiled. Ready to merge automated fix.
              </p>
            </div>
            <button
              onClick={handleMerge}
              disabled={merging}
              className="btn-primary"
              style={{
                backgroundColor: '#10b981',
                backgroundImage: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.3)'
              }}
            >
              {merging ? (
                <>
                  <span style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#fff',
                    animation: 'slide-up-fade 0.8s infinite linear',
                    display: 'inline-block'
                  }}></span>
                  Merging PR...
                </>
              ) : (
                'Merge Pull Request'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
