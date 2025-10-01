export default function Topbar({ title, user, onLogout }) {
  return (
    <header style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      borderBottom: "1px solid #e5e7eb", padding: "12px 16px"
    }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <div>
        <span style={{ marginRight: 12 }}>{user?.name}</span>
        <button onClick={onLogout}>Đăng xuất</button>
      </div>
    </header>
  );
}
