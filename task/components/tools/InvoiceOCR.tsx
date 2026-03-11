import React, { useState, useRef, useCallback } from "react";
import { GoogleGenAI } from "@google/genai";
import {
  Upload, FileText, Download, Trash2, AlertCircle, Loader2,
  RotateCcw, CheckCircle2, Edit3, Plus
} from "lucide-react";
import type { ToolProps } from "../views/ToolsView";

/* ─── Types ─── */
interface InvoiceRow {
  id: string;
  支払先: string;
  請求書番号: string;
  請求日: string;
  支払期限: string;
  品目: string;
  税抜金額: string;
  消費税: string;
  合計金額: string;
  振込先: string;
  備考: string;
  confidence: number; // 0-1
}

interface OcrPass {
  rows: InvoiceRow[];
  raw: string;
}

const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

const FIELDS: { key: keyof InvoiceRow; label: string; width: string }[] = [
  { key: "支払先", label: "支払先", width: "160px" },
  { key: "請求書番号", label: "請求書No.", width: "120px" },
  { key: "請求日", label: "請求日", width: "100px" },
  { key: "支払期限", label: "支払期限", width: "100px" },
  { key: "品目", label: "品目", width: "180px" },
  { key: "税抜金額", label: "税抜金額", width: "110px" },
  { key: "消費税", label: "消費税", width: "90px" },
  { key: "合計金額", label: "合計金額", width: "110px" },
  { key: "振込先", label: "振込先", width: "200px" },
  { key: "備考", label: "備考", width: "140px" },
];

const OCR_PROMPT = `あなたは請求書OCRの専門家です。添付されたPDF画像から請求書情報を正確に読み取り、JSONのみを返してください。

以下のJSON配列形式で出力（1つのPDFに複数明細がある場合は1行にまとめるか、明細ごとに分けてください）：
[{
  "支払先": "会社名",
  "請求書番号": "番号",
  "請求日": "YYYY/MM/DD",
  "支払期限": "YYYY/MM/DD",
  "品目": "品目の概要",
  "税抜金額": "数値のみ",
  "消費税": "数値のみ",
  "合計金額": "数値のみ",
  "振込先": "銀行名 支店名 口座種別 口座番号 口座名義",
  "備考": "特記事項"
}]

重要：
- 金額は数字のみ（カンマなし）
- 日付はYYYY/MM/DD形式
- 読み取れない箇所は"?"を入れる
- マークダウンや説明文は不要、JSON配列のみ返す`;

/* ─── Multi-pass OCR with Gemini ─── */
async function ocrPass(base64: string, mimeType: string, temperature: number): Promise<OcrPass> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    config: {
      maxOutputTokens: 65535,
      temperature,
      topP: 0.95,
      thinkingConfig: {
        thinkingLevel: "HIGH",
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
      ],
      systemInstruction: {
        parts: [{ text: OCR_PROMPT }],
      },
    },
    contents: [
      {
        role: "user",
        parts: [
          { text: "添付された請求書PDF/画像から情報を抽出してください。" },
          { inlineData: { data: base64, mimeType } },
        ],
      },
    ],
  });
  const raw = response.text || "[]";
  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  return {
    raw: clean,
    rows: arr.map((r: Record<string, string>) => ({
      id: uid(),
      支払先: r["支払先"] || "",
      請求書番号: r["請求書番号"] || "",
      請求日: r["請求日"] || "",
      支払期限: r["支払期限"] || "",
      品目: r["品目"] || "",
      税抜金額: r["税抜金額"] || "",
      消費税: r["消費税"] || "",
      合計金額: r["合計金額"] || "",
      振込先: r["振込先"] || "",
      備考: r["備考"] || "",
      confidence: 1,
    })),
  };
}

/* ─── Merge multiple passes (majority vote per field) ─── */
function mergeOcrPasses(passes: OcrPass[]): InvoiceRow[] {
  if (passes.length === 0) return [];
  if (passes.length === 1) return passes[0].rows;

  // Use the first pass as baseline for row count
  const base = passes[0].rows;
  return base.map((_, rowIdx) => {
    const merged: InvoiceRow = { ...base[rowIdx], id: uid() };
    for (const f of FIELDS) {
      const key = f.key;
      const values = passes
        .map((p) => String(p.rows[rowIdx]?.[key] ?? ""))
        .filter((v) => v !== "" && v !== "?");

      if (values.length === 0) {
        (merged as any)[key] = base[rowIdx][key];
        merged.confidence = Math.min(merged.confidence, 0.3);
        continue;
      }

      // Count occurrences
      const counts = new Map<string, number>();
      for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);

      // Pick most common
      let best = values[0];
      let bestCount = 0;
      for (const [v, c] of counts) {
        if (c > bestCount) { best = v; bestCount = c; }
      }
      (merged as any)[key] = best;

      // Confidence: unanimous = 1.0, majority = 0.8, no agreement = 0.5
      const agreement = bestCount / passes.length;
      merged.confidence = Math.min(merged.confidence, agreement >= 1 ? 1 : agreement >= 0.66 ? 0.8 : 0.5);
    }
    return merged;
  });
}

