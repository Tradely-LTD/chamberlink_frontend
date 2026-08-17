import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useGenerateExportDocumentMutation,
  useGetExportDocDraftQuery,
} from '@features/export-documents';
import type { LineItem, GenerateExportDocPayload } from '@features/export-documents';
import { Input } from '@shared/ui/Input';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { Select } from '@shared/ui/Select';

// Steps differ by doc type
const INVOICE_STEPS  = ['Document Type', 'Parties', 'Line Items', 'Details', 'Review'];
const PACKING_STEPS  = ['Document Type', 'Transport', 'Parties', 'Line Items', 'Details', 'Review'];

const UNITS     = ['kg', 'MT', 'pcs', 'cartons', 'bags', 'litres', 'sqm', 'pairs', 'sets', 'rolls'];
const PKG_TYPES = ['Carton', 'Bag', 'Drum', 'Pallet', 'Bale', 'Case', 'Crate', 'Roll', 'Bundle', 'Box'];
const DIM_UNITS: ('cm' | 'm' | 'in')[] = ['cm', 'm', 'in'];

const TRANSPORT_LABELS: Record<string, { ref: string; origin: string; dest: string }> = {
  sea:  { ref: 'Vessel / Voyage No.',   origin: 'Port of Loading',       dest: 'Port of Discharge' },
  air:  { ref: 'Flight No. / AWB No.',  origin: 'Airport of Departure',  dest: 'Airport of Destination' },
  road: { ref: 'Truck / Vehicle No.',   origin: 'Point of Origin',       dest: 'Point of Delivery' },
  rail: { ref: 'Train / Wagon No.',     origin: 'Station of Origin',     dest: 'Station of Destination' },
};

const fmtNaira = (n: number) =>
  '₦' + new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmt2 = (n: number) => n.toFixed(2);
const today = () => new Date().toISOString().slice(0, 10);

const emptyLineItem = (): LineItem => ({
  description: '',
  hsCode: '',
  quantity: 1,
  unit: 'kg',
  unitPrice: 0,
  netWeight: undefined,
  grossWeight: undefined,
  marksAndNumbers: '',
  numberOfPackages: undefined,
  packageType: '',
  length: undefined,
  width: undefined,
  height: undefined,
  dimensionUnit: 'cm',
});

interface GeneratorForm {
  type: 'commercial_invoice' | 'packing_list';
  sellerName: string;
  sellerAddress: string;
  buyerName: string;
  buyerAddress: string;
  destinationCountry: string;
  invoiceNumber: string;
  invoiceDate: string;
  notes: string;
  lineItems: LineItem[];
  // Packing list — transport
  shippingMethod: 'sea' | 'air' | 'road' | 'rail' | '';
  hasBooking: boolean;           // checkbox: "I already have a booking confirmation"
  vesselOrFlightNo: string;
  portOfLoading: string;
  portOfDischarge: string;
  chargeableWeight: string;
  containerNo: string;
  countryOfOrigin: string;
  measurementUnit: 'kg' | 'lb';
}

const defaultForm = (): GeneratorForm => ({
  type: 'commercial_invoice',
  sellerName: '',
  sellerAddress: '',
  buyerName: '',
  buyerAddress: '',
  destinationCountry: '',
  invoiceNumber: '',
  invoiceDate: today(),
  notes: '',
  lineItems: [emptyLineItem()],
  shippingMethod: '',
  hasBooking: false,
  vesselOrFlightNo: '',
  portOfLoading: '',
  portOfDischarge: '',
  chargeableWeight: '',
  containerNo: '',
  countryOfOrigin: 'Nigeria',
  measurementUnit: 'kg',
});

function lineTotal(item: LineItem) {
  return Math.round(item.quantity * item.unitPrice * 100) / 100;
}
function grandTotal(items: LineItem[]) {
  return Math.round(items.reduce((s, i) => s + lineTotal(i), 0) * 100) / 100;
}
function totalNetWeight(items: LineItem[])   { return items.reduce((s, i) => s + (i.netWeight ?? 0), 0); }
function totalGrossWeight(items: LineItem[]) { return items.reduce((s, i) => s + (i.grossWeight ?? 0), 0); }
function totalPackages(items: LineItem[])    { return items.reduce((s, i) => s + (i.numberOfPackages ?? i.quantity), 0); }

const inputCls   = 'w-full rounded-lg border border-border/60 px-3 py-2.5 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';
const inputSmCls = 'w-full rounded-lg border border-border/60 px-3 py-2 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

// ── Step 1: Document Type ──────────────────────────────────────────────────

