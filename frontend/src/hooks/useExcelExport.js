import { useCallback } from 'react';
import * as XLSX from 'xlsx';

/**
 * Hook que devuelve funciones para exportar arrays como Excel.
 * Encapsula formato de columnas, encabezados con estilo, y descarga.
 */
export function useExcelExport() {
  const exportSheet = useCallback((rows, options = {}) => {
    const { filename = 'export', sheetName = 'Hoja1', colWidths } = options;
    if (!rows?.length) {
      alert('No hay datos para exportar');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    if (colWidths) ws['!cols'] = colWidths.map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
  }, []);

  const exportMulti = useCallback((sheets, filename = 'export') => {
    // sheets: { sheetName: [rows], ... }
    const wb = XLSX.utils.book_new();
    for (const [name, rows] of Object.entries(sheets)) {
      if (!rows?.length) continue;
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    }
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
  }, []);

  return { exportSheet, exportMulti };
}
