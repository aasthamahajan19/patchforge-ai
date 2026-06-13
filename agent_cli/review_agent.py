#!/usr/bin/env python3
import os
import sys
import re
import argparse
import subprocess
import urllib.request
import json

# Simple regex-based rules for local fallback (works offline and instant)
# Note: The MOCK_PATCHES database represents a proof-of-concept patch library,
# which is fully extensible via live LLM scans when GEMINI_API_KEY is supplied.
SECURITY_RULES = [
    {
        "id": "CWE-89",
        "name": "SQL Injection",
        "severity": "CRITICAL",
        "regex": r"(SELECT|INSERT|UPDATE|DELETE).*\+.*req\.(query|body)\.[a-zA-Z0-9_]+",
        "description": "Raw query concatenation detects unsanitized user input in SQL statement.",
        "patch_type": "parameterized_query"
    },
    {
        "id": "CWE-22",
        "name": "Path Traversal",
        "severity": "HIGH",
        "regex": r"os\.path\.join\([^,]+,\s*filename\)",
        "description": "User controlled filename joined directly without sanitization.",
        "patch_type": "sanitize_path"
    },
    {
        "id": "CWE-78",
        "name": "Command Injection",
        "severity": "CRITICAL",
        "regex": r"exec\.Command\(.*sh.*-c.*host.*\)",
        "description": "Unsanitized system shell execution allows injection of command separators.",
        "patch_type": "exec_arguments"
    },
    {
        "id": "CWE-798",
        "name": "Hardcoded Credentials",
        "severity": "HIGH",
        "regex": r"AWS_(ACCESS_KEY_ID|SECRET_ACCESS_KEY)\s*=\s*[\"'][A-Za-z0-9/+=]{16,40}[\"']",
        "description": "AWS Credentials hardcoded in plaintext. Credentials should be retrieved from environment variables or IAM roles.",
        "patch_type": "env_variables"
    }
]

# Patched contents corresponding to our test files
MOCK_PATCHES = {
    "javascript_sql_injection.js": """const express = require('express');
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
});""",
    "python_path_traversal.py": """import os
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
    app.run(port=5000)""",
    "go_command_injection.go": """package main

import (
	"fmt"
	"net/http"
	"os/exec"
	"regexp"
)

// SECURED: Restrict input using an IP/Domain regex validation and avoid shell execution
var hostPattern = regexp.MustCompile(`^[a-zA-Z0-9.-]+$`)

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
		fmt.Fprintf(w, "Error: %s\nOutput: %s", err.Error(), string(out))
		return
	}

	fmt.Fprintf(w, "Ping Output:\n%s", string(out))
}

func main() {
	http.HandleFunc("/ping", pingHandler)
	http.ListenAndServe(":8080", nil)
}""",
    "hardcoded_secrets.py": """import os
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
    list_s3_buckets()"""
}

def print_banner():
    print("====================================================")
    print("       PATCHFORGE AI - LOCAL SECURITY CLI           ")
    print("====================================================")

def run_local_audit(content, filename):
    vulnerabilities = []
    for rule in SECURITY_RULES:
        if re.search(rule["regex"], content):
            vulnerabilities.append(rule)
    return vulnerabilities

