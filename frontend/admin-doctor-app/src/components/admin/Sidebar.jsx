export default function Sidebar() {
  return (
    <aside style={{ borderRight: "1px solid #e5e7eb", padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Admin</h3>
      <ul style={{ paddingLeft: 16, lineHeight: "28px" }}>
        <li><a href="/admin">Dashboard</a></li>
        {/* thêm mục khác */}
      </ul>
    </aside>
  );
}
