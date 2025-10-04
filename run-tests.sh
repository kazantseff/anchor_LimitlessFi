#!/bin/bash

# Limitless Market Test Runner
echo "🚀 Running Limitless Market Tests..."

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install Anchor first."
    exit 1
fi

# Build the program first
echo "📦 Building program..."
anchor build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors first."
    exit 1
fi

# Start local validator
echo "🏃 Starting local validator..."
anchor localnet &
VALIDATOR_PID=$!

# Wait for validator to start
sleep 5

# Run tests
echo "🧪 Running tests..."
anchor test

# Store test result
TEST_RESULT=$?

# Stop validator
echo "🛑 Stopping validator..."
kill $VALIDATOR_PID

# Exit with test result
exit $TEST_RESULT
