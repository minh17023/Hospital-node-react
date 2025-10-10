import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import AlertProvider from "./AlertProvider";

export default function Layout({ children }) {
  return (
    <AlertProvider>
      {/* App shell cố định chiều cao */}
      <div className="app-shell">
        {/* Topbar cao var(--topbar-h) */}
        <div className="topbar">
          <Topbar />
        </div>

        {/* Phần còn lại chiếm toàn bộ chiều cao còn lại */}
        <div className="app-content">
          {/* Sidebar cố định chiều rộng, không cuộn trang */}
          <aside className="app-sidebar d-none d-lg-block">
            <Sidebar />
          </aside>

          {/* Vùng nội dung có thể cuộn nội bộ */}
          <main className="app-main p-3">
            {/* Mỗi trang bọc trong .page -> .page-body để kích hoạt overflow nội bộ */}
            <div className="page">
              <div className="page-body">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </AlertProvider>
  );
}
