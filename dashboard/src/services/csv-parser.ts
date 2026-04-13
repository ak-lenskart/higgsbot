import Papa from 'papaparse';

export interface CSVRow {
  pid: string;
  product_image_url: string;
  frame_name?: string;
}

export interface ParseResult {
  rows: CSVRow[];
  errors: string[];
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const errors: string[] = [];
        const rows: CSVRow[] = [];

        // Check required columns
        const fields = result.meta.fields || [];
        const lowerFields = fields.map((f) => f.toLowerCase().trim());

        const pidIdx = lowerFields.findIndex((f) => f === 'pid' || f === 'product_id' || f === 'id');
        const urlIdx = lowerFields.findIndex((f) => f === 'product_image_url' || f === 'image_url' || f === 'url');
        const frameIdx = lowerFields.findIndex((f) => f === 'frame_name' || f === 'name');

        if (pidIdx === -1) {
          errors.push('Missing required column: PID (or product_id, id)');
        }
        if (urlIdx === -1) {
          errors.push('Missing required column: product_image_url (or image_url, url)');
        }

        if (errors.length > 0) {
          resolve({ rows, errors });
          return;
        }

        const pidField = fields[pidIdx];
        const urlField = fields[urlIdx];
        const frameField = frameIdx !== -1 ? fields[frameIdx] : null;

        for (let i = 0; i < result.data.length; i++) {
          const row = result.data[i] as Record<string, string>;
          const pid = row[pidField]?.trim();
          const url = row[urlField]?.trim();

          if (!pid) {
            errors.push(`Row ${i + 1}: missing PID`);
            continue;
          }
          if (!url) {
            errors.push(`Row ${i + 1}: missing image URL`);
            continue;
          }

          rows.push({
            pid,
            product_image_url: url,
            frame_name: frameField ? row[frameField]?.trim() : undefined,
          });
        }

        resolve({ rows, errors });
      },
      error: (err) => {
        resolve({ rows: [], errors: [err.message] });
      },
    });
  });
}
