FROM jrottenberg/ffmpeg

RUN apt-get update && apt-get install -y curl && \
  curl -sL https://deb.nodesource.com/setup_6.x | bash - && \
  apt-get install -y nodejs build-essential

RUN mkdir /app

WORKDIR /app

ENTRYPOINT []
CMD ["/bin/bash"]