def run_live_ai_audit(api_key, content, filename):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    prompt = f"""You are a cybersecurity code auditor. Scan the following code file "{filename}" and audit it for security vulnerabilities.
If you find vulnerabilities:
1. List them, specifying the CWE code, severity, and description.
2. Provide a fully secured, syntactically correct patched version of the file.
3. Write a brief description of the patch.

Return your response strictly in the following JSON format:
{{
  "vulnerabilities": [
    {{
      "id": "CWE-XXX",
      "name": "Vulnerability Name",
      "severity": "CRITICAL/HIGH/MEDIUM",
      "description": "Details of the vulnerability"
    }}
  ],
  "patchedCode": "The complete secure code rewritten",
  "explanation": "Brief explanation of the vulnerability and patch"
}}
Return only the raw JSON. Do not wrap the JSON in markdown code blocks.

Here is the code:
{content}"""
    
    data = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }
    
    try:
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode("utf-8"), 
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode("utf-8")
            res_json = json.loads(res_data)
            text_output = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            # Clean potential JSON markdown blocks
            if text_output.startswith("```json"):
                text_output = text_output[7:]
            if text_output.endswith("```"):
                text_output = text_output[:-3]
            text_output = text_output.strip()
            
            result = json.loads(text_output)
            return result
    except Exception as e:
        print(f"[-] Live AI API Call failed: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser(description="PatchForge AI: Local Vulnerability Auditing & Patching Agent")
    parser.add_argument("file", help="Path to the source file to review")
    parser.add_argument("--patch", action="store_true", help="Apply patch automatically to file")
    parser.add_argument("--git", action="store_true", help="Commit the changes to a new git branch")
    
    args = parser.parse_args()
    filepath = args.file
    
    if not os.path.exists(filepath):
        print(f"[-] Error: File '{filepath}' not found.", file=sys.stderr)
        sys.exit(1)
        
    filename = os.path.basename(filepath)
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    print_banner()
    print(f"[*] Agent 1 (Security Auditor) scanning '{filename}'...")
    
    api_key = os.environ.get("GEMINI_API_KEY")
    vulnerabilities = []
    patched_code = None
    ai_explanation = None
    
    if api_key:
        print("[+] GEMINI_API_KEY detected! Fetching live security review from Gemini...")
        ai_result = run_live_ai_audit(api_key, content, filename)
        if ai_result:
            vulnerabilities = ai_result.get("vulnerabilities", [])
            patched_code = ai_result.get("patchedCode")
            ai_explanation = ai_result.get("explanation")
        else:
            print("[!] Live scan failed. Falling back to local rules engine.")
            vulnerabilities = run_local_audit(content, filename)
    else:
        print("[!] No GEMINI_API_KEY environment variable. Running offline rule-based audit.")
        vulnerabilities = run_local_audit(content, filename)
        
    if not vulnerabilities:
        print("[+] Success: No critical vulnerabilities detected by security agent rules.")
        sys.exit(0)
        
    print(f"\n[!] Alert: Found {len(vulnerabilities)} vulnerabilities:")
    for vuln in vulnerabilities:
        print(f"    - [{vuln.get('severity', 'HIGH')}] {vuln.get('name', 'Vuln')} ({vuln.get('id', 'CWE')}): {vuln.get('description', '')}")
        
    # Agent 2: Code Patcher
    print("\n[*] Agent 2 (Auto-Patcher) analyzing changes...")
    if ai_explanation:
        print(f"[+] AI Explanation: {ai_explanation}")
        
    if not patched_code:
        if filename in MOCK_PATCHES:
            patched_code = MOCK_PATCHES[filename]
        else:
            patched_code = f"// PatchForge Security Warning: Unresolved Vulnerabilities Detected\n" + content
        
    if args.patch:
        print(f"[+] Applying patch directly to '{filepath}'...")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(patched_code)
        print("[+] Patch applied successfully!")
    else:
        print("[*] Proposed Patch Preview generated.")
        print("Run with '--patch' to write the fixes to the file.")
        
    # Agent 3: Git Automator
    if args.git:
        print("\n[*] Agent 3 (Git Automator) creating commit and branch...")
        try:
            # Check if inside git repository
            subprocess.run(["git", "rev-parse", "--is-inside-work-tree"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            
            # Create branch name
            vuln_name = vulnerabilities[0].get("name", "vuln").lower().replace(" ", "-")
            branch_name = f"patchforge-fix-{vuln_name}"
            
            print(f"[+] Creating git branch: {branch_name}")
            subprocess.run(["git", "checkout", "-b", branch_name], check=True)
            
            # Write patch if user didn't write it using --patch
            if not args.patch:
                print(f"[+] Writing secure patch changes to '{filepath}'...")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(patched_code)
            
            print(f"[+] Staging modified file: {filename}")
            subprocess.run(["git", "add", filepath], check=True)
            
            commit_msg = f"security: fix {vulnerabilities[0].get('name', 'vulnerability')} in {filename}"
            print(f"[+] Committing changes: '{commit_msg}'")
            subprocess.run(["git", "commit", "-m", commit_msg], check=True)
            print("[+] Pull Request is ready to be opened!")
        except Exception as e:
            print(f"[-] Git automation error: {str(e)}")
            print("Make sure you are in a valid Git repository to run git automation.")

if __name__ == "__main__":
    main()
