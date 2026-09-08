import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { medicineService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/ui';
import { fmtDate, fmtMoney } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../utils/errors';

const EMPTY_FORM = {
  name: '',
  genericName: '',
  category: '',
  manufacturer: '',
  price: 0,
  stock: 0,
  minStock: 0,
  batchNumber: '',
  expiryDate: '',
  supplier: '',
};

export default function Medicines() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [stockTarget, setStockTarget] = useState(null);
  const [stockForm, setStockForm] = useState({ quantity: 0, operation: 'IN' });
  const [busy, setBusy] = useState(false);
  const list = useAsync();

  const load = () => list.run(() => medicineService.list({ limit: 100, search: search || undefined }));
  useEffect(load, [search]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const items = list.data?.items || [];

  const createMedicine = async () => {
    setBusy(true);
    try {
      await medicineService.create({ ...form, price: +form.price, stock: +form.stock, minStock: +form.minStock });
      toast.success('Medicine added');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const adjustStock = async () => {
    setBusy(true);
    try {
      await medicineService.stock(stockTarget._id, { quantity: +stockForm.quantity, operation: stockForm.operation });
      toast.success('Stock updated');
      setStockTarget(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Medicine Inventory"
        subtitle="Track stock levels and manage medicines"
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Add medicine
          </button>
        }
      />

      <div className="mb-4">
        <input
          className="input max-w-sm"
          placeholder="Search by name or generic name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {list.loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No medicines found.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Generic</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Price</th>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50">
                    <td className="font-medium text-slate-800">{m.name}</td>
                    <td className="text-slate-500">{m.genericName}</td>
                    <td className="text-slate-500">{m.category}</td>
                    <td>
                      <span className={`badge ${m.stock <= m.minStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {m.stock}
                      </span>
                    </td>
                    <td>{fmtMoney(m.price)}</td>
                    <td className="font-mono text-xs text-slate-500">{m.batchNumber}</td>
                    <td className="text-slate-500">{m.expiryDate ? fmtDate(m.expiryDate) : '—'}</td>
                    <td className="text-right">
                      <button
                        className="text-sm font-medium text-brand-600 hover:underline"
                        onClick={() => {
                          setStockTarget(m);
                          setStockForm({ quantity: 0, operation: 'IN' });
                        }}
                      >
                        Adjust stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add medicine" size="md">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Generic name</label>
            <input className="input" value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div>
            <label className="label">Manufacturer</label>
            <input className="input" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
          </div>
          <div>
            <label className="label">Price (৳)</label>
            <input className="input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className="label">Initial stock</label>
            <input className="input" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <div>
            <label className="label">Min stock</label>
            <input className="input" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
          </div>
          <div>
            <label className="label">Batch number</label>
            <input className="input" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
          </div>
          <div>
            <label className="label">Expiry date</label>
            <input className="input" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </div>
          <div>
            <label className="label">Supplier</label>
            <input className="input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setShowCreate(false)}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy || !form.name} onClick={createMedicine}>
            {busy ? 'Saving…' : 'Add medicine'}
          </button>
        </div>
      </Modal>

      <Modal open={!!stockTarget} onClose={() => setStockTarget(null)} title="Adjust stock">
        {stockTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              <span className="font-medium">{stockTarget.name}</span> — current stock: <span className="font-bold">{stockTarget.stock}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Operation</label>
                <select className="input" value={stockForm.operation} onChange={(e) => setStockForm({ ...stockForm, operation: e.target.value })}>
                  <option value="IN">Stock in (+)</option>
                  <option value="OUT">Stock out (−)</option>
                </select>
              </div>
              <div>
                <label className="label">Quantity</label>
                <input
                  className="input"
                  type="number"
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setStockTarget(null)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={busy || !stockForm.quantity} onClick={adjustStock}>
                {busy ? 'Saving…' : 'Apply'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
