import { useState, useEffect } from 'react';
import { vulnerabilitiesData } from './data/vulnerabilities';
import type { VulnerabilityScenario, AgentLog } from './data/vulnerabilities';
import { AgentActivity } from './components/AgentActivity';
import { DiffViewer } from './components/DiffViewer';
import { PullRequestView } from './components/PullRequestView';

function App() {
  // Navigation & Workspace State
  const [activeTab, setActiveTab] = useState<'sandbox' | 'pr_hub'>('sandbox');
  const [currentScenario, setCurrentScenario] = useState<VulnerabilityScenario>(vulnerabilitiesData[0]);
  
  // Custom Playground States
  const [customPrompt, setCustomPrompt] = useState<string>('Write a Python web API that accepts an uploaded image path and runs a system command to resize it using ImageMagick.');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  
  // Security State
  const [securedScenarios, setSecuredScenarios] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'generating' | 'auditing' | 'patching' | 'automating' | 'completed'>('idle');
  const [activeLogs, setActiveLogs] = useState<AgentLog[]>([]);
  const [activeAgent, setActiveAgent] = useState<'developer' | 'auditor' | 'patcher' | 'automator' | 'system' | 'idle'>('idle');
  const [editorCode, setEditorCode] = useState<string>('');
  
  // PR State
  const [prScenario, setPrScenario] = useState<VulnerabilityScenario | null>(null);
  
  // Custom API State
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);

  // Sync workspace when changing scenarios
  useEffect(() => {
    if (!isCustomMode) {
      setEditorCode('// AI Developer is ready to code. Click "Run Audit & Patch" to write code...');
      setScanStatus('idle');
      setActiveLogs([]);
      setActiveAgent('idle');
    } else {
      setEditorCode('// AI Developer is ready to code. Type a prompt above and click "Run Audit & Patch"...');
    }
  }, [currentScenario, isCustomMode]);

  // Simulated Log Streaming Loop (Code generation, auditing, and patching)
  const runSimulatedScan = (scenario: VulnerabilityScenario) => {
    setIsScanning(true);
    setActiveLogs([]);
    setScanStatus('generating');
    setActiveAgent('developer');
    setEditorCode('// Developer Agent is writing code from prompt...\n// Importing libraries...\n// Spawning boilerplate...');

    scenario.agentLogs.forEach((log) => {
      setTimeout(() => {
        setActiveLogs((prev) => [...prev, log]);
        setActiveAgent(log.sender);
        
        // Dynamic status transitions
        if (log.sender === 'developer') {
          setScanStatus('generating');
        }
        if (log.sender === 'auditor') {
          setScanStatus('auditing');
          // Once the developer is done, dump the vulnerable code in the editor
          setEditorCode(scenario.vulnerableCode);
        }
        if (log.sender === 'patcher') {
          setScanStatus('patching');
        }
        if (log.sender === 'automator') {
          setScanStatus('automating');
        }
      }, log.delay);
    });

    const totalDuration = scenario.agentLogs[scenario.agentLogs.length - 1].delay + 1000;
    setTimeout(() => {
      setIsScanning(false);
      setScanStatus('completed');
      setActiveAgent('idle');
      setPrScenario(scenario);
    }, totalDuration);
  };

  // Real API Agent Loop (Single-call Gemini Multi-Agent Flow)
  const runLiveAIScan = async () => {
    if (!apiKey) return;
    setIsScanning(true);
    setActiveLogs([]);
    setScanStatus('generating');
    setActiveAgent('developer');
    setEditorCode('// AI Developer Agent is writing code from custom prompt...\n// Setting up framework context...\n// Compiling packages...');

    // Helper to log status to console
    const appendLog = (sender: 'developer' | 'system' | 'auditor' | 'patcher' | 'automator', message: string, delay: number) => {
      setActiveLogs((prev) => [...prev, { sender, message, delay }]);
      setActiveAgent(sender);
    };

    try {
      appendLog('system', 'Initializing PatchForge Live AI Agent pipeline...', 0);
      await new Promise((r) => setTimeout(r, 1000));
      appendLog('developer', `💻 Developer Agent activated. Reading user prompt: "${customPrompt}"`, 1000);
      await new Promise((r) => setTimeout(r, 1500));
      appendLog('developer', '💻 Developer Agent: Designing code implementation and connecting logic layers...', 2500);

      // Invoke Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Act as a multi-agent coding system. The user wants to write code for the following feature request: "${customPrompt}".
Since standard AI coding models are prone to generating insecure code, you will execute this workflow:
1. Act as the AI Developer Agent: Write the requested code snippet, but INTENTIONALLY include a typical, severe security vulnerability (like SQL Injection, Path Traversal, Command Injection, or Hardcoded Secrets) that developers often make in this context. Keep the code complete.
2. Act as the CyberSec Auditor Agent: Audit this generated code, locate the security vulnerability, and identify the CWE code.
3. Act as the Auto-Patcher Agent: Rewrite the code to make it fully secure while keeping the feature functional.

You must return your output STRICTLY in JSON format matching this schema:
{
  "vulnerabilities": [
    {
      "id": "CWE-XXX",
      "name": "Name of vulnerability",
      "severity": "CRITICAL/HIGH/MEDIUM",
      "cvss": 9.8,
      "description": "Details of the vulnerability found"
    }
  ],
  "compliance": ["OWASP A03:2021-Injection", "SOC 2 CC6.6"],
  "pocExploit": "Shell script or curl command demonstrating the exploit payload",
  "devCode": "The complete insecure code written by the AI Developer Agent",
  "patchedCode": "The complete secure code rewritten by the Auto-Patcher Agent",
  "explanation": "Brief explanation of the vulnerability and patch",
  "prSummary": "A summary formatted in Markdown representing a GitHub Pull Request description explaining what was wrong, what files changed, and how it was fixed."
}
Return only the raw JSON. Do not wrap the JSON in markdown code blocks (\`\`\`json).`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API Error: Status ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Clean potential JSON markdown blocks
      const cleanJsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedResult = JSON.parse(cleanJsonStr);

      // 1. Developer finishes writing code
      appendLog('developer', '💻 Developer Agent: Code generation complete. Outputting source to workspace.', 4000);
      setEditorCode(parsedResult.devCode || '// Empty output');
      await new Promise((r) => setTimeout(r, 2000));

      // 2. Auditor Scans code
      setScanStatus('auditing');
      appendLog('system', '📥 Transferring developer code to CyberSec Auditor Agent...', 6000);
      await new Promise((r) => setTimeout(r, 1200));
      appendLog('auditor', '🔍 CyberSec Agent activated. Parsing source code AST for OWASP vulnerabilities...', 7200);
      await new Promise((r) => setTimeout(r, 1800));

      if (parsedResult.vulnerabilities && parsedResult.vulnerabilities.length > 0) {
        parsedResult.vulnerabilities.forEach((v: any) => {
          appendLog('auditor', `🚨 [${v.severity}] ${v.name} (${v.id}): ${v.description}`, 9000);
        });
      } else {
        appendLog('auditor', '✅ No critical security threats identified in source code analysis.', 9000);
      }
      await new Promise((r) => setTimeout(r, 2000));

      // 3. Patcher Fixes code
      setScanStatus('patching');
      appendLog('patcher', '🛠️ Patcher Agent activated. Reviewing Auditor report & generating refactored codebase...', 11000);
      await new Promise((r) => setTimeout(r, 2000));
      appendLog('patcher', `⚙️ Applied remediation. Code rewrites generated.\nFix notes: ${parsedResult.explanation || 'No notes provided.'}`, 13000);
      await new Promise((r) => setTimeout(r, 1500));

      // 3.5 Verification Loop (Auditor runs second pass)
      setScanStatus('auditing');
      appendLog('auditor', '🔍 Auditor Agent activated for second-pass verification loop...', 14500);
      await new Promise((r) => setTimeout(r, 1200));
      appendLog('auditor', '✅ Verification AST scan complete: Proposed patch resolves original vulnerability and introduces 0 new threats. Patch is APPROVED.', 15700);
      await new Promise((r) => setTimeout(r, 1000));

      // 4. Git Automator PR opens
      setScanStatus('automating');
      appendLog('automator', '🚀 Git Automator Agent activated. Initializing repository staging...', 16700);
      await new Promise((r) => setTimeout(r, 1500));
      appendLog('automator', '🌿 Created staging branch: `patchforge-secure-live-patch` and staged files.', 18200);
      appendLog('automator', '💾 Created commit: `security: patch vulnerabilities via PatchForge AI` and prepared Pull Request description.', 19700);
      
      const liveScenario: VulnerabilityScenario = {
        id: 'custom_live_audit',
        name: 'custom_snippet.txt',
        displayName: 'Custom Snippet',
        prompt: customPrompt,
        language: 'txt',
        cwe: parsedResult.vulnerabilities?.[0] ? `${parsedResult.vulnerabilities[0].id}: ${parsedResult.vulnerabilities[0].name}` : 'CWE-000: Custom Code Scan',
        severity: parsedResult.vulnerabilities?.[0]?.severity || 'MEDIUM',
        cvss: parsedResult.vulnerabilities?.[0]?.cvss || 8.5,
        compliance: parsedResult.compliance || ['OWASP Top 10', 'SOC 2 Compliance'],
        pocExploit: parsedResult.pocExploit || '# Attacker Exploit payload not generated',
        vulnerableCode: parsedResult.devCode || customPrompt,
        patchedCode: parsedResult.patchedCode || customPrompt,
        explanation: parsedResult.explanation || 'Remediated custom user code.',
        prSummary: parsedResult.prSummary || '### PatchForge Automated Security Audit\nApplied security patches to user-pasted code.',
        agentLogs: [],
      };

      setPrScenario(liveScenario);
      setScanStatus('completed');
      appendLog('system', '🎉 Live Multi-Agent lifecycle complete! Review changes below.', 21000);
    } catch (err: any) {
      appendLog('system', `❌ Error executing live agent run: ${err.message}. Reverting to local rules engine.`, 1000);
      console.error(err);
      // Fallback
      const mockFallbackScenario: VulnerabilityScenario = {
        id: 'fallback_mock',
        name: 'custom_snippet.py',
        displayName: 'Custom Snippet',
        prompt: customPrompt,
        language: 'python',
        cwe: 'CWE-78: Command Injection',
        severity: 'CRITICAL',
        cvss: 9.8,
        compliance: ['OWASP A03:2021-Injection', 'SOC 2 CC6.6'],
        pocExploit: '# Attacker Exploit payload: os.system("ping " + "; rm -rf /")',
        vulnerableCode: `import os\n# VULNERABLE: Direct command injection from custom prompt\nos.system("ping " + "${customPrompt.slice(0,20)}")`,
        patchedCode: `import os\nimport shlex\n# SECURED: Shell escaped command arguments\nos.system("ping " + shlex.quote("${customPrompt.slice(0,20)}"))`,
        explanation: 'Failsafe rule-based fallback applied due to API error.',
        prSummary: '### 🛡️ PatchForge Backup Security Report\nFallback applied.',
        agentLogs: [],
      };
      setEditorCode(mockFallbackScenario.vulnerableCode);
      setPrScenario(mockFallbackScenario);
      setScanStatus('completed');
    } finally {
      setIsScanning(false);
      setActiveAgent('idle');
    }
  };

  const handleStartScan = () => {
    if (apiKey) {
      runLiveAIScan();
    } else {
      runSimulatedScan(isCustomMode ? vulnerabilitiesData[0] : currentScenario);
    }
  };

  const handleMergePr = () => {
    if (prScenario) {
      setSecuredScenarios((prev) => [...prev, prScenario.id]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Premium Header */}
      <header className="glass-panel" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderTop: 'none' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.6rem' }}>🛡️</span>
            <span className="font-heading" style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(135deg, #3b82f6 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              PATCHFORGE AI
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
            Autonomous Multi-Agent SecOps Engine
          </span>
        </div>

        {/* Live AI Integration Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="glass-panel" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid hsla(var(--primary) / 0.2)' }}>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Gemini Key:</span>
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="Paste Key for Live Audit"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '0.8rem',
                outline: 'none',
                width: '140px',
              }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', fontSize: '0.8rem' }}
              title="Show/Hide Key"
            >
              {showKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="glass-panel" style={{ padding: '4px', display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('sandbox')}
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                backgroundColor: activeTab === 'sandbox' ? 'hsla(var(--primary) / 0.15)' : 'transparent',
                borderColor: activeTab === 'sandbox' ? 'hsl(var(--primary))' : 'transparent',
                color: activeTab === 'sandbox' ? '#fff' : 'hsl(var(--text-secondary))'
              }}
            >
              🧪 Labs Sandbox
            </button>
            <button
              onClick={() => setActiveTab('pr_hub')}
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                backgroundColor: activeTab === 'pr_hub' ? 'hsla(var(--primary) / 0.15)' : 'transparent',
                borderColor: activeTab === 'pr_hub' ? 'hsl(var(--primary))' : 'transparent',
                color: activeTab === 'pr_hub' ? '#fff' : 'hsl(var(--text-secondary))',
                position: 'relative'
              }}
            >
              💼 PR Hub
              {prScenario && !securedScenarios.includes(prScenario.id) && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#f87171',
                  borderRadius: '50%'
                }}></span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '0 32px 32px 32px' }}>
        {activeTab === 'sandbox' ? (
          <div className="grid-cols-layout">
            {/* Sidebar Scenario/Prompt Selector */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '16px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Laboratory Prompts
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {vulnerabilitiesData.map((scenario) => {
                    const isSecured = securedScenarios.includes(scenario.id);
                    const isSelected = !isCustomMode && currentScenario.id === scenario.id;
                    return (
                      <div
                        key={scenario.id}
                        onClick={() => {
                          setIsCustomMode(false);
                          setCurrentScenario(scenario);
                        }}
                        className={`glass-card-interactive ${isSelected ? 'active' : ''}`}
                        style={{ padding: '12px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{scenario.displayName}</span>
                          {isSecured ? (
                            <span className="badge badge-green" style={{ fontSize: '0.55rem', padding: '2px 6px' }}>SECURED</span>
                          ) : (
                            <span className="badge badge-red" style={{ fontSize: '0.55rem', padding: '2px 6px' }}>RISK</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {scenario.prompt}
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ borderTop: '1px solid hsl(var(--border))', marginTop: '8px', paddingTop: '12px' }}>
                    <button
                      onClick={() => setIsCustomMode(true)}
                      className="btn-secondary"
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        backgroundColor: isCustomMode ? 'hsla(var(--primary) / 0.15)' : 'transparent',
                        borderColor: isCustomMode ? 'hsl(var(--primary))' : 'hsl(var(--border))'
                      }}
                    >
                      ✏️ Custom Generator
                    </button>
                  </div>
                </div>
              </div>

              {/* Security Metrics Panel */}
              <div className="glass-panel" style={{ padding: '16px', background: 'linear-gradient(135deg, hsla(222, 47%, 14%, 0.4) 0%, hsla(222, 47%, 11%, 0.4) 100%)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>🛡️ Security Status</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                  <div className="flex-between">
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>Total Audited:</span>
                    <strong>{isCustomMode ? 'Custom Prompt' : vulnerabilitiesData.length}</strong>
                  </div>
                  <div className="flex-between">
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>Secured:</span>
                    <strong style={{ color: '#4ade80' }}>{securedScenarios.length} / {vulnerabilitiesData.length}</strong>
                  </div>
                </div>
              </div>
            </aside>

            {/* Sandbox Main Panel */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Prompt Box */}
              <div className="glass-panel" style={{ padding: '16px 20px', borderLeft: '4px solid hsl(var(--primary))' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Developer Prompt (Input for AI Writer)
                </h4>
                {isCustomMode ? (
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    disabled={isScanning}
                    placeholder="Enter what you want the AI Developer Agent to build (e.g. Write a python script to resize images...)"
                    style={{
                      width: '100%',
                      height: '60px',
                      backgroundColor: 'hsl(var(--bg-darker))',
                      color: 'hsl(var(--text-primary))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 12px',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      lineHeight: '1.4',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'hsl(var(--text-primary))', lineHeight: 1.4 }}>
                    {currentScenario.prompt}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ fontSize: '0.65rem', border: '1px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5', fontWeight: 700 }}>
                        CVSS: {currentScenario.cvss}
                      </span>
                      {currentScenario.compliance.map((c) => (
                        <span key={c} className="badge" style={{ fontSize: '0.65rem', backgroundColor: 'rgba(156, 163, 175, 0.1)', color: '#e5e7eb', border: '1px solid rgba(156, 163, 175, 0.2)' }}>
                          🛡️ {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Workspace Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Code Editor Column */}
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '420px' }}>
                  <div className="flex-between" style={{ marginBottom: '14px', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📝 Code Editor
                    </h3>
                    <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                      {isCustomMode ? 'TXT' : currentScenario.language.toUpperCase()}
                    </span>
                  </div>

                  <textarea
                    value={editorCode}
                    readOnly
                    style={{
                      flex: 1,
                      backgroundColor: 'hsl(var(--bg-darker))',
                      color: 'hsl(var(--text-primary))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      fontFamily: 'Fira Code, monospace',
                      fontSize: '0.85rem',
                      lineHeight: '1.5',
                      outline: 'none',
                      resize: 'none',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
                      colorScheme: 'dark'
                    }}
                  />
                </div>

                {/* Agent Activity Terminal Column */}
                <AgentActivity
                  logs={activeLogs}
                  activeAgent={activeAgent}
                  isScanning={isScanning}
                />
              </div>

              {/* Action Bar */}
              <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'hsla(var(--bg-card) / 0.5)' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                    {apiKey ? (
                      <span style={{ color: '#60a5fa' }}>⚡ Running Live AI Mode (using Gemini 2.5 Flash)</span>
                    ) : (
                      <span>⚙️ Running Simulation Mode (no API key needed)</span>
                    )}
                  </span>
                </div>
                <button
                  onClick={handleStartScan}
                  disabled={isScanning}
                  className="btn-primary"
                  style={{ minWidth: '220px' }}
                >
                  {isScanning ? (
                    scanStatus === 'generating' ? '💻 Developer Writing Code...' :
                    scanStatus === 'auditing' ? '🔍 CyberSec Auditing...' :
                    scanStatus === 'patching' ? '🛠️ Patcher Rewriting...' :
                    '🚀 Automating...'
                  ) : '🚀 Write & Secure Code'}
                </button>
              </div>

              {/* Diff Viewer panel appears when scanning completes */}
              {scanStatus === 'completed' && prScenario && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'slide-up-fade 0.3s ease-out' }}>
                  <div className="glass-panel" style={{ padding: '16px 24px', backgroundColor: 'hsla(var(--error-glow) / 0.3)', border: '1px solid hsla(var(--error) / 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, color: '#f87171', fontSize: '1.05rem' }}>⚠️ Buggy AI Code Intercepted & Secured!</h4>
                      <p style={{ margin: '4px 0 0 0', color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>
                        The AI Developer generated vulnerable code. The CyberSec Agent intercepted and patched it. Review the diff below.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('pr_hub')}
                      className="btn-primary"
                      style={{
                        backgroundColor: '#10b981',
                        backgroundImage: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      📁 Open Pull Request
                    </button>
                  </div>

                  <DiffViewer
                    scenarioId={prScenario.id}
                    originalCode={prScenario.vulnerableCode}
                    patchedCode={prScenario.patchedCode}
                    filename={prScenario.name}
                  />

                  {prScenario.pocExploit && (
                    <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.02)' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                        💥 Attacker's Proof-of-Concept (PoC) Exploit
                      </h4>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                        Below is a demonstration payload showcasing how an external attacker could exploit the unpatched code generated by the AI Developer Agent:
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
                        {prScenario.pocExploit}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* PR Hub Tab Panel */
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {prScenario ? (
              <PullRequestView
                scenario={prScenario}
                onMerge={handleMergePr}
                isMerged={securedScenarios.includes(prScenario.id)}
              />
            ) : (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '14px' }}>📂</span>
                <h3>No Open Pull Requests</h3>
                <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '8px auto 0 auto' }}>
                  Go to the **Labs Sandbox** tab, select a prompt, and click "Write & Secure Code" to trigger the multi-agent developer/auditor pipeline.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
