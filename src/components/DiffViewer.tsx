import React from 'react';

interface DiffViewerProps {
  scenarioId: string;
  originalCode: string;
  patchedCode: string;
  filename: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  originalCode,
  patchedCode,
  filename,
}) => {
  const originalLines = originalCode.split('\n');
  const patchedLines = patchedCode.split('\n');

  // Create lookup sets of trimmed lines to identify added/removed lines dynamically
  const originalSet = new Set(originalLines.map(line => line.trim()));
  const patchedSet = new Set(patchedLines.map(line => line.trim()));

  return (
    <div className="diff-container" style={{ flex: 1, minHeight: 0 }}>
      {/* Original Code Panel */}
      <div className="diff-panel">
        <div className="diff-header">
          <span style={{ color: 'var(--tertiary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--tertiary)' }}></span>
            Vulnerable Code ({filename})
          </span>
          <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>Original</span>
        </div>
        <pre className="diff-content">
          {originalLines.map((line, index) => {
            // Highlight as removed if the line is not empty and does not exist in the patched code
            const isRemoved = line.trim() !== '' && !patchedSet.has(line.trim());
            return (
              <div
                key={index}
                className={`diff-line ${isRemoved ? 'removed' : ''}`}
              >
                <span className="diff-line-number">{index + 1}</span>
                <span>{line || ' '}</span>
              </div>
            );
          })}
        </pre>
      </div>

      {/* Patched Code Panel */}
      <div className="diff-panel">
        <div className="diff-header">
          <span style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--secondary)' }}></span>
            Secured Patch
          </span>
          <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Patched</span>
        </div>
        <pre className="diff-content">
          {patchedLines.map((line, index) => {
            // Highlight as added if the line is not empty and does not exist in the original code
            const isAdded = line.trim() !== '' && !originalSet.has(line.trim());
            return (
              <div
                key={index}
                className={`diff-line ${isAdded ? 'added' : ''}`}
              >
                <span className="diff-line-number">{index + 1}</span>
                <span>{line || ' '}</span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
};
