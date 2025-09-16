import React,{useState} from 'react';
import { doctorLogin } from '../api/client';
export default function DoctorLogin(){
  const [tenDangNhap,setU]=useState(''); const [matKhau,setP]=useState(''); const [msg,setMsg]=useState('');
  const submit=async(e)=>{e.preventDefault();setMsg('');try{
    const data=await doctorLogin({tenDangNhap,matKhau}); setMsg('Đăng nhập DOCTOR thành công'); localStorage.setItem('token',data.accessToken);
  }catch(err){setMsg(err.message);}}
  return (<form onSubmit={submit}>
    <h1>Doctor Login</h1>
    <label>Tên đăng nhập<input value={tenDangNhap} onChange={e=>setU(e.target.value)} required/></label>
    <label>Mật khẩu<input type="password" value={matKhau} onChange={e=>setP(e.target.value)} required/></label>
    <button>Đăng nhập</button>
    {msg && <div className={msg.includes('thành công')?'success':'error'}>{msg}</div>}
  </form>);
}
