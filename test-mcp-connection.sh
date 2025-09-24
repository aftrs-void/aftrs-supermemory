#!/bin/bash

# SuperMemory MCP Connection Test
echo "🔍 Testing SuperMemory MCP Connection..."
echo ""

# Check if configuration exists
CONFIG_FILE="/home/hg/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ MCP configuration file not found: $CONFIG_FILE"
    exit 1
fi

echo "✅ MCP configuration file exists"

# Verify configuration content
if grep -q "api-supermemory-ai" "$CONFIG_FILE"; then
    echo "✅ SuperMemory MCP server configured"
else
    echo "❌ SuperMemory MCP server not found in configuration"
    exit 1
fi

if grep -q "Authorization:Bearer" "$CONFIG_FILE"; then
    echo "✅ Authentication header configured"
else
    echo "❌ Authentication header missing"
    exit 1
fi

if grep -q "x-sm-project:aftrs-void" "$CONFIG_FILE"; then
    echo "✅ Project header configured for aftrs-void"
else
    echo "❌ Project header missing"
    exit 1
fi

# Test API connectivity
echo ""
echo "🌐 Testing API connectivity..."
API_KEY="sm_6ZGopX4A3gvVKq8pLjwBZH_QlEUlRUFXWpxNhWJHRLBqQAzsPsyKFwsyRAObqSCysoRbnowHKgLZiqkPDIjYAfr"

RESPONSE=$(curl -s -H "Authorization: Bearer $API_KEY" -H "x-sm-project: aftrs-void" https://api.supermemory.ai/mcp)

if echo "$RESPONSE" | grep -q "Method not allowed"; then
    echo "✅ API endpoint responds correctly (expected 'Method not allowed' for GET)"
elif echo "$RESPONSE" | grep -q "error"; then
    echo "⚠️  API responded with error: $RESPONSE"
else
    echo "❓ Unexpected API response: $RESPONSE"
fi

echo ""
echo "📋 Configuration Summary:"
echo "  - MCP Server: api-supermemory-ai"
echo "  - Project: aftrs-void"
echo "  - Authentication: Bearer token configured"
echo "  - Config Location: $CONFIG_FILE"

echo ""
echo "🔄 Next Steps:"
echo "  1. Restart VS Code/Cursor to load the MCP server"
echo "  2. Check Cline extension for MCP server status"
echo "  3. Try asking Cline to search your SuperMemory knowledge base"

echo ""
echo "✨ SuperMemory MCP setup verification complete!"
