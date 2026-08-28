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
    padding: 28,
    paddingBottom: 70,
    fontSize: 9.5,
    lineHeight: 1.4,
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  logoAndCompany: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '64%',
  },
  logo: {
    width: 58,
    height: 58,
    marginRight: 10,
    objectFit: 'contain',
  },
  companyDetails: {
    flexDirection: 'column',
    flex: 1,
    paddingRight: 8,
  },
  companyName: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#002266',
    paddingRight: 8,
  },
  companyAddress: {
    fontSize: 8,
    color: '#475569',
    lineHeight: 1.25,
    paddingRight: 6,
  },
  documentTitleBox: {
    width: '34%',
    alignItems: 'flex-end',
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#002266',
    marginBottom: 2,
  },
  documentSubTitle: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  customerBox: {
    width: '54%',
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaBox: {
    width: '43%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    backgroundColor: '#f8fafc',
  },
  sectionHeading: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#002266',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2.5,
    alignItems: 'flex-start',
  },
  infoLabel: {
    width: '35%',
    color: '#64748b',
    fontSize: 8,
  },
  infoValue: {
    width: '65%',
    color: '#1e293b',
    fontSize: 8,
    flexWrap: 'wrap',
  },
  table: {
    width: '100%',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#002266',
    color: '#ffffff',
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontWeight: 'bold',
    fontSize: 8.5,
    borderRadius: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    fontSize: 8.5,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 15,
  },
  notesBox: {
    width: '54%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    backgroundColor: '#f8fafc',
  },
  totalsBox: {
    width: '43%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    backgroundColor: '#f8fafc',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    fontSize: 8.5,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1.5,
    borderTopColor: '#002266',
    marginTop: 3,
    fontWeight: 'bold',
    fontSize: 9.5,
    color: '#002266',
  },
  footer: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '31%',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  signatureLine: {
    width: '90%',
    height: 38,
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    marginBottom: 5,
  },
  signatureTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  signatureSubtitle: {
    fontSize: 7.5,
    color: '#64748b',
    marginTop: 1,
    textAlign: 'center',
  },
  signatureDate: {
    fontSize: 7.5,
    color: '#94a3b8',
    marginTop: 5,
  }
});

interface DeliveryOrderPDFProps {
  order: any;
  items: any[];
  customer: any;
  companyProfile?: any;
}

