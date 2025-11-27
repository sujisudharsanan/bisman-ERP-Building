#!/bin/bash

# 🧪 Test Railway Deployment

echo "🧪 Testing BISMAN ERP Railway Deployment"
echo "=========================================="
echo ""

BACKEND_URL="https://bisman-erp-backend-production.up.railway.app"
FRONTEND_URL="https://bisman-erp-frontend-production.up.railway.app"

echo "⏳ Waiting 30 seconds for services to fully start..."
sleep 30

echo ""
echo "1️⃣ Testing Backend Health..."
echo "----------------------------"
BACKEND_HEALTH=$(curl -s "$BACKEND_URL/api/health")
echo "Response: $BACKEND_HEALTH"
if echo "$BACKEND_HEALTH" | grep -q "ok"; then
    echo "✅ Backend is healthy!"
else
    echo "❌ Backend health check failed"
fi

echo ""
echo "2️⃣ Testing Frontend..."
echo "----------------------------"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
echo "HTTP Status: $FRONTEND_STATUS"
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend is responding!"
else
    echo "❌ Frontend not responding properly"
fi

echo ""
echo "3️⃣ Testing Login Endpoint..."
echo "----------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_hub_incharge@bisman.demo","password":"Demo@123"}' \
  | head -c 200)
echo "Response: $LOGIN_RESPONSE"

echo ""
echo "=========================================="
echo "🎯 Manual Testing:"
echo "=========================================="
echo ""
echo "Open in browser: $FRONTEND_URL/auth/login"
echo ""
echo "Login credentials:"
echo "  Email: demo_hub_incharge@bisman.demo"
echo "  Password: Demo@123"
echo ""
echo "✅ If login works, your app is fully deployed!"
