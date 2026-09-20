'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

// ===== [เพิ่มใหม่] เกณฑ์เตือนสต๊อกเหลือน้อย =====
const LOW_STOCK_THRESHOLD = 5;

// ===== [เพิ่มใหม่] escape อักขระพิเศษของ HTML กันชื่อสินค้าที่มี < > & ทำให้ Telegram ตีความพัง =====
const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ===== [เพิ่มใหม่] สร้างข้อความแจ้งเตือนรายการขายใหม่ =====
const buildNewOrderMessage = (item, stockAfter, timeText) =>
  [
    '🛍️ <b>มีรายการขายใหม่!</b>',
    `- สินค้า: ${escapeHtml(item.name)}`,
    `- จำนวน: ${item.quantity} ชิ้น`,
    `- ราคารวม: ${(item.price * item.quantity).toFixed(2)} บาท`,
    `- สต๊อกคงเหลือปัจจุบัน: ${stockAfter} ชิ้น`,
    `- เวลา: ${timeText}`,
  ].join('\n');

// ===== [เพิ่มใหม่] สร้างข้อความเตือนภัยสต๊อกใกล้หมด =====
const buildLowStockMessage = (item, stockAfter) =>
  [
    '🚨 <b>[เตือนภัย] สต๊อกสินค้าใกล้หมด!</b>',
    `- สินค้า: ${escapeHtml(item.name)}`,
    `- คงเหลือเพียง: ${stockAfter} ชิ้น`,
    '⚠️ กรุณาเติมสต๊อกสินค้าด่วน!',
  ].join('\n');

// ===== [เพิ่มใหม่] ส่งข้อความไป Telegram ผ่าน Route Handler ฝั่ง Server =====
// ห่อด้วย try/catch ทั้งก้อน: ถ้า Telegram ล่มหรือ token ผิด ระบบขายยังทำงานปกติ
const sendTelegramNotifications = async (messages) => {
  if (messages.length === 0) return;
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
  } catch (error) {
    console.error('ส่งแจ้งเตือน Telegram ไม่สำเร็จ:', error);
  }
};