function StepDocType({ form, setForm }: { form: GeneratorForm; setForm: React.Dispatch<React.SetStateAction<GeneratorForm>> }) {
  return (
    <div className="space-y-4">
      <h2 className="font-medium text-ink mb-4">Select Document Type</h2>
      <div className="grid grid-cols-2 gap-4">
        {([
          { value: 'commercial_invoice' as const, label: 'Commercial Invoice', desc: 'Invoice issued to the buyer listing goods, quantities, and agreed prices.', icon: 'receipt_long' },
          { value: 'packing_list' as const,       label: 'Packing List',       desc: 'Shipping manifest — weights, dimensions, marks & numbers. No prices.', icon: 'inventory_2' },
        ]).map((opt) => (
          <label key={opt.value} className={`flex flex-col gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.type === opt.value ? 'border-primary bg-[#f0faf4]' : 'border-border/40 hover:border-primary/40'}`}>
            <input type="radio" name="docType" value={opt.value} checked={form.type === opt.value}
              onChange={() => setForm((f) => ({ ...f, type: opt.value }))} className="sr-only" />
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1` }}>{opt.icon}</span>
              <span className="font-semibold text-sm text-ink">{opt.label}</span>
            </div>
            <p className="text-xs text-ink-subtle">{opt.desc}</p>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Step 2 (packing list only): Transport ─────────────────────────────────

const MODE_META = [
  { value: 'sea'  as const, label: 'Sea',   icon: 'directions_boat', hint: 'Ship / container' },
  { value: 'air'  as const, label: 'Air',   icon: 'flight',          hint: 'Airplane / cargo' },
  { value: 'road' as const, label: 'Road',  icon: 'local_shipping',  hint: 'Truck / vehicle' },
  { value: 'rail' as const, label: 'Rail',  icon: 'train',           hint: 'Train / wagon' },
];

function StepTransport({ form, setForm }: { form: GeneratorForm; setForm: React.Dispatch<React.SetStateAction<GeneratorForm>> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium text-ink mb-1">Mode of Transport</h2>
        <p className="text-xs text-ink-subtle mb-4">Choose first — this shapes which fields appear on your line items.</p>
        <div className="grid grid-cols-4 gap-3">
          {MODE_META.map((m) => (
            <label key={m.value} className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${form.shippingMethod === m.value ? 'border-primary bg-[#f0faf4]' : 'border-border/40 hover:border-primary/40'}`}>
              <input type="radio" name="shippingMethod" value={m.value} checked={form.shippingMethod === m.value}
                onChange={() => setForm((f) => ({ ...f, shippingMethod: m.value }))} className="sr-only" />
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 28, fontVariationSettings: `'FILL' 1` }}>{m.icon}</span>
              <span className="text-sm font-semibold text-ink">{m.label}</span>
              <span className="text-xs text-ink-subtle">{m.hint}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Booking checkbox */}
      <div className="rounded-xl border border-border/40 p-4 bg-surface-alt">
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="mt-0.5">
            <input type="checkbox" checked={form.hasBooking}
              onChange={(e) => setForm((f) => ({ ...f, hasBooking: e.target.checked }))}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">I already have a booking confirmation</p>
            <p className="text-xs text-ink-subtle mt-0.5">
              Check this if you have a {form.shippingMethod === 'air' ? 'flight booking / AWB' : form.shippingMethod === 'sea' ? 'vessel booking / B/L' : form.shippingMethod === 'road' ? 'truck booking' : form.shippingMethod === 'rail' ? 'rail booking' : 'booking confirmation'} and want to fill in those details now.
              If not, leave it unchecked — you can add them later from your document library.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

// ── Step 3: Parties ────────────────────────────────────────────────────────

function StepParties({ form, setForm }: { form: GeneratorForm; setForm: React.Dispatch<React.SetStateAction<GeneratorForm>> }) {
  const isPacking = form.type === 'packing_list';
  const set = (k: keyof GeneratorForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <h2 className="font-medium text-ink mb-4">
        {isPacking ? 'Shipper & Consignee' : 'Seller & Buyer Details'}
      </h2>

      <div className="rounded-lg border border-border/40 p-4 space-y-3">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">
          {isPacking ? 'Shipper / Exporter (Your Company)' : 'Seller (Your Company)'}
        </p>
        <Input label={`${isPacking ? 'Shipper / Exporter' : 'Seller'} Name *`} value={form.sellerName}
          onChange={set('sellerName')} placeholder="e.g. Kano Leather Exports Ltd" />
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            {isPacking ? 'Shipper' : 'Seller'} Address *
          </label>
          <textarea rows={2} className={inputCls} placeholder="Full business address"
            value={form.sellerAddress} onChange={set('sellerAddress')} />
        </div>
      </div>

      <div className="rounded-lg border border-border/40 p-4 space-y-3">
        <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">
          {isPacking ? 'Consignee (Receiver)' : 'Buyer (Importer / Consignee)'}
        </p>
        <Input label={`${isPacking ? 'Consignee' : 'Buyer'} Name *`} value={form.buyerName}
          onChange={set('buyerName')} placeholder="e.g. Guangzhou Import Co. Ltd" />
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            {isPacking ? 'Consignee' : 'Buyer'} Address *
          </label>
          <textarea rows={2} className={inputCls} placeholder="Full address"
            value={form.buyerAddress} onChange={set('buyerAddress')} />
        </div>
        <Input label="Destination Country *" value={form.destinationCountry}
          onChange={set('destinationCountry')} placeholder="e.g. China" />
      </div>
    </div>
  );
}

// ── Step 4: Line Items ─────────────────────────────────────────────────────

function PackingLineItemFields({ item, idx, updateItem, mode }: {
  item: LineItem;
  idx: number;
  updateItem: (idx: number, patch: Partial<LineItem>) => void;
  mode: string;
}) {
  const showDims = mode === 'air' || mode === 'sea';
  const dimsRequired = mode === 'air';

  return (
    <div className="space-y-3">
      {/* Description + HS Code */}
      <div>
        <label className="block text-xs font-semibold text-ink-subtle mb-1">Description *</label>
        <input value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })}
          placeholder="e.g. Wet Blue Hides, Grade A" className={inputSmCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-ink-subtle mb-1">HS Code</label>
          <input value={item.hsCode ?? ''} onChange={(e) => updateItem(idx, { hsCode: e.target.value })}
            placeholder="e.g. 4104.11" className={inputSmCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-subtle mb-1">Marks & Numbers</label>
          <input value={item.marksAndNumbers ?? ''} onChange={(e) => updateItem(idx, { marksAndNumbers: e.target.value })}
            placeholder="e.g. KLE-001" className={inputSmCls} />
        </div>
      </div>

      {/* Packages */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-ink-subtle mb-1">No. of Packages</label>
          <input type="number" min={1} step={1} value={item.numberOfPackages ?? ''}
            onChange={(e) => updateItem(idx, { numberOfPackages: parseInt(e.target.value) || undefined })}
            placeholder="e.g. 20" className={inputSmCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-subtle mb-1">Package Type</label>
          <Select label="Package Type" hideLabel value={item.packageType ?? ''}
            onValueChange={(v) => updateItem(idx, { packageType: v })}
            placeholder="— Select —" className={inputSmCls}
            options={PKG_TYPES.map((t) => ({ value: t, label: t }))} />
        </div>
      </div>

      {/* Weights */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-ink-subtle mb-1">Net Weight (kg)</label>
          <input type="number" min={0} step={0.01} value={item.netWeight ?? ''}
            onChange={(e) => updateItem(idx, { netWeight: parseFloat(e.target.value) || undefined })}
            placeholder="e.g. 450.00" className={inputSmCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-subtle mb-1">Gross Weight (kg)</label>
          <input type="number" min={0} step={0.01} value={item.grossWeight ?? ''}
            onChange={(e) => updateItem(idx, { grossWeight: parseFloat(e.target.value) || undefined })}
            placeholder="e.g. 480.00" className={inputSmCls} />
        </div>
      </div>

      {/* Dimensions — shown for air (required) and sea (optional for CBM); hidden for road/rail */}
      {showDims && (
        <div className={`rounded-lg p-3 border ${dimsRequired ? 'border-primary/30 bg-[#f0faf4]' : 'border-border/30 bg-surface-alt'}`}>
          <label className="block text-xs font-semibold text-ink-subtle mb-1">
            Dimensions (L × W × H)
            {dimsRequired
              ? <span className="ml-1 text-primary">— needed for volumetric weight calculation</span>
              : <span className="ml-1 font-normal text-ink-subtle">— optional, for CBM calculation</span>
            }
          </label>
          <div className="grid grid-cols-4 gap-2">
            <input type="number" min={0} step={0.1} value={item.length ?? ''}
              onChange={(e) => updateItem(idx, { length: parseFloat(e.target.value) || undefined })}
              placeholder="L" className={inputSmCls} />
            <input type="number" min={0} step={0.1} value={item.width ?? ''}
              onChange={(e) => updateItem(idx, { width: parseFloat(e.target.value) || undefined })}
              placeholder="W" className={inputSmCls} />
            <input type="number" min={0} step={0.1} value={item.height ?? ''}
              onChange={(e) => updateItem(idx, { height: parseFloat(e.target.value) || undefined })}
              placeholder="H" className={inputSmCls} />
            <Select label="Dimension Unit" hideLabel value={item.dimensionUnit ?? 'cm'}
              onValueChange={(v) => updateItem(idx, { dimensionUnit: v as 'cm' | 'm' | 'in' })}
              className={inputSmCls}
              options={DIM_UNITS.map((u) => ({ value: u, label: u }))} />
          </div>
        </div>
      )}

      {/* Unit + optional unit price */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-ink-subtle mb-1">Unit *</label>
          <Select label="Unit" hideLabel value={item.unit} onValueChange={(v) => updateItem(idx, { unit: v })}
            className={inputSmCls} options={UNITS.map((u) => ({ value: u, label: u }))} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-subtle mb-1">
            Unit Price (₦) <span className="font-normal text-ink-subtle">optional</span>
          </label>
          <input type="number" min={0} step={0.01} value={item.unitPrice || ''}
            onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
            placeholder="0.00" className={inputSmCls} />
        </div>
      </div>
    </div>
  );
}

function StepLineItems({ form, setForm }: { form: GeneratorForm; setForm: React.Dispatch<React.SetStateAction<GeneratorForm>> }) {
  const isPacking = form.type === 'packing_list';
  const items = form.lineItems;

  const updateItem = (idx: number, patch: Partial<LineItem>) =>
    setForm((f) => ({ ...f, lineItems: f.lineItems.map((item, i) => i === idx ? { ...item, ...patch } : item) }));
  const addItem    = () => setForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLineItem()] }));
  const removeItem = (idx: number) => setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== idx) }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-medium text-ink">{isPacking ? 'Package Line Items' : 'Line Items'}</h2>
          {isPacking && form.shippingMethod && (
            <p className="text-xs text-ink-subtle mt-0.5">
              Mode: <span className="font-semibold capitalize text-ink">{form.shippingMethod}</span>
              {form.shippingMethod === 'air' && ' — dimensions required for vol. weight'}
              {form.shippingMethod === 'sea' && ' — dimensions optional for CBM'}
            </p>
          )}
        </div>
        <span className="text-xs text-ink-subtle">{items.length} / 50</span>
      </div>

      <div className="space-y-4 mb-4">
        {items.map((item, idx) => (
          <div key={idx} className="rounded-xl border border-border/40 p-4 bg-surface-alt/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-ink-subtle uppercase">Item {idx + 1}</span>
              {items.length > 1 && (
                <button onClick={() => removeItem(idx)} className="p-1 rounded-md text-ink-subtle hover:text-red-500 hover:bg-red-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {isPacking ? (
              <PackingLineItemFields item={item} idx={idx} updateItem={updateItem} mode={form.shippingMethod} />
            ) : (
              /* Invoice line item */
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-subtle mb-1">Description *</label>
                  <input value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })}
                    placeholder="e.g. Wet Blue Hides, Grade A" className={inputSmCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-subtle mb-1">HS Code</label>
                    <input value={item.hsCode ?? ''} onChange={(e) => updateItem(idx, { hsCode: e.target.value })}
                      placeholder="e.g. 4104.11" className={inputSmCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-subtle mb-1">Qty *</label>
                    <input type="number" min={1} step={1} value={item.quantity}
                      onChange={(e) => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                      className={inputSmCls} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-subtle mb-1">Unit *</label>
                    <Select label="Unit" hideLabel value={item.unit} onValueChange={(v) => updateItem(idx, { unit: v })}
                      className={inputSmCls} options={UNITS.map((u) => ({ value: u, label: u }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-subtle mb-1">Unit Price (₦) *</label>
                    <input type="number" min={0} step={0.01} value={item.unitPrice || ''}
                      onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00" className={inputSmCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-subtle mb-1">Net Wt (kg)</label>
                    <input type="number" min={0} step={0.01} value={item.netWeight ?? ''}
                      onChange={(e) => updateItem(idx, { netWeight: parseFloat(e.target.value) || undefined })}
                      placeholder="optional" className={inputSmCls} />
                  </div>
                </div>
                {item.quantity > 0 && item.unitPrice > 0 && (
                  <p className="text-xs text-ink-subtle text-right">
                    Line total: <span className="font-semibold text-ink">{fmtNaira(lineTotal(item))}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {items.length < 50 && (
        <button onClick={addItem}
          className="w-full rounded-xl border-2 border-dashed border-border/60 py-3 text-sm text-ink-subtle hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Line Item
        </button>
      )}

      {/* Summary footer */}
      <div className="mt-4 p-3 rounded-lg bg-[#f0faf4] border border-primary/20">
        {isPacking ? (
          <div className="flex flex-wrap gap-4 text-xs text-ink-subtle">
            <span>Packages: <span className="font-bold text-ink">{totalPackages(items)}</span></span>
            <span>Net Wt: <span className="font-bold text-ink">{fmt2(totalNetWeight(items))} kg</span></span>
            <span>Gross Wt: <span className="font-bold text-ink">{fmt2(totalGrossWeight(items))} kg</span></span>
          </div>
        ) : (
          <div className="text-right">
            <span className="text-xs text-ink-subtle">Grand Total: </span>
            <span className="text-base font-bold text-primary">{fmtNaira(grandTotal(items))}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 5: Details ────────────────────────────────────────────────────────

function StepDetails({ form, setForm }: { form: GeneratorForm; setForm: React.Dispatch<React.SetStateAction<GeneratorForm>> }) {
  const set = (k: keyof GeneratorForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const isPacking  = form.type === 'packing_list';
  const tLabels    = TRANSPORT_LABELS[form.shippingMethod] ?? TRANSPORT_LABELS.sea;
  const docNoLabel = isPacking ? 'Packing List Number' : 'Invoice Number';

  return (
    <div className="space-y-4">
      <h2 className="font-medium text-ink mb-4">
        {isPacking ? 'Final Details' : 'Document Details'}
      </h2>

      <Input label={`${docNoLabel} (optional)`} placeholder="Leave blank to auto-generate"
        value={form.invoiceNumber} onChange={set('invoiceNumber')} />

      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          {isPacking ? 'Shipment Date *' : 'Invoice Date *'}
        </label>
        <input type="date" value={form.invoiceDate} onChange={set('invoiceDate')} className={inputCls} />
      </div>

      {isPacking && (
        <>
          {/* Country of Origin — always shown */}
          <Input label="Country of Origin" value={form.countryOfOrigin} onChange={set('countryOfOrigin')} placeholder="Nigeria" />

          {/* Booking details — gated by checkbox from StepTransport */}
          {form.hasBooking ? (
            <div className="rounded-xl border border-primary/30 bg-[#f0faf4] p-4 space-y-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Booking Details</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-subtle mb-1">{tLabels.ref}</label>
                  <input value={form.vesselOrFlightNo} onChange={set('vesselOrFlightNo')}
                    placeholder={
                      form.shippingMethod === 'air'  ? 'e.g. QR702 / AWB 157-1234 5678' :
                      form.shippingMethod === 'road' ? 'e.g. KNA-234-AG' :
                      form.shippingMethod === 'rail' ? 'e.g. Train 14 / Wagon W-0023' :
                                                       'e.g. MV Aisha / Voyage V.024'
                    }
                    className={inputCls} />
                </div>
                {form.shippingMethod === 'sea' && (
                  <div>
                    <label className="block text-xs font-semibold text-ink-subtle mb-1">Container No. / Seal No.</label>
                    <input value={form.containerNo} onChange={set('containerNo')}
                      placeholder="e.g. MSCU1234567 / Seal 789012" className={inputCls} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-subtle mb-1">{tLabels.origin}</label>
                  <input value={form.portOfLoading} onChange={set('portOfLoading')}
                    placeholder={
                      form.shippingMethod === 'air'  ? 'e.g. Murtala Muhammed Intl., Lagos' :
                      form.shippingMethod === 'road' ? 'e.g. Kano, Nigeria' :
                      form.shippingMethod === 'rail' ? 'e.g. Kano Rail Terminal' :
                                                       'e.g. Apapa Port, Lagos'
                    }
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-subtle mb-1">{tLabels.dest}</label>
                  <input value={form.portOfDischarge} onChange={set('portOfDischarge')}
                    placeholder={
                      form.shippingMethod === 'air'  ? 'e.g. Guangzhou Baiyun Intl.' :
                      form.shippingMethod === 'road' ? 'e.g. Niamey, Niger' :
                      form.shippingMethod === 'rail' ? 'e.g. Cotonou Station' :
                                                       'e.g. Tema Port, Ghana'
                    }
                    className={inputCls} />
                </div>
              </div>

              {form.shippingMethod === 'air' && (
                <div>
                  <label className="block text-xs font-semibold text-ink-subtle mb-1">
                    Chargeable Weight (kg)
                    <span className="ml-1 font-normal text-ink-subtle">max(actual, vol. wt) — optional</span>
                  </label>
                  <input type="number" min={0} step={0.01} value={form.chargeableWeight}
                    onChange={set('chargeableWeight')} placeholder="e.g. 125.50" className={inputCls} />
                </div>
              )}
            </div>
          ) : (
            /* No booking yet — friendly nudge */
            <div className="rounded-xl border border-border/40 bg-surface-alt p-4 flex gap-3">
              <span className="material-symbols-outlined text-ink-subtle flex-shrink-0" style={{ fontSize: 20 }}>info</span>
              <div>
                <p className="text-sm font-medium text-ink">No booking yet? No problem.</p>
                <p className="text-xs text-ink-subtle mt-0.5">
                  Generate your packing list now. Once you have a {
                    form.shippingMethod === 'air'  ? 'flight booking / AWB' :
                    form.shippingMethod === 'sea'  ? 'vessel booking / Bill of Lading' :
                    form.shippingMethod === 'road' ? 'truck booking' :
                    form.shippingMethod === 'rail' ? 'rail booking' : 'booking confirmation'
                  }, open this document from your library and regenerate with the full details.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">Notes (optional)</label>
        <textarea rows={3} value={form.notes} onChange={set('notes')}
          placeholder="Any additional notes to appear on the document"
          className="w-full rounded-lg border border-border/60 px-3 py-2.5 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
      </div>
    </div>
  );
}

// ── Step 6: Review ─────────────────────────────────────────────────────────

function StepReview({ form }: { form: GeneratorForm }) {
  const isPacking = form.type === 'packing_list';
  const tLabels   = TRANSPORT_LABELS[form.shippingMethod] ?? TRANSPORT_LABELS.sea;

  const summaryRows = [
    { label: 'Document Type',  value: isPacking ? 'Packing List' : 'Commercial Invoice' },
    { label: isPacking ? 'Shipper' : 'Seller', value: form.sellerName },
    { label: isPacking ? 'Consignee' : 'Buyer', value: form.buyerName },
    { label: 'Destination',    value: form.destinationCountry },
    { label: 'Date',           value: form.invoiceDate },
    { label: 'Line Items',     value: `${form.lineItems.length} item(s)` },
    ...(isPacking ? [
      { label: 'Mode',              value: form.shippingMethod || '—' },
      { label: 'Country of Origin', value: form.countryOfOrigin || 'Nigeria' },
      { label: 'Booking Details',   value: form.hasBooking ? 'Included' : 'To be added later' },
      ...(form.hasBooking && form.vesselOrFlightNo  ? [{ label: tLabels.ref,    value: form.vesselOrFlightNo }]  : []),
      ...(form.hasBooking && form.portOfLoading     ? [{ label: tLabels.origin, value: form.portOfLoading }]     : []),
      ...(form.hasBooking && form.portOfDischarge   ? [{ label: tLabels.dest,   value: form.portOfDischarge }]   : []),
      ...(form.hasBooking && form.shippingMethod === 'sea' && form.containerNo ? [{ label: 'Container / Seal', value: form.containerNo }] : []),
      { label: 'Total Packages',    value: String(totalPackages(form.lineItems)) },
      { label: 'Total Net Weight',  value: `${fmt2(totalNetWeight(form.lineItems))} kg` },
      { label: 'Total Gross Weight',value: `${fmt2(totalGrossWeight(form.lineItems))} kg` },
    ] : [
      { label: 'Grand Total', value: fmtNaira(grandTotal(form.lineItems)) },
    ]),
    ...(form.notes ? [{ label: 'Notes', value: form.notes }] : []),
  ];

  return (
    <div className="space-y-4">
      <h2 className="font-medium text-ink mb-4">Review Before Generating</h2>

      <dl className="divide-y divide-border/30 rounded-xl border border-border/40 overflow-hidden">
        {summaryRows.map((row) => (
          <div key={row.label} className="grid grid-cols-3 gap-4 px-4 py-3">
            <dt className="text-sm text-ink-subtle">{row.label}</dt>
            <dd className="col-span-2 text-sm text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-xl border border-border/40 overflow-hidden">
        <div className="px-4 py-2 bg-surface-alt border-b border-border/30">
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Line Items</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-alt border-b border-border/20">
                {isPacking
                  ? ['Marks & No.', 'Description', 'HS Code', 'Pkgs / Type', 'Net Wt (kg)', 'Gross Wt (kg)', 'Dimensions'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-ink-subtle whitespace-nowrap">{h}</th>
                    ))
                  : ['Description', 'HS Code', 'Qty', 'Unit', 'Unit Price (₦)', 'Total (₦)'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-ink-subtle">{h}</th>
                    ))
                }
              </tr>
            </thead>
            <tbody className="divide-y divide-border/15">
              {form.lineItems.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-surface-alt/50'}>
                  {isPacking ? (
                    <>
                      <td className="px-3 py-2 text-ink-subtle">{item.marksAndNumbers || '—'}</td>
                      <td className="px-3 py-2 text-ink">{item.description}</td>
                      <td className="px-3 py-2 text-ink-subtle">{item.hsCode || '—'}</td>
                      <td className="px-3 py-2 text-ink whitespace-nowrap">
                        {item.numberOfPackages ?? item.quantity}{item.packageType ? ` × ${item.packageType}` : ''}
                      </td>
                      <td className="px-3 py-2 text-ink">{item.netWeight != null ? fmt2(item.netWeight) : '—'}</td>
                      <td className="px-3 py-2 text-ink">{item.grossWeight != null ? fmt2(item.grossWeight) : '—'}</td>
                      <td className="px-3 py-2 text-ink-subtle whitespace-nowrap">
                        {item.length && item.width && item.height
                          ? `${item.length}×${item.width}×${item.height} ${item.dimensionUnit ?? 'cm'}`
                          : '—'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-ink">{item.description}</td>
                      <td className="px-3 py-2 text-ink-subtle">{item.hsCode || '—'}</td>
                      <td className="px-3 py-2 text-ink">{item.quantity}</td>
                      <td className="px-3 py-2 text-ink">{item.unit}</td>
                      <td className="px-3 py-2 text-ink">{fmtNaira(item.unitPrice)}</td>
                      <td className="px-3 py-2 font-semibold text-ink">{fmtNaira(lineTotal(item))}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Success Banner ─────────────────────────────────────────────────────────

function SuccessBanner({ referenceNo, downloadUrl, onEcoAttach }: { referenceNo: string; downloadUrl: string; onEcoAttach: () => void }) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-5">
      <div className="flex items-start gap-3">
        <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-800 mb-1">Document Generated — {referenceNo}</p>
          <p className="text-xs text-green-700 mb-3">Saved to your Document Library and ready to download.</p>
          <div className="flex flex-wrap gap-3">
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-hover transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </a>
            <button onClick={onEcoAttach}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary text-primary px-4 py-2 text-sm font-medium hover:bg-[#f0faf4] transition-colors">
              Attach to new eCO application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function ExportDocGeneratorPage() {
  const navigate = useNavigate();
  const { draftId } = useParams<{ draftId?: string }>();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<GeneratorForm>(defaultForm());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ referenceNo: string; downloadUrl: string } | null>(null);

  const [generateDoc, { isLoading }] = useGenerateExportDocumentMutation();
  const { data: draft, isLoading: isLoadingDraft } = useGetExportDocDraftQuery(draftId ?? '', { skip: !draftId });

  // When type changes reset to step 0 so step indices stay valid
  useEffect(() => {
    setStep(0);
  }, [form.type]);

  useEffect(() => {
    if (!draft) return;
    const hasAnyBooking = !!(draft.vesselOrFlightNo || draft.portOfLoading || draft.portOfDischarge || draft.containerNo);
    setForm({
      ...defaultForm(),
      type: draft.type,
      sellerName: draft.sellerName,
      sellerAddress: draft.sellerAddress,
      buyerName: draft.buyerName,
      buyerAddress: draft.buyerAddress,
      destinationCountry: draft.destinationCountry,
      invoiceNumber: draft.invoiceNumber ?? '',
      invoiceDate: draft.invoiceDate,
      notes: draft.notes ?? '',
      lineItems: draft.lineItems.length > 0 ? draft.lineItems : [emptyLineItem()],
      shippingMethod: (draft.shippingMethod as GeneratorForm['shippingMethod']) ?? '',
      hasBooking: hasAnyBooking,
      vesselOrFlightNo: draft.vesselOrFlightNo ?? '',
      portOfLoading: draft.portOfLoading ?? '',
      portOfDischarge: draft.portOfDischarge ?? '',
      chargeableWeight: draft.chargeableWeight ?? '',
      containerNo: draft.containerNo ?? '',
      countryOfOrigin: draft.countryOfOrigin ?? 'Nigeria',
    });
  }, [draft]);

  const isPacking = form.type === 'packing_list';
  const steps = isPacking ? PACKING_STEPS : INVOICE_STEPS;
  const lastStep = steps.length - 1;

  // canContinue per step (indices differ by type)
  const canContinue = (() => {
    const partiesOk = !!(form.sellerName && form.sellerAddress && form.buyerName && form.buyerAddress && form.destinationCountry);
    const itemsOk   = form.lineItems.length > 0 && form.lineItems.every((i) => i.description && i.quantity > 0);

    if (isPacking) {
      return {
        0: true,                              // doc type
        1: !!form.shippingMethod,             // transport mode required
        2: partiesOk,                         // parties
        3: itemsOk,                           // line items
        4: !!form.invoiceDate,                // details
        5: true,                              // review
      } as Record<number, boolean>;
    }
    return {
      0: true,
      1: partiesOk,
      2: itemsOk,
      3: !!form.invoiceDate,
      4: true,
    } as Record<number, boolean>;
  })();

  const handleGenerate = async () => {
    setError(null);
    const payload: GenerateExportDocPayload = {
      type: form.type,
      sellerName: form.sellerName,
      sellerAddress: form.sellerAddress,
      buyerName: form.buyerName,
      buyerAddress: form.buyerAddress,
      destinationCountry: form.destinationCountry,
      invoiceDate: form.invoiceDate,
      lineItems: form.lineItems.map((i) => ({
        description: i.description,
        hsCode: i.hsCode || undefined,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
        netWeight: i.netWeight,
        grossWeight: i.grossWeight,
        marksAndNumbers: i.marksAndNumbers || undefined,
        numberOfPackages: i.numberOfPackages,
        packageType: i.packageType || undefined,
        length: i.length,
        width: i.width,
        height: i.height,
        dimensionUnit: i.dimensionUnit,
      })),
      ...(form.invoiceNumber.trim()   ? { invoiceNumber: form.invoiceNumber.trim() } : {}),
      ...(form.notes.trim()           ? { notes: form.notes.trim() } : {}),
      ...(draftId                     ? { draftId } : {}),
      ...(isPacking && form.shippingMethod    ? { shippingMethod: form.shippingMethod }              : {}),
      ...(isPacking && form.countryOfOrigin   ? { countryOfOrigin: form.countryOfOrigin }            : {}),
      // Booking fields only if checkbox was checked
      ...(isPacking && form.hasBooking && form.vesselOrFlightNo  ? { vesselOrFlightNo: form.vesselOrFlightNo }  : {}),
      ...(isPacking && form.hasBooking && form.portOfLoading     ? { portOfLoading: form.portOfLoading }        : {}),
      ...(isPacking && form.hasBooking && form.portOfDischarge   ? { portOfDischarge: form.portOfDischarge }    : {}),
      ...(isPacking && form.hasBooking && form.containerNo       ? { containerNo: form.containerNo }            : {}),
      ...(isPacking && form.hasBooking && form.chargeableWeight  ? { chargeableWeight: parseFloat(form.chargeableWeight), measurementUnit: form.measurementUnit } : {}),
    };

    try {
      const res = await generateDoc(payload).unwrap();
      setResult({ referenceNo: res.referenceNo, downloadUrl: res.downloadUrl });
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message;
      setError(
        message === 'MEMBERSHIP_NOT_ACTIVE'
          ? 'Generating export documents requires an active, paid membership — complete your dues payment first.'
          : message ?? 'Failed to generate document. Please try again.'
      );
    }
  };

  if (isLoadingDraft) return <div className="p-6"><SkeletonCard /></div>;

  const typeLabel = isPacking ? 'Packing List' : 'Commercial Invoice';

  // Render the right component for the current step
  const renderStep = () => {
    if (isPacking) {
      switch (step) {
        case 0: return <StepDocType form={form} setForm={(updater) => {
          setForm((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            if (next.type !== prev.type) { setTimeout(() => setStep(0), 0); }
            return next;
          });
        }} />;
        case 1: return <StepTransport form={form} setForm={setForm} />;
        case 2: return <StepParties form={form} setForm={setForm} />;
        case 3: return <StepLineItems form={form} setForm={setForm} />;
        case 4: return <StepDetails form={form} setForm={setForm} />;
        case 5: return <StepReview form={form} />;
      }
    } else {
      switch (step) {
        case 0: return <StepDocType form={form} setForm={(updater) => {
          setForm((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            if (next.type !== prev.type) { setTimeout(() => setStep(0), 0); }
            return next;
          });
        }} />;
        case 1: return <StepParties form={form} setForm={setForm} />;
        case 2: return <StepLineItems form={form} setForm={setForm} />;
        case 3: return <StepDetails form={form} setForm={setForm} />;
        case 4: return <StepReview form={form} />;
      }
    }
    return null;
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/dashboard/export-documents" className="text-sm text-ink-subtle hover:text-ink">Export Documents</Link>
        <span className="text-ink-subtle">/</span>
        <span className="text-sm text-ink">{draftId ? 'Edit & Regenerate' : 'Generate Document'}</span>
      </div>

      <h1 className="text-2xl font-semibold text-ink mb-1">
        {draftId ? `Edit ${typeLabel}` : 'Generate Export Document'}
      </h1>
      <p className="text-sm text-ink-subtle mb-6">
        Your company logo and details from your profile will appear automatically.
      </p>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                ${i < step ? 'bg-primary text-white' : i === step ? 'bg-primary text-white ring-2 ring-primary/30 ring-offset-2' : 'bg-border/30 text-ink-subtle'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap hidden sm:block ${i === step ? 'text-primary font-medium' : 'text-ink-subtle'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-px mx-2 mb-5 ${i < step ? 'bg-primary' : 'bg-border/40'}`} />}
          </div>
        ))}
      </div>

      {result && (
        <div className="mb-6">
          <SuccessBanner referenceNo={result.referenceNo} downloadUrl={result.downloadUrl}
            onEcoAttach={() => navigate('/dashboard/eco/apply')} />
          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={() => { setResult(null); setStep(0); setForm(defaultForm()); }}>
              Generate Another
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard/documents')}>
              View Document Library
            </Button>
          </div>
        </div>
      )}

      {!result && (
        <>
          {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

          <div className="bg-white rounded-xl border border-border/40 p-6 mb-6">
            {renderStep()}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => step === 0 ? navigate('/dashboard/export-documents') : setStep((s) => s - 1)}>
              {step === 0 ? 'Cancel' : 'Back'}
            </Button>
            {step < lastStep ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue[step]}>
                Continue
              </Button>
            ) : (
              <Button loading={isLoading} onClick={handleGenerate}>
                Generate PDF
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
