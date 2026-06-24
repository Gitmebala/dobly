/**
 * AI Invoice Processing for Finance Department
 * Automates invoice data extraction, validation, and processing
 */

export interface InvoiceDocument {
  id: string;
  filename: string;
  fileType: "pdf" | "image" | "doc";
  content: string; // OCR'd text content
  uploadedAt: string;
  uploadedBy: string;
  size: number;
  metadata: {
    pageCount?: number;
    resolution?: string;
    language?: string;
  };
}

export interface ExtractedInvoiceData {
  invoiceId: string;
  vendorName: string;
  vendorTaxId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  currency: string;
  taxAmount?: number;
  lineItems: InvoiceLineItem[];
  paymentTerms: string;
  bankDetails?: BankDetails;
  confidence: number;
  extractedAt: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  taxRate?: number;
  category?: string;
  accountCode?: string;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
}

export interface ProcessingResult {
  invoiceId: string;
  status: "processed" | "pending_review" | "rejected" | "duplicate";
  extractedData: ExtractedInvoiceData;
  validations: ValidationCheck[];
  duplicates: DuplicateMatch[];
  recommendations: ProcessingRecommendation[];
  nextActions: string[];
  estimatedProcessingTime: number;
}

export interface ValidationCheck {
  type: "vendor" | "amount" | "date" | "tax" | "format" | "compliance";
  status: "pass" | "fail" | "warning";
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  autoFixable: boolean;
}

export interface DuplicateMatch {
  invoiceId: string;
  similarity: number;
  fields: string[];
  existingInvoice: {
    invoiceNumber: string;
    vendor: string;
    amount: number;
    date: string;
    status: string;
  };
}

export interface ProcessingRecommendation {
  type: "approve" | "reject" | "escalate" | "request_info" | "auto_process";
  action: string;
  reasoning: string;
  priority: "low" | "medium" | "high" | "urgent";
}

/**
 * Process invoice document using AI
 */
export async function processInvoice(
  document: InvoiceDocument,
  vendorDatabase?: VendorRecord[],
  existingInvoices?: ExtractedInvoiceData[]
): Promise<ProcessingResult> {
  // Step 1: Extract invoice data using AI
  const extractedData = await extractInvoiceData(document);
  
  // Step 2: Validate extracted data
  const validations = await validateInvoiceData(extractedData, vendorDatabase);
  
  // Step 3: Check for duplicates
  const duplicates = await checkForDuplicates(extractedData, existingInvoices);
  
  // Step 4: Generate recommendations
  const recommendations = generateProcessingRecommendations(extractedData, validations, duplicates);
  
  // Step 5: Determine processing status
  const status = determineProcessingStatus(validations, duplicates, recommendations);
  
  // Step 6: Generate next actions
  const nextActions = generateNextActions(status, validations, recommendations);
  
  // Step 7: Estimate processing time
  const processingTime = estimateProcessingTime(status, validations);

  return {
    invoiceId: extractedData.invoiceId,
    status,
    extractedData,
    validations,
    duplicates,
    recommendations,
    nextActions,
    estimatedProcessingTime: processingTime,
  };
}

/**
 * Extract invoice data using AI and OCR
 */
async function extractInvoiceData(document: InvoiceDocument): Promise<ExtractedInvoiceData> {
  // In a real implementation, this would use advanced OCR and NLP
  // For now, we'll simulate the extraction process
  
  console.log(`Extracting data from ${document.filename}...`);
  
  // Simulate OCR processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock extracted data (in real implementation, this would be AI-extracted)
  const extractedData: ExtractedInvoiceData = {
    invoiceId: `inv-${Date.now()}`,
    vendorName: "Sample Vendor Inc.",
    vendorTaxId: "12-3456789",
    invoiceNumber: "INV-2024-001234",
    invoiceDate: "2024-01-15",
    dueDate: "2024-02-14",
    totalAmount: 1250.00,
    currency: "USD",
    taxAmount: 125.00,
    lineItems: [
      {
        description: "Professional Services",
        quantity: 10,
        unitPrice: 100.00,
        totalAmount: 1000.00,
        taxRate: 10,
        category: "Services",
        accountCode: "6000",
      },
      {
        description: "Software License",
        quantity: 1,
        unitPrice: 250.00,
        totalAmount: 250.00,
        taxRate: 10,
        category: "Software",
        accountCode: "6100",
      },
    ],
    paymentTerms: "Net 30",
    bankDetails: {
      bankName: "First National Bank",
      accountNumber: "****1234",
      routingNumber: "123456789",
    },
    confidence: 0.85,
    extractedAt: new Date().toISOString(),
  };

  return extractedData;
}

