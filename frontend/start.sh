#!/bin/bash

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Find node path before potentially losing it
if command -v node &> /dev/null; then
    NODE_PATH="$(command -v node)"
else
    echo "ERROR: node is not found in PATH!"
    exit 1
fi

# Check for root privileges
if [ "$EUID" -ne 0 ]; then
    echo "Requesting root privileges..."
    echo "Please enter your password when prompted."
    # Preserve PATH and other important env vars
    sudo PATH="$PATH" NODE_PATH="$NODE_PATH" "$0" "$@"
    exit $?
fi

# Function to check if backend is running
check_backend_running() {
    if ps aux | grep -v grep | grep -q "node backend/index.js"; then
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
    
    # Start backend with nohup (using full node path)
    nohup "$NODE_PATH" backend/index.js > backend.log 2>&1 &
    BACKEND_PID=$!
    
    # Give it a moment to start
    sleep 2
    
    if ps -p $BACKEND_PID > /dev/null; then
        echo "[SUCCESS] Backend server started with PID: $BACKEND_PID"
        echo ""
        echo "Logs are in: backend.log"
        echo "To view logs: tail -f backend.log"
    else
        echo "[ERROR] Failed to start backend server!"
        echo "Check backend.log for details"
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
    
    # Kill node processes
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
        echo "[SUCCESS] Backend stopped!"
    fi
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

# Function to follow logs
follow_logs() {
    clear
    echo "================================================================================"
    echo "                              Following L4D2 Logs"
    echo "================================================================================"
    echo ""
    echo "Press Ctrl+C to stop following logs"
    echo "------------------------------------------------------------------------"
    echo ""
    
    if [ -f "backend.log" ]; then
        tail -f backend.log
    else
        echo "No log file found (backend.log)"
        echo ""
        read -p "Press Enter to return to menu..."
    fi
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
    echo "  4. View Logs (last 50 lines)"
    echo "  5. Follow Logs (live)"
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
            follow_logs
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
