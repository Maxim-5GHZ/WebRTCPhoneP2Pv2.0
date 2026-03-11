import StartMenuPage from "./StartMenuPage";
import { SocketProvider } from "../contexts/SocketProvider";
import { useAuthContext } from "../hooks/useAuth";

function StartMenuPageWrapper() {
    const { user } = useAuthContext();

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <SocketProvider user={user}>
            <StartMenuPage />
        </SocketProvider>
    );
}

export default StartMenuPageWrapper;