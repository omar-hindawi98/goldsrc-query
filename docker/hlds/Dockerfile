FROM ubuntu:22.04

ENV STEAMCMD_DIR=/opt/steamcmd
ENV HLDS_DIR=/opt/hlds

RUN dpkg --add-architecture i386 \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        lib32gcc-s1 \
        lib32stdc++6 \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install steamcmd
RUN mkdir -p "$STEAMCMD_DIR" \
    && curl -fsSL https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz \
       | tar -xz -C "$STEAMCMD_DIR"

# Download HLDS (app 90 = Half-Life Dedicated Server, anonymous login)
RUN "$STEAMCMD_DIR/steamcmd.sh" \
        +force_install_dir "$HLDS_DIR" \
        +login anonymous \
        +app_update 90 validate \
        +quit

COPY start.sh /start.sh
RUN chmod +x /start.sh

WORKDIR $HLDS_DIR

EXPOSE 27015/udp
EXPOSE 27015/tcp

ENTRYPOINT ["/start.sh"]
CMD ["-game", "cstrike", \
     "+map", "de_dust2", \
     "+maxplayers", "12", \
     "+rcon_password", "e2e_test_password", \
     "+sv_password", "", \
     "-nomaster", \
     "-insecure"]
