#!/bin/bash

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check for root privileges
if [ "$EUID" -ne 0 ]; then
    echo "Requesting root privileges..."
    echo "Please enter your password when prompted."
    sudo "$0" "$@"
    exit $?
fi

# Function to check if backend is running
check_backend_running() {
    if screen -list | grep -q "l4d2-backend"; then
        return 0
    fi
    if tmux has-session -t l4d2-backend 2>/dev/null; then
        return 0
    fi
    if ps aux | grep -q "node backend/index.js" | grep -v grep; then
        return 0
    fi
    return 1
}

# Function to start backend
start_backend() {
    clear
    echo "================================================================================"
    echo "                              Starting L4D2 Manager"
    echo "================================================================================"
    echo ""
    
    if check_backend_running; then
        echo "[INFO] Backend is already running!"
        echo ""
        read -p "Press Enter to return to menu..."
        return
    fi
    
    echo "Starting L4D2 Manager Backend Service..."
    echo "Please wait, initializing server..."
    echo ""
    
    # Start backend in background and keep it running
    if command -v screen &> /dev/null; then
        # Use screen if available
        screen -dmS l4d2-backend bash -c "cd \"$SCRIPT_DIR\" && node backend/index.js"
        echo "[SUCCESS] Backend server started in screen session!"
        echo ""
        echo "To view the backend: screen -r l4d2-backend"
        echo "To detach from screen: Press Ctrl+A then D"
    elif command -v tmux &> /dev/null; then
        # Use tmux if available
        tmux new-session -d -s l4d2-backend "cd \"$SCRIPT_DIR\" && node backend/index.js"
        echo "[SUCCESS] Backend server started in tmux session!"
        echo ""
        echo "To view the backend: tmux attach -t l4d2-backend"
        echo "To detach from tmux: Press Ctrl+B then D"
    else
        # Fallback to nohup
        nohup node backend/index.js > backend.log 2>&1 &
        BACKEND_PID=$!
        echo "[SUCCESS] Backend server started with PID: $BACKEND_PID"
        echo ""
        echo "Logs are in: backend.log"
    fi
    echo ""
    read -p "Press Enter to return to menu..."
}

# Function to stop backend
stop_backend() {
    clear
    echo "================================================================================"
    echo "                              Stopping L4D2 Manager"
    echo "================================================================================"
    echo ""
    
    if ! check_backend_running; then
        echo "[INFO] Backend is not running!"
        echo ""
        read -p "Press Enter to return to menu..."
        return
    fi
    
    echo "Stopping backend server..."
    echo ""
    
    # Check and stop screen session
    if screen -list | grep -q "l4d2-backend"; then
        screen -S l4d2-backend -X quit
        echo "[SUCCESS] Stopped screen session: l4d2-backend"
    fi
    
    # Check and stop tmux session
    if tmux has-session -t l4d2-backend 2>/dev/null; then
        tmux kill-session -t l4d2-backend
        echo "[SUCCESS] Stopped tmux session: l4d2-backend"
    fi
    
    # Kill any node processes running backend/index.js
    BACKEND_PIDS=$(ps aux | grep "node backend/index.js" | grep -v grep | awk '{print $2}')
    if [ -n "$BACKEND_PIDS" ]; then
        echo "Killing node processes: $BACKEND_PIDS"
        kill $BACKEND_PIDS 2>/dev/null
        sleep 1
        # Force kill if still running
        BACKEND_PIDS=$(ps aux | grep "node backend/index.js" | grep -v grep | awk '{print $2}')
        if [ -n "$BACKEND_PIDS" ]; then
            kill -9 $BACKEND_PIDS 2>/dev/null
        fi
        echo "[SUCCESS] Stopped backend node processes"
    fi
    
    # Also kill any node processes from the project directory
    NODE_PIDS=$(ps aux | grep "node" | grep "$SCRIPT_DIR" | grep -v grep | awk '{print $2}')
    if [ -n "$NODE_PIDS" ]; then
        echo "Killing project node processes: $NODE_PIDS"
        kill $NODE_PIDS 2>/dev/null
        sleep 1
        NODE_PIDS=$(ps aux | grep "node" | grep "$SCRIPT_DIR" | grep -v grep | awk '{print $2}')
        if [ -n "$NODE_PIDS" ]; then
            kill -9 $NODE_PIDS 2>/dev/null
        fi
    fi
    
    echo ""
    echo "[SUCCESS] Backend stopped!"
    echo ""
    read -p "Press Enter to return to menu..."
}

