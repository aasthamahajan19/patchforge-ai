import os
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
    app.run(port=5000)
