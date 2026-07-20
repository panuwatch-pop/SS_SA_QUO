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
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  logoAndCompany: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 10,
    objectFit: 'contain',
  },
  companyDetails: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#002266', // Default SST Color, we can pass it dynamically if needed
  },
  companyAddress: {
    fontSize: 9,
    color: '#555555',
  },
  documentTitleBox: {
    width: '35%',
    alignItems: 'flex-end',
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  customerBox: {
    width: '55%',
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  metaBox: {
    width: '40%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#eeeeee',
    borderRadius: 4,
  },
  boldText: {
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#002266',
    color: '#ffffff',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    padding: 8,
  },
  colNo: { width: '7%', textAlign: 'center', paddingHorizontal: 2 },
  colItem: { width: '31%', paddingRight: 2 },
  colQty: { width: '11%', textAlign: 'center', paddingHorizontal: 2 },
  colPrice: { width: '14%', textAlign: 'right', paddingRight: 4 },
  colDiscount: { width: '14%', textAlign: 'right', paddingRight: 4 },
  colTotal: { width: '23%', textAlign: 'right', paddingRight: 4 },
  
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  notesBox: {
    width: '55%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#eeeeee',
    borderRadius: 4,
  },
  totalsBox: {
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 2,
    borderTopColor: '#333333',
    fontWeight: 'bold',
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '30%',
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    marginBottom: 5,
  }
});

interface QuotationPDFProps {
  quotation: any;
  items: any[];
  customer: any;
  companyProfile?: any;
}

