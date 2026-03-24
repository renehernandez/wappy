interface Device {
  id: string;
  name: string;
  lastSeenAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

interface DeviceListProps {
  devices: Device[];
  onRevoke: (machineId: string) => void;
  revoking?: string | null;
}

export function DeviceList({ devices, onRevoke, revoking }: DeviceListProps) {
  if (devices.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        No devices registered. Use the CLI to connect a device.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-200">
      {devices.map((device) => (
        <li key={device.id} className="py-3 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{device.name}</p>
            <p className="text-xs text-gray-500">
              {device.revokedAt
                ? `Revoked ${new Date(device.revokedAt).toLocaleDateString()}`
                : device.lastSeenAt
                  ? `Last seen ${new Date(device.lastSeenAt).toLocaleString()}`
                  : "Never connected"}
            </p>
          </div>
          {!device.revokedAt && (
            <button
              type="button"
              onClick={() => onRevoke(device.id)}
              disabled={revoking === device.id}
              className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              {revoking === device.id ? "Revoking..." : "Revoke"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