export default function SellPage() {
  // รายการสินค้าทั้งหมด (ใช้เติม dropdown)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // สินค้าที่กำลังเลือกจะเพิ่มลงตะกร้า
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');

  // ตะกร้าสินค้า: [{ productId, sku, name, price, unit, quantity }]
  const [cart, setCart] = useState([]);

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

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // ยอดรวมของแถวที่กำลังจะเพิ่ม
  const pendingLineTotal =
    selectedProduct && quantity
      ? Number(selectedProduct.price) * Number(quantity)
      : 0;

  // ยอดรวมทั้งตะกร้า
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // เพิ่มสินค้าลงตะกร้า (ถ้าสินค้าซ้ำ ให้รวมจำนวนกัน)
  const handleAddToCart = () => {
    setErrorMsg('');
    if (!selectedProductId) {
      setErrorMsg('กรุณาเลือกสินค้า');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setErrorMsg('กรุณากรอกจำนวนให้ถูกต้อง');
      return;
    }

    const existingInCart = cart.find((item) => item.productId === selectedProductId);
    const qtyAlreadyInCart = existingInCart ? existingInCart.quantity : 0;
    if (qtyAlreadyInCart + qty > selectedProduct.stock) {
      setErrorMsg(
        `สินค้าคงเหลือไม่พอ (คงเหลือ ${selectedProduct.stock} ${selectedProduct.unit}, ในตะกร้ามีอยู่แล้ว ${qtyAlreadyInCart})`
      );
      return;
    }

    if (existingInCart) {
      setCart(
        cart.map((item) =>
          item.productId === selectedProductId
            ? { ...item, quantity: item.quantity + qty }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: selectedProduct.id,
          sku: selectedProduct.sku,
          name: selectedProduct.name,
          price: Number(selectedProduct.price),
          unit: selectedProduct.unit,
          quantity: qty,
        },
      ]);
    }

    setSelectedProductId('');
    setQuantity('');
  };

  // ลบสินค้าออกจากตะกร้า
  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  // แก้จำนวนสินค้าในตะกร้าโดยตรง
  const handleCartQtyChange = (productId, newQty) => {
    const qty = parseInt(newQty, 10);
    setCart(
      cart.map((item) =>
        item.productId === productId
          ? { ...item, quantity: qty > 0 ? qty : 1 }
          : item
      )
    );
  };

  // ยืนยันการขายทั้งตะกร้า
  const handleCheckout = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (cart.length === 0) {
      setErrorMsg('ตะกร้ายังไม่มีสินค้า');
      return;
    }

    setSubmitting(true);

    // ดึง stock ล่าสุดของทุกสินค้าในตะกร้ามาเช็คอีกครั้ง
    const productIds = cart.map((item) => item.productId);
    const { data: currentProducts, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (fetchError || !currentProducts) {
      setErrorMsg('ตรวจสอบสต็อกไม่สำเร็จ กรุณาลองใหม่');
      setSubmitting(false);
      return;
    }

    // ตรวจสอบสต็อกทุกรายการก่อน ถ้ามีรายการใดไม่พอให้หยุดทันที
    for (const item of cart) {
      const current = currentProducts.find((p) => p.id === item.productId);
      if (!current || current.stock < item.quantity) {
        setErrorMsg(
          `"${item.name}" คงเหลือไม่พอ (คงเหลือจริง ${current ? current.stock : 0} ${item.unit})`
        );
        setSubmitting(false);
        return;
      }
    }

    const soldAt = new Date().toISOString();
    const timeText = new Date().toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // ===== [เพิ่มใหม่] เก็บข้อความแจ้งเตือนไว้ก่อน แล้วค่อยยิงทีเดียวหลังตัดสต๊อกครบ =====
    const notifyMessages = [];

    // บันทึกรายการขายและตัดสต๊อกทีละรายการ
    for (const item of cart) {
      const current = currentProducts.find((p) => p.id === item.productId);
      const lineTotal = item.price * item.quantity;

      const { error: insertError } = await supabase.from('sales').insert([
        {
          product_id: item.productId,
          product_name: item.name,
          quantity: item.quantity,
          total_price: lineTotal,
          sold_at: soldAt,
        },
      ]);

      if (insertError) {
        setErrorMsg(`บันทึกการขาย "${item.name}" ไม่สำเร็จ: ${insertError.message}`);
        setSubmitting(false);
        fetchProducts();
        return;
      }

      // ===== [แก้ไข] คำนวณสต๊อกหลังตัดเก็บไว้ใช้ในข้อความแจ้งเตือน =====
      const stockAfter = current.stock - item.quantity;

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: stockAfter })
        .eq('id', item.productId);

      if (updateError) {
        setErrorMsg(`ปรับปรุงสต็อก "${item.name}" ไม่สำเร็จ: ${updateError.message}`);
        setSubmitting(false);
        fetchProducts();
        return;
      }

      // ===== [เพิ่มใหม่] งานที่ 1: ข้อความแจ้งเตือน Order ใหม่ =====
      notifyMessages.push(buildNewOrderMessage(item, stockAfter, timeText));

      // ===== [เพิ่มใหม่] งานที่ 2: ถ้าสต๊อกหลังตัด <= 5 ให้เพิ่มข้อความเตือนภัยอีก 1 ข้อความ =====
      if (stockAfter <= LOW_STOCK_THRESHOLD) {
        notifyMessages.push(buildLowStockMessage(item, stockAfter));
      }
    }

    // ===== [เพิ่มใหม่] ยิงแจ้งเตือนหลังตัดสต๊อกสำเร็จ (ไม่ await ให้บล็อกการแสดงผล) =====
    sendTelegramNotifications(notifyMessages);

    setSuccessMsg(`ขายสำเร็จ ${cart.length} รายการ รวม ${cartTotal.toFixed(2)} บาท`);
    setCart([]);
    setSubmitting(false);
    fetchProducts();
  };

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {/* สรุปยอดรวมตัวใหญ่ ไว้บนสุด */}
      <div
        className="card"
        style={{ textAlign: 'center', backgroundColor: '#2563eb', color: '#ffffff' }}
      >
        <div style={{ fontSize: '16px', opacity: 0.85 }}>
          ยอดรวมทั้งหมด ({cartItemCount} ชิ้น)
        </div>
        <div style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1.2 }}>
          {cartTotal.toFixed(2)} บาท
        </div>
      </div>

      {errorMsg && <p style={{ color: '#dc2626', fontWeight: 500 }}>{errorMsg}</p>}
      {successMsg && <p style={{ color: '#16a34a', fontWeight: 500 }}>{successMsg}</p>}

      {loading ? (
        <p>กำลังโหลดรายการสินค้า...</p>
      ) : (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* ฝั่งซ้าย: เลือกสินค้า */}
          <div className="card" style={{ flex: '1 1 320px' }}>
            <h2 style={{ marginTop: 0 }}>เลือกสินค้า</h2>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>สินค้า</label>
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

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>จำนวน</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '14px', fontSize: '16px', color: '#374151' }}>
              รวมรายการนี้: <strong>{pendingLineTotal.toFixed(2)} บาท</strong>
            </div>

            <button onClick={handleAddToCart} style={{ width: '100%' }}>
              + เพิ่มลงตะกร้า
            </button>
          </div>

          {/* ฝั่งขวา: ตะกร้าสินค้า */}
          <div className="card" style={{ flex: '1 1 380px' }}>
            <h2 style={{ marginTop: 0 }}>ตะกร้าสินค้า</h2>

            {cart.length === 0 ? (
              <p style={{ color: '#6b7280' }}>ยังไม่มีสินค้าในตะกร้า</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>สินค้า</th>
                    <th>จำนวน</th>
                    <th>รวม</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.productId}>
                      <td>
                        {item.name}
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {item.price.toFixed(2)} บาท/{item.unit}
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleCartQtyChange(item.productId, e.target.value)
                          }
                          style={{ width: '60px' }}
                        />
                      </td>
                      <td>{(item.price * item.quantity).toFixed(2)}</td>
                      <td>
                        <button
                          onClick={() => handleRemoveFromCart(item.productId)}
                          style={{ backgroundColor: '#dc2626' }}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <button
              onClick={handleCheckout}
              disabled={submitting || cart.length === 0}
              style={{
                width: '100%',
                marginTop: '16px',
                fontSize: '18px',
                padding: '12px',
                backgroundColor: '#16a34a',
              }}
            >
              {submitting ? 'กำลังบันทึก...' : `ยืนยันการขาย (${cartTotal.toFixed(2)} บาท)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