export const QuotationPDF: React.FC<QuotationPDFProps> = ({ quotation, items, customer, companyProfile }) => {
  const isSST = quotation.company_name === 'SST';
  const logoUrl = isSST ? '/sst-logo.jpg' : '/shinwa-logo.jpg';
  const headerBgColor = isSST ? '#002266' : '#d4af37';
  const headerTextColor = isSST ? '#ffffff' : '#002266';
  const companyNameColor = '#002266'; // Always dark blue for readable text on white background
  
  // Fallback default information if profile is missing
  const fallbackSST = 'Siam Safety Tech Co., Ltd.\n123 Safety Road, Bangkok 10110\nTax ID: 0105555555555';
  const fallbackShinwa = 'Shinwa Anzen Co., Ltd.\n456 Japan Ave, Bangkok 10110\nTax ID: 0106666666666';
  
  let companyAddressText = isSST ? fallbackSST : fallbackShinwa;
  if (companyProfile) {
    companyAddressText = `${companyProfile.full_name}\n${companyProfile.address || ''}`;
    if (companyProfile.tax_id) companyAddressText += `\nTax ID: ${companyProfile.tax_id}`;
    if (companyProfile.phone) companyAddressText += `\nTel: ${companyProfile.phone}`;
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + Number(item.total), 0);
  const discountAmount = (subtotal * (quotation.global_discount_percent || 0)) / 100;
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = quotation.has_vat ? afterDiscount * 0.07 : 0;
  const grandTotal = afterDiscount + vatAmount;
  const whtAmount = quotation.has_wht ? afterDiscount * 0.03 : 0;
  const netPayable = quotation.total_amount; // exact from DB

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoAndCompany}>
            <Image 
              src={typeof window !== 'undefined' ? `${window.location.origin}${logoUrl}` : logoUrl} 
              style={styles.logo} 
            />
            <View style={styles.companyDetails}>
              <Text style={{...styles.companyName, color: companyNameColor}}>
                {isSST ? 'SST (Thailand) Co.,Ltd.' : 'Shinwa Anzen Co.,Ltd.'}
              </Text>
              <Text style={styles.companyAddress}>
                {companyAddressText}
              </Text>
            </View>
          </View>
          <View style={styles.documentTitleBox}>
            <Text style={styles.documentTitle}>ใบเสนอราคา</Text>
            <Text style={{fontSize: 14, color: '#555'}}>QUOTATION</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <View style={styles.customerBox}>
            <Text style={{fontWeight: 'bold', fontSize: 12, marginBottom: 5}}>ลูกค้า (Customer):</Text>
            <Text>{customer?.name}</Text>
            <Text>{customer?.address || ''}</Text>
            {customer?.tax_id && <Text>เลขประจำตัวผู้เสียภาษี (Tax ID): {customer.tax_id}</Text>}
            <View style={{marginTop: 5}}>
              {customer?.contact_name && <Text>เรียน (Attn): {customer.contact_name}</Text>}
              {customer?.contact_phone && <Text>โทร (Tel): {customer.contact_phone}</Text>}
            </View>
          </View>
          
          <View style={styles.metaBox}>
            <View style={{flexDirection: 'row', marginBottom: 3}}>
              <Text style={{width: 80, fontWeight: 'bold'}}>เลขที่ (Inv No.):</Text>
              <Text style={{flex: 1}}>{quotation.quotation_number}</Text>
            </View>
            <View style={{flexDirection: 'row', marginBottom: 3}}>
              <Text style={{width: 80, fontWeight: 'bold'}}>วันที่ (Date):</Text>
              <Text style={{flex: 1}}>{new Date(quotation.created_at).toLocaleDateString('th-TH')}</Text>
            </View>
            {quotation.project_name && (
              <View style={{flexDirection: 'row', marginBottom: 3}}>
                <Text style={{width: 80, fontWeight: 'bold'}}>โปรเจกต์ (Project):</Text>
                <Text style={{flex: 1}}>{quotation.project_name}</Text>
              </View>
            )}
            <View style={{flexDirection: 'row', marginBottom: 3}}>
              <Text style={{width: 80, fontWeight: 'bold'}}>เครดิต (Terms):</Text>
              <Text style={{flex: 1}}>{customer?.credit_terms || 'เงินสด'}</Text>
            </View>
            <View style={{flexDirection: 'row'}}>
              <Text style={{width: 80, fontWeight: 'bold'}}>ผู้ขาย (Sales):</Text>
              <Text style={{flex: 1}}>ฝ่ายขาย</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={{...styles.tableHeader, backgroundColor: headerBgColor, color: headerTextColor}} fixed>
            <Text style={styles.colNo}>
              ลำดับ{'\n'}
              <Text style={{ fontSize: 7, fontWeight: 'normal' }}>(No.)</Text>
            </Text>
            <Text style={styles.colItem}>
              รายการสินค้า{'\n'}
              <Text style={{ fontSize: 7, fontWeight: 'normal' }}>(Description)</Text>
            </Text>
            <Text style={styles.colQty}>
              จำนวน{'\n'}
              <Text style={{ fontSize: 7, fontWeight: 'normal' }}>(Qty)</Text>
            </Text>
            <Text style={styles.colPrice}>
              ราคา/หน่วย{'\n'}
              <Text style={{ fontSize: 7, fontWeight: 'normal' }}>(Unit Price)</Text>
            </Text>
            <Text style={styles.colDiscount}>
              ส่วนลด{'\n'}
              <Text style={{ fontSize: 7, fontWeight: 'normal' }}>(Discount)</Text>
            </Text>
            <Text style={styles.colTotal}>
              จำนวนเงิน{'\n'}
              <Text style={{ fontSize: 7, fontWeight: 'normal' }}>(Amount)</Text>
            </Text>
          </View>
          
          {items.map((item, index) => (
            <View key={index} style={styles.tableRow} wrap={false}>
              <Text style={styles.colNo}>{index + 1}</Text>
              <View style={styles.colItem}>
                <Text>{item.products?.name || 'Unknown Item'}</Text>
                {item.description && (
                  <Text style={{fontSize: 9, color: '#444', marginTop: 2}}>{item.description}</Text>
                )}
                {item.products?.product_code && (
                  <Text style={{fontSize: 8, color: '#777', marginTop: 1}}>{item.products.product_code}</Text>
                )}
              </View>
              <Text style={styles.colQty}>{item.quantity} {item.products?.unit || ''} </Text>
              <Text style={styles.colPrice}>{Number(item.unit_price).toLocaleString('th-TH', {minimumFractionDigits: 2})}</Text>
              <Text style={styles.colDiscount}>{Number(item.discount) > 0 ? Number(item.discount).toLocaleString('th-TH', {minimumFractionDigits: 2}) : '-'}</Text>
              <Text style={styles.colTotal}>{Number(item.total).toLocaleString('th-TH', {minimumFractionDigits: 2})}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer} wrap={false}>
          <View style={styles.notesBox}>
            <Text style={{fontWeight: 'bold', marginBottom: 5}}>หมายเหตุ / เงื่อนไข (Remarks / Conditions):</Text>
            <Text>{quotation.notes || '-'}</Text>
          </View>
          
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text>รวมเป็นเงิน (Subtotal)</Text>
              <Text>{subtotal.toLocaleString('th-TH', {minimumFractionDigits: 2})}</Text>
            </View>
            
            {quotation.global_discount_percent > 0 && (
              <>
                <View style={styles.totalRow}>
                  <Text style={{ color: '#d32f2f' }}>หักส่วนลด (Discount) {quotation.global_discount_percent}% </Text>
                  <Text>- {discountAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text>หลังหักส่วนลด (After Discount)</Text>
                  <Text>{(subtotal - discountAmount).toLocaleString('th-TH', {minimumFractionDigits: 2})}</Text>
                </View>
              </>
            )}

            {quotation.has_vat && (
              <View style={styles.totalRow}>
                <Text style={{ paddingLeft: 4 }}>VAT 7%</Text>
                <Text>{vatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</Text>
              </View>
            )}
            
            <View style={{...styles.totalRow, borderTopWidth: 1, borderTopColor: '#eee', marginTop: 4, paddingTop: 4}}>
              <Text style={styles.boldText}>จำนวนเงินรวม (Total Amount)</Text>
              <Text style={styles.boldText}>{grandTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})}</Text>
            </View>

            {quotation.has_wht && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#d32f2f', paddingLeft: 4 }}>WHT 3% (หัก ณ ที่จ่าย)</Text>
                <Text>- {whtAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</Text>
              </View>
            )}
            

          </View>
        </View>

        {/* Footer Signatures */}
        <View style={styles.footer}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}></View>
            <Text>ผู้เสนอราคา</Text>
            <Text style={{ fontSize: 8, color: '#777' }}>(Prepared By)</Text>
            <Text style={{color: '#777', marginTop: 3}}>วันที่ _____/_____/_____</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}></View>
            <Text>ผู้อนุมัติ</Text>
            <Text style={{ fontSize: 8, color: '#777' }}>(Approved By)</Text>
            <Text style={{color: '#777', marginTop: 3}}>วันที่ _____/_____/_____</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}></View>
            <Text>ผู้สั่งซื้อ / ยืนยันสั่งซื้อ</Text>
            <Text style={{ fontSize: 8, color: '#777' }}>(Accepted By)</Text>
            <Text style={{color: '#777', marginTop: 3}}>วันที่ _____/_____/_____</Text>
          </View>
        </View>

        <View style={{ position: 'absolute', bottom: 15, right: 30 }} fixed>
          <Text 
            style={{ fontSize: 10, color: '#333', fontFamily: 'Sarabun' }} 
            render={({ pageNumber, totalPages }) => `หน้า ${pageNumber} / ${totalPages}`} 
          />
        </View>
      </Page>
    </Document>
  );
};