/* ─── CSV export ─── */
function toCsv(rows: InvoiceRow[]): string {
  const header = FIELDS.map((f) => f.label).join(",");
  const body = rows
    .map((r) =>
      FIELDS.map((f) => {
        const v = String(r[f.key] ?? "").replace(/"/g, '""');
        return `"${v}"`;
      }).join(",")
    )
    .join("\n");
  return "\uFEFF" + header + "\n" + body;
}

function downloadCsv(rows: InvoiceRow[], filename: string) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════
   InvoiceOCR Component
   ═══════════════════════════════════════════ */
const InvoiceOCR: React.FC<ToolProps> = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: string; key: string } | null>(null);
  const [passCount, setPassCount] = useState(3);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = () => reject(new Error("読み込み失敗"));
      reader.readAsDataURL(file);
    });

  const processFiles = useCallback(async (pdfFiles: File[]) => {
    setLoading(true);
    setError(null);
    setRows([]);

    try {
      const allRows: InvoiceRow[] = [];

      for (let fi = 0; fi < pdfFiles.length; fi++) {
        const file = pdfFiles[fi];
        setProgress(`PDF ${fi + 1}/${pdfFiles.length}「${file.name}」を読み込み中...`);
        const base64 = await readBase64(file);
        const mimeType = file.type || "application/pdf";

        const passes: OcrPass[] = [];
        const temps = [0.1, 0.3, 0.5]; // different temperatures for diversity

        for (let p = 0; p < passCount; p++) {
          setProgress(`PDF ${fi + 1}/${pdfFiles.length} — OCR Pass ${p + 1}/${passCount}...`);
          try {
            const result = await ocrPass(base64, mimeType, temps[p] ?? 0.2);
            passes.push(result);
          } catch (err) {
            console.error(`Pass ${p + 1} failed:`, err);
          }
        }

        if (passes.length === 0) {
          setError(`「${file.name}」のOCRに失敗しました`);
          continue;
        }

        setProgress(`PDF ${fi + 1}/${pdfFiles.length} — 結果をマージ中...`);
        const merged = mergeOcrPasses(passes);
        allRows.push(...merged);
      }

      setRows(allRows);
      setProgress("");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "処理中にエラーが発生しました");
      setProgress("");
    } finally {
      setLoading(false);
    }
  }, [passCount]);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const pdfs = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/")
    );
    if (pdfs.length === 0) {
      setError("PDFまたは画像ファイルを選択してください");
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...pdfs]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const updateCell = (rowId: string, key: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [key]: value, confidence: 1 } : r))
    );
  };

  const deleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const addEmptyRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: uid(),
        支払先: "", 請求書番号: "", 請求日: "", 支払期限: "",
        品目: "", 税抜金額: "", 消費税: "", 合計金額: "",
        振込先: "", 備考: "", confidence: 1,
      },
    ]);
  };

  const totalAmount = rows.reduce((sum, r) => {
    const n = parseInt(r.合計金額.replace(/[^0-9]/g, ""), 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  const confidenceColor = (c: number) =>
    c >= 0.9 ? "#059669" : c >= 0.7 ? "#D97706" : "#DC2626";

  /* ─── Upload view ─── */
  if (rows.length === 0 && !loading) {
    return (
      <div className="h-full overflow-y-auto bg-[#f8fafb]">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-gray-900 mb-1">請求書OCR → 支払先一覧</h1>
            <p className="text-sm text-gray-400">請求書PDFをアップロードすると、AIが複数回OCRを実行して高精度に読み取ります</p>
          </div>

          <div
            className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${
              dragOver ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-white hover:border-gray-400"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              multiple
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
            <Upload size={40} className="mx-auto mb-4 text-gray-300" />
            <p className="text-base font-semibold text-gray-600 mb-1">請求書PDF / 画像をドラッグ&ドロップ</p>
            <p className="text-xs text-gray-400">またはクリックして選択（複数可）</p>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{files.length}件のファイル</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-indigo-500 font-semibold underline"
                >さらに追加</button>
              </div>

              <div className="space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{f.name}</span>
                    </div>
                    <button
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-gray-300 hover:text-red-500"
                    ><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>

              {/* Pass count setting */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-500">OCR実行回数:</label>
                <select
                  value={passCount}
                  onChange={(e) => setPassCount(Number(e.target.value))}
                  className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white outline-none"
                >
                  <option value={1}>1回（高速）</option>
                  <option value={2}>2回</option>
                  <option value={3}>3回（推奨・高精度）</option>
                </select>
              </div>

              <button
                onClick={() => processFiles(files)}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
              >
                OCR実行 → 支払先一覧を作成
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── Loading view ─── */
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f8fafb]">
        <div className="text-center">
          <Loader2 size={40} className="text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="font-semibold text-gray-900 mb-1">{progress}</p>
          <p className="text-xs text-gray-400">複数回OCRを実行して精度を向上しています...</p>
          <div className="flex gap-2 justify-center mt-4 flex-wrap">
            {files.map((f, i) => (
              <span key={i} className="text-[11px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">{f.name}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Results table view ─── */
  return (
    <div className="h-full flex flex-col bg-[#f8fafb]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-gray-900">支払先一覧</h2>
          <span className="text-xs text-gray-400">{rows.length}件</span>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
            合計 ¥{totalAmount.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addEmptyRow}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          ><Plus size={13} /> 行追加</button>
          <button
            onClick={() => downloadCsv(rows, `支払先一覧_${new Date().toISOString().slice(0, 10)}.csv`)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
          ><Download size={13} /> CSV</button>
          <button
            onClick={() => { setRows([]); setFiles([]); setError(null); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          ><RotateCcw size={13} /> 新規</button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Confidence legend */}
      <div className="px-5 py-2 flex items-center gap-4 text-[10px] text-gray-400 flex-shrink-0">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> 高信頼度</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> 要確認</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> 低信頼度</span>
        <span className="ml-auto">セルをクリックして編集可能</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-3 pb-4">
        <table className="w-full border-collapse min-w-[1200px]">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 bg-gray-100 border border-gray-200 px-2 py-2 text-[11px] font-bold text-gray-500 text-center w-[36px]">#</th>
              {FIELDS.map((f) => (
                <th
                  key={f.key}
                  className="sticky top-0 z-10 bg-gray-100 border border-gray-200 px-2 py-2 text-[11px] font-bold text-gray-500 text-left"
                  style={{ minWidth: f.width }}
                >{f.label}</th>
              ))}
              <th className="sticky top-0 z-10 bg-gray-100 border border-gray-200 px-2 py-2 text-[11px] font-bold text-gray-500 text-center w-[60px]">信頼度</th>
              <th className="sticky top-0 z-10 bg-gray-100 border border-gray-200 px-2 py-2 w-[36px]" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-blue-50/30">
                <td className="border border-gray-200 px-2 py-1.5 text-center text-xs text-gray-400 bg-gray-50">{idx + 1}</td>
                {FIELDS.map((f) => {
                  const isEditing = editingCell?.rowId === row.id && editingCell?.key === f.key;
                  const val = row[f.key] as string;
                  const isUncertain = val === "?" || val === "";

                  return (
                    <td
                      key={f.key}
                      className={`border border-gray-200 px-0 py-0 text-xs ${
                        isUncertain ? "bg-red-50" : "bg-white"
                      }`}
                      onClick={() => setEditingCell({ rowId: row.id, key: f.key })}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={val}
                          onChange={(e) => updateCell(row.id, f.key, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Tab") setEditingCell(null); }}
                          className="w-full px-2 py-1.5 text-xs outline-none bg-blue-50 border-2 border-blue-400"
                        />
                      ) : (
                        <div className="px-2 py-1.5 min-h-[28px] flex items-center cursor-text group">
                          <span className={`flex-1 ${isUncertain ? "text-red-400 italic" : "text-gray-700"}`}>
                            {val || "—"}
                          </span>
                          <Edit3 size={10} className="text-gray-300 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1" />
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="border border-gray-200 px-2 py-1.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {row.confidence >= 0.9 ? (
                      <CheckCircle2 size={13} style={{ color: confidenceColor(row.confidence) }} />
                    ) : (
                      <AlertCircle size={13} style={{ color: confidenceColor(row.confidence) }} />
                    )}
                    <span className="text-[10px] font-bold" style={{ color: confidenceColor(row.confidence) }}>
                      {Math.round(row.confidence * 100)}%
                    </span>
                  </div>
                </td>
                <td className="border border-gray-200 px-1 py-1.5 text-center">
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  ><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceOCR;
