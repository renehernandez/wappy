interface DeviceApprovalProps {
  code: string;
  machineName: string;
  expired: boolean;
  onApprove: () => void;
  onDeny: () => void;
  loading?: boolean;
}

export function DeviceApproval({
  code,
  machineName,
  expired,
  onApprove,
  onDeny,
  loading,
}: DeviceApprovalProps) {
  if (expired) {
    return (
      <div className="text-center">
        <p className="text-red-600 font-medium">
          This device code has expired.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Please generate a new code from the CLI.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <h2 className="text-lg font-semibold">Authorize Device</h2>
      <div className="bg-gray-100 rounded-lg p-4 inline-block">
        <p className="text-2xl font-mono font-bold tracking-wider">{code}</p>
      </div>
      <p className="text-sm text-gray-600">
        Device: <span className="font-medium">{machineName}</span>
      </p>
      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={onApprove}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Approving..." : "Approve"}
        </button>
        <button
          type="button"
          onClick={onDeny}
          disabled={loading}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
        >
          Deny
        </button>
      </div>
    </div>
  );
}
