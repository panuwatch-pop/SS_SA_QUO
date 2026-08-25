import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register Thai Font (Sarabun)
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: '/fonts/Sarabun-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Sarabun-Bold.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    padding: 30,
    paddingBottom: 100,
    fontSize: 10,
    lineHeight: 1.5,
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  logoAndCompany: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '66%',
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 10,
    objectFit: 'contain',
  },
  companyDetails: {
    flexDirection: 'column',
    flex: 1,
    paddingRight: 10,
  },
  companyName: {
    fontSize: 13.5,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#002266',
    paddingRight: 10,
  },
  companyAddress: {
    fontSize: 8.5,
    color: '#555555',
    lineHeight: 1.3,
    paddingRight: 8,
  },
  documentTitleBox: {
    width: '32%',
    alignItems: 'flex-end',
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002266',
    marginBottom: 3,
  },
  documentSubTitle: {
    fontSize: 10,
    color: '#666666',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  supplierBox: {
    width: '55%',
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaBox: {
    width: '42%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    backgroundColor: '#f8fafc',
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#002266',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
    alignItems: 'flex-start',
  },
  infoLabel: {
    width: '35%',
    color: '#64748b',
    fontSize: 8.5,
  },
  infoValue: {
    width: '65%',
    color: '#1e293b',
    fontSize: 8.5,
    flexWrap: 'wrap',
  },
  table: {
    width: '100%',
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#002266',
    color: '#ffffff',
    padding: 6,
    fontWeight: 'bold',
    fontSize: 9,
    borderRadius: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 6,
    fontSize: 9,
  },
  colNo: { width: '6%', textAlign: 'center' },
  colItem: { width: '42%', paddingRight: 4 },
  colQty: { width: '12%', textAlign: 'center' },
  colCost: { width: '13%', textAlign: 'right', paddingRight: 4 },
  colDiscount: { width: '11%', textAlign: 'right', paddingRight: 4 },
  colTotal: { width: '16%', textAlign: 'right', paddingRight: 4 },
  
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  notesBox: {
    width: '52%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    backgroundColor: '#f8fafc',
  },
  totalsBox: {
    width: '44%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    fontSize: 9,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderTopWidth: 1.5,
    borderTopColor: '#002266',
    fontWeight: 'bold',
    fontSize: 11,
    color: '#002266',
  },
  footer: {
    marginTop: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '30%',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  signatureLine: {
    width: '90%',
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    marginBottom: 6,
  },
  signatureTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  signatureSubtitle: {
    fontSize: 7.5,
    color: '#64748b',
    marginTop: 1,
  },
  signatureDate: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 6,
  }
});

interface PurchaseOrderPDFProps {
  po: any;
  items: any[];
  supplier: any;
  companyProfile?: any;
}

