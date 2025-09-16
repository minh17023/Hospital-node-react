const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';
async function request(path,{method='GET',token,body}={}){
  const res = await fetch(`${API_BASE}${path}`,{
    method,
    headers:{'Content-Type':'application/json', ...(token?{'Authorization':`Bearer ${token}`}:{})},
    body: body?JSON.stringify(body):undefined
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data?.message||`HTTP ${res.status}`);
  return data;
}
export const adminLogin     = (p)=>request('/auth/admin/login',{method:'POST',body:p});
export const doctorLogin    = (p)=>request('/auth/doctor/login',{method:'POST',body:p});
export const doctorRegister = (p)=>request('/auth/doctor/register',{method:'POST',body:p});
export const patientLogin   = (p)=>request('/auth/patient/login',{method:'POST',body:p});
export const patientRegister= (p)=>request('/auth/patient/register',{method:'POST',body:p});
export const patientMe      = (t)=>request('/auth/patient/me',{method:'GET',token:t});
export default { };
