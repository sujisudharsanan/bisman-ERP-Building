import LogoutButton from '@/components/ui/LogoutButton'

export default function Home() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-8">ERP Dashboard Starter</h1>
        <LogoutButton variant="danger" />
      </div>
    </div>
  );
}
