interface ConnectionStatusProps {
    status: 'connected' | 'disconnected' | 'error';
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
    if (status !== 'error') return null;

    return (
        <div className="absolute top-4 right-4 bg-red-100 text-red-800 px-4 py-2 rounded-md z-30">
            Connection lost. Please refresh the page.
        </div>
    );
}