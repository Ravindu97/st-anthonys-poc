export function Sidebar() {
  return (
    <aside className="sidebar">
      <h1>St. Anthony&apos;s Ops</h1>
      <nav>
        <a href="/">Overview</a>
        <a href="/charge-points">Charge Points</a>
        <a href="/sessions">Sessions</a>
        <a href="/hubs">Hub Load</a>
        <a href="/login">Sign out</a>
      </nav>
    </aside>
  );
}
