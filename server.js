
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const OWNER_PLAYER_ID = String(
    process.env.OWNER_PLAYER_ID || ""
).trim();

const wss = new WebSocket.Server({ port: PORT });
const players = new Map();

console.log(`Chat server running on port ${PORT}`);

if (!OWNER_PLAYER_ID) {
    console.warn("WARNING: OWNER_PLAYER_ID is not configured!");
}

wss.on("connection", (socket) => {
    console.log("Player connected");

    socket.on("message", (data) => {
        try {
            const packet = JSON.parse(data.toString());

            if (packet.type === "join") {
                const playerId = String(
                    packet.player_id || ""
                ).trim();

                const displayName = String(
                    packet.display_name || "Player"
                ).trim().slice(0, 40);

                if (!playerId) {
                    socket.close(1008, "Player ID required");
                    return;
                }

                const isOwner =
                    OWNER_PLAYER_ID !== "" &&
                    playerId === OWNER_PLAYER_ID;

                players.set(socket, {
                    player_id: playerId,
                    display_name: displayName || "Player",
                    is_owner: isOwner
                });

                console.log(
                    `${displayName} joined the chat` +
                    (isOwner ? " [OWNER]" : "")
                );

                return;
            }

            if (packet.type === "chat") {
                const player = players.get(socket);

                if (!player) {
                    return;
                }

                const message = String(
                    packet.message || ""
                ).trim();

                if (
                    message.length === 0 ||
                    message.length > 200
                ) {
                    return;
                }

                const response = {
                    type: "chat",
                    player_id: player.player_id,
                    display_name: player.display_name,
                    is_owner: player.is_owner,
                    message: message
                };

                for (const client of wss.clients) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(response));
                    }
                }
            }
        } catch (error) {
            console.log("Invalid packet:", error);
        }
    });

    socket.on("close", () => {
        const player = players.get(socket);

        if (player) {
            console.log(
                `${player.display_name} disconnected`
            );
        }

        players.delete(socket);
    });
});

process.on("SIGTERM", () => {
    console.log("Server shutting down");

    wss.close(() => {
        process.exit(0);
    });
});
