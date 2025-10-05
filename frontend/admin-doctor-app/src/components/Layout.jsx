import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import AlertProvider from "./AlertProvider";

export default function Layout({ children }) {
  return (
    <AlertProvider>
      <div className="container-fluid p-0">
        <Topbar />
        <div className="row g-0">
          <aside className="col-lg-2 d-none d-lg-block">
            <Sidebar />
          </aside>
          <main className="col-12 col-lg-10 p-3">{children}</main>
        </div>
      </div>
    </AlertProvider>
  );
}
