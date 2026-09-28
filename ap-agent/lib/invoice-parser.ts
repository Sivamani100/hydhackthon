// lib/invoice-parser.ts
import pdfParse from 'pdf-parse';
import { ParsedInvoice, LineItem } from './types';

export async function parseInvoicePDF(buffer: Buffer): Promise<ParsedInvoice> {
  let rawText = '';

  try {
    const pdfData = await pdfParse(buffer);
    rawText = pdfData.text;
  } catch (err) {
    console.error('[Parser] PDF parse error:', err);
    throw new Error('Could not read PDF file. Make sure it is a valid PDF.');
  }

  const parsed = extractInvoiceFields(rawText);
  return { ...parsed, raw_text: rawText };
}

function extractInvoiceFields(text: string): Omit<ParsedInvoice, 'raw_text'> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Extract amount — look for largest currency-like number
  const amountPatterns = [
    /total[:\s]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
    /grand total[:\s]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
    /amount due[:\s]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d{2})?)/i,
  ];

  let amount: number | undefined;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Extract PO number
  const poMatch = text.match(/(?:po|purchase order|p\.o\.)[:\s#]*(PO-[\w-]+|\d{4,})/i);
  const po_number = poMatch ? poMatch[1].toUpperCase() : undefined;

  // Extract invoice number
  const invMatch = text.match(/(?:invoice|inv)[:\s#]*(INV-[\w-]+|[\w-]{5,20})/i);
  const invoice_number = invMatch ? invMatch[1] : undefined;

  // Extract vendor name (usually in first 5 lines)
  let vendor_name: string | undefined;
  for (const line of lines.slice(0, 5)) {
    if (line.length > 5 && line.length < 60 && !line.match(/invoice|receipt|bill|date/i)) {
      vendor_name = line;
      break;
    }
  }

  // Extract due date
  const datePatterns = [
    /due date[:\s]+([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4})/i,
    /payment due[:\s]+([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4})/i,
  ];
  let due_date: string | undefined;
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) { due_date = match[1]; break; }
  }

  // Line items — simple extraction
  const line_items: LineItem[] = [];
  const lineItemPattern = /^(.{5,40})\s+(\d+)\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)$/;
  for (const line of lines) {
    const match = line.match(lineItemPattern);
    if (match) {
      line_items.push({
        description: match[1].trim(),
        quantity: parseInt(match[2]),
        unit_price: parseFloat(match[3].replace(/,/g, '')),
        total: parseFloat(match[4].replace(/,/g, '')),
      });
    }
  }

  return { vendor_name, po_number, invoice_number, amount, line_items, due_date };
}

// Generate a synthetic invoice PDF-like text for testing (used in seed/demo)
export function generateSyntheticInvoiceText(params: {
  vendorName: string;
  poNumber: string;
  invoiceNumber: string;
  amount: number;
  lineItems: LineItem[];
}): string {
  return `
${params.vendorName}
GST: 29AABCT1332L1ZN

INVOICE

Invoice No: ${params.invoiceNumber}
Date: ${new Date().toLocaleDateString('en-IN')}
Due Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}

Bill To:
AP Department
Your Company Ltd.

PO Number: ${params.poNumber}

${params.lineItems.map(item =>
  `${item.description}    ${item.quantity}    ${item.unit_price}    ${item.total}`
).join('\n')}

Total: INR ${params.amount}

Bank Details:
Account: XXXX4521
IFSC: HDFC0001234
  `.trim();
}
