import jsPDF from 'jspdf';

interface PDFData {
  customerName: string;
  aircraftType?: 'SR20' | 'SR22' | 'SF50' | 'OwnersFleet';
  aircraftCost: number;
  downPaymentPercent: number;
  downPaymentAmount: number;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  monthlyPayment: number;
  ownerHours: number;
  rentalHours: number;
  pilotServicesHours: number;
  isLeaseback: boolean;
  leasebackOutlook: string;
  parkingType: string;
  parkingCost: number;
  plView: 'monthly' | 'annual';
  
  // Revenue breakdown
  rentalRevenue: number;
  ownerUsageRevenue: number;
  totalRevenue: number;
  
  // Variable costs breakdown
  ownerUsageCost: number;
  wearAndTear: number;
  pilotServicesCost: number;
  maintenanceCost: number;
  totalVariableCosts: number;
  
  // Fixed costs breakdown
  insuranceCost: number;
  managementCost: number;
  subscriptionsCost: number;
  tciTrainingCost: number;
  totalFixedCosts: number;
  
  // Financing
  monthlyLoanPayment: number;
  
  // Net result
  netResult: number;
  
  // Additional info
  leasebackHourlyRate: number;
  directFlightCost: number;
}

// Brand colors matching the calculator UI (converted from HSL to RGB)
const COLORS = {
  // Dark theme colors
  background: [20, 24, 31],        // hsl(210 25% 8%) - dark background
  card: [31, 37, 48],               // hsl(210 24% 16%) - card background
  cardLight: [38, 45, 58],          // Lighter card variant
  cardRevenue: [35, 50, 48],        // Light green tint for revenue
  cardCosts: [35, 38, 45],          // Slight gray for costs
  
  // Text colors
  foreground: [255, 255, 255],      // White text
  muted: [119, 128, 142],           // hsl(210 10% 60%) - muted text
  mutedLight: [150, 160, 175],      // Lighter muted text
  
  // Accent colors
  primary: [255, 255, 255],         // White primary
  primaryDark: [20, 24, 31],        // Dark for primary bg
  
  // Special colors
  jet: [96, 135, 188],              // hsl(217 40% 58%) - jet blue
  sr22: [111, 201, 201],            // hsl(180 38% 65%) - sr22 teal
  success: [99, 201, 194],          // hsl(180 35% 60%) - success green
  
  // Leaseback outlook badge colors (no orange)
  optimistic: [96, 135, 188],       // Blue - jet color
  realistic: [99, 201, 194],        // Green - success color
  
  // Borders and dividers
  border: [47, 54, 67],             // hsl(210 20% 25%)
  borderLight: [70, 80, 95],        // Lighter border
};

