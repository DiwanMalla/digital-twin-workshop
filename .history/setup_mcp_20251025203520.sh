#!/bin/bash
# Setup script for Digital Twin MCP Server

echo "🚀 Digital Twin MCP Server Setup"
echo "=================================="
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file with:"
    echo "  UPSTASH_VECTOR_REST_URL=your_url"
    echo "  UPSTASH_VECTOR_REST_TOKEN=your_token"
    echo "  GROQ_API_KEY=your_key"
    exit 1
fi

echo "✅ Found .env file"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please run: python3 -m venv venv"
    exit 1
fi

echo "✅ Found virtual environment"

# Activate venv and install dependencies
echo ""
echo "📦 Installing dependencies..."
source venv/bin/activate
pip install -q -r requirements.txt

echo "✅ Dependencies installed"
echo ""

# Run tests
echo "🧪 Running tests..."
echo ""
python test_mcp_server.py

# Check test result
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo ""
    
    # Ask user if they want to install to Claude Desktop
    read -p "📋 Install to Claude Desktop? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Determine Claude config path based on OS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
        else
            echo "❌ Unsupported OS. Please manually copy claude_desktop_config.json"
            exit 1
        fi
        
        # Create directory if it doesn't exist
        mkdir -p "$CLAUDE_CONFIG_DIR"
        
        # Backup existing config if it exists
        if [ -f "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" ]; then
            echo "📦 Backing up existing config..."
            cp "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" "$CLAUDE_CONFIG_DIR/claude_desktop_config.json.backup"
            echo "✅ Backup saved to: $CLAUDE_CONFIG_DIR/claude_desktop_config.json.backup"
        fi
        
        # Copy config
        cp claude_desktop_config.json "$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
        echo "✅ Config installed to: $CLAUDE_CONFIG_DIR/claude_desktop_config.json"
        echo ""
        echo "🎉 Setup complete!"
        echo ""
        echo "📋 Next steps:"
        echo "1. Restart Claude Desktop"
        echo "2. Try asking Claude:"
        echo "   - 'Query my digital twin about my React experience'"
        echo "   - 'Show me my technical skills'"
        echo "   - 'Analyze how well I fit this job description: [paste job]'"
        echo ""
    else
        echo ""
        echo "⚠️ Config not installed. To install manually:"
        echo "cp claude_desktop_config.json '$CLAUDE_CONFIG_DIR/claude_desktop_config.json'"
        echo ""
    fi
else
    echo ""
    echo "❌ Tests failed. Please fix the errors above before deploying."
    exit 1
fi
