const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

const wss = new WebSocket.Server({
    port: PORT
});

console.log(`Chat server running on port ${PORT}`);

const players = new Map();

wss.on("connection", (socket) => {

    console.log("Player connected");

    socket.on("message", (data) => {

        try {

            const packet = JSON.parse(data.toString());

            // Player joining
            if (packet.type === "join") {

                players.set(socket, {
                    player_id: String(packet.player_id || ""),
                    display_name: String(packet.display_name || "Player")
                });

                console.log(
                    `${packet.display_name} joined the chat`
                );

                return;
            }

            // Chat message
            if (packet.type === "chat") {

                const player = players.get(socket);

                if (!player) {
                    return;
                }

                const message = String(packet.message || "").trim();

                if (message.length === 0) {
                    return;
                }

                if (message.length > 200) {
                    return;
                }

                const response = {
                    type: "chat",
                    player_id: player.player_id,
                    display_name: player.display_name,
                    message: message
                };

                // Broadcast to everyone
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
            console.log(`${player.display_name} disconnected`);
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