/**
 * Validate extracted invoice data
 */
async function validateInvoiceData(
  data: ExtractedInvoiceData,
  vendorDatabase?: VendorRecord[]
): Promise<ValidationCheck[]> {
  const validations: ValidationCheck[] = [];

  // Vendor validation
  if (vendorDatabase) {
    const vendor = vendorDatabase.find(v => 
      v.name.toLowerCase().includes(data.vendorName.toLowerCase()) ||
      v.taxId === data.vendorTaxId
    );

    if (!vendor) {
      validations.push({
        type: "vendor",
        status: "warning",
        message: "Vendor not found in database",
        severity: "medium",
        autoFixable: false,
      });
    } else {
      validations.push({
        type: "vendor",
        status: "pass",
        message: "Vendor verified in database",
        severity: "low",
        autoFixable: true,
      });
    }
  }

  // Amount validation
  if (data.totalAmount <= 0) {
    validations.push({
      type: "amount",
      status: "fail",
      message: "Invoice amount must be greater than 0",
      severity: "critical",
      autoFixable: false,
    });
  } else if (data.totalAmount > 100000) {
    validations.push({
      type: "amount",
      status: "warning",
      message: "High-value invoice requires additional approval",
      severity: "high",
      autoFixable: false,
    });
  } else {
    validations.push({
      type: "amount",
      status: "pass",
      message: "Invoice amount within normal range",
      severity: "low",
      autoFixable: true,
    });
  }

  // Date validation
  const invoiceDate = new Date(data.invoiceDate);
  const dueDate = new Date(data.dueDate);
  const today = new Date();

  if (invoiceDate > today) {
    validations.push({
      type: "date",
      status: "warning",
      message: "Invoice date is in the future",
      severity: "medium",
      autoFixable: false,
    });
  } else if (dueDate < invoiceDate) {
    validations.push({
      type: "date",
      status: "fail",
      message: "Due date is before invoice date",
      severity: "critical",
      autoFixable: false,
    });
  } else {
    validations.push({
      type: "date",
      status: "pass",
      message: "Invoice and due dates are valid",
      severity: "low",
      autoFixable: true,
    });
  }

  // Tax validation
  const calculatedTax = data.lineItems.reduce((sum, item) => {
    const itemTax = item.totalAmount * (item.taxRate || 0) / 100;
    return sum + itemTax;
  }, 0);

  if (data.taxAmount && Math.abs(data.taxAmount - calculatedTax) > 1) {
    validations.push({
      type: "tax",
      status: "warning",
      message: `Tax amount mismatch. Calculated: $${calculatedTax.toFixed(2)}, Specified: $${data.taxAmount.toFixed(2)}`,
      severity: "medium",
      autoFixable: true,
    });
  } else {
    validations.push({
      type: "tax",
      status: "pass",
      message: "Tax amounts are consistent",
      severity: "low",
      autoFixable: true,
    });
  }

  // Format validation
  if (!data.invoiceNumber || data.invoiceNumber.trim().length === 0) {
    validations.push({
      type: "format",
      status: "fail",
      message: "Invoice number is required",
      severity: "critical",
      autoFixable: false,
    });
  } else {
    validations.push({
      type: "format",
      status: "pass",
      message: "Invoice number format is valid",
      severity: "low",
      autoFixable: true,
    });
  }

  // Compliance validation
  if (data.totalAmount > 10000 && !data.vendorTaxId) {
    validations.push({
      type: "compliance",
      status: "warning",
      message: "High-value invoice requires vendor tax ID for compliance",
      severity: "high",
      autoFixable: false,
    });
  } else {
    validations.push({
      type: "compliance",
      status: "pass",
      message: "Compliance requirements met",
      severity: "low",
      autoFixable: true,
    });
  }

  return validations;
}

/**
 * Check for duplicate invoices
 */
