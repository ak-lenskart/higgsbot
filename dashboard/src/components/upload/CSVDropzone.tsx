import { useCallback, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
}

export function CSVDropzone({ onFile }: Props) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) {
        onFile(file);
      }
    },
    [onFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
        dragOver ? 'border-primary bg-blue-50' : 'border-border hover:border-gray-400'
      }`}
      onClick={() => document.getElementById('csv-input')?.click()}
    >
      <input id="csv-input" type="file" accept=".csv" onChange={handleChange} className="hidden" />
      <p className="text-sm text-gray-600 mb-1">Drag & drop a CSV file here, or click to browse</p>
      <p className="text-xs text-muted">Columns: PID, product_image_url, frame_name (optional)</p>
    </div>
  );
}
