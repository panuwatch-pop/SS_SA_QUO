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
    paddingBottom: 60,
    fontSize: 9,
    lineHeight: 1.4,
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  logoAndCompany: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '62%',
  },
  logo: {
    width: 54,
    height: 54,
    marginRight: 10,
    objectFit: 'contain',
  },
  companyDetails: {
    flexDirection: 'column',
    flex: 1,
    paddingRight: 8,
  },
  companyName: {
    fontSize: 12.5,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#002266',
  },
  companyAddress: {
    fontSize: 7.5,
    color: '#475569',
    lineHeight: 1.25,
  },
  documentTitleBox: {
    width: '36%',
    alignItems: 'flex-end',
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#002266',
    marginBottom: 2,
  },
  documentSubTitle: {
    fontSize: 8.5,
    color: '#64748b',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  borrowerBox: {
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
    fontSize: 8.5,
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
    width: '36%',
    color: '#64748b',
    fontSize: 7.5,
  },
  infoValue: {
    width: '64%',
    color: '#1e293b',
    fontSize: 7.5,
    flexWrap: 'wrap',
  },
  table: {
    width: '100%',
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#002266',
    color: '#ffffff',
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontWeight: 'bold',
    fontSize: 8,
    borderRadius: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 8,
  },
  colNo: { width: '6%', textAlign: 'center' },
  colItem: { width: '40%', paddingRight: 4 },
  colSerial: { width: '16%', paddingRight: 2 },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '13%', textAlign: 'right', paddingRight: 2 },
  colTotal: { width: '15%', textAlign: 'right', paddingRight: 2 },

  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 12,
  },
  notesBox: {
    width: '54%',
    padding: 7,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    backgroundColor: '#f8fafc',
  },
  totalsBox: {
    width: '43%',
    padding: 7,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    backgroundColor: '#f8fafc',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    fontSize: 8,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderTopWidth: 1.5,
    borderTopColor: '#002266',
    marginTop: 2,
    fontWeight: 'bold',
    fontSize: 9,
    color: '#002266',
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '31%',
    alignItems: 'center',
    padding: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  signatureLine: {
    width: '90%',
    height: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    marginBottom: 4,
  },
  signatureTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  signatureSubtitle: {
    fontSize: 7,
    color: '#64748b',
    marginTop: 1,
    textAlign: 'center',
  },
  signatureDate: {
    fontSize: 7,
    color: '#94a3b8',
    marginTop: 4,
  }
});

interface BorrowSlipPDFProps {
  slip: any;
  items: any[];
  companyProfile?: any;
}

