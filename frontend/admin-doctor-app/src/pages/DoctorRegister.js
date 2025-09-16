import React,{useState} from 'react';
import { doctorRegister } from '../api/client';
export default function DoctorRegister(){
  const [f,setF]=useState({tenDangNhap:'',matKhau:'',hoTen:'',soDienThoai:'',email:'',idChuyenKhoa:''});
  const [msg,setMsg]=useState('');
  const onChange=(e)=>setF({...f,[e.target.name]:e.target.value});
  const submit=async(e)=>{e.preventDefault();setMsg('');try{
    const data=await doctorRegister({...f,idChuyenKhoa:Number(f.idChuyenKhoa)}); setMsg('Đăng ký DOCTOR thành công'); localStorage.setItem('token',data.accessToken);
  }catch(err){setMsg(err.message);}}
  return (<form onSubmit={submit}>
    <h1>Doctor Register</h1>
    <div className="row">
      <div style={{flex:1}}><label>Họ tên<input name="hoTen" value={f.hoTen} onChange={onChange} required/></label></div>
      <div style={{flex:1}}><label>Tên đăng nhập<input name="tenDangNhap" value={f.tenDangNhap} onChange={onChange} required/></label></div>
    </div>
    <label>Mật khẩu<input type="password" name="matKhau" value={f.matKhau} onChange={onChange} required/></label>
    <div className="row">
      <div style={{flex:1}}><label>SĐT<input name="soDienThoai" value={f.soDienThoai} onChange={onChange}/></label></div>
      <div style={{flex:1}}><label>Email<input type="email" name="email" value={f.email} onChange={onChange}/></label></div>
    </div>
    <label>Chuyên khoa (id)<input name="idChuyenKhoa" value={f.idChuyenKhoa} onChange={onChange} required/></label>
    <button>Đăng ký</button>
    {msg && <div className={msg.includes('thành công')?'success':'error'}>{msg}</div>}
  </form>);
}
