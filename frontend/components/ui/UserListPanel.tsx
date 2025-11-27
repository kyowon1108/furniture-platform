import { useEffect, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useAuthStore } from '@/store/authStore';
import { socketService } from '@/lib/socket';

interface ConnectedUser {
  sid: string;
  user_id: number;
  nickname: string;
  color: string;
}

export function UserListPanel() {
  const { projectId } = useEditorStore();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<ConnectedUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!projectId || !user) return;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handleUserJoined = (newUser: ConnectedUser) => {
      setUsers(prev => {
        if (prev.some(u => u.sid === newUser.sid)) return prev;
        return [...prev, newUser];
      });
    };

    const handleUserLeft = (data: { sid: string }) => {
      setUsers(prev => prev.filter(u => u.sid !== data.sid));
    };

    const handleCurrentUsers = (data: { users: ConnectedUser[] }) => {
      setUsers(data.users);
    };

    // Check initial status
    if (socketService.socket?.connected) {
      setIsConnected(true);
    }

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('user_joined', handleUserJoined);
    socketService.on('user_left', handleUserLeft);
    socketService.on('current_users', handleCurrentUsers);

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('user_joined', handleUserJoined);
      socketService.off('user_left', handleUserLeft);
      socketService.off('current_users', handleCurrentUsers);
    };
  }, [projectId, user]);

  // Deduplicate users by user_id
  const uniqueUsers = Array.from(new Map(users.map(u => [u.user_id, u])).values());

  return (
    <div className="absolute bottom-4 left-4 z-50 flex items-center gap-3 pointer-events-none">
      <div className="bg-black/80 backdrop-blur-md rounded-full pl-4 pr-2 py-2 flex items-center gap-3 pointer-events-auto shadow-lg border border-white/10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span className="text-xs font-bold text-white/80 tracking-wider">
            {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        {uniqueUsers.length > 0 && (
          <div className="h-4 w-[1px] bg-white/20 mx-1" />
        )}

        <div className="flex -space-x-2">
          {uniqueUsers.map((u) => (
            <div
              key={u.user_id}
              className="relative group"
              title={u.nickname}
            >
              <div
                className="w-8 h-8 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center text-xs font-bold text-white shadow-sm transition-transform hover:scale-110 hover:z-10"
                style={{ backgroundColor: u.color }}
              >
                {u.nickname.charAt(0).toUpperCase()}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {u.nickname} {u.user_id === user?.id && '(Me)'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
