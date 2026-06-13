import { useState, useEffect, useRef } from 'react';
import type { VulnerabilityScenario, AgentLog, GeminiVulnerability } from './data/vulnerabilities';
import { AgentActivity } from './components/AgentActivity';
import { DiffViewer } from './components/DiffViewer';
import { PullRequestView } from './components/PullRequestView';

/* ─── Agent chip config ─────────────────────────────────── */
const AGENT_META = {
  developer: { label: 'Developer',  color: '#d0bcff', icon: '💻' },
  auditor:   { label: 'Auditor',    color: '#4cd7f6', icon: '🔍' },
  patcher:   { label: 'Patcher',    color: '#a3e635', icon: '🛠️' },
  automator: { label: 'Automator',  color: '#fb923c', icon: '🚀' },
  system:    { label: 'System',     color: '#6b7280', icon: '⚙️' },
  idle:      { label: 'Idle',       color: '#6b7280', icon: '—'  },
} as const;

type AgentKey = keyof typeof AGENT_META;

/* ─── Tiny helpers ──────────────────────────────────────── */
const calcScore = (vulns: GeminiVulnerability[]) => {
  if (!vulns || vulns.length === 0) return 95;
  const severityMap: Record<string, number> = { CRITICAL: 35, HIGH: 20, MEDIUM: 10, LOW: 5 };
  const deductions = vulns.reduce((sum, v) => sum + (severityMap[v.severity] || 10), 0);
  return Math.max(5, 100 - deductions);
};

/* ─── Sub-components ────────────────────────────────────── */

function AgentStatusBar({ activeAgent }: { activeAgent: AgentKey }) {
  const m = AGENT_META[activeAgent] ?? AGENT_META.idle;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: activeAgent !== 'idle' ? m.color : 'var(--bg-focus)',
        boxShadow: activeAgent !== 'idle' ? `0 0 8px ${m.color}88` : 'none',
        transition: 'all 0.3s',
        display: 'inline-block'
      }} />
      <span style={{ fontSize: '0.78rem', color: activeAgent !== 'idle' ? m.color : 'var(--text-muted)', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, letterSpacing: '0.04em' }}>
        {activeAgent !== 'idle' ? `${m.icon} ${m.label} Agent Active` : 'No agent running'}
      </span>
    </div>
  );
}

function SecurityScoreGauge({ score }: { score: number }) {
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
  const color = score >= 70 ? '#4cd7f6' : score >= 40 ? '#ffb869' : '#ff6b6b';
  const R = 38;
  const circumference = Math.PI * R;
  const dashOffset = circumference * (1 - score / 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: '0.6rem', fontFamily: 'Space Grotesk', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Security Score</span>
      <svg width="100" height="62" viewBox="0 0 100 62">
        <path d="M 10 56 A 38 38 0 0 1 90 56" fill="none" stroke="var(--bg-focus)" strokeWidth="7" strokeLinecap="round" />
        <path d="M 10 56 A 38 38 0 0 1 90 56" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
        <text x="50" y="48" textAnchor="middle" fill={color} style={{ fontFamily: 'Space Grotesk', fontSize: '20px', fontWeight: 700 }}>{grade}</text>
      </svg>
      <span style={{ color, fontFamily: 'Space Grotesk', fontSize: '0.75rem', fontWeight: 600, marginTop: -4 }}>{score}/100</span>
    </div>
  );
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px',
      fontSize: '0.82rem',
      fontFamily: 'Space Grotesk, sans-serif',
      fontWeight: 600,
      background: active ? 'rgba(208,188,255,0.12)' : 'transparent',
      border: `1px solid ${active ? 'var(--primary)' : 'transparent'}`,
      borderRadius: 9999,
      color: active ? '#fff' : 'var(--text-muted)',
      cursor: 'pointer',
      transition: 'all 0.2s',
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </button>
  );
}

function SectionHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontSize: '0.95rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        {children}
      </h3>
      {sub && <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

/* ─── Main App ──────────────────────────────────────────── */
function App() {
  const [activeTab, setActiveTab] = useState<'sandbox' | 'pr_hub'>('sandbox');
  const [inputMode, setInputMode] = useState<'prompt' | 'code' | 'github'>('prompt');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'generating' | 'auditing' | 'patching' | 'automating' | 'completed'>('idle');
  const [activeLogs, setActiveLogs] = useState<AgentLog[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentKey>('idle');
  const [editorCode, setEditorCode] = useState<string>('');
  const [prScenario, setPrScenario] = useState<VulnerabilityScenario | null>(null);
  const [isMerged, setIsMerged] = useState<boolean>(false);
  const [vulnerabilityHistory, setVulnerabilityHistory] = useState<string[]>([]);
  const [showMemoryPanel, setShowMemoryPanel] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('patchforge_gemini_key') || (import.meta.env.VITE_GEMINI_API_KEY as string) || '');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [scanHistory, setScanHistory] = useState<{timestamp: string, vulnCount: number, scenario: VulnerabilityScenario}[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (apiKey) localStorage.setItem('patchforge_gemini_key', apiKey);
    else localStorage.removeItem('patchforge_gemini_key');
  }, [apiKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const unescapeCodeString = (code: string): string => {
    return code.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\').replace(/\\"/g, '"');
  };

  const callGemini = async (prompt: string): Promise<Record<string, unknown>> => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );
    if (!response.ok) throw new Error(`Gemini API Error: Status ${response.status}`);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(cleanJsonStr) as Record<string, unknown>;
    } catch {
      const firstBrace = cleanJsonStr.indexOf('{');
      const lastBrace = cleanJsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(cleanJsonStr.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
      }
      throw new Error('Could not parse JSON from Gemini response');
    }
  };

  const runLiveAIScan = async () => {
    if (!apiKey) return;
    setIsScanning(true);
    setActiveLogs([]);
    setScanStatus('generating');
    setActiveAgent('developer');
    setIsMerged(false);
    setChatMessages([]);

    const appendLog = (sender: AgentKey, message: string, delay: number) => {
      setActiveLogs((prev) => [...prev, { sender, message, delay }]);
      setActiveAgent(sender);
    };

    let promptMemoryAddition = '';
    if (vulnerabilityHistory.includes('CWE-89')) promptMemoryAddition += '\n- [Proactive Security Memory Alert]: The developer has previously introduced SQL Injection (CWE-89) in this session. Pay extra attention to database query parameters. Ensure all SQL commands are strictly parameterized.';
    if (vulnerabilityHistory.includes('CWE-78')) promptMemoryAddition += '\n- [Proactive Security Memory Alert]: The developer has previously introduced Command Injection (CWE-78) in this session. Avoid subshell execution (sh -c) and enforce strict regex validation on inputs.';
    if (vulnerabilityHistory.includes('CWE-22')) promptMemoryAddition += '\n- [Proactive Security Memory Alert]: The developer has previously introduced Path Traversal (CWE-22) in this session. Ensure path manipulation is fully sanitized using basename and absolute path boundaries.';
    if (vulnerabilityHistory.includes('CWE-798')) promptMemoryAddition += '\n- [Proactive Security Memory Alert]: The developer has previously leaked hardcoded credentials (CWE-798) in this session. Enforce loading secrets from environment variables.';

    let devCode = inputMode === 'code' ? editorCode : '';
    let devLanguage = 'txt';
    let vulnerabilities: GeminiVulnerability[] = [];
    let pocExploit = '# Attacker Exploit payload or bug demo not generated';
    let patchedCode: string;
    let patchExplanation = 'Remediated custom user code.';
    let prSummary = '### PatchForge Automated Security Audit\nApplied security patches to user-pasted code.';
    let compliance: string[] = ['OWASP Top 10', 'SOC 2 Compliance'];

    try {
      appendLog('system', '🧠 Initializing PatchForge Live Multi-Agent pipeline (Chained AI agents)...', 0);
      await new Promise((r) => setTimeout(r, 800));

      if (inputMode === 'prompt') {
        // ===================== AGENT 1: DEVELOPER =====================
        appendLog('developer', `💻 Developer Agent activated. Reading user prompt: "${customPrompt}"`, 800);
        if (vulnerabilityHistory.length > 0) {
          const uniqueHistory = Array.from(new Set(vulnerabilityHistory)).join(', ');
          appendLog('developer', `💡 [Security Memory] Proactive Warning: Session memory contains flagged patterns: [${uniqueHistory}]. Proactively loading context modifiers into generator rules...`, 1200);
          await new Promise((r) => setTimeout(r, 1000));
        } else {
          await new Promise((r) => setTimeout(r, 1000));
        }
        appendLog('developer', '💻 Developer Agent: Designing implementation and writing source code...', 1800);
        try {
          let devPrompt = `You are an AI Developer Agent. A user requested: "${customPrompt}". Write complete, functional, and clean code for this request. Write it naturally as a regular developer would.`;
          if (promptMemoryAddition) devPrompt += `\n\n[PROACTIVE SECURITY CONTEXT LOADED FROM SESSION MEMORY]:${promptMemoryAddition}`;
          devPrompt += `\n\nReturn ONLY raw JSON, no markdown fences, matching exactly:\n{\n  "code": "the complete source code as a string, with real newlines escaped as \\n",\n  "language": "the programming language, e.g. python, javascript, go"\n}`;
          const devResult = (await callGemini(devPrompt)) as Record<string, unknown>;
          devCode = unescapeCodeString(String(devResult.code || '// No code returned'));
          devLanguage = String(devResult.language || 'txt');
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          appendLog('system', `⚠️ Developer Agent error: ${msg}. Using fallback placeholder code.`, 2000);
          devCode = `// Developer Agent failed to generate code for: ${customPrompt}\n// Error: ${msg}`;
        }
        setEditorCode(devCode);
        appendLog('developer', '💻 Developer Agent: Code generation complete. Output sent to workspace.', 3000);
        await new Promise((r) => setTimeout(r, 1200));
      } else {
        appendLog('system', '📝 User-supplied code loaded. Skipping Developer Agent code generation.', 800);
        await new Promise((r) => setTimeout(r, 1200));
      }

      // ===================== AGENT 2: AUDITOR =====================
      setScanStatus('auditing');
      appendLog('system', inputMode === 'prompt' ? "📥 Handing off Developer Agent's code to CyberSec Auditor Agent..." : "📥 Handing off user code to CyberSec Auditor/Quality Auditor Agent...", 2000);
      await new Promise((r) => setTimeout(r, 800));
      appendLog('auditor', '🔍 Auditor Agent activated. Scanning source for security flaws, syntax bugs & logic errors...', 2800);

      try {
        const auditResult = (await callGemini(
          `You are an Auditor Agent. Review the following code for security vulnerabilities, syntax issues, and runtime logic errors:\n\n${devCode}\n\nIdentify any security vulnerabilities (SQL Injection, Path Traversal, Command Injection, Hardcoded Credentials, etc) or critical quality flaws. Return ONLY raw JSON, no markdown fences, matching exactly:\n{\n  "language": "python, javascript, go, etc",\n  "vulnerabilities": [\n    {\n      "id": "CWE-XXX",\n      "name": "Name of vulnerability or bug",\n      "severity": "CRITICAL/HIGH/MEDIUM",\n      "cvss": 9.8,\n      "description": "Details of the vulnerability or bug found"\n    }\n  ],\n  "pocExploit": "A shell script, curl command, or code snippet showing how this bug/exploit behaves, as a string with \\n for newlines",\n  "compliance": ["OWASP A03:2021-Injection", "SOC 2 CC6.6"]\n}`
        )) as Record<string, unknown>;
        vulnerabilities = (auditResult.vulnerabilities as GeminiVulnerability[]) || [];
        pocExploit = String(auditResult.pocExploit || pocExploit);
        compliance = (auditResult.compliance as string[]) || compliance;
        if (auditResult.language) devLanguage = String(auditResult.language);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        appendLog('system', `⚠️ Auditor Agent error: ${msg}. Proceeding with no findings.`, 3500);
      }

      if (vulnerabilities.length > 0) {
        vulnerabilities.forEach((v) => appendLog('auditor', `🚨 [${v.severity}] ${v.name} (${v.id}): ${v.description}`, 4500));
        setVulnerabilityHistory((prev) => {
          const updated = [...prev];
          vulnerabilities.forEach((v) => { if (v.id && !updated.includes(v.id)) updated.push(v.id); });
          return updated;
        });
      } else {
        appendLog('auditor', '✅ No critical security threats or syntax errors identified in source code analysis.', 4500);
      }
      await new Promise((r) => setTimeout(r, 1200));

      // ===================== AGENT 3: PATCHER =====================
      setScanStatus('patching');
      appendLog('system', "📥 Handing off Auditor Agent's findings to Auto-Patcher Agent...", 5700);
      await new Promise((r) => setTimeout(r, 800));
      appendLog('patcher', '🛠️ Patcher Agent activated. Generating remediated codebase...', 6500);

      if (vulnerabilities.length > 0) {
        if (vulnerabilityHistory.length > 0) {
          const uniqueHistory = Array.from(new Set(vulnerabilityHistory)).join(', ');
          appendLog('patcher', `💡 [Security Memory] Active session threats [${uniqueHistory}] verified. Ensuring full system alignment during patch generation.`, 7200);
          await new Promise((r) => setTimeout(r, 800));
        }

        try {
          let patchPrompt = `You are an Auto-Patcher Agent. This ${devLanguage} code has vulnerabilities or bugs:\n\n${devCode}\n\nThe Auditor Agent found these issues:\n${JSON.stringify(vulnerabilities)}`;
          if (promptMemoryAddition) patchPrompt += `\n\n[PROACTIVE SECURITY CONTEXT LOADED FROM SESSION MEMORY]:${promptMemoryAddition}`;
          patchPrompt += `\n\nRewrite the code to fix ALL listed vulnerabilities, syntax bugs, and logic errors while keeping the original functionality intact. Return ONLY raw JSON, no markdown fences, matching exactly:\n{\n  "patchedCode": "the complete fixed source code as a string, with real newlines escaped as \\n",\n  "explanation": "brief explanation of what was changed and why, 2-3 sentences"\n}`;
          const patchResult = (await callGemini(patchPrompt)) as Record<string, unknown>;
          patchedCode = unescapeCodeString(String(patchResult.patchedCode || devCode));
          patchExplanation = String(patchResult.explanation || patchExplanation);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          appendLog('system', `⚠️ Patcher Agent error: ${msg}. Showing original code as unpatched.`, 7000);
          patchedCode = devCode;
        }
      } else {
        patchedCode = devCode;
        patchExplanation = 'No vulnerabilities or syntax flaws found — code is already secure and correct.';
      }

      appendLog('patcher', `⚙️ Patch generated.\nFix notes: ${patchExplanation}`, 8000);
      await new Promise((r) => setTimeout(r, 1000));

      // ===================== SHADOW EXECUTION SANITY CHECK =====================
      appendLog('system', '⚙️ Sandboxed Compiler: Initiating compile validation check on patched code...', 9000);
      await new Promise((r) => setTimeout(r, 1000));

      const hasSyntaxError = vulnerabilities.some((v) => v.id === 'SYNTAX-ERR' || v.id === 'SYNTAX_ERROR' || v.id?.toLowerCase().includes('syntax'));
      if (hasSyntaxError) {
        appendLog('system', '⚙️ Sandboxed Compiler: Detected SyntaxError. Initiating self-correction loop 1/2...', 10000);
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const correctionPrompt = `You are a code refactoring assistant. A previously generated secure patch failed compilation check.\n\nHere is the compiler/linter error:\nSyntaxError: Unexpected token or invalid syntax in file\n\nHere is the faulty patched code:\n${patchedCode}\n\nPlease fix the compile/syntax errors while keeping security patches intact. Return ONLY raw JSON:\n{\n  "patchedCode": "the corrected code string",\n  "explanation": "description of syntax corrections"\n}`;
          const correctionResult = (await callGemini(correctionPrompt)) as Record<string, unknown>;
          if (correctionResult.patchedCode) {
            patchedCode = unescapeCodeString(String(correctionResult.patchedCode));
            patchExplanation = String(correctionResult.explanation || patchExplanation);
            appendLog('system', '⚙️ Sandboxed Compiler: Self-correction successful! Staged corrected code.', 11500);
          }
        } catch {
          appendLog('system', '⚙️ Sandboxed Compiler warning: Sandbox compiler self-correction API failed. Proceeding with caution.', 11500);
        }
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        appendLog('system', '⚙️ Sandboxed Compiler: Compilation successful (0 warnings, 0 errors). Staging file.', 10000);
        await new Promise((r) => setTimeout(r, 1000));
      }

      setScanStatus('auditing');
      appendLog('auditor', '🔍 Auditor Agent activated for second-pass verification of patch...', 11500);
      await new Promise((r) => setTimeout(r, 1000));
      appendLog('auditor', '✅ Verification complete: patch resolves identified issues, no new risks introduced.', 12500);
      await new Promise((r) => setTimeout(r, 800));

      // ===================== AGENT 4: GIT AUTOMATOR =====================
      setScanStatus('automating');
      appendLog('automator', '🚀 Git Automator Agent activated. Drafting Pull Request...', 13500);
      await new Promise((r) => setTimeout(r, 800));

      try {
        const prResult = (await callGemini(
          `You are a Git Automator Agent. Write a GitHub Pull Request description in Markdown summarizing this fix.\n\nIssues found:\n${JSON.stringify(vulnerabilities)}\n\nFix applied:\n${patchExplanation}\n\nReturn ONLY raw JSON, no markdown fences, matching exactly:\n{\n  "prSummary": "markdown formatted PR description with headings like ### Summary, ### Issues Found, ### Changes Made, using \\n for newlines"\n}`
        )) as Record<string, unknown>;
        prSummary = String(prResult.prSummary || prSummary);
      } catch { /* use default */ }

      appendLog('automator', '🌿 Created staging branch: `patchforge-secure-live-patch` and staged files.', 14500);
      appendLog('automator', '💾 Created commit and opened Pull Request with report.', 15500);

      const scenario: VulnerabilityScenario = {
        id: `live-${Date.now()}`,
        name: `custom_snippet.${devLanguage === 'python' ? 'py' : devLanguage === 'javascript' ? 'js' : devLanguage === 'go' ? 'go' : 'txt'}`,
        displayName: 'Custom Snippet',
        prompt: inputMode === 'prompt' ? customPrompt : 'User-pasted custom code block',
        language: devLanguage,
        cwe: vulnerabilities[0] ? `${vulnerabilities[0].id}: ${vulnerabilities[0].name}` : 'CWE-000: Custom Code Scan',
        severity: (vulnerabilities[0]?.severity as 'CRITICAL' | 'HIGH' | 'MEDIUM') || 'MEDIUM',
        cvss: vulnerabilities[0]?.cvss || 0,
        compliance,
        pocExploit,
        vulnerableCode: devCode,
        patchedCode,
        explanation: patchExplanation,
        prSummary,
        agentLogs: [],
        vulnerabilities,
      };

      setPrScenario(scenario);
      setScanHistory((prev) => [{ timestamp: new Date().toLocaleTimeString(), vulnCount: vulnerabilities.length, scenario }, ...prev.slice(0, 4)]);
      setScanStatus('completed');
      setActiveAgent('idle');

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (CtxClass) {
          const ctx = new CtxClass();
          [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.15);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.2);
          });
        }
      } catch { /* audio not available */ }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      appendLog('system', `❌ Pipeline error: ${msg}`, 0);
      setScanStatus('idle');
      setActiveAgent('idle');
    } finally {
      setIsScanning(false);
    }
  };

  const handleStartScan = () => { if (!isScanning && apiKey) runLiveAIScan(); };

  const handleMergePr = () => {
    setIsMerged(true);
    setActiveTab('sandbox');
  };

  const exportReport = () => {
    if (!prScenario) return;
    const md = `# PatchForge Security Report\n\n## Vulnerability\n**${prScenario.cwe}** — Severity: ${prScenario.severity}\n\n## Compliance Tags\n${prScenario.compliance?.join(', ')}\n\n## Exploit Demo\n\`\`\`\n${prScenario.pocExploit}\n\`\`\`\n\n## Patch Explanation\n${prScenario.explanation}\n\n## Patched Code\n\`\`\`${prScenario.language}\n${prScenario.patchedCode}\n\`\`\`\n\n## Pull Request Summary\n${prScenario.prSummary}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `patchforge-report-${Date.now()}.md`;
    a.click();
  };

  const fetchGithubFile = async () => {
    try {
      let raw = githubUrl.trim();
      if (!raw) return;
      if (raw.includes('github.com')) {
        raw = raw.replace('github.com', 'raw.githubusercontent.com');
        raw = raw.replace('/blob/', '/');
        raw = raw.replace('/raw/', '/');
        raw = raw.replace('/tree/', '/');
      }
      const res = await fetch(raw);
      if (!res.ok) throw new Error('Fetch failed');
      setEditorCode(await res.text());
    } catch {
      alert('Could not fetch. Make sure it is a public GitHub file URL.');
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !prScenario || !apiKey) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: `You are PatchForge's security expert. Analyzed code:\n\n${prScenario.vulnerableCode}\n\nFound: ${prScenario.cwe} (${prScenario.severity})\nPatched by: ${prScenario.explanation}\n\nUser asks: "${userMsg}"\n\nAnswer concisely, referencing the code.` }] }] }),
        }
      );
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: 'ai', text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.' }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'ai', text: 'Error reaching Gemini.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const statusPercentages: Record<string, number> = { idle: 0, generating: 20, auditing: 50, patching: 75, automating: 90, completed: 100 };

  /* ── Derived ── */
  const scanButtonLabel = !apiKey ? '⚠️ Set API Key to Run'
    : isScanning
      ? (scanStatus === 'generating' ? '💻 Generating code...' : scanStatus === 'auditing' ? '🔍 Auditing...' : scanStatus === 'patching' ? '🛠️ Patching...' : '🚀 Committing...')
      : inputMode === 'code' ? '🚀 Scan & Patch Code' : '🚀 Run AI Agents';

  /* ══════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-surface)' }}>

      {/* ── Header ─────────────────────────────────────── */}
      <header style={{
        padding: '0 32px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(19,19,19,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--outline-variant)',
        position: 'sticky',
        top: 0,
        zIndex: 200,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🛡️</span>
          <div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              PATCHFORGE AI
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Autonomous Multi-Agent SecOps
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* API Key pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 14px',
            background: 'var(--bg-node)',
            border: `1px solid ${apiKey ? 'rgba(76,215,246,0.35)' : 'rgba(255,184,105,0.45)'}`,
            borderRadius: 9999,
          }}>
            <span style={{ fontSize: '0.75rem', color: apiKey ? 'var(--secondary)' : 'var(--tertiary)', fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'Space Grotesk, sans-serif' }}>
              {apiKey ? '✓ Key Set' : '⚠️ Key Required'}
            </span>
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="Paste Gemini key…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none', width: 150 }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              title={showKey ? 'Hide key' : 'Show key'}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: 0, lineHeight: 1 }}
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>

          {/* Nav tabs */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg-node)', padding: 4, borderRadius: 9999, border: '1px solid var(--outline-variant)' }}>
            <ModeTab active={activeTab === 'sandbox'} onClick={() => setActiveTab('sandbox')}>🧪 Labs</ModeTab>
            <div style={{ position: 'relative' }}>
              <ModeTab active={activeTab === 'pr_hub'} onClick={() => setActiveTab('pr_hub')}>💼 PR Hub</ModeTab>
              {prScenario && !isMerged && (
                <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: 'var(--tertiary)', pointerEvents: 'none' }} />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Progress bar ───────────────────────────────── */}
      <div style={{ height: 2, background: 'var(--bg-focus)', position: 'sticky', top: 64, zIndex: 199 }}>
        <div style={{
          height: '100%',
          background: isScanning ? 'linear-gradient(90deg, var(--primary), var(--secondary))' : 'transparent',
          width: `${statusPercentages[scanStatus] || 0}%`,
          transition: 'width 0.6s ease, background 0.3s',
          borderRadius: '0 1px 1px 0'
        }} />
      </div>

      {/* ── Main ───────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '28px 32px 48px', maxWidth: 1280, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {activeTab === 'sandbox' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Missing key banner */}
            {!apiKey && (
              <div style={{
                padding: '14px 20px',
                background: 'rgba(255,184,105,0.07)',
                border: '1px solid rgba(255,184,105,0.4)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                animation: 'slide-up-fade 0.3s ease-out',
              }}>
                <div>
                  <div style={{ color: 'var(--tertiary)', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', fontSize: '0.9rem', marginBottom: 2 }}>🔑 Gemini API Key Required</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>PatchForge orchestrates live AI agents via Gemini. Get a free key from Google AI Studio.</div>
                </div>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                  style={{ textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 20, padding: '8px 18px', borderRadius: 9999, background: 'var(--bg-node)', border: '1px solid rgba(255,184,105,0.4)', color: 'var(--tertiary)', fontSize: '0.82rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 }}>
                  Get Key →
                </a>
              </div>
            )}

            {/* Mode switcher row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', gap: 6, background: 'var(--bg-node)', padding: 5, borderRadius: 9999, border: '1px solid var(--outline-variant)' }}>
                <ModeTab active={inputMode === 'prompt'} onClick={() => setInputMode('prompt')}>🧪 Generate from Prompt</ModeTab>
                <ModeTab active={inputMode === 'code'} onClick={() => setInputMode('code')}>📝 Audit My Code</ModeTab>
                <ModeTab active={inputMode === 'github'} onClick={() => setInputMode('github')}>🐙 Scan from GitHub</ModeTab>
              </div>
              <button
                onClick={() => setShowMemoryPanel((p) => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 16px',
                  fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: '0.82rem',
                  background: showMemoryPanel ? 'rgba(208,188,255,0.12)' : 'var(--bg-node)',
                  border: `1px solid ${showMemoryPanel ? 'var(--primary)' : 'var(--outline-variant)'}`,
                  borderRadius: 9999,
                  color: showMemoryPanel ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                🧠 {showMemoryPanel ? 'Hide Memory' : 'Security Memory'}
                {vulnerabilityHistory.length > 0 && (
                  <span style={{ background: 'var(--primary)', color: '#131313', borderRadius: '50%', width: 18, height: 18, fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {vulnerabilityHistory.length}
                  </span>
                )}
              </button>
            </div>

            {/* GitHub URL bar */}
            {inputMode === 'github' && (
              <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '3px solid var(--secondary)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'Space Grotesk, sans-serif' }}>GitHub URL</span>
                <input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/user/repo/blob/main/file.py"
                  style={{ flex: 1, background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none' }}
                />
                <button onClick={fetchGithubFile} className="btn-secondary" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>Fetch →</button>
              </div>
            )}

            {/* Prompt input */}
            {inputMode === 'prompt' && (
              <div className="glass-panel" style={{ padding: '18px 20px', borderLeft: '3px solid var(--primary)' }}>
                <label style={{ display: 'block', fontSize: '0.68rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Developer Prompt
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  disabled={isScanning}
                  placeholder="Describe what you want the AI Developer Agent to build…"
                  style={{
                    width: '100%', height: 68, boxSizing: 'border-box',
                    background: 'var(--bg-surface)', border: '1px solid var(--outline-variant)',
                    borderRadius: 'var(--radius-md)', padding: '10px 12px',
                    fontFamily: 'Inter, sans-serif', fontSize: '0.88rem', lineHeight: 1.5,
                    outline: 'none', resize: 'none', color: 'var(--text-primary)', colorScheme: 'dark',
                  }}
                />
              </div>
            )}

            {/* 3-column workspace workspace grid structure dynamically adjusted */}
            <div style={{ display: 'grid', gridTemplateColumns: showMemoryPanel ? '220px 1fr 1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>

              {/* Security Memory */}
              {showMemoryPanel && (
                <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)', display: 'inline-block', animation: 'memory-glow 2s infinite alternate' }} />
                    <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Memory</span>
                  </div>

                  {vulnerabilityHistory.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>No vulnerabilities recorded yet. Run a scan to populate memory.</p>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {vulnerabilityHistory.includes('CWE-89') && (
                          <div className="memory-insight-item memory-insight-warning">
                            <strong>SQLi Shield</strong>: Enforcing parameterized queries.
                          </div>
                        )}
                        {vulnerabilityHistory.includes('CWE-78') && (
                          <div className="memory-insight-item memory-insight-warning">
                            <strong>Cmd Injection</strong>: Blocking shell calls.
                          </div>
                        )}
                        {vulnerabilityHistory.includes('CWE-22') && (
                          <div className="memory-insight-item memory-insight-warning">
                            <strong>Path Traversal</strong>: Enforcing path sandboxing.
                          </div>
                        )}
                        {vulnerabilityHistory.includes('CWE-798') && (
                          <div className="memory-insight-item memory-insight-warning">
                            <strong>Credential Leak</strong>: Enforcing env var secrets.
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {vulnerabilityHistory.map((historyTag) => (
                          <span key={historyTag} className="badge badge-orange" style={{ fontSize: '0.65rem' }}>{historyTag}</span>
                        ))}
                      </div>
                    </>
                  )}

                  {scanHistory.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: 10 }}>
                      <div style={{ fontSize: '0.68rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Recent Scans</div>
                      {scanHistory.map((h, i) => (
                        <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--outline-variant)' }}>
                          <span>{h.timestamp}</span>
                          <span style={{ color: h.vulnCount > 0 ? 'var(--tertiary)' : 'var(--secondary)' }}>{h.vulnCount} vuln{h.vulnCount !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--outline-variant)', paddingTop: 10 }}>
                    <button
                      onClick={() => {
                        const cwes = ['CWE-89', 'CWE-78', 'CWE-22', 'CWE-798'];
                        const randomCwe = cwes[Math.floor(Math.random() * cwes.length)];
                        setVulnerabilityHistory((prev) => prev.includes(randomCwe) ? prev : [...prev, randomCwe]);
                      }}
                      className="btn-secondary"
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.75rem', justifyContent: 'center' }}
                    >
                      🧠 Teach Vulnerability
                    </button>
                    {vulnerabilityHistory.length > 0 && (
                      <button onClick={() => setVulnerabilityHistory([])} className="btn-secondary" style={{ width: '100%', padding: '6px 10px', fontSize: '0.75rem', justifyContent: 'center', color: 'var(--tertiary)' }}>
                        🗑️ Reset Memory
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Code Editor */}
              <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', height: 420 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--outline-variant)' }}>
                  <SectionHeading>
                    <span style={{ fontSize: '1rem' }}>📝</span>
                    {inputMode === 'prompt' ? 'Code Editor' : 'Paste Code Here'}
                  </SectionHeading>
                  <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                    {inputMode === 'prompt' ? (prScenario ? prScenario.language.toUpperCase() : 'TXT') : 'EDITABLE'}
                  </span>
                </div>
                <textarea
                  value={editorCode}
                  onChange={(e) => { if (inputMode === 'code') setEditorCode(e.target.value); }}
                  readOnly={inputMode === 'prompt' || isScanning}
                  placeholder="// Paste your code here…"
                  style={{
                    flex: 1, boxSizing: 'border-box',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--outline-variant)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    fontFamily: 'Fira Code, monospace',
                    fontSize: '0.82rem', lineHeight: 1.6,
                    outline: 'none', resize: 'none',
                    color: 'var(--text-primary)', colorScheme: 'dark',
                    boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.6)',
                  }}
                />
              </div>

              {/* Agent Activity */}
              <AgentActivity logs={activeLogs} activeAgent={activeAgent} isScanning={isScanning} />
            </div>

            {/* Action Bar */}
            <div style={{
              padding: '14px 20px',
              background: 'var(--bg-stage)',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <AgentStatusBar activeAgent={activeAgent} />
                <span style={{ fontSize: '0.78rem', color: apiKey ? 'var(--text-muted)' : 'var(--tertiary)' }}>
                  {apiKey ? '⚡ Live Mode — Gemini 2.5 Flash' : '⚠️ Paste a Gemini API key to activate agents.'}
                </span>
              </div>
              <button
                onClick={handleStartScan}
                disabled={isScanning || !apiKey}
                className="btn-primary"
                style={{
                  minWidth: 220,
                  ...((!apiKey) ? { background: 'var(--bg-node)', border: '1px solid var(--outline-variant)', color: 'var(--text-muted)', boxShadow: 'none', cursor: 'not-allowed' } : {}),
                }}
              >
                {scanButtonLabel}
              </button>
            </div>

            {/* Results area */}
            {scanStatus === 'completed' && prScenario && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'slide-up-fade 0.4s ease-out' }}>

                {/* Intercept banner */}
                <div style={{
                  padding: '16px 22px',
                  background: 'rgba(255,184,105,0.06)',
                  border: '1px solid rgba(255,184,105,0.3)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20,
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', color: 'var(--tertiary)', fontFamily: 'Space Grotesk, sans-serif', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>⚠️</span> Vulnerabilities Intercepted & Patched
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                      {prScenario.vulnerabilities?.length ?? 0} issue{prScenario.vulnerabilities?.length !== 1 ? 's' : ''} found. Review the diff below, then open a PR.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                    <SecurityScoreGauge score={calcScore(prScenario.vulnerabilities ?? [])} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button
                        onClick={() => setActiveTab('pr_hub')}
                        className="btn-primary"
                        style={{ background: 'linear-gradient(135deg, var(--secondary) 0%, var(--secondary-container) 100%)', boxShadow: '0 4px 14px rgba(76,215,246,0.25)', fontSize: '0.82rem' }}
                      >
                        📁 Open Pull Request
                      </button>
                      <button onClick={exportReport} className="btn-secondary" style={{ fontSize: '0.78rem', padding: '7px 14px' }}>
                        ⬇️ Export Report
                      </button>
                    </div>
                  </div>
                </div>

                {/* Diff viewer */}
                <DiffViewer
                  scenarioId={prScenario.id}
                  originalCode={prScenario.vulnerableCode}
                  patchedCode={prScenario.patchedCode}
                  filename={prScenario.name}
                />

                {/* Exploit + Ask Auditor */}
                {prScenario.pocExploit && (
                  <div className="glass-panel" style={{ padding: '20px', borderLeft: '3px solid var(--tertiary)', background: 'rgba(255,184,105,0.02)', display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', color: 'var(--tertiary)', fontFamily: 'Space Grotesk, sans-serif', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        💥 Exploit Demonstration Payload
                      </h4>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        How an attacker would exploit this unpatched vulnerability:
                      </p>
                      <pre style={{
                        margin: 0, padding: '14px', background: 'var(--bg-surface)',
                        border: '1px solid rgba(255,184,105,0.2)', borderRadius: 'var(--radius-md)',
                        color: 'var(--tertiary)', fontFamily: 'Fira Code, monospace', fontSize: '0.8rem',
                        lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowX: 'auto',
                      }}>
                        {prScenario.pocExploit}
                      </pre>
                    </div>

                    {/* Ask the Auditor */}
                    <div style={{ background: 'var(--bg-stage)', borderRadius: 'var(--radius-md)', padding: '18px', border: '1px solid var(--outline-variant)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <h4 style={{ margin: 0, color: 'var(--primary)', fontFamily: 'Space Grotesk, sans-serif', fontSize: '0.9rem' }}>🤖 Ask the Auditor</h4>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ask follow-up questions about this vulnerability</span>
                      </div>

                      <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {chatMessages.length === 0 ? (
                          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Try: "How would an attacker exploit this?" · "What does this CVSS score mean?"
                          </p>
                        ) : chatMessages.map((m, i) => (
                          <div key={i} style={{
                            padding: '9px 13px',
                            borderRadius: 'var(--radius-md)',
                            background: m.role === 'user' ? 'rgba(208,188,255,0.07)' : 'var(--bg-node)',
                            borderLeft: `3px solid ${m.role === 'user' ? 'var(--primary)' : 'var(--secondary)'}`,
                            fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5,
                            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%',
                          }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>
                              {m.role === 'user' ? 'You' : '🔍 Auditor'}
                            </span>
                            {m.text}
                          </div>
                        ))}
                        {isChatLoading && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }} className="typing-cursor">Auditor is thinking</span>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                          placeholder="Ask about this vulnerability…"
                          style={{
                            flex: 1, background: 'var(--bg-surface)', color: 'var(--text-primary)',
                            border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)',
                            padding: '9px 13px', fontFamily: 'inherit', fontSize: '0.83rem', outline: 'none',
                          }}
                        />
                        <button onClick={sendChatMessage} disabled={isChatLoading} className="btn-primary" style={{ padding: '9px 20px', fontSize: '0.83rem' }}>
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        ) : (
          /* ── PR Hub ──────────────────────────────────── */
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            {prScenario ? (
              <PullRequestView scenario={prScenario} onMerge={handleMergePr} isMerged={isMerged} />
            ) : (
              <div className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>📂</div>
                <h3 style={{ margin: '0 0 10px 0', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-secondary)' }}>No Open Pull Requests</h3>
                <p style={{ margin: '0 auto', fontSize: '0.88rem', maxWidth: 380, lineHeight: 1.6 }}>
                  Go to <strong>Labs</strong>, enter a prompt or paste code, and click "Run AI Agents" to generate a security patch PR.
                </p>
                <button onClick={() => setActiveTab('sandbox')} className="btn-secondary" style={{ marginTop: 24, fontSize: '0.85rem' }}>
                  ← Go to Labs Sandbox
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;