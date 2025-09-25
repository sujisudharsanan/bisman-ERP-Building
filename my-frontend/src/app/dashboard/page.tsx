import DashboardLayout from '@/components/layout/DashboardLayout'

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Welcome to the ERP dashboard</h2>
        <p>Use the sidebar to navigate modules (HR, Finance, Inventory, CRM)</p>
      </div>
    </DashboardLayout>
  )
}
