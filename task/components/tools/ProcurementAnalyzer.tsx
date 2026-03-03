import { useState, useRef, useCallback } from "react";
import { gws, supabase, type GeminiPart } from "../../lib/gws";

const SYSTEM_PROMPT = `あなたは日本の官公庁入札の専門コンサルタントです。アップロードされた調達情報PDFを分析し、入札準備に必要な情報を体系的に整理してください。

以下の構成でJSON形式で出力してください。該当情報がない場合は空文字列""にしてください。

{
  "案件概要": {
    "調達案件番号": "",
    "調達案件名称": "",
    "調達種別": "",
    "分類": "",
    "調達機関": "",
    "所在地": "",
    "公開開始日": "",
    "公開終了日": ""
  },
  "業務内容サマリー": "この案件の業務内容を3〜5文で簡潔に説明",
  "仕様の要点": [
    "仕様書から読み取れる重要なポイントを箇条書きで列挙"
  ],
  "入札参加要件": [
    "入札に参加するための要件を列挙"
  ],
  "準備アクション": [
    {
      "項目": "アクション名",
      "詳細": "具体的にやるべきこと",
      "優先度": "高/中/低"
    }
  ],
  "重要期限": [
    {
      "期限": "日付や期限",
      "内容": "何の期限か"
    }
  ],
  "納入条件": {
    "納入場所": "",
    "納入回数": "",
    "納期": "",
    "その他": ""
  },
  "担当窓口": {
    "部署": "",
    "担当者": "",
    "電話": "",
    "FAX": "",
    "メール": ""
  },
  "想定価格の手がかり": "仕様書の内容から推定できる価格帯の情報や、過去実績を調べる方法についてのアドバイス",
  "注意点": [
    "入札にあたっての注意事項や留意点"
  ]
}

必ず有効なJSONのみを返してください。マークダウンのコードブロックや説明文は不要です。`;

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "高": { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
  "中": { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  "低": { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function ProcurementAnalyzer() {
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
      reader.readAsDataURL(file);
    });

  const analyzePDFs = useCallback(async (pdfFiles: File[]) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setProgress("PDFを読み込んでいます...");

    try {
      const parts: GeminiPart[] = [];
      for (const file of pdfFiles) {
        const base64 = await readFileAsBase64(file);
        parts.push({ inline_data: { mime_type: "application/pdf", data: base64 } });
      }
      parts.push({
        text: "上記の調達情報PDF・仕様書PDFを分析し、入札準備に必要な情報をJSON形式で出力してください。",
      });

      setProgress("AIが分析中です...");

      const raw = await gws.gemini.chat(
        [{ role: "user", parts }],
        { systemInstruction: SYSTEM_PROMPT }
      );

      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setAnalysis(parsed);

      // ── leads_v2にINSERT + PDFをバケットに保管 ──
      setProgress("データを保存中...");
      try {
        const title = parsed["案件概要"]?.["調達案件名称"] || pdfFiles.map(f => f.name).join(", ");
        const { data: lead, error: leadErr } = await supabase
          .from("leads_v2")
          .insert({
            title,
            status: "new",
            source: sourceUrl || "PDF分析",
            notes: JSON.stringify(parsed, null, 2),
          })
          .select("id")
          .single();

        if (leadErr) console.error("lead insert error:", leadErr);

        const leadId = lead?.id;
        if (leadId) {
          setSavedLeadId(leadId);
          // PDFをバケットにアップロード
          for (const file of pdfFiles) {
            const path = `procurement/${leadId}/${file.name}`;
            const { error: uploadErr } = await supabase.storage
              .from("documents")
              .upload(path, file, { contentType: "application/pdf", upsert: true });
            if (uploadErr) console.error("PDF upload error:", uploadErr);
          }
        }
      } catch (saveErr) {
        console.error("Save error:", saveErr);
      }
      setProgress("");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "分析中にエラーが発生しました");
      setProgress("");
    } finally {
      setLoading(false);
    }
  }, []);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const pdfs = Array.from(newFiles).filter((f) => f.type === "application/pdf");
    if (pdfs.length === 0) {
      setError("PDFファイルを選択してください");
      return;
    }
    setError(null);
    setFiles(prev => [...prev, ...pdfs]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const startAnalysis = () => {
    if (files.length === 0) {
      setError("PDFファイルを追加してください");
      return;
    }
    analyzePDFs(files);
  };

  const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <span style={styles.sectionIcon}>{icon}</span>
        <h2 style={styles.sectionTitle}>{title}</h2>
      </div>
      <div style={styles.sectionBody}>{children}</div>
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value?: string }) =>
    value ? (
      <div style={styles.infoRow}>
        <span style={styles.infoLabel}>{label}</span>
        <span style={styles.infoValue}>{value}</span>
      </div>
    ) : null;

  const PriorityBadge = ({ priority }: { priority: string }) => {
    const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS["中"];
    return (
      <span style={{ ...styles.badge, backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
        {priority}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      <style>{`@keyframes pa-spin { to { transform: rotate(360deg); } }`}</style>

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logoMark}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
          </div>
          <div>
            <h1 style={styles.headerTitle}>入札準備アナライザー</h1>
            <p style={styles.headerSub}>調達情報PDFをアップロードすると、入札準備に必要な情報を自動分析します</p>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {!analysis && !loading && (
          <>
            <div
              style={{ ...styles.dropZone, borderColor: dragOver ? "#1E3A5F" : "#CBD5E1", backgroundColor: dragOver ? "#F0F4FA" : "#FAFBFC" }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="application/pdf" multiple style={{ display: "none" }}
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <div style={styles.dropIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p style={styles.dropText}>PDFをドラッグ&ドロップ</p>
              <p style={styles.dropSubText}>またはクリックしてファイルを選択（複数可）</p>
              <p style={styles.dropHint}>調達情報PDF、仕様書PDFなど</p>
            </div>

            {files.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>{files.length}件のPDFを選択中</span>
                  <button onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: 13, color: "#1E3A5F", fontWeight: 600, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                    さらに追加
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 6, marginBottom: 16 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: "#F8FAFC", borderRadius: 8, border: "1px solid #E8ECF1" }}>
                      <span style={{ fontSize: 13, color: "#334155" }}>{f.name}</span>
                      <button onClick={() => removeFile(i)}
                        style={{ fontSize: 12, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                        title="削除">✕</button>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>調達情報URL（任意）</label>
                  <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
                    placeholder="https://www.geps.go.jp/..."
                    style={{ width: "100%", padding: "10px 14px", fontSize: 14, border: "1px solid #CBD5E1", borderRadius: 8, outline: "none" }} />
                </div>
                <button onClick={startAnalysis}
                  style={{ width: "100%", padding: "14px 24px", backgroundColor: "#1E3A5F", color: "#FFFFFF", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "background 0.15s" }}>
                  分析を実行
                </button>
              </div>
            )}
          </>
        )}

        {loading && (
          <div style={styles.loadingContainer}>
            <div style={{ ...styles.spinner, animation: "pa-spin 0.8s linear infinite" }} />
            <p style={styles.loadingText}>{progress}</p>
            <div style={styles.fileList}>
              {files.map((f, i) => <span key={i} style={styles.fileChip}>{f.name}</span>)}
            </div>
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>
            <span>{error}</span>
            <button style={styles.retryBtn} onClick={() => { setError(null); setFiles([]); }}>やり直す</button>
          </div>
        )}

        {analysis && (
          <div style={styles.results}>
            <div style={styles.resultsHeader}>
              <div>
                <h2 style={styles.resultsTitle}>分析結果</h2>
                <div style={styles.fileList}>
                  {files.map((f, i) => <span key={i} style={styles.fileChip}>{f.name}</span>)}
                </div>
              </div>
              <button style={styles.newBtn} onClick={() => { setAnalysis(null); setFiles([]); setError(null); setSavedLeadId(null); setSourceUrl(""); }}>
                新しいPDFを分析
              </button>
            </div>

            {/* URL & Lead保存ステータス */}
            {(sourceUrl || savedLeadId) && (
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: 4 }}>
                {sourceUrl && (
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 13, color: "#1E3A5F", textDecoration: "underline" }}>
                    調達情報URL
                  </a>
                )}
                {savedLeadId && (
                  <span style={{ fontSize: 12, color: "#059669", backgroundColor: "#ECFDF5", padding: "2px 10px", borderRadius: 12, border: "1px solid #A7F3D0" }}>
                    Lead保存済
                  </span>
                )}
              </div>
            )}

            {analysis["案件概要"] && (
              <Section title="案件概要" icon="📋">
                <div style={styles.infoGrid}>
                  <InfoRow label="調達案件番号" value={analysis["案件概要"]["調達案件番号"]} />
                  <InfoRow label="案件名称" value={analysis["案件概要"]["調達案件名称"]} />
                  <InfoRow label="調達種別" value={analysis["案件概要"]["調達種別"]} />
                  <InfoRow label="分類" value={analysis["案件概要"]["分類"]} />
                  <InfoRow label="調達機関" value={analysis["案件概要"]["調達機関"]} />
                  <InfoRow label="所在地" value={analysis["案件概要"]["所在地"]} />
                  <InfoRow label="公開開始日" value={analysis["案件概要"]["公開開始日"]} />
                  <InfoRow label="公開終了日" value={analysis["案件概要"]["公開終了日"]} />
                </div>
              </Section>
            )}

            {analysis["業務内容サマリー"] && (
              <Section title="業務内容サマリー" icon="📝">
                <p style={styles.summaryText}>{analysis["業務内容サマリー"]}</p>
              </Section>
            )}

            {analysis["仕様の要点"]?.length > 0 && (
              <Section title="仕様の要点" icon="🔍">
                <ul style={styles.specList}>
                  {analysis["仕様の要点"].map((item: string, i: number) => (
                    <li key={i} style={styles.specItem}><span style={styles.specBullet}>●</span><span>{item}</span></li>
                  ))}
                </ul>
              </Section>
            )}

            {analysis["入札参加要件"]?.length > 0 && (
              <Section title="入札参加要件" icon="✅">
                <ul style={styles.specList}>
                  {analysis["入札参加要件"].map((item: string, i: number) => (
                    <li key={i} style={styles.specItem}><span style={styles.checkMark}>☑</span><span>{item}</span></li>
                  ))}
                </ul>
              </Section>
            )}

            {analysis["準備アクション"]?.length > 0 && (
              <Section title="準備アクションリスト" icon="🚀">
                <div style={styles.actionList}>
                  {analysis["準備アクション"].map((a: any, i: number) => (
                    <div key={i} style={styles.actionCard}>
                      <div style={styles.actionHeader}>
                        <span style={styles.actionNum}>{i + 1}</span>
                        <span style={styles.actionTitle}>{a["項目"]}</span>
                        <PriorityBadge priority={a["優先度"]} />
                      </div>
                      <p style={styles.actionDetail}>{a["詳細"]}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {analysis["重要期限"]?.length > 0 && (
              <Section title="重要期限" icon="📅">
                <div style={styles.deadlineList}>
                  {analysis["重要期限"].map((d: any, i: number) => (
                    <div key={i} style={styles.deadlineCard}>
                      <span style={styles.deadlineDate}>{d["期限"]}</span>
                      <span style={styles.deadlineContent}>{d["内容"]}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {analysis["納入条件"] && (
              <Section title="納入条件" icon="📦">
                <div style={styles.infoGrid}>
                  <InfoRow label="納入場所" value={analysis["納入条件"]["納入場所"]} />
                  <InfoRow label="納入回数" value={analysis["納入条件"]["納入回数"]} />
                  <InfoRow label="納期" value={analysis["納入条件"]["納期"]} />
                  <InfoRow label="その他" value={analysis["納入条件"]["その他"]} />
                </div>
              </Section>
            )}

            {analysis["担当窓口"] && (
              <Section title="担当窓口" icon="📞">
                <div style={styles.infoGrid}>
                  <InfoRow label="部署" value={analysis["担当窓口"]["部署"]} />
                  <InfoRow label="担当者" value={analysis["担当窓口"]["担当者"]} />
                  <InfoRow label="電話" value={analysis["担当窓口"]["電話"]} />
                  <InfoRow label="FAX" value={analysis["担当窓口"]["FAX"]} />
                  <InfoRow label="メール" value={analysis["担当窓口"]["メール"]} />
                </div>
              </Section>
            )}

            {analysis["想定価格の手がかり"] && (
              <Section title="想定価格の手がかり" icon="💰">
                <p style={styles.summaryText}>{analysis["想定価格の手がかり"]}</p>
              </Section>
            )}

            {analysis["注意点"]?.length > 0 && (
              <Section title="注意点" icon="⚠️">
                <ul style={styles.specList}>
                  {analysis["注意点"].map((item: string, i: number) => (
                    <li key={i} style={styles.warningItem}><span style={styles.warningIcon}>▸</span><span>{item}</span></li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh", backgroundColor: "#F5F7FA", fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif", color: "#1E293B" },
  header: { background: "linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%)", padding: "24px 32px", boxShadow: "0 2px 12px rgba(30,58,95,0.15)" },
  headerInner: { display: "flex", alignItems: "center", gap: 16, maxWidth: 900, margin: "0 auto" },
  logoMark: { width: 48, height: 48, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headerTitle: { fontSize: 22, fontWeight: 700, color: "#FFFFFF", margin: 0, letterSpacing: "0.02em" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", margin: "4px 0 0" },
  main: { maxWidth: 900, margin: "0 auto", padding: "32px 24px 64px" },
  dropZone: { border: "2px dashed #CBD5E1", borderRadius: 16, padding: "64px 32px", textAlign: "center" as const, cursor: "pointer", transition: "all 0.2s ease" },
  dropIcon: { marginBottom: 16, opacity: 0.6 },
  dropText: { fontSize: 18, fontWeight: 600, color: "#334155", margin: "0 0 8px" },
  dropSubText: { fontSize: 14, color: "#64748B", margin: "0 0 16px" },
  dropHint: { fontSize: 12, color: "#94A3B8", margin: 0, padding: "8px 16px", backgroundColor: "#F1F5F9", borderRadius: 8, display: "inline-block" },
  loadingContainer: { textAlign: "center" as const, padding: "80px 32px" },
  spinner: { width: 40, height: 40, border: "3px solid #E2E8F0", borderTopColor: "#1E3A5F", borderRadius: "50%", margin: "0 auto 20px" },
  loadingText: { fontSize: 15, color: "#475569", fontWeight: 500 },
  fileList: { display: "flex", gap: 8, flexWrap: "wrap" as const, marginTop: 12, justifyContent: "center" },
  fileChip: { fontSize: 12, backgroundColor: "#EFF6FF", color: "#1E40AF", padding: "4px 12px", borderRadius: 20, border: "1px solid #DBEAFE" },
  errorBox: { display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, color: "#991B1B", fontSize: 14 },
  retryBtn: { marginLeft: "auto", padding: "6px 16px", backgroundColor: "#FFFFFF", border: "1px solid #FECACA", borderRadius: 8, color: "#991B1B", cursor: "pointer", fontSize: 13, fontWeight: 500 },
  results: { display: "flex", flexDirection: "column" as const, gap: 20 },
  resultsHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as const, gap: 12, marginBottom: 4 },
  resultsTitle: { fontSize: 20, fontWeight: 700, color: "#1E293B", margin: 0 },
  newBtn: { padding: "8px 20px", backgroundColor: "#1E3A5F", color: "#FFFFFF", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  section: { backgroundColor: "#FFFFFF", borderRadius: 14, border: "1px solid #E8ECF1", overflow: "hidden" as const, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  sectionHeader: { display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", backgroundColor: "#F8FAFC", borderBottom: "1px solid #E8ECF1" },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#1E3A5F", margin: 0 },
  sectionBody: { padding: "16px 20px" },
  infoGrid: { display: "flex", flexDirection: "column" as const, gap: 0 },
  infoRow: { display: "flex", padding: "10px 0", borderBottom: "1px solid #F1F5F9", gap: 12, alignItems: "baseline" as const },
  infoLabel: { fontSize: 13, color: "#64748B", fontWeight: 600, minWidth: 120, flexShrink: 0 },
  infoValue: { fontSize: 14, color: "#1E293B", lineHeight: 1.6 },
  summaryText: { fontSize: 14, lineHeight: 1.8, color: "#334155", margin: 0, whiteSpace: "pre-wrap" as const },
  specList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" as const, gap: 8 },
  specItem: { display: "flex", gap: 10, fontSize: 14, lineHeight: 1.7, color: "#334155", alignItems: "baseline" as const },
  specBullet: { color: "#1E3A5F", fontSize: 8, flexShrink: 0, marginTop: 4 },
  checkMark: { color: "#059669", fontSize: 14, flexShrink: 0 },
  actionList: { display: "flex", flexDirection: "column" as const, gap: 10 },
  actionCard: { padding: "14px 16px", backgroundColor: "#F8FAFC", borderRadius: 10, border: "1px solid #E8ECF1" },
  actionHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  actionNum: { width: 26, height: 26, borderRadius: "50%", backgroundColor: "#1E3A5F", color: "#FFFFFF", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  actionTitle: { fontSize: 14, fontWeight: 600, color: "#1E293B", flex: 1 },
  badge: { fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, flexShrink: 0 },
  actionDetail: { fontSize: 13, color: "#475569", lineHeight: 1.7, margin: "0 0 0 36px" },
  deadlineList: { display: "flex", flexDirection: "column" as const, gap: 8 },
  deadlineCard: { display: "flex", gap: 16, alignItems: "center", padding: "10px 14px", backgroundColor: "#FFFBEB", borderRadius: 8, border: "1px solid #FDE68A" },
  deadlineDate: { fontSize: 13, fontWeight: 700, color: "#92400E", minWidth: 160, flexShrink: 0 },
  deadlineContent: { fontSize: 13, color: "#78350F", lineHeight: 1.5 },
  warningItem: { display: "flex", gap: 8, fontSize: 14, lineHeight: 1.7, color: "#92400E", alignItems: "baseline" as const },
  warningIcon: { color: "#D97706", flexShrink: 0, fontWeight: 700 },
};
