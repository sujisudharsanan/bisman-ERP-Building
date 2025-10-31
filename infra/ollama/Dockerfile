FROM ollama/ollama:latest

# Bind Ollama to the platform-provided $PORT
ENV OLLAMA_HOST=0.0.0.0:${PORT}

# Optional: keep models warm longer
ENV OLLAMA_KEEP_ALIVE=15m

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Persist models/cache via Railway Volume mounted at /root/.ollama
VOLUME ["/root/.ollama"]

EXPOSE 11434

CMD ["/entrypoint.sh"]
