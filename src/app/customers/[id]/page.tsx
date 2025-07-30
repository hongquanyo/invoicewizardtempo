import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import DashboardNavbar from "@/components/dashboard-navbar";
import CustomerForm from "../customer-form";
import { notFound } from "next/navigation";

interface EditCustomerPageProps {
  params: {
    id: string;
  };
}

export default async function EditCustomerPage({
  params,
}: EditCustomerPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !customer) {
    notFound();
  }

  return (
    <>
      <DashboardNavbar />
      <main className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Edit Customer</h1>
            <p className="text-gray-600 mt-2">Update customer information</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <CustomerForm customer={customer} />
          </div>
        </div>
      </main>
    </>
  );
}
