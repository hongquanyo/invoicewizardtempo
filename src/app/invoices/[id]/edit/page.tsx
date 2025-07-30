import { redirect } from "next/navigation";
import { createClient } from "../../../../../supabase/server";
import DashboardNavbar from "@/components/dashboard-navbar";
import InvoiceForm from "../../invoice-form";
import { notFound } from "next/navigation";

interface EditInvoicePageProps {
  params: {
    id: string;
  };
}

export default async function EditInvoicePage({
  params,
}: EditInvoicePageProps) {
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

  // Fetch the invoice with line items
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      `
      *,
      line_items (
        id,
        description,
        quantity,
        unit_price,
        total
      )
    `,
    )
    .eq("id", params.id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  return (
    <>
      <DashboardNavbar />
      <main className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Edit Invoice</h1>
            <p className="text-gray-600 mt-2">
              Update invoice information and line items
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <InvoiceForm customers={customers || []} invoice={invoice} />
          </div>
        </div>
      </main>
    </>
  );
}
