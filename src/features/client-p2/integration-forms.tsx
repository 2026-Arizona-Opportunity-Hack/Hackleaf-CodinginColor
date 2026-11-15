"use client";
import { useActionState } from "react";
import { integrationAction } from "./integration-actions";
export function IntegrationKeyForm({id}:{id?:string}){const [state,action,pending]=useActionState(integrationAction,{error:'',token:''});return <form action={action}><input name="op" type="hidden" value={id?'revoke':'create'}/>{id&&<input type="hidden" name="id" value={id}/>}<button className="button" disabled={pending}>{id?'Revoke integration key':'Create integration key'}</button>{state.error&&<p role="alert">{state.error}</p>}{state.token&&<div role="status"><p>Copy this key now. It is displayed once and grants client-creation access to this organization. It is not an app login.</p><code style={{overflowWrap:'anywhere'}}>{state.token}</code></div>}</form>;}
