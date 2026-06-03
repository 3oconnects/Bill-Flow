// backend/services/gstCalculationService.js
'use strict';
const { db } = require('../db');
const { v4: uuid } = require('uuid');

class GSTCalculationService {

  static calculateInvoiceGST(lineItems, supplierState, buyerState, taxRate) {
    taxRate = taxRate || 18;
    var cgst = 0, sgst = 0, igst = 0;
    var isIGST = supplierState && buyerState && supplierState !== buyerState;

    for (var i = 0; i < lineItems.length; i++) {
      var item = lineItems[i];
      var taxableAmount = (item.amount || 0) - (item.discount || 0);
      if (isIGST) {
        igst += taxableAmount * (taxRate / 100);
      } else {
        cgst += taxableAmount * (taxRate / 200);
        sgst += taxableAmount * (taxRate / 200);
      }
    }

    return {
      cgst:       +cgst.toFixed(2),
      sgst:       +sgst.toFixed(2),
      igst:       +igst.toFixed(2),
      total_tax:  +(cgst + sgst + igst).toFixed(2),
      tax_rate:   taxRate,
      gst_type:   isIGST ? 'igst' : 'intra',
    };
  }

  static getPlaceOfSupply(supplierState, buyerState, serviceType) {
    if (!serviceType || serviceType === 'goods') {
      return {
        state:   buyerState,
        type:    'buyer_location',
        isIntra: supplierState === buyerState,
      };
    }
    if (supplierState === buyerState) {
      return { state: buyerState,    type: 'recipient_location_intra', isIntra: true  };
    }
    return {     state: supplierState, type: 'recipient_location_inter', isIntra: false };
  }

  static async generateGSTR1(orgId, month, year) {
    var result = await db.query(
      "SELECT i.id, i.number AS invoice_number, i.customer_name, i.total AS invoice_value, " +
      "i.cgst AS cgst_amount, i.sgst AS sgst_amount, i.igst AS igst_amount, " +
      "CASE WHEN i.gst_type = 'igst' THEN 'IGST' ELSE 'CGST+SGST' END AS supply_type " +
      "FROM invoices i " +
      "WHERE i.org_id = $1 AND EXTRACT(MONTH FROM COALESCE(i.date, i.created_at)) = $2 " +
      "AND EXTRACT(YEAR FROM COALESCE(i.date, i.created_at)) = $3 " +
      "AND i.status IN ('paid','sent','partially_paid') AND i.deleted_at IS NULL",
      [orgId, month, year]
    );
    return {
      period:   month + '/' + year,
      supplies: result.rows,
      summary: {
        totalInvoices: result.rowCount,
        totalCGST:  result.rows.reduce(function(s,r){ return s + parseFloat(r.cgst_amount||0); }, 0),
        totalSGST:  result.rows.reduce(function(s,r){ return s + parseFloat(r.sgst_amount||0); }, 0),
        totalIGST:  result.rows.reduce(function(s,r){ return s + parseFloat(r.igst_amount||0); }, 0),
        totalValue: result.rows.reduce(function(s,r){ return s + parseFloat(r.invoice_value||0); }, 0),
      },
    };
  }

  static async generateGSTR3B(orgId, month, year) {
    var outward = await db.query(
      "SELECT " +
      "COALESCE(SUM(CASE WHEN gst_type='igst'  THEN igst ELSE 0 END),0) AS igst_outward, " +
      "COALESCE(SUM(CASE WHEN gst_type='intra' THEN cgst ELSE 0 END),0) AS cgst_outward, " +
      "COALESCE(SUM(CASE WHEN gst_type='intra' THEN sgst ELSE 0 END),0) AS sgst_outward " +
      "FROM invoices " +
      "WHERE org_id=$1 AND EXTRACT(MONTH FROM COALESCE(date,created_at))=$2 " +
      "AND EXTRACT(YEAR FROM COALESCE(date,created_at))=$3 " +
      "AND deleted_at IS NULL AND status NOT IN ('draft','cancelled')",
      [orgId, month, year]
    );

    var inward = await db.query(
      "SELECT " +
      "COALESCE(SUM(CASE WHEN gst_type='igst'  THEN tax ELSE 0 END),0) AS igst_inward, " +
      "COALESCE(SUM(CASE WHEN gst_type!='igst' THEN COALESCE(tax,0)/2 ELSE 0 END),0) AS cgst_inward, " +
      "COALESCE(SUM(CASE WHEN gst_type!='igst' THEN COALESCE(tax,0)/2 ELSE 0 END),0) AS sgst_inward " +
      "FROM ap_invoices " +
      "WHERE org_id=$1 AND EXTRACT(MONTH FROM invoice_date)=$2 AND EXTRACT(YEAR FROM invoice_date)=$3",
      [orgId, month, year]
    );

    var out = outward.rows[0];
    var inp = inward.rows[0];

    return {
      period: month + '/' + year,
      outward: {
        cgst: parseFloat(out.cgst_outward || 0),
        sgst: parseFloat(out.sgst_outward || 0),
        igst: parseFloat(out.igst_outward || 0),
      },
      inward: {
        cgst: parseFloat(inp.cgst_inward || 0),
        sgst: parseFloat(inp.sgst_inward || 0),
        igst: parseFloat(inp.igst_inward || 0),
      },
      netPayable: {
        cgst: Math.max(0, parseFloat(out.cgst_outward||0) - parseFloat(inp.cgst_inward||0)),
        sgst: Math.max(0, parseFloat(out.sgst_outward||0) - parseFloat(inp.sgst_inward||0)),
        igst: Math.max(0, parseFloat(out.igst_outward||0) - parseFloat(inp.igst_inward||0)),
      },
    };
  }

  static async trackInputTaxCredit(orgId, apInvoiceId) {
    var apInvoice = await db.query(
      'SELECT tax, gst_type FROM ap_invoices WHERE id=$1 AND org_id=$2',
      [apInvoiceId, orgId]
    );
    if (!apInvoice.rowCount) return null;
    var tax = apInvoice.rows[0].tax;
    await db.query(
      "INSERT INTO itc_ledger (id, org_id, ap_invoice_id, available, claimed, status, created_at) VALUES ($1,$2,$3,$4,0,'available',NOW())",
      [uuid(), orgId, apInvoiceId, tax]
    );
    return { availableCredit: tax };
  }
}

module.exports = GSTCalculationService;
