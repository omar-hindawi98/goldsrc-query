FROM ubuntu:22.04

RUN dpkg --add-architecture i386 \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        lib32gcc-s1 \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install steamcmd
RUN curl -fsSL https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz \
    | tar -xz -C /usr/local/bin

# Download HLDS (app 90 = Half-Life Dedicated Server, anonymous login)
RUN steamcmd +login anonymous +app_update 90 validate +quit

WORKDIR /root/Steam/steamapps/common/Half-Life

EXPOSE 27015/udp
EXPOSE 27015/tcp

ENTRYPOINT ["./hlds_run"]
CMD ["-game", "cstrike", \
     "+map", "de_dust2", \
     "+maxplayers", "12", \
     "+rcon_password", "e2e_test_password", \
     "+sv_password", "", \
     "-nomaster", \
     "-insecure"]
