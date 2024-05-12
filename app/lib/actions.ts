'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});
const CreateInvoice = FormSchema.omit({ id: true, date: true });
export async function createInvoice(formData: FormData) {
  //const rawFormData = Object.fromEntries(formData);  alternative way to convert FormData to object
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const date = new Date().toISOString().split('T')[0];
  const amoutInCents = amount * 100;
  try {
    await sql`INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amoutInCents}, ${status}, ${date})`;
  } catch (error) {
    return {
      message:
        'Database error: Fiailed to create invoice. Please try again later.',
    };
  }

  revalidatePath('/dashboard/invoices'); // Refetch the invoices page because we are mainly working with cashed data
  redirect('/dashboard/invoices');
}
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const amoutInCents = amount * 100;
  try {
    await sql`UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amoutInCents}, status = ${status}
        WHERE id = ${id}`;
  } catch (error) {
    return {
      message:
        'Database error: Fiailed to update invoice. Please try again later.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  try {
    revalidatePath('/dashboard/invoices');
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    return { message: 'Invoice deleted successfully' };
  } catch (error) {
    return {
      message:
        'Database error: Failed to delete invoice. Please try again later.',
    };
  }
}
