import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import DashboardNavbar from "@/components/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Edit, Download, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface InvoiceDetailPageProps {
  params: {
    id: string;
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getStatusColor(status: string) {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-800";
    case "sent":
      return "bg-blue-100 text-blue-800";
    case "overdue":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      `
      *,
      customers (
        name,
        email,
        phone,
        address
      ),
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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Invoice {invoice.invoice_number}
              </h1>
              <p className="text-gray-600 mt-2">
                Invoice details and line items
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/invoices">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Invoices
                </Button>
              </Link>
              <Link href={`/invoices/${invoice.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button className="bg-green-600 hover:bg-green-700">
                <Send className="h-4 w-4 mr-2" />
                Send Reminder
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Invoice Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Invoice Header */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Invoice Information
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">
                          Invoice Number:
                        </span>
                        <p className="font-medium">{invoice.invoice_number}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">
                          Invoice Date:
                        </span>
                        <p>
                          {new Date(invoice.invoice_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Due Date:</span>
                        <p>{new Date(invoice.due_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Status:</span>
                        <div className="mt-1">
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status.charAt(0).toUpperCase() +
                              invoice.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Customer Information
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Name:</span>
                        <p className="font-medium">{invoice.customers?.name}</p>
                      </div>
                      {invoice.customers?.email && (
                        <div>
                          <span className="text-sm text-gray-500">Email:</span>
                          <p>{invoice.customers.email}</p>
                        </div>
                      )}
                      {invoice.customers?.phone && (
                        <div>
                          <span className="text-sm text-gray-500">Phone:</span>
                          <p>{invoice.customers.phone}</p>
                        </div>
                      )}
                      {invoice.customers?.address && (
                        <div>
                          <span className="text-sm text-gray-500">
                            Address:
                          </span>
                          <p className="whitespace-pre-line">
                            {invoice.customers.address}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold">Line Items</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.line_items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Invoice Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Tax ({invoice.tax_rate}%):
                    </span>
                    <span>{formatCurrency(invoice.tax_amount)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total:</span>
                      <span className="text-green-600">
                        {formatCurrency(invoice.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {invoice.notes && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Notes</h3>
                  <p className="text-gray-600 whitespace-pre-line">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