export const BorrowSlipPDF: React.FC<BorrowSlipPDFProps> = ({ slip, items, companyProfile }) => {
  const isSST = slip.company_name === 'SST';
  const primaryColor = '#002266';

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

  const totalValue = items.reduce((sum, item) => sum + (Number(item.total) || (Number(item.quantity) * Number(item.unit_price)) || 0), 0);
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

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
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#475569', marginBottom: 2 }}>{`${companyNameEn} `}</Text>
              {companyAddress ? <Text style={styles.companyAddress}>{`${companyAddress} `}</Text> : null}
              <Text style={styles.companyAddress}>
                {[taxId ? `เลขประจำตัวผู้เสียภาษี: ${taxId}` : null, phone ? `โทร: ${phone}` : null].filter(Boolean).join(' | ')}
              </Text>
              {email ? <Text style={styles.companyAddress}>อีเมล: {email}</Text> : null}
            </View>
          </View>

          <View style={styles.documentTitleBox}>
            <Text style={[styles.documentTitle, { color: primaryColor }]}>ใบยืมสินค้า </Text>
            <Text style={styles.documentSubTitle}>GOODS LOAN / BORROW SLIP </Text>
            <View style={{ marginTop: 2, width: '100%' }}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { width: '48%' }]}>เลขที่เอกสาร:</Text>
                <Text style={[styles.infoValue, { width: '52%', fontWeight: 'bold' }]}>{slip.borrow_number} </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { width: '48%' }]}>วันที่ยืม:</Text>
                <Text style={[styles.infoValue, { width: '52%' }]}>
                  {slip.borrow_date ? new Date(slip.borrow_date).toLocaleDateString('th-TH') : new Date(slip.created_at).toLocaleDateString('th-TH')}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { width: '48%', color: '#b91c1c', fontWeight: 'bold' }]}>กำหนดส่งคืน:</Text>
                <Text style={[styles.infoValue, { width: '52%', fontWeight: 'bold', color: '#b91c1c' }]}>
                  {slip.expected_return_date ? new Date(slip.expected_return_date).toLocaleDateString('th-TH') : 'ตามตกลง'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Borrower & Purpose Information */}
        <View style={styles.infoContainer}>
          {/* Borrower Box */}
          <View style={styles.borrowerBox}>
            <Text style={styles.sectionHeading}>ข้อมูลผู้ยืม / BORROWER INFORMATION </Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ชื่อผู้ยืม/หน่วยงาน:</Text>
              <Text style={[styles.infoValue, { fontWeight: 'bold' }]}>{slip.borrower_name} </Text>
            </View>
            {slip.borrower_address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>ที่อยู่/สถานที่:</Text>
                <Text style={styles.infoValue}>{slip.borrower_address} </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ผู้ติดต่อ/โทรศัพท์:</Text>
              <Text style={styles.infoValue}>
                {[slip.contact_person, slip.borrower_phone].filter(Boolean).join(' | ') || '-'}
              </Text>
            </View>
            {slip.borrower_email && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>อีเมล:</Text>
                <Text style={styles.infoValue}>{slip.borrower_email} </Text>
              </View>
            )}
          </View>

          {/* Loan Details Box */}
          <View style={styles.metaBox}>
            <Text style={styles.sectionHeading}>รายละเอียดการยืม / LOAN DETAILS </Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>วัตถุประสงค์:</Text>
              <Text style={[styles.infoValue, { fontWeight: 'bold' }]}>{slip.purpose || 'ยืมใช้งานชั่วคราว'} </Text>
            </View>
            {slip.project_name && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>โปรเจกต์/งาน:</Text>
                <Text style={styles.infoValue}>{slip.project_name} </Text>
              </View>
            )}
            {slip.location && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>สถานที่นำไปใช้:</Text>
                <Text style={styles.infoValue}>{slip.location} </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>สถานะปัจจุบัน:</Text>
              <Text style={[styles.infoValue, { fontWeight: 'bold' }]}>
                {slip.status === 'returned' ? 'ส่งคืนครบแล้ว' : slip.status === 'partially_returned' ? 'คืนบางส่วน' : 'อยู่ระหว่างการยืม'}
              </Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: primaryColor }]} fixed>
            <Text style={styles.colNo}>ลำดับ{'\n'}(No.)</Text>
            <Text style={styles.colItem}>รายการสินค้า{'\n'}(Item / Description)</Text>
            <Text style={styles.colSerial}>Serial Number{'\n'}(S/N / รหัสเครื่อง)</Text>
            <Text style={styles.colQty}>จำนวน{'\n'}(Qty)</Text>
            <Text style={styles.colPrice}>มูลค่าประเมิน/หน่วย{'\n'}(Est. Value)</Text>
            <Text style={styles.colTotal}>รวมมูลค่า{'\n'}(Total)</Text>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.tableRow} wrap={false}>
              <Text style={styles.colNo}>{index + 1}</Text>
              <View style={styles.colItem}>
                <Text style={{ fontWeight: 'bold' }}>{item.products?.name || item.product_name || 'สินค้า'}</Text>
                {item.description && (
                  <Text style={{ fontSize: 7, color: '#475569', marginTop: 1 }}>{item.description}</Text>
                )}
                {item.condition_notes && (
                  <Text style={{ fontSize: 6.5, color: '#0284c7', marginTop: 1 }}>สภาพ: {item.condition_notes}</Text>
                )}
              </View>
              <Text style={styles.colSerial}>{item.serial_number || '-'}</Text>
              <Text style={styles.colQty}>{item.quantity} {item.products?.unit || ''}</Text>
              <Text style={styles.colPrice}>
                {Number(item.unit_price) > 0 ? Number(item.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
              </Text>
              <Text style={styles.colTotal}>
                {Number(item.total || (item.quantity * item.unit_price)) > 0 
                  ? Number(item.total || (item.quantity * item.unit_price)).toLocaleString('th-TH', { minimumFractionDigits: 2 }) 
                  : '-'}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary & Notes */}
        <View style={styles.summaryContainer} wrap={false}>
          <View style={styles.notesBox}>
            <Text style={{ fontWeight: 'bold', fontSize: 8, marginBottom: 3 }}>ข้อกำหนดและเงื่อนไขการยืมสินค้า (Terms & Conditions):</Text>
            <Text style={{ fontSize: 7, lineHeight: 1.35, color: '#334155' }}>
              {slip.notes || '1. ผู้ยืมต้องดูแลรักษาสินค้าให้อยู่ในสภาพเรียบร้อยสมบูรณ์ หากเกิดความเสียหายหรือสูญหาย ผู้ยืมยินยอมชดใช้ตามราคาประเมินของสินค้า\n2. กรุณาส่งคืนสินค้าตามกำหนดเวลาที่ระบุไว้ในเอกสารฉบับนี้'}
            </Text>
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text>จำนวนชิ้นที่ยืมรวม:</Text>
              <Text style={{ fontWeight: 'bold' }}>{totalQuantity} รายการ</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>มูลค่าประเมินรวมทั้งสิ้น:</Text>
              <Text style={{ fontWeight: 'bold' }}>{totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Text>
            </View>
            {Number(slip.deposit_amount) > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#059669' }}>เงินมัดจำ (Deposit):</Text>
                <Text style={{ fontWeight: 'bold', color: '#059669' }}>{Number(slip.deposit_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text>สถานะส่งคืน:</Text>
              <Text>{slip.status === 'returned' ? 'คืนครบถ้วนแล้ว' : 'ยังคงค้างส่งคืน'}</Text>
            </View>
          </View>
        </View>

        {/* Signatures Area (3 Signatures: Borrower, Delivered/Approved, Received Return) */}
        <View style={styles.footer} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>ผู้ยืมสินค้า</Text>
            <Text style={styles.signatureSubtitle}>(Borrower / Received By)</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureDate}>ลงชื่อ .....................................................</Text>
            <Text style={styles.signatureDate}>วันที่: ...... / ...... / ............</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>ผู้ส่งมอบ / ผู้อนุมัติ</Text>
            <Text style={styles.signatureSubtitle}>(Delivered / Authorized By)</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureDate}>ลงชื่อ .....................................................</Text>
            <Text style={styles.signatureDate}>วันที่: ...... / ...... / ............</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>ผู้ตรวจสอบและรับคืน</Text>
            <Text style={styles.signatureSubtitle}>(Inspected & Received Return By)</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureDate}>ลงชื่อ .....................................................</Text>
            <Text style={styles.signatureDate}>วันที่รับคืน: ...... / ...... / ............</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
