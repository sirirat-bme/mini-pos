'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SellPage() {
  // รายการสินค้าทั้งหมด (ใช้เติม dropdown)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // สินค้าที่เลือกขาย + จำนวน
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // โหลดรายการสินค้าจาก Supabase
  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      setErrorMsg('โหลดรายการสินค้าไม่สำเร็จ: ' + error.message);
    } else {
      setProducts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // หาข้อมูลสินค้าที่เลือกอยู่ตอนนี้ (ใช้คำนวณยอดรวมและเช็ค stock)
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // คำนวณยอดรวม = ราคา x จำนวน
  const totalPrice =
    selectedProduct && quantity
      ? Number(selectedProduct.price) * Number(quantity)
      : 0;

  const handleSell = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!selectedProductId) {
      setErrorMsg('กรุณาเลือกสินค้า');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setErrorMsg('กรุณากรอกจำนวนให้ถูกต้อง');
      return;
    }

    setSubmitting(true);

    // ดึงข้อมูลสินค้าล่าสุดจาก DB อีกครั้ง กันกรณี stock เปลี่ยนไปแล้วระหว่างที่หน้าเปิดค้างไว้
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', selectedProductId)
      .single();

    if (fetchError || !currentProduct) {
      setErrorMsg('ไม่พบข้อมูลสินค้า กรุณาลองใหม่');
      setSubmitting(false);
      return;
    }

    // ตรวจสอบว่า stock พอหรือไม่
    if (currentProduct.stock < qty) {
      setErrorMsg(
        `สินค้าคงเหลือไม่พอ (คงเหลือ ${currentProduct.stock} ${currentProduct.unit})`
      );
      setSubmitting(false);
      return;
    }

    const total = Number(currentProduct.price) * qty;

    // บันทึกรายการขายลงตาราง sales
    const { error: insertError } = await supabase.from('sales').insert([
      {
        product_id: currentProduct.id,
        product_name: currentProduct.name,
        quantity: qty,
        total_price: total,
        sold_at: new Date().toISOString(),
      },
    ]);

    if (insertError) {
      setErrorMsg('บันทึกการขายไม่สำเร็จ: ' + insertError.message);
      setSubmitting(false);
      return;
    }

    // อัปเดต stock ในตาราง products ให้ลดลงตามจำนวนที่ขาย
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: currentProduct.stock - qty })
      .eq('id', currentProduct.id);

    if (updateError) {
      setErrorMsg('ขายสำเร็จ แต่ปรับปรุงสต็อกไม่สำเร็จ: ' + updateError.message);
      setSubmitting(false);
      return;
    }

    // สำเร็จ: แสดงข้อความและรีเซ็ตฟอร์ม
    setSuccessMsg(
      `ขาย "${currentProduct.name}" จำนวน ${qty} ${currentProduct.unit} สำเร็จ (รวม ${total.toFixed(
        2
      )} บาท)`
    );
    setSelectedProductId('');
    setQuantity('');
    setSubmitting(false);

    // โหลดรายการสินค้าใหม่ให้ stock อัปเดตบนหน้าจอ
    fetchProducts();
  };

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {errorMsg && (
        <p style={{ color: '#dc2626', fontWeight: 500 }}>{errorMsg}</p>
      )}
      {successMsg && (
        <p style={{ color: '#16a34a', fontWeight: 500 }}>{successMsg}</p>
      )}

      {loading ? (
        <p>กำลังโหลดรายการสินค้า...</p>
      ) : (
        <div className="card" style={{ maxWidth: '420px' }}>
          <form onSubmit={handleSell}>
            {/* Dropdown เลือกสินค้า */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>
                เลือกสินค้า
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">-- เลือกสินค้า --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {Number(p.price).toFixed(2)} บาท (คงเหลือ {p.stock})
                  </option>
                ))}
              </select>
            </div>

            {/* ช่องกรอกจำนวน */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>
                จำนวน
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {/* แสดงยอดรวมอัตโนมัติ */}
            <div style={{ marginBottom: '14px', fontSize: '18px' }}>
              ยอดรวม:{' '}
              <strong>{totalPrice ? totalPrice.toFixed(2) : '0.00'} บาท</strong>
            </div>

            <button type="submit" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'กำลังบันทึก...' : 'ขาย'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