export const PurchaseOrderPDF: React.FC<PurchaseOrderPDFProps> = ({ po, items, supplier, companyProfile }) => {
  const isSST = po.company_name === 'SST';
  const primaryColor = isSST ? '#002266' : '#002266';

  const companyNameTh = companyProfile?.full_name || (isSST 
    ? 'บริษัท เอสเอสที (ประเทศไทย) จำกัด' 
    : 'บริษัท ชินวา อันเซ็น จำกัด');

  const companyNameEn = isSST 
    ? 'SST (Thailand) Co., Ltd.' 
    : 'Shinwa Anzen Co., Ltd.';

  const companyAddress = companyProfile?.address || '';
  const taxId = companyProfile?.tax_id || '';
  const phone = companyProfile?.phone || '';
  const email = companyProfile?.email || '';

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const discountAmount = (subtotal * (po.global_discount_percent || 0)) / 100;
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = po.has_vat ? afterDiscount * 0.07 : 0;
  const grandTotal = afterDiscount + vatAmount;
  const whtAmount = po.has_wht ? afterDiscount * ((po.wht_percent || 3) / 100) : 0;
  const netPayable = grandTotal - whtAmount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoAndCompany}>
            <Image 
              src={isSST ? '/sst-logo.jpg' : '/shinwa-logo.jpg'} 
              style={styles.logo} 
            />
            <View style={styles.companyDetails}>
              <Text style={[styles.companyName, { color: primaryColor }]}>{companyNameTh ? `${companyNameTh} ` : ''}</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#475569', marginBottom: 2 }}>{`${companyNameEn} `}</Text>
              {companyAddress ? <Text style={styles.companyAddress}>{`${companyAddress} `}</Text> : null}
              <Text style={styles.companyAddress}>
                {[taxId ? `เลขประจำตัวผู้เสียภาษี: ${taxId}` : null, phone ? `โทร: ${phone}` : null].filter(Boolean).join(' | ')}
              </Text>
              {email ? <Text style={styles.companyAddress}>อีเมล: {email}</Text> : null}
            </View>
          </View>

          <View style={styles.documentTitleBox}>
            <Text style={[styles.documentTitle, { color: primaryColor }]}>ใบสั่งซื้อ</Text>
            <Text style={styles.documentSubTitle}>PURCHASE ORDER (PO)</Text>
            <View style={{ marginTop: 4, width: '100%' }}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { width: '45%' }]}>เลขที่เอกสาร:</Text>
                <Text style={[styles.infoValue, { width: '55%', fontWeight: 'bold' }]}>{po.po_number}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { width: '45%' }]}>วันที่สั่งซื้อ:</Text>
                <Text style={[styles.infoValue, { width: '55%' }]}>
                  {po.issue_date ? new Date(po.issue_date).toLocaleDateString('th-TH') : new Date(po.created_at).toLocaleDateString('th-TH')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Supplier & Meta Section */}
        <View style={styles.infoContainer}>
          {/* Supplier Box */}
          <View style={styles.supplierBox}>
            <Text style={styles.sectionHeading}>ข้อมูลผู้ขาย / SUPPLIER INFORMATION</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ชื่อผู้ขาย:</Text>
              <Text style={[styles.infoValue, { fontWeight: 'bold' }]}>{supplier?.name ? `${supplier.name} ` : '-'}</Text>
            </View>
            {supplier?.code && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>รหัสผู้ขาย:</Text>
                <Text style={styles.infoValue}>{supplier.code}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ที่อยู่:</Text>
              <Text style={styles.infoValue}>{supplier?.address ? `${supplier.address} ` : '-'}</Text>
            </View>
            {supplier?.tax_id && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>เลขผู้เสียภาษี:</Text>
                <Text style={styles.infoValue}>{supplier.tax_id}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ผู้ติดต่อ / โทร:</Text>
              <Text style={styles.infoValue}>
                {[supplier?.contact_name, supplier?.phone].filter(Boolean).join(' / ') || '-'}
              </Text>
            </View>
            {supplier?.email && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>อีเมล:</Text>
                <Text style={styles.infoValue}>{supplier.email}</Text>
              </View>
            )}
          </View>

          {/* Meta Box */}
          <View style={styles.metaBox}>
            <Text style={styles.sectionHeading}>เงื่อนไขการสั่งซื้อ / TERMS & CONDITIONS</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>เครดิตเทอม:</Text>
              <Text style={[styles.infoValue, { fontWeight: 'bold' }]}>
                {po.credit_terms ? `${po.credit_terms} วัน` : (supplier?.credit_terms ? `${supplier.credit_terms} วัน` : 'เงินสด (Cash)')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>กำหนดส่งของ:</Text>
              <Text style={styles.infoValue}>
                {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString('th-TH') : 'ตามตกลง'}
              </Text>
            </View>
            <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
              <Text style={styles.infoLabel}>สถานที่ส่งของ:</Text>
              <View style={{ width: '65%' }}>
                <Text style={[styles.infoValue, { width: '100%', fontWeight: 'bold' }]}>
                  {companyNameTh ? `${companyNameTh} ` : ''}
                </Text>
                {companyAddress ? (
                  <Text style={{ fontSize: 7.5, color: '#475569', marginTop: 1, lineHeight: 1.3 }}>
                    {`${companyAddress} `}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>การชำระเงิน:</Text>
              <Text style={styles.infoValue}>โอนเงินผ่านธนาคาร</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: primaryColor }]}>
            <Text style={styles.colNo}>ลำดับ</Text>
            <Text style={styles.colItem}>รายการสินค้า / รายละเอียด (Description)</Text>
            <Text style={styles.colQty}>จำนวน (Qty)</Text>
            <Text style={styles.colCost}>ราคา/หน่วย (Cost)</Text>
            <Text style={styles.colDiscount}>ส่วนลด</Text>
            <Text style={styles.colTotal}>จำนวนเงิน (THB)</Text>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colNo}>{index + 1}</Text>
              <View style={styles.colItem}>
                <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>
                  {item.products?.name || item.product_name || '-'}
                </Text>
                {item.products?.product_code && (
                  <Text style={{ fontSize: 7.5, color: '#64748b' }}>
                    รหัส: {item.products.product_code}
                  </Text>
                )}
                {item.description && (
                  <Text style={{ fontSize: 8, color: '#475569', marginTop: 1 }}>
                    {item.description}
                  </Text>
                )}
              </View>
              <Text style={styles.colQty}>
                {Number(item.quantity).toLocaleString()} {item.products?.unit || ''}
              </Text>
              <Text style={styles.colCost}>
                {Number(item.unit_cost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.colDiscount}>
                {Number(item.discount || 0) > 0 ? Number(item.discount).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
              </Text>
              <Text style={styles.colTotal}>
                {Number(item.total || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary & Notes */}
        <View style={styles.summaryContainer}>
          <View style={styles.notesBox}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#002266', marginBottom: 3 }}>หมายเหตุ / คำแนะนำการส่งสินค้า:</Text>
            <Text style={{ fontSize: 8.5, color: '#334155', lineHeight: 1.4 }}>
              {po.notes || '1. กรุณาแนบใบส่งสินค้า/ใบกำกับภาษีทุกครั้งที่ส่งมอบของ\n2. สินค้าต้องอยู่ในสภาพสมบูรณ์และตรงตามข้อกำหนด'}
            </Text>

            {supplier?.bank_account_no && (
              <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
                <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#002266' }}>ข้อมูลการโอนเงิน (Supplier Bank Info):</Text>
                <Text style={{ fontSize: 8, color: '#475569' }}>
                  {supplier.bank_name || ''} เลขที่บัญชี: {supplier.bank_account_no} ({supplier.bank_account_name || supplier.name})
                </Text>
              </View>
            )}
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={{ color: '#64748b' }}>รวมเป็นเงิน (Subtotal):</Text>
              <Text style={{ fontWeight: 'bold' }}>{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Text>
            </View>

            {discountAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#ef4444' }}>ส่วนลดพิเศษ ({po.global_discount_percent}%):</Text>
                <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>- {discountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Text>
              </View>
            )}

            {discountAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#64748b' }}>หลังหักส่วนลด:</Text>
                <Text>{afterDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={{ color: '#64748b' }}>ภาษีมูลค่าเพิ่ม (VAT 7%):</Text>
              <Text>{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Text>
            </View>

            <View style={styles.grandTotalRow}>
              <Text>จำนวนเงินรวมทั้งสิ้น (Grand Total):</Text>
              <Text>{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Text>
            </View>

            {po.has_wht && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#ef4444' }}>หักภาษี ณ ที่จ่าย ({po.wht_percent || 3}%):</Text>
                <Text style={{ color: '#ef4444' }}>- {whtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Text>
              </View>
            )}

            {po.has_wht && (
              <View style={[styles.grandTotalRow, { borderTopColor: '#cbd5e1', paddingTop: 4 }]}>
                <Text style={{ fontSize: 10 }}>ยอดชำระสุทธิ (Net Payable):</Text>
                <Text style={{ fontSize: 10 }}>{netPayable.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer Signatures */}
        <View style={styles.footer}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureTitle}>ผู้จัดทำ / ผู้สั่งซื้อ </Text>
            <Text style={styles.signatureSubtitle}>(Prepared By / Purchaser) </Text>
            <Text style={styles.signatureDate}>วันที่ _____/_____/_____</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureTitle}>ผู้อนุมัติสั่งซื้อ </Text>
            <Text style={styles.signatureSubtitle}>(Authorized Signature) </Text>
            <Text style={styles.signatureDate}>วันที่ _____/_____/_____</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureTitle}>ผู้ขาย / ยืนยันการสั่งซื้อ </Text>
            <Text style={styles.signatureSubtitle}>(Confirmed By Supplier) </Text>
            <Text style={styles.signatureDate}>วันที่ _____/_____/_____</Text>
          </View>
        </View>

        {/* Page Number */}
        <Text 
          style={{ position: 'absolute', bottom: 30, left: 0, right: 30, textAlign: 'right', fontSize: 10, color: '#555', fontFamily: 'Sarabun' }} 
          render={({ pageNumber, totalPages }) => `หน้า ${pageNumber} / ${totalPages}`} 
          fixed
        />
      </Page>
    </Document>
  );
};
