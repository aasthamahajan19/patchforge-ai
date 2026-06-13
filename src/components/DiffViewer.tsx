import React from 'react';

interface DiffViewerProps {
  scenarioId: string;
  originalCode: string;
  patchedCode: string;
  filename: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  scenarioId,
  originalCode,
  patchedCode,
  filename,
}) => {
  const getHighlights = (id: string) => {
    switch (id) {
      case 'js_sql_injection':
        return { vuln: [13, 15], patched: [13, 19] }; // 0-indexed line numbers
      case 'py_path_traversal':
        return { vuln: [13, 14], patched: [13, 21] };
      case 'go_cmd_injection':
        return { vuln: [15, 19], patched: [15, 29] };
      case 'secrets_leakage':
        return { vuln: [3, 4], patched: [4, 6] };
      default:
        // Generic fallback highlight for user-pasted code
        return { vuln: [0, 2], patched: [0, 2] };
    }
  };

  const { vuln, patched } = getHighlights(scenarioId);

  const originalLines = originalCode.split('\n');
  const patchedLines = patchedCode.split('\n');

  return (
    <div className="diff-container" style={{ flex: 1, minHeight: 0 }}>
      {/* Original Code Panel */}
      <div className="diff-panel">
        <div className="diff-header">
          <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
            Vulnerable Code ({filename})
          </span>
          <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>Original</span>
        </div>
        <pre className="diff-content">
          {originalLines.map((line, index) => {
            const isVuln = index >= vuln[0] && index <= vuln[1];
            return (
              <div
                key={index}
                className={`diff-line ${isVuln ? 'removed' : ''}`}
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
          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
            Secured Patch
          </span>
          <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Patched</span>
        </div>
        <pre className="diff-content">
          {patchedLines.map((line, index) => {
            const isPatched = index >= patched[0] && index <= patched[1];
            return (
              <div
                key={index}
                className={`diff-line ${isPatched ? 'added' : ''}`}
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