export const DeliveryOrderPDF: React.FC<DeliveryOrderPDFProps> = ({ order, items, customer, companyProfile }) => {
  const isSST = order.company_name === 'SST';
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

  const hidePrice = order.hide_price === true;

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const discountAmount = (subtotal * (order.global_discount_percent || 0)) / 100;
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = order.has_vat ? afterDiscount * 0.07 : 0;
  const grandTotal = afterDiscount + vatAmount;

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
              <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#475569', marginBottom: 2 }}>{`${companyNameEn} `}</Text>
              {companyAddress ? <Text style={styles.companyAddress}>{`${companyAddress} `}</Text> : null}
              <Text style={styles.companyAddress}>
                {[taxId ? `เลขประจำตัวผู้เสียภาษี: ${taxId}` : null, phone ? `โทร: ${phone}` : null].filter(Boolean).join(' | ')}
              </Text>
              {email ? <Text style={styles.companyAddress}>อีเมล: {email}</Text> : null}
            </View>
          </View>

          <View style={styles.documentTitleBox}>
            <Text style={[styles.documentTitle, { color: primaryColor }]}>ใบส่งของชั่วคราว </Text>
            <Text style={styles.documentSubTitle}>TEMPORARY DELIVERY ORDER (DO) </Text>
            <View style={{ marginTop: 3, width: '100%' }}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { width: '45%' }]}>เลขที่เอกสาร:</Text>
                <Text style={[styles.infoValue, { width: '55%', fontWeight: 'bold' }]}>{order.do_number} </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { width: '45%' }]}>วันที่จัดส่ง:</Text>
                <Text style={[styles.infoValue, { width: '55%' }]}>
                  {order.issue_date ? new Date(order.issue_date).toLocaleDateString('th-TH') : new Date(order.created_at).toLocaleDateString('th-TH')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Customer & Delivery Section */}
        <View style={styles.infoContainer}>
          {/* Customer Box */}
          <View style={styles.customerBox}>
            <Text style={styles.sectionHeading}>ข้อมูลลูกค้า / CUSTOMER INFORMATION </Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ชื่อลูกค้า:</Text>
              <Text style={[styles.infoValue, { fontWeight: 'bold' }]}>{customer?.name ? `${customer.name} ` : '-'}</Text>
            </View>
            {customer?.customer_code && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>รหัสลูกค้า:</Text>
                <Text style={styles.infoValue}>{customer.customer_code} </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ที่อยู่ลูกค้า:</Text>
              <Text style={styles.infoValue}>{customer?.address ? `${customer.address} ` : '-'}</Text>
            </View>
            {customer?.tax_id && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>เลขผู้เสียภาษี:</Text>
                <Text style={styles.infoValue}>{customer.tax_id} </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ผู้ติดต่อ / โทร:</Text>
              <Text style={styles.infoValue}>
                {[customer?.contact_name, customer?.phone || customer?.contact_phone].filter(Boolean).join(' / ') || '-'}
              </Text>
            </View>
          </View>

          {/* Delivery Details Meta Box */}
          <View style={styles.metaBox}>
            <Text style={styles.sectionHeading}>รายละเอียดการส่งมอบ / DELIVERY DETAILS </Text>
            {order.customer_po_no && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>เลขที่ PO ลูกค้า:</Text>
                <Text style={[styles.infoValue, { fontWeight: 'bold' }]}>{order.customer_po_no} </Text>
              </View>
            )}
            {order.project_name && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>โครงการ / หน้างาน:</Text>
                <Text style={styles.infoValue}>{order.project_name} </Text>
              </View>
            )}
            <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
              <Text style={styles.infoLabel}>สถานที่จัดส่ง:</Text>
              <Text style={[styles.infoValue, { fontWeight: '500' }]}>
                {order.delivery_address ? `${order.delivery_address} ` : (customer?.address ? `${customer.address} ` : 'ตามที่อยู่ลูกค้า ')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>จัดส่งโดย:</Text>
              <Text style={styles.infoValue}>{order.transport_by || 'รถบริษัท'} </Text>
            </View>
            {(order.driver_name || order.driver_phone) && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>พนักงาน / ทะเบียน:</Text>
                <Text style={styles.infoValue}>
                  {[order.driver_name, order.driver_phone].filter(Boolean).join(' โทร: ') || '-'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: primaryColor }]}>
            <Text style={{ width: '6%', textAlign: 'center' }}>ลำดับ </Text>
            <Text style={{ width: hidePrice ? '58%' : '38%' }}>รายการสินค้า (Description) </Text>
            <Text style={{ width: hidePrice ? '18%' : '14%', textAlign: 'center' }}>จำนวน (Qty) </Text>
            <Text style={{ width: hidePrice ? '18%' : '12%', textAlign: 'center' }}>หน่วย (Unit) </Text>
            {!hidePrice && (
              <>
                <Text style={{ width: '15%', textAlign: 'right', paddingRight: 4 }}>ราคา/หน่วย </Text>
                <Text style={{ width: '15%', textAlign: 'right', paddingRight: 4 }}>รวมเงิน (บาท) </Text>
              </>
            )}
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.tableRow} wrap={false}>
              <Text style={{ width: '6%', textAlign: 'center', color: '#64748b' }}>{index + 1}</Text>
              <View style={{ width: hidePrice ? '58%' : '38%', paddingRight: 4 }}>
                <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>
                  {item.products?.name ? `${item.products.name} ` : (item.product_name ? `${item.product_name} ` : '-')}
                </Text>
                {item.products?.product_code && (
                  <Text style={{ fontSize: 7.5, color: '#64748b', marginTop: 1 }}>
                    รหัส: {item.products.product_code}
                  </Text>
                )}
                {item.description && (
                  <Text style={{ fontSize: 7.5, color: '#475569', marginTop: 1 }}>
                    {item.description}
                  </Text>
                )}
              </View>
              <Text style={{ width: hidePrice ? '18%' : '14%', textAlign: 'center', fontWeight: 'bold' }}>
                {Number(item.quantity || 0).toLocaleString()}
              </Text>
              <Text style={{ width: hidePrice ? '18%' : '12%', textAlign: 'center', color: '#64748b' }}>
                {item.products?.unit ? `${item.products.unit} ` : 'ชิ้น '}
              </Text>
              {!hidePrice && (
                <>
                  <Text style={{ width: '15%', textAlign: 'right', paddingRight: 4 }}>
                    {Number(item.unit_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </Text>
                  <Text style={{ width: '15%', textAlign: 'right', paddingRight: 4, fontWeight: 'bold' }}>
                    {Number(item.total || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </Text>
                </>
              )}
            </View>
          ))}
        </View>

        {/* Notes & Summary Section */}
        <View style={styles.summaryContainer} wrap={false}>
          {/* Notes */}
          <View style={[styles.notesBox, { width: hidePrice ? '100%' : '54%' }]}>
            <Text style={styles.sectionHeading}>ข้อกำหนดและหมายเหตุ / REMARKS </Text>
            <Text style={{ fontSize: 8, color: '#334155', lineHeight: 1.35, paddingRight: 6 }}>
              {order.notes ? `${order.notes} ` : '1. ได้รับสินค้าตามรายการข้างต้นถูกต้องครบถ้วนและอยู่ในสภาพเรียบร้อยสมบูรณ์\n2. กรุณาลงลายมือชื่อและประทับตราสำคัญเพื่อเป็นหลักฐานในการรับมอบสินค้า '}
            </Text>
          </View>

          {/* Monetary Totals (Only shown if hide_price is false) */}
          {!hidePrice && (
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={{ color: '#64748b' }}>รวมเป็นเงิน (Subtotal): </Text>
                <Text>{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Text>
              </View>

              {discountAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={{ color: '#ef4444' }}>ส่วนลด ({order.global_discount_percent}%): </Text>
                  <Text style={{ color: '#ef4444' }}>- {discountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Text>
                </View>
              )}

              {order.has_vat && (
                <View style={styles.totalRow}>
                  <Text style={{ color: '#64748b' }}>ภาษีมูลค่าเพิ่ม (VAT 7%): </Text>
                  <Text>{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Text>
                </View>
              )}

              <View style={styles.grandTotalRow}>
                <Text>จำนวนเงินรวมทั้งสิ้น: </Text>
                <Text>{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Text>
              </View>
            </View>
          )}
        </View>

        {/* Footer Signatures */}
        <View style={styles.footer} wrap={false}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureTitle}>ผู้ส่งสินค้า / พนักงานขับรถ </Text>
            <Text style={styles.signatureSubtitle}>(Delivered By / Driver) </Text>
            <Text style={styles.signatureDate}>วันที่ _____/_____/_____</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureTitle}>ผู้จัดทำ / ฝ่ายขาย </Text>
            <Text style={styles.signatureSubtitle}>(Prepared By / Sales) </Text>
            <Text style={styles.signatureDate}>วันที่ _____/_____/_____</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureTitle}>ผู้รับสินค้า / ลูกค้า </Text>
            <Text style={styles.signatureSubtitle}>(Received By / Customer) </Text>
            <Text style={styles.signatureDate}>วันที่ _____/_____/_____ (ประทับตรา)</Text>
          </View>
        </View>

        {/* Page Number */}
        <Text 
          style={{ position: 'absolute', bottom: 20, left: 0, right: 28, textAlign: 'right', fontSize: 8, color: '#94a3b8', fontFamily: 'Sarabun' }} 
          render={({ pageNumber, totalPages }) => `หน้า ${pageNumber} / ${totalPages}`} 
          fixed
        />
      </Page>
    </Document>
  );
};
