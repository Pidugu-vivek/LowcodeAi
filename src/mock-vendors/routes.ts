import { Router } from 'express';

export const mockVendorRouter = Router();

/** Vendor A: PAN verification. Any PAN matching the standard format is "valid". */
mockVendorRouter.post('/vendor-a/verify-pan', (req, res) => {
  const { pan } = req.body || {};
  const isValid = typeof pan === 'string' && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
  res.status(200).json({
    status: isValid ? 'VALID' : 'INVALID',
    pan,
    name: isValid ? 'SAMPLE NAME' : undefined,
  });
});

/** Vendor B: GST lookup, keyed by PAN (4th-7th chars of a real GSTIN encode the PAN). */
mockVendorRouter.post('/vendor-b/gst', (req, res) => {
  const { pan } = req.body || {};
  res.status(200).json({
    gstin: `29${pan}1Z5`,
    legalName: 'SAMPLE BUSINESS PVT LTD',
    filingStatus: 'ACTIVE',
  });
});

/** Vendor A: Aadhaar validation. */
mockVendorRouter.post('/vendor-a/validate-aadhaar', (req, res) => {
  const { aadhaar } = req.body || {};
  const isValid = typeof aadhaar === 'string' && /^\d{12}$/.test(aadhaar);
  res.status(200).json({ status: isValid ? 'VALID' : 'INVALID', aadhaar });
});

/** Vendor B: fetches profile details once Aadhaar is validated. */
mockVendorRouter.post('/vendor-b/profile', (req, res) => {
  const { aadhaar } = req.body || {};
  res.status(200).json({ aadhaar, name: 'SAMPLE PERSON', dob: '1990-01-01', address: 'Sample Address, IN' });
});

/** OCR extraction from an uploaded document reference. */
mockVendorRouter.post('/ocr/extract', (req, res) => {
  const { documentId } = req.body || {};
  res.status(200).json({ documentId, extractedName: 'SAMPLE PERSON', documentType: 'PASSPORT', confidence: 0.97 });
});

/** Fraud detection scoring based on extracted document data. */
mockVendorRouter.post('/fraud/check', (req, res) => {
  const { documentId } = req.body || {};
  res.status(200).json({ documentId, fraudScore: 0.02, riskLevel: 'LOW' });
});

/** Face match between a selfie and the document photo. */
mockVendorRouter.post('/face/match', (req, res) => {
  const { documentId } = req.body || {};
  res.status(200).json({ documentId, matchScore: 0.94, isMatch: true });
});
