import type { CSVRow } from '../../services/csv-parser';

interface Props {
  rows: CSVRow[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ProductPreviewTable({ rows, onConfirm, onCancel }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-700 font-medium">{rows.length} products found</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 border border-border rounded-md text-sm text-gray-600 hover:bg-surface-hover">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-3 py-1.5 bg-primary text-white rounded-md text-sm hover:bg-primary-hover">
            Start Analysis
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-surface">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">PID</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Image</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Frame Name</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{row.pid}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={row.product_image_url}
                      alt={row.pid}
                      className="w-10 h-10 object-cover rounded border border-border"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="text-xs text-muted truncate max-w-[300px]">{row.product_image_url}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">{row.frame_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
