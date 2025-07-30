import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import DashboardNavbar from "@/components/dashboard-navbar";
import InvoiceForm from "../invoice-form";

export default async function NewInvoicePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch customers for the dropdown
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .order("name");

  return (
    <>
      <DashboardNavbar />
      <main className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Create New Invoice
            </h1>
            <p className="text-gray-600 mt-2">
              Generate a new invoice for your customer
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <InvoiceForm customers={customers || []} />
          </div>
        </div>
      </main>
    </>
  );
}
