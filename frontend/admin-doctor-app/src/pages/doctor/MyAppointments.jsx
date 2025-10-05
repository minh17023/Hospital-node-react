import Layout from "../../components/Layout";
export default function MyAppointments() {
  return (
    <Layout>
      <div className="card">
        <h2>Lịch hẹn của tôi</h2>
        {/* TODO: GET /appointments?maBacSi=...&ngay=... hoặc endpoint riêng cho doctor */}
      </div>
    </Layout>
  );
}
