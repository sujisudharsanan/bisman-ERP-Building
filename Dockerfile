# Railway Diagnostic Dockerfile - Build Time: 2025-11-28 20:40
# This file should NOT be used - it's only here to show Railway is looking in the wrong place

FROM alpine:latest

# Display error message
RUN echo "=============================================" && \
    echo "❌ RAILWAY ROOT DIRECTORY IS WRONG!" && \
    echo "=============================================" && \
    echo "" && \
    echo "Railway is using: ./Dockerfile (at repository root)" && \
    echo "Should be using: my-frontend/Dockerfile" && \
    echo "" && \
    echo "📋 FIX IN RAILWAY DASHBOARD:" && \
    echo "1. Click your frontend service" && \
    echo "2. Go to Settings tab" && \
    echo "3. Find 'Root Directory' field" && \
    echo "4. Set to: my-frontend" && \
    echo "5. Click Save" && \
    echo "6. Redeploy" && \
    echo "" && \
    echo "❌ DO NOT USE THIS DOCKERFILE!" && \
    exit 1

CMD ["echo", "ERROR: This should never run"]