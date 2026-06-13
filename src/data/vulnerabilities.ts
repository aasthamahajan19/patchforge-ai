export interface AgentLog {
  sender: 'developer' | 'auditor' | 'patcher' | 'automator' | 'system' | 'idle';
  message: string;
  delay: number; // Delay in ms before showing this log
}

export interface GeminiVulnerability {
  id: string;
  name: string;
  severity: string;
  cvss: number;
  description: string;
}

export interface VulnerabilityScenario {
  id: string;
  name: string;
  displayName: string;
  prompt: string;
  language: string;
  cwe: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  cvss: number;
  compliance: string[];
  pocExploit: string;
  vulnerableCode: string;
  patchedCode: string;
  explanation: string;
  prSummary: string;
  agentLogs: AgentLog[];
  vulnerabilities?: GeminiVulnerability[];
}

export const vulnerabilitiesData: VulnerabilityScenario[] = [
  {
    id: 'js_sql_injection',
    name: 'user_search.js',
    displayName: 'SQL Database Query',
    prompt: 'Write a Node.js Express endpoint that takes a user ID from the query parameter and searches a MySQL database to return their username, email, and role.',
    language: 'javascript',
    cwe: 'CWE-89: SQL Injection',
    severity: 'CRITICAL',
    cvss: 9.8,
    compliance: ['OWASP A03:2021-Injection', 'SOC 2 CC6.6', 'GDPR Art. 32'],
    pocExploit: `curl "http://localhost:3000/api/users?id=1' OR '1'='1"

# Exploit payload sends '1' OR '1'='1' which bypasses filtering,
# forcing the query to evaluate as TRUE for all entries.
# SQL statement executed:
# SELECT username, email, role FROM users WHERE id = '1' OR '1'='1'`,
    vulnerableCode: `const express = require('express');
const mysql = require('mysql');
const app = express();

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'user_db'
});

// VULNERABLE: Direct SQL string concatenation allows SQL Injection
app.get('/api/users', (req, res) => {
  const userId = req.query.id;
  const query = "SELECT username, email, role FROM users WHERE id = '" + userId + "'";
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`,
    patchedCode: `const express = require('express');
const mysql = require('mysql');
const app = express();

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'user_db'
});

// SECURED: Using parameterized queries (prepared statements) to prevent SQL Injection
app.get('/api/users', (req, res) => {
  const userId = req.query.id;
  const query = "SELECT username, email, role FROM users WHERE id = ?";
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`,
    explanation: 'The Developer Agent concatenated user input directly into the SQL query string. An attacker could exploit this by passing a payload in `req.query.id` to read or modify arbitrary database records. The CyberSec Agent patched this by replacing the concatenation with a parameterized query placeholder (`?`) and passing the input inside an arguments array, which securely escapes the input.',
    prSummary: `### 🛡️ PatchForge AI Code Security Report
This Pull Request secures a **CRITICAL** SQL Injection vulnerability (CWE-89) introduced by the AI Developer Agent.

#### 🚨 Vulnerability Detected
In [user_search.js](file:///e:/hackathon/test_codes/javascript_sql_injection.js#L14-L16), user-controlled input was placed directly into an SQL string:
\`\`\`javascript
const query = "SELECT username, email, role FROM users WHERE id = '" + userId + "'";
\`\`\`
An attacker could manipulate \`req.query.id\` to bypass authentication or extract database contents.

#### 🔧 Applied Patch
- Modified the SQL statement to use a prepared query placeholder: \`SELECT username, email, role FROM users WHERE id = ?\`.
- Safely bound the \`userId\` parameter in the \`db.query()\` parameters array.

#### 📊 Security Audit Metrics
- **Severity**: CRITICAL (CVSS: 9.8)
- **Reviewer**: CyberSec Auditor Agent
- **Compliance Alignment**: OWASP A03:2021, SOC 2 CC6.6, GDPR Art. 32
- **Status**: Remediated & Validated`,
    agentLogs: [
      { sender: 'system', message: 'Initializing PatchForge AI Multi-Agent pipeline...', delay: 0 },
      { sender: 'developer', message: '💻 Developer Agent activated. Reading user prompt: "Write a Node.js Express endpoint that queries MySQL database..."', delay: 800 },
      { sender: 'developer', message: '💡 [Security Memory] Proactive Warning: Database query handlers are prone to SQL Injection. Let\'s make sure we handle inputs correctly in future iterations.', delay: 1800 },
      { sender: 'developer', message: '💻 Developer Agent: Generating Express application, setting up mysql connection, and writing route handler...', delay: 3000 },
      { sender: 'developer', message: '💻 Developer Agent: Code generated successfully. Outputting user_search.js to buffer.', delay: 4400 },
      { sender: 'system', message: '📥 Transferring generated code to CyberSec Auditor Agent for review...', delay: 5000 },
      { sender: 'auditor', message: '🔍 CyberSec Auditor Agent activated. Running static code scanning on user_search.js...', delay: 6000 },
      { sender: 'auditor', message: '⚠️ Line 14: SQL statement contains raw input concatenation.', delay: 7000 },
      { sender: 'auditor', message: '🚨 CRITICAL VULNERABILITY FOUND (CWE-89: SQL Injection). Developer Agent used direct concatenation for user input `req.query.id` inside SQL string. Blocking commit.', delay: 8000 },
      { sender: 'auditor', message: '📤 Dispatching vulnerability context and refactoring request to Patcher Agent.', delay: 9000 },
      { sender: 'patcher', message: '🛠️ Patcher Agent activated. Reviewing vulnerability spec (CWE-89) in user_search.js...', delay: 10200 },
      { sender: 'patcher', message: '💡 Remediation Strategy: Rewrite SQL route handler to use parameterized query placeholders (?) and pass arguments list.', delay: 11400 },
      { sender: 'patcher', message: '⚙️ Rewriting code lines 13-24... converting statement to parameterized query.', delay: 12600 },
      { sender: 'patcher', message: '✅ Run AST Verification: JavaScript compilation check [PASS].', delay: 13800 },
      { sender: 'patcher', message: '📤 Code secured. Requesting verification scan.', delay: 14600 },
      { sender: 'auditor', message: '🔍 Auditor Agent activated for second-pass verification loop...', delay: 15600 },
      { sender: 'auditor', message: '✅ Verification scan complete: Proposed patch resolves original SQLi and introduces 0 new threats. Patch APPROVED.', delay: 16800 },
      { sender: 'automator', message: '🚀 Git Automator Agent activated. Creating branch: `patchforge-secure-user-search`', delay: 17800 },
      { sender: 'automator', message: '💾 Staging changes. Creating commit: `security: patch sql injection in user search endpoint`', delay: 19000 },
      { sender: 'automator', message: '📝 Drafting automated Pull Request description detailing vulnerability and fix.', delay: 20200 },
      { sender: 'system', message: '🎉 Workflow complete! Pull Request #1 generated successfully. Code is secured.', delay: 21000 }
    ]
  },
  {
    id: 'py_path_traversal',
    name: 'downloader.py',
    displayName: 'Flask File Downloader',
    prompt: 'Write a Flask route in Python named "/download" that receives a filename via a query parameter and returns the corresponding file from the "/var/www/uploads" folder.',
    language: 'python',
    cwe: 'CWE-22: Path Traversal',
    severity: 'HIGH',
    cvss: 7.5,
    compliance: ['OWASP A01:2021-Broken Access Control', 'SOC 2 CC6.1'],
    pocExploit: `curl "http://localhost:5000/download?file=../../../../etc/passwd"

# Attacker uses directory traversal characters '../' to break out 
# of the storage folder boundary and read arbitrary local host files.
# Resolved Filepath:
# /var/www/uploads/../../../../etc/passwd  =>  /etc/passwd`,
    vulnerableCode: `import os
from flask import Flask, request, send_file, abort

app = Flask(__name__)
STORAGE_DIR = "/var/www/uploads"

# VULNERABLE: Lack of path sanitization allows Directory Traversal (e.g., filepath=../../etc/passwd)
@app.route('/download')
def download_file():
    filename = request.args.get('file')
    if not filename:
        return abort(400, "Missing 'file' parameter")
    
    # Direct concatenation joins user input with folder
    filepath = os.path.join(STORAGE_DIR, filename)
    
    if os.path.exists(filepath):
        return send_file(filepath)
    else:
        return abort(404, "File not found")

if __name__ == '__main__':
    app.run(port=5000)`,
    patchedCode: `import os
from flask import Flask, request, send_file, abort

app = Flask(__name__)
STORAGE_DIR = "/var/www/uploads"

# SECURED: Added path sanitization and strict validation to prevent Directory Traversal
@app.route('/download')
def download_file():
    filename = request.args.get('file')
    if not filename:
        return abort(400, "Missing 'file' parameter")
    
    # Secure filename using basename
    safe_filename = os.path.basename(filename)
    filepath = os.path.abspath(os.path.join(STORAGE_DIR, safe_filename))
    
    # Check that file path stays within the storage directory
    if not filepath.startswith(os.path.abspath(STORAGE_DIR)):
        return abort(403, "Access Denied: Path Traversal Detected")
    
    if os.path.exists(filepath):
        return send_file(filepath)
    else:
        return abort(404, "File not found")

if __name__ == '__main__':
    app.run(port=5000)`,
    explanation: 'The Developer Agent used raw user inputs inside `os.path.join` to fetch files. An attacker could exploit this directory traversal vulnerability to read files like `/etc/passwd`. The CyberSec Agent patched this by utilizing `os.path.basename` to clean the filename and checking that the resolved absolute path starts with the upload folder path.',
    prSummary: `### 🛡️ PatchForge AI Code Security Report
This Pull Request secures a **HIGH** severity Directory Traversal vulnerability (CWE-22) introduced by the AI Developer Agent.

#### 🚨 Vulnerability Detected
In [downloader.py](file:///e:/hackathon/test_codes/python_path_traversal.py#L14), the AI Developer Agent joined user input directly to the directory path:
\`\`\`python
filepath = os.path.join(STORAGE_DIR, filename)
\`\`\`
An attacker could feed relative path segments like \`../../\` to read files outside the intended uploads directory.

#### 🔧 Applied Patch
- Extracted only the core file name using \`os.path.basename(filename)\`.
- Resolved the absolute canonical path using \`os.path.abspath()\`.
- Added a validation constraint to verify the resolved file path starts with the absolute path of the upload folder root, blocking jailbreak requests with a \`403 Forbidden\` code.

#### 📊 Security Audit Metrics
- **Severity**: HIGH (CVSS: 7.5)
- **Reviewer**: CyberSec Auditor Agent
- **Compliance Alignment**: OWASP A01:2021, SOC 2 CC6.1
- **Status**: Remediated & Validated`,
    agentLogs: [
      { sender: 'system', message: 'Initializing PatchForge AI Multi-Agent pipeline...', delay: 0 },
      { sender: 'developer', message: '💻 Developer Agent activated. Reading user prompt: "Write a Flask route that receives a filename parameter..."', delay: 800 },
      { sender: 'developer', message: '💡 [Security Memory] Proactive Warning: Flask send_file can leak files if user input paths are unvalidated. Take precautions during file operations.', delay: 1800 },
      { sender: 'developer', message: '💻 Developer Agent: Writing Flask app, creating "/download" route, and implementing os.path.join to fetch files...', delay: 3000 },
      { sender: 'developer', message: '💻 Developer Agent: Code generated successfully. Outputting downloader.py to buffer.', delay: 4400 },
      { sender: 'system', message: '📥 Transferring generated code to CyberSec Auditor Agent for review...', delay: 5000 },
      { sender: 'auditor', message: '🔍 CyberSec Auditor Agent activated. Running static code scanning on downloader.py...', delay: 6000 },
      { sender: 'auditor', message: '⚠️ Line 14: Path resolution combines user parameter directly with base folder.', delay: 7000 },
      { sender: 'auditor', message: '🚨 HIGH VULNERABILITY FOUND (CWE-22: Path Traversal). Developer Agent used raw input `filename` in os.path.join. Attackers can escape storage root. Blocking commit.', delay: 8000 },
      { sender: 'auditor', message: '📤 Dispatching vulnerability context to Patcher Agent.', delay: 9000 },
      { sender: 'patcher', message: '🛠️ Patcher Agent activated. Reviewing vulnerability spec (CWE-22) in downloader.py...', delay: 10200 },
      { sender: 'patcher', message: '💡 Remediation Strategy: Clean input using basename, get absolute path, and assert folder prefix boundaries.', delay: 11400 },
      { sender: 'patcher', message: '⚙️ Rewriting code lines 13-22... adding basename and absolute boundary assertions.', delay: 12600 },
      { sender: 'patcher', message: '✅ Run AST Verification: Python compiler verification [PASS].', delay: 13800 },
      { sender: 'patcher', message: '📤 Code secured. Requesting verification scan.', delay: 14600 },
      { sender: 'auditor', message: '🔍 Auditor Agent activated for second-pass verification loop...', delay: 15600 },
      { sender: 'auditor', message: '✅ Verification scan complete: Proposed path validation secures resource and introduces 0 new threats. Patch APPROVED.', delay: 16800 },
      { sender: 'automator', message: '🚀 Git Automator Agent activated. Creating branch: `patchforge-secure-downloader`', delay: 17800 },
      { sender: 'automator', message: '💾 Staging changes. Creating commit: `security: prevent path traversal in downloader route`', delay: 19000 },
      { sender: 'automator', message: '📝 Drafting automated Pull Request description.', delay: 20200 },
      { sender: 'system', message: '🎉 Workflow complete! Pull Request #2 generated successfully. Code is secured.', delay: 21000 }
    ]
  },
  {
    id: 'go_cmd_injection',
    name: 'ping_service.go',
    displayName: 'Go Network Utility',
    prompt: 'Write a Go HTTP handler named "pingHandler" that accepts a "host" query parameter and runs the system "ping" command to test latency, writing the results to the response writer.',
    language: 'go',
    cwe: 'CWE-78: Command Injection',
    severity: 'CRITICAL',
    cvss: 9.8,
    compliance: ['OWASP A03:2021-Injection', 'SOC 2 CC6.6'],
    pocExploit: `curl "http://localhost:8080/ping?host=google.com;cat+/etc/passwd"

# Attack uses command separator ';' (or '&&') inside a system shell
# to run a secondary execution payload.
# Shell Command Executed:
# sh -c "ping -c 3 google.com;cat /etc/passwd"`,
    vulnerableCode: `package main

import (
	"fmt"
	"net/http"
	"os/exec"
)

// VULNERABLE: Direct command concatenation runs arbitrary shell commands (e.g. host=google.com; cat /etc/passwd)
func pingHandler(w http.ResponseWriter, r *http.Request) {
	host := r.URL.Query().Get("host")
	if host == "" {
		http.Error(w, "Host parameter is required", http.StatusBadRequest)
		return
	}

	// Unsanitized execution in system shell
	cmdStr := fmt.Sprintf("ping -c 3 %s", host)
	out, err := exec.Command("sh", "-c", cmdStr).CombinedOutput()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, "Error: %s\\nOutput: %s", err.Error(), string(out))
		return
	}

	fmt.Fprintf(w, "Ping Output:\\n%s", string(out))
}

func main() {
	http.HandleFunc("/ping", pingHandler)
	http.ListenAndServe(":8080", nil)
}`,
    patchedCode: `package main

import (
	"fmt"
	"net/http"
	"os/exec"
	"regexp"
)

// SECURED: Restrict input using an IP/Domain regex validation and avoid shell execution
var hostPattern = regexp.MustCompile(\`^[a-zA-Z0-9.-]+$\`)

func pingHandler(w http.ResponseWriter, r *http.Request) {
	host := r.URL.Query().Get("host")
	if host == "" {
		http.Error(w, "Host parameter is required", http.StatusBadRequest)
		return
	}

	// Validate input format
	if !hostPattern.MatchString(host) {
		http.Error(w, "Invalid host format", http.StatusBadRequest)
		return
	}

	// SECURED: Execute command directly without calling 'sh -c', passing host as argument
	out, err := exec.Command("ping", "-c", "3", host).CombinedOutput()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, "Error: %s\\nOutput: %s", err.Error(), string(out))
		return
	}

	fmt.Fprintf(w, "Ping Output:\\n%s", string(out))
}

func main() {
	http.HandleFunc("/ping", pingHandler)
	http.ListenAndServe(":8080", nil)
}`,
    explanation: 'The Developer Agent spawned a subshell (`sh -c`) using a string-formatted ping command. An attacker could append commands (e.g. `google.com; cat /etc/passwd`) to execute arbitrary host commands. The CyberSec Agent patched this by validating that input matches a strict domain/IP regex pattern, and executing the binary directly via argument parameters, rendering command injection impossible.',
    prSummary: `### 🛡️ PatchForge AI Code Security Report
This Pull Request secures a **CRITICAL** OS Command Injection vulnerability (CWE-78) introduced by the AI Developer Agent.

#### 🚨 Vulnerability Detected
In [ping_service.go](file:///e:/hackathon/test_codes/go_command_injection.go#L18-L19), the developer agent ran commands using a string builder inside a system shell:
\`\`\`go
cmdStr := fmt.Sprintf("ping -c 3 %s", host)
out, err := exec.Command("sh", "-c", cmdStr).CombinedOutput()
\`\`\`
This allowed shell meta-characters to execute secondary command payloads.

#### 🔧 Applied Patch
- Added strict regular expression filtering (\`^[a-zA-Z0-9.-]+$\`) to filter input parameters.
- Discarded shell invocation (\`sh -c\`). Invoked \`ping\` directly as a system executable, sending user input as a separate, safe string argument.

#### 📊 Security Audit Metrics
- **Severity**: CRITICAL (CVSS: 9.8)
- **Reviewer**: CyberSec Auditor Agent
- **Compliance Alignment**: OWASP A03:2021, SOC 2 CC6.6
- **Status**: Remediated & Validated`,
    agentLogs: [
      { sender: 'system', message: 'Initializing PatchForge AI Multi-Agent pipeline...', delay: 0 },
      { sender: 'developer', message: '💻 Developer Agent activated. Reading user prompt: "Write a Go HTTP handler that runs system ping..."', delay: 800 },
      { sender: 'developer', message: '💡 [Security Memory] Proactive Warning: Direct execution of shell scripts or binaries with raw user parameters yields command injection vectors. Use arguments array instead of formatting.', delay: 1800 },
      { sender: 'developer', message: '💻 Developer Agent: Generating Go server, registering ping handler, and using exec.Command with sh -c to execute ping...', delay: 3000 },
      { sender: 'developer', message: '💻 Developer Agent: Code generated successfully. Outputting ping_service.go to buffer.', delay: 4400 },
      { sender: 'system', message: '📥 Transferring generated code to CyberSec Auditor Agent for review...', delay: 5000 },
      { sender: 'auditor', message: '🔍 CyberSec Auditor Agent activated. Scanning AST files in ping_service.go...', delay: 6000 },
      { sender: 'auditor', message: '⚠️ Line 18: Found OS execution command spawning shell string "sh -c".', delay: 7000 },
      { sender: 'auditor', message: '🚨 CRITICAL VULNERABILITY FOUND (CWE-78: Command Injection). Developer Agent combined raw strings in shell interpreter commands. Spawning arbitrary programs is possible. Blocking commit.', delay: 8000 },
      { sender: 'auditor', message: '📤 Dispatching vulnerability context to Patcher Agent.', delay: 9000 },
      { sender: 'patcher', message: '🛠️ Patcher Agent activated. Reviewing vulnerability spec (CWE-78) in ping_service.go...', delay: 10200 },
      { sender: 'patcher', message: '💡 Remediation Strategy: 1. Add regex domain validation. 2. Remove "sh" shell command and call "ping" directly with arguments list.', delay: 11400 },
      { sender: 'patcher', message: '⚙️ Rewriting code lines 16-29... adding regex filter and argument lists to Command builder.', delay: 12600 },
      { sender: 'patcher', message: '✅ Run AST Verification: Go compiler check [PASS].', delay: 13800 },
      { sender: 'patcher', message: '📤 Code secured. Requesting verification scan.', delay: 14600 },
      { sender: 'auditor', message: '🔍 Auditor Agent activated for second-pass verification loop...', delay: 15600 },
      { sender: 'auditor', message: '✅ Verification scan complete: Regex patterns validate hostnames. Subprocess arguments escape commands. Patch APPROVED.', delay: 16800 },
      { sender: 'automator', message: '🚀 Git Automator Agent activated. Creating branch: `patchforge-secure-ping-service`', delay: 17800 },
      { sender: 'automator', message: '💾 Staging changes. Creating commit: `security: eliminate command injection in ping service`', delay: 19000 },
      { sender: 'automator', message: '📝 Drafting automated Pull Request description.', delay: 20200 },
      { sender: 'system', message: '🎉 Workflow complete! Pull Request #3 generated successfully. Code is secured.', delay: 21000 }
    ]
  },
  {
    id: 'secrets_leakage',
    name: 's3_connector.py',
    displayName: 'AWS Client Setup',
    prompt: 'Write a Python function using boto3 that connects to S3 to list all buckets in the "us-east-1" region.',
    language: 'python',
    cwe: 'CWE-798: Hardcoded Credentials',
    severity: 'HIGH',
    cvss: 8.9,
    compliance: ['OWASP A05:2021-Security Misconfiguration', 'SOC 2 CC6.1', 'PCI-DSS 8.2'],
    pocExploit: `# Credentials can be discovered by dumping the code or using Git history scans:
# git log -p | grep -E "AKIA[A-Z0-9]{16}"

AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"`,
    vulnerableCode: `import boto3

# VULNERABLE: Hardcoding private access keys and secrets in code is highly insecure
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

def list_s3_buckets():
    print("Initializing S3 Client...")
    # Client initialized with plaintext keys
    s3 = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name='us-east-1'
    )
    
    response = s3.list_buckets()
    buckets = [bucket['Name'] for bucket in response['Buckets']]
    print(f"Found {len(buckets)} S3 buckets: {', '.join(buckets)}")
    return buckets

if __name__ == "__main__":
    list_s3_buckets()`,
    patchedCode: `import os
import boto3

# SECURED: Secrets are loaded from environment variables rather than hardcoded in source
# Make sure to set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your system environment.

def list_s3_buckets():
    print("Initializing S3 Client...")
    
    # Boto3 client automatically reads credentials from environment variables:
    # - AWS_ACCESS_KEY_ID
    # - AWS_SECRET_ACCESS_KEY
    s3 = boto3.client('s3', region_name='us-east-1')
    
    response = s3.list_buckets()
    buckets = [bucket['Name'] for bucket in response['Buckets']]
    print(f"Found {len(buckets)} S3 buckets: {', '.join(buckets)}")
    return buckets

if __name__ == "__main__":
    list_s3_buckets()`,
    explanation: 'The Developer Agent hardcoded AWS IAM secret access keys inside variables. Pushing this code to GitHub would compromise the AWS account immediately. The CyberSec Agent patched this by removing the plaintext keys and allowing the client SDK to automatically load standard credentials from system environment variables.',
    prSummary: `### 🛡️ PatchForge AI Code Security Report
This Pull Request secures a **HIGH** severity Credential Leakage vulnerability (CWE-798) introduced by the AI Developer Agent.

#### 🚨 Vulnerability Detected
In [s3_connector.py](file:///e:/hackathon/test_codes/hardcoded_secrets.py#L4-L5), AWS credentials were hardcoded directly in plaintext:
\`\`\`python
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
\`\`\`
This posed an immediate threat of credential leakage and account hijack if pushed to version control systems.

#### 🔧 Applied Patch
- Deleted the plaintext \`AWS_ACCESS_KEY_ID\` and \`AWS_SECRET_ACCESS_KEY\` constants.
- Refactored \`boto3.client()\` to run without credential parameters, triggering default environment resolution logic.

#### 📊 Security Audit Metrics
- **Severity**: HIGH (CVSS: 8.9)
- **Reviewer**: CyberSec Auditor Agent
- **Compliance Alignment**: OWASP A05:2021, SOC 2 CC6.1, PCI-DSS 8.2
- **Status**: Remediated & Validated`,
    agentLogs: [
      { sender: 'system', message: 'Initializing PatchForge AI Multi-Agent pipeline...', delay: 0 },
      { sender: 'developer', message: '💻 Developer Agent activated. Reading user prompt: "Write a Python function using boto3 that connects to S3..."', delay: 800 },
      { sender: 'developer', message: '💡 [Security Memory] Proactive Warning: Hardcoded credentials (AWS, Database, API Tokens) are easily leaked via code commits. Extract secrets to config modules.', delay: 1800 },
      { sender: 'developer', message: '💻 Developer Agent: Setting up boto3 list_buckets, hardcoding placeholder AWS credentials for immediate testing...', delay: 3000 },
      { sender: 'developer', message: '💻 Developer Agent: Code generated successfully. Outputting s3_connector.py to buffer.', delay: 4400 },
      { sender: 'system', message: '📥 Transferring generated code to CyberSec Auditor Agent for review...', delay: 5000 },
      { sender: 'auditor', message: '🔍 CyberSec Auditor Agent activated. Checking code for plain credential storage...', delay: 6000 },
      { sender: 'auditor', message: '⚠️ Line 4: Plaintext AWS Access ID (AKIA...) string found.', delay: 7000 },
      { sender: 'auditor', message: '🚨 CRITICAL VULNERABILITY FOUND (CWE-798: Hardcoded Credentials). Developer Agent left plaintext AWS access keys inside client module. Keys are vulnerable to repository leaks. Blocking commit.', delay: 8000 },
      { sender: 'auditor', message: '📤 Dispatching vulnerability context to Patcher Agent.', delay: 9000 },
      { sender: 'patcher', message: '🛠️ Patcher Agent activated. Reviewing vulnerability spec (CWE-798) in s3_connector.py...', delay: 10200 },
      { sender: 'patcher', message: '💡 Remediation Strategy: Strip hardcoded constants and refactor client initialization to load credentials from standard environment variables.', delay: 11400 },
      { sender: 'patcher', message: '⚙️ Rewriting code lines 3-6... removing credentials and cleaning constructor parameters.', delay: 12600 },
      { sender: 'patcher', message: '✅ Run AST Verification: Python compile syntax check [PASS].', delay: 13800 },
      { sender: 'patcher', message: '📤 Code secured. Requesting verification scan.', delay: 14600 },
      { sender: 'auditor', message: '🔍 Auditor Agent activated for second-pass verification loop...', delay: 15600 },
      { sender: 'auditor', message: '✅ Verification scan complete: Plaintext AWS variables removed. Environment-based auth confirmed. Patch APPROVED.', delay: 16800 },
      { sender: 'automator', message: '🚀 Git Automator Agent activated. Creating branch: `patchforge-secure-s3-connector`', delay: 17800 },
      { sender: 'automator', message: '💾 Staging changes. Creating commit: `security: remove plaintext credentials from S3 list API`', delay: 19000 },
      { sender: 'automator', message: '📝 Drafting automated Pull Request description.', delay: 20200 },
      { sender: 'system', message: '🎉 Workflow complete! Pull Request #4 generated successfully. Code is secured.', delay: 21000 }
    ]
  }
];
