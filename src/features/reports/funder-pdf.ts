import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument,rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { funderReport } from '@/features/client-p2/funder';
import { monthYear } from './report-period';

export async function funderPdf(report:ReturnType<typeof funderReport>,organization:string) {
  const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
  const bytes=await readFile(join(process.cwd(),'src/features/reports/assets/NotoSans-Regular.ttf'));
  const font=await pdf.embedFont(bytes,{subset:true});pdf.setTitle(`${organization} - Funder service report`);
  let page=pdf.addPage([595.28,841.89]),y=790;
  const green=rgb(0,.478,.239),ink=rgb(.08,.18,.12);
  function line(text:string,size=11,heading=false) {
    // Wrap unbroken field values as well as ordinary sentences.
    const lines:string[]=[];let current='';
    for(const char of text.replace(/[\r\n\t]/g,' ')) {
      if(font.widthOfTextAtSize(current+char,size)>495&&current){
        const space=current.lastIndexOf(' ');
        if(space>0){lines.push(current.slice(0,space));current=current.slice(space+1);}
        else {lines.push(current);current='';}
      }
      current+=char;
    }
    if(current)lines.push(current);
    for(const value of lines) {
      if(y<70){page=pdf.addPage([595.28,841.89]);y=790;}
      page.drawText(value.trim(),{x:50,y,size,font,color:heading?green:ink});y-=size*1.6;
    }
    y-=7;
  }
  line(organization,22,true);line('Funder service report',18,true);
  line(`${monthYear(report.start)} - ${monthYear(report.end)}`,12);
  line(`Exact reporting window: ${report.start} through ${report.end}, America/Phoenix.`,9);
  line('FICTIONAL DEMO RECORDS',10,true);
  line(`${report.clients} unique clients served | ${report.services} services delivered`,14,true);
  line('Services by type',14,true);
  for(const row of report.types)line(`${row.label}: ${row.count}`);
  if(!report.types.length)line('No services recorded for this period.');
  for(const field of report.demographics){line(`${field.label} among clients served`,14,true);for(const value of field.values)line(`${value.label}: ${value.count}`);}
  line('Source and limits',14,true);
  line('Source: this organization’s saved client and service records. Clients are counted once per reporting period. Demographics reflect current records, including inactive clients who received services. Missing values are shown explicitly. Activity counts do not establish verified outcomes or causal impact. No client names, dates of birth, contact information or private notes are included.',9);
  for(const [index,p] of pdf.getPages().entries())p.drawText(`Hackleaf | ${index+1} / ${pdf.getPageCount()}`,{x:50,y:35,size:9,font,color:ink});
  return pdf.save();
}
