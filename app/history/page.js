'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function HistoryPage() {
  // รายการประวัติการขายทั้งหมด
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // โหลดข้อมูลจากตาราง sales เรียงล่าสุดไปเก่าสุด
  const fetchSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false });

    if (error) {
      setErrorMsg('โหลดประวัติการขายไม่สำเร็จ: ' + error.message);
    } else {
      setSales(data);
      setErrorMsg('');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // คำนวณยอดขายรวมทั้งหมดจาก total_price ของทุกแถว
  const totalRevenue = sales.reduce(
    (sum, sale) => sum + Number(sale.total_price),
    0
  );

  // แปลงวันเวลาให้อ่านง่ายตามรูปแบบไทย
  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div>
      <h1>ประวัติการขาย</h1>

      {errorMsg && (
        <p style={{ color: '#dc2626', fontWeight: 500 }}>{errorMsg}</p>
      )}

      {/* สรุปยอดขายรวมทั้งหมด */}
      <div className="card">
        <div style={{ fontSize: '16px', color: '#6b7280' }}>ยอดขายรวมทั้งหมด</div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: '#2563eb' }}>
          {totalRevenue.toFixed(2)} บาท
        </div>
        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
          จำนวน {sales.length} รายการขาย
        </div>
      </div>

      {/* ตารางแสดงประวัติการขาย */}
      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>วันเวลาที่ขาย</th>
              <th>ชื่อสินค้า</th>
              <th>จำนวน</th>
              <th>ยอดรวม</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>{formatDateTime(sale.sold_at)}</td>
                <td>{sale.product_name}</td>
                <td>{sale.quantity}</td>
                <td>{Number(sale.total_price).toFixed(2)} บาท</td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center' }}>
                  ยังไม่มีประวัติการขาย
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
