import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

type Props = {
    namespace: string;
    pod: string;
    container: string;
    context: string; // k8s context
    shell?: string;  // optional: defaults to "sh"
};

const PodTerminal = ({ namespace, pod, container, context, shell = "sh" }: Props) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const term = useRef<Terminal>();
    const socketRef = useRef<WebSocket>();
    const fitAddon = useRef<FitAddon>(new FitAddon());

    useEffect(() => {
        term.current = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            rows: 30,
        });

        term.current.loadAddon(fitAddon.current);

        if (terminalRef.current) {
            term.current.open(terminalRef.current);
            fitAddon.current.fit();
        }

        term.current.writeln("Welcome!!!");
        term.current.writeln(`Pod: ${pod}, Container: ${container}, Namespace: ${namespace}`);
        // WebSocket connection
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const socketUrl = `${protocol}://localhost:4000/ws/pod/${namespace}/${pod}/shell/${container}?context=${context}&shell=${shell}`;
        const socket = new WebSocket(socketUrl);
        socketRef.current = socket;

        // Handle terminal input
        term.current.onData((data) => {
            const msg = JSON.stringify({ Op: "stdin", Data: data });
            socket.send(msg);
        });

        // Handle incoming messages from backend
        socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.Op === "stdout") {
                    term.current?.write(msg.Data);
                }
            } catch (err) {
                console.error("Invalid message", err);
            }
        };

        socket.onerror = (err) => {
            console.error("WebSocket error", err);
            // term.current?.writeln("Error connecting to terminal.");
        };

        socket.onclose = (event) => {
            console.error("WebSocket closed:", event);
            // term.current?.writeln(`\r\nConnection closed (code: ${event.code}, reason: ${event.reason})`);
        };
        const pingInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ Op: "ping" }));
            }
        }, 20000);

        return () => {
            clearInterval(pingInterval);
            socket.close();
            term.current?.dispose();
        };
    }, [namespace, pod, container, context, shell]);

    return (
        <div
            ref={terminalRef}
            style={{
                width: "100%",
                height: "500px",
                background: "#1e1e1e",
                borderRadius: "8px",
            }}
        />
    );
};

export default PodTerminal;
