import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import DoctorLogin from './pages/DoctorLogin';
import DoctorRegister from './pages/DoctorRegister';

export default function App(){
  return (
    <div className="container">
      <div className="nav">
        <Link to="/">Trang chủ</Link>
        <Link to="/admin/login">Admin Login</Link>
        <Link to="/doctor/login">Doctor Login</Link>
        <Link to="/doctor/register">Doctor Register</Link>
      </div>
      <div className="card">
        <Routes>
          <Route path="/" element={<h1>Admin/Doctor Portal</h1>} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/doctor/login" element={<DoctorLogin />} />
          <Route path="/doctor/register" element={<DoctorRegister />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}