# Function to view backend status
view_status() {
    clear
    echo "================================================================================"
    echo "                              L4D2 Manager Status"
    echo "================================================================================"
    echo ""
    
    echo "Backend Status:"
    if check_backend_running; then
        echo "  [RUNNING] Backend is active"
    else
        echo "  [STOPPED] Backend is not running"
    fi
    echo ""
    
    echo "Screen Sessions:"
    if command -v screen &> /dev/null; then
        screen -list 2>/dev/null || echo "  No screen sessions found"
    else
        echo "  screen not installed"
    fi
    echo ""
    
    echo "Tmux Sessions:"
    if command -v tmux &> /dev/null; then
        tmux list-sessions 2>/dev/null || echo "  No tmux sessions found"
    else
        echo "  tmux not installed"
    fi
    echo ""
    
    echo "Node Processes:"
    ps aux | grep -E "(node|backend)" | grep -v grep || echo "  No node processes found"
    echo ""
    
    # Get port
    PORT=11214
    if [ -f ".env" ]; then
        PORT=$(grep -E "^VITE_PORT=" .env | cut -d'=' -f2)
        if [ -z "$PORT" ]; then
            PORT=11214
        fi
    fi
    echo "Access URL: http://localhost:$PORT"
    echo ""
    read -p "Press Enter to return to menu..."
}

# Function to view backend logs
view_logs() {
    clear
    echo "================================================================================"
    echo "                              L4D2 Manager Logs"
    echo "================================================================================"
    echo ""
    
    if [ -f "backend.log" ]; then
        echo "Showing last 50 lines of backend.log:"
        echo "------------------------------------------------------------------------"
        tail -n 50 backend.log
        echo "------------------------------------------------------------------------"
    else
        echo "No log file found (backend.log)"
    fi
    echo ""
    read -p "Press Enter to return to menu..."
}

# Function to attach to backend session
attach_backend() {
    if screen -list | grep -q "l4d2-backend"; then
        echo "Attaching to screen session..."
        echo "Press Ctrl+A then D to detach"
        sleep 1
        screen -r l4d2-backend
        return
    fi
    
    if tmux has-session -t l4d2-backend 2>/dev/null; then
        echo "Attaching to tmux session..."
        echo "Press Ctrl+B then D to detach"
        sleep 1
        tmux attach -t l4d2-backend
        return
    fi
    
    echo "[ERROR] No screen or tmux session found!"
    echo ""
    read -p "Press Enter to return to menu..."
}

# Main menu function
show_menu() {
    clear
    echo "================================================================================"
    echo "                              L4D2 Manager Server"
    echo "================================================================================"
    echo "                        Left 4 Dead 2 Server Management Tool"
    echo "================================================================================"
    echo ""
    
    # Get port
    PORT=11214
    if [ -f ".env" ]; then
        PORT=$(grep -E "^VITE_PORT=" .env | cut -d'=' -f2)
        if [ -z "$PORT" ]; then
            PORT=11214
        fi
    fi
    
    echo "Current Status:"
    if check_backend_running; then
        echo "  [RUNNING] Backend is active"
        echo "  Access URL: http://localhost:$PORT"
    else
        echo "  [STOPPED] Backend is not running"
    fi
    echo ""
    echo "Please select an option:"
    echo ""
    echo "  1. Start Backend"
    echo "  2. Stop Backend"
    echo "  3. View Status"
    echo "  4. View Logs"
    if command -v screen &> /dev/null || command -v tmux &> /dev/null; then
        echo "  5. Attach to Backend Session"
    fi
    echo "  0. Exit"
    echo ""
    read -p "Enter your choice [0-5]: " choice
    
    case $choice in
        1)
            start_backend
            ;;
        2)
            stop_backend
            ;;
        3)
            view_status
            ;;
        4)
            view_logs
            ;;
        5)
            attach_backend
            ;;
        0)
            echo ""
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo ""
            echo "Invalid option! Please try again."
            sleep 1
            ;;
    esac
}

# Main loop
while true; do
    show_menu
done
