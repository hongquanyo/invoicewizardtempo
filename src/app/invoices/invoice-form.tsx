"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "../../../supabase/client";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
}

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Invoice {
  id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: string;
  tax_rate: number;
  notes: string | null;
  line_items?: LineItem[];
}

interface InvoiceFormProps {
  customers: Customer[];
  invoice?: Invoice;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function InvoiceForm({ customers, invoice }: InvoiceFormProps) {
  const [formData, setFormData] = useState({
    customer_id: invoice?.customer_id || "",
    invoice_number: invoice?.invoice_number || "",
    invoice_date:
      invoice?.invoice_date || new Date().toISOString().split("T")[0],
    due_date: invoice?.due_date || "",
    status: invoice?.status || "draft",
    tax_rate: invoice?.tax_rate || 6.0,
    notes: invoice?.notes || "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.line_items || [
      { description: "", quantity: 1, unit_price: 0, total: 0 },
    ],
  );

  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Generate invoice number if creating new invoice
  useEffect(() => {
    if (!invoice && !formData.invoice_number) {
      const invoiceNumber = `INV-${Date.now()}`;
      setFormData((prev) => ({ ...prev, invoice_number: invoiceNumber }));
    }
  }, [invoice, formData.invoice_number]);

  // Calculate line item totals
  const updateLineItemTotal = (
    index: number,
    quantity: number,
    unitPrice: number,
  ) => {
    const total = quantity * unitPrice;
    const updatedItems = [...lineItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity,
      unit_price: unitPrice,
      total,
    };
    setLineItems(updatedItems);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: "", quantity: 1, unit_price: 0, total: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = subtotal * (formData.tax_rate / 100);
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to perform this action.",
          variant: "destructive",
        });
        return;
      }

      if (!formData.customer_id) {
        toast({
          title: "Error",
          description: "Please select a customer.",
          variant: "destructive",
        });
        return;
      }

      if (lineItems.some((item) => !item.description.trim())) {
        toast({
          title: "Error",
          description: "Please fill in all line item descriptions.",
          variant: "destructive",
        });
        return;
      }

      if (invoice) {
        // Update existing invoice
        const { error: invoiceError } = await supabase
          .from("invoices")
          .update({
            customer_id: formData.customer_id,
            invoice_number: formData.invoice_number,
            invoice_date: formData.invoice_date,
            due_date: formData.due_date,
            status: formData.status,
            tax_rate: formData.tax_rate,
            notes: formData.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoice.id);

        if (invoiceError) throw invoiceError;

        // Delete existing line items
        const { error: deleteError } = await supabase
          .from("line_items")
          .delete()
          .eq("invoice_id", invoice.id);

        if (deleteError) throw deleteError;

        // Insert new line items
        const { error: lineItemsError } = await supabase
          .from("line_items")
          .insert(
            lineItems.map((item) => ({
              invoice_id: invoice.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total: item.total,
            })),
          );

        if (lineItemsError) throw lineItemsError;

        toast({
          title: "Success",
          description: "Invoice updated successfully.",
        });
      } else {
        // Create new invoice
        const { data: newInvoice, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            user_id: user.id,
            customer_id: formData.customer_id,
            invoice_number: formData.invoice_number,
            invoice_date: formData.invoice_date,
            due_date: formData.due_date,
            status: formData.status,
            tax_rate: formData.tax_rate,
            notes: formData.notes || null,
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Insert line items
        const { error: lineItemsError } = await supabase
          .from("line_items")
          .insert(
            lineItems.map((item) => ({
              invoice_id: newInvoice.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total: item.total,
            })),
          );

        if (lineItemsError) throw lineItemsError;

        toast({
          title: "Success",
          description: "Invoice created successfully.",
        });
      }

      router.push("/invoices");
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast({
        title: "Error",
        description: "Failed to save invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Invoice Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="customer_id">Customer *</Label>
          <Select
            value={formData.customer_id}
            onValueChange={(value) =>
              setFormData({ ...formData, customer_id: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="invoice_number">Invoice Number *</Label>
          <Input
            id="invoice_number"
            type="text"
            value={formData.invoice_number}
            onChange={(e) =>
              setFormData({ ...formData, invoice_number: e.target.value })
            }
            required
            placeholder="INV-001"
          />
        </div>

        <div>
          <Label htmlFor="invoice_date">Invoice Date *</Label>
          <Input
            id="invoice_date"
            type="date"
            value={formData.invoice_date}
            onChange={(e) =>
              setFormData({ ...formData, invoice_date: e.target.value })
            }
            required
          />
        </div>

        <div>
          <Label htmlFor="due_date">Due Date *</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) =>
              setFormData({ ...formData, due_date: e.target.value })
            }
            required
          />
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="tax_rate">Tax Rate (%)</Label>
          <Input
            id="tax_rate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.tax_rate}
            onChange={(e) =>
              setFormData({
                ...formData,
                tax_rate: parseFloat(e.target.value) || 0,
              })
            }
          />
        </div>
      </div>

      {/* Line Items */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Line Items</h3>
          <Button type="button" onClick={addLineItem} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">Quantity</TableHead>
                <TableHead className="w-32">Unit Price (RM)</TableHead>
                <TableHead className="w-32">Total</TableHead>
                <TableHead className="w-16">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={item.description}
                      onChange={(e) => {
                        const updatedItems = [...lineItems];
                        updatedItems[index].description = e.target.value;
                        setLineItems(updatedItems);
                      }}
                      placeholder="Item description"
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => {
                        const quantity = parseFloat(e.target.value) || 0;
                        updateLineItemTotal(index, quantity, item.unit_price);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => {
                        const unitPrice = parseFloat(e.target.value) || 0;
                        updateLineItemTotal(index, item.quantity, unitPrice);
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(item.total)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Invoice Summary */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="max-w-sm ml-auto space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax ({formData.tax_rate}%):</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <span className="text-green-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes or terms"
          rows={3}
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-4">
        <Link href="/invoices">
          <Button type="button" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={
            isLoading ||
            !formData.customer_id ||
            !formData.invoice_number.trim()
          }
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading
            ? "Saving..."
            : invoice
              ? "Update Invoice"
              : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
