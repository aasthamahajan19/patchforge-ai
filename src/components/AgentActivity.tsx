import React, { useEffect, useRef } from 'react';
import type { AgentLog } from '../data/vulnerabilities';

interface AgentActivityProps {
  logs: AgentLog[];
  activeAgent: 'developer' | 'auditor' | 'patcher' | 'automator' | 'system' | 'idle';
  isScanning: boolean;
}

export const AgentActivity: React.FC<AgentActivityProps> = ({
  logs,
  activeAgent,
  isScanning,
}) => {
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of console when new logs are added
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, activeAgent]);

  const getAgentHeader = (sender: string) => {
    switch (sender) {
      case 'developer':
        return {
          name: 'AI Developer Agent',
          badgeClass: 'badge-blue',
          style: { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' },
          avatar: '💻',
        };
      case 'auditor':
        return {
          name: 'CyberSec Auditor Agent',
          badgeClass: 'badge-orange',
          avatar: '🔍',
        };
      case 'patcher':
        return {
          name: 'Auto-Patcher Agent',
          badgeClass: 'badge-green',
          style: { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' },
          avatar: '🛠️',
        };
      case 'automator':
        return {
          name: 'Git Automator Agent',
          badgeClass: 'badge-purple',
          style: { backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)' },
          avatar: '🚀',
        };
      default:
        return {
          name: 'System Orchestrator',
          badgeClass: 'badge-gray',
          style: { backgroundColor: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', border: '1px solid rgba(156, 163, 175, 0.2)' },
          avatar: '⚙️',
        };
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        height: '420px',
      }}
    >
      <div className="flex-between" style={{ marginBottom: '14px', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="typing-cursor" style={{ color: 'hsl(var(--primary))' }}>&gt;_</span> 
          Agent Activity Console
        </h3>
        {isScanning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'hsl(var(--primary))',
              display: 'inline-block',
              animation: 'slide-up-fade 0.8s infinite alternate'
            }}></span>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>ORCHESTRATING...</span>
          </div>
        )}
      </div>

      <div className="console-box" style={{ flex: 1 }}>
        {logs.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'hsl(var(--text-muted))',
            fontSize: '0.85rem',
            textAlign: 'center',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span>💻 Pipeline idle. Enter a prompt or select a lab scenario, then click "Run Audit & Patch" to trigger the Developer & CyberSec Agents.</span>
          </div>
        )}
        
        {logs.map((log, index) => {
          const agentInfo = getAgentHeader(log.sender);
          return (
            <div key={index} className={`console-message ${log.sender}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.9rem' }}>{agentInfo.avatar}</span>
                <span 
                  className={`badge ${agentInfo.badgeClass || ''}`}
                  style={agentInfo.style}
                >
                  {agentInfo.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginLeft: 'auto' }}>
                  +{Math.round(log.delay / 1000)}s
                </span>
              </div>
              <div style={{ color: 'hsl(var(--text-primary))', lineHeight: 1.4, paddingLeft: '24px', fontSize: '0.825rem', whiteSpace: 'pre-wrap' }}>
                {log.message}
              </div>
            </div>
          );
        })}

        {/* Dynamic agent thinking indicator */}
        {isScanning && activeAgent !== 'idle' && (
          <div className={`console-message ${activeAgent}`} style={{ opacity: 0.8, borderLeftStyle: 'dashed' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="typing-cursor" style={{ fontSize: '0.9rem' }}>
                {activeAgent === 'developer' ? '💻' : activeAgent === 'auditor' ? '🔍' : activeAgent === 'patcher' ? '🛠️' : activeAgent === 'automator' ? '🚀' : '⚙️'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontWeight: 500 }}>
                {activeAgent === 'developer' && 'Developer Agent writing source code from prompt inputs...'}
                {activeAgent === 'auditor' && 'CyberSec Agent auditing written code for security flaws...'}
                {activeAgent === 'patcher' && 'Patcher Agent refactoring vulnerable code block securely...'}
                {activeAgent === 'automator' && 'Git Automator staging secure code and preparing PR details...'}
                {activeAgent === 'system' && 'Orchestrator synchronizing next agent lifecycle phase...'}
              </span>
            </div>
          </div>
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
};
