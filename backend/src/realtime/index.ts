import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

let senderSocket = null
let receiverSocket = null

wss.on('connection', (ws) => {
    ws.on('error', console.error);
    wss.on('message', (data:any) => {
        const message = JSON.parse(data)

        
    })

    ws.send("Something")
})
