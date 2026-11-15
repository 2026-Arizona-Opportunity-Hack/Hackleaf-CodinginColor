"use client";
import { useActionState,type ReactNode } from "react";
import { caseAction } from "./actions";
import { type ClientRecord,type CustomField,type DemoData,type ServiceType,type ServiceVisit } from "./model";
import styles from "./case.module.css";
function ActionForm({children,label,submit,confirmation}:{children:ReactNode;label:string;submit:string;confirmation?:string}) {
  const [state,action,pending]=useActionState(caseAction,{error:"",message:""});
  return <form action={action} aria-label={label} className={styles.form} onSubmit={event=>{if(confirmation && !window.confirm(confirmation))event.preventDefault();}}>
    <fieldset disabled={pending} className={styles.grid}>{children}<div className={`${styles.actions} ${styles.wide}`}><button className={`button ${confirmation?styles.danger:""}`} disabled={pending}>{pending?"Saving…":submit}</button></div></fieldset>
    {state.error && <p role="alert" className={styles.error}>{state.error}</p>}{state.message && <p role="status" className={styles.success}>{state.message}</p>}
  </form>;
}
export function ClientForm({client,draft,fields,maxDate}:{client?:ClientRecord;draft?:Partial<ClientRecord>;fields:CustomField[];maxDate:string}) {
  const initial=client??draft;
  return <ActionForm label={client?"Edit client":"Register client"} submit={client?"Save client changes":"Register client"}>
    <input type="hidden" name="op" value="client.save" />{client && <><input type="hidden" name="id" value={client.id}/><input type="hidden" name="revision" value={client.revision}/></>}
    <label>Client name *<input name="name" required maxLength={200} defaultValue={initial?.name} autoComplete="off" /></label>
    <label>Date of birth *<input name="dateOfBirth" type="date" required max={maxDate} defaultValue={initial?.dateOfBirth}/></label>
    {client&&<label>Client status<select name="active" defaultValue={String(client.active)}><option value="true">Active</option><option value="false">Inactive</option></select></label>}
    <label>Email<input name="email" type="email" maxLength={254} defaultValue={initial?.email}/></label><label>Phone<input name="phone" type="tel" maxLength={30} defaultValue={initial?.phone}/></label>
    {fields.filter(f=>f.active).map(field=><label key={field.id}>{field.label}{field.type==="select"?<select name={`demographic.${field.id}`} defaultValue={initial?.demographics?.[field.id]??""}><option value="">Not provided</option>{field.options.map(option=><option key={option}>{option}</option>)}</select>:<input name={`demographic.${field.id}`} type={field.type==="number"?"number":"text"} min={field.type==="number"?0:undefined} maxLength={200} defaultValue={initial?.demographics?.[field.id]}/>}</label>)}
    <p className={`${styles.note} ${styles.wide}`}>* Required. Provide at least one contact method. Use fictional details only. A unique client ID is assigned automatically.</p>
  </ActionForm>;
}
export function VisitForm({clientId,types,staffName,visit,maxDate,fields=[]}:{clientId:string;types:ServiceType[];staffName:string;visit?:ServiceVisit;maxDate:string;fields?:CustomField[]}) {
  const choices=types.filter(t=>t.active || t.id===visit?.serviceTypeId);
  return <ActionForm label={visit?`Edit service ${visit.id}`:"Log service"} submit={visit?"Save service changes":"Log service"}>
    <input type="hidden" name="op" value="visit.save"/><input type="hidden" name="clientId" value={clientId}/>{visit && <><input type="hidden" name="id" value={visit.id}/><input type="hidden" name="revision" value={visit.revision}/></>}
    <label>Service date *<input name="date" type="date" required max={maxDate} defaultValue={visit?.date??maxDate}/></label><label>Service type *<select name="serviceTypeId" required defaultValue={visit?.serviceTypeId??choices[0]?.id}>{choices.map(type=><option key={type.id} value={type.id}>{type.label}{type.active?"":" (retired)"}</option>)}</select></label>
    {fields.filter(f=>f.active).map(field=><label key={field.id}>{field.label}{field.type==="select"?<select name={`serviceCustom.${field.id}`} defaultValue={visit?.customFields[field.id]??""}><option value="">Not provided</option>{field.options.map(option=><option key={option}>{option}</option>)}</select>:<input name={`serviceCustom.${field.id}`} type={field.type==="number"?"number":"text"} min={field.type==="number"?0:undefined} maxLength={200} defaultValue={visit?.customFields[field.id]}/>}</label>)}
    <label className={styles.wide}>Notes<textarea aria-label="Notes" name="notes" rows={3} maxLength={2000} defaultValue={visit?.notes}/></label>
    <p className={`${styles.note} ${styles.wide}`}>Recorded by {visit?.staffName??staffName}. Staff identity is assigned from the signed-in account.</p>
  </ActionForm>;
}
export function DeleteRecord({kind,id}:{kind:"client"|"visit";id:string}) {return <ActionForm label={`Delete ${kind} ${id}`} submit={kind==="client"?"Delete client":"Delete service entry"} confirmation={kind==="client"?"Delete this fictional client and all associated service entries?":"Delete this fictional service entry?"}><input type="hidden" name="op" value={`${kind}.delete`}/><input type="hidden" name="id" value={id}/></ActionForm>;}
export function FieldForm({field,revision,scope="client"}:{field?:CustomField;revision:number;scope?:"client"|"visit"}) {return <ActionForm label={field?`Edit field ${field.label}`:scope==="client"?"Add demographic field":"Add service-log field"} submit={field?"Save field":scope==="client"?"Add demographic field":"Add service-log field"}>
  <input type="hidden" name="fieldScope" value={scope}/><input type="hidden" name="op" value="field.save"/><input type="hidden" name="settingsRevision" value={revision}/>{field && <input type="hidden" name="id" value={field.id}/>}
  <label>Field label<input name="label" required maxLength={60} defaultValue={field?.label}/></label><label>Field type<select name="type" defaultValue={field?.type??"text"}><option value="text">Text</option><option value="number">Whole number</option><option value="select">Dropdown</option></select></label>
  <label className={styles.wide}>Dropdown options (comma-separated)<input name="options" maxLength={1600} defaultValue={field?.options.join(", ")}/></label>
</ActionForm>;}
export function ServiceTypeForm({type,revision}:{type?:ServiceType;revision:number}) {return <ActionForm label={type?`Edit service type ${type.label}`:"Add service type"} submit={type?"Save service type":"Add service type"}>
  <input type="hidden" name="op" value="service.save"/><input type="hidden" name="settingsRevision" value={revision}/>{type && <input type="hidden" name="id" value={type.id}/>}
  <label className={styles.wide}>Service type name<input name="label" required maxLength={80} defaultValue={type?.label}/></label>
</ActionForm>;}
export function RemoveSetting({kind,id,revision,scope="client"}:{kind:"field"|"service";id:string;revision:DemoData["settingsRevision"];scope?:"client"|"visit"}) {return <ActionForm label={`Remove ${kind} ${id}`} submit={kind==="field"?"Remove field":"Retire service type"}><input type="hidden" name="fieldScope" value={scope}/><input type="hidden" name="op" value={`${kind}.delete`}/><input type="hidden" name="id" value={id}/><input type="hidden" name="settingsRevision" value={revision}/></ActionForm>;}
