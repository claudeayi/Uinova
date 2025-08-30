import { useEffect, useState } from "react";
import { socket } from "@/services/socketClient";

export default function CollaborativeCursors() {
  const [cursors, setCursors] = useState<{id:string,x:number,y:number,color:string}[]>([]);

  useEffect(() => {
    socket.on("cursor-update", (data) => {
      setCursors((prev) => [...prev.filter(c => c.id !== data.id), data]);
    });
    return () => socket.off("cursor-update");
  }, []);

  return (
    <>
      {cursors.map(c => (
        <div key={c.id} style={{
          position:"absolute", left:c.x, top:c.y, background:c.color,
          width:"8px", height:"8px", borderRadius:"50%"
        }}/>
      ))}
    </>
  );
}
