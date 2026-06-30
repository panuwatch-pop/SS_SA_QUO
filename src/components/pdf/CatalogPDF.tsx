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
    paddingTop: 40,
    fontSize: 12,
    lineHeight: 1.5,
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    objectFit: 'contain',
  },
  infoTable: {
    width: 250,
    borderWidth: 1,
    borderColor: '#000',
  },
  infoRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  infoLabel: {
    width: '40%',
    padding: 6,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#000',
    fontSize: 14,
  },
  infoValue: {
    width: '60%',
    padding: 6,
    fontSize: 14,
  },
  mainBox: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#4a90e2',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: '100%',
  },
  productImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  productDesc: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
    color: '#555',
  }
});

interface CatalogPDFProps {
  products: any[];
  date: string;
  projectName: string;
  companyName: string;
}

export default function CatalogPDF({ products, date, projectName, companyName }: CatalogPDFProps) {
  const isSST = companyName === 'SST';
  const displayCompanyName = isSST ? 'SST (Thailand) Co.,Ltd.' : 'Shinwa Anzen Co.,Ltd.';
  const logoSrc = isSST ? '/sst-logo.jpg' : '/shinwa-logo.jpg';

  // Make sure we have at least one product
  const itemsToRender = products.length > 0 ? products : [null];

  return (
    <Document>
      {itemsToRender.map((product, idx) => {
        // Collect all images
        const allImages = [];
        if (product?.image_url) allImages.push(product.image_url);
        if (product?.additional_images && Array.isArray(product.additional_images)) {
          allImages.push(...product.additional_images);
        }

        // Determine image layout based on count
        let imgWidth = '100%';
        let imgHeight = '100%';
        if (allImages.length === 2) {
          imgWidth = '48%';
          imgHeight = '100%';
        } else if (allImages.length === 3 || allImages.length === 4) {
          imgWidth = '48%';
          imgHeight = '48%';
        } else if (allImages.length > 4) {
          imgWidth = '31%';
          imgHeight = '31%';
        }

        return (
          <Page key={idx} size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.headerRow}>
              <Image src={logoSrc} style={styles.logo} />
              
              <View style={styles.infoTable}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date</Text>
                  <Text style={styles.infoValue}>{date}</Text>
                </View>
                <View style={{...styles.infoRow, borderBottomWidth: 0}}>
                  <Text style={styles.infoLabel}>Project</Text>
                  <Text style={styles.infoValue}>{projectName}</Text>
                </View>
              </View>
            </View>

            {/* Main Content Box */}
            <View style={styles.mainBox}>
              {allImages.length > 0 ? (
                <View style={styles.imageGrid}>
                  {allImages.map((img, imgIdx) => (
                    <View key={imgIdx} style={{ width: imgWidth, height: imgHeight, alignItems: 'center', justifyContent: 'center' }}>
                      <Image src={img} style={styles.productImage} />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ color: '#ccc', fontSize: 24 }}>ไม่มีรูปภาพ (No Image)</Text>
              )}
              
              {/* Product Info at the bottom of the box */}
              {product && (
                <View style={{ marginTop: 'auto', paddingTop: 10 }}>
                  <Text style={styles.productName}>{product.product_code ? `${product.product_code} : ` : ''}{product.name}</Text>
                  {product.description && <Text style={styles.productDesc}>{product.description}</Text>}
                </View>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.companyName}>{displayCompanyName}</Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
