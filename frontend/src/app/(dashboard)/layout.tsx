export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div>
            <aside>Sidebar Placeholder</aside>
            <main>
                <header>Topbar Placeholder</header>
                {children}
            </main>
        </div>
    );
}
