"use client";
import { useState,useTransition } from "react";
import { previewClientsCsv,commitClientsCsv } from "./csv-actions";
import { MAX_CSV_BYTES } from "./csv";
import styles from "./case.module.css";
export function CsvWorkspace(){
  const [csv,setCsv]=useState(""),[preview,setPreview]=useState<Awaited<ReturnType<typeof previewClientsCsv>>["preview"]>(null),[message,setMessage]=useState(""),[error,setError]=useState(""),[partial,setPartial]=useState(false),[pending,start]=useTransition();
  const payload=()=>{const form=new FormData();form.set("csv",csv);return form;};
  return <section><label className={styles.form} style={{display:"block"}}>Upload client CSV<input type="file" accept=".csv,text/csv" disabled={pending} onChange={async event=>{setError("");setMessage("");setPreview(null);setPartial(false);const file=event.target.files?.[0];if(!file){setCsv("");return;}if(file.size>MAX_CSV_BYTES){setError("CSV must be 500 KB or smaller.");setCsv("");return;}setCsv(await file.text());}}/></label>
    <p className={styles.note}>Use YYYY-MM-DD for DOB. Existing client IDs are skipped; rows without an ID create new clients. No names or contact details are used to merge people automatically. Preview shows the first 20 rows; all rows are validated.</p>
    <button className="button" disabled={pending||!csv} onClick={()=>start(async()=>{setError("");const result=await previewClientsCsv(payload());setPreview(result.preview);setError(result.error);})}>{pending?"Working…":"Preview CSV"}</button>
    {error&&<p role="alert" className={styles.error}>{error}</p>}{message&&<p role="status" className={styles.success}>{message}</p>}
    {preview&&<section className={styles.section}><h2>Import preview</h2><p>{preview.ready} ready · {preview.skipped} existing IDs skipped · {preview.rejected} invalid rows</p>{preview.replayed&&<p role="status">This file was already imported. It will not create duplicate records.</p>}
      <div className="table-scroll"><table><caption>Client CSV preview</caption><thead><tr><th>Line</th><th>Name</th><th>DOB</th><th>Result</th></tr></thead><tbody>{preview.rows.map(row=><tr key={row.line}><td>{row.line}</td><td>{row.client?.name??"—"}</td><td>{row.client?.dateOfBirth??"—"}</td><td>{row.error||(row.skip?"Existing ID; skipped":"Ready")}</td></tr>)}</tbody></table></div>
      {!!preview.rejected&&<label style={{display:"block",marginBlock:20}}><input type="checkbox" checked={partial} onChange={event=>setPartial(event.target.checked)}/> Import valid rows and skip invalid rows</label>}
      <button className="button" disabled={pending||preview.replayed||!preview.ready||!!preview.rejected&&!partial} onClick={()=>start(async()=>{setError("");const form=payload();form.set("settingsRevision",String(preview.settingsRevision));form.set("allowPartial",String(partial));const result=await commitClientsCsv(form);if(result.error)setError(result.error);else{setMessage(`${result.imported} clients imported; ${result.skipped} skipped; ${result.rejected} rejected.`);setPreview(null);}})}>Import {preview.ready} valid clients</button>
    </section>}
  </section>;
}
