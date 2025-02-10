import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const ShowLogs = () => {
  const [logs, setLogs] = useState([""]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setWs] = useState<WebSocket | null>(null);
//   const [error, setError] = useState(null);
const { namespace, deployment } = useParams();
  useEffect(() => {
    const socket = new WebSocket(
      `ws://localhost:4000/ws?namespace=${namespace}&deployment=${deployment}`
    );

    socket.onmessage = (event) => {
      console.log(event.data);
      setLogs(s => [...s, event.data]);
    };
    socket.onerror = (error) => {
      console.log(error);
    };
    setWs(socket);

    return () => {
      socket.close();
    };
  }, [namespace,deployment]);

  return (
    <>
      <div className="deployment-logs">
        <h2>Deployment Logs</h2>
        {
            logs && logs.map((s) => (
                <pre>{s}</pre>
            ))
        }
      </div>
    </>
  );
};

export default ShowLogs;
