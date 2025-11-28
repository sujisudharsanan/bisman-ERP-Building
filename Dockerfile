# UNIQUE_BUILD_ID: 20251129-001122-RAILWAY-DIAGNOSTIC
# This is a diagnostic Dockerfile to prove Railway Root Directory is not set

FROM node:20-alpine

WORKDIR /diagnostic

RUN echo "================================================" && \
    echo "🚨 RAILWAY CONFIGURATION ERROR DETECTED 🚨" && \
    echo "================================================" && \
    echo "" && \
    echo "Railway is building from: PROJECT ROOT" && \
    echo "Railway should build from: my-frontend/" && \
    echo "" && \
    echo "SOLUTION:" && \
    echo "In Railway Dashboard → Settings → Root Directory" && \
    echo "Set to: my-frontend" && \
    echo "" && \
    echo "Current Dockerfile location: ./Dockerfile (ROOT)" && \
    echo "Correct Dockerfile location: my-frontend/Dockerfile" && \
    echo "" && \
    exit 1

CMD ["node", "--version"]
