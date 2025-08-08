import { useEffect, useState } from "react";
import { socket } from "../socket";

export function useCollaboration() {
  const [users, setUsers] = useState<number>(1);

  useEffect(() => {
    socket.on("usersCount", setUsers);
    return () => { socket.off("usersCount", setUsers); };
  }, []);

  return { onlineUsers: users };
}
