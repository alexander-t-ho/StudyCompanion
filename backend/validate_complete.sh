#!/bin/bash
# Complete Platform Integration Validation

echo "============================================================"
echo "Complete Platform Integration Validation"
echo "============================================================"
echo ""

# Run structure validation
echo "1. Running structure validation..."
echo ""
ruby validate_platform_integration.rb
echo ""

# Check if we can test API endpoints
if command -v curl &> /dev/null; then
    echo "2. Testing API endpoints..."
    echo ""
    ./validate_api_endpoints.sh
else
    echo "2. Skipping API endpoint tests (curl not found)"
    echo ""
fi

echo ""
echo "============================================================"
echo "Validation Complete"
echo "============================================================"

