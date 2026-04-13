import { useExtensionStatus } from '../../hooks/useExtensionStatus';

export function ExtensionStatusBadge() {
  const { connected } = useExtensionStatus();

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`w-2 h-2 rounded-full ${
          connected ? 'bg-success' : 'bg-gray-300'
        }`}
      />
      <span className={connected ? 'text-success' : 'text-muted'}>
        {connected ? 'Extension connected' : 'Extension not connected'}
      </span>
    </div>
  );
}
