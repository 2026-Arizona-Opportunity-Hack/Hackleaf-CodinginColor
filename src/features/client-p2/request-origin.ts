// Next may use an internal hostname in Request.url. Compare the browser's Origin
// with the received Host, falling back to URL host for direct handler tests.
export function sameOrigin(request:Request){try{const origin=new URL(request.headers.get('origin')??'');return ['http:','https:'].includes(origin.protocol)&&origin.host===(request.headers.get('host')??new URL(request.url).host);}catch{return false;}}
