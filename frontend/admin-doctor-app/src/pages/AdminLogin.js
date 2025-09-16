import React,{useState} from 'react';
import { adminLogin } from '../api/client';
export default function AdminLogin(){
  const [tenDangNhap,setU]=useState(''); const [matKhau,setP]=useState(''); const [msg,setMsg]=useState('');
  const submit=async(e)=>{e.preventDefault();setMsg('');try{
    const data=await adminLogin({tenDangNhap,matKhau}); setMsg('Đăng nhập ADMIN thành công'); localStorage.setItem('token',data.accessToken);
  }catch(err){setMsg(err.message);}}
  return (<form onSubmit={submit}>
    <h1>Admin Login</h1>
    <label>Tên đăng nhập<input value={tenDangNhap} onChange={e=>setU(e.target.value)} required/></label>
    <label>Mật khẩu<input type="password" value={matKhau} onChange={e=>setP(e.target.value)} required/></label>
    <button>Đăng nhập</button>
    {msg && <div className={msg.includes('thành công')?'success':'error'}>{msg}</div>}
  </form>);
}
