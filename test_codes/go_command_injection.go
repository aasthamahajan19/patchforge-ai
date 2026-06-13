package main

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
		fmt.Fprintf(w, "Error: %s\nOutput: %s", err.Error(), string(out))
		return
	}

	fmt.Fprintf(w, "Ping Output:\n%s", string(out))
}

func main() {
	http.HandleFunc("/ping", pingHandler)
	http.ListenAndServe(":8080", nil)
}
