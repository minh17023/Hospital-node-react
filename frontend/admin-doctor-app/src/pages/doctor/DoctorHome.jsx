import Layout from "../../components/Layout";

export default function DoctorHome() {
  return (
    <Layout>
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Lịch hẹn hôm nay</h5>
              <p className="text-secondary small mb-0">Tổng số, đã khám, đang chờ…</p>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Ca làm việc</h5>
              <p className="text-secondary small mb-0">Sáng 08:00–11:00, Chiều 13:30–17:00…</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
