'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({ invalid_type_error: 'Please select a customer' }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Amount must be greater than $0' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoce status',
  }),
  date: z.string(),
});
const CreateInvoice = FormSchema.omit({ id: true, date: true });
export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin': {
          return 'Invalid credentials. Please try again.';
        }
        default:
          return 'Something went wrong. Please try again.';
      }
    }
    throw error;
  }
}
export async function createInvoice(prevState: State, formData: FormData) {
  //const rawFormData = Object.fromEntries(formData);  alternative way to convert FormData to object
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  console.log(validatedFields);
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice',
    };
  }
  const { customerId, amount, status } = validatedFields.data;
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
export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  console.log(validatedFields);
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice',
    };
  }
  const { customerId, amount, status } = validatedFields.data;
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
