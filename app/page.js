'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ProductsPage() {
  // รายการสินค้าทั้งหมด
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // ฟอร์มเพิ่มสินค้าใหม่
  const [form, setForm] = useState({
    sku: '',
    name: '',
    price: '',
    stock: '',
    unit: '',
  });

  // สถานะสำหรับแก้ไขแบบ inline (เก็บ id ของแถวที่กำลังแก้ไข + ข้อมูลชั่วคราว)
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // โหลดข้อมูลสินค้าทั้งหมดจาก Supabase
  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg('โหลดข้อมูลไม่สำเร็จ: ' + error.message);
    } else {
      setProducts(data);
      setErrorMsg('');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // จัดการ input ของฟอร์มเพิ่มสินค้า
  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // เพิ่มสินค้าใหม่ลงตาราง products
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!form.sku || !form.name || !form.price) {
      setErrorMsg('กรุณากรอก SKU, ชื่อสินค้า และราคาให้ครบ');
      return;
    }

    const { error } = await supabase.from('products').insert([
      {
        sku: form.sku,
        name: form.name,
        price: parseFloat(form.price),
        stock: form.stock ? parseInt(form.stock, 10) : 0,
        unit: form.unit,
      },
    ]);

    if (error) {
      setErrorMsg('เพิ่มสินค้าไม่สำเร็จ: ' + error.message);
      return;
    }

    // เคลียร์ฟอร์มและโหลดข้อมูลใหม่
    setForm({ sku: '', name: '', price: '', stock: '', unit: '' });
    setErrorMsg('');
    fetchProducts();
  };

  // ลบสินค้า
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('ยืนยันการลบสินค้านี้หรือไม่?');
    if (!confirmDelete) return;

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      setErrorMsg('ลบสินค้าไม่สำเร็จ: ' + error.message);
      return;
    }
    fetchProducts();
  };

  // เริ่มแก้ไขแถว (inline edit) - เก็บค่าปัจจุบันไว้ในฟอร์มแก้ไข
  const startEdit = (product) => {
    setEditingId(product.id);
    setEditForm({
      sku: product.sku,
      name: product.name,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditFormChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // บันทึกการแก้ไขสินค้ากลับไปที่ Supabase
  const handleSaveEdit = async (id) => {
    const { error } = await supabase
      .from('products')
      .update({
        sku: editForm.sku,
        name: editForm.name,
        price: parseFloat(editForm.price),
        stock: parseInt(editForm.stock, 10),
        unit: editForm.unit,
      })
      .eq('id', id);

    if (error) {
      setErrorMsg('แก้ไขสินค้าไม่สำเร็จ: ' + error.message);
      return;
    }

    setEditingId(null);
    setEditForm({});
    fetchProducts();
  };

  return (
    <div>
      <h1>รายการสินค้า</h1>

      {errorMsg && (
        <p style={{ color: '#dc2626', fontWeight: 500 }}>{errorMsg}</p>
      )}

      {/* ฟอร์มเพิ่มสินค้าใหม่ */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>เพิ่มสินค้าใหม่</h2>
        <form
          onSubmit={handleAddProduct}
          style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}
        >
          <input
            type="text"
            name="sku"
            placeholder="SKU"
            value={form.sku}
            onChange={handleFormChange}
            style={{ width: '120px' }}
          />
          <input
            type="text"
            name="name"
            placeholder="ชื่อสินค้า"
            value={form.name}
            onChange={handleFormChange}
            style={{ width: '180px' }}
          />
          <input
            type="number"
            name="price"
            placeholder="ราคา"
            value={form.price}
            onChange={handleFormChange}
            step="0.01"
            style={{ width: '100px' }}
          />
          <input
            type="number"
            name="stock"
            placeholder="คงเหลือ"
            value={form.stock}
            onChange={handleFormChange}
            style={{ width: '100px' }}
          />
          <input
            type="text"
            name="unit"
            placeholder="หน่วย"
            value={form.unit}
            onChange={handleFormChange}
            style={{ width: '100px' }}
          />
          <button type="submit">เพิ่มสินค้า</button>
        </form>
      </div>

      {/* ตารางแสดงรายการสินค้า */}
      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>ชื่อสินค้า</th>
              <th>ราคา</th>
              <th>คงเหลือ</th>
              <th>หน่วย</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                {editingId === product.id ? (
                  // โหมดแก้ไข inline
                  <>
                    <td>
                      <input
                        type="text"
                        name="sku"
                        value={editForm.sku}
                        onChange={handleEditFormChange}
                        style={{ width: '90px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditFormChange}
                        style={{ width: '140px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        name="price"
                        value={editForm.price}
                        onChange={handleEditFormChange}
                        step="0.01"
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        name="stock"
                        value={editForm.stock}
                        onChange={handleEditFormChange}
                        style={{ width: '70px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        name="unit"
                        value={editForm.unit}
                        onChange={handleEditFormChange}
                        style={{ width: '70px' }}
                      />
                    </td>
                    <td style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleSaveEdit(product.id)}>บันทึก</button>
                      <button
                        onClick={cancelEdit}
                        style={{ backgroundColor: '#9ca3af' }}
                      >
                        ยกเลิก
                      </button>
                    </td>
                  </>
                ) : (
                  // โหมดแสดงผลปกติ
                  <>
                    <td>{product.sku}</td>
                    <td>{product.name}</td>
                    <td>{Number(product.price).toFixed(2)}</td>
                    <td>{product.stock}</td>
                    <td>{product.unit}</td>
                    <td style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => startEdit(product)}>แก้ไข</button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        style={{ backgroundColor: '#dc2626' }}
                      >
                        ลบ
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>
                  ยังไม่มีสินค้าในระบบ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
