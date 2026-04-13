import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { CSVDropzone } from '../components/upload/CSVDropzone';
import { ProductPreviewTable } from '../components/upload/ProductPreviewTable';
import { parseCSV, type CSVRow } from '../services/csv-parser';
import { useProductStore } from '../stores/product-store';
import type { Product, Batch } from '../types/models';

export function UploadPage() {
  const [rows, setRows] = useState<CSVRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [filename, setFilename] = useState('');
  const addBatch = useProductStore((s) => s.addBatch);
  const navigate = useNavigate();

  const handleFile = async (file: File) => {
    setFilename(file.name);
    const result = await parseCSV(file);
    setRows(result.rows);
    setErrors(result.errors);
  };

  const handleConfirm = async () => {
    const batchId = uuid();

    const products: Product[] = rows.map((row) => ({
      id: row.pid,
      imageUrl: row.product_image_url,
      frameName: row.frame_name,
      brand: null,
      productType: null,
      frameColor: null,
      frameStyle: null,
      analysisStatus: 'pending',
      analysisResult: null,
      selectedCharacterIds: [],
      selectedSceneIds: [],
      batchId,
      createdAt: Date.now(),
    }));

    const batch: Batch = {
      id: batchId,
      csvFilename: filename,
      productCount: products.length,
      totalJobs: 0,
      completedJobs: 0,
      approvedCount: 0,
      rejectedCount: 0,
      status: 'analyzing',
      createdAt: Date.now(),
    };

    await addBatch(batch, products);
    navigate('/analysis');
  };

  const handleCancel = () => {
    setRows([]);
    setErrors([]);
    setFilename('');
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload CSV</h2>

      {rows.length === 0 ? (
        <>
          <CSVDropzone onFile={handleFile} />
          {errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-danger mb-1">Errors found:</p>
              {errors.map((err, i) => (
                <p key={i} className="text-xs text-red-700">{err}</p>
              ))}
            </div>
          )}
        </>
      ) : (
        <ProductPreviewTable rows={rows} onConfirm={handleConfirm} onCancel={handleCancel} />
      )}
    </div>
  );
}