export async function generatePDF(data: PDFData): Promise<void> {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 18; // Increased from 15 to 18
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Helper functions
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      pdf.setFont('helvetica', options.bold ? 'bold' : 'normal');
      pdf.setFontSize(options.size || 10);
      if (options.color) {
        pdf.setTextColor(options.color[0], options.color[1], options.color[2]);
      } else {
        pdf.setTextColor(255, 255, 255); // Default white text
      }
      pdf.text(text, x, y, options.align ? { align: options.align } : undefined);
    };

    const addLine = (y: number, color: number[] = COLORS.border) => {
      pdf.setDrawColor(color[0], color[1], color[2]);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y);
    };

    const addCard = (x: number, y: number, w: number, h: number, bgColor: number[] = COLORS.card) => {
      // Background
      pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      pdf.setDrawColor(COLORS.borderLight[0], COLORS.borderLight[1], COLORS.borderLight[2]);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(x, y, w, h, 2, 2, 'FD');
    };

    const addSection = (title: string, y: number, color: number[] = COLORS.jet) => {
      addText(title, margin + 5, y, { size: 15, bold: true, color });
      return y + 10; // Return new yPos with spacing
    };

    const addBadge = (text: string, x: number, y: number, color: number[]) => {
      const badgeWidth = 28;
      const badgeHeight = 6;
      
      // Badge background with rounded corners
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.roundedRect(x, y, badgeWidth, badgeHeight, 1.5, 1.5, 'F');
      
      // Badge text (dark text on colored background)
      pdf.setTextColor(20, 24, 31);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(text, x + badgeWidth / 2, y + 4, { align: 'center' });
      
      // Reset text color
      pdf.setTextColor(255, 255, 255);
    };

    const addKeyMetric = (label: string, value: string, x: number, y: number, valueColor: number[] = COLORS.foreground) => {
      addText(label, x, y, { size: 10, color: COLORS.muted });
      addText(value, x, y + 7, { size: 16, bold: true, color: valueColor });
    };

    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

    const formatPercent = (value: number) => `${value.toFixed(2)}%`;

    // FULL PAGE BACKGROUND
    pdf.setFillColor(COLORS.background[0], COLORS.background[1], COLORS.background[2]);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // HEADER CARD
    addCard(margin, yPos, contentWidth, 26, COLORS.cardLight);
    yPos += 6;
    
    // Header content
    addText('NASSAU FLYERS', margin + 5, yPos, { size: 16, bold: true, color: COLORS.jet });
    addText('Cirrus Authorized International', pageWidth - margin - 5, yPos, { 
      size: 9, 
      color: COLORS.muted, 
      align: 'right' 
    });
    yPos += 8;
    
    addText(data.customerName, pageWidth / 2, yPos, { size: 20, bold: true, align: 'center' });
    yPos += 7;
    addText('Aircraft Ownership Estimate', pageWidth / 2, yPos, { size: 11, color: COLORS.muted, align: 'center' });
    yPos += 14;

    // PURCHASE & FINANCING CARD
    const cardHeight1 = 56;
    addCard(margin, yPos, contentWidth, cardHeight1, COLORS.card);
    yPos += 8;
    
    addText('Purchase & Financing', margin + 5, yPos, { size: 15, bold: true, color: COLORS.jet });
    yPos += 10;

    const col1X = margin + 5;
    const valueX = pageWidth - margin - 5;

    // Two-column layout for purchase details
    const leftColX = col1X;
    const rightColX = margin + contentWidth / 2 + 5;
    const leftValueX = margin + contentWidth / 2 - 5;
    const rightValueX = valueX;

    addText('Aircraft Cost', leftColX, yPos, { size: 9, color: COLORS.muted });
    addText(formatCurrency(data.aircraftCost), leftValueX, yPos, { size: 10, bold: true, align: 'right' });
    
    addText('Down Payment', rightColX, yPos, { size: 9, color: COLORS.muted });
    addText(`${formatPercent(data.downPaymentPercent)}`, rightValueX, yPos, { size: 10, bold: true, align: 'right' });
    yPos += 7;

    addText('Loan Amount', leftColX, yPos, { size: 9, color: COLORS.muted });
    addText(formatCurrency(data.loanAmount), leftValueX, yPos, { size: 10, bold: true, align: 'right' });
    
    addText('Down Payment Amt', rightColX, yPos, { size: 9, color: COLORS.muted });
    addText(formatCurrency(data.downPaymentAmount), rightValueX, yPos, { size: 10, bold: true, align: 'right' });
    yPos += 7;

    addText('Loan Term', leftColX, yPos, { size: 9, color: COLORS.muted });
    addText(`${data.loanTermYears} years`, leftValueX, yPos, { size: 10, bold: true, align: 'right' });
    
    addText('Interest Rate', rightColX, yPos, { size: 9, color: COLORS.muted });
    addText(formatPercent(data.interestRate), rightValueX, yPos, { size: 10, bold: true, align: 'right' });
    yPos += 11;

    // Monthly payment - prominent display
    addLine(yPos - 2, COLORS.borderLight);
    yPos += 6;
    addText('Monthly Loan Payment', col1X, yPos, { size: 11, bold: true });
    addText(formatCurrency(data.monthlyPayment), valueX, yPos, { 
      size: 14, 
      bold: true, 
      color: COLORS.jet,
      align: 'right' 
    });
    yPos += 14;

    // FLYING HOURS CARD
    const cardHeight2 = data.isLeaseback ? 38 : 28;
    addCard(margin, yPos, contentWidth, cardHeight2, COLORS.card);
    yPos += 8;
    
    addText('Flying Hours', margin + 5, yPos, { size: 15, bold: true, color: COLORS.sr22 });
    yPos += 10;

    addText('Owner Hours (Monthly)', col1X, yPos, { size: 9, color: COLORS.muted });
    addText(`${data.ownerHours} hrs`, valueX, yPos, { size: 11, bold: true, align: 'right' });
    yPos += 7;

    if (data.isLeaseback) {
      addText('Rental Hours (Monthly)', col1X, yPos, { size: 9, color: COLORS.muted });
      addText(`${data.rentalHours} hrs`, valueX, yPos, { size: 11, bold: true, align: 'right' });
      yPos += 8;
      
      if (data.leasebackOutlook) {
        // Only show badge for Optimistic and Realistic, use subtle text for low rental hours
        if (data.leasebackOutlook === 'Optimistic' || data.leasebackOutlook === 'Realistic') {
          const outlookColor = data.leasebackOutlook === 'Optimistic' ? COLORS.optimistic : COLORS.realistic;
          addText('Leaseback Outlook:', col1X, yPos, { size: 9, color: COLORS.muted });
          addBadge(data.leasebackOutlook, valueX - 28, yPos - 3, outlookColor);
        } else {
          addText('Leaseback Outlook:', col1X, yPos, { size: 9, color: COLORS.muted });
          addText(data.leasebackOutlook, valueX, yPos, { size: 9, color: COLORS.mutedLight, align: 'right' });
        }
        yPos += 8;
      }
    }

    if (data.pilotServicesHours > 0) {
      addText('Pilot Services (Monthly)', col1X, yPos, { size: 9, color: COLORS.muted });
      addText(`${data.pilotServicesHours} hrs`, valueX, yPos, { size: 11, bold: true, align: 'right' });
      yPos += 7;
    }

    yPos += 14;

    // FINANCIAL SUMMARY CARD (Key figures only)
    const summaryCardHeight = data.isLeaseback ? 42 : 32;
    addCard(margin, yPos, contentWidth, summaryCardHeight, COLORS.cardLight);
    yPos += 8;
    
    addText('Financial Summary', margin + 5, yPos, { size: 15, bold: true, color: COLORS.success });
    yPos += 10;

    // Key highlight for leaseback
    if (data.isLeaseback) {
      addText('Owner Usage Rate', col1X, yPos, { size: 10, bold: true });
      addText(`${formatCurrency(data.leasebackHourlyRate)}/hr`, valueX, yPos, { 
        size: 13, 
        bold: true, 
        color: COLORS.jet,
        align: 'right' 
      });
      yPos += 10;
    } else {
      addText('Direct Flight Cost', col1X, yPos, { size: 10, bold: true });
      addText(`${formatCurrency(data.directFlightCost)}/hr`, valueX, yPos, { 
        size: 13, 
        bold: true, 
        color: COLORS.jet,
        align: 'right' 
      });
      yPos += 10;
    }

    // Net result
    const netColor = data.netResult >= 0 ? COLORS.success : COLORS.foreground;
    const netPrefix = data.netResult >= 0 ? '+' : '';
    const netLabel = data.plView === 'monthly' ? 'Monthly Net' : 'Annual Net';
    
    addText(netLabel, col1X, yPos, { size: 10, bold: true });
    addText(`${netPrefix}${formatCurrency(data.netResult)}`, valueX, yPos, { 
      size: 14, 
      bold: true, 
      color: netColor,
      align: 'right' 
    });
    yPos += 14;

    // ========== DETAILED P&L BREAKDOWN ==========
    const plTitle = data.plView === 'monthly' ? 'Detailed P&L Breakdown (Monthly)' : 'Detailed P&L Breakdown (Annual)';
    yPos = addSection(plTitle, yPos, COLORS.success);
    yPos += 2;

    const multiplier = data.plView === 'monthly' ? 1 : 12;
    const indent = col1X + 3;

    // REVENUE SECTION (Leaseback only)
    if (data.isLeaseback) {
      const revenueHeight = 32;
      addCard(margin, yPos, contentWidth, revenueHeight, COLORS.cardRevenue);
      yPos += 8;
      
      addText('REVENUE', col1X, yPos, { size: 11, bold: true, color: COLORS.success });
      yPos += 8;
      
      addText(`Leaseback Revenue (${data.rentalHours} hrs × ${formatCurrency(data.leasebackHourlyRate)}/hr)`, indent, yPos, { size: 9, color: COLORS.mutedLight });
      addText(formatCurrency(data.rentalRevenue * multiplier), valueX, yPos, { size: 10, align: 'right' });
      yPos += 6;
      
      addText(`Owner Usage Revenue (${data.ownerHours} hrs × ${formatCurrency(data.leasebackHourlyRate)}/hr)`, indent, yPos, { size: 9, color: COLORS.mutedLight });
      addText(formatCurrency(data.ownerUsageRevenue * multiplier), valueX, yPos, { size: 10, align: 'right' });
      yPos += 7;
      
      addLine(yPos - 2, COLORS.borderLight);
      yPos += 4;
      addText('Total Revenue', col1X, yPos, { size: 10, bold: true });
      addText(formatCurrency(data.totalRevenue * multiplier), valueX, yPos, { size: 11, bold: true, color: COLORS.success, align: 'right' });
      yPos += 14;
    }

    // VARIABLE COSTS SECTION
    const variableCostsHeight = data.isLeaseback ? 34 : (data.pilotServicesCost > 0 ? 28 : 22);
    addCard(margin, yPos, contentWidth, variableCostsHeight, COLORS.cardCosts);
    yPos += 8;
    
    addText('VARIABLE COSTS', col1X, yPos, { size: 11, bold: true });
    yPos += 8;

    if (data.isLeaseback) {
      addText(`Owner Usage (${data.ownerHours} hrs × $XXX/hr)`, indent, yPos, { size: 9, color: COLORS.mutedLight });
      addText(formatCurrency(data.ownerUsageCost * multiplier), valueX, yPos, { size: 10, align: 'right' });
      yPos += 6;
      
      addText('Wear & Tear', indent, yPos, { size: 9, color: COLORS.mutedLight });
      addText('✓ INCLUDED', valueX - 3, yPos, { size: 8, color: COLORS.success, align: 'right' });
      yPos += 6;
    } else {
      addText(`Maintenance (${data.ownerHours} hrs × $XXX/hr)`, indent, yPos, { size: 9, color: COLORS.mutedLight });
      addText(formatCurrency(data.maintenanceCost * multiplier), valueX, yPos, { size: 10, align: 'right' });
      yPos += 6;
    }

    if (data.pilotServicesCost > 0) {
      addText(`Pilot Services (${data.pilotServicesHours} hrs)`, indent, yPos, { size: 9, color: COLORS.mutedLight });
      addText(formatCurrency(data.pilotServicesCost * multiplier), valueX, yPos, { size: 10, align: 'right' });
      yPos += 6;
    }

    yPos += 8;

    // FIXED COSTS SECTION
    const fixedCostsHeight = data.isLeaseback ? 52 : 46;
    addCard(margin, yPos, contentWidth, fixedCostsHeight, COLORS.cardCosts);
    yPos += 8;
    
    addText('FIXED COSTS', col1X, yPos, { size: 11, bold: true });
    yPos += 8;

    addText(`Parking (${data.parkingType})`, indent, yPos, { size: 9, color: COLORS.mutedLight });
    addText(formatCurrency(data.parkingCost * multiplier), valueX, yPos, { size: 10, align: 'right' });
    yPos += 6;

    addText('Insurance', indent, yPos, { size: 9, color: COLORS.mutedLight });
    addText(formatCurrency(data.insuranceCost * multiplier), valueX, yPos, { size: 10, align: 'right' });
    yPos += 6;

    addText('Management', indent, yPos, { size: 9, color: COLORS.mutedLight });
    addText(formatCurrency(data.managementCost * multiplier), valueX, yPos, { size: 10, align: 'right' });
    yPos += 6;

    addText('Subscriptions', indent, yPos, { size: 9, color: COLORS.mutedLight });
    addText(formatCurrency(data.subscriptionsCost * multiplier), valueX, yPos, { size: 10, align: 'right' });
    yPos += 6;

    if (data.isLeaseback && data.tciTrainingCost > 0) {
      addText('TCI Training', indent, yPos, { size: 9, color: COLORS.mutedLight });
      addText(formatCurrency(data.tciTrainingCost * multiplier), valueX, yPos, { size: 10, align: 'right' });
      yPos += 6;
    }

    yPos += 1;
    addLine(yPos - 2, COLORS.borderLight);
    yPos += 4;
    addText('Total Fixed Costs', col1X, yPos, { size: 10, bold: true });
    addText(formatCurrency(data.totalFixedCosts * multiplier), valueX, yPos, { size: 11, bold: true, align: 'right' });
    yPos += 14;

    // FINANCING SECTION
    addCard(margin, yPos, contentWidth, 22, COLORS.card);
    yPos += 8;
    
    addText('FINANCING', col1X, yPos, { size: 11, bold: true, color: COLORS.jet });
    yPos += 8;

    addText(`Payment (${data.interestRate.toFixed(2)}% / ${data.loanTermYears} years)`, indent, yPos, { size: 9, color: COLORS.mutedLight });
    addText(formatCurrency(data.monthlyLoanPayment * multiplier), valueX, yPos, { size: 10, bold: true, align: 'right' });
    yPos += 14;

    // NET RESULT (Prominent)
    const netResultHeight = 26;
    addCard(margin, yPos, contentWidth, netResultHeight, COLORS.cardLight);
    yPos += 8;

    const resultLabel = data.plView === 'monthly' ? 
      (data.netResult >= 0 ? 'MONTHLY NET PROFIT' : 'MONTHLY NET COST') :
      (data.netResult >= 0 ? 'ANNUAL NET PROFIT' : 'ANNUAL NET COST');
    
    const resultColor = data.netResult >= 0 ? COLORS.success : COLORS.jet;
    const resultPrefix = data.netResult >= 0 ? '+' : '';

    addText(resultLabel, col1X, yPos, { size: 12, bold: true, color: COLORS.muted });
    addText(`${resultPrefix}${formatCurrency(data.netResult)}`, valueX, yPos, { 
      size: 16, 
      bold: true, 
      color: resultColor,
      align: 'right' 
    });
    yPos += 10;

    // Tax note
    addText('Tax & Depreciation Value up to full purchase price', pageWidth / 2, yPos, { 
      size: 7, 
      color: COLORS.muted, 
      align: 'center' 
    });
    yPos += 12;

    // SF50-specific note about additional costs
    if (data.aircraftType === 'SF50') {
      addText('Note: Additional costs not included: Pilot expenses and FBO fees (billed at cost)', 
        pageWidth / 2, yPos, { 
        size: 8, 
        color: COLORS.muted, 
        align: 'center' 
      });
      yPos += 8;
    }

    // FOOTER
    yPos = pageHeight - 18;
    addCard(margin, yPos, contentWidth, 15, COLORS.cardLight);
    yPos += 5;
    
    addText('Nassau Flyers | Cirrus Platinum Training & Service Center', pageWidth / 2, yPos, { 
      size: 9, 
      color: COLORS.muted, 
      align: 'center' 
    });
    yPos += 5;
    addText(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 
      pageWidth / 2, yPos, { 
      size: 8, 
      color: COLORS.muted, 
      align: 'center' 
    });

    // Save PDF
    const fileName = `${data.customerName.replace(/\s+/g, '-')}-ownership-estimate-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}
