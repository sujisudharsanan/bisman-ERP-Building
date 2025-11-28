FROM alpine:latest
RUN echo "========================================" && \
    echo "ERROR: Railway Root Directory is WRONG!" && \
    echo "========================================" && \
    echo "" && \
    echo "Railway is using this Dockerfile at the ROOT" && \
    echo "But it should use: my-frontend/Dockerfile" && \
    echo "" && \
    echo "FIX: In Railway Dashboard Settings" && \
    echo "Set Root Directory to: my-frontend" && \
    echo "" && \
    exit 1
CMD ["echo", "This should never run"]