async function checkForDuplicates(
  data: ExtractedInvoiceData,
  existingInvoices?: ExtractedInvoiceData[]
): Promise<DuplicateMatch[]> {
  if (!existingInvoices || existingInvoices.length === 0) {
    return [];
  }

  const duplicates: DuplicateMatch[] = [];

  existingInvoices.forEach(existing => {
    let similarity = 0;
    const matchingFields: string[] = [];

    // Check invoice number
    if (data.invoiceNumber === existing.invoiceNumber) {
      similarity += 40;
      matchingFields.push("invoice_number");
    }

    // Check vendor and amount
    if (data.vendorName.toLowerCase() === existing.vendorName.toLowerCase() &&
        Math.abs(data.totalAmount - existing.totalAmount) < 0.01) {
      similarity += 30;
      matchingFields.push("vendor_and_amount");
    }

    // Check date proximity (within 7 days)
    const dateDiff = Math.abs(new Date(data.invoiceDate).getTime() - new Date(existing.invoiceDate).getTime());
    const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
    if (daysDiff <= 7) {
      similarity += 20;
      matchingFields.push("date_proximity");
    }

    // Check line items similarity
    if (data.lineItems.length === existing.lineItems.length) {
      const itemSimilarity = calculateLineItemSimilarity(data.lineItems, existing.lineItems);
      similarity += itemSimilarity * 10;
      if (itemSimilarity > 0.5) {
        matchingFields.push("line_items");
      }
    }

    // If similarity is high enough, consider it a duplicate
    if (similarity >= 50) {
      duplicates.push({
        invoiceId: existing.invoiceId,
        similarity: similarity / 100,
        fields: matchingFields,
        existingInvoice: {
          invoiceNumber: existing.invoiceNumber,
          vendor: existing.vendorName,
          amount: existing.totalAmount,
          date: existing.invoiceDate,
          status: "processed", // Would come from actual status
        },
      });
    }
  });

  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Calculate line item similarity
 */
function calculateLineItemSimilarity(items1: InvoiceLineItem[], items2: InvoiceLineItem[]): number {
  if (items1.length !== items2.length) return 0;

  let matches = 0;
  items1.forEach(item1 => {
    const match = items2.find(item2 => 
      item1.description.toLowerCase() === item2.description.toLowerCase() &&
      Math.abs(item1.totalAmount - item2.totalAmount) < 0.01
    );
    if (match) matches++;
  });

  return matches / items1.length;
}

/**
 * Generate processing recommendations
 */
function generateProcessingRecommendations(
  data: ExtractedInvoiceData,
  validations: ValidationCheck[],
  duplicates: DuplicateMatch[]
): ProcessingRecommendation[] {
  const recommendations: ProcessingRecommendation[] = [];

  // Critical failures
  const criticalFailures = validations.filter(v => v.status === "fail" && v.severity === "critical");
  if (criticalFailures.length > 0) {
    recommendations.push({
      type: "reject",
      action: "Reject invoice due to critical validation failures",
      reasoning: criticalFailures.map(f => f.message).join("; "),
      priority: "urgent",
    });
    return recommendations;
  }

  // Duplicate handling
  if (duplicates.length > 0) {
    const highSimilarity = duplicates.filter(d => d.similarity > 0.8);
    if (highSimilarity.length > 0) {
      recommendations.push({
        type: "reject",
        action: "Reject as duplicate invoice",
        reasoning: `High similarity (${(highSimilarity[0].similarity * 100).toFixed(1)}%) with existing invoice ${highSimilarity[0].existingInvoice.invoiceNumber}`,
        priority: "high",
      });
    } else {
      recommendations.push({
        type: "escalate",
        action: "Review potential duplicate",
        reasoning: `Possible duplicate with ${duplicates.length} existing invoices`,
        priority: "medium",
      });
    }
  }

  // High-value invoices
  if (data.totalAmount > 10000) {
    recommendations.push({
      type: "escalate",
      action: "Manager approval required for high-value invoice",
      reasoning: `Invoice amount $${data.totalAmount.toFixed(2)} exceeds automatic processing threshold`,
      priority: "high",
    });
  }

  // New vendor
  const vendorValidation = validations.find(v => v.type === "vendor");
  if (vendorValidation && vendorValidation.status === "warning") {
    recommendations.push({
      type: "request_info",
      action: "Verify new vendor information",
      reasoning: "Vendor not found in database - requires verification",
      priority: "medium",
    });
  }

  // Tax discrepancies
  const taxValidation = validations.find(v => v.type === "tax");
  if (taxValidation && taxValidation.status === "warning") {
    recommendations.push({
      type: "request_info",
      action: "Confirm tax calculation",
      reasoning: "Tax amount discrepancy detected",
      priority: "low",
    });
  }

  // If no issues, recommend auto-processing
  if (recommendations.length === 0) {
    recommendations.push({
      type: "auto_process",
      action: "Automatically process invoice",
      reasoning: "All validations passed and no duplicates found",
      priority: "low",
    });
  }

  return recommendations;
}

/**
 * Determine processing status
 */
function determineProcessingStatus(
  validations: ValidationCheck[],
  duplicates: DuplicateMatch[],
  recommendations: ProcessingRecommendation[]
): ProcessingResult["status"] {
  // Check for critical failures
  const criticalFailures = validations.filter(v => v.status === "fail" && v.severity === "critical");
  if (criticalFailures.length > 0) {
    return "rejected";
  }

  // Check for high-similarity duplicates
  const highSimilarityDuplicates = duplicates.filter(d => d.similarity > 0.8);
  if (highSimilarityDuplicates.length > 0) {
    return "duplicate";
  }

  // Check if any recommendations require review
  const reviewRequired = recommendations.some(r => 
    r.type === "escalate" || r.type === "request_info"
  );
  if (reviewRequired) {
    return "pending_review";
  }

  // Check for warnings that might need review
  const warnings = validations.filter(v => v.status === "warning" && v.severity === "high");
  if (warnings.length > 0) {
    return "pending_review";
  }

  return "processed";
}

/**
 * Generate next actions
 */
function generateNextActions(
  status: ProcessingResult["status"],
  validations: ValidationCheck[],
  recommendations: ProcessingRecommendation[]
): string[] {
  const actions: string[] = [];

  switch (status) {
    case "rejected":
      actions.push("Notify submitter of rejection");
      actions.push("Archive invoice document");
      if (validations.some(v => v.type === "vendor" && v.status === "warning")) {
        actions.push("Add vendor to database if valid");
      }
      break;

    case "duplicate":
      actions.push("Mark as duplicate in system");
      actions.push("Link to original invoice");
      actions.push("Notify submitter of duplicate status");
      break;

    case "pending_review":
      actions.push("Assign to finance team for review");
      recommendations.forEach(rec => {
        if (rec.type === "escalate") {
          actions.push("Escalate to manager");
        } else if (rec.type === "request_info") {
          actions.push("Request additional information");
        }
      });
      break;

    case "processed":
      actions.push("Create payment record");
      actions.push("Schedule payment according to terms");
      actions.push("Update vendor ledger");
      actions.push("Send confirmation to submitter");
      break;
  }

  // Add validation-specific actions
  validations.forEach(validation => {
    if (validation.autoFixable && validation.status === "warning") {
      actions.push(`Auto-fix: ${validation.message}`);
    }
  });

  return actions;
}

/**
 * Estimate processing time
 */
function estimateProcessingTime(
  status: ProcessingResult["status"],
  validations: ValidationCheck[]
): number {
  // Base time in minutes
  let time = 5;

  switch (status) {
    case "processed":
      time = 2;
      break;
    case "rejected":
      time = 3;
      break;
    case "duplicate":
      time = 4;
      break;
    case "pending_review":
      time = 30; // 30 minutes for human review
      break;
  }

  // Add time for manual validations
  const manualValidations = validations.filter(v => !v.autoFixable && v.status !== "pass");
  time += manualValidations.length * 5;

  return time;
}

/**
 * Batch process multiple invoices
 */
export async function batchProcessInvoices(
  documents: InvoiceDocument[],
  vendorDatabase?: VendorRecord[],
  existingInvoices?: ExtractedInvoiceData[]
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];

  for (const document of documents) {
    const result = await processInvoice(document, vendorDatabase, existingInvoices);
    results.push(result);
  }

  return results;
}

/**
 * Update vendor database from processed invoices
 */
export async function updateVendorDatabase(
  processedInvoices: ProcessingResult[]
): Promise<{
  newVendors: VendorRecord[];
  updatedVendors: VendorRecord[];
}> {
  const newVendors: VendorRecord[] = [];
  const updatedVendors: VendorRecord[] = [];

  processedInvoices.forEach(invoice => {
    if (invoice.status === "processed") {
      const data = invoice.extractedData;
      
      // Check if vendor exists (would query actual database)
      const existingVendor = false; // Mock check
      
      if (!existingVendor) {
        newVendors.push({
          id: `vendor-${Date.now()}`,
          name: data.vendorName,
          taxId: data.vendorTaxId,
          address: "", // Would be extracted if available
          phone: "",
          email: "",
          paymentTerms: data.paymentTerms,
          bankDetails: data.bankDetails,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  });

  return { newVendors, updatedVendors };
}

interface VendorRecord {
  id: string;
  name: string;
  taxId?: string;
  address: string;
  phone: string;
  email: string;
  paymentTerms: string;
  bankDetails?: BankDetails;
  createdAt: string;
  updatedAt: string;
}
