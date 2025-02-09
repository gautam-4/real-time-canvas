interface LoadingOverlayProps {
    isLoading: boolean;
}

export function LoadingOverlay({ isLoading }: LoadingOverlayProps) {
    if (!isLoading) return null;

    return (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-20">
            <div className="text-gray-800">Loading canvas...</div>
        </div>
    );
}